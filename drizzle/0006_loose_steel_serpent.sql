CREATE TABLE `ingest_log` (
	`id` int AUTO_INCREMENT NOT NULL,
	`runAt` timestamp NOT NULL DEFAULT (now()),
	`status` enum('success','partial','error') NOT NULL,
	`emailsFound` int NOT NULL DEFAULT 0,
	`emailsNew` int NOT NULL DEFAULT 0,
	`emailsSkipped` int NOT NULL DEFAULT 0,
	`errorMessage` text,
	`durationMs` int,
	CONSTRAINT `ingest_log_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `newsletter_sources` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(256) NOT NULL,
	`emailAddress` varchar(320) NOT NULL,
	`isActive` boolean NOT NULL DEFAULT true,
	`lastIngestedAt` timestamp,
	`totalIngested` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `newsletter_sources_id` PRIMARY KEY(`id`),
	CONSTRAINT `newsletter_sources_emailAddress_unique` UNIQUE(`emailAddress`)
);
--> statement-breakpoint
ALTER TABLE `raw_emails` ADD `gmailMessageId` varchar(128);--> statement-breakpoint
ALTER TABLE `raw_emails` ADD `gmailThreadId` varchar(128);