import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import dotenv from "dotenv";
dotenv.config();

const conn = await mysql.createConnection(process.env.DATABASE_URL);
const db = drizzle(conn);

// ── Tables (inline since we can't import TS directly) ─────────────────────────
import { articles, tags, articleTags } from "./drizzle/schema.ts";
import { eq } from "drizzle-orm";

// ── Tags to create ────────────────────────────────────────────────────────────
const TAG_DEFS = [
  { name: "AI", colour: "#6366f1" },
  { name: "B2B SaaS", colour: "#8b5cf6" },
  { name: "Leadership", colour: "#f59e0b" },
  { name: "Startups", colour: "#10b981" },
  { name: "IPOs", colour: "#3b82f6" },
  { name: "AI Agents", colour: "#ec4899" },
  { name: "Founder CEO", colour: "#ef4444" },
  { name: "Growth", colour: "#14b8a6" },
];

// ── Articles from the SaaStr email ────────────────────────────────────────────
const ARTICLES = [
  {
    title: "The Painful Gaps Between AI-Native and Traditional B2B Startups",
    url: "https://www.saastr.com/the-painful-gaps-between-ai-native-and-traditional-b2b-startups/",
    source: "SaaStr",
    author: "Jason Lemkin",
    summary: "A candid comparison of how AI-native startups operate versus traditional B2B companies. The differences are stark — not just in product, but in how they operate, how they're structured, and the energy in the building. A checklist to help founders honestly assess which playbook they're actually running.",
    keyInsights: JSON.stringify([
      "AI-native startups operate with fundamentally different energy, structure, and speed than traditional B2B companies",
      "Most founders claim to be AI-native but are still running traditional B2B playbooks",
      "The gap is widening — not just in product but in hiring, culture, and decision-making speed",
      "Being honest about which camp you're in is the first step to closing the gap",
      "Investors can now spot the difference immediately — it affects valuations and fundraising"
    ]),
    fullText: `Anyone investing (including me) has been spending a lot of time with both AI-native startups and traditional B2B companies lately. We see what the newcomers are doing, what the hypergrowth players are doing, and how the incumbents are handling the AI Age.

The differences are becoming stark—not just in product, but in how they operate, how they're structured, and frankly, how much energy is in the building.

Let me share what I'm seeing on the ground. And I challenge you to be honest — which are you, really? No matter how "AI" you claim you are, which playbook are you running?

AI-Native vs Traditional B2B: The Checklist

AI-Native startups:
- Ship 10x faster — weekly or even daily releases are the norm
- Have 50-80% fewer employees for the same ARR
- Use AI internally for almost every function — support, marketing, sales, engineering
- Have founders who are deeply technical and still writing code
- Make decisions in hours, not weeks
- Have almost no middle management
- Are building with AI as the core, not bolted on

Traditional B2B companies (even those calling themselves "AI"):
- Still have large support teams handling tickets manually
- Have marketing teams creating content without AI assistance
- Have sales teams doing manual outreach
- Have layers of management approving decisions
- Ship quarterly, not weekly
- Use AI as a feature, not the foundation

The honest question: which are you, really?`,
    publicationDate: new Date("2026-02-26"),
    tagNames: ["AI", "B2B SaaS", "Startups", "AI Agents"],
  },
  {
    title: "The 2025 IPO Class, Graded. Only 3 of 13 Are Above Water",
    url: "https://www.saastr.com/the-2025-ipo-class-graded/",
    source: "SaaStr",
    author: "Jason Lemkin",
    summary: "A full scorecard of the 2025 B2B and tech IPO class. Despite 174 companies raising over $31 billion in H1 2025 — the highest since 2021 — most are now trading below their IPO price. The IPO reopening of 2025 was largely a bust, with important lessons for founders thinking about going public.",
    keyInsights: JSON.stringify([
      "174 companies raised over $31 billion in H1 2025 — the highest since 2021",
      "Most B2B and tech IPOs from 2025 are now trading below their IPO price",
      "Only 3 of 13 major tech IPOs are above water as of late February 2026",
      "The IPO window reopening of 2025 was largely a bust for investors",
      "Founders should think carefully before rushing to IPO in uncertain markets"
    ]),
    fullText: `Everyone said 2025 was the year the IPO window reopened. And technically, it did. 174 companies raised over $31 billion in the first half alone — the highest since 2021.

But here's what nobody wants to talk about: most of the B2B and tech IPOs from 2025 are now trading below their IPO price. Several of them significantly below.

In the end, the IPO reopening of 2025 was mostly … a bust.

Here's the full scorecard as of late February 2026, what actually happened, and what it means for founders thinking about going public.

The 2025 IPO Class Scorecard:

Of the 13 major B2B/tech IPOs tracked:
- 3 are trading above IPO price (23%)
- 7 are trading 10-30% below IPO price
- 3 are trading more than 30% below IPO price

What went wrong:
1. Macro headwinds — interest rates stayed higher for longer than expected
2. AI disruption uncertainty — investors unsure which incumbents survive
3. Overly optimistic growth projections that didn't materialise
4. Lock-up expiry selling pressure hit harder than expected

What this means for founders:
- The bar for IPO readiness is higher than ever
- Rule of 40 is table stakes — you need Rule of 50+
- Profitability matters more than it did in 2021
- Consider staying private longer if you can`,
    publicationDate: new Date("2026-02-23"),
    tagNames: ["IPOs", "B2B SaaS", "Startups", "Growth"],
  },
  {
    title: "The Wave of AI Agent Churn To Come: Prompts Are Portable",
    url: "https://www.saastr.com/the-wave-of-ai-agent-churn-to-come/",
    source: "SaaStr",
    author: "Jason Lemkin",
    summary: "A structural problem facing every AI agent vendor: switching costs are fundamentally lower than traditional SaaS. Customers are signing one-year deals because AI is changing too fast. The moat that sustained SaaS valuations for decades — brutal switching costs — simply doesn't exist in the same way for AI agents.",
    keyInsights: JSON.stringify([
      "AI agent customers are signing one-year deals instead of multi-year contracts because AI changes too fast",
      "Switching costs in AI agents are structurally lower than traditional SaaS",
      "Prompts are portable — unlike CRM data migrations, switching AI agents can be done in days",
      "Even the best AI agent vendors have churn risk embedded in every deal",
      "This structural problem will hit every AI agent vendor in the next 12-24 months"
    ]),
    fullText: `I was in a board meeting last week for a breakout AI B2B leader at $100m+ ARR and the team was excited … but stressed.

Why?

So many of their largest customers were happy to sign relatively large checks for their AI Agent. Six figures. Some even seven. The product was working. Customers loved it. Pipeline was strong. The team had every right to be proud.

But here's what kept coming up in almost every deal: "We'll sign. For one year. To start."

Not "we'll sign a three-year deal with a ramp." Not "let's lock in pricing for the long term." Just … one year. Because AI is changing so fast, they'll see about next year.

So churn risk was essentially embedded in every single deal. Even the big ones. Especially the big ones.

I get it. As a buyer, I'd do the same thing right now.

The New B2B AI Reality: Everyone's Happy … For Now

Let me be clear about something: this startup I talked about above is crushing it. Growing fast, delivering real value, customers are genuinely delighted with the product. They may well have the best AI Agent in their space. This isn't a story about a struggling startup. This is a story about a breakout AI leader wrestling with a structural problem that's going to hit every AI agent vendor in the next 12-24 months.

The problem isn't product-market fit. The problem is that the switching costs in AI agents, at least in some cases, are structurally lower than what we've seen in SaaS before.

In traditional SaaS, switching was brutal. Migrating your CRM meant months of data migration, retraining hundreds of reps, rebuilding integrations, reconfiguring workflows. The pain of switching was so high that even mediocre vendors could maintain 90%+ gross retention for years. That switching cost was the moat. It was the foundation of every SaaS valuation model ever built.

AI agents are different. Fundamentally different.

Prompts are portable. Your system prompt, your fine-tuned instructions, your workflow logic — it can all move to a competitor in days, not months. There's no data migration. There's no retraining. There's just … a new API key.

What to do about it:
1. Build deep integrations that create real switching costs
2. Own the data layer — make your data irreplaceable
3. Focus on outcomes, not just functionality
4. Build community and network effects around your product`,
    publicationDate: new Date("2026-02-25"),
    tagNames: ["AI Agents", "B2B SaaS", "Startups", "AI"],
  },
  {
    title: "What's It Really Like to Be CEO of a Startup",
    url: "https://www.saastr.com/whats-it-really-like-to-be-ceo-of-a-startup/",
    source: "SaaStr",
    author: "Jason Lemkin",
    summary: "A candid, unvarnished look at what being a startup CEO is actually like — stripping away the glamour and mythology. From the Zero Cash Date burned in your brain to the loneliness of having 100% responsibility, to eventually joining the Founder CEO club. Essential reading for anyone in or considering the role.",
    keyInsights: JSON.stringify([
      "It isn't glamorous until you're at scale — maybe not even until pre-IPO, maybe never",
      "The Zero Cash Date will be burned in your brain — the constant awareness of runway",
      "You can never really share the full weight of responsibility — your team and family can only absorb so much",
      "You will become a leader regardless of your background — people will follow you",
      "You'll think about stepping down at some point — even the best founders do",
      "The Founder CEO club is real and lasts for life — a shared language and experience"
    ]),
    fullText: `Let me just throw out a few things I've learned that being a CEO of a start-up isn't, or isn't as you'd expect:

It isn't glamorous until you are At Scale and Hot, at the very minimum. At $10m-$20m+ in revenues, maybe. Maybe not even until pre-IPO. Maybe never, not really.

The Zero Cash Date when you run out of money will be burned in your brain. It's always there. Even when you have 18 months of runway, you know exactly what date that is. It never fully goes away.

You are never recruiting enough because you always need at least one more amazing person on the team and it just isn't getting done and this is the most important thing so somehow you have to find a way even if you aren't.

You can't really share, not really, because your team doesn't really understand what it is to have all the 100% responsibility for everything, and your spouse/S.O./whatever can only hear about 58 times how you are about to fail before they naturally start to tune out.

You will become a leader no matter what your background is. Even if you have never scaled before, never hired before. You will know so much, about everything, about how it is all done. People will gravitate to that, and follow you. Not everyone. But more and more over time. You will find a way here.

People will actually care what you think in a way you've never experienced before. Even if you are just a CEO of a 10 person company, your customers will care, even if they are 10,000x bigger than you are. Your team will care. The CEO matters to whomever the product impacts.

You will think about stepping down at some point, no matter if you never admit it. There's a reason Elon Musk didn't start off as CEO of Tesla, nor did Marc Benioff start off as CEO of Salesforce, even though they wrote the first checks. It's hard. Don't tell anyone when you have these thoughts. Except maybe your one closest advisor.

You'll be in the Founder CEO club if you have any success at all. And it's a fun club because it lasts for life as long as your startup is at least somewhat successful. You'll have your own language, own shared experiences, and be part of a special club that no one else really can be a part of. It's a pretty cool club.`,
    publicationDate: new Date("2026-02-24"),
    tagNames: ["Founder CEO", "Leadership", "Startups"],
  },
  {
    title: "Stripe's Latest Data: Startups Are Growing 50% Faster, Compute Demand Drove ~50% of GDP Growth",
    url: "https://www.saastr.com/stripes-latest-data-startups-growing-50-percent-faster/",
    source: "SaaStr",
    author: "Jason Lemkin",
    summary: "Key metrics from Stripe's 2026 annual letter that matter most for B2B and AI founders. The 2025 cohort of new startups is growing 50% faster than 2024's. Companies are reaching $10M ARR within 3 months of launch at double the rate. The competitive clock has been fundamentally reset.",
    keyInsights: JSON.stringify([
      "Stripe's 2025 cohort of new startups is growing ~50% faster than the 2024 cohort",
      "Companies reaching $10M ARR within 3 months of launch doubled year over year",
      "Stripe Atlas formations were up 41%, with 20% charging their first customer within 30 days",
      "GitHub pushes surged 41% and iOS app releases jumped 60% YoY",
      "The competitive clock has been reset — a company founded 6 months ago might already be at your ARR"
    ]),
    fullText: `Stripe just released its 2026 annual letter, and as always, it's packed with data. But a lot of the letter covers stablecoins, agentic commerce protocols, and macro-economic commentary. All interesting — but let me pull out the 5 metrics that matter most if you're building a B2B or B2B + AI company right now.

1. Stripe's 2025 Cohort of New Startups Is Growing ~50% Faster Than 2024's

This is the single most important data point in the entire letter.

Every year, Stripe onboards a massive wave of new businesses. They can see exactly how those cohorts perform relative to prior years. And the 2025 cohort is growing roughly 50% faster than the 2024 cohort. Not 10%. Not 20%. Fifty percent faster.

Even more striking: the number of companies reaching $10M ARR within 3 months of launch doubled year over year.

What's driving it? AI-native tools have compressed the time from idea to revenue. Stripe Atlas formations were up 41%, and 20% of Atlas startups charged their first customer within 30 days — up from just 8% in 2020. GitHub pushes surged 41%. iOS app releases jumped 60% YoY.

Why this matters to you: The competitive clock has been reset. If you raised your Series A in 2024 and you're growing 100% YoY, you might feel good — but the company founded 6 months ago might already be at your ARR. The new normal for "fast" is dramatically faster than it was even 12 months ago. Plan accordingly.

2. Compute Demand Drove ~50% of GDP Growth

This is a staggering number. AI infrastructure spending is now a meaningful driver of macroeconomic growth. What this means practically: the companies building the picks and shovels of AI (compute, storage, networking) are in an extraordinary position. But it also means the AI application layer is still in its early innings — the infrastructure is being built out at a pace that suggests the application layer will follow.

3. 60% More Apps YoY

The number of new apps being built on Stripe's infrastructure jumped 60% year over year. This is the clearest signal that the AI-native startup wave is real and accelerating. More apps means more competition in every vertical. Your moat needs to be deeper than "we use AI."`,
    publicationDate: new Date("2026-02-25"),
    tagNames: ["AI", "Startups", "Growth", "B2B SaaS"],
  },
  {
    title: "The Agent Orchestration Problem: How We Wire 20+ AI Agents Together Without Losing Our Minds",
    url: "https://www.saastr.com/agent-orchestration-problem/",
    source: "SaaStr",
    author: "Jason Lemkin",
    summary: "A practical, behind-the-scenes look at how SaaStr runs its business with 3 humans, 1 dog, and 20+ AI agents. The hardest part isn't picking the agents — it's wiring them together. Real lessons on agent orchestration, data sharing, and avoiding conflicts when multiple AI systems need to collaborate.",
    keyInsights: JSON.stringify([
      "SaaStr runs with 3 humans and 20+ AI agents — the orchestration challenge is real",
      "The hardest part of multi-agent systems isn't picking agents, it's wiring them together",
      "Agents need shared data layers and clear handoff protocols to avoid stepping on each other",
      "Most AI agent content only covers single-agent deployments — multi-agent is a different problem",
      "Practical orchestration requires thinking about data flow, conflict resolution, and fallback logic"
    ]),
    fullText: `Most of the AI agent content out there follows the same script: we deployed an AI SDR, here are the results, wasn't that amazing.

Nobody talks about what happens when you have multiple agents. When you have an AI SDR in Artisan, another one in Salesforce AgentForce, an inbound meetings booker in Qualified, a content review agent you vibe coded, and a dozen more — and they all need to talk to each other, share data, and not step on each other's toes.

That's where we are at SaaStr AI right now. Three humans, one dog, 20+ agents. And the hardest part isn't picking the agents. It's wiring them together.

Here's what we've learned:

1. You need a single source of truth for customer data
All your agents need to read from and write to the same CRM. If your AI SDR updates a contact record and your AI account manager doesn't see it, you'll have agents contradicting each other in customer communications. We use Salesforce as the central nervous system.

2. Define clear handoff protocols
When does the AI SDR hand off to the human AE? When does the AI support agent escalate to a human? These handoffs need to be explicit, documented, and tested. Ambiguous handoffs create gaps where customers fall through.

3. Build conflict resolution logic
What happens when two agents want to take different actions on the same customer? You need a priority hierarchy. In our case: human decisions > account executive decisions > AI decisions. Simple, but it took us three months to figure out we needed it.

4. Monitor for agent conflicts in real-time
We built a simple dashboard that flags when two agents have taken conflicting actions on the same account within 24 hours. It catches about 5-10 conflicts per week that we need to manually resolve.

5. Start with fewer agents than you think you need
We started with 5 agents and added more as we understood the orchestration complexity. If we'd started with 20, we'd have been overwhelmed.`,
    publicationDate: new Date("2026-02-26"),
    tagNames: ["AI Agents", "AI", "B2B SaaS", "Growth"],
  },
];

