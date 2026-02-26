import { useState, useEffect } from "react";
import { useSearch } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  Lightbulb,
  Video,
  Linkedin,
  Instagram,
  FileText,
  Copy,
  Trash2,
  Sparkles,
  ChevronDown,
  BookOpen,
  Check,
} from "lucide-react";
import { Streamdown } from "streamdown";
import type { Tag } from "../../../drizzle/schema";

type Format = "video_script" | "linkedin_post" | "instagram_caption" | "blog_outline";

const FORMATS: { id: Format; label: string; icon: React.ElementType; description: string; colour: string }[] = [
  {
    id: "video_script",
    label: "Video Script",
    icon: Video,
    description: "YouTube script with hook, insights & CTA",
    colour: "#f97316",
  },
  {
    id: "linkedin_post",
    label: "LinkedIn Post",
    icon: Linkedin,
    description: "High-performing post for founder audience",
    colour: "#0ea5e9",
  },
  {
    id: "instagram_caption",
    label: "Instagram Caption",
    icon: Instagram,
    description: "Punchy caption with hashtags",
    colour: "#ec4899",
  },
  {
    id: "blog_outline",
    label: "Blog Outline",
    icon: FileText,
    description: "SEO-optimised outline with H2s & CTAs",
    colour: "#10b981",
  },
];

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

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success("Copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      onClick={handleCopy}
      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-secondary hover:bg-secondary/80 text-xs text-foreground transition-colors"
    >
      {copied ? <Check className="h-3.5 w-3.5 text-green-400" /> : <Copy className="h-3.5 w-3.5" />}
      {copied ? "Copied!" : "Copy"}
    </button>
  );
}

