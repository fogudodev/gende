-- ============================================
-- GENDE - MySQL Schema
-- Migrated from Supabase/PostgreSQL
-- ============================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ============================================
-- USERS & AUTH
-- ============================================
CREATE TABLE IF NOT EXISTS `users` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `email` VARCHAR(255) NOT NULL UNIQUE,
  `password_hash` VARCHAR(255) NOT NULL,
  `email_confirmed_at` DATETIME DEFAULT NULL,
  `raw_user_meta_data` JSON DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `user_roles` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `user_id` CHAR(36) NOT NULL,
  `role` ENUM('admin','moderator','user','professional','support','reception') NOT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_user_role` (`user_id`, `role`),
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `refresh_tokens` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `user_id` CHAR(36) NOT NULL,
  `token` VARCHAR(512) NOT NULL,
  `expires_at` DATETIME NOT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_refresh_token` (`token`(191)),
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================
-- PROFESSIONALS
-- ============================================
CREATE TABLE IF NOT EXISTS `professionals` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `user_id` CHAR(36) NOT NULL,
  `name` VARCHAR(255) NOT NULL DEFAULT '',
  `email` VARCHAR(255) NOT NULL DEFAULT '',
  `phone` VARCHAR(50) DEFAULT '',
  `avatar_url` TEXT DEFAULT NULL,
  `business_name` VARCHAR(255) DEFAULT '',
  `slug` VARCHAR(255) DEFAULT NULL UNIQUE,
  `bio` TEXT DEFAULT NULL,
  `primary_color` VARCHAR(20) DEFAULT '#C4922A',
  `logo_url` TEXT DEFAULT NULL,
  `cover_url` TEXT DEFAULT NULL,
  `bg_color` VARCHAR(20) DEFAULT '#09090B',
  `text_color` VARCHAR(20) DEFAULT '#FAFAFA',
  `component_color` VARCHAR(20) DEFAULT '#C4922A',
  `welcome_title` VARCHAR(255) DEFAULT 'Bem-vindo(a)!',
  `welcome_description` VARCHAR(500) DEFAULT 'Agende seu horário de forma rápida e fácil.',
  `welcome_message` VARCHAR(1000) DEFAULT NULL,
  `reminder_message` VARCHAR(1000) DEFAULT NULL,
  `confirmation_message` VARCHAR(1000) DEFAULT NULL,
  `followup_message` VARCHAR(1000) DEFAULT NULL,
  `system_accent_color` VARCHAR(20) DEFAULT NULL,
  `system_sidebar_color` VARCHAR(20) DEFAULT NULL,
  `system_sidebar_text_color` VARCHAR(20) DEFAULT NULL,
  `stripe_customer_id` VARCHAR(255) DEFAULT NULL,
  `account_type` ENUM('autonomous','salon') NOT NULL DEFAULT 'autonomous',
  `booking_advance_weeks` INT NOT NULL DEFAULT 2,
  `is_blocked` TINYINT(1) NOT NULL DEFAULT 0,
  `blocked_reason` TEXT DEFAULT NULL,
  `feature_whatsapp` TINYINT(1) NOT NULL DEFAULT 1,
  `feature_public_page` TINYINT(1) NOT NULL DEFAULT 1,
  `feature_reports` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================
-- SERVICES
-- ============================================
CREATE TABLE IF NOT EXISTS `services` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `professional_id` CHAR(36) NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `description` TEXT DEFAULT NULL,
  `category` VARCHAR(100) DEFAULT 'Geral',
  `price` DECIMAL(10,2) NOT NULL DEFAULT 0,
  `duration_minutes` INT NOT NULL DEFAULT 30,
  `active` TINYINT(1) NOT NULL DEFAULT 1,
  `sort_order` INT DEFAULT 0,
  `maintenance_interval_days` INT DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  FOREIGN KEY (`professional_id`) REFERENCES `professionals`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================
-- CLIENTS
-- ============================================
CREATE TABLE IF NOT EXISTS `clients` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `professional_id` CHAR(36) NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `email` VARCHAR(255) DEFAULT NULL,
  `phone` VARCHAR(50) DEFAULT NULL,
  `notes` TEXT DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  FOREIGN KEY (`professional_id`) REFERENCES `professionals`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================
