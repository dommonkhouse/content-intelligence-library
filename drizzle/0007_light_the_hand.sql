ALTER TABLE `article_tags` ADD CONSTRAINT `article_tags_article_id_fk` FOREIGN KEY (`articleId`) REFERENCES `articles`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `article_tags` ADD CONSTRAINT `article_tags_tag_id_fk` FOREIGN KEY (`tagId`) REFERENCES `tags`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `content_repurposing` ADD CONSTRAINT `content_repurposing_article_id_fk` FOREIGN KEY (`articleId`) REFERENCES `articles`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `content_repurposing` ADD CONSTRAINT `content_repurposing_draft_id_fk` FOREIGN KEY (`draftId`) REFERENCES `generated_drafts`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `generated_drafts` ADD CONSTRAINT `generated_drafts_article_id_fk` FOREIGN KEY (`articleId`) REFERENCES `articles`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `raw_emails` ADD CONSTRAINT `raw_emails_article_id_fk` FOREIGN KEY (`articleId`) REFERENCES `articles`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `article_tags_article_id_idx` ON `article_tags` (`articleId`);--> statement-breakpoint
CREATE INDEX `article_tags_tag_id_idx` ON `article_tags` (`tagId`);--> statement-breakpoint
CREATE INDEX `articles_imported_at_idx` ON `articles` (`importedAt`);--> statement-breakpoint
CREATE INDEX `articles_source_idx` ON `articles` (`source`);--> statement-breakpoint
CREATE INDEX `content_repurposing_article_status_idx` ON `content_repurposing` (`articleId`,`status`);--> statement-breakpoint
CREATE INDEX `content_repurposing_article_updated_at_idx` ON `content_repurposing` (`articleId`,`updatedAt`);--> statement-breakpoint
CREATE INDEX `generated_drafts_article_created_at_idx` ON `generated_drafts` (`articleId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `generated_drafts_article_format_idx` ON `generated_drafts` (`articleId`,`format`);--> statement-breakpoint
CREATE INDEX `raw_emails_status_received_at_idx` ON `raw_emails` (`status`,`receivedAt`);--> statement-breakpoint
CREATE INDEX `raw_emails_article_id_idx` ON `raw_emails` (`articleId`);