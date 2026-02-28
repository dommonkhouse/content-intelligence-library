import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Link } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Video,
  Linkedin,
  Instagram,
  FileText,
  Search,
  CheckCircle2,
  Clock,
  Circle,
  ExternalLink,
  BarChart3,
} from "lucide-react";

type CalendarFormat = "video_script" | "linkedin_post" | "instagram_caption" | "blog_post";
type CalendarStatus = "untouched" | "in_progress" | "done";

const FORMAT_CONFIG: Record<CalendarFormat, { label: string; icon: React.ElementType; colour: string }> = {
  video_script: { label: "Video", icon: Video, colour: "text-red-500" },
  linkedin_post: { label: "LinkedIn", icon: Linkedin, colour: "text-blue-600" },
  instagram_caption: { label: "Instagram", icon: Instagram, colour: "text-pink-500" },
  blog_post: { label: "Blog", icon: FileText, colour: "text-green-600" },
};

const FORMATS = Object.keys(FORMAT_CONFIG) as CalendarFormat[];

const STATUS_CONFIG: Record<CalendarStatus, { label: string; icon: React.ElementType; bg: string; text: string; border: string }> = {
  untouched: { label: "Untouched", icon: Circle, bg: "bg-gray-50", text: "text-gray-400", border: "border-gray-200" },
  in_progress: { label: "In Progress", icon: Clock, bg: "bg-amber-50", text: "text-amber-600", border: "border-amber-200" },
  done: { label: "Done", icon: CheckCircle2, bg: "bg-green-50", text: "text-green-600", border: "border-green-200" },
};

function StatusCell({
  articleId,
  format,
  status,
  draftCount,
  onUpdate,
}: {
  articleId: number;
  format: CalendarFormat;
  status: CalendarStatus;
  draftCount: number;
  onUpdate: (articleId: number, format: CalendarFormat, status: CalendarStatus) => void;
}) {
  const cfg = STATUS_CONFIG[status];
  const StatusIcon = cfg.icon;
  const FormatIcon = FORMAT_CONFIG[format].icon;

  const nextStatus: Record<CalendarStatus, CalendarStatus> = {
    untouched: "in_progress",
    in_progress: "done",
    done: "untouched",
  };

  return (
    <button
      onClick={() => onUpdate(articleId, format, nextStatus[status])}
      title={`${FORMAT_CONFIG[format].label}: ${cfg.label} — click to advance`}
      className={`relative flex flex-col items-center justify-center gap-1 w-full h-14 rounded-lg border transition-all hover:shadow-sm ${cfg.bg} ${cfg.border} group`}
    >
      <StatusIcon className={`w-4 h-4 ${cfg.text}`} />
      {draftCount > 0 && (
        <span className="absolute top-1 right-1 text-[9px] font-semibold bg-white border border-gray-200 rounded-full w-4 h-4 flex items-center justify-center text-gray-500">
          {draftCount}
        </span>
      )}
    </button>
  );
}

