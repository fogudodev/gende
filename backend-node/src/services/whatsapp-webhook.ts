import { db } from '../core/database.js';
import { config } from '../config.js';
import { WhatsAppService } from './whatsapp.js';

export async function handleEvolutionWebhook(body: any, wa: WhatsAppService) {
  const webhookData = body.data || body;
  const event = webhookData.event || body.event || '';

  if (event !== 'messages.upsert') return;

  const messageData = webhookData.data || webhookData;
  const instanceName = webhookData.instance || body.instance || messageData.instance || '';
  const message = messageData.message || messageData;
  const key = message.key || messageData.key || {};

  if (key.fromMe) return;

  const remoteJid = key.remoteJid || '';
  const clientPhone = remoteJid.replace(/@s\.whatsapp\.net|@g\.us/g, '');
  if (remoteJid.includes('@g.us') || !clientPhone || !instanceName) return;

  const msgContent = message.message || messageData.message || {};
  let clientMessage = msgContent.conversation || msgContent.extendedTextMessage?.text || '';
  if (msgContent.audioMessage) clientMessage = '[Áudio - envie texto por favor]';
  if (msgContent.imageMessage || msgContent.videoMessage || msgContent.documentMessage) {
    clientMessage = '[Mídia recebida - por favor envie uma mensagem de texto]';
  }
  if (!clientMessage) return;

  const instance = await db.queryOne<any>(
    'SELECT professional_id, instance_name, status FROM whatsapp_instances WHERE instance_name = ? LIMIT 1',
    [instanceName]
  );
  if (!instance) return;

  const professionalId = instance.professional_id;
  const professional = await db.queryOne<any>(
    'SELECT id, name, business_name, slug, welcome_message, feature_whatsapp FROM professionals WHERE id = ?',
    [professionalId]
  );
  if (!professional?.feature_whatsapp) return;

  const bookingLink = professional.slug ? `https://gende.io/${professional.slug}` : '';

  const existingConv = await db.queryOne<any>(
    "SELECT * FROM whatsapp_conversations WHERE professional_id = ? AND client_phone = ? AND status = 'active' LIMIT 1",
    [professionalId, clientPhone]
  );

  const services = await db.query<any>(
    'SELECT id, name, price, duration_minutes, description, category FROM services WHERE professional_id = ? AND active = 1 ORDER BY sort_order',
    [professionalId]
  );

  const workingHours = await db.query<any>(
    'SELECT day_of_week, start_time, end_time, is_active FROM working_hours WHERE professional_id = ? ORDER BY day_of_week',
    [professionalId]
  );

  if (!services.length) {
    const welcomeMsg = `Olá! 👋 Bem-vindo(a) ao ${professional.business_name || professional.name}!\n\nNo momento não temos serviços disponíveis. Entre em contato diretamente. 😊`;
    await wa.sendMessage(instanceName, clientPhone, welcomeMsg);
    return;
  }

  if (!existingConv) {
    // First message - welcome
    const profName = professional.business_name || professional.name;
    let welcomeText = professional.welcome_message || `Olá! 👋 Bem-vindo(a) ao *${profName}*! Ficamos felizes em atendê-lo(a)! 😊`;
    if (bookingLink) welcomeText += `\n\n📱 Agende também pela nossa página: ${bookingLink}`;
    welcomeText += '\n\nSe quiser continuar por aqui, é só me dizer o que gostaria. 😊';

    await wa.sendMessage(instanceName, clientPhone, welcomeText);

    const messages = [
      { role: 'user', content: clientMessage },
      { role: 'assistant', content: welcomeText },
    ];

    await db.execute(
      'INSERT INTO whatsapp_conversations (id, professional_id, client_phone, messages, context, status) VALUES (?, ?, ?, ?, ?, ?)',
      [db.uuid(), professionalId, clientPhone, JSON.stringify(messages), JSON.stringify({ client_phone: clientPhone }), 'active']
    );
  } else {
    const context: any = JSON.parse(existingConv.context || '{}');
    const conversationMessages: any[] = JSON.parse(existingConv.messages || '[]');
    conversationMessages.push({ role: 'user', content: clientMessage });

    // Get AI response
    const systemPrompt = buildSystemPrompt(professional, services, null, context, bookingLink, workingHours);
    const aiResponse = await getAIResponse(conversationMessages, systemPrompt);

    // Check for booking intent
    const bookingMatch = aiResponse.match(/\|\|\|BOOKING\|\|\|(.+?)\|\|\|END\|\|\|/);
    if (bookingMatch) {
      try {
        const bookingData = JSON.parse(bookingMatch[1]);
        await processBooking(bookingData, professionalId, instanceName, clientPhone, aiResponse, conversationMessages, context, existingConv, wa);
        return;
      } catch { /* ignore parse errors */ }
    }

    const cleanResponse = aiResponse.replace(/\|\|\|BOOKING\|\|\|.+?\|\|\|END\|\|\|/g, '').trim();
    await wa.sendMessage(instanceName, clientPhone, cleanResponse);

    conversationMessages.push({ role: 'assistant', content: cleanResponse });
    await db.execute(
      'UPDATE whatsapp_conversations SET messages = ?, context = ?, updated_at = NOW() WHERE id = ?',
      [JSON.stringify(conversationMessages), JSON.stringify(context), existingConv.id]
    );
  }
}