export default function IdeaGenerator() {
  const searchStr = useSearch();
  const params = new URLSearchParams(searchStr);
  const preselectedId = params.get("articleId") ? parseInt(params.get("articleId")!) : null;

  const [selectedArticleId, setSelectedArticleId] = useState<number | null>(preselectedId);
  const [selectedFormat, setSelectedFormat] = useState<Format>("linkedin_post");
  const [customAngle, setCustomAngle] = useState("");
  const [articleSearch, setArticleSearch] = useState("");
  const [showArticlePicker, setShowArticlePicker] = useState(!preselectedId);

  const { data: articlesData } = trpc.articles.list.useQuery({
    search: articleSearch || undefined,
    limit: 50,
    offset: 0,
  });

  const { data: selectedArticle } = trpc.articles.get.useQuery(
    { id: selectedArticleId! },
    { enabled: !!selectedArticleId }
  );

  const { data: drafts, refetch: refetchDrafts } = trpc.drafts.listByArticle.useQuery(
    { articleId: selectedArticleId! },
    { enabled: !!selectedArticleId }
  );

  const generate = trpc.drafts.generate.useMutation({
    onSuccess: () => { toast.success("Content generated!"); refetchDrafts(); },
    onError: (e) => toast.error(`Generation failed: ${e.message}`),
  });

  const deleteDraft = trpc.drafts.delete.useMutation({
    onSuccess: () => { refetchDrafts(); toast.success("Draft deleted"); },
    onError: (e) => toast.error(e.message),
  });

  useEffect(() => {
    if (preselectedId) setSelectedArticleId(preselectedId);
  }, [preselectedId]);

  const articles = articlesData?.items ?? [];
  const formatDrafts = drafts?.filter((d) => d.format === selectedFormat) ?? [];
  const allDrafts = drafts ?? [];

  const FORMAT_ICON_MAP: Record<Format, React.ElementType> = {
    video_script: Video,
    linkedin_post: Linkedin,
    instagram_caption: Instagram,
    blog_outline: FileText,
  };

  const FORMAT_COLOUR_MAP: Record<Format, string> = {
    video_script: "#f97316",
    linkedin_post: "#0ea5e9",
    instagram_caption: "#ec4899",
    blog_outline: "#10b981",
  };

  return (
    <div className="flex flex-col gap-6 max-w-5xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold text-foreground flex items-center gap-2">
          <Lightbulb className="h-5 w-5 text-amber-400" />
          Idea Generator
        </h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          Select an article, choose a format, and let AI generate content ideas in Dom's voice.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Left: Controls */}
        <div className="lg:col-span-2 space-y-5">
          {/* Article Selector */}
          <div className="bg-card border border-border rounded-lg p-4 space-y-3">
            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              1. Select Article
            </Label>

            {selectedArticle && !showArticlePicker ? (
              <div className="space-y-2">
                <div className="bg-secondary/50 rounded-lg p-3">
                  <p className="text-xs text-muted-foreground mb-1">{selectedArticle.source}</p>
                  <p className="text-sm font-medium text-foreground leading-snug line-clamp-2">
                    {selectedArticle.title}
                  </p>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {selectedArticle.tags.map((tag) => <TagPill key={tag.id} tag={tag} />)}
                  </div>
                </div>
                <button
                  onClick={() => setShowArticlePicker(true)}
                  className="text-xs text-primary hover:underline underline-offset-2"
                >
                  Change article
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <input
                  type="text"
                  placeholder="Search articles..."
                  value={articleSearch}
                  onChange={(e) => setArticleSearch(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-input border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                />
                <div className="max-h-52 overflow-y-auto space-y-1">
                  {articles.length === 0 ? (
                    <div className="flex flex-col items-center py-6 gap-2 text-center">
                      <BookOpen className="h-8 w-8 text-muted-foreground/30" />
                      <p className="text-xs text-muted-foreground">No articles in library yet</p>
                    </div>
                  ) : (
                    articles.map((article) => (
                      <button
                        key={article.id}
                        onClick={() => { setSelectedArticleId(article.id); setShowArticlePicker(false); }}
                        className={`w-full text-left p-2.5 rounded-lg text-xs transition-all ${
                          selectedArticleId === article.id
                            ? "bg-primary/20 border border-primary/40"
                            : "hover:bg-secondary/50 border border-transparent"
                        }`}
                      >
                        <p className="text-muted-foreground mb-0.5">{article.source}</p>
                        <p className="font-medium text-foreground line-clamp-2">{article.title}</p>
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Format Selector */}
          <div className="bg-card border border-border rounded-lg p-4 space-y-3">
            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              2. Choose Format
            </Label>
            <div className="grid grid-cols-2 gap-2">
              {FORMATS.map((fmt) => {
                const Icon = fmt.icon;
                const isSelected = selectedFormat === fmt.id;
                return (
                  <button
                    key={fmt.id}
                    onClick={() => setSelectedFormat(fmt.id)}
                    className={`p-3 rounded-lg text-left transition-all border ${
                      isSelected ? "border-opacity-60" : "border-border hover:border-muted-foreground/30"
                    }`}
                    style={isSelected ? {
                      backgroundColor: fmt.colour + "22",
                      borderColor: fmt.colour + "66",
                    } : {}}
                  >
                    <Icon
                      className="h-4 w-4 mb-1.5"
                      style={{ color: isSelected ? fmt.colour : undefined }}
                    />
                    <p className="text-xs font-medium text-foreground">{fmt.label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 leading-tight">{fmt.description}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Custom Angle */}
          <div className="bg-card border border-border rounded-lg p-4 space-y-3">
            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              3. Custom Angle (optional)
            </Label>
            <Textarea
              placeholder="e.g. 'Focus on the implications for UK founder CEOs' or 'Angle this as a cautionary tale about AI hype'..."
              value={customAngle}
              onChange={(e) => setCustomAngle(e.target.value)}
              rows={3}
              className="bg-input border-border text-foreground text-xs resize-none placeholder:text-muted-foreground"
            />
          </div>

          {/* Generate Button */}
          <Button
            onClick={() => {
              if (!selectedArticleId) return toast.error("Please select an article first");
              generate.mutate({
                articleId: selectedArticleId,
                format: selectedFormat,
                customAngle: customAngle || undefined,
              });
            }}
            disabled={generate.isPending || !selectedArticleId}
            className="w-full gap-2 h-11"
            style={{
              backgroundColor: FORMAT_COLOUR_MAP[selectedFormat],
              color: "white",
            }}
          >
            {generate.isPending ? (
              <><Sparkles className="h-4 w-4 animate-spin" /> Generating...</>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                Generate {FORMATS.find((f) => f.id === selectedFormat)?.label}
              </>
            )}
          </Button>
        </div>

        {/* Right: Generated Content */}
        <div className="lg:col-span-3 space-y-4">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Generated Content
            </Label>
            {allDrafts.length > 0 && (
              <span className="text-xs text-muted-foreground">
                {allDrafts.length} draft{allDrafts.length !== 1 ? "s" : ""} total
              </span>
            )}
          </div>

          {generate.isPending && (
            <div className="bg-card border border-border rounded-lg p-6 flex flex-col items-center gap-3">
              <Sparkles className="h-8 w-8 text-primary animate-pulse" />
              <p className="text-sm text-muted-foreground">Generating content in Dom's voice...</p>
              <p className="text-xs text-muted-foreground/60">This takes 15–30 seconds</p>
            </div>
          )}

          {formatDrafts.length === 0 && !generate.isPending ? (
            <div className="bg-card border border-border rounded-lg p-8 flex flex-col items-center gap-3 text-center">
              <div
                className="h-12 w-12 rounded-full flex items-center justify-center"
                style={{ backgroundColor: FORMAT_COLOUR_MAP[selectedFormat] + "22" }}
              >
                {(() => {
                  const Icon = FORMAT_ICON_MAP[selectedFormat];
                  return <Icon className="h-6 w-6" style={{ color: FORMAT_COLOUR_MAP[selectedFormat] }} />;
                })()}
              </div>
              <p className="text-sm font-medium text-muted-foreground">
                No {FORMATS.find((f) => f.id === selectedFormat)?.label} drafts yet
              </p>
              <p className="text-xs text-muted-foreground/60">
                {selectedArticleId
                  ? "Click Generate to create your first draft"
                  : "Select an article and click Generate"}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {formatDrafts.map((draft) => (
                <div
                  key={draft.id}
                  className="bg-card border border-border rounded-lg overflow-hidden"
                  style={{ borderTopColor: FORMAT_COLOUR_MAP[draft.format as Format] + "66", borderTopWidth: 2 }}
                >
                  <div className="flex items-start justify-between gap-3 p-4 border-b border-border">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground leading-snug">{draft.title}</p>
                      {draft.angle && (
                        <p className="text-xs text-muted-foreground mt-1 italic">"{draft.angle}"</p>
                      )}
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(draft.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <CopyButton text={draft.content} />
                      <button
                        onClick={() => deleteDraft.mutate({ id: draft.id })}
                        className="p-1.5 rounded-lg hover:bg-destructive/20 transition-colors"
                        title="Delete draft"
                      >
                        <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
                      </button>
                    </div>
                  </div>
                  <div className="p-4 max-h-96 overflow-y-auto">
                    <div className="article-prose text-xs">
                      <Streamdown>{draft.content}</Streamdown>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* All drafts for other formats */}
          {allDrafts.filter((d) => d.format !== selectedFormat).length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Other Formats
              </p>
              {allDrafts
                .filter((d) => d.format !== selectedFormat)
                .map((draft) => {
                  const Icon = FORMAT_ICON_MAP[draft.format as Format];
                  const colour = FORMAT_COLOUR_MAP[draft.format as Format];
                  return (
                    <div
                      key={draft.id}
                      className="bg-card border border-border rounded-lg p-3 flex items-center justify-between gap-3 cursor-pointer hover:border-muted-foreground/30 transition-colors"
                      onClick={() => setSelectedFormat(draft.format as Format)}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <Icon className="h-4 w-4 shrink-0" style={{ color: colour }} />
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-foreground truncate">{draft.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {FORMATS.find((f) => f.id === draft.format)?.label} ·{" "}
                            {new Date(draft.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                          </p>
                        </div>
                      </div>
                      <CopyButton text={draft.content} />
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
