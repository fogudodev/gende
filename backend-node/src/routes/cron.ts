import { Router, Request, Response, NextFunction } from 'express';
import { db } from '../core/database.js';
import { config } from '../config.js';
import { WhatsAppService } from '../services/whatsapp.js';
import { authMiddleware, getProfessionalId, JwtPayload } from '../core/auth.js';

const router = Router();

// Cron security middleware - requires X-Cron-Secret header or query param
function cronAuth(req: Request, res: Response, next: NextFunction) {
  const secret = (req.headers['x-cron-secret'] as string) || (req.query.secret as string);
  if (!config.cronSecret) {
    console.warn('[CRON] CRON_SECRET not set - cron endpoints are unprotected!');
    return next();
  }
  if (secret !== config.cronSecret) {
    return res.status(403).json({ error: 'Forbidden: invalid cron secret' });
  }
  next();
}

// =============================================
// BOOKING REMINDERS (24h, 3h, post-sale review)
// =============================================
router.post('/cron/send-reminders', cronAuth, async (_req: Request, res: Response) => {
  const wa = new WhatsAppService();
  const now = new Date();
  const results: any[] = [];

  const h24Start = new Date(now.getTime() + 23 * 3600000).toISOString();
  const h24End = new Date(now.getTime() + 25 * 3600000).toISOString();
  const h3Start = new Date(now.getTime() + 150 * 60000).toISOString();
  const h3End = new Date(now.getTime() + 210 * 60000).toISOString();
  const psStart = new Date(now.getTime() - 25 * 3600000).toISOString();
  const psEnd = new Date(now.getTime() - 23 * 3600000).toISOString();

  const b24 = await db.query<any>("SELECT b.*, s.name as service_name FROM bookings b LEFT JOIN services s ON s.id = b.service_id WHERE b.status IN ('pending','confirmed') AND b.start_time >= ? AND b.start_time <= ? AND b.client_phone IS NOT NULL", [h24Start, h24End]);
  const b3 = await db.query<any>("SELECT b.*, s.name as service_name FROM bookings b LEFT JOIN services s ON s.id = b.service_id WHERE b.status IN ('pending','confirmed') AND b.start_time >= ? AND b.start_time <= ? AND b.client_phone IS NOT NULL", [h3Start, h3End]);
  const bps = await db.query<any>("SELECT b.*, s.name as service_name FROM bookings b LEFT JOIN services s ON s.id = b.service_id WHERE b.status = 'completed' AND b.updated_at >= ? AND b.updated_at <= ? AND b.client_phone IS NOT NULL", [psStart, psEnd]);

  const allBookings = [
    ...b24.map(b => ({ ...b, triggerType: 'reminder_24h' })),
    ...b3.map(b => ({ ...b, triggerType: 'reminder_3h' })),
    ...bps.map(b => ({ ...b, triggerType: 'post_sale_review' })),
  ];

  const byProf: Record<string, any[]> = {};
  for (const b of allBookings) {
    (byProf[b.professional_id] ||= []).push(b);
  }

  for (const [profId, bookings] of Object.entries(byProf)) {
    const prof = await db.queryOne<any>('SELECT id, slug, reminder_message, business_name, name FROM professionals WHERE id = ?', [profId]);
    if (!prof) continue;

    const inst = await db.queryOne<any>("SELECT instance_name, status FROM whatsapp_instances WHERE professional_id = ? LIMIT 1", [profId]);
    if (!inst || inst.status !== 'connected') continue;

    const automations = await db.query<any>("SELECT * FROM whatsapp_automations WHERE professional_id = ? AND automation_type IN ('reminder_24h','reminder_3h','post_sale_review') AND is_enabled = 1", [profId]);
    const autoMap: Record<string, any> = {};
    for (const a of automations) autoMap[a.automation_type] = a;

    for (const booking of bookings) {
      const automation = autoMap[booking.triggerType];
      if (!automation) continue;

      const alreadySent = await db.queryOne('SELECT id FROM whatsapp_logs WHERE booking_id = ? AND automation_id = ? LIMIT 1', [booking.id, automation.id]);
      if (alreadySent) continue;

      const startDate = new Date(booking.start_time);
      const bookingLink = prof.slug ? `https://gende.io/${prof.slug}` : '';
      const reviewLink = prof.slug ? `https://gende.io/${prof.slug}?review=true&booking=${booking.id}` : '';

      let messageTemplate = automation.custom_message || '';
      if (['reminder_24h', 'reminder_3h'].includes(booking.triggerType) && prof.reminder_message) {
        messageTemplate = prof.reminder_message;
      } else if (booking.triggerType === 'post_sale_review' && !messageTemplate?.trim()) {
        messageTemplate = 'Olá {nome}! Como foi seu atendimento de {servico}? ⭐ Avalie: {link_avaliacao}\n\nSua opinião é muito importante! 😊';
      }

      const finalMessage = WhatsAppService.replaceVars(messageTemplate, {
        nome: booking.client_name || 'Cliente',
        servico: booking.service_name || 'serviço',
        data: startDate.toLocaleDateString('pt-BR'),
        horario: startDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        link: bookingLink,
        link_avaliacao: reviewLink,
      });

      const sendRes = await wa.sendMessage(inst.instance_name, booking.client_phone, finalMessage);

      await db.execute(
        'INSERT INTO whatsapp_logs (id, professional_id, automation_id, booking_id, recipient_phone, message_content, status, sent_at, error_message) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [db.uuid(), profId, automation.id, booking.id, booking.client_phone, finalMessage, sendRes.ok ? 'sent' : 'failed', sendRes.ok ? new Date().toISOString() : null, sendRes.ok ? null : JSON.stringify(sendRes.data)]
      );

      results.push({ type: booking.triggerType, bookingId: booking.id, success: sendRes.ok });
    }
  }

  res.json({ success: true, processed: results.length, results });
});

