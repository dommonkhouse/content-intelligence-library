import { useState, useCallback } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  Search,
  Plus,
  Star,
  StarOff,
  Trash2,
  ExternalLink,
  Lightbulb,
  Upload,
  Link2,
  FileText,
  Clock,
  BookOpen,
  Filter,
  X,
} from "lucide-react";
import type { Article, Tag } from "../../../drizzle/schema";

type ArticleWithTags = Article & { tags: Tag[] };

const FORMAT_LABELS: Record<string, string> = {
  video_script: "Video",
  linkedin_post: "LinkedIn",
  instagram_caption: "Instagram",
  blog_post: "Blog",
};

const TAG_COLOURS = [
  "#6366f1", "#8b5cf6", "#ec4899", "#f59e0b",
  "#10b981", "#3b82f6", "#ef4444", "#14b8a6",
];

function TagPill({ tag, onRemove }: { tag: Tag; onRemove?: () => void }) {
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
      style={{ backgroundColor: tag.colour + "33", color: tag.colour, border: `1px solid ${tag.colour}55` }}
    >
      {tag.name}
      {onRemove && (
        <button onClick={onRemove} className="hover:opacity-70 ml-0.5">
          <X className="h-2.5 w-2.5" />
        </button>
      )}
    </span>
  );
}