-- BOOKINGS
-- ============================================
CREATE TABLE IF NOT EXISTS `bookings` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `professional_id` CHAR(36) NOT NULL,
  `client_id` CHAR(36) DEFAULT NULL,
  `service_id` CHAR(36) DEFAULT NULL,
  `employee_id` CHAR(36) DEFAULT NULL,
  `start_time` DATETIME NOT NULL,
  `end_time` DATETIME NOT NULL,
  `status` ENUM('pending','confirmed','completed','cancelled','no_show') NOT NULL DEFAULT 'pending',
  `price` DECIMAL(10,2) NOT NULL DEFAULT 0,
  `duration_minutes` INT NOT NULL DEFAULT 30,
  `client_name` VARCHAR(255) DEFAULT NULL,
  `client_phone` VARCHAR(50) DEFAULT NULL,
  `notes` TEXT DEFAULT NULL,
  `google_calendar_event_id` VARCHAR(255) DEFAULT NULL,
  `stripe_payment_intent_id` VARCHAR(255) DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  FOREIGN KEY (`professional_id`) REFERENCES `professionals`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON DELETE SET NULL,
  FOREIGN KEY (`service_id`) REFERENCES `services`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================
-- WORKING HOURS
-- ============================================
CREATE TABLE IF NOT EXISTS `working_hours` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `professional_id` CHAR(36) NOT NULL,
  `day_of_week` TINYINT NOT NULL,
  `start_time` TIME NOT NULL,
  `end_time` TIME NOT NULL,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (`id`),
  FOREIGN KEY (`professional_id`) REFERENCES `professionals`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================
-- BLOCKED TIMES
-- ============================================
CREATE TABLE IF NOT EXISTS `blocked_times` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `professional_id` CHAR(36) NOT NULL,
  `start_time` DATETIME NOT NULL,
  `end_time` DATETIME NOT NULL,
  `reason` TEXT DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  FOREIGN KEY (`professional_id`) REFERENCES `professionals`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================
-- SALON EMPLOYEES
-- ============================================
CREATE TABLE IF NOT EXISTS `salon_employees` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `salon_id` CHAR(36) NOT NULL,
  `user_id` CHAR(36) DEFAULT NULL,
  `name` VARCHAR(255) NOT NULL,
  `email` VARCHAR(255) DEFAULT NULL,
  `phone` VARCHAR(50) DEFAULT NULL,
  `role` VARCHAR(50) NOT NULL DEFAULT 'employee',
  `commission_percentage` DECIMAL(5,2) NOT NULL DEFAULT 0,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `avatar_url` TEXT DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  FOREIGN KEY (`salon_id`) REFERENCES `professionals`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================
-- EMPLOYEE SERVICES
-- ============================================
CREATE TABLE IF NOT EXISTS `employee_services` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `employee_id` CHAR(36) NOT NULL,
  `service_id` CHAR(36) NOT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  FOREIGN KEY (`employee_id`) REFERENCES `salon_employees`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`service_id`) REFERENCES `services`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================
-- EMPLOYEE WORKING HOURS
-- ============================================
CREATE TABLE IF NOT EXISTS `employee_working_hours` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `employee_id` CHAR(36) NOT NULL,
  `professional_id` CHAR(36) NOT NULL,
  `day_of_week` TINYINT NOT NULL,
  `start_time` TIME NOT NULL,
  `end_time` TIME NOT NULL,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (`id`),
  FOREIGN KEY (`employee_id`) REFERENCES `salon_employees`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`professional_id`) REFERENCES `professionals`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================
-- COMMISSIONS
-- ============================================
CREATE TABLE IF NOT EXISTS `commissions` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `professional_id` CHAR(36) NOT NULL,
  `employee_id` CHAR(36) NOT NULL,
  `booking_id` CHAR(36) DEFAULT NULL,
  `booking_amount` DECIMAL(10,2) NOT NULL DEFAULT 0,
  `commission_percentage` DECIMAL(5,2) NOT NULL DEFAULT 0,
  `commission_amount` DECIMAL(10,2) NOT NULL DEFAULT 0,
  `status` VARCHAR(50) NOT NULL DEFAULT 'pending',
  `paid_at` DATETIME DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  FOREIGN KEY (`professional_id`) REFERENCES `professionals`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`employee_id`) REFERENCES `salon_employees`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`booking_id`) REFERENCES `bookings`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================
