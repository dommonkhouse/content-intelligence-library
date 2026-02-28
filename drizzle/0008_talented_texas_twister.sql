CREATE TABLE `article_focus_topics` (
	`id` int AUTO_INCREMENT NOT NULL,
	`articleId` int NOT NULL,
	`focusTopicId` int NOT NULL,
	`relevanceScore` int NOT NULL DEFAULT 0,
	`aiReason` text,
	`taggedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `article_focus_topics_id` PRIMARY KEY(`id`),
	CONSTRAINT `article_focus_topic_unique` UNIQUE(`articleId`,`focusTopicId`)
);
--> statement-breakpoint
CREATE TABLE `focus_topics` (
	`id` int AUTO_INCREMENT NOT NULL,
	`dayNumber` int NOT NULL,
	`name` varchar(256) NOT NULL,
	`description` text,
	`keywords` text,
	`color` varchar(32),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `focus_topics_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `article_focus_topics` ADD CONSTRAINT `aft_article_id_fk` FOREIGN KEY (`articleId`) REFERENCES `articles`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `article_focus_topics` ADD CONSTRAINT `aft_focus_topic_id_fk` FOREIGN KEY (`focusTopicId`) REFERENCES `focus_topics`(`id`) ON DELETE cascade ON UPDATE no action;