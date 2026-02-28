import { createConnection } from 'mysql2/promise';
import { readFileSync } from 'fs';
import { config } from 'dotenv';

config({ path: '/home/ubuntu/content-database/.env' });

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('DATABASE_URL not set');
  process.exit(1);
}

const articles = JSON.parse(readFileSync('/home/ubuntu/extracted_articles.json', 'utf-8'));
console.log(`Inserting ${articles.length} articles...`);

// Auto-tagging rules based on title + content keywords
const TAG_RULES = [
  { tag: 'Leadership', keywords: ['leadership', 'leader', 'ceo', 'executive', 'management', 'manager', 'founder'] },
  { tag: 'Hiring & Talent', keywords: ['hiring', 'recruit', 'talent', 'onboard', 'interview', 'candidate', 'job posting', 'remote hiring'] },
  { tag: 'Team Culture', keywords: ['culture', 'team', 'psychological safety', 'trust', 'collaboration', 'conflict', 'engagement', 'morale'] },
  { tag: 'Meetings', keywords: ['meeting', 'huddle', 'standup', 'retrospective', 'agenda', 'cadence'] },
  { tag: 'Strategy', keywords: ['strategy', 'strategic', 'vision', 'mission', 'planning', 'okr', 'kpi', 'goals', 'roadmap'] },
  { tag: 'Sales', keywords: ['sales', 'revenue', 'pipeline', 'prospect', 'customer', 'deal', 'closing', 'crm', 'renewal'] },
  { tag: 'Scaling & Growth', keywords: ['scale', 'scaling', 'growth', 'hypergrowth', 'series', 'startup', 'venture', 'fundrais'] },
  { tag: 'Performance', keywords: ['performance', 'accountability', 'feedback', 'review', 'appraisal', 'kpi', 'metric', 'measure'] },
  { tag: 'AI & Technology', keywords: ['ai ', 'artificial intelligence', 'machine learning', 'automation', 'saas', 'software', 'tech', 'digital'] },
  { tag: 'Productivity', keywords: ['productiv', 'focus', 'time management', 'procrastinat', 'habit', 'deep work', 'distract'] },
  { tag: 'Core Values', keywords: ['core value', 'values', 'purpose', 'mission statement', 'culture fit', 'principles'] },
  { tag: 'Coaching', keywords: ['coach', 'mentor', 'develop', 'learning', 'training', 'skill'] },
  { tag: 'B2B SaaS', keywords: ['b2b', 'saas', 'arr', 'mrr', 'churn', 'retention', 'subscription', 'enterprise'] },
  { tag: 'Remote Work', keywords: ['remote', 'hybrid', 'distributed', 'work from home', 'wfh', 'async'] },
];

function autoTag(title, content) {
  const text = (title + ' ' + (content || '')).toLowerCase();
  const tags = new Set();
  for (const rule of TAG_RULES) {
    for (const kw of rule.keywords) {
      if (text.includes(kw)) {
        tags.add(rule.tag);
        break;
      }
    }
  }
  return [...tags];
}

function estimateReadTime(content) {
  const words = content ? content.split(/\s+/).length : 0;
  return Math.max(1, Math.round(words / 200));
}

function truncate(str, max) {
  if (!str) return '';
  return str.length > max ? str.slice(0, max - 3) + '...' : str;
}

async function main() {
  const conn = await createConnection(DATABASE_URL);
  console.log('Connected to database');

  // Get existing tag IDs or create them
  const tagMap = {};
  const allTagNames = TAG_RULES.map(r => r.tag);
  
  for (const tagName of allTagNames) {
    const [rows] = await conn.execute('SELECT id FROM tags WHERE name = ?', [tagName]);
    if (rows.length > 0) {
      tagMap[tagName] = rows[0].id;
    } else {
      const colors = ['#3B82F6','#10B981','#F59E0B','#EF4444','#8B5CF6','#EC4899','#06B6D4','#84CC16','#F97316','#6366F1','#14B8A6','#E11D48','#7C3AED','#0EA5E9'];
      const color = colors[allTagNames.indexOf(tagName) % colors.length];
      const [result] = await conn.execute(
        'INSERT INTO tags (name, colour, createdAt) VALUES (?, ?, NOW())',
        [tagName, color]
      );
      tagMap[tagName] = result.insertId;
      console.log(`Created tag: ${tagName} (id: ${result.insertId})`);
    }
  }

  let inserted = 0;
  let skipped = 0;
  let errors = 0;

  for (const article of articles) {
    try {
      // Check if URL already exists
      const [existing] = await conn.execute('SELECT id FROM articles WHERE url = ?', [article.url]);
      if (existing.length > 0) {
        skipped++;
        continue;
      }

      const tags = autoTag(article.title, article.content);
      const wordCount = article.content ? article.content.split(/\s+/).length : 0;
      const readTime = estimateReadTime(article.content);
      
      // Build a summary from first 3 sentences of content
      const sentences = (article.content || '').split(/[.!?]+/).filter(s => s.trim().length > 20);
      const summary = truncate(sentences.slice(0, 3).join('. ') + '.', 600);

      // Extract key insights (first 5 bullet-worthy sentences)
      const insightSentences = sentences.filter(s => s.trim().length > 40).slice(0, 5);
      const keyInsights = JSON.stringify(insightSentences.map(s => s.trim()));

      const sql = 'INSERT INTO articles (url, title, `fullText`, summary, keyInsights, author, source, wordCount, isFavourite, importedAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, NOW(), NOW())';
      const [result] = await conn.execute(sql,
        [
          truncate(article.url, 2000),
          truncate(article.title, 300),
          article.content || '',
          summary,
          keyInsights,
          truncate(article.author || '', 200),
          truncate(article.domain || '', 200),
          wordCount,
        ]
      );

      const articleId = result.insertId;

      // Insert article-tag relationships
      for (const tagName of tags) {
        const tagId = tagMap[tagName];
        if (tagId) {
          await conn.execute(
            'INSERT IGNORE INTO article_tags (articleId, tagId) VALUES (?, ?)',
            [articleId, tagId]
          );
        }
      }

      inserted++;
      if (inserted % 20 === 0) {
        console.log(`Inserted ${inserted}/${articles.length - skipped} articles...`);
      }

    } catch (err) {
      errors++;
      console.error(`Error inserting ${article.url}: ${err.message}`);
    }
  }

  await conn.end();
  console.log(`\n=== COMPLETE ===`);
  console.log(`Inserted: ${inserted}`);
  console.log(`Skipped (already exist): ${skipped}`);
  console.log(`Errors: ${errors}`);
}

main().catch(console.error);
