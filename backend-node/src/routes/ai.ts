import { Router, Request, Response } from 'express';
import { db } from '../core/database.js';
import { authMiddleware, getProfessionalId, JwtPayload } from '../core/auth.js';
import { config } from '../config.js';

const router = Router();

router.post('/ai-assistant', authMiddleware, async (req: Request, res: Response) => {
  const user = (req as any).user as JwtPayload;
  if (!config.geminiApiKey) return res.status(500).json({ error: 'Chave da IA não configurada' });

  const { messages } = req.body;

  // Support impersonation: if X-Impersonate-User header is set (admin only), use that user_id
  let targetUserId = user.sub;
  if (user.roles?.includes('admin') && req.headers['x-impersonate-user']) {
    targetUserId = req.headers['x-impersonate-user'] as string;
  }

  // Also check if there's an impersonated professional_id directly in the body
  let professional: any = null;
  if (req.body.professionalId) {
    professional = await db.queryOne<any>('SELECT * FROM professionals WHERE id = ?', [req.body.professionalId]);
  }
  if (!professional) {
    professional = await db.queryOne<any>('SELECT * FROM professionals WHERE user_id = ?', [targetUserId]);
  }
  if (!professional) return res.status(404).json({ error: 'Profissional não encontrado' });

  const pid = professional.id;
  const bookings = await db.query<any>("SELECT * FROM bookings WHERE professional_id = ? ORDER BY start_time LIMIT 1000", [pid]);
  const clients = await db.query<any>('SELECT * FROM clients WHERE professional_id = ?', [pid]);
  const services = await db.query<any>('SELECT * FROM services WHERE professional_id = ?', [pid]);
  const employees = await db.query<any>('SELECT * FROM salon_employees WHERE salon_id = ?', [pid]);
  const expenses = await db.query<any>('SELECT * FROM expenses WHERE professional_id = ? ORDER BY expense_date LIMIT 1000', [pid]);
  const subscription = await db.queryOne<any>('SELECT plan_id, status FROM subscriptions WHERE professional_id = ? ORDER BY created_at DESC LIMIT 1', [pid]);

  let totalRevenue = 0, completedCount = 0, cancelledCount = 0;
  for (const b of bookings) {
    if (b.status === 'completed') { totalRevenue += Number(b.price); completedCount++; }
    if (b.status === 'cancelled') cancelledCount++;
  }
  const totalExpenses = expenses.reduce((sum: number, e: any) => sum + Number(e.amount), 0);
  const avgTicket = completedCount > 0 ? totalRevenue / completedCount : 0;

  const ownerName = (professional.name || '').split(' ')[0];
  const businessContext = `## PERFIL
- Nome: ${professional.business_name || professional.name}
- Plano: ${subscription?.plan_id || 'Nenhum'}

## RESUMO GERAL
- Faturamento: R$ ${totalRevenue.toFixed(2)}
- Despesas: R$ ${totalExpenses.toFixed(2)}
- Lucro bruto: R$ ${(totalRevenue - totalExpenses).toFixed(2)}
- Total agendamentos: ${bookings.length} | Concluídos: ${completedCount} | Cancelados: ${cancelledCount}
- Ticket médio: R$ ${avgTicket.toFixed(2)}
- Clientes cadastrados: ${clients.length}

## EQUIPE (${employees.length} membros)
${employees.map((e: any) => `- ${e.name}`).join('\n')}`;

  const systemPrompt = `Você é a **Lis**, consultora especialista em crescimento para negócios de beleza. Trate o dono como ${ownerName}.

## REGRAS
- CONCISA: máx 300 palavras
- Baseie-se APENAS nos dados reais fornecidos
- Inclua IMPACTO FINANCEIRO das sugestões
- Português brasileiro
- Emojis moderados

${businessContext}`;

  // SSE streaming
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  try {
    const aiRes = await fetch('https://generativelanguage.googleapis.com/v1beta/openai/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${config.geminiApiKey}` },
      body: JSON.stringify({
        model: 'gemini-2.5-flash', stream: true,
        messages: [{ role: 'system', content: systemPrompt }, ...messages],
      }),
    });

    if (!aiRes.body) { res.end(); return; }

    const reader = aiRes.body.getReader();
    const decoder = new TextDecoder();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      res.write(decoder.decode(value, { stream: true }));
    }
  } catch { /* stream error */ }
  res.end();
});

// Upsell suggest
router.post('/upsell-suggest', authMiddleware, async (req: Request, res: Response) => {
  const { professionalId, sourceServiceId } = req.body;
  if (!professionalId || !sourceServiceId) return res.status(400).json({ error: 'Missing params' });

  // Check feature flags
  const override = await db.queryOne<any>('SELECT enabled FROM professional_feature_overrides WHERE professional_id = ? AND feature_key = ?', [professionalId, 'upsell_inteligente']);
  if (override && !override.enabled) return res.json({ suggestions: [] });

  const flag = await db.queryOne<any>("SELECT enabled FROM feature_flags WHERE `key` = ?", ['upsell_inteligente']);
  if (!flag?.enabled) return res.json({ suggestions: [] });

  // Rules-based
  const rules = await db.query<any>(
    'SELECT ur.*, s.id as rec_id, s.name as rec_name, s.price as rec_price, s.duration_minutes as rec_duration FROM upsell_rules ur LEFT JOIN services s ON s.id = ur.recommended_service_id WHERE ur.professional_id = ? AND ur.source_service_id = ? AND ur.is_active = 1 ORDER BY ur.priority LIMIT 3',
    [professionalId, sourceServiceId]
  );

  if (rules.length) {
    return res.json({
      suggestions: rules.map(r => ({
        service: { id: r.rec_id, name: r.rec_name, price: r.rec_price, duration_minutes: r.rec_duration },
        promo_message: r.promo_message, promo_price: r.promo_price,
      })),
      source: 'rules',
    });
  }

  // AI fallback
  if (!config.geminiApiKey) return res.json({ suggestions: [] });

  const source = await db.queryOne<any>('SELECT name, price FROM services WHERE id = ?', [sourceServiceId]);
  const services = await db.query<any>('SELECT id, name, price, duration_minutes FROM services WHERE professional_id = ? AND active = 1 AND id != ?', [professionalId, sourceServiceId]);
  if (!services.length || !source) return res.json({ suggestions: [] });

  const svcList = services.map((s: any) => `- ${s.name} (R$ ${Number(s.price).toFixed(2)}, ${s.duration_minutes} min, ID: ${s.id})`).join('\n');
  const prompt = `Cliente agendou "${source.name}" (R$ ${source.price}). Sugira até 2 serviços complementares.\nServiços:\n${svcList}\n\nResponda JSON array: [{"service_id":"uuid","message":"frase de upsell"}]`;

  try {
    const aiRes = await fetch('https://generativelanguage.googleapis.com/v1beta/openai/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${config.geminiApiKey}` },
      body: JSON.stringify({ model: 'gemini-2.5-flash', messages: [{ role: 'user', content: prompt }] }),
    });
    const data = await aiRes.json() as any;
    const content = data.choices?.[0]?.message?.content || '';
    const match = content.match(/\[.*\]/s);
    const aiSuggestions = JSON.parse(match?.[0] || '[]');

    const enriched = aiSuggestions.map((s: any) => {
      const svc = services.find((sv: any) => sv.id === s.service_id);
      return svc ? { service: svc, promo_message: s.message, promo_price: null } : null;
    }).filter(Boolean);

    return res.json({ suggestions: enriched, source: 'ai' });
  } catch {
    return res.json({ suggestions: [] });
  }
});

export default router;
