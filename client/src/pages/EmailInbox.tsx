import { useState } from "react";
import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { CheckCircle, XCircle, Clock, Mail, ExternalLink, AlertCircle, ChevronRight } from "lucide-react";

type EmailStatus = "pending" | "approved" | "discarded" | "error";

const STATUS_CONFIG: Record<EmailStatus, { label: string; colour: string; icon: React.ReactNode }> = {
  pending: { label: "Pending", colour: "bg-amber-100 text-amber-800 border-amber-200", icon: <Clock className="w-3 h-3" /> },
  approved: { label: "Approved", colour: "bg-green-100 text-green-800 border-green-200", icon: <CheckCircle className="w-3 h-3" /> },
  discarded: { label: "Discarded", colour: "bg-gray-100 text-gray-600 border-gray-200", icon: <XCircle className="w-3 h-3" /> },
  error: { label: "Error", colour: "bg-red-100 text-red-800 border-red-200", icon: <AlertCircle className="w-3 h-3" /> },
};

function EmailCard({ email, onOpen }: { email: RawEmailItem; onOpen: () => void }) {
  const cfg = STATUS_CONFIG[email.status as EmailStatus] ?? STATUS_CONFIG.pending;
  const preview = (email.rawText ?? "").slice(0, 200).replace(/\s+/g, " ").trim();
  const receivedDate = new Date(email.receivedAt).toLocaleDateString("en-GB", {
    day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  });

  return (
    <Card
      className="cursor-pointer hover:shadow-md transition-shadow border border-gray-200"
      onClick={onOpen}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border font-medium ${cfg.colour}`}>
                {cfg.icon}
                {cfg.label}
              </span>
              <span className="text-xs text-gray-400">{receivedDate}</span>
            </div>
            <p className="font-semibold text-gray-900 text-sm truncate mb-1">
              {email.subject ?? "(no subject)"}
            </p>
            <p className="text-xs text-gray-500 truncate mb-2">
              {email.fromName ? `${email.fromName} <${email.fromAddress}>` : email.fromAddress}
            </p>
            <p className="text-xs text-gray-600 line-clamp-2">{preview}</p>
          </div>
          <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0 mt-1" />
        </div>
        {email.errorMessage && (
          <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">
            <strong>Error:</strong> {email.errorMessage}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

type RawEmailItem = {
  id: number;
  subject: string | null;
  fromAddress: string | null;
  fromName: string | null;
  rawText: string | null;
  rawHtml: string | null;
  status: string;
  errorMessage: string | null;
  articleId: number | null;
  receivedAt: Date;
  processedAt: Date | null;
};

function EmailDetailModal({
  email,
  onClose,
  onApproved,
  onDiscarded,
}: {
  email: RawEmailItem;
  onClose: () => void;
  onApproved: () => void;
  onDiscarded: () => void;
}) {
  const utils = trpc.useUtils();

  const approveMutation = trpc.inbox.approve.useMutation({
    onSuccess: (data) => {
      toast.success(
        data.isArticle
          ? `Approved and added to library: "${data.article.title}"`
          : `Added to library (note: ${data.nonArticleReason})`
      );
      utils.inbox.list.invalidate();
      onApproved();
    },
    onError: (err) => toast.error(`Failed to approve: ${err.message}`),
  });

  const discardMutation = trpc.inbox.updateStatus.useMutation({
    onSuccess: () => {
      toast.success("Email discarded");
      utils.inbox.list.invalidate();
      onDiscarded();
    },
    onError: (err) => toast.error(`Failed to discard: ${err.message}`),
  });

  const isProcessing = approveMutation.isPending || discardMutation.isPending;

  // Check if this looks like a Gmail verification email
  const isVerificationEmail =
    (email.subject ?? "").toLowerCase().includes("gmail") ||
    (email.subject ?? "").toLowerCase().includes("forwarding") ||
    (email.rawText ?? "").toLowerCase().includes("confirmation code") ||
    (email.rawText ?? "").toLowerCase().includes("verify");

  // Extract verification URL if present
  const verificationUrlMatch = (email.rawText ?? "").match(/https:\/\/mail\.google\.com\/mail\/[^\s"<>]+/);
  const verificationUrl = verificationUrlMatch?.[0];

  // Extract confirmation code if present
  const codeMatch = (email.rawText ?? "").match(/confirmation code[:\s]+(\d+)/i);
  const confirmationCode = codeMatch?.[1];

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold pr-8 leading-snug">
            {email.subject ?? "(no subject)"}
          </DialogTitle>
          <p className="text-xs text-gray-500 mt-1">
            From: {email.fromName ? `${email.fromName} <${email.fromAddress}>` : email.fromAddress} ·{" "}
            {new Date(email.receivedAt).toLocaleString("en-GB")}
          </p>
        </DialogHeader>

        {/* Verification email alert */}
        {isVerificationEmail && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm">
            <p className="font-semibold text-blue-800 mb-1 flex items-center gap-1">
              <Mail className="w-4 h-4" /> Gmail Forwarding Verification Email Detected
            </p>
            {confirmationCode && (
              <p className="text-blue-700 mb-2">
                Confirmation code: <strong className="text-lg font-mono">{confirmationCode}</strong>
              </p>
            )}
            {verificationUrl && (
              <a
                href={verificationUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-blue-700 underline hover:text-blue-900 text-xs"
              >
                <ExternalLink className="w-3 h-3" /> Click to verify forwarding address
              </a>
            )}
          </div>
        )}

        <Tabs defaultValue="text" className="flex-1 overflow-hidden flex flex-col">
          <TabsList className="w-full">
            <TabsTrigger value="text" className="flex-1">Plain Text</TabsTrigger>
            {email.rawHtml && <TabsTrigger value="html" className="flex-1">HTML Preview</TabsTrigger>}
          </TabsList>
          <TabsContent value="text" className="flex-1 overflow-y-auto mt-0">
            <pre className="text-xs text-gray-700 whitespace-pre-wrap font-mono bg-gray-50 rounded p-3 leading-relaxed">
              {email.rawText ?? "(no text content)"}
            </pre>
          </TabsContent>
          {email.rawHtml && (
            <TabsContent value="html" className="flex-1 overflow-y-auto mt-0">
              <iframe
                srcDoc={email.rawHtml}
                className="w-full h-full min-h-[400px] border rounded"
                sandbox="allow-same-origin"
                title="Email HTML preview"
              />
            </TabsContent>
          )}
        </Tabs>

        {email.status === "pending" && (
          <div className="flex gap-2 pt-3 border-t">
            <Button
              className="flex-1 bg-black text-white hover:bg-gray-800"
              onClick={() => approveMutation.mutate({ id: email.id })}
              disabled={isProcessing}
            >
              {approveMutation.isPending ? "Processing…" : "Approve & Add to Library"}
            </Button>
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => discardMutation.mutate({ id: email.id, status: "discarded" })}
              disabled={isProcessing}
            >
              {discardMutation.isPending ? "Discarding…" : "Discard"}
            </Button>
          </div>
        )}

        {email.status === "approved" && email.articleId && (
          <div className="pt-3 border-t">
            <a href={`/article/${email.articleId}`} className="text-sm text-blue-600 underline">
              View article in library →
            </a>
          </div>
        )}

        {email.status === "error" && (
          <div className="pt-3 border-t">
            <p className="text-sm text-red-600">
              <strong>Error:</strong> {email.errorMessage}
            </p>
            <Button
              className="mt-2 bg-black text-white hover:bg-gray-800"
              size="sm"
              onClick={() => approveMutation.mutate({ id: email.id })}
              disabled={isProcessing}
            >
              Retry
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default function EmailInbox() {
  const [activeTab, setActiveTab] = useState<"all" | EmailStatus>("all");
  const [selectedEmail, setSelectedEmail] = useState<RawEmailItem | null>(null);

  const statusFilter = activeTab === "all" ? undefined : activeTab;

  const { data, isLoading, refetch } = trpc.inbox.list.useQuery({
    status: statusFilter,
    limit: 100,
  });

  const emails = (data?.emails ?? []) as RawEmailItem[];
  const total = data?.total ?? 0;

  const pendingCount = emails.filter((e) => e.status === "pending").length;

  return (
    <DashboardLayout>
      <div className="p-6 max-w-4xl mx-auto">
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <Mail className="w-6 h-6" />
                Email Inbox
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                Emails forwarded to <code className="bg-gray-100 px-1 rounded text-xs">monkhouse-newsletter@manus.bot</code> land here first.
                Review and approve to add to the library, or discard.
              </p>
            </div>
            {pendingCount > 0 && (
              <span className="bg-amber-100 text-amber-800 border border-amber-200 text-sm font-semibold px-3 py-1 rounded-full">
                {pendingCount} pending
              </span>
            )}
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
          <TabsList className="mb-4">
            <TabsTrigger value="all">All ({total})</TabsTrigger>
            <TabsTrigger value="pending">Pending</TabsTrigger>
            <TabsTrigger value="approved">Approved</TabsTrigger>
            <TabsTrigger value="discarded">Discarded</TabsTrigger>
            <TabsTrigger value="error">Errors</TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab}>
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-24 bg-gray-100 rounded-lg animate-pulse" />
                ))}
              </div>
            ) : emails.length === 0 ? (
              <div className="text-center py-16 text-gray-400">
                <Mail className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="font-medium">No emails here yet</p>
                <p className="text-sm mt-1">
                  Forward newsletters to <code className="bg-gray-100 px-1 rounded">monkhouse-newsletter@manus.bot</code> to get started
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {emails.map((email) => (
                  <EmailCard
                    key={email.id}
                    email={email}
                    onOpen={() => setSelectedEmail(email)}
                  />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {selectedEmail && (
          <EmailDetailModal
            email={selectedEmail}
            onClose={() => setSelectedEmail(null)}
            onApproved={() => {
              setSelectedEmail(null);
              refetch();
            }}
            onDiscarded={() => {
              setSelectedEmail(null);
              refetch();
            }}
          />
        )}
      </div>
    </DashboardLayout>
  );
}