-- PRODUCTS
-- ============================================
CREATE TABLE IF NOT EXISTS `products` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `professional_id` CHAR(36) NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `description` TEXT DEFAULT NULL,
  `price` DECIMAL(10,2) NOT NULL DEFAULT 0,
  `stock` INT NOT NULL DEFAULT 0,
  `category` VARCHAR(100) DEFAULT 'Geral',
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  FOREIGN KEY (`professional_id`) REFERENCES `professionals`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================
-- COUPONS
-- ============================================
CREATE TABLE IF NOT EXISTS `coupons` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `professional_id` CHAR(36) NOT NULL,
  `code` VARCHAR(100) NOT NULL,
  `description` TEXT DEFAULT NULL,
  `discount_type` VARCHAR(20) NOT NULL DEFAULT 'percentage',
  `discount_value` DECIMAL(10,2) NOT NULL DEFAULT 0,
  `min_amount` DECIMAL(10,2) DEFAULT NULL,
  `max_uses` INT DEFAULT NULL,
  `used_count` INT NOT NULL DEFAULT 0,
  `valid_from` DATETIME DEFAULT NULL,
  `valid_until` DATETIME DEFAULT NULL,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  FOREIGN KEY (`professional_id`) REFERENCES `professionals`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================
-- PAYMENTS
-- ============================================
CREATE TABLE IF NOT EXISTS `payments` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `professional_id` CHAR(36) NOT NULL,
  `booking_id` CHAR(36) DEFAULT NULL,
  `amount` DECIMAL(10,2) NOT NULL DEFAULT 0,
  `currency` VARCHAR(10) NOT NULL DEFAULT 'brl',
  `status` VARCHAR(50) NOT NULL DEFAULT 'pending',
  `payment_method` VARCHAR(50) DEFAULT NULL,
  `stripe_payment_intent_id` VARCHAR(255) DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  FOREIGN KEY (`professional_id`) REFERENCES `professionals`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`booking_id`) REFERENCES `bookings`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================
-- PAYMENT CONFIG
-- ============================================
CREATE TABLE IF NOT EXISTS `payment_config` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `professional_id` CHAR(36) NOT NULL,
  `pix_enabled` TINYINT(1) NOT NULL DEFAULT 0,
  `pix_key` VARCHAR(255) DEFAULT NULL,
  `pix_key_type` VARCHAR(50) DEFAULT NULL,
  `pix_beneficiary_name` VARCHAR(255) DEFAULT NULL,
  `stripe_enabled` TINYINT(1) NOT NULL DEFAULT 0,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  FOREIGN KEY (`professional_id`) REFERENCES `professionals`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================
-- REVIEWS
-- ============================================
CREATE TABLE IF NOT EXISTS `reviews` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `professional_id` CHAR(36) NOT NULL,
  `booking_id` CHAR(36) DEFAULT NULL,
  `employee_id` CHAR(36) DEFAULT NULL,
  `client_name` VARCHAR(255) NOT NULL,
  `client_phone` VARCHAR(50) DEFAULT NULL,
  `rating` TINYINT NOT NULL DEFAULT 5,
  `comment` TEXT DEFAULT NULL,
  `is_public` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  FOREIGN KEY (`professional_id`) REFERENCES `professionals`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================
-- EXPENSES
-- ============================================
CREATE TABLE IF NOT EXISTS `expenses` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `professional_id` CHAR(36) NOT NULL,
  `description` VARCHAR(500) NOT NULL,
  `amount` DECIMAL(10,2) NOT NULL DEFAULT 0,
  `category` VARCHAR(100) NOT NULL DEFAULT 'Geral',
  `expense_date` DATE NOT NULL DEFAULT (CURRENT_DATE),
  `employee_id` CHAR(36) DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  FOREIGN KEY (`professional_id`) REFERENCES `professionals`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================
-- SUBSCRIPTIONS
-- ============================================
CREATE TABLE IF NOT EXISTS `subscriptions` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `professional_id` CHAR(36) NOT NULL,
  `plan_id` VARCHAR(50) DEFAULT 'free',
  `status` ENUM('active','cancelled','past_due','trialing') NOT NULL DEFAULT 'active',
  `stripe_subscription_id` VARCHAR(255) DEFAULT NULL,
  `stripe_customer_id` VARCHAR(255) DEFAULT NULL,
  `current_period_start` DATETIME DEFAULT NULL,
  `current_period_end` DATETIME DEFAULT NULL,
  `cancel_at_period_end` TINYINT(1) DEFAULT 0,
  `max_bookings_per_month` INT DEFAULT 50,
  `max_services` INT DEFAULT 5,
  `max_clients` INT DEFAULT 30,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  FOREIGN KEY (`professional_id`) REFERENCES `professionals`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================