// =============================================
// CAMPAIGNS
// =============================================
router.post('/cron/send-campaigns', cronAuth, async (_req: Request, res: Response) => {
  const wa = new WhatsAppService();
  const campaigns = await db.query<any>("SELECT * FROM campaigns WHERE status = 'scheduled' AND scheduled_at <= NOW()");

  for (const campaign of campaigns) {
    const inst = await db.queryOne<any>("SELECT instance_name, status FROM whatsapp_instances WHERE professional_id = ? LIMIT 1", [campaign.professional_id]);
    if (!inst || inst.status !== 'connected') {
      await db.execute("UPDATE campaigns SET status = 'failed' WHERE id = ?", [campaign.id]);
      continue;
    }

    const contacts = await db.query<any>("SELECT * FROM campaign_contacts WHERE campaign_id = ? AND status = 'pending'", [campaign.id]);
    const prof = await db.queryOne<any>('SELECT slug, name, business_name FROM professionals WHERE id = ?', [campaign.professional_id]);

    let sentCount = 0, failedCount = 0;
    await db.execute("UPDATE campaigns SET status = 'sending', started_at = NOW() WHERE id = ?", [campaign.id]);

    for (const contact of contacts) {
      const finalMessage = WhatsAppService.replaceVars(campaign.message, {
        nome: contact.client_name || 'Cliente',
        link: prof?.slug ? `https://gende.io/${prof.slug}` : '',
        negocio: prof?.business_name || prof?.name || '',
      });

      const sendRes = await wa.sendMessage(inst.instance_name, contact.phone, finalMessage);
      if (sendRes.ok) {
        sentCount++;
        await db.execute("UPDATE campaign_contacts SET status = 'sent', sent_at = NOW() WHERE id = ?", [contact.id]);
      } else {
        failedCount++;
        await db.execute("UPDATE campaign_contacts SET status = 'failed', error_message = ? WHERE id = ?", [JSON.stringify(sendRes.data), contact.id]);
      }

      await new Promise(r => setTimeout(r, 1000));
    }

    await db.execute("UPDATE campaigns SET status = 'completed', sent_count = ?, failed_count = ?, completed_at = NOW() WHERE id = ?", [sentCount, failedCount, campaign.id]);
  }

  res.json({ success: true, processed: campaigns.length });
});

