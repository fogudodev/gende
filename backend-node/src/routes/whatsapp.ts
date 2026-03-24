import { Router, Request, Response } from 'express';
import { db } from '../core/database.js';
import { authMiddleware, getProfessionalId, JwtPayload } from '../core/auth.js';
import { config } from '../config.js';
import { WhatsAppService } from '../services/whatsapp.js';

const router = Router();
const wa = new WhatsAppService();

// WhatsApp actions
router.post('/whatsapp/send', authMiddleware, async (req: Request, res: Response) => {
  const user = (req as any).user as JwtPayload;
  const profId = await getProfessionalId(user.sub);
  const inst = await db.queryOne<any>("SELECT instance_name FROM whatsapp_instances WHERE professional_id = ? AND status = 'connected' LIMIT 1", [profId]);

  const { phone, message } = req.body;
  const sendRes = await wa.sendMessage(inst?.instance_name || '', phone, message);

  await db.execute(
    'INSERT INTO whatsapp_logs (id, professional_id, phone, message_type, status, metadata) VALUES (?, ?, ?, ?, ?, ?)',
    [db.uuid(), profId, WhatsAppService.normalizePhone(phone), 'manual_send', sendRes.ok ? 'sent' : 'failed', JSON.stringify({ message, provider: sendRes.provider })]
  );

  if (sendRes.ok) res.json({ provider: sendRes.provider, fallback: sendRes.fallback || false });
  else res.status(502).json({ error: 'Failed to send message' });
});

router.post('/whatsapp/send-meta-template', authMiddleware, async (req: Request, res: Response) => {
  const { phone, template_name, language = 'pt_BR', parameters = [] } = req.body;
  const sendRes = await wa.sendMetaTemplate(phone, template_name, language, parameters);
  if (sendRes.ok) res.json(sendRes.data);
  else res.status(502).json({ error: 'Template send failed', details: sendRes.data });
});

// Instance management
router.post('/whatsapp/instance', authMiddleware, async (req: Request, res: Response) => {
  const { action, instanceName, professionalId } = req.body;
  try {
    if (!instanceName && action !== 'create-instance') {
      return res.status(400).json({ error: 'instanceName é obrigatório' });
    }
    if (action === 'create-instance') {
      if (!instanceName || !professionalId) {
        return res.status(400).json({ error: 'instanceName e professionalId são obrigatórios' });
      }
      const data = await wa.createInstance(instanceName, professionalId);
      res.json(data);
    } else if (action === 'get-qrcode') {
      const data = await wa.getQrcode(instanceName);
      res.json(data);
    } else if (action === 'check-status') {
      const data = await wa.checkStatus(instanceName, professionalId);
      res.json(data);
    } else {
      res.status(400).json({ error: `Unknown action: ${action}` });
    }
  } catch (e: any) {
    console.error('[WhatsApp Instance Error]', action, e.message, e.stack);
    res.status(500).json({ error: e.message || 'Erro interno ao processar instância WhatsApp' });
  }
});

// Trigger automation
router.post('/whatsapp/trigger-automation', authMiddleware, async (req: Request, res: Response) => {
  const result = await wa.triggerAutomation(req.body);
  res.json(result);
});

// Commission notifications
router.post('/whatsapp/notify-commission', authMiddleware, async (req: Request, res: Response) => {
  const { professionalId, employeeId, bookingAmount, percentage, commissionAmount } = req.body;

  const employee = await db.queryOne<any>('SELECT name, phone FROM salon_employees WHERE id = ?', [employeeId]);
  if (!employee?.phone) return res.json({ success: false, error: 'Funcionário sem telefone' });

  const inst = await db.queryOne<any>("SELECT instance_name, status FROM whatsapp_instances WHERE professional_id = ? LIMIT 1", [professionalId]);
  if (!inst || inst.status !== 'connected') return res.json({ success: false, error: 'WhatsApp não conectado' });

  const msg = `💰 *Nova comissão pendente!*\n\nOlá ${employee.name}! Você tem uma nova comissão:\n\n💇 Valor do serviço: R$ ${Number(bookingAmount).toFixed(2)}\n📊 Percentual: ${percentage}%\n💵 Sua comissão: *R$ ${Number(commissionAmount).toFixed(2)}*\n\nAguarde o repasse pelo gestor. 😊`;

  const sendRes = await wa.sendMessage(inst.instance_name, employee.phone, msg);
  await db.execute(
    'INSERT INTO whatsapp_logs (id, professional_id, phone, message_type, status, metadata) VALUES (?, ?, ?, ?, ?, ?)',
    [db.uuid(), professionalId, WhatsAppService.normalizePhone(employee.phone), 'commission_notify', sendRes.ok ? 'sent' : 'failed', JSON.stringify({ message: msg, provider: 'evolution' })]
  );

  res.json({ success: sendRes.ok });
});

// Meta Cloud API Webhook verification
router.get('/whatsapp/meta-webhook', (req: Request, res: Response) => {
  const mode = req.query['hub.mode'] as string;
  const token = req.query['hub.verify_token'] as string;
  const challenge = req.query['hub.challenge'] as string;

  if (mode === 'subscribe' && token === config.meta.webhookVerifyToken) {
    res.type('text/plain').status(200).send(challenge);
  } else {
    res.status(403).send('Forbidden');
  }
});

// Meta Webhook incoming messages
router.post('/whatsapp/meta-webhook', async (req: Request, res: Response) => {
  const body = req.body;
  if (body.object !== 'whatsapp_business_account') return res.json({ success: true });

  for (const entry of body.entry || []) {
    for (const change of entry.changes || []) {
      if (change.field !== 'messages') continue;
      const value = change.value;
      if (!value?.messages) continue;

      for (const msg of value.messages) {
        const from = msg.from;
        const text = msg.text?.body || '';
        if (!text || !from) continue;

        // Find professional by phone_id
        // For now, just log it. Full webhook handling can be expanded.
        console.log(`[Meta Webhook] From: ${from}, Message: ${text}`);
      }
    }
  }

  res.json({ success: true });
});

// Evolution API Webhook
router.post('/whatsapp/webhook', async (req: Request, res: Response) => {
  // Import webhook handler
  const { handleEvolutionWebhook } = await import('../services/whatsapp-webhook.js');
  await handleEvolutionWebhook(req.body, wa);
  res.json({ success: true });
});

router.get('/whatsapp/webhook', (req: Request, res: Response) => {
  // Evolution doesn't need GET verification, but keep for compatibility
  res.json({ status: 'ok' });
});

export default router;