-- CAMPAIGNS
-- ============================================
CREATE TABLE IF NOT EXISTS `campaigns` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `professional_id` CHAR(36) NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `message` TEXT NOT NULL,
  `status` VARCHAR(50) NOT NULL DEFAULT 'draft',
  `target_type` VARCHAR(50) NOT NULL DEFAULT 'all_clients',
  `total_contacts` INT NOT NULL DEFAULT 0,
  `sent_count` INT NOT NULL DEFAULT 0,
  `failed_count` INT NOT NULL DEFAULT 0,
  `scheduled_at` DATETIME DEFAULT NULL,
  `started_at` DATETIME DEFAULT NULL,
  `completed_at` DATETIME DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  FOREIGN KEY (`professional_id`) REFERENCES `professionals`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================
-- CAMPAIGN CONTACTS
-- ============================================
CREATE TABLE IF NOT EXISTS `campaign_contacts` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `campaign_id` CHAR(36) NOT NULL,
  `client_id` CHAR(36) DEFAULT NULL,
  `phone` VARCHAR(50) NOT NULL,
  `client_name` VARCHAR(255) DEFAULT NULL,
  `status` VARCHAR(50) NOT NULL DEFAULT 'pending',
  `error_message` TEXT DEFAULT NULL,
  `sent_at` DATETIME DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  FOREIGN KEY (`campaign_id`) REFERENCES `campaigns`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================
-- WHATSAPP
-- ============================================
CREATE TABLE IF NOT EXISTS `whatsapp_instances` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `professional_id` CHAR(36) NOT NULL,
  `instance_name` VARCHAR(255) NOT NULL,
  `status` VARCHAR(50) NOT NULL DEFAULT 'disconnected',
  `phone_number` VARCHAR(50) DEFAULT NULL,
  `qr_code` TEXT DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  FOREIGN KEY (`professional_id`) REFERENCES `professionals`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `whatsapp_automations` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `professional_id` CHAR(36) NOT NULL,
  `automation_type` VARCHAR(100) NOT NULL,
  `is_enabled` TINYINT(1) NOT NULL DEFAULT 1,
  `custom_message` TEXT DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  FOREIGN KEY (`professional_id`) REFERENCES `professionals`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `whatsapp_logs` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `professional_id` CHAR(36) NOT NULL,
  `phone` VARCHAR(50) DEFAULT NULL,
  `message_type` VARCHAR(100) DEFAULT NULL,
  `status` VARCHAR(50) DEFAULT 'sent',
  `error_message` TEXT DEFAULT NULL,
  `metadata` JSON DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  FOREIGN KEY (`professional_id`) REFERENCES `professionals`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `whatsapp_conversations` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `professional_id` CHAR(36) NOT NULL,
  `client_phone` VARCHAR(50) NOT NULL,
  `messages` JSON NOT NULL DEFAULT ('[]'),
  `context` JSON NOT NULL DEFAULT ('{}'),
  `status` VARCHAR(50) NOT NULL DEFAULT 'active',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  FOREIGN KEY (`professional_id`) REFERENCES `professionals`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================
-- DAILY MESSAGE USAGE
-- ============================================
CREATE TABLE IF NOT EXISTS `daily_message_usage` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `professional_id` CHAR(36) NOT NULL,
  `usage_date` DATE NOT NULL DEFAULT (CURRENT_DATE),
  `reminders_sent` INT NOT NULL DEFAULT 0,
  `campaigns_sent` INT NOT NULL DEFAULT 0,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  FOREIGN KEY (`professional_id`) REFERENCES `professionals`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================
