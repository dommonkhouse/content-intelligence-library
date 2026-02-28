import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import {
  RefreshCw,
  Plus,
  Trash2,
  Mail,
  Clock,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Activity,
  Inbox,
} from "lucide-react";

function formatDuration(ms: number | null | undefined): string {
  if (!ms) return "—";
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function formatRelativeTime(date: Date | string | null | undefined): string {
  if (!date) return "Never";
  const d = typeof date === "string" ? new Date(date) : date;
  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function StatusBadge({ status }: { status: string }) {
  if (status === "success") {
    return (
      <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30 gap-1">
        <CheckCircle2 className="w-3 h-3" />
        Success
      </Badge>
    );
  }
  if (status === "partial") {
    return (
      <Badge className="bg-amber-500/15 text-amber-400 border-amber-500/30 gap-1">
        <AlertCircle className="w-3 h-3" />
        Partial
      </Badge>
    );
  }
  return (
    <Badge className="bg-red-500/15 text-red-400 border-red-500/30 gap-1">
      <XCircle className="w-3 h-3" />
      Error
    </Badge>
  );
}

export default function IngestSettings() {
  const utils = trpc.useUtils();
  const { data: sources = [], isLoading: sourcesLoading } = trpc.ingest.listSources.useQuery();
  const { data: logs = [], isLoading: logsLoading } = trpc.ingest.listLogs.useQuery({ limit: 20 });
  const { data: lastRun } = trpc.ingest.getLastRun.useQuery();

  const [isRunning, setIsRunning] = useState(false);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");

  const runNow = trpc.ingest.runNow.useMutation({
    onSuccess: (result) => {
      setIsRunning(false);
      utils.ingest.listLogs.invalidate();
      utils.ingest.getLastRun.invalidate();
      utils.ingest.listSources.invalidate();
      utils.inbox.list.invalidate();
      toast.success(`Ingest complete — ${result.emailsNew} new emails found.`, {
        description: `Found ${result.emailsFound} total, ${result.emailsSkipped} already seen.${result.errors.length ? ` ${result.errors.length} error(s).` : ""}`,
      });
    },
    onError: (err) => {
      setIsRunning(false);
      toast.error(`Ingest failed: ${err.message}`);
    },
  });

  const addSource = trpc.ingest.addSource.useMutation({
    onSuccess: () => {
      utils.ingest.listSources.invalidate();
      setAddDialogOpen(false);
      setNewName("");
      setNewEmail("");
      toast.success("Source added");
    },
    onError: (err) => toast.error(`Failed to add source: ${err.message}`),
  });

  const toggleSource = trpc.ingest.toggleSource.useMutation({
    onSuccess: () => utils.ingest.listSources.invalidate(),
    onError: (err) => toast.error(`Failed to toggle source: ${err.message}`),
  });

  const deleteSource = trpc.ingest.deleteSource.useMutation({
    onSuccess: () => {
      utils.ingest.listSources.invalidate();
      toast.success("Source removed");
    },
    onError: (err) => toast.error(`Failed to remove source: ${err.message}`),
  });

  function handleRunNow() {
    setIsRunning(true);
    runNow.mutate({ maxPerSource: 50 });
  }

  function handleAddSource() {
    if (!newName.trim() || !newEmail.trim()) return;
    addSource.mutate({ name: newName.trim(), emailAddress: newEmail.trim() });
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Ingest Settings</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage newsletter sources and run Gmail ingestion to pull new emails into the inbox.
          </p>
        </div>
        <Button
          onClick={handleRunNow}
          disabled={isRunning}
          className="gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${isRunning ? "animate-spin" : ""}`} />
          {isRunning ? "Running…" : "Run Ingest Now"}
        </Button>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bg-card border-border">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Activity className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Last Run</p>
                <p className="text-sm font-semibold text-foreground">
                  {lastRun ? formatRelativeTime(lastRun.runAt) : "Never"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-500/10">
                <Inbox className="w-4 h-4 text-emerald-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Last Run Result</p>
                <p className="text-sm font-semibold text-foreground">
                  {lastRun ? `${lastRun.emailsNew} new / ${lastRun.emailsFound} found` : "—"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <Mail className="w-4 h-4 text-blue-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Active Sources</p>
                <p className="text-sm font-semibold text-foreground">
                  {sources.filter((s) => s.isActive).length} / {sources.length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Newsletter Sources */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Newsletter Sources</CardTitle>
              <CardDescription className="text-xs mt-0.5">
                Email addresses monitored for newsletter ingestion
              </CardDescription>
            </div>
            <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1.5">
                  <Plus className="w-3.5 h-3.5" />
                  Add Source
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Newsletter Source</DialogTitle>
                  <DialogDescription>
                    Add an email address to monitor for new newsletter content.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="source-name">Name</Label>
                    <Input
                      id="source-name"
                      placeholder="e.g. Alan Whitman"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="source-email">Email Address</Label>
                    <Input
                      id="source-email"
                      type="email"
                      placeholder="e.g. alan@example.com"
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setAddDialogOpen(false)}>Cancel</Button>
                  <Button
                    onClick={handleAddSource}
                    disabled={!newName.trim() || !newEmail.trim() || addSource.isPending}
                  >
                    {addSource.isPending ? "Adding…" : "Add Source"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {sourcesLoading ? (
            <div className="text-sm text-muted-foreground py-4 text-center">Loading sources…</div>
          ) : sources.length === 0 ? (
            <div className="text-sm text-muted-foreground py-4 text-center">No sources configured.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead className="text-xs">Name</TableHead>
                  <TableHead className="text-xs">Email</TableHead>
                  <TableHead className="text-xs">Last Ingested</TableHead>
                  <TableHead className="text-xs text-right">Total</TableHead>
                  <TableHead className="text-xs text-center">Active</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {sources.map((source) => (
                  <TableRow key={source.id} className="border-border">
                    <TableCell className="font-medium text-sm">{source.name}</TableCell>
                    <TableCell className="text-xs text-muted-foreground font-mono">
                      {source.emailAddress}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {formatRelativeTime(source.lastIngestedAt)}
                    </TableCell>
                    <TableCell className="text-xs text-right text-muted-foreground">
                      {source.totalIngested}
                    </TableCell>
                    <TableCell className="text-center">
                      <Switch
                        checked={source.isActive}
                        onCheckedChange={() => toggleSource.mutate({ id: source.id })}
                        className="scale-75"
                      />
                    </TableCell>
                    <TableCell>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="w-7 h-7 text-muted-foreground hover:text-red-400">
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Remove source?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will stop monitoring <strong>{source.emailAddress}</strong>. Existing emails already in the inbox will not be affected.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              className="bg-red-600 hover:bg-red-700"
                              onClick={() => deleteSource.mutate({ id: source.id })}
                            >
                              Remove
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Ingest Log */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Ingest History</CardTitle>
          <CardDescription className="text-xs mt-0.5">
            Recent ingest runs — shows the last 20 runs
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          {logsLoading ? (
            <div className="text-sm text-muted-foreground py-4 text-center">Loading history…</div>
          ) : logs.length === 0 ? (
            <div className="text-sm text-muted-foreground py-4 text-center">
              No ingest runs yet. Click "Run Ingest Now" to start.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead className="text-xs">Run At</TableHead>
                  <TableHead className="text-xs">Status</TableHead>
                  <TableHead className="text-xs text-right">Found</TableHead>
                  <TableHead className="text-xs text-right">New</TableHead>
                  <TableHead className="text-xs text-right">Skipped</TableHead>
                  <TableHead className="text-xs text-right">Duration</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => (
                  <TableRow key={log.id} className="border-border">
                    <TableCell className="text-xs text-muted-foreground">
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3 h-3" />
                        {new Date(log.runAt).toLocaleString()}
                      </div>
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={log.status} />
                    </TableCell>
                    <TableCell className="text-xs text-right">{log.emailsFound}</TableCell>
                    <TableCell className="text-xs text-right text-emerald-400">{log.emailsNew}</TableCell>
                    <TableCell className="text-xs text-right text-muted-foreground">{log.emailsSkipped}</TableCell>
                    <TableCell className="text-xs text-right text-muted-foreground">
                      {formatDuration(log.durationMs)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          {logs.length > 0 && logs[0]?.errorMessage && (
            <div className="mt-3 p-3 rounded-md bg-red-500/10 border border-red-500/20">
              <p className="text-xs text-red-400 font-mono">{logs[0].errorMessage}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* How it works */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">How Ingestion Works</CardTitle>
        </CardHeader>
        <CardContent className="pt-0 space-y-2 text-sm text-muted-foreground">
          <p>
            When you click <strong className="text-foreground">Run Ingest Now</strong>, the system searches your Gmail for emails from all active sources above.
          </p>
          <p>
            New emails (not previously seen) are added to the <strong className="text-foreground">Email Inbox</strong> with status <em>Pending</em>. From there, you can approve each one to extract its content into the Content Library, or discard it.
          </p>
          <p>
            Each email is tracked by its Gmail message ID to prevent duplicates — running ingest multiple times is safe.
          </p>
          <Separator className="my-2" />
          <p className="text-xs">
            <strong className="text-foreground">Tip:</strong> Use the <em>After Date</em> option (coming soon) to limit ingestion to emails received after a specific date, which is useful for bulk-importing historical newsletters.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
