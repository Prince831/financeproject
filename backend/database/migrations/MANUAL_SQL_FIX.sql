-- Manual SQL Fix for Live Server
-- Use this ONLY if migrations fail or you need to manually create the table
-- Run this in your database management tool (phpMyAdmin, MySQL Workbench, etc.)

-- Step 1: Drop old table if it exists (backup data first if needed!)
DROP TABLE IF EXISTS `reconciliation_reports`;

-- Step 2: Create new reconciliation_runs table
CREATE TABLE `reconciliation_runs` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `reference` varchar(255) NOT NULL,
  `reconciliation_date` datetime NOT NULL,
  `reconciliation_mode` varchar(255) NOT NULL,
  `status` varchar(255) NOT NULL DEFAULT 'completed',
  `user_name` varchar(255) DEFAULT NULL,
  `file_name` varchar(255) DEFAULT NULL,
  `file_size` bigint(20) unsigned DEFAULT NULL,
  `filters` json DEFAULT NULL,
  `summary` json DEFAULT NULL,
  `payload` longtext NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `reconciliation_runs_reference_unique` (`reference`),
  KEY `reconciliation_runs_reconciliation_date_index` (`reconciliation_date`),
  KEY `reconciliation_runs_reconciliation_mode_index` (`reconciliation_mode`),
  KEY `reconciliation_runs_status_index` (`status`),
  KEY `reconciliation_runs_user_name_index` (`user_name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