-- CASH REGISTER
-- ============================================
CREATE TABLE IF NOT EXISTS `cash_registers` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `professional_id` CHAR(36) NOT NULL,
  `opened_by` CHAR(36) DEFAULT NULL,
  `opened_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `closed_at` DATETIME DEFAULT NULL,
  `opening_amount` DECIMAL(10,2) NOT NULL DEFAULT 0,
  `closing_amount` DECIMAL(10,2) DEFAULT NULL,
  `expected_amount` DECIMAL(10,2) DEFAULT NULL,
  `status` VARCHAR(50) NOT NULL DEFAULT 'open',
  `notes` TEXT DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  FOREIGN KEY (`professional_id`) REFERENCES `professionals`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `cash_transactions` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `cash_register_id` CHAR(36) NOT NULL,
  `professional_id` CHAR(36) NOT NULL,
  `type` VARCHAR(50) NOT NULL DEFAULT 'entry',
  `amount` DECIMAL(10,2) NOT NULL DEFAULT 0,
  `payment_method` VARCHAR(50) DEFAULT NULL,
  `description` TEXT DEFAULT NULL,
  `booking_id` CHAR(36) DEFAULT NULL,
  `created_by` CHAR(36) DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  FOREIGN KEY (`cash_register_id`) REFERENCES `cash_registers`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`professional_id`) REFERENCES `professionals`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================
-- GOOGLE CALENDAR
-- ============================================
CREATE TABLE IF NOT EXISTS `google_calendar_tokens` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `professional_id` CHAR(36) NOT NULL UNIQUE,
  `access_token` TEXT NOT NULL,
  `refresh_token` TEXT NOT NULL,
  `token_expires_at` DATETIME NOT NULL,
  `calendar_id` VARCHAR(255) DEFAULT 'primary',
  `sync_enabled` TINYINT(1) NOT NULL DEFAULT 1,
  `last_synced_at` DATETIME DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  FOREIGN KEY (`professional_id`) REFERENCES `professionals`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================
-- CHAT MESSAGES
-- ============================================
CREATE TABLE IF NOT EXISTS `chat_messages` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `professional_id` CHAR(36) NOT NULL,
  `message` TEXT DEFAULT NULL,
  `sender_role` VARCHAR(50) NOT NULL DEFAULT 'professional',
  `sender_name` VARCHAR(255) DEFAULT NULL,
  `chat_type` VARCHAR(50) NOT NULL DEFAULT 'support',
  `attachment_url` TEXT DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  FOREIGN KEY (`professional_id`) REFERENCES `professionals`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================
-- PROFESSIONAL LIMITS
-- ============================================
CREATE TABLE IF NOT EXISTS `professional_limits` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `professional_id` CHAR(36) NOT NULL,
  `max_bookings_per_month` INT DEFAULT NULL,
  `max_services` INT DEFAULT NULL,
  `max_clients` INT DEFAULT NULL,
  `max_employees` INT DEFAULT NULL,
  `max_reminders_per_day` INT DEFAULT NULL,
  `max_campaigns_per_day` INT DEFAULT NULL,
  `max_contacts_per_campaign` INT DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  FOREIGN KEY (`professional_id`) REFERENCES `professionals`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================
-- ADDON PURCHASES
-- ============================================
CREATE TABLE IF NOT EXISTS `addon_purchases` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `professional_id` CHAR(36) NOT NULL,
  `addon_type` VARCHAR(100) NOT NULL,
  `quantity` INT NOT NULL,
  `amount_cents` INT NOT NULL DEFAULT 0,
  `stripe_session_id` VARCHAR(255) DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  FOREIGN KEY (`professional_id`) REFERENCES `professionals`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================
-- FEATURE FLAGS
-- ============================================
CREATE TABLE IF NOT EXISTS `feature_flags` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `key` VARCHAR(255) NOT NULL UNIQUE,
  `label` VARCHAR(255) NOT NULL,
  `description` TEXT DEFAULT NULL,
  `enabled` TINYINT(1) NOT NULL DEFAULT 0,
  `category` VARCHAR(100) NOT NULL DEFAULT 'general',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================
-- PROFESSIONAL FEATURE OVERRIDES
-- ============================================
CREATE TABLE IF NOT EXISTS `professional_feature_overrides` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `professional_id` CHAR(36) NOT NULL,
  `feature_key` VARCHAR(255) NOT NULL,
  `enabled` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_prof_feature` (`professional_id`, `feature_key`),
  FOREIGN KEY (`professional_id`) REFERENCES `professionals`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================
-- PLAN LIMITS
-- ============================================
CREATE TABLE IF NOT EXISTS `plan_limits` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `plan_id` VARCHAR(50) NOT NULL UNIQUE,
  `daily_reminders` INT NOT NULL DEFAULT 10,
  `daily_campaigns` INT NOT NULL DEFAULT 1,
  `campaign_max_contacts` INT NOT NULL DEFAULT 50,
  `campaign_min_interval_hours` INT NOT NULL DEFAULT 6,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Seed plan_limits
