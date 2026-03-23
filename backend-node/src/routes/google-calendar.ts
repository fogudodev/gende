import { Router, Request, Response } from 'express';
import { db } from '../core/database.js';
import { authMiddleware, getProfessionalId, JwtPayload } from '../core/auth.js';
import { config } from '../config.js';

const router = Router();

router.post('/google-calendar/auth', authMiddleware, async (req: Request, res: Response) => {
  const user = (req as any).user as JwtPayload;
  const profId = await getProfessionalId(user.sub);
  const { action } = req.body;
  const redirectUri = `${config.appUrl}/google-calendar/callback`;

  if (action === 'get_auth_url') {
    const scopes = encodeURIComponent('https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/calendar.events');
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${encodeURIComponent(config.google.clientId)}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${scopes}&access_type=offline&prompt=consent&state=${profId}`;
    return res.json({ auth_url: authUrl });
  }

  if (action === 'disconnect') {
    await db.execute('DELETE FROM google_calendar_tokens WHERE professional_id = ?', [profId]);
    return res.json({ success: true });
  }

  if (action === 'status') {
    const token = await db.queryOne('SELECT sync_enabled, last_synced_at, calendar_id, created_at FROM google_calendar_tokens WHERE professional_id = ?', [profId]);
    return res.json({ connected: !!token, ...(token || {}) });
  }

  res.status(400).json({ error: 'Unknown action' });
});

router.get('/google-calendar/callback', async (req: Request, res: Response) => {
  const code = req.query.code as string;
  const professionalId = req.query.state as string;
  const error = req.query.error as string;

  if (error || !code || !professionalId) {
    return res.send(renderHtml('Erro', 'Autorização negada ou parâmetros inválidos.'));
  }

  const redirectUri = `${config.appUrl}/google-calendar/callback`;

  try {
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ code, client_id: config.google.clientId, client_secret: config.google.clientSecret, redirect_uri: redirectUri, grant_type: 'authorization_code' }),
    });
    const tokenData = await tokenRes.json() as any;

    if (!tokenData.access_token || !tokenData.refresh_token) {
      return res.send(renderHtml('Erro', 'Falha ao obter tokens.'));
    }

    const expiresAt = new Date(Date.now() + (tokenData.expires_in || 3600) * 1000);

    await db.execute(
      'INSERT INTO google_calendar_tokens (id, professional_id, access_token, refresh_token, token_expires_at, calendar_id, sync_enabled) VALUES (?, ?, ?, ?, ?, ?, 1) ON DUPLICATE KEY UPDATE access_token = VALUES(access_token), refresh_token = VALUES(refresh_token), token_expires_at = VALUES(token_expires_at), sync_enabled = 1',
      [db.uuid(), professionalId, tokenData.access_token, tokenData.refresh_token, expiresAt, 'primary']
    );

    res.send(renderHtml('Sucesso!', 'Google Calendar conectado! Pode fechar esta janela.'));
  } catch {
    res.send(renderHtml('Erro', 'Falha na comunicação com o Google.'));
  }
});

router.post('/google-calendar/sync', authMiddleware, async (req: Request, res: Response) => {
  const user = (req as any).user as JwtPayload;
  const profId = await getProfessionalId(user.sub);
  const { action, booking, booking_id, event_id } = req.body;

  const tokenRow = await db.queryOne<any>('SELECT * FROM google_calendar_tokens WHERE professional_id = ? AND sync_enabled = 1', [profId]);
  if (!tokenRow) return res.json({ synced: false, reason: 'no_token' });

  const accessToken = await getValidToken(tokenRow);

  if (action === 'create_event' && booking) {
    const event = {
      summary: `📅 ${booking.service_name || 'Agendamento'} - ${booking.client_name || 'Cliente'}`,
      start: { dateTime: booking.start_time, timeZone: 'America/Sao_Paulo' },
      end: { dateTime: booking.end_time, timeZone: 'America/Sao_Paulo' },
    };

    const gcRes = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(event),
    });
    const result = await gcRes.json() as any;

    if (gcRes.ok && booking_id && result.id) {
      await db.execute('UPDATE bookings SET google_calendar_event_id = ? WHERE id = ?', [result.id, booking_id]);
    }
    return res.json({ synced: gcRes.ok, event_id: result.id });
  }

  if (action === 'delete_event' && event_id) {
    await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${encodeURIComponent(event_id)}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (booking_id) {
      await db.execute('UPDATE bookings SET google_calendar_event_id = NULL WHERE id = ?', [booking_id]);
    }
    return res.json({ synced: true, deleted: true });
  }

  res.status(400).json({ error: 'Unknown action' });
});

async function getValidToken(tokenRow: any): Promise<string> {
  if (new Date(tokenRow.token_expires_at).getTime() - Date.now() < 300000) {
    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ client_id: config.google.clientId, client_secret: config.google.clientSecret, refresh_token: tokenRow.refresh_token, grant_type: 'refresh_token' }),
    });
    const data = await res.json() as any;
    if (data.access_token) {
      await db.execute('UPDATE google_calendar_tokens SET access_token = ?, token_expires_at = ? WHERE id = ?', [data.access_token, new Date(Date.now() + data.expires_in * 1000), tokenRow.id]);
      return data.access_token;
    }
  }
  return tokenRow.access_token;
}

function renderHtml(title: string, msg: string): string {
  return `<!DOCTYPE html><html><head><meta charset='utf-8'><title>${title}</title>
<style>body{font-family:system-ui;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;background:#09090B;color:#FAFAFA;}
.card{text-align:center;padding:2rem;border-radius:1rem;background:#1a1a2e;max-width:400px;}h1{font-size:1.5rem;}p{color:#888;}</style></head>
<body><div class='card'><h1>${title}</h1><p>${msg}</p></div><script>setTimeout(()=>window.close(),3000)</script></body></html>`;
}

export default router;
