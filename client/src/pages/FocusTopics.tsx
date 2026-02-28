import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
import { Star, ExternalLink, Target, TrendingUp, Users, Lightbulb, RefreshCw } from "lucide-react";
import { useLocation } from "wouter";

const TOPIC_ICONS = [Users, Lightbulb, TrendingUp];

const DAY_LABELS = ["Day 1", "Day 2", "Day 3"];

function ArticleCard({
  article,
  topicColor,
}: {
  article: {
    id: number;
    title: string;
    source?: string | null;
    author?: string | null;
    summary?: string | null;
    importedAt: string | Date;
    isFavourite: boolean;
    relevanceScore: number;
    aiReason?: string | null;
  };
  topicColor: string;
}) {
  const [, navigate] = useLocation();

  return (
    <div
      className="group flex flex-col gap-2 rounded-lg border border-border bg-card p-4 hover:border-primary/40 hover:shadow-sm transition-all cursor-pointer"
      onClick={() => navigate(`/article/${article.id}`)}
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-sm font-medium leading-snug text-card-foreground group-hover:text-primary transition-colors line-clamp-2 flex-1">
          {article.title}
        </h3>
        <div className="flex items-center gap-1 shrink-0">
          {article.isFavourite && (
            <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
          )}
          <div
            className="flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold text-white"
            style={{ backgroundColor: topicColor }}
          >
            {article.relevanceScore}
          </div>
        </div>
      </div>

      {article.aiReason && (
        <p className="text-xs text-muted-foreground italic line-clamp-1">
          {article.aiReason}
        </p>
      )}

      <div className="flex items-center gap-2 mt-1">
        {article.source && (
          <Badge variant="secondary" className="text-xs px-1.5 py-0">
            {article.source}
          </Badge>
        )}
        {article.author && (
          <span className="text-xs text-muted-foreground truncate">
            {article.author}
          </span>
        )}
        <span className="text-xs text-muted-foreground ml-auto">
          {new Date(article.importedAt).toLocaleDateString("en-GB", {
            day: "numeric",
            month: "short",
            year: "numeric",
          })}
        </span>
      </div>
    </div>
  );
}

function TopicPanel({
  topic,
}: {
  topic: {
    id: number;
    dayNumber: number;
    name: string;
    description?: string | null;
    color?: string | null;
    articleCount: number;
  };
}) {
  const [minScore, setMinScore] = useState(50);
  const color = topic.color || "#6366f1";
  const Icon = TOPIC_ICONS[(topic.dayNumber - 1) % TOPIC_ICONS.length];

  const { data: articles, isLoading } = trpc.focusTopics.getArticles.useQuery({
    topicId: topic.id,
    minScore,
    limit: 200,
  });

  return (
    <div className="space-y-4">
      {/* Topic header */}
      <div
        className="rounded-xl p-5 text-white"
        style={{ background: `linear-gradient(135deg, ${color}dd, ${color}99)` }}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-white/20 p-2">
              <Icon className="h-5 w-5" />
            </div>
            <div>
              <div className="text-xs font-medium opacity-80 uppercase tracking-wider mb-0.5">
                {DAY_LABELS[topic.dayNumber - 1]}
              </div>
              <h2 className="text-lg font-bold leading-tight">{topic.name}</h2>
            </div>
          </div>
          <div className="text-right shrink-0">
            <div className="text-2xl font-bold">{articles?.length ?? topic.articleCount}</div>
            <div className="text-xs opacity-80">articles</div>
          </div>
        </div>
        {topic.description && (
          <p className="mt-3 text-sm opacity-85 leading-relaxed">{topic.description}</p>
        )}
      </div>

      {/* Relevance filter */}
      <div className="flex items-center gap-4 px-1">
        <span className="text-xs text-muted-foreground whitespace-nowrap">Min relevance:</span>
        <Slider
          value={[minScore]}
          onValueChange={([v]) => setMinScore(v)}
          min={0}
          max={90}
          step={10}
          className="flex-1"
        />
        <span
          className="text-xs font-semibold rounded-full px-2 py-0.5 text-white min-w-[36px] text-center"
          style={{ backgroundColor: color }}
        >
          {minScore}+
        </span>
      </div>

      {/* Article list */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-lg" />
          ))}
        </div>
      ) : articles && articles.length > 0 ? (
        <div className="space-y-2">
          {articles.map((article) => (
            <ArticleCard
              key={article.id}
              article={{
                ...article,
                importedAt: article.importedAt as string | Date,
              }}
              topicColor={color}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Target className="h-10 w-10 text-muted-foreground/40 mb-3" />
          <p className="text-sm text-muted-foreground">
            No articles with relevance {minScore}+ for this topic yet.
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Try lowering the minimum relevance score.
          </p>
        </div>
      )}
    </div>
  );
}

