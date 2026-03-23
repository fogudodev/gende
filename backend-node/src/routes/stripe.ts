import { Router, Request, Response } from 'express';
import Stripe from 'stripe';
import { db } from '../core/database.js';
import { authMiddleware, getProfessionalId, JwtPayload } from '../core/auth.js';
import { config } from '../config.js';

const router = Router();

const VALID_PRICES = [
  'price_1T57OUFjVGP9lWs08ZViwOdY', 'price_1T5DskFjVGP9lWs0IjaVXqPL',
  'price_1T57PnFjVGP9lWs0YWLEVvBZ', 'price_1T5Du2FjVGP9lWs0iO6PN4eF',
];

const PRODUCT_TO_PLAN: Record<string, string> = {
  prod_U3DqJqyo9urw60: 'essencial', prod_U3KXrtuJF9WAOC: 'essencial',
  prod_U3DrWGOLjl8pSx: 'enterprise', prod_U3KZFQMZF4cxPs: 'enterprise',
};

const ADDON_PACKAGES: Record<string, { type: string; quantity: number }> = {
  'price_1T7H4vFjVGP9lWs0BKNJX8I3': { type: 'reminders', quantity: 10 },
  'price_1T7H6MFjVGP9lWs0Wcq9WHwV': { type: 'reminders', quantity: 25 },
  'price_1T7H8fFjVGP9lWs0zrDZP5GZ': { type: 'reminders', quantity: 50 },
  'price_1T7HWPFjVGP9lWs0NdSjwuwO': { type: 'campaigns', quantity: 5 },
  'price_1T7HWjFjVGP9lWs03IzoPU8w': { type: 'campaigns', quantity: 15 },
  'price_1T7HXIFjVGP9lWs023qLe4y1': { type: 'campaigns', quantity: 30 },
  'price_1T7HXcFjVGP9lWs0pUGKjxSb': { type: 'contacts', quantity: 20 },
  'price_1T7HXpFjVGP9lWs0FBVYdSZa': { type: 'contacts', quantity: 50 },
  'price_1T7HYzFjVGP9lWs0K0QZWPzr': { type: 'contacts', quantity: 100 },
};

function getStripe() {
  return new Stripe(config.stripe.secretKey);
}

router.post('/create-checkout', authMiddleware, async (req: Request, res: Response) => {
  const user = (req as any).user as JwtPayload;
  const { priceId } = req.body;
  if (!priceId || !VALID_PRICES.includes(priceId)) return res.status(400).json({ error: 'Invalid price ID' });

  const stripe = getStripe();
  const customers = await stripe.customers.list({ email: user.email, limit: 1 });
  const customerId = customers.data[0]?.id;
  const origin = req.headers.origin || 'https://gende.io';

  const session = await stripe.checkout.sessions.create({
    customer: customerId, customer_email: customerId ? undefined : user.email,
    line_items: [{ price: priceId, quantity: 1 }], mode: 'subscription',
    success_url: `${origin}/settings?subscription=success`,
    cancel_url: `${origin}/settings?subscription=cancelled`,
  });

  res.json({ url: session.url });
});

router.get('/check-subscription', authMiddleware, async (req: Request, res: Response) => {
  const user = (req as any).user as JwtPayload;
  const stripe = getStripe();

  const customers = await stripe.customers.list({ email: user.email, limit: 1 });
  if (!customers.data.length) return res.json({ subscribed: false, plan: 'none' });

  const subs = await stripe.subscriptions.list({ customer: customers.data[0].id, status: 'active', limit: 1 });
  if (!subs.data.length) return res.json({ subscribed: false, plan: 'none' });

  const sub = subs.data[0];
  const productId = (sub.items.data[0].price.product as string);
  const plan = PRODUCT_TO_PLAN[productId] || 'none';

  res.json({
    subscribed: true, plan, product_id: productId,
    subscription_end: new Date(sub.current_period_end * 1000).toISOString(),
  });
});

router.post('/customer-portal', authMiddleware, async (req: Request, res: Response) => {
  const user = (req as any).user as JwtPayload;
  const stripe = getStripe();
  const customers = await stripe.customers.list({ email: user.email, limit: 1 });
  if (!customers.data.length) return res.status(400).json({ error: 'No Stripe customer found' });

  const origin = req.headers.origin || 'https://gende.io';
  const session = await stripe.billingPortal.sessions.create({
    customer: customers.data[0].id, return_url: `${origin}/settings`,
  });

  res.json({ url: session.url });
});

router.post('/purchase-addon', authMiddleware, async (req: Request, res: Response) => {
  const user = (req as any).user as JwtPayload;
  const { action, priceId, professionalId, sessionId } = req.body;
  const stripe = getStripe();

  if (action === 'create-checkout') {
    const addon = ADDON_PACKAGES[priceId];
    if (!addon) return res.status(400).json({ error: 'Pacote inválido' });

    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    const customerId = customers.data[0]?.id;
    const origin = req.headers.origin || 'https://gende.io';

    const session = await stripe.checkout.sessions.create({
      customer: customerId, customer_email: customerId ? undefined : user.email,
      line_items: [{ price: priceId, quantity: 1 }], mode: 'payment',
      success_url: `${origin}/campaigns?addon_session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/campaigns`,
      metadata: { professional_id: professionalId, addon_type: addon.type, addon_quantity: String(addon.quantity) },
    });
    return res.json({ url: session.url });
  }

  if (action === 'verify-payment') {
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    if (session.payment_status !== 'paid') return res.json({ success: false, error: 'Pagamento não confirmado' });

    const addonType = session.metadata?.addon_type;
    const addonQuantity = parseInt(session.metadata?.addon_quantity || '0');
    const columnMap: Record<string, string> = { reminders: 'extra_reminders_purchased', campaigns: 'extra_campaigns_purchased', contacts: 'extra_contacts_purchased' };
    const column = columnMap[addonType || ''];
    if (!column) return res.status(400).json({ error: 'Invalid addon type' });

    const current = await db.queryOne('SELECT * FROM professional_limits WHERE professional_id = ?', [professionalId]);
    if (current) {
      await db.execute(`UPDATE professional_limits SET ${column} = ${column} + ? WHERE professional_id = ?`, [addonQuantity, professionalId]);
    } else {
      await db.execute(`INSERT INTO professional_limits (id, professional_id, ${column}) VALUES (?, ?, ?)`, [db.uuid(), professionalId, addonQuantity]);
    }

    await db.execute(
      'INSERT INTO addon_purchases (id, professional_id, addon_type, quantity, amount_cents, stripe_session_id) VALUES (?, ?, ?, ?, ?, ?)',
      [db.uuid(), professionalId, addonType, addonQuantity, session.amount_total || 0, sessionId]
    );

    return res.json({ success: true, type: addonType, quantity: addonQuantity });
  }

  res.status(400).json({ error: 'Unknown action' });
});

// Stripe Webhook
router.post('/stripe/webhook', async (req: Request, res: Response) => {
  // Stripe webhooks need raw body - handled in main index
  res.json({ received: true });
});

export default router;