// =============================================
// CONVERSATION TIMEOUT
// =============================================
router.post('/cron/conversation-timeout', cronAuth, async (_req: Request, res: Response) => {
  const wa = new WhatsAppService();
  const thirtyMinAgo = new Date(Date.now() - 30 * 60000).toISOString().replace('T', ' ').slice(0, 19);

  const staleConvs = await db.query<any>("SELECT id, professional_id, client_phone, context, messages FROM whatsapp_conversations WHERE status = 'active' AND updated_at < ?", [thirtyMinAgo]);
  let closed = 0;

  for (const conv of staleConvs) {
    const inst = await db.queryOne<any>("SELECT instance_name, status FROM whatsapp_instances WHERE professional_id = ? AND status = 'connected' LIMIT 1", [conv.professional_id]);
    if (inst) {
      const context = JSON.parse(conv.context || '{}');
      const clientName = context.client_name || 'Cliente';
      const prof = await db.queryOne<any>('SELECT business_name, name, slug FROM professionals WHERE id = ?', [conv.professional_id]);
      const bookingLink = prof?.slug ? `https://gende.io/${prof.slug}` : '';

      const timeoutMsg = `⏰ Olá${clientName !== 'Cliente' ? ` ${clientName}` : ''}! Sua conversa foi encerrada por inatividade.\n\nSe ainda quiser agendar, é só nos enviar uma nova mensagem! 😊${bookingLink ? `\n\n📱 Ou agende online: ${bookingLink}` : ''}`;
      await wa.sendMessage(inst.instance_name, conv.client_phone, timeoutMsg);
    }

    const msgs = JSON.parse(conv.messages || '[]');
    msgs.push({ role: 'system', content: 'Conversa encerrada por inatividade (30 min)' });
    await db.execute("UPDATE whatsapp_conversations SET status = 'expired', messages = ? WHERE id = ?", [JSON.stringify(msgs), conv.id]);
    closed++;
  }

  res.json({ success: true, closed });
});

