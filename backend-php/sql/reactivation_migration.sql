-- Reactivation Engine Migration Script
-- Apply this script to existing databases to add the new tables and columns

-- Add columns to `clients` table
ALTER TABLE `clients` 
  ADD COLUMN IF NOT EXISTS `last_completed_appointment_at` DATETIME DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `avg_return_interval_days` INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS `average_ticket` DECIMAL(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS `reactivation_score` INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS `reactivation_status` VARCHAR(50) DEFAULT 'inactive';

-- Create Reactivation Campaigns table
CREATE TABLE IF NOT EXISTS `reactivation_campaigns` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `professional_id` CHAR(36) NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `segment_filter` JSON DEFAULT NULL,
  `message_template` TEXT NOT NULL,
  `send_mode` VARCHAR(50) NOT NULL DEFAULT 'immediate',
  `send_limit_per_day` INT DEFAULT NULL,
  `scheduled_at` DATETIME DEFAULT NULL,
  `status` VARCHAR(50) NOT NULL DEFAULT 'draft',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  FOREIGN KEY (`professional_id`) REFERENCES `professionals`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Create Reactivation Recipients table
CREATE TABLE IF NOT EXISTS `reactivation_campaign_recipients` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `campaign_id` CHAR(36) NOT NULL,
  `client_id` CHAR(36) NOT NULL,
  `message_payload` TEXT NOT NULL,
  `status` VARCHAR(50) NOT NULL DEFAULT 'pending',
  `sent_at` DATETIME DEFAULT NULL,
  `delivered_at` DATETIME DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  FOREIGN KEY (`campaign_id`) REFERENCES `reactivation_campaigns`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Create Reactivation Events table
CREATE TABLE IF NOT EXISTS `reactivation_events` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `client_id` CHAR(36) NOT NULL,
  `campaign_id` CHAR(36) NOT NULL,
  `event_type` VARCHAR(50) NOT NULL DEFAULT 'message_sent',
  `value` DECIMAL(10,2) DEFAULT 0,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`campaign_id`) REFERENCES `reactivation_campaigns`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
