-- Intelligent Upsell Engine Migration

-- 1. Upsell Rules
CREATE TABLE IF NOT EXISTS `upsell_rules` (
  `id` varchar(36) NOT NULL,
  `professional_id` varchar(36) NOT NULL,
  `trigger_service_id` varchar(36) NOT NULL,
  `offer_service_id` varchar(36) NOT NULL,
  `discount_percentage` decimal(5,2) DEFAULT '0.00',
  `days_before_appointment` int(11) DEFAULT '1',
  `message_template` text,
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_upsell_rules_professional_id` (`professional_id`),
  FOREIGN KEY (`professional_id`) REFERENCES `professionals` (`id`) ON DELETE CASCADE,
  FOREIGN KEY (`trigger_service_id`) REFERENCES `services` (`id`) ON DELETE CASCADE,
  FOREIGN KEY (`offer_service_id`) REFERENCES `services` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Upsell Recipients
CREATE TABLE IF NOT EXISTS `upsell_recipients` (
  `id` varchar(36) NOT NULL,
  `professional_id` varchar(36) NOT NULL,
  `rule_id` varchar(36) NOT NULL,
  `client_id` varchar(36) NOT NULL,
  `booking_id` varchar(36) NOT NULL,
  `message_payload` text,
  `status` varchar(50) DEFAULT 'sent',
  `sent_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `delivered_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_upsell_recips_prof` (`professional_id`),
  KEY `idx_upsell_recips_client` (`client_id`),
  FOREIGN KEY (`professional_id`) REFERENCES `professionals` (`id`) ON DELETE CASCADE,
  FOREIGN KEY (`rule_id`) REFERENCES `upsell_rules` (`id`) ON DELETE CASCADE,
  FOREIGN KEY (`client_id`) REFERENCES `clients` (`id`) ON DELETE CASCADE,
  FOREIGN KEY (`booking_id`) REFERENCES `bookings` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Upsell Events
CREATE TABLE IF NOT EXISTS `upsell_events` (
  `id` varchar(36) NOT NULL,
  `professional_id` varchar(36) NOT NULL,
  `client_id` varchar(36) NOT NULL,
  `rule_id` varchar(36) NOT NULL,
  `booking_id` varchar(36) NOT NULL,
  `event_type` varchar(50) NOT NULL,
  `value` decimal(10,2) DEFAULT '0.00',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_upsell_events_prof` (`professional_id`),
  FOREIGN KEY (`professional_id`) REFERENCES `professionals` (`id`) ON DELETE CASCADE,
  FOREIGN KEY (`client_id`) REFERENCES `clients` (`id`) ON DELETE CASCADE,
  FOREIGN KEY (`rule_id`) REFERENCES `upsell_rules` (`id`) ON DELETE CASCADE,
  FOREIGN KEY (`booking_id`) REFERENCES `bookings` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
