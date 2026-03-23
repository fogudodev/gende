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

    await db.execute(
      'INSERT INTO whatsapp_instances (id, professional_id, instance_name, instance_id, status, qr_code) VALUES (?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE instance_name = VALUES(instance_name), status = VALUES(status), qr_code = VALUES(qr_code)',
      [db.uuid(), professionalId, instanceName, res.data?.instance?.instanceName || instanceName, 'connecting', res.data?.qrcode?.base64 || '']
    );

    // Auto-configure webhook
    const webhookUrl = `${config.appUrl}/whatsapp-webhook`;
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

  async triggerAutomation(data: { professionalId: string; bookingId: string; triggerType: string }) {
    const { professionalId, bookingId, triggerType } = data;

    const prof = await db.queryOne<any>('SELECT id, slug, welcome_message, reminder_message, confirmation_message, business_name, name FROM professionals WHERE id = ?', [professionalId]);
    if (!prof) return { success: false, error: 'Profissional não encontrado' };

    const inst = await db.queryOne<any>("SELECT instance_name, status FROM whatsapp_instances WHERE professional_id = ? LIMIT 1", [professionalId]);
    if (!inst || inst.status !== 'connected') return { success: false, error: 'WhatsApp não conectado' };

    const automation = await db.queryOne<any>('SELECT * FROM whatsapp_automations WHERE professional_id = ? AND trigger_type = ? AND is_active = 1 LIMIT 1', [professionalId, triggerType]);
    if (!automation) return { success: false, error: 'Automação não ativa' };

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
    };

    let messageTemplate = automation.message_template;
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
