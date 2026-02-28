UPDATE `generated_drafts`
SET `format` = 'blog_post'
WHERE `format` = 'blog_outline';

ALTER TABLE `generated_drafts`
MODIFY COLUMN `format` enum('video_script','linkedin_post','instagram_caption','blog_post') NOT NULL;

DELETE cr_old
FROM `content_repurposing` cr_old
JOIN `content_repurposing` cr_new
  ON cr_old.`articleId` = cr_new.`articleId`
 AND cr_old.`format` = cr_new.`format`
 AND cr_old.`id` < cr_new.`id`;

ALTER TABLE `content_repurposing`
ADD CONSTRAINT `content_repurposing_article_format_unique`
UNIQUE(`articleId`, `format`);