// =============================================
// COURSE REMINDERS (7d, 1d, day-of, followup)
// =============================================
router.post('/cron/course-reminders', cronAuth, async (_req: Request, res: Response) => {
  const wa = new WhatsAppService();
  const now = new Date();
  const results: any[] = [];

  // Get all connected instances
  const instances = await db.query<any>("SELECT professional_id, instance_name, status FROM whatsapp_instances WHERE status = 'connected'");

  for (const inst of instances) {
    const profId = inst.professional_id;

    // Get active course automations
    const automations = await db.query<any>(
      "SELECT * FROM whatsapp_automations WHERE professional_id = ? AND is_enabled = 1 AND automation_type IN ('course_reminder_7d','course_reminder_1d','course_reminder_day','course_send_location','course_send_link','course_followup','course_feedback_request')",
      [profId]
    );
    const autoMap: Record<string, any> = {};
    for (const a of automations) autoMap[a.automation_type] = a;
    if (!Object.keys(autoMap).length) continue;

    // Get confirmed enrollments with class info
    const enrollments = await db.query<any>(
      "SELECT e.*, c.name as course_name, c.slug as course_slug, cc.name as class_name, cc.class_date, cc.start_time, cc.end_time, cc.location, cc.online_link, cc.modality, cc.status as class_status FROM course_enrollments e LEFT JOIN courses c ON c.id = e.course_id LEFT JOIN course_classes cc ON cc.id = e.class_id WHERE e.professional_id = ? AND e.enrollment_status = 'confirmed'",
      [profId]
    );

    for (const enrollment of enrollments) {
      if (!enrollment.student_phone || enrollment.class_status === 'cancelled') continue;

      const classDate = new Date(`${enrollment.class_date}T${enrollment.start_time || '08:00'}:00-03:00`);
      const diffMs = classDate.getTime() - now.getTime();
      const diffDays = diffMs / 86400000;

      // Determine which triggers to fire
      const triggers: string[] = [];
      if (diffDays >= 6.5 && diffDays <= 7.5 && autoMap['course_reminder_7d']) triggers.push('course_reminder_7d');
      if (diffDays >= 0.5 && diffDays <= 1.5 && autoMap['course_reminder_1d']) triggers.push('course_reminder_1d');
      if (diffDays >= -0.5 && diffDays <= 0.5 && diffDays > 0 && autoMap['course_reminder_day']) triggers.push('course_reminder_day');
      if (diffDays >= -0.5 && diffDays <= 0.5 && diffDays > 0 && autoMap['course_send_location'] && enrollment.location) triggers.push('course_send_location');
      if (diffDays >= -0.5 && diffDays <= 0.5 && diffDays > 0 && autoMap['course_send_link'] && enrollment.online_link) triggers.push('course_send_link');
      if (diffDays >= -1.5 && diffDays <= -0.5 && autoMap['course_followup']) triggers.push('course_followup');
      if (diffDays >= -3.5 && diffDays <= -2.5 && autoMap['course_feedback_request']) triggers.push('course_feedback_request');

      for (const triggerType of triggers) {
        const automation = autoMap[triggerType];

        // Check if already sent (using enrollment.id as booking_id for dedup)
        const alreadySent = await db.queryOne('SELECT id FROM whatsapp_logs WHERE professional_id = ? AND automation_id = ? AND recipient_phone = ? AND booking_id = ? LIMIT 1', [profId, automation.id, enrollment.student_phone, enrollment.id]);
        if (alreadySent) continue;

        const classDateObj = new Date(enrollment.class_date);
        const finalMessage = WhatsAppService.replaceVars(automation.custom_message || '', {
          nome: enrollment.student_name || 'Aluno',
          curso: enrollment.course_name || '',
          turma: enrollment.class_name || '',
          data: classDateObj.toLocaleDateString('pt-BR'),
          horario: (enrollment.start_time || '').slice(0, 5),
          local: enrollment.location || '',
          link_aula: enrollment.online_link || '',
        });

        const sendRes = await wa.sendMessage(inst.instance_name, enrollment.student_phone, finalMessage);

        await db.execute(
          'INSERT INTO whatsapp_logs (id, professional_id, automation_id, booking_id, recipient_phone, message_content, status, sent_at, error_message) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
          [db.uuid(), profId, automation.id, enrollment.id, enrollment.student_phone, finalMessage, sendRes.ok ? 'sent' : 'failed', sendRes.ok ? new Date().toISOString() : null, sendRes.ok ? null : JSON.stringify(sendRes.data)]
        );

        results.push({ type: triggerType, enrollmentId: enrollment.id, success: sendRes.ok });
      }
    }
  }

  res.json({ success: true, processed: results.length, results });
});