INSERT IGNORE INTO `plan_limits` (`id`, `plan_id`, `daily_reminders`, `daily_campaigns`, `campaign_max_contacts`, `campaign_min_interval_hours`)
VALUES
  (UUID(), 'essencial', 20, 1, 100, 6),
  (UUID(), 'enterprise', -1, -1, -1, 1);

-- ============================================
-- ADMIN AUTH CODES
-- ============================================
CREATE TABLE IF NOT EXISTS `admin_auth_codes` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `code` VARCHAR(100) NOT NULL,
  `is_used` TINYINT(1) NOT NULL DEFAULT 0,
  `used_by` CHAR(36) DEFAULT NULL,
  `used_at` DATETIME DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================
-- LOYALTY SYSTEM
-- ============================================
CREATE TABLE IF NOT EXISTS `loyalty_config` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `professional_id` CHAR(36) NOT NULL,
  `cashback_enabled` TINYINT(1) NOT NULL DEFAULT 0,
  `default_cashback_percent` DECIMAL(5,2) NOT NULL DEFAULT 5,
  `levels_enabled` TINYINT(1) NOT NULL DEFAULT 0,
  `referral_enabled` TINYINT(1) NOT NULL DEFAULT 0,
  `referral_reward_amount` DECIMAL(10,2) NOT NULL DEFAULT 20,
  `referral_new_client_bonus` DECIMAL(10,2) NOT NULL DEFAULT 20,
  `challenges_enabled` TINYINT(1) NOT NULL DEFAULT 0,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  FOREIGN KEY (`professional_id`) REFERENCES `professionals`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `loyalty_levels` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `professional_id` CHAR(36) NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `min_visits` INT NOT NULL DEFAULT 0,
  `min_spent` DECIMAL(10,2) NOT NULL DEFAULT 0,
  `discount_percent` DECIMAL(5,2) NOT NULL DEFAULT 0,
  `color` VARCHAR(20) DEFAULT '#C4922A',
  `sort_order` INT NOT NULL DEFAULT 0,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  FOREIGN KEY (`professional_id`) REFERENCES `professionals`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `cashback_rules` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `professional_id` CHAR(36) NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `rule_type` VARCHAR(50) NOT NULL DEFAULT 'service',
  `cashback_percent` DECIMAL(5,2) NOT NULL DEFAULT 5,
  `service_id` CHAR(36) DEFAULT NULL,
  `start_hour` TIME DEFAULT NULL,
  `end_hour` TIME DEFAULT NULL,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  FOREIGN KEY (`professional_id`) REFERENCES `professionals`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================
