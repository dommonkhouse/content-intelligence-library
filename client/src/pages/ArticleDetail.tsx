import { useState } from "react";
import { useLocation, useParams } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  ArrowLeft,
  ExternalLink,
  Star,
  StarOff,
  Trash2,
  Lightbulb,
  Clock,
  Calendar,
  BookOpen,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import type { Tag } from "../../../drizzle/schema";

function TagPill({ tag }: { tag: Tag }) {
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
      style={{ backgroundColor: tag.colour + "33", color: tag.colour, border: `1px solid ${tag.colour}55` }}
    >
      {tag.name}
    </span>
  );
}

export default function ArticleDetail() {
  const params = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const [showFullText, setShowFullText] = useState(false);
  const id = parseInt(params.id ?? "0");

  const { data: article, isLoading, refetch } = trpc.articles.get.useQuery({ id }, { enabled: !!id });
  const utils = trpc.useUtils();

  const toggleFav = trpc.articles.toggleFavourite.useMutation({
    onSuccess: () => { refetch(); utils.articles.list.invalidate(); },
    onError: (e) => toast.error(e.message),
  });

  const deleteArticle = trpc.articles.delete.useMutation({
    onSuccess: () => { toast.success("Article deleted"); setLocation("/"); utils.articles.list.invalidate(); },
    onError: (e) => toast.error(e.message),
  });

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto space-y-4 animate-pulse">
        <div className="h-6 bg-card rounded w-1/4" />
        <div className="h-10 bg-card rounded w-3/4" />
        <div className="h-4 bg-card rounded w-1/2" />
        <div className="h-64 bg-card rounded" />
      </div>
    );
  }

  if (!article) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <BookOpen className="h-12 w-12 text-muted-foreground/30" />
        <p className="text-muted-foreground">Article not found</p>
        <Button variant="outline" onClick={() => setLocation("/")} className="border-border text-foreground">
          Back to Library
        </Button>
      </div>
    );
  }

  const insights: string[] = (() => {
    try { return JSON.parse(article.keyInsights ?? "[]"); } catch { return []; }
  })();

  const wordCount = article.wordCount ?? 0;
  const readMins = Math.max(1, Math.round(wordCount / 200));

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Back + Actions */}
      <div className="flex items-center justify-between gap-4">
        <button
          onClick={() => setLocation("/")}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Library
        </button>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => toggleFav.mutate({ id: article.id })}
            className="gap-2 border-border text-foreground hover:bg-secondary"
          >
            {article.isFavourite
              ? <><Star className="h-3.5 w-3.5 text-amber-400 fill-amber-400" /> Favourited</>
              : <><StarOff className="h-3.5 w-3.5" /> Favourite</>}
          </Button>
          <Button
            size="sm"
            onClick={() => setLocation(`/ideas?articleId=${article.id}`)}
            className="gap-2"
          >
            <Lightbulb className="h-3.5 w-3.5" />
            Generate Ideas
          </Button>
          <button
            onClick={() => deleteArticle.mutate({ id: article.id })}
            className="p-2 rounded-lg hover:bg-destructive/20 transition-colors border border-border"
            title="Delete article"
          >
            <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
          </button>
        </div>
      </div>

      {/* Article Header */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
          {article.source && (
            <span className="font-medium text-primary/80">{article.source}</span>
          )}
          {article.author && <span>· {article.author}</span>}
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {readMins} min read
          </span>
          {article.publicationDate && (
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {new Date(article.publicationDate).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
            </span>
          )}
          {article.url && (
            <a
              href={article.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 hover:text-primary transition-colors"
            >
              <ExternalLink className="h-3 w-3" />
              Original article
            </a>
          )}
        </div>

        <h1 className="text-2xl font-bold text-foreground leading-tight">
          {article.title}
        </h1>

        {article.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {article.tags.map((tag) => <TagPill key={tag.id} tag={tag} />)}
          </div>
        )}
      </div>

      {/* Summary */}
      {article.summary && (
        <div className="bg-card border border-border rounded-lg p-4">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Summary</p>
          <p className="text-sm text-foreground/90 leading-relaxed">{article.summary}</p>
        </div>
      )}

      {/* Key Insights */}
      {insights.length > 0 && (
        <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
          <p className="text-xs font-semibold text-primary uppercase tracking-wider mb-3">Key Insights</p>
          <ul className="space-y-2">
            {insights.map((insight, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-foreground/90">
                <span className="text-primary font-bold mt-0.5 shrink-0">{i + 1}.</span>
                <span>{insight}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Full Text */}
      {article.fullText && (
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b border-border">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Full Article</p>
            <button
              onClick={() => setShowFullText(!showFullText)}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              {showFullText ? (
                <><ChevronUp className="h-3.5 w-3.5" /> Collapse</>
              ) : (
                <><ChevronDown className="h-3.5 w-3.5" /> Expand</>
              )}
            </button>
          </div>
          {showFullText && (
            <div className="p-4 max-h-[60vh] overflow-y-auto">
              <div className="article-prose whitespace-pre-wrap text-sm">
                {article.fullText}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Generate Ideas CTA */}
      <div className="bg-gradient-to-r from-primary/10 to-accent/10 border border-primary/20 rounded-lg p-5 flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-foreground">Ready to repurpose this article?</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Generate a video script, LinkedIn post, Instagram caption, or blog outline with AI.
          </p>
        </div>
        <Button
          onClick={() => setLocation(`/ideas?articleId=${article.id}`)}
          className="gap-2 shrink-0"
        >
          <Lightbulb className="h-4 w-4" />
          Generate Ideas
        </Button>
      </div>
    </div>
  );
}