// =============================================
// WAITLIST PROCESSING
// =============================================
router.post('/cron/waitlist-process', cronAuth, async (req: Request, res: Response) => {
  const { action } = req.body;

  if (action === 'process-cancellation') {
    const { professionalId, serviceId, startTime, endTime } = req.body;

    const settings = await db.queryOne<any>('SELECT * FROM waitlist_settings WHERE professional_id = ?', [professionalId]);
    if (settings && !settings.enabled) return res.json({ success: false, reason: 'waitlist_disabled' });

    const maxNotifications = settings?.max_notifications ?? 3;
    const reservationMinutes = settings?.reservation_minutes ?? 3;

    const slotDate = new Date(startTime);
    const dateStr = slotDate.toISOString().split('T')[0];
    const hour = slotDate.getHours();
    const period = hour < 12 ? 'morning' : (hour < 18 ? 'afternoon' : 'evening');

    // Find matching waitlist entries
    const entries = await db.query<any>(
      "SELECT * FROM waitlist_entries WHERE professional_id = ? AND status = 'waiting' AND (service_id = ? OR service_id IS NULL) ORDER BY priority DESC, created_at ASC",
      [professionalId, serviceId]
    );

    // Filter compatible by date/period
    let compatible = entries.filter((e: any) =>
      e.preferred_date === dateStr && (e.preferred_period === 'any' || e.preferred_period === period)
    );
    if (!compatible.length) compatible = entries;

    const toNotify = compatible.slice(0, maxNotifications);
    if (!toNotify.length) return res.json({ success: false, reason: 'no_candidates' });

    // Send offers
    const wa = new WhatsAppService();
    const inst = await db.queryOne<any>("SELECT instance_name, status FROM whatsapp_instances WHERE professional_id = ? LIMIT 1", [professionalId]);
    if (!inst || inst.status !== 'connected') return res.json({ success: false, reason: 'whatsapp_disconnected' });

    const prof = await db.queryOne<any>('SELECT name, business_name, slug FROM professionals WHERE id = ?', [professionalId]);
    const service = await db.queryOne<any>('SELECT name, price FROM services WHERE id = ?', [serviceId]);

    const businessName = prof?.business_name || prof?.name || 'Salão';
    const bookingLink = prof?.slug ? `https://gende.io/${prof.slug}` : '';
    let sent = 0;

    for (const entry of toNotify) {
      const reservedUntil = new Date(Date.now() + reservationMinutes * 60000).toISOString().replace('T', ' ').slice(0, 19);

      await db.execute(
        'INSERT INTO waitlist_offers (id, professional_id, waitlist_entry_id, client_name, client_phone, service_id, slot_start, slot_end, status, reserved_until) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [db.uuid(), professionalId, entry.id, entry.client_name, entry.client_phone, serviceId, startTime, endTime, 'sent', reservedUntil]
      );

      const message = `✨ *Horário disponível!*\n\nOlá ${entry.client_name}!\n\n📅 *${slotDate.toLocaleDateString('pt-BR')}* às *${slotDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}*\n💇 *${service?.name || 'Serviço'}*\n📍 ${businessName}\n\n${bookingLink ? `📲 Agende: ${bookingLink}\n\n` : ''}⏰ Responda rápido!`;

      const sendRes = await wa.sendMessage(inst.instance_name, entry.client_phone, message);
      if (sendRes.ok) sent++;

      // Update entry status
      await db.execute("UPDATE waitlist_entries SET status = 'notified', notified_at = NOW() WHERE id = ?", [entry.id]);
    }

    return res.json({ success: true, offers_sent: sent });
  }

  if (action === 'accept-offer') {
    const { offerId } = req.body;

    const offer = await db.queryOne<any>('SELECT * FROM waitlist_offers WHERE id = ?', [offerId]);
    if (!offer) return res.json({ success: false, error: 'Oferta não encontrada' });
    if (offer.status !== 'sent') return res.json({ success: false, error: 'Oferta já respondida' });

    if (offer.reserved_until && new Date(offer.reserved_until).getTime() < Date.now()) {
      await db.execute("UPDATE waitlist_offers SET status = 'expired' WHERE id = ?", [offerId]);
      return res.json({ success: false, error: 'Tempo expirado' });
    }

    // Create booking from offer
    const service = await db.queryOne<any>('SELECT price, duration_minutes FROM services WHERE id = ?', [offer.service_id]);
    const bookingId = db.uuid();

    await db.execute(
      'INSERT INTO bookings (id, professional_id, service_id, client_name, client_phone, start_time, end_time, price, duration_minutes, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [bookingId, offer.professional_id, offer.service_id, offer.client_name, offer.client_phone, offer.slot_start, offer.slot_end, service?.price || 0, service?.duration_minutes || 30, 'confirmed']
    );

    // Update offer
    await db.execute("UPDATE waitlist_offers SET status = 'accepted', responded_at = NOW(), created_booking_id = ? WHERE id = ?", [bookingId, offerId]);

    // Mark other offers for the same slot as taken
    await db.execute("UPDATE waitlist_offers SET status = 'slot_taken' WHERE professional_id = ? AND slot_start = ? AND id != ? AND status = 'sent'", [offer.professional_id, offer.slot_start, offerId]);

    // Update waitlist entry
    if (offer.waitlist_entry_id) {
      await db.execute("UPDATE waitlist_entries SET status = 'booked' WHERE id = ?", [offer.waitlist_entry_id]);
    }

    return res.json({ success: true, booking_id: bookingId });
  }

  // Auto-expire old offers
  await db.execute("UPDATE waitlist_offers SET status = 'expired' WHERE status = 'sent' AND reserved_until < NOW()");
  res.json({ success: true, message: 'Expired offers cleaned' });
});

