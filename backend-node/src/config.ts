import dotenv from 'dotenv';
// Always prioritize .env values over inherited process env (PM2 stale env safety)
dotenv.config({ override: true });

export const config = {
  port: parseInt(process.env.PORT || '3001'),
  nodeEnv: process.env.NODE_ENV || 'development',
  appUrl: process.env.APP_URL || 'http://localhost:3001',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',

  db: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306'),
    database: process.env.DB_NAME || 'gende',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
  },

  jwt: {
    secret: process.env.JWT_SECRET || 'CHANGE_ME',
    expiry: parseInt(process.env.JWT_EXPIRY || '3600'),
    refreshExpiry: parseInt(process.env.REFRESH_EXPIRY || '604800'),
  },

  stripe: {
    secretKey: process.env.STRIPE_SECRET_KEY || '',
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '',
  },

  evolution: {
    url: process.env.EVOLUTION_API_URL || '',
    key: process.env.EVOLUTION_API_KEY || '',
  },

  meta: {
    whatsappToken: process.env.META_WHATSAPP_TOKEN || '',
    whatsappPhoneId: process.env.META_WHATSAPP_PHONE_ID || '',
    webhookVerifyToken: process.env.META_WEBHOOK_VERIFY_TOKEN || '',
    apiVersion: process.env.META_API_VERSION || 'v21.0',
    appId: process.env.META_APP_ID || '',
    appSecret: process.env.META_APP_SECRET || '',
  },

  google: {
    clientId: process.env.GOOGLE_CLIENT_ID || '',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
  },

  geminiApiKey: process.env.GEMINI_API_KEY || '',

  // Admin notifications
  adminPhone: process.env.ADMIN_PHONE || '',

  // Cron security
  cronSecret: process.env.CRON_SECRET || '',
};