async function getAIResponse(messages: any[], systemPrompt: string): Promise<string> {
  if (!config.geminiApiKey) return 'Desculpe, o assistente está indisponível no momento.';

  try {
    const res = await fetch('https://generativelanguage.googleapis.com/v1beta/openai/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${config.geminiApiKey}` },
      body: JSON.stringify({
        model: 'gemini-2.5-flash',
        messages: [{ role: 'system', content: systemPrompt }, ...messages.map(m => ({ role: m.role, content: m.content }))],
      }),
      signal: AbortSignal.timeout(30000),
    });
    const data = await res.json();
    return data.choices?.[0]?.message?.content || 'Desculpe, não entendi. Pode repetir?';
  } catch {
    return 'Desculpe, ocorreu um erro. Tente novamente.';
  }
}

function buildSystemPrompt(professional: any, services: any[], availableSlots: any[] | null, context: any, bookingLink: string, workingHours: any[]): string {
  const profName = professional.business_name || professional.name;
  const now = new Date();
  const todayISO = now.toISOString().split('T')[0];

  const servicesText = services.map((s: any, i: number) =>
    `${i + 1}. ${s.name} (ID: ${s.id}) - R$ ${Number(s.price).toFixed(2)} (${s.duration_minutes} min)${s.description ? ` - ${s.description}` : ''}`
  ).join('\n');

  const dayNames = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
  const whText = dayNames.map((name, d) => {
    const wh = workingHours.find((h: any) => Number(h.day_of_week) === d && h.is_active);
    return wh ? `- ${name}: ${String(wh.start_time).slice(0, 5)} às ${String(wh.end_time).slice(0, 5)}` : `- ${name}: NÃO TRABALHA`;
  }).join('\n');

  return `Você é um assistente de agendamento virtual do "${profName}". Seja simpático, objetivo e profissional. Fale em português brasileiro.

DATA E HORA ATUAL: ${todayISO}

REGRAS IMPORTANTES:
- Guie: escolher serviço → data → horário → confirmar nome e telefone.
- Quando confirmado: |||BOOKING|||{"service_id":"<UUID>","date":"<YYYY-MM-DD>","time":"<HH:MM>","client_name":"<nome>","client_phone":"<telefone>"}|||END|||
- O service_id DEVE ser o UUID da lista. NUNCA invente horários.

SERVIÇOS:
${servicesText}

${whText}

${bookingLink ? `Link de agendamento: ${bookingLink}` : ''}`;
}

async function processBooking(bookingData: any, professionalId: string, instanceName: string, clientPhone: string, aiResponse: string, conversationMessages: any[], context: any, conv: any, wa: WhatsAppService) {
  const startTime = new Date(`${bookingData.date}T${bookingData.time}:00-03:00`);
  const service = await db.queryOne<any>('SELECT * FROM services WHERE id = ? AND professional_id = ? AND active = 1', [bookingData.service_id, professionalId]);

  if (!service) {
    await wa.sendMessage(instanceName, clientPhone, '❌ Serviço não encontrado. Tente novamente.');
    return;
  }

  const endTime = new Date(startTime.getTime() + service.duration_minutes * 60000);
  const clientName = bookingData.client_name || 'Cliente';
  const bookingPhone = WhatsAppService.normalizePhone(bookingData.client_phone || clientPhone);

  // Check conflict
  const [conflict] = await db.query<any>(
    "SELECT COUNT(*) as cnt FROM bookings WHERE professional_id = ? AND status != 'cancelled' AND (? < end_time AND ? > start_time)",
    [professionalId, startTime.toISOString(), endTime.toISOString()]
  );
  if (conflict.cnt > 0) {
    await wa.sendMessage(instanceName, clientPhone, '❌ Horário já ocupado. Tente outro horário.');
    return;
  }

  // Find or create client
  let client = await db.queryOne<any>('SELECT id FROM clients WHERE professional_id = ? AND phone = ? LIMIT 1', [professionalId, bookingPhone]);
  let clientId = client?.id;
  if (!clientId) {
    clientId = db.uuid();
    await db.execute('INSERT INTO clients (id, professional_id, name, phone) VALUES (?, ?, ?, ?)', [clientId, professionalId, clientName, bookingPhone]);
  }

  const bookingId = db.uuid();
  const startStr = startTime.toISOString().replace('T', ' ').slice(0, 19);
  const endStr = endTime.toISOString().replace('T', ' ').slice(0, 19);
  await db.execute(
    'INSERT INTO bookings (id, professional_id, client_id, service_id, start_time, end_time, status, price, duration_minutes, client_name, client_phone) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [bookingId, professionalId, clientId, bookingData.service_id, startStr, endStr, 'pending', service.price, service.duration_minutes, clientName, bookingPhone]
  );

  let friendlyMsg = aiResponse.replace(/\|\|\|BOOKING\|\|\|.+?\|\|\|END\|\|\|/g, '').trim();
  if (!friendlyMsg) {
    friendlyMsg = `✅ Seu agendamento foi confirmado!\n\n📅 Data: ${bookingData.date}\n⏰ Horário: ${bookingData.time}\n💰 Valor: R$ ${Number(service.price).toFixed(2).replace('.', ',')}\n\nAgradecemos pela preferência! 😊`;
  }

  await wa.sendMessage(instanceName, clientPhone, friendlyMsg);

  conversationMessages.push({ role: 'assistant', content: friendlyMsg });
  context.booking_id = bookingId;
  await db.execute(
    "UPDATE whatsapp_conversations SET status = 'completed', messages = ?, context = ? WHERE id = ?",
    [JSON.stringify(conversationMessages), JSON.stringify(context), conv.id]
  );

  await db.execute(
    'INSERT INTO whatsapp_logs (id, professional_id, booking_id, recipient_phone, message_content, status, sent_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [db.uuid(), professionalId, bookingId, clientPhone, friendlyMsg, 'sent', new Date().toISOString()]
  );

  // Trigger booking_created automation
  await wa.triggerAutomation({ professionalId, bookingId, triggerType: 'booking_created' });
}