// =============================================
// SEND CAMPAIGN (authenticated - frontend)
// =============================================
router.post('/send-campaign', authMiddleware, async (req: Request, res: Response) => {
  const user = (req as any).user as JwtPayload;
  const { action, professionalId, name, message, clientIds } = req.body;

  if (action === 'get-limits') {
    const profId = professionalId || await getProfessionalId(user.sub);
    
    // Get plan limits
    const sub = await db.queryOne<any>('SELECT plan_id FROM subscriptions WHERE professional_id = ? ORDER BY created_at DESC LIMIT 1', [profId]);
    const planId = sub?.plan_id || 'free';
    const planLimits = await db.queryOne<any>('SELECT * FROM plan_limits WHERE plan_id = ?', [planId]);
    const profLimits = await db.queryOne<any>('SELECT * FROM professional_limits WHERE professional_id = ?', [profId]);
    
    // Today's usage
    const today = new Date().toISOString().split('T')[0];
    const usage = await db.queryOne<any>('SELECT campaigns_sent FROM daily_message_usage WHERE professional_id = ? AND usage_date = ?', [profId, today]);
    
    const dailyLimit = (profLimits?.daily_campaigns ?? planLimits?.daily_campaigns ?? 1) + (profLimits?.extra_campaigns_purchased ?? 0);
    const maxContacts = (profLimits?.campaign_max_contacts ?? planLimits?.campaign_max_contacts ?? 10) + (profLimits?.extra_contacts_purchased ?? 0);
    
    return res.json({
      daily_campaigns: dailyLimit,
      campaigns_used_today: usage?.campaigns_sent ?? 0,
      campaign_max_contacts: maxContacts,
      campaign_min_interval_hours: profLimits?.campaign_min_interval_hours ?? planLimits?.campaign_min_interval_hours ?? 24,
    });
  }

  if (action === 'create-campaign') {
    const profId = professionalId || await getProfessionalId(user.sub);
    if (!name || !message) return res.status(400).json({ error: 'Nome e mensagem são obrigatórios' });

    // Get clients
    let clients;
    if (clientIds && clientIds.length > 0) {
      const placeholders = clientIds.map(() => '?').join(',');
      clients = await db.query<any>(`SELECT id, name, phone FROM clients WHERE professional_id = ? AND id IN (${placeholders})`, [profId, ...clientIds]);
    } else {
      clients = await db.query<any>("SELECT id, name, phone FROM clients WHERE professional_id = ? AND phone IS NOT NULL AND phone != ''", [profId]);
    }

    if (!clients.length) return res.status(400).json({ error: 'Nenhum cliente com telefone encontrado' });

    // Create campaign
    const campaignId = db.uuid();
    await db.execute(
      "INSERT INTO campaigns (id, professional_id, name, message, total_contacts, status, scheduled_at) VALUES (?, ?, ?, ?, ?, 'scheduled', NOW())",
      [campaignId, profId, name, message, clients.length]
    );

    // Create contacts
    for (const client of clients) {
      await db.execute(
        "INSERT INTO campaign_contacts (id, campaign_id, client_id, client_name, phone, status) VALUES (?, ?, ?, ?, ?, 'pending')",
        [db.uuid(), campaignId, client.id, client.name, client.phone]
      );
    }

    // Update daily usage
    const today = new Date().toISOString().split('T')[0];
    await db.execute(
      "INSERT INTO daily_message_usage (id, professional_id, usage_date, campaigns_sent) VALUES (?, ?, ?, 1) ON DUPLICATE KEY UPDATE campaigns_sent = campaigns_sent + 1",
      [db.uuid(), profId, today]
    );

    return res.json({ success: true, campaignId, totalContacts: clients.length });
  }

  res.status(400).json({ error: 'Unknown action' });
});

