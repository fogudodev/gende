import { config } from '../config.js';
import { db } from '../core/database.js';

interface SendResult {
  data: any;
  status: number;
  ok: boolean;
  provider: string;
  fallback?: boolean;
  evolution_error?: any;
}

export class WhatsAppService {
  static normalizePhone(phone: string): string {
    const digits = phone.replace(/\D/g, '');
    if (digits.startsWith('55') && digits.length >= 12 && digits.length <= 13) return digits;
    if (digits.length >= 10 && digits.length <= 11) return '55' + digits;
    return digits;
  }

  static replaceVars(template: string, vars: Record<string, string>): string {
    let result = template;
    for (const [key, value] of Object.entries(vars)) {
      result = result.replaceAll(`{${key}}`, value ?? '');
    }
    return result;
  }

  private async evolutionRequest(endpoint: string, method = 'GET', body?: any): Promise<SendResult> {
    try {
      const res = await fetch(`${config.evolution.url}${endpoint}`, {
        method,
        headers: { 'Content-Type': 'application/json', apikey: config.evolution.key },
        body: body ? JSON.stringify(body) : undefined,
        signal: AbortSignal.timeout(15000),
      });
      const data = await res.json().catch(() => ({}));
      return { data, status: res.status, ok: res.ok, provider: 'evolution' };
    } catch {
      return { data: { error: 'Evolution API unreachable' }, status: 500, ok: false, provider: 'evolution' };
    }
  }

  async sendMessage(instanceName: string, phone: string, message: string): Promise<SendResult> {
    const normalizedPhone = WhatsAppService.normalizePhone(phone);

    // 1) Try Evolution API
    const res = await this.evolutionRequest(`/message/sendText/${instanceName}`, 'POST', {
      number: normalizedPhone, text: message,
    });
    if (res.ok) return { ...res, provider: 'evolution' };

    // 2) Fallback to Meta Cloud API
    const metaRes = await this.sendViaMeta(normalizedPhone, message);
    return { ...metaRes, fallback: true, evolution_error: res.data };
  }

