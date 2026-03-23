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
  const origin = req.headers.origin || config.frontendUrl;

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

  const origin = req.headers.origin || config.frontendUrl;
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
    const origin = req.headers.origin || config.frontendUrl;

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

// Sync employee billing
router.post('/sync-employee-billing', authMiddleware, async (req: Request, res: Response) => {
  const user = (req as any).user as JwtPayload;
  const { activeEmployeeCount = 0 } = req.body;
  const extraEmployees = Math.max(0, activeEmployeeCount - 5);

  const stripe = getStripe();
  const customers = await stripe.customers.list({ email: user.email, limit: 1 });
  if (!customers.data.length) {
    return res.json({ success: true, skipped: true, extra_employees: extraEmployees });
  }

  const subs = await stripe.subscriptions.list({ customer: customers.data[0].id, status: 'active', limit: 1 });
  if (!subs.data.length) return res.status(400).json({ error: 'No active subscription found' });

  const sub = subs.data[0];
  let existingItem: Stripe.SubscriptionItem | null = null;
  for (const item of sub.items.data) {
    if ((item.price.product as string) === 'prod_U3KrydRhlXjRr4') { existingItem = item; break; }
  }

  if (extraEmployees > 0) {
    if (existingItem) {
      await stripe.subscriptionItems.update(existingItem.id, { quantity: extraEmployees });
    } else {
      await stripe.subscriptionItems.create({ subscription: sub.id, price: 'price_1T5EBbFjVGP9lWs0mTpdPlol', quantity: extraEmployees });
    }
  } else if (existingItem) {
    await stripe.subscriptionItems.del(existingItem.id, { proration_behavior: 'create_prorations' });
  }

  res.json({ success: true, extra_employees: extraEmployees });
});

// Stripe Webhook - receives raw body (configured in index.ts)
router.post('/stripe/webhook', async (req: Request, res: Response) => {
  const stripe = getStripe();
  const sig = req.headers['stripe-signature'] as string;

  if (!config.stripe.webhookSecret) {
    console.error('[Stripe Webhook] STRIPE_WEBHOOK_SECRET not configured');
    return res.status(500).json({ error: 'Webhook secret not configured' });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, config.stripe.webhookSecret);
  } catch (err: any) {
    console.error('[Stripe Webhook] Signature verification failed:', err.message);
    return res.status(400).json({ error: 'Invalid signature' });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.mode === 'subscription' && session.subscription) {
          const sub = await stripe.subscriptions.retrieve(session.subscription as string);
          const productId = sub.items.data[0]?.price?.product as string;
          const plan = PRODUCT_TO_PLAN[productId] || 'essencial';
          const email = session.customer_email || session.customer_details?.email;

          if (email) {
            const user = await db.queryOne<any>('SELECT id FROM users WHERE email = ?', [email]);
            if (user) {
              const prof = await db.queryOne<any>('SELECT id FROM professionals WHERE user_id = ?', [user.id]);
              if (prof) {
                const existing = await db.queryOne('SELECT id FROM subscriptions WHERE professional_id = ?', [prof.id]);
                if (existing) {
                  await db.execute(
                    "UPDATE subscriptions SET plan_id = ?, status = 'active', stripe_subscription_id = ?, stripe_customer_id = ?, current_period_start = ?, current_period_end = ?, updated_at = NOW() WHERE professional_id = ?",
                    [plan, sub.id, session.customer as string, new Date(sub.current_period_start * 1000), new Date(sub.current_period_end * 1000), prof.id]
                  );
                } else {
                  await db.execute(
                    "INSERT INTO subscriptions (id, professional_id, plan_id, status, stripe_subscription_id, stripe_customer_id, current_period_start, current_period_end) VALUES (?, ?, ?, 'active', ?, ?, ?, ?)",
                    [db.uuid(), prof.id, plan, sub.id, session.customer as string, new Date(sub.current_period_start * 1000), new Date(sub.current_period_end * 1000)]
                  );
                }
                console.log(`[Stripe] Subscription activated: ${email} -> ${plan}`);
              }
            }
          }
        }
        break;
      }

      case 'invoice.paid': {
        const invoice = event.data.object as Stripe.Invoice;
        if (invoice.subscription) {
          const sub = await stripe.subscriptions.retrieve(invoice.subscription as string);
          const productId = sub.items.data[0]?.price?.product as string;
          const plan = PRODUCT_TO_PLAN[productId] || 'essencial';

          await db.execute(
            "UPDATE subscriptions SET status = 'active', plan_id = ?, current_period_start = ?, current_period_end = ?, updated_at = NOW() WHERE stripe_subscription_id = ?",
            [plan, new Date(sub.current_period_start * 1000), new Date(sub.current_period_end * 1000), sub.id]
          );
          console.log(`[Stripe] Invoice paid, subscription renewed: ${sub.id}`);
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        if (invoice.subscription) {
          await db.execute(
            "UPDATE subscriptions SET status = 'past_due', updated_at = NOW() WHERE stripe_subscription_id = ?",
            [invoice.subscription as string]
          );
          console.log(`[Stripe] Payment failed: ${invoice.subscription}`);
        }
        break;
      }

      case 'customer.subscription.updated': {
        const sub = event.data.object as Stripe.Subscription;
        const productId = sub.items.data[0]?.price?.product as string;
        const plan = PRODUCT_TO_PLAN[productId] || 'essencial';

        await db.execute(
          "UPDATE subscriptions SET plan_id = ?, status = ?, cancel_at_period_end = ?, current_period_start = ?, current_period_end = ?, updated_at = NOW() WHERE stripe_subscription_id = ?",
          [plan, sub.status === 'active' ? 'active' : sub.status, sub.cancel_at_period_end ? 1 : 0, new Date(sub.current_period_start * 1000), new Date(sub.current_period_end * 1000), sub.id]
        );
        console.log(`[Stripe] Subscription updated: ${sub.id} -> ${plan} (${sub.status})`);
        break;
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription;
        await db.execute(
          "UPDATE subscriptions SET status = 'cancelled', cancel_at_period_end = 0, updated_at = NOW() WHERE stripe_subscription_id = ?",
          [sub.id]
        );
        console.log(`[Stripe] Subscription cancelled: ${sub.id}`);
        break;
      }

      default:
        console.log(`[Stripe] Unhandled event: ${event.type}`);
    }
  } catch (err: any) {
    console.error(`[Stripe Webhook] Error processing ${event.type}:`, err.message);
  }

  res.json({ received: true });
});

export default router;
