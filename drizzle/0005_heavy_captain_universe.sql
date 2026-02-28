CREATE TABLE `raw_emails` (
	`id` int AUTO_INCREMENT NOT NULL,
	`subject` varchar(512),
	`fromAddress` varchar(320),
	`fromName` varchar(256),
	`rawText` text,
	`rawHtml` text,
	`status` enum('pending','approved','discarded','error') NOT NULL DEFAULT 'pending',
	`errorMessage` text,
	`articleId` int,
	`receivedAt` timestamp NOT NULL DEFAULT (now()),
	`processedAt` timestamp,
	CONSTRAINT `raw_emails_id` PRIMARY KEY(`id`)
);