export default function ContentCalendar() {
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<CalendarStatus | "all">("all");

  const { data: calendarData = [], isLoading, refetch } = trpc.calendar.getData.useQuery();
  const updateStatus = trpc.calendar.updateStatus.useMutation({
    onSuccess: () => refetch(),
    onError: () => toast.error("Failed to update status"),
  });

  const handleUpdate = (articleId: number, format: CalendarFormat, status: CalendarStatus) => {
    updateStatus.mutate({ articleId, format, status });
  };

  const filtered = useMemo(() => {
    let rows = calendarData;
    if (search.trim()) {
      const q = search.toLowerCase();
      rows = rows.filter((a) => a.title.toLowerCase().includes(q) || (a.source ?? "").toLowerCase().includes(q));
    }
    if (filterStatus !== "all") {
      rows = rows.filter((a) => FORMATS.some((f) => a.statuses[f] === filterStatus));
    }
    return rows;
  }, [calendarData, search, filterStatus]);

  // Stats
  const stats = useMemo(() => {
    const total = calendarData.length * FORMATS.length;
    let done = 0, inProgress = 0;
    for (const a of calendarData) {
      for (const f of FORMATS) {
        if (a.statuses[f] === "done") done++;
        else if (a.statuses[f] === "in_progress") inProgress++;
      }
    }
    return { total, done, inProgress, untouched: total - done - inProgress };
  }, [calendarData]);

  return (
    <div className="p-6 max-w-full">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Content calendar</h1>
        <p className="text-sm text-gray-500 mt-1">
          {calendarData.length} articles · track repurposing across all formats
        </p>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        {[
          { label: "Total slots", value: stats.total, colour: "text-gray-700", bg: "bg-gray-50 border-gray-200" },
          { label: "Done", value: stats.done, colour: "text-green-700", bg: "bg-green-50 border-green-200" },
          { label: "In progress", value: stats.inProgress, colour: "text-amber-700", bg: "bg-amber-50 border-amber-200" },
          { label: "Untouched", value: stats.untouched, colour: "text-gray-500", bg: "bg-gray-50 border-gray-200" },
        ].map((s) => (
          <div key={s.label} className={`rounded-xl border p-4 ${s.bg}`}>
            <div className={`text-2xl font-bold ${s.colour}`}>{s.value}</div>
            <div className="text-xs text-gray-500 mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-5">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Search articles..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 text-sm"
          />
        </div>
        <div className="flex gap-1">
          {(["all", "untouched", "in_progress", "done"] as const).map((s) => (
            <Button
              key={s}
              size="sm"
              variant={filterStatus === s ? "default" : "outline"}
              className="h-9 text-xs capitalize"
              onClick={() => setFilterStatus(s)}
            >
              {s === "all" ? "All" : s === "in_progress" ? "In progress" : s.charAt(0).toUpperCase() + s.slice(1)}
            </Button>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 mb-4 text-xs text-gray-500">
        <span className="font-medium text-gray-700">Format columns:</span>
        {FORMATS.map((f) => {
          const Icon = FORMAT_CONFIG[f].icon;
          return (
            <span key={f} className="flex items-center gap-1">
              <Icon className={`w-3.5 h-3.5 ${FORMAT_CONFIG[f].colour}`} />
              {FORMAT_CONFIG[f].label}
            </span>
          );
        })}
        <span className="ml-4 font-medium text-gray-700">Status:</span>
        {(["untouched", "in_progress", "done"] as CalendarStatus[]).map((s) => {
          const Icon = STATUS_CONFIG[s].icon;
          return (
            <span key={s} className={`flex items-center gap-1 ${STATUS_CONFIG[s].text}`}>
              <Icon className="w-3.5 h-3.5" />
              {STATUS_CONFIG[s].label}
            </span>
          );
        })}
        <span className="ml-2 text-gray-400">· click any cell to advance status</span>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="text-center py-16 text-gray-400">Loading calendar...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400">No articles match your filter.</div>
      ) : (
        <div className="rounded-xl border border-gray-200 overflow-hidden">
          {/* Table header */}
          <div className="grid bg-gray-50 border-b border-gray-200 px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide"
            style={{ gridTemplateColumns: "1fr 100px 56px 56px 56px 56px" }}>
            <span>Article</span>
            <span>Source</span>
            {FORMATS.map((f) => {
              const Icon = FORMAT_CONFIG[f].icon;
              return (
                <span key={f} className="flex items-center justify-center gap-1">
                  <Icon className={`w-3.5 h-3.5 ${FORMAT_CONFIG[f].colour}`} />
                </span>
              );
            })}
          </div>

          {/* Rows */}
          <div className="divide-y divide-gray-100">
            {filtered.map((article) => {
              const allDone = FORMATS.every((f) => article.statuses[f] === "done");
              return (
                <div
                  key={article.id}
                  className={`grid items-center px-4 py-2 hover:bg-gray-50 transition-colors ${allDone ? "opacity-60" : ""}`}
                  style={{ gridTemplateColumns: "1fr 100px 56px 56px 56px 56px" }}
                >
                  {/* Title */}
                  <div className="flex items-center gap-2 min-w-0 pr-4">
                    {allDone && <CheckCircle2 className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />}
                    <Link href={`/article/${article.id}`}>
                      <span className="text-sm font-medium text-gray-800 hover:text-blue-600 cursor-pointer line-clamp-2 leading-snug">
                        {article.title}
                      </span>
                    </Link>
                  </div>

                  {/* Source */}
                  <div className="text-xs text-gray-400 truncate pr-2">{article.source ?? "—"}</div>

                  {/* Status cells */}
                  {FORMATS.map((f) => (
                    <div key={f} className="px-1">
                      <StatusCell
                        articleId={article.id}
                        format={f}
                        status={article.statuses[f]}
                        draftCount={article.draftCounts[f]}
                        onUpdate={handleUpdate}
                      />
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Progress bar */}
      {stats.total > 0 && (
        <div className="mt-6">
          <div className="flex justify-between text-xs text-gray-500 mb-1.5">
            <span>Overall repurposing progress</span>
            <span>{Math.round((stats.done / stats.total) * 100)}% complete</span>
          </div>
          <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
            <div className="h-full flex">
              <div
                className="bg-green-500 transition-all"
                style={{ width: `${(stats.done / stats.total) * 100}%` }}
              />
              <div
                className="bg-amber-400 transition-all"
                style={{ width: `${(stats.inProgress / stats.total) * 100}%` }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