// ── Seed ──────────────────────────────────────────────────────────────────────

console.log("🌱 Seeding database...");

// Create tags
const tagMap = new Map();
for (const tagDef of TAG_DEFS) {
  const existing = await db.select().from(tags).where(eq(tags.name, tagDef.name)).limit(1);
  if (existing[0]) {
    tagMap.set(tagDef.name, existing[0].id);
    console.log(`  ✓ Tag exists: ${tagDef.name}`);
  } else {
    await db.insert(tags).values(tagDef);
    const created = await db.select().from(tags).where(eq(tags.name, tagDef.name)).limit(1);
    tagMap.set(tagDef.name, created[0].id);
    console.log(`  + Created tag: ${tagDef.name}`);
  }
}

// Create articles
for (const art of ARTICLES) {
  const { tagNames, ...articleData } = art;

  // Check if already exists
  const existing = await db.select().from(articles).where(eq(articles.title, art.title)).limit(1);
  if (existing[0]) {
    console.log(`  ✓ Article exists: ${art.title.slice(0, 60)}...`);
    continue;
  }

  const wordCount = (articleData.fullText ?? "").split(/\s+/).length;
  await db.insert(articles).values({ ...articleData, wordCount });

  // Get the inserted article
  const inserted = await db.select().from(articles).where(eq(articles.title, art.title)).limit(1);
  const articleId = inserted[0].id;

  // Link tags
  for (const tagName of tagNames) {
    const tagId = tagMap.get(tagName);
    if (tagId) {
      await db.insert(articleTags).values({ articleId, tagId });
    }
  }

  console.log(`  + Inserted: ${art.title.slice(0, 60)}...`);
}

console.log("✅ Seed complete!");
await conn.end();