// =============================================
// NOTIFY SIGNUP (authenticated or fire-and-forget)
// =============================================
router.post('/notify-signup', async (req: Request, res: Response) => {
  const { name, businessName, email, phone } = req.body;
  
  try {
    const wa = new WhatsAppService();
    // Find an admin's connected instance
    const inst = await db.queryOne<any>("SELECT instance_name FROM whatsapp_instances WHERE status = 'connected' LIMIT 1");
    if (!inst) return res.json({ success: false, reason: 'no_instance' });

    const adminPhone = config.adminPhone || '';
    if (!adminPhone) return res.json({ success: false, reason: 'no_admin_phone' });

    const msg = `🆕 *Novo cadastro no Gende!*\n\n👤 *Nome:* ${name}\n🏢 *Negócio:* ${businessName || 'N/A'}\n📧 *Email:* ${email}\n📱 *Tel:* ${phone || 'N/A'}\n\n⏰ ${new Date().toLocaleString('pt-BR')}`;
    await wa.sendMessage(inst.instance_name, adminPhone, msg);
    
    res.json({ success: true });
  } catch {
    res.json({ success: false });
  }
});

// =============================================
// WAITLIST PROCESS (authenticated - from frontend)
// =============================================
router.post('/waitlist-process', authMiddleware, async (req: Request, res: Response) => {
  const { action } = req.body;

  if (action === 'process-cancellation') {
    const { professionalId, serviceId, startTime, endTime } = req.body;

    const settings = await db.queryOne<any>('SELECT * FROM waitlist_settings WHERE professional_id = ?', [professionalId]);
    if (settings && !settings.enabled) return res.json({ success: false, reason: 'waitlist_disabled' });

    const maxNotifications = settings?.max_notifications ?? 3;
    const reservationMinutes = settings?.reservation_minutes ?? 3;

    const slotDate = new Date(startTime);
    const dateStr = slotDate.toISOString().split('T')[0];
    const hour = slotDate.getHours();
    const period = hour < 12 ? 'morning' : (hour < 18 ? 'afternoon' : 'evening');

    const entries = await db.query<any>(
      "SELECT * FROM waitlist_entries WHERE professional_id = ? AND status = 'waiting' AND (service_id = ? OR service_id IS NULL) ORDER BY priority DESC, created_at ASC",
      [professionalId, serviceId]
    );

    let compatible = entries.filter((e: any) =>
      e.preferred_date === dateStr && (e.preferred_period === 'any' || e.preferred_period === period)
    );
    if (!compatible.length) compatible = entries;

    const toNotify = compatible.slice(0, maxNotifications);
    if (!toNotify.length) return res.json({ success: false, reason: 'no_candidates' });

    const wa = new WhatsAppService();
    const inst = await db.queryOne<any>("SELECT instance_name, status FROM whatsapp_instances WHERE professional_id = ? LIMIT 1", [professionalId]);
    if (!inst || inst.status !== 'connected') return res.json({ success: false, reason: 'whatsapp_disconnected' });

    const prof = await db.queryOne<any>('SELECT name, business_name, slug FROM professionals WHERE id = ?', [professionalId]);
    const service = await db.queryOne<any>('SELECT name, price FROM services WHERE id = ?', [serviceId]);

    const businessName = prof?.business_name || prof?.name || 'Salão';
    const bookingLink = prof?.slug ? `https://gende.io/${prof.slug}` : '';
    let sent = 0;

    for (const entry of toNotify) {
      const reservedUntil = new Date(Date.now() + reservationMinutes * 60000).toISOString().replace('T', ' ').slice(0, 19);

      await db.execute(
        'INSERT INTO waitlist_offers (id, professional_id, waitlist_entry_id, client_name, client_phone, service_id, slot_start, slot_end, status, reserved_until) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [db.uuid(), professionalId, entry.id, entry.client_name, entry.client_phone, serviceId, startTime, endTime, 'sent', reservedUntil]
      );

      const message = `✨ *Horário disponível!*\n\nOlá ${entry.client_name}!\n\n📅 *${slotDate.toLocaleDateString('pt-BR')}* às *${slotDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}*\n💇 *${service?.name || 'Serviço'}*\n📍 ${businessName}\n\n${bookingLink ? `📲 Agende: ${bookingLink}\n\n` : ''}⏰ Responda rápido!`;

      const sendRes = await wa.sendMessage(inst.instance_name, entry.client_phone, message);
      if (sendRes.ok) sent++;

      await db.execute("UPDATE waitlist_entries SET status = 'notified', notified_at = NOW() WHERE id = ?", [entry.id]);
    }

    return res.json({ success: true, offers_sent: sent });
  }

  res.json({ success: true });
});

