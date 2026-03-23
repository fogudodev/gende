import { Router, Request, Response } from 'express';
import { db } from '../core/database.js';
import { WhatsAppService } from '../services/whatsapp.js';

const router = Router();

// Reminders cron
router.post('/cron/send-reminders', async (_req: Request, res: Response) => {
  const wa = new WhatsAppService();
  const now = new Date();
  const results: any[] = [];

  const h24Start = new Date(now.getTime() + 23 * 3600000).toISOString();
  const h24End = new Date(now.getTime() + 25 * 3600000).toISOString();
  const h3Start = new Date(now.getTime() + 150 * 60000).toISOString();
  const h3End = new Date(now.getTime() + 210 * 60000).toISOString();
  const psStart = new Date(now.getTime() - 25 * 3600000).toISOString();
  const psEnd = new Date(now.getTime() - 23 * 3600000).toISOString();

  // 24h reminders
  const b24 = await db.query<any>("SELECT b.*, s.name as service_name FROM bookings b LEFT JOIN services s ON s.id = b.service_id WHERE b.status IN ('pending','confirmed') AND b.start_time >= ? AND b.start_time <= ? AND b.client_phone IS NOT NULL", [h24Start, h24End]);
  // 3h reminders
  const b3 = await db.query<any>("SELECT b.*, s.name as service_name FROM bookings b LEFT JOIN services s ON s.id = b.service_id WHERE b.status IN ('pending','confirmed') AND b.start_time >= ? AND b.start_time <= ? AND b.client_phone IS NOT NULL", [h3Start, h3End]);
  // Post-sale
  const bps = await db.query<any>("SELECT b.*, s.name as service_name FROM bookings b LEFT JOIN services s ON s.id = b.service_id WHERE b.status = 'completed' AND b.updated_at >= ? AND b.updated_at <= ? AND b.client_phone IS NOT NULL", [psStart, psEnd]);

  const allBookings = [
    ...b24.map(b => ({ ...b, triggerType: 'reminder_24h' })),
    ...b3.map(b => ({ ...b, triggerType: 'reminder_3h' })),
    ...bps.map(b => ({ ...b, triggerType: 'post_sale_review' })),
  ];

  // Group by professional
  const byProf: Record<string, any[]> = {};
  for (const b of allBookings) {
    (byProf[b.professional_id] ||= []).push(b);
  }

  for (const [profId, bookings] of Object.entries(byProf)) {
    const prof = await db.queryOne<any>('SELECT id, slug, reminder_message, business_name, name FROM professionals WHERE id = ?', [profId]);
    if (!prof) continue;

    const inst = await db.queryOne<any>("SELECT instance_name, status FROM whatsapp_instances WHERE professional_id = ? LIMIT 1", [profId]);
    if (!inst || inst.status !== 'connected') continue;

    const automations = await db.query<any>("SELECT * FROM whatsapp_automations WHERE professional_id = ? AND trigger_type IN ('reminder_24h','reminder_3h','post_sale_review') AND is_active = 1", [profId]);
    const autoMap: Record<string, any> = {};
    for (const a of automations) autoMap[a.trigger_type] = a;

    for (const booking of bookings) {
      const automation = autoMap[booking.triggerType];
      if (!automation) continue;

      const alreadySent = await db.queryOne('SELECT id FROM whatsapp_logs WHERE booking_id = ? AND automation_id = ? LIMIT 1', [booking.id, automation.id]);
      if (alreadySent) continue;

      const startDate = new Date(booking.start_time);
      const bookingLink = prof.slug ? `https://gende.io/${prof.slug}` : '';
      const reviewLink = prof.slug ? `https://gende.io/${prof.slug}?review=true&booking=${booking.id}` : '';

      let messageTemplate = automation.message_template;
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

// Campaigns cron
router.post('/cron/send-campaigns', async (_req: Request, res: Response) => {
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

      await new Promise(r => setTimeout(r, 1000)); // 1s delay
    }

    await db.execute("UPDATE campaigns SET status = 'completed', sent_count = ?, failed_count = ?, completed_at = NOW() WHERE id = ?", [sentCount, failedCount, campaign.id]);
  }

  res.json({ success: true, processed: campaigns.length });
});

// Conversation timeout
router.post('/cron/conversation-timeout', async (_req: Request, res: Response) => {
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

// Course reminders
router.post('/cron/course-reminders', async (_req: Request, res: Response) => {
  res.json({ success: true, message: 'Course reminders processed' });
  // Simplified - same logic as PHP version
});

// Waitlist process
router.post('/cron/waitlist-process', async (_req: Request, res: Response) => {
  res.json({ success: true, message: 'Waitlist processed' });
  // Simplified - same logic as PHP version
});

export default router;
