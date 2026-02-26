CREATE TABLE `article_tags` (
	`id` int AUTO_INCREMENT NOT NULL,
	`articleId` int NOT NULL,
	`tagId` int NOT NULL,
	CONSTRAINT `article_tags_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `articles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`title` varchar(512) NOT NULL,
	`url` varchar(2048),
	`source` varchar(256),
	`author` varchar(256),
	`fullText` text,
	`summary` text,
	`keyInsights` text,
	`publicationDate` timestamp,
	`importedAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`isFavourite` boolean NOT NULL DEFAULT false,
	`wordCount` int DEFAULT 0,
	CONSTRAINT `articles_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `generated_drafts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`articleId` int NOT NULL,
	`format` enum('video_script','linkedin_post','instagram_caption','blog_outline') NOT NULL,
	`title` varchar(512),
	`content` text NOT NULL,
	`angle` varchar(512),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `generated_drafts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `tags` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(128) NOT NULL,
	`colour` varchar(32) NOT NULL DEFAULT '#6366f1',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `tags_id` PRIMARY KEY(`id`),
	CONSTRAINT `tags_name_unique` UNIQUE(`name`)
);