// =============================================
// SEND COURSE REMINDERS (authenticated - event-driven triggers from frontend)
// =============================================
router.post('/send-course-reminders', authMiddleware, async (req: Request, res: Response) => {
  const { action, professionalId, triggerType, enrollmentId, classId, extraVars, recipients } = req.body;

  if (action !== 'trigger') return res.status(400).json({ error: 'Unknown action' });

  try {
    const wa = new WhatsAppService();
    const inst = await db.queryOne<any>("SELECT instance_name, status FROM whatsapp_instances WHERE professional_id = ? AND status = 'connected' LIMIT 1", [professionalId]);
    if (!inst) return res.json({ success: false, reason: 'no_whatsapp' });

    // Get automation template for this trigger type
    const automation = await db.queryOne<any>(
      "SELECT * FROM whatsapp_automations WHERE professional_id = ? AND automation_type = ? AND is_enabled = 1",
      [professionalId, triggerType]
    );
    if (!automation) return res.json({ success: false, reason: 'no_automation' });

    let sent = 0;
    const targets = recipients || [];

    // If no explicit recipients, get from enrollment
    if (!targets.length && enrollmentId) {
      const enrollment = await db.queryOne<any>('SELECT student_name, student_phone FROM course_enrollments WHERE id = ?', [enrollmentId]);
      if (enrollment?.student_phone) {
        targets.push({ name: enrollment.student_name, phone: enrollment.student_phone });
      }
    }

    for (const target of targets) {
      const vars = { nome: target.name || 'Aluno', ...(extraVars || {}) };
      const finalMessage = WhatsAppService.replaceVars(automation.custom_message || '', vars);

      const sendRes = await wa.sendMessage(inst.instance_name, target.phone, finalMessage);
      if (sendRes.ok) sent++;

      await db.execute(
        'INSERT INTO whatsapp_logs (id, professional_id, automation_id, booking_id, recipient_phone, message_content, status, sent_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [db.uuid(), professionalId, automation.id, enrollmentId || null, target.phone, finalMessage, sendRes.ok ? 'sent' : 'failed', sendRes.ok ? new Date().toISOString() : null]
      );
    }

    res.json({ success: true, sent });
  } catch (err: any) {
    res.json({ success: false, error: err.message });
  }
});

export default router;