export default function FocusTopics() {
  const { data: topics, isLoading: topicsLoading } = trpc.focusTopics.list.useQuery();
  const { data: stats, isLoading: statsLoading } = trpc.focusTopics.getTaggingStats.useQuery(
    undefined,
    { refetchInterval: 15000 }
  );

  const activeTopics = topics ?? [];

  return (
    <div className="flex flex-col gap-6 p-6 max-w-5xl mx-auto">
      {/* Page header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Target className="h-6 w-6 text-primary" />
            Focus Topics
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Your 3-cluster LinkedIn rotation - Day 1 / Day 2 / Day 3
          </p>
        </div>

        {/* Tagging progress */}
        {!statsLoading && stats && (
          <Card className="shrink-0 min-w-[200px]">
            <CardContent className="pt-4 pb-3 px-4">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs text-muted-foreground">AI tagging progress</span>
                {stats.percent < 100 && (
                  <RefreshCw className="h-3 w-3 text-muted-foreground animate-spin" />
                )}
              </div>
              <Progress value={stats.percent} className="h-1.5 mb-1.5" />
              <div className="text-xs text-muted-foreground">
                {stats.tagged} / {stats.total} articles tagged ({stats.percent}%)
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Topic summary cards */}
      {topicsLoading ? (
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {activeTopics.map((topic) => {
            const color = topic.color || "#6366f1";
            const Icon = TOPIC_ICONS[(topic.dayNumber - 1) % TOPIC_ICONS.length];
            return (
              <div
                key={topic.id}
                className="rounded-xl p-4 text-white flex items-center gap-3"
                style={{ background: `linear-gradient(135deg, ${color}cc, ${color}88)` }}
              >
                <div className="rounded-lg bg-white/20 p-2 shrink-0">
                  <Icon className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-medium opacity-80 uppercase tracking-wider">
                    {DAY_LABELS[topic.dayNumber - 1]}
                  </div>
                  <div className="text-sm font-bold leading-tight truncate">{topic.name}</div>
                  <div className="text-xs opacity-75 mt-0.5">{topic.articleCount} articles</div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Tabbed article lists */}
      {topicsLoading ? (
        <Skeleton className="h-96 rounded-xl" />
      ) : activeTopics.length > 0 ? (
        <Tabs defaultValue={String(activeTopics[0]?.id)}>
          <TabsList className="mb-4">
            {activeTopics.map((topic) => (
              <TabsTrigger key={topic.id} value={String(topic.id)} className="gap-1.5">
                <span
                  className="h-2 w-2 rounded-full shrink-0"
                  style={{ backgroundColor: topic.color || "#6366f1" }}
                />
                {DAY_LABELS[topic.dayNumber - 1]}
              </TabsTrigger>
            ))}
          </TabsList>

          {activeTopics.map((topic) => (
            <TabsContent key={topic.id} value={String(topic.id)}>
              <TopicPanel topic={topic} />
            </TabsContent>
          ))}
        </Tabs>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Target className="h-12 w-12 text-muted-foreground/40 mb-4" />
            <CardTitle className="text-lg mb-2">No focus topics yet</CardTitle>
            <p className="text-sm text-muted-foreground">
              Focus topics are being set up. Check back shortly.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