function ArticleCard({ article, onDelete, onToggleFav }: {
  article: ArticleWithTags;
  onDelete: (id: number) => void;
  onToggleFav: (id: number) => void;
}) {
  const [, setLocation] = useLocation();
  const insights: string[] = (() => {
    try { return JSON.parse(article.keyInsights ?? "[]"); } catch { return []; }
  })();

  const wordCount = article.wordCount ?? 0;
  const readMins = Math.max(1, Math.round(wordCount / 200));

  return (
    <Card className="group bg-card border-border hover:border-primary/40 transition-all duration-200 cursor-pointer flex flex-col">
      <CardHeader className="pb-3 pt-4 px-4" onClick={() => setLocation(`/article/${article.id}`)}>
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="text-xs text-muted-foreground mb-1.5 flex items-center gap-1.5">
              <span className="font-medium text-primary/80">{article.source ?? "Unknown source"}</span>
              {article.author && <span>· {article.author}</span>}
            </p>
            <h3 className="font-semibold text-sm leading-snug text-foreground line-clamp-2 group-hover:text-primary transition-colors">
              {article.title}
            </h3>
          </div>
          <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={(e) => { e.stopPropagation(); onToggleFav(article.id); }}
              className="p-1 rounded hover:bg-secondary transition-colors"
              title={article.isFavourite ? "Remove from favourites" : "Add to favourites"}
            >
              {article.isFavourite
                ? <Star className="h-3.5 w-3.5 text-amber-400 fill-amber-400" />
                : <StarOff className="h-3.5 w-3.5 text-muted-foreground" />}
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(article.id); }}
              className="p-1 rounded hover:bg-destructive/20 transition-colors"
              title="Delete article"
            >
              <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
            </button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="px-4 pb-4 flex flex-col gap-3 flex-1" onClick={() => setLocation(`/article/${article.id}`)}>
        {article.summary && (
          <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">
            {article.summary}
          </p>
        )}

        {insights.length > 0 && (
          <div className="space-y-1">
            {insights.slice(0, 2).map((insight, i) => (
              <div key={i} className="flex items-start gap-1.5 text-xs text-muted-foreground">
                <span className="text-primary mt-0.5 shrink-0">›</span>
                <span className="line-clamp-1">{insight}</span>
              </div>
            ))}
          </div>
        )}

        <div className="flex flex-wrap gap-1 mt-auto">
          {article.tags.map((tag) => (
            <TagPill key={tag.id} tag={tag} />
          ))}
        </div>

        <div className="flex items-center justify-between pt-1 border-t border-border/50">
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {readMins} min read
            </span>
            {article.url && (
              <a
                href={article.url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="flex items-center gap-1 hover:text-primary transition-colors"
              >
                <ExternalLink className="h-3 w-3" />
                Source
              </a>
            )}
          </div>
          <span className="text-xs text-muted-foreground">
            {new Date(article.importedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

function ImportModal({ tags, onSuccess }: { tags: Tag[]; onSuccess: () => void }) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"url" | "text">("url");
  const [url, setUrl] = useState("");
  const [text, setText] = useState("");
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>([]);

  const importUrl = trpc.articles.importFromUrl.useMutation({
    onSuccess: () => { toast.success("Article imported successfully"); setOpen(false); setUrl(""); onSuccess(); },
    onError: (e) => toast.error(`Import failed: ${e.message}`),
  });

  const importText = trpc.articles.importFromText.useMutation({
    onSuccess: (data) => { toast.success(`Imported ${data.count} article${data.count !== 1 ? "s" : ""}`); setOpen(false); setText(""); onSuccess(); },
    onError: (e) => toast.error(`Import failed: ${e.message}`),
  });

  const isLoading = importUrl.isPending || importText.isPending;

  const toggleTag = (id: number) =>
    setSelectedTagIds((prev) => prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-2">
          <Plus className="h-4 w-4" />
          Import
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-foreground">Import Content</DialogTitle>
        </DialogHeader>

        <div className="flex gap-2 mb-4">
          <Button
            size="sm"
            variant={mode === "url" ? "default" : "outline"}
            onClick={() => setMode("url")}
            className="gap-2"
          >
            <Link2 className="h-3.5 w-3.5" /> From URL
          </Button>
          <Button
            size="sm"
            variant={mode === "text" ? "default" : "outline"}
            onClick={() => setMode("text")}
            className="gap-2"
          >
            <FileText className="h-3.5 w-3.5" /> Paste Email / Text
          </Button>
        </div>

        {mode === "url" ? (
          <div className="space-y-3">
            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">Article URL</Label>
              <Input
                placeholder="https://example.com/article"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="bg-input border-border text-foreground"
              />
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">
                Paste newsletter email or article text
              </Label>
              <Textarea
                placeholder="Paste the full email or article text here. The AI will extract all articles automatically..."
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={8}
                className="bg-input border-border text-foreground text-xs resize-none"
              />
            </div>
          </div>
        )}

        {tags.length > 0 && (
          <div>
            <Label className="text-xs text-muted-foreground mb-2 block">Apply tags</Label>
            <div className="flex flex-wrap gap-1.5">
              {tags.map((tag) => (
                <button
                  key={tag.id}
                  onClick={() => toggleTag(tag.id)}
                  className={`px-2 py-0.5 rounded-full text-xs font-medium transition-all border ${
                    selectedTagIds.includes(tag.id) ? "opacity-100" : "opacity-40 hover:opacity-70"
                  }`}
                  style={{ backgroundColor: tag.colour + "33", color: tag.colour, borderColor: tag.colour + "55" }}
                >
                  {tag.name}
                </button>
              ))}
            </div>
          </div>
        )}

        <Button
          onClick={() => {
            if (mode === "url") {
              if (!url.trim()) return toast.error("Please enter a URL");
              importUrl.mutate({ url: url.trim(), tagIds: selectedTagIds });
            } else {
              if (!text.trim()) return toast.error("Please paste some text");
              importText.mutate({ rawText: text.trim(), defaultTagIds: selectedTagIds });
            }
          }}
          disabled={isLoading}
          className="w-full gap-2"
        >
          {isLoading ? (
            <><Upload className="h-4 w-4 animate-pulse" /> Extracting with AI...</>
          ) : (
            <><Upload className="h-4 w-4" /> Import</>
          )}
        </Button>
      </DialogContent>
    </Dialog>
  );
}

function ManageTagsModal({ tags, onSuccess }: { tags: Tag[]; onSuccess: () => void }) {
  const [open, setOpen] = useState(false);
  const [newTagName, setNewTagName] = useState("");
  const [selectedColour, setSelectedColour] = useState(TAG_COLOURS[0]);
  const utils = trpc.useUtils();

  const createTag = trpc.tags.upsert.useMutation({
    onSuccess: () => { utils.tags.list.invalidate(); setNewTagName(""); onSuccess(); },
    onError: (e) => toast.error(e.message),
  });

  const deleteTag = trpc.tags.delete.useMutation({
    onSuccess: () => { utils.tags.list.invalidate(); onSuccess(); },
    onError: (e) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="gap-2 border-border text-foreground hover:bg-secondary">
          <Filter className="h-3.5 w-3.5" /> Tags
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-foreground">Manage Tags</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="New tag name..."
              value={newTagName}
              onChange={(e) => setNewTagName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && newTagName.trim()) {
                  createTag.mutate({ name: newTagName.trim(), colour: selectedColour });
                }
              }}
              className="bg-input border-border text-foreground flex-1"
            />
            <Button
              size="sm"
              onClick={() => {
                if (newTagName.trim()) createTag.mutate({ name: newTagName.trim(), colour: selectedColour });
              }}
              disabled={createTag.isPending}
            >
              Add
            </Button>
          </div>
          <div className="flex gap-1.5 flex-wrap">
            {TAG_COLOURS.map((c) => (
              <button
                key={c}
                onClick={() => setSelectedColour(c)}
                className={`w-5 h-5 rounded-full border-2 transition-all ${selectedColour === c ? "border-white scale-110" : "border-transparent"}`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
          <div className="space-y-1.5 max-h-48 overflow-y-auto">
            {tags.map((tag) => (
              <div key={tag.id} className="flex items-center justify-between p-2 rounded-lg bg-secondary/50">
                <TagPill tag={tag} />
                <button
                  onClick={() => deleteTag.mutate({ id: tag.id })}
                  className="p-1 rounded hover:bg-destructive/20 transition-colors"
                >
                  <Trash2 className="h-3 w-3 text-muted-foreground hover:text-destructive" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function Library() {
  const [, setLocation] = useLocation();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>([]);
  const [favouritesOnly, setFavouritesOnly] = useState(false);
  const [offset, setOffset] = useState(0);
  const LIMIT = 24;

  const debounceSearch = useCallback((value: string) => {
    setSearch(value);
    const timer = setTimeout(() => setDebouncedSearch(value), 400);
    return () => clearTimeout(timer);
  }, []);

  const { data: tagsData, refetch: refetchTags } = trpc.tags.list.useQuery();
  const tags = tagsData ?? [];

  const { data, isLoading, refetch } = trpc.articles.list.useQuery({
    search: debouncedSearch || undefined,
    tagIds: selectedTagIds.length ? selectedTagIds : undefined,
    favouritesOnly: favouritesOnly || undefined,
    limit: LIMIT,
    offset,
  });

  const utils = trpc.useUtils();

  const deleteArticle = trpc.articles.delete.useMutation({
    onSuccess: () => { utils.articles.list.invalidate(); toast.success("Article deleted"); },
    onError: (e) => toast.error(e.message),
  });

  const toggleFav = trpc.articles.toggleFavourite.useMutation({
    onSuccess: () => utils.articles.list.invalidate(),
    onError: (e) => toast.error(e.message),
  });

  const articles = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / LIMIT);
  const currentPage = Math.floor(offset / LIMIT) + 1;

  const toggleTag = (id: number) => {
    setSelectedTagIds((prev) => prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]);
    setOffset(0);
  };

  return (
    <div className="flex flex-col h-full min-h-0 gap-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Content Library</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {total} article{total !== 1 ? "s" : ""} · search, filter, and repurpose
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setLocation("/ideas")}
            className="gap-2 border-border text-foreground hover:bg-secondary"
          >
            <Lightbulb className="h-3.5 w-3.5 text-amber-400" />
            Idea Generator
          </Button>
          <ManageTagsModal tags={tags} onSuccess={() => { refetchTags(); refetch(); }} />
          <ImportModal tags={tags} onSuccess={() => { refetch(); refetchTags(); }} />
        </div>
      </div>

      {/* Search + Filters */}
      <div className="flex flex-col gap-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search articles, summaries, content..."
            value={search}
            onChange={(e) => debounceSearch(e.target.value)}
            className="pl-9 bg-input border-border text-foreground placeholder:text-muted-foreground"
          />
          {search && (
            <button
              onClick={() => { setSearch(""); setDebouncedSearch(""); }}
              className="absolute right-3 top-1/2 -translate-y-1/2"
            >
              <X className="h-4 w-4 text-muted-foreground hover:text-foreground" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => { setFavouritesOnly(!favouritesOnly); setOffset(0); }}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-all ${
              favouritesOnly
                ? "bg-amber-400/20 text-amber-400 border-amber-400/40"
                : "bg-transparent text-muted-foreground border-border hover:border-muted-foreground"
            }`}
          >
            <Star className="h-3 w-3" />
            Favourites
          </button>
          {tags.map((tag) => (
            <button
              key={tag.id}
              onClick={() => toggleTag(tag.id)}
              className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-all ${
                selectedTagIds.includes(tag.id) ? "opacity-100" : "opacity-50 hover:opacity-80"
              }`}
              style={{
                backgroundColor: selectedTagIds.includes(tag.id) ? tag.colour + "33" : "transparent",
                color: tag.colour,
                borderColor: tag.colour + "55",
              }}
            >
              {tag.name}
            </button>
          ))}
          {(selectedTagIds.length > 0 || favouritesOnly || debouncedSearch) && (
            <button
              onClick={() => { setSelectedTagIds([]); setFavouritesOnly(false); setSearch(""); setDebouncedSearch(""); setOffset(0); }}
              className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 underline underline-offset-2"
            >
              <X className="h-3 w-3" /> Clear filters
            </button>
          )}
        </div>
      </div>

      {/* Content Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-56 rounded-lg bg-card animate-pulse border border-border" />
          ))}
        </div>
      ) : articles.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
          <BookOpen className="h-12 w-12 text-muted-foreground/30" />
          <div>
            <p className="text-sm font-medium text-muted-foreground">No articles found</p>
            <p className="text-xs text-muted-foreground/60 mt-1">
              {debouncedSearch || selectedTagIds.length
                ? "Try adjusting your search or filters"
                : "Import your first article to get started"}
            </p>
          </div>
          {!debouncedSearch && !selectedTagIds.length && (
            <ImportModal tags={tags} onSuccess={() => { refetch(); refetchTags(); }} />
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {articles.map((article) => (
            <ArticleCard
              key={article.id}
              article={article as ArticleWithTags}
              onDelete={(id) => deleteArticle.mutate({ id })}
              onToggleFav={(id) => toggleFav.mutate({ id })}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-2">
          <Button
            size="sm"
            variant="outline"
            disabled={currentPage === 1}
            onClick={() => setOffset(Math.max(0, offset - LIMIT))}
            className="border-border text-foreground"
          >
            Previous
          </Button>
          <span className="text-xs text-muted-foreground">
            Page {currentPage} of {totalPages}
          </span>
          <Button
            size="sm"
            variant="outline"
            disabled={currentPage === totalPages}
            onClick={() => setOffset(offset + LIMIT)}
            className="border-border text-foreground"
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