  private async sendViaMeta(phone: string, message: string): Promise<SendResult> {
    if (!config.meta.whatsappToken || !config.meta.whatsappPhoneId) {
      return { data: { error: 'Meta Cloud API not configured' }, status: 500, ok: false, provider: 'meta' };
    }

    try {
      const res = await fetch(
        `https://graph.facebook.com/${config.meta.apiVersion}/${config.meta.whatsappPhoneId}/messages`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${config.meta.whatsappToken}` },
          body: JSON.stringify({
            messaging_product: 'whatsapp', recipient_type: 'individual', to: phone,
            type: 'text', text: { preview_url: true, body: message },
          }),
          signal: AbortSignal.timeout(15000),
        }
      );
      const data = await res.json().catch(() => ({}));
      return { data, status: res.status, ok: res.ok, provider: 'meta' };
    } catch {
      return { data: { error: 'Meta API unreachable' }, status: 500, ok: false, provider: 'meta' };
    }
  }

  async sendMetaTemplate(phone: string, templateName: string, languageCode = 'pt_BR', parameters: string[] = []): Promise<SendResult> {
    if (!config.meta.whatsappToken || !config.meta.whatsappPhoneId) {
      return { data: { error: 'Meta Cloud API not configured' }, status: 500, ok: false, provider: 'meta' };
    }

    const components: any[] = [];
    if (parameters.length > 0) {
      components.push({ type: 'body', parameters: parameters.map(v => ({ type: 'text', text: String(v) })) });
    }

    try {
      const res = await fetch(
        `https://graph.facebook.com/${config.meta.apiVersion}/${config.meta.whatsappPhoneId}/messages`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${config.meta.whatsappToken}` },
          body: JSON.stringify({
            messaging_product: 'whatsapp', to: WhatsAppService.normalizePhone(phone),
            type: 'template', template: { name: templateName, language: { code: languageCode }, components },
          }),
          signal: AbortSignal.timeout(15000),
        }
      );
      const data = await res.json().catch(() => ({}));
      return { data, status: res.status, ok: res.ok, provider: 'meta' };
    } catch {
      return { data: { error: 'Meta API unreachable' }, status: 500, ok: false, provider: 'meta' };
    }
  }

  async createInstance(instanceName: string, professionalId: string) {
    const res = await this.evolutionRequest('/instance/create', 'POST', {
      instanceName, integration: 'WHATSAPP-BAILEYS', qrcode: true,
    });

    // Check if instance already exists for this professional
    const existing = await db.queryOne<any>('SELECT id FROM whatsapp_instances WHERE professional_id = ? LIMIT 1', [professionalId]);
    if (existing) {
      await db.execute(
        'UPDATE whatsapp_instances SET instance_name = ?, status = ?, qr_code = ?, updated_at = NOW() WHERE id = ?',
        [instanceName, 'connecting', res.data?.qrcode?.base64 || '', existing.id]
      );
    } else {
      await db.execute(
        'INSERT INTO whatsapp_instances (id, professional_id, instance_name, status, qr_code) VALUES (?, ?, ?, ?, ?)',
        [db.uuid(), professionalId, instanceName, 'connecting', res.data?.qrcode?.base64 || '']
      );
    }

    // Auto-configure webhook
    const webhookUrl = `${config.appUrl}/whatsapp/webhook`;
    await this.evolutionRequest(`/webhook/set/${instanceName}`, 'POST', {
      webhook: { enabled: true, url: webhookUrl, webhookByEvents: false, webhookBase64: false, events: ['MESSAGES_UPSERT', 'CONNECTION_UPDATE'] },
    });

    return res.data;
  }

  async getQrcode(instanceName: string) {
    return (await this.evolutionRequest(`/instance/connect/${instanceName}`)).data;
  }

  async checkStatus(instanceName: string, professionalId?: string) {
    const res = await this.evolutionRequest(`/instance/connectionState/${instanceName}`);
    if (professionalId) {
      const status = res.status === 404 ? 'disconnected' : (res.data?.instance?.state === 'open' ? 'connected' : 'disconnected');
      await db.execute('UPDATE whatsapp_instances SET status = ? WHERE professional_id = ?', [status, professionalId]);
    }
    return res.data;
  }

  async triggerAutomation(data: { professionalId: string; bookingId?: string; enrollmentId?: string; triggerType: string; extraVars?: Record<string, string>; recipients?: Array<{ name: string; phone: string }> }) {
    const { professionalId, bookingId, enrollmentId, triggerType, extraVars, recipients } = data;

    const prof = await db.queryOne<any>('SELECT id, slug, welcome_message, reminder_message, confirmation_message, business_name, name FROM professionals WHERE id = ?', [professionalId]);
    if (!prof) return { success: false, error: 'Profissional não encontrado' };

    const inst = await db.queryOne<any>("SELECT instance_name, status FROM whatsapp_instances WHERE professional_id = ? LIMIT 1", [professionalId]);
    if (!inst || inst.status !== 'connected') return { success: false, error: 'WhatsApp não conectado' };

    const automation = await db.queryOne<any>('SELECT * FROM whatsapp_automations WHERE professional_id = ? AND automation_type = ? AND is_enabled = 1 LIMIT 1', [professionalId, triggerType]);
    if (!automation) return { success: false, error: 'Automação não ativa' };

    // =============================================
    // COURSE AUTOMATIONS (recipients-based)
    // =============================================
    const courseTriggers = [
      'course_enrollment_confirmed', 'course_payment_confirmed', 'course_rescheduled',
      'course_cancelled', 'course_waitlist_new_class', 'course_certificate_sent',
      'course_next_offer', 'course_reminder_7d', 'course_reminder_1d', 'course_reminder_day',
      'course_send_location', 'course_send_link', 'course_followup', 'course_feedback_request',
    ];

    if (courseTriggers.includes(triggerType)) {
      const targetRecipients = recipients || [];

      // If no recipients provided, try to get from enrollment
      if (!targetRecipients.length && enrollmentId) {
        const enrollment = await db.queryOne<any>(
          'SELECT e.*, c.name as course_name, cc.name as class_name, cc.class_date, cc.start_time, cc.location, cc.online_link FROM course_enrollments e LEFT JOIN courses c ON c.id = e.course_id LEFT JOIN course_classes cc ON cc.id = e.class_id WHERE e.id = ?',
          [enrollmentId]
        );
        if (enrollment?.student_phone) {
          targetRecipients.push({ name: enrollment.student_name, phone: enrollment.student_phone });
          if (!extraVars) {
            Object.assign(data, {
              extraVars: {
                curso: enrollment.course_name || '',
                turma: enrollment.class_name || '',
                data: enrollment.class_date ? new Date(enrollment.class_date).toLocaleDateString('pt-BR') : '',
                horario: (enrollment.start_time || '').slice(0, 5),
                local: enrollment.location || '',
                link_aula: enrollment.online_link || '',
              }
            });
          }
        }
      }

      if (!targetRecipients.length) return { success: false, error: 'Sem destinatários' };

      const results: any[] = [];
      for (const recipient of targetRecipients) {
        const phone = WhatsAppService.normalizePhone(recipient.phone);
        if (!phone) continue;

        const vars: Record<string, string> = {
          nome: recipient.name || 'Aluno',
          ...(extraVars || {}),
        };

        const finalMessage = WhatsAppService.replaceVars(automation.custom_message || '', vars);
        const sendRes = await this.sendMessage(inst.instance_name, phone, finalMessage);

        await db.execute(
          'INSERT INTO whatsapp_logs (id, professional_id, phone, message_type, status, metadata) VALUES (?, ?, ?, ?, ?, ?)',
          [db.uuid(), professionalId, phone, triggerType, sendRes.ok ? 'sent' : 'failed', JSON.stringify({ message: finalMessage, automation_id: automation.id, enrollment_id: enrollmentId, provider: sendRes.provider, error: sendRes.ok ? null : sendRes.data })]
        );

        results.push({ phone, success: sendRes.ok });
      }

      return { success: results.some(r => r.success), data: results };
    }

    // =============================================
    // BOOKING AUTOMATIONS (original logic)
    // =============================================
    if (!bookingId) return { success: false, error: 'bookingId obrigatório para automações de agendamento' };

    const booking = await db.queryOne<any>('SELECT b.*, s.name as service_name FROM bookings b LEFT JOIN services s ON s.id = b.service_id WHERE b.id = ?', [bookingId]);
    if (!booking) return { success: false, error: 'Agendamento não encontrado' };

    const phone = WhatsAppService.normalizePhone(booking.client_phone || '');
    if (!phone) return { success: false, error: 'Cliente sem telefone' };

    const bookingLink = prof.slug ? `https://gende.io/${prof.slug}` : '';
    const reviewLink = prof.slug ? `https://gende.io/${prof.slug}?review=true&booking=${bookingId}${booking.employee_id ? `&employee=${booking.employee_id}` : ''}` : '';
    const startDate = new Date(booking.start_time);

    const vars: Record<string, string> = {
      nome: booking.client_name || 'Cliente',
      servico: booking.service_name || 'serviço',
      data: startDate.toLocaleDateString('pt-BR'),
      horario: startDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      link: bookingLink,
      link_avaliacao: reviewLink,
      ...(extraVars || {}),
    };

    let messageTemplate = automation.custom_message || '';
    if (triggerType === 'booking_created' && prof.confirmation_message) {
      messageTemplate = prof.confirmation_message;
      if (bookingLink) messageTemplate += `\n\n📅 Agende novamente: ${bookingLink}`;
    } else if (['reminder_24h', 'reminder_3h'].includes(triggerType) && prof.reminder_message) {
      messageTemplate = prof.reminder_message;
    } else if (triggerType === 'post_service') {
      if (prof.welcome_message) messageTemplate = prof.welcome_message;
      if (bookingLink) messageTemplate += `\n\n📅 Agende novamente: ${bookingLink}`;
    }

    const finalMessage = WhatsAppService.replaceVars(messageTemplate, vars);
    const sendRes = await this.sendMessage(inst.instance_name, phone, finalMessage);

    if (sendRes.status === 404 && sendRes.provider === 'evolution') {
      await db.execute("UPDATE whatsapp_instances SET status = 'disconnected' WHERE instance_name = ?", [inst.instance_name]);
    }

    await db.execute(
      'INSERT INTO whatsapp_logs (id, professional_id, automation_id, booking_id, recipient_phone, message_content, status, sent_at, error_message, provider) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [db.uuid(), professionalId, automation.id, bookingId, phone, finalMessage, sendRes.ok ? 'sent' : 'failed', sendRes.ok ? new Date().toISOString() : null, sendRes.ok ? null : JSON.stringify(sendRes.data), sendRes.provider]
    );

    return { success: sendRes.ok, data: sendRes.data };
  }
}
