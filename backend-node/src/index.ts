import express from 'express';
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

// Middleware
app.use(cors({ origin: '*', methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'], allowedHeaders: ['Authorization', 'Content-Type', 'X-Requested-With'] }));
app.use(express.json({ limit: '10mb' }));

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
  subscriptions: 'subscriptions', courses: 'courses',
  'course-categories': 'course_categories', 'course-classes': 'course_classes',
  'course-enrollments': 'course_enrollments', 'instagram-accounts': 'instagram_accounts',
  'instagram-messages': 'instagram_messages', 'instagram-keywords': 'instagram_keywords',
  'loyalty-config': 'loyalty_config', 'cashback-rules': 'cashback_rules',
  'service-packages': 'service_packages', 'client-packages': 'client_packages',
  'waitlist-entries': 'waitlist_entries', 'waitlist-settings': 'waitlist_settings',
  'upsell-rules': 'upsell_rules', 'upsell-events': 'upsell_events',
  'feature-flags': 'feature_flags', 'payment-config': 'payment_config',
  'chat-messages': 'chat_messages',
};

for (const [route, table] of Object.entries(crudMap)) {
  app.use(createCrudRoutes(route, table));
}

// 404
app.use((_req, res) => res.status(404).json({ error: 'Route not found' }));

// Start
app.listen(config.port, () => {
  console.log(`🚀 Gende API running on port ${config.port} (${config.nodeEnv})`);
});

export default app;
