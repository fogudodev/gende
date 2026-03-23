import { Router, Request, Response } from 'express';
import { db } from '../core/database.js';
import { authMiddleware, getProfessionalId, JwtPayload } from '../core/auth.js';
import { config } from '../config.js';

const router = Router();

async function metaRequest(url: string): Promise<any> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
    return await res.json();
  } catch { return {}; }
}

router.post('/instagram/oauth', authMiddleware, async (req: Request, res: Response) => {
  const user = (req as any).user as JwtPayload;
  const profId = await getProfessionalId(user.sub);
  const { action, redirect_uri, code } = req.body;

  if (action === 'get_auth_url') {
    const scopes = 'instagram_basic,instagram_manage_messages,pages_show_list,pages_read_engagement';
    const authUrl = `https://www.facebook.com/v21.0/dialog/oauth?client_id=${config.meta.appId}&redirect_uri=${encodeURIComponent(redirect_uri)}&scope=${scopes}&state=${user.sub}&response_type=code`;
    return res.json({ auth_url: authUrl });
  }

  if (action === 'exchange_code') {
    if (!code || !redirect_uri) return res.status(400).json({ error: 'Código ou redirect_uri inválido' });

    const tokenData = await metaRequest(`https://graph.facebook.com/v21.0/oauth/access_token?client_id=${config.meta.appId}&client_secret=${config.meta.appSecret}&redirect_uri=${encodeURIComponent(redirect_uri)}&code=${code}`);
    if (!tokenData.access_token) return res.status(400).json({ error: tokenData.error?.message || 'Erro ao trocar código' });

    const longData = await metaRequest(`https://graph.facebook.com/v21.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${config.meta.appId}&client_secret=${config.meta.appSecret}&fb_exchange_token=${tokenData.access_token}`);
    const token = longData.access_token || tokenData.access_token;
    const expiresIn = longData.expires_in || 5184000;

    const pages = await metaRequest(`https://graph.facebook.com/v21.0/me/accounts?fields=id,name,access_token,instagram_business_account&access_token=${token}`);
    let igAccountId = null, pageToken = null;
    for (const page of pages.data || []) {
      if (page.instagram_business_account?.id) {
        igAccountId = page.instagram_business_account.id;
        pageToken = page.access_token;
        break;
      }
    }
    if (!igAccountId) return res.status(400).json({ error: 'Nenhuma conta Instagram Business encontrada' });

    const igInfo = await metaRequest(`https://graph.facebook.com/v21.0/${igAccountId}?fields=username,name&access_token=${pageToken}`);

    await db.execute(
      'INSERT INTO instagram_accounts (id, professional_id, instagram_user_id, username, account_name, page_id, access_token, token_expiration, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1) ON DUPLICATE KEY UPDATE instagram_user_id = VALUES(instagram_user_id), username = VALUES(username), access_token = VALUES(access_token), token_expiration = VALUES(token_expiration), is_active = 1',
      [db.uuid(), profId, igAccountId, igInfo.username || '', igInfo.name || '', pages.data?.[0]?.id || '', pageToken, new Date(Date.now() + expiresIn * 1000)]
    );

    return res.json({ success: true, username: igInfo.username || '' });
  }

  if (action === 'disconnect') {
    await db.execute('UPDATE instagram_accounts SET is_active = 0 WHERE professional_id = ?', [profId]);
    return res.json({ success: true });
  }

  res.status(400).json({ error: 'Unknown action' });
});

// Instagram webhook
router.get('/instagram/webhook', (req: Request, res: Response) => {
  const mode = req.query['hub.mode'] as string;
  const token = req.query['hub.verify_token'] as string;
  const challenge = req.query['hub.challenge'] as string;
  if (mode === 'subscribe' && token === config.meta.webhookVerifyToken) {
    res.type('text/plain').status(200).send(challenge);
  } else {
    res.status(403).send('Forbidden');
  }
});

router.post('/instagram/webhook', async (req: Request, res: Response) => {
  const body = req.body;
  if (body.object !== 'instagram') return res.json({ ok: true });

  for (const entry of body.entry || []) {
    const igUserId = entry.id || '';
    const account = await db.queryOne<any>('SELECT * FROM instagram_accounts WHERE instagram_user_id = ? AND is_active = 1 LIMIT 1', [igUserId]);
    if (!account) continue;

    for (const event of entry.messaging || []) {
      const senderId = event.sender?.id || '';
      const messageText = event.message?.text || '';
      if (!messageText || senderId === igUserId) continue;

      await db.execute(
        'INSERT INTO instagram_messages (id, professional_id, instagram_user_id, sender_id, message_text, message_type, direction) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [db.uuid(), account.professional_id, igUserId, senderId, messageText, 'dm', 'incoming']
      );

      if (account.auto_reply_enabled) {
        // AI auto-reply logic would go here (simplified)
        console.log(`[Instagram] Auto-reply for ${senderId}: ${messageText}`);
      }
    }
  }

  res.json({ success: true });
});

export default router;
