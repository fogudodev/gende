import { Router, Request, Response } from 'express';
import { db } from '../core/database.js';
import { ReactivationConversionService } from '../services/ReactivationConversionService.js';
import { UpsellConversionService } from '../services/UpsellConversionService.js';

const router = Router();

router.get('/public/professional/:slug', async (req: Request, res: Response) => {
  const prof = await db.queryOne(
    'SELECT id, name, business_name, slug, bio, primary_color, logo_url, cover_url, bg_color, text_color, component_color, welcome_title, welcome_description, avatar_url, booking_advance_weeks FROM professionals WHERE slug = ?',
    [req.params.slug]
  );
  if (!prof) return res.status(404).json({ error: 'Not found' });
  res.json(prof);
});

router.get('/public/services/:professionalId', async (req: Request, res: Response) => {
  const rows = await db.query(
    'SELECT id, name, description, category, price, duration_minutes FROM services WHERE professional_id = ? AND active = 1 ORDER BY sort_order',
    [req.params.professionalId]
  );
  res.json(rows);
});

router.get('/public/working-hours/:professionalId', async (req: Request, res: Response) => {
  const rows = await db.query(
    'SELECT day_of_week, start_time, end_time FROM working_hours WHERE professional_id = ? AND is_active = 1',
    [req.params.professionalId]
  );
  res.json(rows);
});

router.get('/public/reviews/:professionalId', async (req: Request, res: Response) => {
  const rows = await db.query(
    'SELECT client_name, rating, comment, created_at FROM reviews WHERE professional_id = ? AND is_public = 1 ORDER BY created_at DESC LIMIT 50',
    [req.params.professionalId]
  );
  res.json(rows);
});

router.post('/public/booking', async (req: Request, res: Response) => {
  const { professional_id, service_id, start_time, client_name, client_phone, employee_id } = req.body;
  if (!professional_id || !service_id || !start_time || !client_name || !client_phone) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const service = await db.queryOne<any>(
    'SELECT * FROM services WHERE id = ? AND professional_id = ? AND active = 1',
    [service_id, professional_id]
  );
  if (!service) return res.status(400).json({ error: 'Serviço não encontrado' });

  const endTime = new Date(new Date(start_time).getTime() + service.duration_minutes * 60000).toISOString().replace('T', ' ').slice(0, 19);
  const startFormatted = new Date(start_time).toISOString().replace('T', ' ').slice(0, 19);

  // Check conflicts
  const [conflict] = await db.query<any>(
    "SELECT COUNT(*) as cnt FROM bookings WHERE professional_id = ? AND status != 'cancelled' AND (? < end_time AND ? > start_time)",
    [professional_id, startFormatted, endTime]
  );
  if (conflict.cnt > 0) return res.status(400).json({ error: 'Horário já ocupado' });

  // Find or create client
  let client = await db.queryOne<any>(
    'SELECT id FROM clients WHERE professional_id = ? AND phone = ? LIMIT 1',
    [professional_id, client_phone]
  );
  let clientId = client?.id;
  if (!clientId) {
    clientId = db.uuid();
    await db.execute(
      'INSERT INTO clients (id, professional_id, name, phone) VALUES (?, ?, ?, ?)',
      [clientId, professional_id, client_name, client_phone]
    );
  }

  const bookingId = db.uuid();
  await db.execute(
    'INSERT INTO bookings (id, professional_id, client_id, service_id, employee_id, start_time, end_time, status, price, duration_minutes, client_name, client_phone) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [bookingId, professional_id, clientId, service_id, employee_id || null, startFormatted, endTime, 'pending', service.price, service.duration_minutes, client_name, client_phone]
  );

  // Track Reactivation Conversion
  ReactivationConversionService.trackBookingConversion(
    professional_id,
    clientId,
    bookingId,
    Number(service.price || 0)
  ).catch(err => console.error('[Conversion Tracking Error]', err));

  // Track Upsell Conversion
  UpsellConversionService.trackUpsellConversion(
    professional_id,
    clientId,
    service_id,
    bookingId,
    Number(service.price || 0),
    startFormatted
  ).catch(err => console.error('[Upsell Conversion Tracking Error]', err));

  res.status(201).json({ booking_id: bookingId, price: service.price });
});

export default router;
