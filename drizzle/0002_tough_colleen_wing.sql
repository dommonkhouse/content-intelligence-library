CREATE TABLE `content_repurposing` (
	`id` int AUTO_INCREMENT NOT NULL,
	`articleId` int NOT NULL,
	`format` enum('video_script','linkedin_post','instagram_caption','blog_post') NOT NULL,
	`status` enum('untouched','in_progress','done') NOT NULL DEFAULT 'untouched',
	`notes` text,
	`draftId` int,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `content_repurposing_id` PRIMARY KEY(`id`)
);
