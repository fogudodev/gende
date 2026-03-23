import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { config } from './config.js';
import { createCrudRoutes } from './core/crud.js';

// Route imports
import authRoutes from './routes/auth.js';
import profileRoutes from './routes/profile.js';
import publicRoutes from './routes/public.js';
import adminRoutes from './routes/admin.js';
import whatsappRoutes from './routes/whatsapp.js';
import stripeRoutes from './routes/stripe.js';
import instagramRoutes from './routes/instagram.js';
import googleCalendarRoutes from './routes/google-calendar.js';
import aiRoutes from './routes/ai.js';
import cronRoutes from './routes/cron.js';

const app = express();

// CORS - restrict to known origins in production
const allowedOrigins = config.nodeEnv === 'production'
  ? [config.frontendUrl, 'https://gende.io', 'https://app.gende.io', 'https://www.gende.io']
  : ['*'];

app.use(cors({
  origin: config.nodeEnv === 'production'
    ? (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) callback(null, true);
        else callback(new Error('Not allowed by CORS'));
      }
    : '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Authorization', 'Content-Type', 'X-Requested-With', 'X-Cron-Secret'],
}));

// Stripe webhook needs raw body BEFORE json parsing
app.use('/stripe/webhook', express.raw({ type: 'application/json' }));

// JSON parsing for everything else
app.use(express.json({ limit: '10mb' }));

// Simple rate limiter for auth routes
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
function rateLimiter(maxRequests: number, windowMs: number) {
  return (req: Request, res: Response, next: NextFunction) => {
    const key = req.ip + ':' + req.path;
    const now = Date.now();
    const entry = rateLimitMap.get(key);

    if (!entry || now > entry.resetAt) {
      rateLimitMap.set(key, { count: 1, resetAt: now + windowMs });
      return next();
    }

    if (entry.count >= maxRequests) {
      return res.status(429).json({ error: 'Too many requests. Try again later.' });
    }

    entry.count++;
    next();
  };
}

// Apply rate limiting to auth routes
app.use('/auth/login', rateLimiter(10, 60000));   // 10 per minute
app.use('/auth/signup', rateLimiter(5, 60000));    // 5 per minute

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', version: '1.0.0', node: process.version, timestamp: new Date().toISOString() });
});

// Feature routes
app.use(authRoutes);
app.use(profileRoutes);
app.use(publicRoutes);
app.use(adminRoutes);
app.use(whatsappRoutes);
app.use(stripeRoutes);
app.use(instagramRoutes);
app.use(googleCalendarRoutes);
app.use(aiRoutes);
app.use(cronRoutes);

// Generic CRUD routes
const crudMap: Record<string, string> = {
  services: 'services', clients: 'clients', bookings: 'bookings',
  'working-hours': 'working_hours', 'blocked-times': 'blocked_times',
  products: 'products', coupons: 'coupons', payments: 'payments',
  reviews: 'reviews', expenses: 'expenses', commissions: 'commissions',
  campaigns: 'campaigns', 'cash-registers': 'cash_registers',
  'cash-transactions': 'cash_transactions', 'whatsapp-instances': 'whatsapp_instances',
  'whatsapp-automations': 'whatsapp_automations', 'whatsapp-logs': 'whatsapp_logs',
  conversations: 'whatsapp_conversations', 'message-usage': 'daily_message_usage',
  'salon-employees': 'salon_employees', 'employee-services': 'employee_services',
  'employee-working-hours': 'employee_working_hours',
  subscriptions: 'subscriptions', courses: 'courses',
  'course-categories': 'course_categories', 'course-classes': 'course_classes',
  'course-enrollments': 'course_enrollments', 'course-attendance': 'course_attendance',
  'course-certificates': 'course_certificates', 'course-materials': 'course_materials',
  'course-waitlist': 'course_waitlist',
  'instagram-accounts': 'instagram_accounts',
  'instagram-messages': 'instagram_messages', 'instagram-keywords': 'instagram_keywords',
  'loyalty-config': 'loyalty_config', 'loyalty-levels': 'loyalty_levels',
  'loyalty-challenges': 'loyalty_challenges',
  'cashback-rules': 'cashback_rules', 'cashback-transactions': 'cashback_transactions',
  'client-cashback': 'client_cashback', 'client-loyalty': 'client_loyalty',
  'client-referrals': 'client_referrals',
  'service-packages': 'service_packages', 'client-packages': 'client_packages',
  'waitlist-entries': 'waitlist_entries', 'waitlist-settings': 'waitlist_settings',
  'waitlist-offers': 'waitlist_offers',
  'upsell-rules': 'upsell_rules', 'upsell-events': 'upsell_events',
  'feature-flags': 'feature_flags', 'payment-config': 'payment_config',
  'chat-messages': 'chat_messages',
  'platform-reviews': 'platform_reviews',
  'professional-limits': 'professional_limits',
  'addon-purchases': 'addon_purchases',
  'campaign-contacts': 'campaign_contacts',
  'google-calendar-tokens': 'google_calendar_tokens',
};

for (const [route, table] of Object.entries(crudMap)) {
  app.use(createCrudRoutes(route, table));
}

// 404
app.use((_req, res) => res.status(404).json({ error: 'Route not found' }));

// Global error handler - prevents crashes
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[ERROR]', err.message, err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

// Handle uncaught exceptions and rejections
process.on('uncaughtException', (err) => {
  console.error('[UNCAUGHT EXCEPTION]', err);
});
process.on('unhandledRejection', (reason) => {
  console.error('[UNHANDLED REJECTION]', reason);
});

// Clean up rate limit map periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitMap) {
    if (now > entry.resetAt) rateLimitMap.delete(key);
  }
}, 60000);

// Start
app.listen(config.port, () => {
  console.log(`🚀 Gende API running on port ${config.port} (${config.nodeEnv})`);
});

export default app;
