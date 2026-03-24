-- Intelligent Upsell Engine (V2 - Scoring/Opportunities Based)

-- Drop V1 objects if they exist to apply clean V2 schema
DROP TABLE IF EXISTS `upsell_events`;
DROP TABLE IF EXISTS `upsell_recipients`;
DROP TABLE IF EXISTS `upsell_rules`;

-- 1. Upsell Opportunities
CREATE TABLE IF NOT EXISTS `upsell_opportunities` (
  `id` varchar(36) NOT NULL,
  `professional_id` varchar(36) NOT NULL,
  `client_id` varchar(36) NOT NULL,
  `suggested_service_id` varchar(36) NOT NULL,
  `score` int(11) DEFAULT '0',
  `priority` varchar(20) DEFAULT 'low',
  `status` varchar(20) DEFAULT 'pending',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  FOREIGN KEY (`professional_id`) REFERENCES `professionals` (`id`) ON DELETE CASCADE,
  FOREIGN KEY (`client_id`) REFERENCES `clients` (`id`) ON DELETE CASCADE,
  FOREIGN KEY (`suggested_service_id`) REFERENCES `services` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Upsell Campaigns
CREATE TABLE IF NOT EXISTS `upsell_campaigns` (
  `id` varchar(36) NOT NULL,
  `professional_id` varchar(36) NOT NULL,
  `name` varchar(255) NOT NULL,
  `message_template` text,
  `status` varchar(50) DEFAULT 'draft',
  `target_audience` varchar(255) DEFAULT 'all',
  `executed_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  FOREIGN KEY (`professional_id`) REFERENCES `professionals` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Upsell Campaign Recipients
CREATE TABLE IF NOT EXISTS `upsell_campaign_recipients` (
  `id` varchar(36) NOT NULL,
  `campaign_id` varchar(36) NOT NULL,
  `client_id` varchar(36) NOT NULL,
  `opportunity_id` varchar(36) NOT NULL,
  `status` varchar(50) DEFAULT 'pending',
  `sent_at` timestamp NULL DEFAULT NULL,
  `delivered_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  FOREIGN KEY (`campaign_id`) REFERENCES `upsell_campaigns` (`id`) ON DELETE CASCADE,
  FOREIGN KEY (`client_id`) REFERENCES `clients` (`id`) ON DELETE CASCADE,
  FOREIGN KEY (`opportunity_id`) REFERENCES `upsell_opportunities` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Upsell Events (Tracking Incremental Revenue)
CREATE TABLE IF NOT EXISTS `upsell_events` (
  `id` varchar(36) NOT NULL,
  `professional_id` varchar(36) NOT NULL,
  `client_id` varchar(36) NOT NULL,
  `campaign_id` varchar(36) NOT NULL,
  `booking_id` varchar(36) NOT NULL,
  `incremental_revenue` decimal(10,2) DEFAULT '0.00',
  `event_type` varchar(50) NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  FOREIGN KEY (`professional_id`) REFERENCES `professionals` (`id`) ON DELETE CASCADE,
  FOREIGN KEY (`client_id`) REFERENCES `clients` (`id`) ON DELETE CASCADE,
  FOREIGN KEY (`campaign_id`) REFERENCES `upsell_campaigns` (`id`) ON DELETE CASCADE,
  FOREIGN KEY (`booking_id`) REFERENCES `bookings` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