-- SERVICE PACKAGES
-- ============================================
CREATE TABLE IF NOT EXISTS `service_packages` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `professional_id` CHAR(36) NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `description` TEXT DEFAULT NULL,
  `service_id` CHAR(36) DEFAULT NULL,
  `total_sessions` INT NOT NULL DEFAULT 1,
  `price` DECIMAL(10,2) NOT NULL DEFAULT 0,
  `validity_days` INT DEFAULT NULL,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  FOREIGN KEY (`professional_id`) REFERENCES `professionals`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `client_packages` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `professional_id` CHAR(36) NOT NULL,
  `client_id` CHAR(36) DEFAULT NULL,
  `package_id` CHAR(36) DEFAULT NULL,
  `client_name` VARCHAR(255) NOT NULL,
  `client_phone` VARCHAR(50) DEFAULT NULL,
  `total_sessions` INT NOT NULL DEFAULT 1,
  `used_sessions` INT NOT NULL DEFAULT 0,
  `amount_paid` DECIMAL(10,2) NOT NULL DEFAULT 0,
  `status` VARCHAR(50) NOT NULL DEFAULT 'active',
  `purchased_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `expires_at` DATETIME DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  FOREIGN KEY (`professional_id`) REFERENCES `professionals`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================
-- WAITLIST
-- ============================================
CREATE TABLE IF NOT EXISTS `waitlist_entries` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `professional_id` CHAR(36) NOT NULL,
  `client_id` CHAR(36) DEFAULT NULL,
  `service_id` CHAR(36) DEFAULT NULL,
  `client_name` VARCHAR(255) NOT NULL,
  `client_phone` VARCHAR(50) NOT NULL,
  `preferred_dates` JSON DEFAULT NULL,
  `preferred_times` JSON DEFAULT NULL,
  `status` VARCHAR(50) NOT NULL DEFAULT 'waiting',
  `notes` TEXT DEFAULT NULL,
  `is_vip` TINYINT(1) NOT NULL DEFAULT 0,
  `notification_count` INT NOT NULL DEFAULT 0,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  FOREIGN KEY (`professional_id`) REFERENCES `professionals`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `waitlist_settings` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `professional_id` CHAR(36) NOT NULL,
  `enabled` TINYINT(1) NOT NULL DEFAULT 1,
  `max_notifications` INT NOT NULL DEFAULT 3,
  `reservation_minutes` INT NOT NULL DEFAULT 3,
  `prioritize_vip` TINYINT(1) NOT NULL DEFAULT 1,
  `auto_process` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  FOREIGN KEY (`professional_id`) REFERENCES `professionals`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `waitlist_offers` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `professional_id` CHAR(36) NOT NULL,
  `waitlist_entry_id` CHAR(36) DEFAULT NULL,
  `service_id` CHAR(36) DEFAULT NULL,
  `client_name` VARCHAR(255) NOT NULL,
  `client_phone` VARCHAR(50) NOT NULL,
  `slot_start` DATETIME NOT NULL,
  `slot_end` DATETIME NOT NULL,
  `reserved_until` DATETIME DEFAULT NULL,
  `status` VARCHAR(50) NOT NULL DEFAULT 'sent',
  `responded_at` DATETIME DEFAULT NULL,
  `booking_id` CHAR(36) DEFAULT NULL,
  `created_booking_id` CHAR(36) DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  FOREIGN KEY (`professional_id`) REFERENCES `professionals`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================
-- COURSES
-- ============================================
CREATE TABLE IF NOT EXISTS `course_categories` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `professional_id` CHAR(36) NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `sort_order` INT NOT NULL DEFAULT 0,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  FOREIGN KEY (`professional_id`) REFERENCES `professionals`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `courses` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `professional_id` CHAR(36) NOT NULL,
  `category_id` CHAR(36) DEFAULT NULL,
  `name` VARCHAR(255) NOT NULL,
  `slug` VARCHAR(255) DEFAULT NULL UNIQUE,
  `short_description` TEXT DEFAULT NULL,
  `full_description` TEXT DEFAULT NULL,
  `cover_image_url` TEXT DEFAULT NULL,
  `modality` VARCHAR(50) NOT NULL DEFAULT 'presencial',
  `workload_hours` INT NOT NULL DEFAULT 8,
  `price` DECIMAL(10,2) NOT NULL DEFAULT 0,
  `installments` INT NOT NULL DEFAULT 1,
  `max_students` INT NOT NULL DEFAULT 10,
  `has_certificate` TINYINT(1) NOT NULL DEFAULT 1,
  `syllabus` TEXT DEFAULT NULL,
  `materials_included` TEXT DEFAULT NULL,
  `prerequisites` TEXT DEFAULT NULL,
  `status` VARCHAR(50) NOT NULL DEFAULT 'draft',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  FOREIGN KEY (`professional_id`) REFERENCES `professionals`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`category_id`) REFERENCES `course_categories`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `course_classes` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `professional_id` CHAR(36) NOT NULL,
  `course_id` CHAR(36) NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `class_date` DATE NOT NULL,
  `start_time` TIME NOT NULL,
  `end_time` TIME NOT NULL,
  `max_students` INT NOT NULL DEFAULT 10,
  `enrolled_count` INT NOT NULL DEFAULT 0,
  `location` TEXT DEFAULT NULL,
  `modality` VARCHAR(50) NOT NULL DEFAULT 'presencial',
  `online_link` TEXT DEFAULT NULL,
  `status` VARCHAR(50) NOT NULL DEFAULT 'open',
  `instructor_name` VARCHAR(255) DEFAULT NULL,
  `notes` TEXT DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  FOREIGN KEY (`professional_id`) REFERENCES `professionals`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`course_id`) REFERENCES `courses`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `course_enrollments` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `professional_id` CHAR(36) NOT NULL,
  `course_id` CHAR(36) NOT NULL,
  `class_id` CHAR(36) NOT NULL,
  `client_id` CHAR(36) DEFAULT NULL,
  `student_name` VARCHAR(255) NOT NULL,
  `student_phone` VARCHAR(50) DEFAULT NULL,
  `student_email` VARCHAR(255) DEFAULT NULL,
  `student_cpf` VARCHAR(20) DEFAULT NULL,
  `student_city` VARCHAR(255) DEFAULT NULL,
  `student_notes` TEXT DEFAULT NULL,
  `enrollment_status` VARCHAR(50) NOT NULL DEFAULT 'pending',
  `payment_status` VARCHAR(50) NOT NULL DEFAULT 'pending',
  `payment_method` VARCHAR(50) DEFAULT NULL,
  `amount_paid` DECIMAL(10,2) NOT NULL DEFAULT 0,
  `origin` VARCHAR(50) NOT NULL DEFAULT 'public_page',
  `enrolled_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  FOREIGN KEY (`professional_id`) REFERENCES `professionals`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`course_id`) REFERENCES `courses`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`class_id`) REFERENCES `course_classes`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================
-- INSTAGRAM
-- ============================================
CREATE TABLE IF NOT EXISTS `instagram_accounts` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `professional_id` CHAR(36) NOT NULL UNIQUE,
  `instagram_user_id` VARCHAR(255) NOT NULL,
  `username` VARCHAR(255) NOT NULL,
  `account_name` VARCHAR(255) DEFAULT NULL,
  `page_id` VARCHAR(255) NOT NULL,
  `access_token` TEXT NOT NULL,
  `token_expiration` DATETIME DEFAULT NULL,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `auto_reply_enabled` TINYINT(1) NOT NULL DEFAULT 0,
  `auto_comment_reply_enabled` TINYINT(1) NOT NULL DEFAULT 0,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  FOREIGN KEY (`professional_id`) REFERENCES `professionals`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `instagram_messages` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `professional_id` CHAR(36) NOT NULL,
  `instagram_user_id` VARCHAR(255) NOT NULL,
  `sender_id` VARCHAR(255) NOT NULL,
  `sender_username` VARCHAR(255) DEFAULT NULL,
  `message_text` TEXT DEFAULT NULL,
  `message_type` VARCHAR(50) NOT NULL DEFAULT 'dm',
  `direction` VARCHAR(50) NOT NULL DEFAULT 'incoming',
  `is_read` TINYINT(1) NOT NULL DEFAULT 0,
  `booking_id` CHAR(36) DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  FOREIGN KEY (`professional_id`) REFERENCES `professionals`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `instagram_keywords` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `professional_id` CHAR(36) NOT NULL,
  `keyword` VARCHAR(255) NOT NULL,
  `response_type` VARCHAR(50) NOT NULL DEFAULT 'booking_link',
  `custom_response` TEXT DEFAULT NULL,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `trigger_count` INT NOT NULL DEFAULT 0,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  FOREIGN KEY (`professional_id`) REFERENCES `professionals`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================
-- UPSELL
-- ============================================
CREATE TABLE IF NOT EXISTS `upsell_rules` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `professional_id` CHAR(36) NOT NULL,
  `source_service_id` CHAR(36) DEFAULT NULL,
  `recommended_service_id` CHAR(36) DEFAULT NULL,
  `message` TEXT DEFAULT NULL,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  FOREIGN KEY (`professional_id`) REFERENCES `professionals`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `upsell_events` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `professional_id` CHAR(36) NOT NULL,
  `booking_id` CHAR(36) DEFAULT NULL,
  `source_service_id` CHAR(36) DEFAULT NULL,
  `recommended_service_id` CHAR(36) DEFAULT NULL,
  `client_phone` VARCHAR(50) DEFAULT NULL,
  `channel` VARCHAR(50) NOT NULL DEFAULT 'web',
  `status` VARCHAR(50) NOT NULL DEFAULT 'suggested',
  `upsell_revenue` DECIMAL(10,2) NOT NULL DEFAULT 0,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  FOREIGN KEY (`professional_id`) REFERENCES `professionals`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================
-- PLATFORM REVIEWS
-- ============================================
CREATE TABLE IF NOT EXISTS `platform_reviews` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `professional_id` CHAR(36) NOT NULL,
  `booking_id` CHAR(36) DEFAULT NULL,
  `client_name` VARCHAR(255) NOT NULL,
  `client_phone` VARCHAR(50) DEFAULT NULL,
  `rating` TINYINT NOT NULL DEFAULT 5,
  `comment` TEXT DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  FOREIGN KEY (`professional_id`) REFERENCES `professionals`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

SET FOREIGN_KEY_CHECKS = 1;
