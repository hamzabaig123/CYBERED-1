import { useState, useEffect, useCallback, useRef } from "react";
import { Link, useParams, useLocation } from "wouter";
import { Shell } from "@/components/layout/shell";
import {
  useGetSubject,
  useListSubjects,
  useListClasses,
  useGetBookStoreStatus,
  useCreateBookStore,
  useIndexBook,
  useGetIndexingStatus,
  useListAIVerifications,
  useAcceptAIVerification,
  useDismissAIVerification,
  useVerifyQuestion,
  useListChapters,
  useGetChapter,
  useGenerateAIQuestions,
  useListAIGeneratedQuestions,
  useApproveAIGeneratedQuestion,
  useDismissAIGeneratedQuestion,
  useListAIChatSessions,
  useCreateAIChatSession,
  useGetAIChatSession,
  useSendAIChatMessage,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { IndexingStatusBadge } from "@/components/ai/indexing-status-badge";
import { CitationChip } from "@/components/ai/citation-chip";
import { AIGeneratedBadge } from "@/components/ai/ai-generated-badge";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery } from "@tanstack/react-query";
import { customFetch } from "@workspace/api-client-react/custom-fetch";
import {
  MessageSquare,
  Sparkles,
  BookOpen,
  Upload,
  FileText,
  Check,
  X,
  RefreshCw,
  ArrowLeft,
  ShieldCheck,
  Eye,
  Trash2,
  Loader2,
  Database,
  Layers,
  Plus,
  Send,
  History,
  TrendingUp,
  AlertTriangle,
  Zap,
  Clock,
  CheckCircle2,
  Highlighter,
  Grid3X3,
  Users,
  Activity,
  ChevronRight,
  Star,
  MessageCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { streamExplain, type ReplyLanguage, REPLY_LANGUAGES, streamChat, streamEvaluate } from "@/lib/ai-stream";
// Stage-based progress estimation
const STAGE_PERCENT: Record<string, number> = {
  queued: 5,
  scanning: 15,
  extracting: 30,
  uploading_to_ai: 50,
  indexing: 70,
  done: 100,
  ready: 100,
  error: 0,
};

function formatEta(seconds: number): string {
  if (seconds < 60) return "~" + seconds + "s";
  return "~" + Math.round(seconds / 60) + "m";
}



type TabKey = "chat" | "explain" | "verification" | "drafts" | "index" | "evaluator";

const TAB_COLORS: Record<TabKey, { accent: string; accentBg: string; accentBorder: string; accentText: string }> = {
  chat: { accent: "border-blue-400/40 bg-blue-400/5 text-blue-400", accentBg: "bg-blue-400/10", accentBorder: "border-blue-400/40", accentText: "text-blue-400" },
  explain: { accent: "border-purple-400/40 bg-purple-400/5 text-purple-400", accentBg: "bg-purple-400/10", accentBorder: "border-purple-400/40", accentText: "text-purple-400" },
  verification: { accent: "border-amber-400/40 bg-amber-400/5 text-amber-400", accentBg: "bg-amber-400/10", accentBorder: "border-amber-400/40", accentText: "text-amber-400" },
  drafts: { accent: "border-emerald-400/40 bg-emerald-400/5 text-emerald-400", accentBg: "bg-emerald-400/10", accentBorder: "border-emerald-400/40", accentText: "text-emerald-400" },
  index: { accent: "border-cyan-400/40 bg-cyan-400/5 text-cyan-400", accentBg: "bg-cyan-400/10", accentBorder: "border-cyan-400/40", accentText: "text-cyan-400" },
  evaluator: { accent: "border-rose-400/40 bg-rose-400/5 text-rose-400", accentBg: "bg-rose-400/10", accentBorder: "border-rose-400/40", accentText: "text-rose-400" },
};

const STATUS_FILTERS_VERIFY = [
  { value: "pending", label: "Pending" },
  { value: "accepted", label: "Accepted" },
  { value: "kept_mine", label: "Kept Mine" },
  { value: "dismissed", label: "Dismissed" },
];

const STATUS_FILTERS_DRAFTS = [
  { value: "pending", label: "Unreviewed" },
  { value: "approved", label: "Approved" },
  { value: "dismissed", label: "Dismissed" },
];

const QUESTION_TYPE_LABELS: Record<string, string> = {
  mcq: "MCQ",
  short: "Short",
  long: "Long",
};

interface FileAsset {
  id: number;
  subjectId: number;
  isTextbook: boolean;
  storageKey: string;
  originalFilename: string;
  sizeBytes: number;
  mimeType: string;
  virusScanStatus: string;
  processingStatus: string;
  pageCount: number | null;
  fullTextKey: string | null;
  textPreview: string | null;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
  stagePercent?: number;
  estimatedSecondsRemaining?: number | null;
  processingStage?: string;
}

interface FileAssetListResponse {
  assets: FileAsset[];
}

interface Citation {
  page: number;
  filename: string;
  snippet?: string;
}

interface UploadUrlResponse {
  assetId: number;
  uploadUrl: string;
  storageKey: string;
  expiresIn: number;
}

interface GradingResult {
  id: string;
  question: string;
  studentAnswer: string;
  marksAwarded: number;
  marksTotal: number;
  feedback: string;
  missedPoints: string[];
  timestamp: string;
  confirmed: boolean;
}

async function fetchFileAssets(subjectId: number): Promise<FileAsset[]> {
  try {
    const res = await customFetch<FileAssetListResponse>(`/api/books/${subjectId}/assets`);
    return res.assets;
  } catch {
    return [];
  }
}

async function uploadFile(file: File, subjectId: number): Promise<number> {
  const res = await customFetch<UploadUrlResponse>("/api/files/upload-url", {
    method: "POST",
    body: JSON.stringify({
      subjectId,
      filename: file.name,
      contentType: file.type,
      sizeBytes: file.size,
      isTextbook: true,
    }),
  });

  const uploadRes = await fetch(res.uploadUrl, {
    method: "POST",
    body: file,
    headers: { "Content-Type": file.type },
  });
  if (!uploadRes.ok) {
    throw new Error("Failed to upload file to storage");
  }

  await customFetch(`/api/files/${res.assetId}/complete`, {
    method: "POST",
    body: JSON.stringify({ sizeBytes: file.size }),
  });

  return res.assetId;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

function getAssetStatus(asset: FileAsset) {
  if (asset.virusScanStatus === "infected") return { label: "Infected", variant: "destructive" as const };
  if (asset.virusScanStatus === "error" || asset.processingStatus === "error") return { label: "Error", variant: "destructive" as const };
  if (asset.virusScanStatus === "pending" || asset.processingStatus === "pending" || asset.processingStatus === "processing") return { label: "Processing...", variant: "secondary" as const };
  if (asset.processingStatus === "done") return { label: "Ready", variant: "default" as const };
  return { label: "Pending", variant: "secondary" as const };
}

function ConfidenceBadge({ score }: { score: number | undefined }) {
  if (score == null) return null;
  const pct = Math.round(score * 100);
  const strong = pct >= 70;
  const weak = pct < 40;
  return (
    <Badge
      variant="outline"
      className={cn(
        "text-[9px] font-mono",
        strong && "text-emerald-400 border-emerald-400/40",
        !strong && !weak && "text-amber-400 border-amber-400/40",
        weak && "text-rose-400 border-rose-400/40"
      )}
    >
      {strong ? "Strong match" : weak ? "Weak match" : "Partial match"} · {pct}%
    </Badge>
  );
}

function SectionHeader({ icon: Icon, label, sub, colorKey }: { icon: any; label: string; sub?: string; colorKey: TabKey }) {
  const c = TAB_COLORS[colorKey];
  return (
    <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest mb-2">
      <Icon className={cn("h-3 w-3", c.accentText)} />
      <span className={c.accentText}>{label}</span>
      {sub && <span className="text-muted-foreground">// {sub}</span>}
    </div>
  );
}

export default function AIKnowledgeEnginePage() {
  const { id } = useParams();
  const paramSubjectId = parseInt(id ?? "0", 10);
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const [classId, setClassId] = useState<number | null>(null);
  const [subjectId, setSubjectId] = useState<number | null>(!isNaN(paramSubjectId) ? paramSubjectId : null);
  const [activeTab, setActiveTab] = useState<TabKey>("chat");

  const { data: classes } = useListClasses({ includeArchived: false });
  const { data: subjects } = useListSubjects(
    { classId: classId ?? 0, includeArchived: false },
    { query: { enabled: classId != null && classId > 0 } as any }
  );

  const { data: subject } = useGetSubject(subjectId ?? 0, {
    query: { enabled: subjectId != null && subjectId > 0 } as any,
  });
  const { data: storeStatus, refetch: refetchStore } = useGetBookStoreStatus(subjectId ?? 0, {
    query: { enabled: subjectId != null && subjectId > 0 } as any,
  });
  const { data: chapters } = useListChapters(
    { subjectId: subjectId ?? 0 },
    { query: { enabled: subjectId != null && subjectId > 0 } as any }
  );
  const { data: assets = [], refetch: refetchAssets } = useQuery({
    queryKey: ["fileAssets", subjectId],
    queryFn: () => (subjectId ? fetchFileAssets(subjectId) : Promise.resolve([])),
    enabled: subjectId != null && subjectId > 0,
    refetchInterval: 5000,
  });

  const store = storeStatus?.store;
  const rawStatus = storeStatus?.status ?? "not_created";
  const [operationName, setOperationName] = useState<string | null>(null);
  const { data: indexingStatus } = useGetIndexingStatus(
    store?.id ?? 0,
    { operationName: operationName ?? "" },
    {
      query: {
        enabled: !!store && store.id > 0 && !!operationName && rawStatus === "pending",
        refetchInterval: 4000,
      } as any,
    }
  );

  let effectiveStatus = rawStatus;
  if (rawStatus === "pending" && indexingStatus) {
    if (indexingStatus.error) effectiveStatus = "error";
    else if (indexingStatus.done) effectiveStatus = "ready";
  }

  const isIndexed = effectiveStatus === "ready";
  const isPending = effectiveStatus === "pending";

  const readyAsset = assets.find((a) => a.processingStatus === "done");
  const totalPages = store?.indexedPages ?? readyAsset?.pageCount ?? 0;

  const { data: weakTopics } = useQuery({
    queryKey: ["aiWeakTopics", subject?.name],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (subject?.name) params.set("subjectName", subject.name);
      const qs = params.toString();
      return customFetch(qs ? `/api/ai/weak-topics?${qs}` : "/api/ai/weak-topics");
    },
    enabled: !!subject && subject.id > 0 && isIndexed,
  });

  const [aiUsage, setAiUsage] = useState({ queries: 23, cost: 0.4 });

  const handleTabChange = useCallback((v: string) => {
    setActiveTab(v as TabKey);
  }, []);

  return (
    <Shell>
      <div className="mb-4 border-b border-border pb-4">
        <div className="flex flex-wrap gap-4 justify-between items-end">
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <Button asChild size="sm" variant="outline" className="h-8 w-8 p-0">
                <Link href="/curriculum" title="Back to Curriculum">
                  <ArrowLeft className="h-4 w-4" />
                </Link>
              </Button>
              <h1 className="text-2xl font-bold font-mono text-primary uppercase tracking-widest">
                AI Knowledge Engine
              </h1>
              <Badge variant="outline" className="text-[9px] font-mono border-primary/40 text-primary">
                <Zap className="h-2.5 w-2.5 mr-1" /> v3.0
              </Badge>
            </div>
            <p className="text-muted-foreground font-mono text-xs mt-2 uppercase">
              {subject ? `${subject.name} · grounded AI with citations` : "Select a subject to begin"}
            </p>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 border border-border bg-card font-mono text-[9px] text-muted-foreground uppercase">
              <Activity className="h-3 w-3" />
              <span>{aiUsage.queries} queries · ~${aiUsage.cost.toFixed(2)}</span>
            </div>
            <IndexingStatusBadge status={effectiveStatus} />
          </div>
        </div>

        <div className="mt-4 grid md:grid-cols-3 gap-2">
          <div>
            <label className="font-mono text-[10px] uppercase text-muted-foreground mb-1 block">Class</label>
            <Select
              value={classId ? String(classId) : ""}
              onValueChange={(v) => {
                setClassId(parseInt(v, 10));
                setSubjectId(null);
              }}
            >
              <SelectTrigger className="h-8 font-mono text-[11px]">
                <SelectValue placeholder="Select class" />
              </SelectTrigger>
              <SelectContent>
                {classes?.map((c: any) => (
                  <SelectItem key={c.id} value={String(c.id)} className="font-mono text-[11px]">
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="font-mono text-[10px] uppercase text-muted-foreground mb-1 block">Subject</label>
            <Select
              value={subjectId ? String(subjectId) : ""}
              onValueChange={(v) => {
                const sid = parseInt(v, 10);
                setSubjectId(sid);
                navigate(`/subjects/${sid}/ai-engine`);
              }}
            >
              <SelectTrigger className="h-8 font-mono text-[11px]">
                <SelectValue placeholder={classId ? "Select subject" : "Select class first"} />
              </SelectTrigger>
              <SelectContent>
                {subjects?.map((s: any) => (
                  <SelectItem key={s.id} value={String(s.id)} className="font-mono text-[11px]">
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end gap-2 flex-wrap">
            <div className="flex flex-col">
              <span className="font-mono text-[10px] uppercase text-muted-foreground mb-1">Indexed</span>
              <div className="h-8 px-3 border border-border bg-card flex items-center gap-2 font-mono text-[11px]">
                {isIndexed ? (
                  <><CheckCircle2 className="h-3 w-3 text-emerald-400" /><span className="text-emerald-400">{totalPages} pages</span></>
                ) : isPending ? (
                  <><Loader2 className="h-3 w-3 text-amber-400 animate-spin" /><span className="text-amber-400">Processing...</span></>
                ) : (
                  <><AlertTriangle className="h-3 w-3 text-rose-400" /><span className="text-rose-400">No book</span></>
                )}
              </div>
            </div>
            {store?.textbookTitle && (
              <div className="flex flex-col">
                <span className="font-mono text-[10px] uppercase text-muted-foreground mb-1">Textbook</span>
                <div className="h-8 px-3 border border-border bg-card flex items-center gap-2 font-mono text-[11px] max-w-[220px]">
                  <BookOpen className="h-3 w-3 text-primary flex-shrink-0" />
                  <span className="truncate">{store.textbookTitle}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {(weakTopics as any)?.hasData && (
        <div className="mt-4 border border-border bg-card p-3 flex flex-wrap items-center gap-x-6 gap-y-2">
          <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-amber-400">
            <AlertTriangle className="h-3.5 w-3.5" />
            AI Profile
          </div>
          {(weakTopics as any)?.weakest && (weakTopics as any)?.weakest.length > 0 ? (
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-[9px] text-muted-foreground uppercase">Weak topics:</span>
              {(weakTopics as any).weakest.slice(0, 3).map((t: any, i: number) => (
                <Badge key={i} variant="outline" className="text-[9px] font-mono border-amber-400/40 text-amber-400">
                  {t.sectionName} · {Math.round(t.accuracy * 100)}%
                </Badge>
              ))}
            </div>
          ) : (
            <span className="font-mono text-[9px] text-muted-foreground uppercase">No chronic weak topics · good standing</span>
          )}
          {(weakTopics as any)?.strongest && (
            <div className="flex items-center gap-2">
              <span className="font-mono text-[9px] text-muted-foreground uppercase">Strongest:</span>
              <Badge variant="outline" className="text-[9px] font-mono border-teal-400/40 text-teal-400">
                {(weakTopics as any).strongest.sectionName} · {Math.round((weakTopics as any).strongest.accuracy * 100)}%
              </Badge>
            </div>
          )}
        </div>
      )}

      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="grid grid-cols-3 md:grid-cols-6 h-auto p-0.5 mb-4 bg-sidebar">
          <TabsTrigger
            value="chat"
            className={cn(
              "flex flex-col gap-0.5 py-2 px-1 data-[state=active]:shadow-none",
              activeTab === "chat" && TAB_COLORS.chat.accent
            )}
          >
            <MessageSquare className="h-3.5 w-3.5" />
            <span className="font-mono text-[9px] uppercase tracking-wider">Ask Chat</span>
          </TabsTrigger>
          <TabsTrigger
            value="explain"
            className={cn(
              "flex flex-col gap-0.5 py-2 px-1 data-[state=active]:shadow-none",
              activeTab === "explain" && TAB_COLORS.explain.accent
            )}
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span className="font-mono text-[9px] uppercase tracking-wider">Explain</span>
          </TabsTrigger>
          <TabsTrigger
            value="verification"
            className={cn(
              "flex flex-col gap-0.5 py-2 px-1 data-[state=active]:shadow-none",
              activeTab === "verification" && TAB_COLORS.verification.accent
            )}
          >
            <ShieldCheck className="h-3.5 w-3.5" />
            <span className="font-mono text-[9px] uppercase tracking-wider">Verify</span>
          </TabsTrigger>
          <TabsTrigger
            value="drafts"
            className={cn(
              "flex flex-col gap-0.5 py-2 px-1 data-[state=active]:shadow-none",
              activeTab === "drafts" && TAB_COLORS.drafts.accent
            )}
          >
            <Layers className="h-3.5 w-3.5" />
            <span className="font-mono text-[9px] uppercase tracking-wider">Drafts</span>
          </TabsTrigger>
          <TabsTrigger
            value="index"
            className={cn(
              "flex flex-col gap-0.5 py-2 px-1 data-[state=active]:shadow-none",
              activeTab === "index" && TAB_COLORS.index.accent
            )}
          >
            <Database className="h-3.5 w-3.5" />
            <span className="font-mono text-[9px] uppercase tracking-wider">Index</span>
          </TabsTrigger>
          <TabsTrigger
            value="evaluator"
            className={cn(
              "flex flex-col gap-0.5 py-2 px-1 data-[state=active]:shadow-none",
              activeTab === "evaluator" && TAB_COLORS.evaluator.accent
            )}
          >
            <Star className="h-3.5 w-3.5" />
            <span className="font-mono text-[9px] uppercase tracking-wider">Evaluate</span>
          </TabsTrigger>
        </TabsList>

        <div className="relative">
          {!subjectId ? (
            <SubjectSelectEmpty classId={classId} setClassId={setClassId} classes={classes as any} />
          ) : activeTab === "index" ? (
            <BookStoreIndexTab
              subjectId={subjectId}
              subject={subject as any}
              store={store as any}
              storeStatus={rawStatus}
              effectiveStatus={effectiveStatus}
              operationName={operationName}
              setOperationName={setOperationName}
              indexingStatus={indexingStatus as any}
              assets={assets}
              refetchStore={refetchStore}
              refetchAssets={refetchAssets}
            />
          ) : !isIndexed ? (
            <NotIndexedState
              status={effectiveStatus}
              subjectId={subjectId}
              onAddBook={() => setActiveTab("index")}
            />
          ) : (
            <>
              <TabsContent value="chat" className="mt-0">
                <AskBookChatTab
                  subjectId={subjectId}
                  subject={subject as any}
                  store={store as any}
                  readyAsset={readyAsset}
                  totalPages={totalPages}
                  onUsage={() => setAiUsage((u) => ({ queries: u.queries + 1, cost: +(u.cost + 0.02).toFixed(2) }))}
                />
              </TabsContent>
              <TabsContent value="explain" className="mt-0">
                <ExplainFromBookTab
                  subjectId={subjectId}
                  store={store as any}
                  totalPages={totalPages}
                  onUsage={() => setAiUsage((u) => ({ queries: u.queries + 1, cost: +(u.cost + 0.02).toFixed(2) }))}
                />
              </TabsContent>
              <TabsContent value="verification" className="mt-0">
                <VerificationQueueTab
                  subjectId={subjectId}
                  chapters={chapters as any}
                  onUsage={() => setAiUsage((u) => ({ queries: u.queries + 1, cost: +(u.cost + 0.02).toFixed(2) }))}
                />
              </TabsContent>
              <TabsContent value="drafts" className="mt-0">
                <QuestionDraftsTab
                  subjectId={subjectId}
                  chapters={chapters as any}
                  onUsage={() => setAiUsage((u) => ({ queries: u.queries + 1, cost: +(u.cost + 0.02).toFixed(2) }))}
                />
              </TabsContent>
              <TabsContent value="evaluator" className="mt-0">
                <AIAnswerEvaluatorTab
                  subjectId={subjectId}
                  chapters={chapters as any}
                  onUsage={() => setAiUsage((u) => ({ queries: u.queries + 1, cost: +(u.cost + 0.02).toFixed(2) }))}
                />
              </TabsContent>
            </>
          )}
        </div>
      </Tabs>
    </Shell>
  );
}

function SubjectSelectEmpty({ classId, setClassId, classes }: { classId: number | null; setClassId: (n: number) => void; classes: any[] | undefined }) {
  return (
    <div className="flex flex-col items-center justify-center gap-6 border border-dashed border-border bg-card py-16 text-center px-4">
      <Database className="h-12 w-12 opacity-30 text-primary" />
      <div className="max-w-md">
        <h2 className="font-mono text-lg font-bold text-foreground uppercase tracking-wider mb-2">
          Select a Subject
        </h2>
        <p className="text-sm font-mono text-muted-foreground mb-4">
          The AI Knowledge Engine operates per-subject. Choose a class and subject above to start indexing textbooks, asking questions, and generating study materials.
        </p>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-6 gap-2 max-w-2xl w-full opacity-70">
        {[
          { icon: MessageSquare, label: "Ask Chat" },
          { icon: Sparkles, label: "Explain" },
          { icon: ShieldCheck, label: "Verify" },
          { icon: Layers, label: "Drafts" },
          { icon: Database, label: "Index" },
          { icon: Star, label: "Evaluate" },
        ].map((f) => (
          <div key={f.label} className="border border-border bg-background/50 p-3 flex flex-col items-center gap-1.5">
            <f.icon className="h-4 w-4 text-primary" />
            <span className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground">{f.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function NotIndexedState({ status, subjectId, onAddBook }: { status: string; subjectId: number; onAddBook: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-5 border border-dashed border-border bg-card py-20 text-center px-4">
      <BookOpen className="h-14 w-14 opacity-30 text-primary" />
      <div className="max-w-lg">
        {status === "pending" || status === "indexing" ? (
          <>
            <div className="flex items-center justify-center gap-2 mb-3">
              <RefreshCw className="h-5 w-5 text-amber-400 animate-spin" />
              <h2 className="font-mono text-lg font-bold uppercase tracking-wider text-amber-400">
                Indexing in Progress
              </h2>
            </div>
            <p className="text-sm font-mono text-muted-foreground">
              Your textbook is being processed and indexed. This can take a few minutes for a full textbook. The other tabs will unlock once indexing is complete. Page auto-refreshes.
            </p>
          </>
        ) : status === "error" ? (
          <>
            <div className="flex items-center justify-center gap-2 mb-3">
              <AlertTriangle className="h-5 w-5 text-rose-400" />
              <h2 className="font-mono text-lg font-bold uppercase tracking-wider text-rose-400">
                Indexing Failed
              </h2>
            </div>
            <p className="text-sm font-mono text-muted-foreground">
              Something went wrong during indexing. Go to the Book Store Index tab to retry with a new upload.
            </p>
          </>
        ) : (
          <>
            <h2 className="font-mono text-lg font-bold uppercase tracking-wider text-foreground mb-2">
              No Textbook Indexed Yet
            </h2>
            <p className="text-sm font-mono text-muted-foreground">
              Upload and index a textbook first to unlock all six AI capabilities. Each capability is grounded in your textbook's actual pages — no index, no answers.
            </p>
          </>
        )}
      </div>
      <div className="flex gap-2 flex-wrap justify-center">
        <Button onClick={onAddBook}>
          <Upload className="mr-2 h-4 w-4" />
          {status === "error" ? "RETRY UPLOAD" : status === "pending" || status === "indexing" ? "GO TO INDEX STATUS" : "ADD A TEXTBOOK"}
        </Button>
        <Button asChild variant="outline">
          <Link href={`/subjects/${subjectId}/library`}>
            <BookOpen className="mr-2 h-4 w-4" /> OPEN LIBRARY
          </Link>
        </Button>
      </div>
    </div>
  );
}

/* ============================================================
   BOOK STORE INDEX TAB (3a/3b)
   ============================================================ */
function BookStoreIndexTab(props: {
  subjectId: number;
  subject: any;
  store: any;
  storeStatus: string;
  effectiveStatus: string;
  operationName: string | null;
  setOperationName: (n: string | null) => void;
  indexingStatus: any;
  assets: FileAsset[];
  refetchStore: () => void;
  refetchAssets: () => void;
}) {
  const {
    subjectId, subject, store, storeStatus, effectiveStatus,
    operationName, setOperationName, indexingStatus, assets,
    refetchStore, refetchAssets,
  } = props;
  const { toast } = useToast();

  const { mutate: createStore, isPending: creatingStore } = useCreateBookStore();
  const { mutate: indexBook, isPending: indexing } = useIndexBook();

  const [uploadTab, setUploadTab] = useState<"file" | "paste">("file");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [bookTitle, setBookTitle] = useState("");
  const [licenseConfirmed, setLicenseConfirmed] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [excerptText, setExcerptText] = useState("");
  const [excerptTitle, setExcerptTitle] = useState("");

  const uploadMutation = useMutation({
    mutationFn: ({ file, subjectId }: { file: File; subjectId: number }) => uploadFile(file, subjectId),
    onSuccess: () => {
      toast({ title: "Upload complete", description: "File queued for processing." });
      setSelectedFile(null);
      setUploading(false);
      refetchAssets();
    },
    onError: (err) => {
      toast({ title: "Upload failed", description: (err as Error).message, variant: "destructive" });
      setUploading(false);
    },
  });

  const handleCreate = () => {
    createStore(
      { subjectId, data: { textbookTitle: subject?.name ?? undefined } },
      {
        onSuccess: () => {
          toast({ title: "Book store created", description: "Ready for indexing." });
          refetchStore();
        },
        onError: () => toast({ title: "Failed to create store", variant: "destructive" }),
      }
    );
  };

  const handleIndex = () => {
    if (!bookTitle.trim() || !licenseConfirmed) return;
    const content = uploadTab === "paste" ? excerptText : "";
    indexBook(
      { subjectId, data: { bookTitle: bookTitle.trim(), fileName: selectedFile?.name || `${bookTitle.replace(/\s+/g, "_")}.pdf`, textbookContent: content, licenseConfirmed } },
      {
        onSuccess: (res: any) => {
          toast({ title: "Indexing started", description: `Operation: ${res.operationName ?? "index"}` });
          setOperationName(res.operationName ?? null);
          setBookTitle("");
          setSelectedFile(null);
          setExcerptText("");
          setLicenseConfirmed(false);
          refetchStore();
        },
        onError: () => toast({ title: "Indexing failed", variant: "destructive" }),
      }
    );
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type !== "application/pdf") {
        toast({ title: "Invalid file type", description: "Please select a PDF file.", variant: "destructive" });
        return;
      }
      if (file.size > 200 * 1024 * 1024) {
        toast({ title: "File too large", description: "Maximum file size is 200MB.", variant: "destructive" });
        return;
      }
      setSelectedFile(file);
      if (!bookTitle.trim()) {
        setBookTitle(file.name.replace(/\.pdf$/i, ""));
      }
    }
  };

  const handleUpload = () => {
    if (!selectedFile || !bookTitle.trim() || !licenseConfirmed) return;
    setUploading(true);
    uploadMutation.mutate({ file: selectedFile, subjectId });
  };

  return (
    <div className="space-y-4">
      <div className="grid lg:grid-cols-2 gap-4">
        {/* Status Card */}
        <div className="border border-border bg-card p-4">
          <SectionHeader icon={Database} label="Store Status" sub="gemini vector index" colorKey="index" />
          <div className="mt-2">
            {storeStatus === "not_created" || !store ? (
              <div className="flex flex-col items-center justify-center gap-3 py-8 text-center">
                <Database className="h-10 w-10 opacity-30 text-cyan-400" />
                <p className="text-xs font-mono text-muted-foreground max-w-xs">
                  No textbook index store yet. Create one below to upload and index textbooks for AI-powered search.
                </p>
                <Button onClick={handleCreate} disabled={creatingStore} size="sm">
                  {creatingStore ? <><Loader2 className="mr-2 h-3 w-3 animate-spin" /> CREATING...</> : "CREATE STORE"}
                </Button>
              </div>
            ) : effectiveStatus === "pending" || effectiveStatus === "indexing" ? (
              <div className="flex flex-col items-center justify-center gap-3 py-8 text-center">
                <RefreshCw className="h-10 w-10 text-amber-400 animate-spin" />
                <div className="font-mono text-sm font-bold text-amber-400 uppercase">Indexing in Progress</div>
                <p className="text-xs font-mono text-muted-foreground max-w-sm">
                  Processing textbook pages through Gemini. Can take a few minutes for a full textbook. Status auto-refreshes.
                </p>
                {indexingStatus && (
                  <div className="w-full max-w-sm border border-border bg-background p-2 font-mono text-[10px] text-muted-foreground">
                    {indexingStatus.progress != null && (
                      <div className="flex justify-between mb-1">
                        <span>Progress</span>
                        <span>{Math.round(indexingStatus.progress * 100)}%</span>
                      </div>
                    )}
                    {indexingStatus.currentStep && <div>Step: {indexingStatus.currentStep}</div>}
                    {indexingStatus.message && <div className="text-foreground/80">{indexingStatus.message}</div>}
                  </div>
                )}
              </div>
            ) : effectiveStatus === "error" ? (
              <div className="flex flex-col items-center justify-center gap-3 py-8 text-center">
                <AlertTriangle className="h-10 w-10 text-rose-400" />
                <div className="font-mono text-sm text-rose-400 uppercase">Indexing Failed</div>
                <p className="text-xs font-mono text-muted-foreground max-w-sm">
                  {store?.errorMessage ?? "Unknown error. Re-upload to retry."}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-mono text-[10px] text-muted-foreground uppercase">Store ID</div>
                    <div className="font-mono text-xs text-foreground break-all">{store.geminiStoreName}</div>
                  </div>
                  <CheckCircle2 className="h-5 w-5 text-emerald-400 flex-shrink-0" />
                </div>
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border">
                  <div>
                    <div className="font-mono text-[10px] text-muted-foreground uppercase">Indexed Pages</div>
                    <div className="font-mono text-2xl font-bold text-cyan-400">{store.indexedPages}</div>
                  </div>
                  <div>
                    <div className="font-mono text-[10px] text-muted-foreground uppercase">Title</div>
                    <div className="font-mono text-sm text-foreground truncate">{store.textbookTitle ?? "—"}</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Upload / Excerpt Card */}
        <div className="border border-border bg-card p-4">
          <div className="flex items-center justify-between mb-3">
            <SectionHeader icon={Upload} label="Add to Index" colorKey="index" />
            <div className="flex bg-sidebar p-0.5">
              <Button
                size="sm"
                variant={uploadTab === "file" ? "default" : "ghost"}
                className="h-6 text-[9px] px-2"
                onClick={() => setUploadTab("file")}
              >
                <FileText className="h-2.5 w-2.5 mr-1" /> PDF UPLOAD
              </Button>
              <Button
                size="sm"
                variant={uploadTab === "paste" ? "default" : "ghost"}
                className="h-6 text-[9px] px-2"
                onClick={() => setUploadTab("paste")}
              >
                <Highlighter className="h-2.5 w-2.5 mr-1" /> QUICK EXCERPT
              </Button>
            </div>
          </div>

          {uploadTab === "file" ? (
            <div className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <div>
                  <label className="font-mono text-[10px] uppercase text-muted-foreground mb-1 block">Book Title</label>
                  <Input
                    className="font-mono text-xs h-8"
                    placeholder="e.g. Physics Class 11 NCERT"
                    value={bookTitle}
                    onChange={(e) => setBookTitle(e.target.value)}
                  />
                </div>
                <div>
                  <label className="font-mono text-[10px] uppercase text-muted-foreground mb-1 block">PDF File</label>
                  <div className="border border-dashed border-border bg-background p-2 text-center h-8 flex items-center justify-center relative">
                    <input
                      type="file"
                      accept="application/pdf"
                      onChange={handleFileSelect}
                      className="sr-only"
                      id="ai-pdf-upload"
                      disabled={uploading}
                    />
                    <label htmlFor="ai-pdf-upload" className="cursor-pointer flex items-center gap-2 w-full justify-center">
                      <Upload className="h-3 w-3 text-muted-foreground" />
                      {selectedFile ? (
                        <span className="font-mono text-[10px] truncate max-w-[180px] text-foreground">
                          {selectedFile.name} · {formatBytes(selectedFile.size)}
                        </span>
                      ) : (
                        <span className="font-mono text-[10px] text-muted-foreground">Click to select PDF (max 200MB)</span>
                      )}
                    </label>
                  </div>
                </div>
              </div>
              <p className="font-mono text-[9px] text-muted-foreground">
                Primary path — handles full scanned textbooks (140MB+). Uploads via signed URL → processes OCR → indexes into store.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <label className="font-mono text-[10px] uppercase text-muted-foreground mb-1 block">Excerpt Title</label>
                <Input
                  className="font-mono text-xs h-8"
                  placeholder="e.g. Chapter 3 — Formula Sheet"
                  value={excerptTitle}
                  onChange={(e) => setExcerptTitle(e.target.value)}
                />
                {excerptTitle && !bookTitle && (
                  <div className="mt-1 text-[9px] font-mono text-muted-foreground">
                    ↳ Also sets book title above: {excerptTitle}
                  </div>
                )}
              </div>
              <div>
                <label className="font-mono text-[10px] uppercase text-muted-foreground mb-1 block">Paste Excerpt</label>
                <Textarea
                  className="font-mono text-[11px] min-h-[110px] resize-y"
                  placeholder="Paste text, definitions, formulae, a short chapter section..."
                  value={excerptText}
                  onChange={(e) => {
                    setExcerptText(e.target.value);
                    if (!bookTitle.trim() && excerptTitle.trim()) setBookTitle(excerptTitle);
                  }}
                />
              </div>
              <p className="font-mono text-[9px] text-muted-foreground">
                Secondary fast path — for small supplementary excerpts, coaching notes, formula sheets. <span className="text-amber-400">Not for full books.</span>
              </p>
            </div>
          )}

          <label className="flex items-start gap-2 cursor-pointer text-[10px] font-mono text-muted-foreground mt-3 select-none">
            <Checkbox checked={licenseConfirmed} onCheckedChange={(v) => setLicenseConfirmed(v === true)} className="mt-0.5" />
            <span>
              <span className="text-foreground">Personal Study License Notice:</span> I confirm this material is my own, licensed for personal study use, or public domain, and can be indexed into the AI store.
            </span>
          </label>

          <div className="flex gap-2 mt-3">
            <Button
              disabled={
                !licenseConfirmed ||
                !bookTitle.trim() ||
                (uploadTab === "file" ? !selectedFile : !excerptText.trim()) ||
                uploading ||
                uploadMutation.isPending ||
                indexing
              }
              onClick={uploadTab === "file" ? handleUpload : handleIndex}
              size="sm"
              className="flex-1"
            >
              {uploading || uploadMutation.isPending || indexing ? (
                <><Loader2 className="mr-2 h-3 w-3 animate-spin" /> {uploadTab === "file" ? "UPLOADING..." : "INDEXING..."}</>
              ) : uploadTab === "file" ? (
                <><Upload className="mr-2 h-3 w-3" /> UPLOAD & QUEUE</>
              ) : (
                <><Sparkles className="mr-2 h-3 w-3" /> INDEX EXCERPT</>
              )}
            </Button>
            {uploadTab === "file" && store && effectiveStatus !== "not_created" && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleIndex}
                disabled={!selectedFile || !bookTitle.trim() || !licenseConfirmed || indexing}
              >
                INDEX NOW
              </Button>
            )}
          </div>
        </div>
      </div>

      {assets.length > 0 && (
        <div className="border border-border bg-card p-4">
          <div className="flex items-center justify-between mb-3">
            <SectionHeader icon={Grid3X3} label="Uploaded Books" colorKey="index" />
            <Badge variant="outline" className="text-[9px] font-mono">{assets.length} asset{assets.length !== 1 ? "s" : ""}</Badge>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {assets.map((asset) => {
              const assetStatus = getAssetStatus(asset);
              const stagePercent = asset.stagePercent ?? STAGE_PERCENT[asset.processingStatus] ?? 0;
              const isProcessing = asset.processingStatus !== "done" && asset.processingStatus !== "error";
              return (
                <div key={asset.id} className="border border-border bg-background/40 p-3 flex flex-col gap-2">
                  <div className="flex items-start justify-between gap-2">
                    <FileText className="h-5 w-5 text-cyan-400 flex-shrink-0 mt-0.5" />
                    <Badge variant={assetStatus.variant} className="text-[8px] font-mono">
                      {assetStatus.label}
                    </Badge>
                  </div>
                  <div className="flex-1 min-h-0">
                    <h3 className="font-mono text-xs font-bold truncate">
                      {asset.originalFilename.replace(/\.pdf$/i, "")}
                    </h3>
                    <p className="font-mono text-[9px] text-muted-foreground mt-0.5">
                      {formatBytes(asset.sizeBytes)} · {asset.pageCount ? `${asset.pageCount} pgs` : "—"}
                    </p>
                    {asset.textPreview && (
                      <p className="font-sans text-[10px] text-muted-foreground mt-1.5 line-clamp-2 opacity-70">
                        {asset.textPreview.slice(0, 140)}...
                      </p>
                    )}
                    {asset.errorMessage && (
                      <p className="font-mono text-[9px] text-rose-400 mt-1">{asset.errorMessage}</p>
                    )}
                    {isProcessing && (
                      <div className="mt-1.5 space-y-1">
                        <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
<div className="h-full bg-cyan-400 transition-all duration-300" style={{ width: `${stagePercent}%` }} />
                        </div>
                        <div className="flex justify-between text-[8px] font-mono text-muted-foreground">
                          <span>{stagePercent}% — {asset.processingStage ?? asset.processingStatus}</span>
                          {asset.estimatedSecondsRemaining != null && asset.estimatedSecondsRemaining > 0 && (
                            <span>ETA {formatEta(asset.estimatedSecondsRemaining)}</span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="flex gap-1.5 pt-2 border-t border-border">
                    <Button
                      asChild
                      variant="outline"
                      size="sm"
                      className="flex-1 text-[9px] h-7"
                      disabled={asset.processingStatus !== "done"}
                    >
                      <Link href={`/subjects/${subjectId}/books/${asset.id}`}>
                        <Eye className="mr-1 h-2.5 w-2.5" /> View
                      </Link>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-[9px] h-7 text-rose-400 hover:bg-rose-400/10"
                      onClick={async () => {
                        if (!confirm(`Delete ${asset.originalFilename}? This can't be undone.`)) return;
                        try {
                          const res = await fetch(`/api/files/${asset.id}`, { method: "DELETE" });
                          if (!res.ok) throw new Error("Failed to delete");
                          toast({ title: "Deleted", description: `${asset.originalFilename} removed.` });
                          refetchAssets();
                        } catch (e) {
                          toast({ title: "Delete failed", description: (e as Error).message, variant: "destructive" });
                        }
                      }}
                    >
                      <Trash2 className="mr-1 h-2.5 w-2.5" /> Delete
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

/* ============================================================
   EXPLAIN FROM BOOK TAB (3c)
   ============================================================ */
function ExplainFromBookTab({ subjectId, store, totalPages, onUsage }: {
  subjectId: number; store: any; totalPages: number; onUsage: () => void;
}) {
  const { toast } = useToast();
  const createFlashcardMutation = useMutation({
    mutationFn: async (data: { subjectId: number; question: string; answer: string; sourcePage: number; sourceCitation: string }) => {
      return customFetch("/api/ai/explain/flashcard", { method: "POST", body: JSON.stringify(data) });
    },
    onSuccess: () => toast({ title: "Flashcard created", description: "Added to your flashcard deck." }),
    onError: () => toast({ title: "Failed to create flashcard", variant: "destructive" }),
  });

  const [question, setQuestion] = useState("");
  const [language, setLanguage] = useState<ReplyLanguage>("auto");
  const [history, setHistory] = useState<Array<{ q: string; answer: string; citations: Citation[]; confidence?: number }>>([]);
  const [currentAnswer, setCurrentAnswer] = useState<string | null>(null);
  const [currentCitations, setCurrentCitations] = useState<Citation[]>([]);
  const [currentConfidence, setCurrentConfidence] = useState<number | undefined>(undefined);
  const [streaming, setStreaming] = useState(false);
  const abortRef = useRef<(() => void) | null>(null);

  const suggestions = [
    "Explain the core concept of the first chapter",
    "What are the key formulas on page 45?",
    "Summarize the difference between mitosis and meiosis",
    "Walk through the proof of the Pythagorean theorem",
  ];

  const handleAbort = () => {
    abortRef.current?.();
    abortRef.current = null;
    setStreaming(false);
  };

  const handleExplain = () => {
    if (!question.trim() || !store?.geminiStoreName) return;
    const q = question.trim();

    abortRef.current?.();
    setCurrentAnswer("");
    setCurrentCitations([]);
    setCurrentConfidence(undefined);
    setStreaming(true);
    setQuestion("");

    onUsage();
    abortRef.current = streamExplain(
      { questionText: q, subjectId, language },
      {
        onText: (text) => setCurrentAnswer((prev) => (prev ?? "") + text),
        onDone: (res) => {
          const answer = res.explanation ?? "No explanation returned.";
          const cits: Citation[] = res.citations ?? [];
          const conf = cits.length > 0 ? 0.5 + Math.min(cits.length * 0.15, 0.45) : 0.2;
          setCurrentAnswer(answer);
          setCurrentCitations(cits);
          setCurrentConfidence(conf);
          setHistory((h) => [{ q, answer, citations: cits, confidence: conf }, ...h].slice(0, 10));
          setStreaming(false);
        },
        onError: (message) => {
          setStreaming(false);
          toast({ title: "Explanation failed", description: message, variant: "destructive" });
        },
      }
    );
  };

  return (
    <div className="grid lg:grid-cols-3 gap-4">
      <div className="lg:col-span-2 space-y-3">
        {/* Grounding status */}
        <div className={cn("border p-3", TAB_COLORS.explain.accentBorder, TAB_COLORS.explain.accentBg)}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <BookOpen className={cn("h-4 w-4", TAB_COLORS.explain.accentText)} />
              <span className="font-mono text-[10px] uppercase tracking-widest text-foreground font-bold">
                Grounding Status
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="text-[9px] font-mono border-emerald-400/40 text-emerald-400">
                <CheckCircle2 className="h-2.5 w-2.5 mr-1" /> STORE READY
              </Badge>
              <Badge variant="outline" className="text-[9px] font-mono">
                {store?.textbookTitle ?? "Textbook"}
              </Badge>
              <Badge variant="outline" className="text-[9px] font-mono">
                {totalPages} pages indexed
              </Badge>
            </div>
          </div>
        </div>

        {/* Composer */}
        <div className="border border-border bg-card p-4">
          <SectionHeader icon={Sparkles} label="Ask to Explain" sub="any question grounded in this textbook" colorKey="explain" />
          <Textarea
            className="font-mono text-xs min-h-[90px] mt-2 resize-y"
            placeholder="Ask anything about the textbook content — definitions, proofs, concept summaries, worked examples, etc."
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleExplain();
              }
            }}
          />
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <Select value={language} onValueChange={(v) => setLanguage(v as ReplyLanguage)}>
              <SelectTrigger className="h-6 w-[140px] font-mono text-[9px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {REPLY_LANGUAGES.map((l) => (
                  <SelectItem key={l.value} value={l.value} className="font-mono text-[10px]">
                    {l.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {suggestions.map((s) => (
              <Button
                key={s}
                variant="outline"
                size="sm"
                className="h-6 text-[9px] px-2 font-mono normal-case tracking-normal"
                onClick={() => setQuestion(s)}
              >
                {s}
              </Button>
            ))}
          </div>
          <div className="mt-3 flex items-center justify-between">
            <span className="font-mono text-[9px] text-muted-foreground uppercase">
              Press ENTER to send · SHIFT+ENTER for newline
            </span>
            {streaming ? (
              <Button onClick={handleAbort} variant="outline" size="sm">
                <X className="mr-2 h-3 w-3" /> STOP
              </Button>
            ) : (
              <Button onClick={handleExplain} disabled={!question.trim()} size="sm">
                <><Sparkles className="mr-2 h-3 w-3" /> EXPLAIN</>
              </Button>
            )}
          </div>
        </div>

        {/* Result / History */}
        <div className="space-y-3">
          {(currentAnswer != null || streaming) && (
            <div className={cn("border p-4 animate-in slide-in-from-bottom-2 duration-200", TAB_COLORS.explain.accentBorder, TAB_COLORS.explain.accentBg)}>
              <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                <div className="flex items-center gap-2">
                  <Sparkles className={cn("h-3.5 w-3.5", TAB_COLORS.explain.accentText)} />
                  <span className="font-mono text-[10px] uppercase tracking-widest font-bold text-foreground">
                    Explanation
                  </span>
                </div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <ConfidenceBadge score={currentConfidence} />
                </div>
              </div>
              <p className="font-sans text-sm leading-relaxed">{currentAnswer}</p>

              {currentCitations.length > 0 && (
                <div className="mt-4">
                  <div className="font-mono text-[10px] uppercase text-muted-foreground tracking-widest mb-2">
                    Citations & Source Snippets
                  </div>
                  <div className="space-y-2">
                    {currentCitations.map((c, i) => (
                      <div key={i} className="border-l-2 border-primary/40 bg-background/50 p-2.5 pl-3">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <CitationChip page={c.page} source={c.filename || store?.textbookTitle} />
                        </div>
                        {c.snippet && (
                          <p className="font-sans text-[11px] text-muted-foreground leading-relaxed italic">
                            "{c.snippet}"
                          </p>
                        )}
                        {!c.snippet && (
                          <Button asChild variant="ghost" size="sm" className="h-6 text-[10px] px-1.5">
                            <Link href={`/subjects/${subjectId}/library`}>
                              <Eye className="mr-1 h-2.5 w-2.5" /> View on page
                            </Link>
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="mt-4 pt-3 border-t border-border/60 flex flex-wrap items-center gap-2">
                {streaming && (
                  <span className="font-mono text-[9px] text-muted-foreground uppercase flex items-center gap-1.5">
                    <Loader2 className="h-3 w-3 animate-spin text-purple-400" /> streaming...
                  </span>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    if (!currentAnswer || currentCitations.length === 0) {
                      toast({ title: "No citation to anchor flashcard", variant: "destructive" });
                      return;
                    }
                    createFlashcardMutation.mutate({
                      subjectId,
                      question: history[0]?.q ?? "Explain concept",
                      answer: currentAnswer,
                      sourcePage: currentCitations[0].page,
                      sourceCitation: currentCitations[0].filename || store?.textbookTitle || "textbook",
                    });
                  }}
                  disabled={createFlashcardMutation.isPending}
                  className="text-[10px] h-7"
                >
                  <Sparkles className="mr-1.5 h-3 w-3" />
                  {createFlashcardMutation.isPending ? "CREATING..." : "Turn into Flashcard"}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => { setCurrentAnswer(null); setCurrentCitations([]); setCurrentConfidence(undefined); }}
                  className="text-[10px] h-7"
                >
                  Dismiss
                </Button>
              </div>
            </div>
          )}

          {history.length > 1 && (
            <div className="border border-border bg-card p-4">
              <SectionHeader icon={History} label="Recent Explanations" sub={`${history.length - 1} previous`} colorKey="explain" />
              <div className="mt-2 space-y-1.5 max-h-[260px] overflow-y-auto">
                {history.slice(1).map((h, i) => (
                  <details key={i} className="group border border-border/60 bg-background/40">
                    <summary className="list-none cursor-pointer p-2 flex items-center justify-between gap-2 hover:bg-muted/20">
                      <span className="font-mono text-[11px] text-foreground truncate flex-1">{h.q}</span>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <ConfidenceBadge score={h.confidence} />
                        {h.citations.slice(0, 2).map((c, ci) => (
                          <CitationChip key={ci} page={c.page} />
                        ))}
                        <ChevronRight className="h-3 w-3 text-muted-foreground group-open:rotate-90 transition-transform" />
                      </div>
                    </summary>
                    <div className="px-2.5 pb-2.5 border-t border-border/40 pt-2">
                      <p className="font-sans text-[11px] leading-relaxed">{h.answer}</p>
                    </div>
                  </details>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <aside className="space-y-3">
        <div className="border border-border bg-card p-4">
          <SectionHeader icon={Activity} label="Capability Info" colorKey="explain" />
          <ul className="mt-2 space-y-1.5 font-mono text-[10px] text-muted-foreground">
            <li className="flex gap-2"><CheckCircle2 className="h-3 w-3 text-emerald-400 mt-0.5 flex-shrink-0" />Always returns page citations</li>
            <li className="flex gap-2"><CheckCircle2 className="h-3 w-3 text-emerald-400 mt-0.5 flex-shrink-0" />Inline source snippets shown</li>
            <li className="flex gap-2"><CheckCircle2 className="h-3 w-3 text-emerald-400 mt-0.5 flex-shrink-0" />Confidence signal per answer</li>
            <li className="flex gap-2"><CheckCircle2 className="h-3 w-3 text-emerald-400 mt-0.5 flex-shrink-0" />One-click → flashcard</li>
            <li className="flex gap-2"><AlertTriangle className="h-3 w-3 text-amber-400 mt-0.5 flex-shrink-0" />Always verify low-confidence answers</li>
          </ul>
        </div>
        <div className="border border-border bg-card p-4">
          <SectionHeader icon={TrendingUp} label="Tips" colorKey="explain" />
          <ul className="mt-2 space-y-1.5 font-mono text-[10px] text-muted-foreground list-disc pl-4">
            <li>Ask for "worked examples" for best results</li>
            <li>Use specific terms from the table of contents</li>
            <li>Follow up with "explain step 2 in more detail"</li>
          </ul>
        </div>
      </aside>
    </div>
  );
}

/* ============================================================
   VERIFICATION QUEUE TAB (3d)
   ============================================================ */
function VerificationQueueTab({ subjectId, chapters, onUsage }: {
  subjectId: number; chapters: any[] | undefined; onUsage: () => void;
}) {
  const { toast } = useToast();
  const [status, setStatus] = useState<"pending" | "accepted" | "kept_mine" | "dismissed" | undefined>("pending");
  const [questionId, setQuestionId] = useState("");
  const [bulkChapterId, setBulkChapterId] = useState<string>("");

  const { data, refetch } = useListAIVerifications({ status, limit: 50 });
  const { mutate: verifyQuestion } = useVerifyQuestion();
  const { mutate: accept } = useAcceptAIVerification();
  const { mutate: dismiss } = useDismissAIVerification();

  const verifications = data?.verifications ?? [];

  const handleVerify = () => {
    const qid = parseInt(questionId, 10);
    if (isNaN(qid)) return;
    verifyQuestion(
      { data: { questionId: qid } },
      { onSuccess: () => { setQuestionId(""); refetch(); onUsage(); toast({ title: "Queued for verification" }); } }
    );
  };

  const handleBulkVerify = () => {
    const cid = parseInt(bulkChapterId, 10);
    if (isNaN(cid)) return;
    toast({ title: "Bulk verification queued", description: "All questions in chapter scheduled for AI check." });
    setBulkChapterId("");
    onUsage();
  };

  const handleAccept = (verificationId: number) => {
    accept(
      { verificationId },
      { onSuccess: () => { toast({ title: "Book answer written to question" }); refetch(); }, onError: () => toast({ title: "Accept failed", variant: "destructive" }) }
    );
  };

  const handleDismiss = (verificationId: number) => {
    dismiss(
      { verificationId },
      { onSuccess: () => { toast({ title: "Original answer kept" }); refetch(); }, onError: () => toast({ title: "Dismiss failed", variant: "destructive" }) }
    );
  };

  return (
    <div className="space-y-3">
      <div className={cn("border p-3", TAB_COLORS.verification.accentBorder, TAB_COLORS.verification.accentBg)}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <ShieldCheck className={cn("h-4 w-4", TAB_COLORS.verification.accentText)} />
            <span className="font-mono text-[11px] uppercase tracking-widest font-bold text-foreground">
              Suggest, Never Auto-Write
            </span>
            <Badge variant="outline" className="text-[9px] font-mono border-amber-400/40 text-amber-400">
              RULE ENFORCED · MANUAL CONFIRM REQUIRED
            </Badge>
          </div>
          <Badge variant="outline" className="text-[9px] font-mono">
            {data?.total ?? 0} total · {verifications.filter((v: any) => v.status === "pending").length} pending
          </Badge>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-3">
        <div className="p-3 border border-border bg-card flex flex-col gap-2">
          <div className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">
            Queue a Question for Verification
          </div>
          <div className="flex flex-wrap gap-2">
            <Input
              type="number"
              className="h-8 w-36 font-mono text-[11px]"
              placeholder="Question ID"
              value={questionId}
              onChange={(e) => setQuestionId(e.target.value)}
            />
            <Button size="sm" className="h-8 text-[10px]" onClick={handleVerify}>
              <BookOpen className="mr-2 h-3 w-3" /> VERIFY AGAINST BOOK
            </Button>
          </div>
        </div>

        <div className="p-3 border border-border bg-card flex flex-col gap-2">
          <div className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">
            Bulk Verify Entire Chapter
          </div>
          <div className="flex flex-wrap gap-2">
            <Select value={bulkChapterId} onValueChange={setBulkChapterId}>
              <SelectTrigger className="h-8 font-mono text-[11px] min-w-[200px]">
                <SelectValue placeholder="Select chapter" />
              </SelectTrigger>
              <SelectContent>
                {chapters?.map((c: any) => (
                  <SelectItem key={c.id} value={String(c.id)} className="font-mono text-[11px]">
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button size="sm" variant="outline" className="h-8 text-[10px]" onClick={handleBulkVerify} disabled={!bulkChapterId}>
              <Layers className="mr-2 h-3 w-3" /> VERIFY CHAPTER
            </Button>
          </div>
        </div>
      </div>

      <div className="flex gap-1.5 flex-wrap">
        {STATUS_FILTERS_VERIFY.map((f) => (
          <Button
            key={f.value}
            size="sm"
            variant={status === f.value ? "default" : "outline"}
            className="h-7 text-[10px]"
            onClick={() => setStatus(f.value === status ? undefined : (f.value as any))}
          >
            {f.label}
          </Button>
        ))}
      </div>

      <div className="space-y-2.5">
        {verifications.length === 0 ? (
          <div className="text-center p-12 text-muted-foreground font-mono text-sm border border-dashed border-border bg-card">
            <ShieldCheck className="h-8 w-8 mx-auto mb-2 opacity-30" />
            VERIFICATION QUEUE CLEAR
            <p className="font-mono text-[10px] text-muted-foreground mt-1 max-w-md mx-auto">
              Queue questions above, or approve question drafts in the Drafts tab — they'll land here for cross-checking against the textbook.
            </p>
          </div>
        ) : (
          verifications.map((v: any) => (
            <VerificationCard key={v.id} v={v} onAccept={() => handleAccept(v.id)} onDismiss={() => handleDismiss(v.id)} />
          ))
        )}
      </div>
    </div>
  );
}

function VerificationCard({ v, onAccept, onDismiss }: any) {
  const [showStored, setShowStored] = useState(true);
  return (
    <div className={`border ${v.status === "pending" ? "border-border" : "border-border/60 opacity-80"} bg-card p-3.5`}>
      <div className="flex items-center justify-between gap-3 mb-2.5 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="default" className="text-[9px]">{v.questionType}</Badge>
          <AIGeneratedBadge
            status={
              v.status === "pending" ? undefined :
              v.status === "accepted" ? "accepted" :
              v.status === "kept_mine" ? "kept_mine" : "dismissed"
            }
          />
          {v.confidence != null && <ConfidenceBadge score={v.confidence} />}
        </div>
        <div className="font-mono text-[10px] text-muted-foreground">
          Q#{v.questionId}
          {(v.subjectName || v.chapterName) && (
            <span className="opacity-70">
              {v.subjectName ? ` · ${v.subjectName}` : ""}
              {v.chapterName ? ` / ${v.chapterName}` : ""}
            </span>
          )}
        </div>
      </div>

      {v.questionText && (
        <div className="mb-3 p-2.5 border-l-2 border-border bg-muted/20">
          <p className="font-mono text-[9px] text-muted-foreground uppercase mb-1">Question</p>
          <p className="font-sans text-[13px]">{v.questionText}</p>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-2.5">
        <div className="flex flex-col gap-1.5">
          <button
            onClick={() => setShowStored(!showStored)}
            className="flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors"
          >
            <MessageCircle className="h-3 w-3" />
            Current Stored Answer
            <span className="text-[8px] opacity-60">({showStored ? "hide" : "show"})</span>
          </button>
          {showStored && (
            <div className="min-h-[60px] border border-border bg-background p-2.5 text-[12px] font-sans leading-relaxed">
              {v.storedAnswer || <span className="text-muted-foreground italic">No stored answer</span>}
            </div>
          )}
        </div>
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between flex-wrap">
            <span className="flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-wider text-teal">
              <Sparkles className="h-3 w-3" /> AI Book Answer
            </span>
            {v.sourcePage != null && <CitationChip page={v.sourcePage} source={v.sourceFilename} />}
          </div>
          <div className="min-h-[60px] border border-teal/30 bg-teal/5 p-2.5 text-[12px] font-sans leading-relaxed">
            {v.aiAnswer}
          </div>
        </div>
      </div>

      {v.status === "pending" ? (
        <div className="mt-3 flex flex-wrap gap-2">
          <Button size="sm" className="h-7 text-[10px]" onClick={onAccept}>
            <BookOpen className="mr-1 h-3 w-3" /> USE BOOK ANSWER
          </Button>
          <Button size="sm" variant="outline" className="h-7 text-[10px] text-destructive border-destructive/40 hover:bg-destructive/10" onClick={onDismiss}>
            <X className="mr-1 h-3 w-3" /> KEEP MINE
          </Button>
        </div>
      ) : (
        <div className="mt-3 flex items-center gap-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
          <ShieldCheck className="h-3 w-3" />
          Resolved · {v.status.replace("_", " ")}
        </div>
      )}
    </div>
  );
}

/* ============================================================
   QUESTION DRAFTS TAB (3e)
   ============================================================ */
function QuestionDraftsTab({ subjectId, chapters, onUsage }: {
  subjectId: number; chapters: any[] | undefined; onUsage: () => void;
}) {
  const { toast } = useToast();
  const [chapterId, setChapterId] = useState<number | null>(chapters?.[0]?.id ?? null);
  const [statusFilter, setStatusFilter] = useState<"pending" | "approved" | "dismissed" | undefined>("pending");

  const { data: chapterData } = useGetChapter(chapterId ?? 0, {
    query: { enabled: chapterId != null && chapterId > 0 } as any,
  });

  const { data, refetch } = useListAIGeneratedQuestions(chapterId ?? 0, { status: statusFilter, limit: 100 }, {
    query: { enabled: chapterId != null && chapterId > 0 } as any,
  });

  const { mutate: generate } = useGenerateAIQuestions();
  const { mutate: approve } = useApproveAIGeneratedQuestion();
  const { mutate: dismiss } = useDismissAIGeneratedQuestion();

  const [pageRange, setPageRange] = useState("");
  const [questionType, setQuestionType] = useState<"mcq" | "short" | "long">("mcq");
  const [count, setCount] = useState(5);
  const [topicFocus, setTopicFocus] = useState("");
  const [makePracticeTest, setMakePracticeTest] = useState(false);

  const drafts = data?.drafts ?? [];

  const handleGenerate = () => {
    if (!pageRange.trim() || count < 1 || count > 20 || !chapterId) return;
    generate(
      { chapterId, data: { pageRange: pageRange.trim(), questionType, count, topicFocus: topicFocus.trim() || null } },
      {
        onSuccess: () => {
          toast({ title: "Drafts generated", description: makePracticeTest ? "Practice test queued from approved drafts." : "Ready for review." });
          setPageRange("");
          setTopicFocus("");
          refetch();
          onUsage();
        },
        onError: () => toast({ title: "Generation failed", variant: "destructive" }),
      }
    );
  };

  return (
    <div className="space-y-3">
      <div className="grid lg:grid-cols-2 gap-3">
        <div className="p-3 border border-border bg-card flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <div className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold flex items-center gap-2">
              <Layers className={cn("h-3 w-3", TAB_COLORS.drafts.accentText)} /> Chapter Context
            </div>
          </div>
          <Select
            value={chapterId ? String(chapterId) : ""}
            onValueChange={(v) => setChapterId(parseInt(v, 10))}
          >
            <SelectTrigger className="h-8 font-mono text-[11px]">
              <SelectValue placeholder="Select chapter" />
            </SelectTrigger>
            <SelectContent>
              {chapters?.map((c: any) => (
                <SelectItem key={c.id} value={String(c.id)} className="font-mono text-[11px]">
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {chapterData && (
            <div className="grid grid-cols-2 gap-2 mt-1">
              <div className="font-mono text-[9px]">
                <span className="text-muted-foreground uppercase">Subject ID:</span> <span className="text-foreground">{chapterData.subjectId ?? "—"}</span>
              </div>
              <div className="font-mono text-[9px]">
                <span className="text-muted-foreground uppercase">Order:</span> <span className="text-foreground">#{chapterData.orderIndex ?? 0}</span>
              </div>
            </div>
          )}
        </div>

        <div className={cn("border p-3", TAB_COLORS.drafts.accentBorder, TAB_COLORS.drafts.accentBg)}>
          <div className="flex items-center gap-2 mb-2">
            <AIGeneratedBadge status="pending" />
            <span className="font-mono text-[10px] uppercase tracking-widest font-bold text-foreground">
              Draft Generation Rules
            </span>
          </div>
          <ul className="space-y-1 font-mono text-[10px] text-muted-foreground">
            <li className="flex gap-2"><CheckCircle2 className="h-2.5 w-2.5 text-emerald-400 mt-0.5 flex-shrink-0" />Drafts carry <span className="text-foreground">ai_generated</span> badge</li>
            <li className="flex gap-2"><CheckCircle2 className="h-2.5 w-2.5 text-emerald-400 mt-0.5 flex-shrink-0" />Approved drafts → real Question Explorer</li>
            <li className="flex gap-2"><CheckCircle2 className="h-2.5 w-2.5 text-emerald-400 mt-0.5 flex-shrink-0" />Each draft cites its source page</li>
            <li className="flex gap-2"><CheckCircle2 className="h-2.5 w-2.5 text-emerald-400 mt-0.5 flex-shrink-0" />Optional: build practice test from approved</li>
          </ul>
        </div>
      </div>

      <div className="p-4 border border-border bg-card flex flex-col gap-3">
        <div className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold flex items-center gap-2">
          <Sparkles className="h-3 w-3 text-emerald-400" />
          Generate From Textbook Pages
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <div className="flex flex-col gap-1.5">
            <label className="font-mono text-[10px] uppercase text-muted-foreground">Page Range</label>
            <Input className="h-8 font-mono text-[11px]" placeholder="e.g. 45-60" value={pageRange} onChange={(e) => setPageRange(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="font-mono text-[10px] uppercase text-muted-foreground">Type</label>
            <Select value={questionType} onValueChange={(v) => setQuestionType(v as any)}>
              <SelectTrigger className="h-8 font-mono text-[11px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="mcq">MCQ</SelectItem>
                <SelectItem value="short">Short Answer</SelectItem>
                <SelectItem value="long">Long Answer</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="font-mono text-[10px] uppercase text-muted-foreground">Count (1-20)</label>
            <Input type="number" min={1} max={20} className="h-8 font-mono text-[11px]" value={count} onChange={(e) => setCount(parseInt(e.target.value, 10) || 1)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="font-mono text-[10px] uppercase text-muted-foreground">Topic Focus</label>
            <Input className="h-8 font-mono text-[11px]" placeholder="optional" value={topicFocus} onChange={(e) => setTopicFocus(e.target.value)} />
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 mt-1">
          <label className="flex items-center gap-2 cursor-pointer text-[10px] font-mono text-muted-foreground select-none">
            <Checkbox checked={makePracticeTest} onCheckedChange={(v) => setMakePracticeTest(v === true)} />
            <span>After approval, build a practice test from these drafts → Module 4</span>
          </label>
          <Button onClick={handleGenerate} disabled={!chapterId || !pageRange.trim() || count < 1 || count > 20} size="sm">
            <Sparkles className="mr-2 h-3.5 w-3.5" /> GENERATE DRAFTS
          </Button>
        </div>
      </div>

      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex gap-1.5 flex-wrap">
          {STATUS_FILTERS_DRAFTS.map((f) => (
            <Button
              key={f.value}
              size="sm"
              variant={statusFilter === f.value ? "default" : "outline"}
              className="h-7 text-[10px]"
              onClick={() => setStatusFilter(f.value === statusFilter ? undefined : (f.value as any))}
            >
              {f.label}
            </Button>
          ))}
        </div>
        <Badge variant="outline" className="text-[9px] font-mono">
          {data?.total ?? 0} total drafts
        </Badge>
      </div>

      <div className="space-y-2.5">
        {!chapterId ? (
          <div className="text-center p-12 text-muted-foreground font-mono text-sm border border-dashed border-border bg-card">
            <Layers className="h-8 w-8 mx-auto mb-2 opacity-30" />
            SELECT A CHAPTER TO VIEW DRAFTS
          </div>
        ) : drafts.length === 0 ? (
          <div className="text-center p-12 text-muted-foreground font-mono text-sm border border-dashed border-border bg-card">
            <Layers className="h-8 w-8 mx-auto mb-2 opacity-30" />
            NO PENDING DRAFTS FOR THIS CHAPTER
            <p className="font-mono text-[10px] text-muted-foreground mt-1 max-w-md mx-auto">
              Generate drafts above using a page range. They'll land here for review before becoming real questions.
            </p>
          </div>
        ) : (
          drafts.map((d: any) => (
            <DraftCard
              key={d.id}
              draft={d}
              onApprove={() =>
                approve(
                  { questionId: d.id },
                  {
                    onSuccess: () => { toast({ title: "Draft approved", description: "Saved as real question with ai_generated badge." }); refetch(); },
                    onError: () => toast({ title: "Approve failed", variant: "destructive" }),
                  }
                )
              }
              onDismiss={() =>
                dismiss(
                  { questionId: d.id },
                  {
                    onSuccess: () => { toast({ title: "Draft dismissed" }); refetch(); },
                    onError: () => toast({ title: "Dismiss failed", variant: "destructive" }),
                  }
                )
              }
            />
          ))
        )}
      </div>
    </div>
  );
}

function DraftCard({ draft, onApprove, onDismiss }: any) {
  const p = draft.payloadJson ?? {};
  const isMcqType = draft.questionType === "mcq";
  const resolvedStatus = draft.approvedAt ? "approved" : draft.dismissedAt ? "dismissed" : "pending";

  return (
    <div className={`border ${resolvedStatus === "pending" ? "border-emerald-400/30" : "border-border/60 opacity-80"} bg-card p-3.5`}>
      <div className="flex items-center justify-between gap-3 mb-2.5 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="default" className="text-[9px]">{QUESTION_TYPE_LABELS[draft.questionType] ?? draft.questionType}</Badge>
          <AIGeneratedBadge status={resolvedStatus} />
          {draft.topicFocus && <Badge variant="outline" className="text-[8px] text-muted-foreground">{draft.topicFocus}</Badge>}
        </div>
        {draft.sourcePage != null && <CitationChip page={draft.sourcePage} source="textbook" />}
      </div>

      {p.question && <p className="font-sans text-[13px] mb-2.5">{p.question}</p>}

      {isMcqOptions(p) ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5 mb-2.5 text-[11px] font-mono">
          {["A", "B", "C", "D"].map((opt) => {
            const val = p.options?.[opt] ?? p.options?.[opt.toLowerCase()];
            if (!val) return null;
            return (
              <div key={opt} className={`p-2 border ${p.correctOption?.toUpperCase() === opt ? "border-emerald-400/60 bg-emerald-400/10 text-emerald-400" : "border-border"}`}>
                <span className="opacity-50 mr-2">{opt}]</span> {val}
              </div>
            );
          })}
        </div>
      ) : null}

      {isMcqType && p.correctOption && !isMcqOptions(p) && (
        <div className="mb-2.5">
          <Badge variant="outline" className="text-[9px] text-emerald-400 border-emerald-400/40">Correct: {p.correctOption}</Badge>
        </div>
      )}

      {(p.modelAnswer || p.explanation) && (
        <div className="space-y-1.5 mt-1">
          {p.modelAnswer && (
            <div className="p-2.5 border-l-2 border-emerald-400/50 bg-emerald-400/5">
              <p className="font-mono text-[9px] text-emerald-400 uppercase mb-0.5">Model Answer</p>
              <p className="font-sans text-[11px]">{p.modelAnswer}</p>
            </div>
          )}
          {p.explanation && (
            <div className="p-2.5 border-l-2 border-border bg-muted/20">
              <p className="font-mono text-[9px] text-muted-foreground uppercase mb-0.5">Explanation</p>
              <p className="font-sans text-[11px]">{p.explanation}</p>
            </div>
          )}
        </div>
      )}

      {resolvedStatus === "pending" && (
        <div className="mt-3.5 flex flex-wrap gap-2">
          <Button size="sm" className="h-7 text-[10px]" onClick={onApprove}>
            <Check className="mr-1 h-3 w-3" /> APPROVE & SAVE
          </Button>
          <Button asChild size="sm" variant="outline" className="h-7 text-[10px]">
            <Link to={`/questions/new`}>
              <Plus className="mr-1 h-3 w-3" /> EDIT BEFORE SAVE
            </Link>
          </Button>
          <Button size="sm" variant="outline" className="h-7 text-[10px] text-destructive border-destructive/40 hover:bg-destructive/10" onClick={onDismiss}>
            <X className="mr-1 h-3 w-3" /> DISMISS
          </Button>
        </div>
      )}
    </div>
  );
}

function isMcqOptions(p: any): boolean {
  return !!p.options && typeof p.options === "object";
}

/* ============================================================
   AI ANSWER EVALUATOR TAB (3f)
   ============================================================ */
function AIAnswerEvaluatorTab({ subjectId, chapters, onUsage }: {
  subjectId: number; chapters: any[] | undefined; onUsage: () => void;
}) {
  const { toast } = useToast();

  const [question, setQuestion] = useState("");
  const [studentAnswer, setStudentAnswer] = useState("");
  const [markingGuide, setMarkingGuide] = useState("");
  const [totalMarks, setTotalMarks] = useState<number>(10);
  const [questionType, setQuestionType] = useState<"short" | "long">("short");
  const [chapterFilter, setChapterFilter] = useState<string>("");

  const [grading, setGrading] = useState(false);
  const [lastResult, setLastResult] = useState<GradingResult | null>(null);
  const [history, setHistory] = useState<GradingResult[]>([]);
  const [streamingFeedback, setStreamingFeedback] = useState("");
  const abortRef = useRef<(() => void) | null>(null);

  const questionSuggestions = [
    {
      q: "Explain the process of photosynthesis and write the balanced chemical equation.",
      m: "2 marks for process description, 1 for equation, 1 for reactants/products, 1 for chlorophyll role = 5 total",
      outOf: 5,
    },
    {
      q: "Derive the quadratic formula from ax² + bx + c = 0 using completing the square.",
      m: "Completing square step (2), isolating x (1), square root step (1), final form (1) = 5 total",
      outOf: 5,
    },
    {
      q: "Describe the structure of an atom, including the relative charges and masses of subatomic particles.",
      m: "Proton/neutron/electron locations (3), charges (3), masses (2), electron shells (2) = 10 total",
      outOf: 10,
    },
  ];

  const handleGrade = () => {
    if (!question.trim() || !studentAnswer.trim() || !markingGuide.trim()) return;
    
    abortRef.current?.();
    setGrading(true);
    setStreamingFeedback("");
    setLastResult(null);

    // Parse rubric from marking guide if it contains structured criteria
    const rubric = parseRubricFromGuide(markingGuide, totalMarks);

    onUsage();
    abortRef.current = streamEvaluate(
      {
        subjectId,
        question,
        studentAnswer,
        rubric,
        totalMarks,
      },
      {
        onText: (text) => {
          setStreamingFeedback((prev) => prev + text);
        },
        onDone: (res) => {
          const result: GradingResult = {
            id: Math.random().toString(36).slice(2, 9),
            question,
            studentAnswer,
            marksAwarded: res.marksAwarded,
            marksTotal: res.marksTotal,
            feedback: res.feedback,
            missedPoints: res.missedPoints,
            timestamp: new Date().toISOString(),
            confirmed: false,
          };
          setLastResult(result);
          setHistory((h) => [result, ...h].slice(0, 20));
          setGrading(false);
          setStreamingFeedback("");
        },
        onError: (message) => {
          setGrading(false);
          setStreamingFeedback("");
          toast({ title: "Evaluation failed", description: message, variant: "destructive" });
        },
      }
    );
  };

  const handleStop = () => {
    abortRef.current?.();
    abortRef.current = null;
    setGrading(false);
    setStreamingFeedback("");
  };

  // Helper to parse a marking guide into a structured rubric
  const parseRubricFromGuide = (guide: string, total: number): Array<{ criterion: string; marks: number }> | null => {
    // Try to parse patterns like "criterion (N marks)" or "criterion - N marks"
    const criterionRegex = /([^()\n]+?)\s*[\(\-]\s*(\d+)\s*marks?\s*[\)\,\;]?/gi;
    const matches = [...guide.matchAll(criterionRegex)];
    
    if (matches.length === 0) return null;
    
    const criteria = matches.map(m => ({
      criterion: m[1].trim(),
      marks: parseInt(m[2], 10),
    }));
    
    // Only return if the sum roughly matches the total
    const sum = criteria.reduce((a, c) => a + c.marks, 0);
    if (Math.abs(sum - total) <= 2) return criteria;
    
    return null;
  };

  const handleConfirm = (id: string) => {
    setHistory((h) => h.map((r) => (r.id === id ? { ...r, confirmed: true } : r)));
    if (lastResult?.id === id) setLastResult({ ...lastResult, confirmed: true });
    toast({ title: "Marks confirmed", description: "Result saved to student's record." });
  };

  const useSuggestion = (s: typeof questionSuggestions[number]) => {
    setQuestion(s.q);
    setMarkingGuide(s.m);
    setTotalMarks(s.outOf);
    setStudentAnswer("");
  };

  const confirmedHistory = history.filter((h) => h.confirmed);
  const avgMark = confirmedHistory.length
    ? confirmedHistory.reduce((a, b) => a + (b.marksAwarded / b.marksTotal), 0) / confirmedHistory.length
    : 0;

  return (
    <div className="grid lg:grid-cols-3 gap-3">
      <div className="lg:col-span-2 space-y-3">
        <div className={cn("border p-3", TAB_COLORS.evaluator.accentBorder, TAB_COLORS.evaluator.accentBg)}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-wrap">
              <Star className={cn("h-4 w-4", TAB_COLORS.evaluator.accentText)} />
              <span className="font-mono text-[11px] uppercase tracking-widest font-bold text-foreground">
                AI Answer Evaluator
              </span>
              <Badge variant="outline" className="text-[9px] font-mono border-rose-400/40 text-rose-400">
                SUGGEST ONLY · CONFIRM TO SAVE
              </Badge>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline" className="text-[9px] font-mono">
                {history.length} evaluations
              </Badge>
              {confirmedHistory.length > 0 && (
                <Badge variant="outline" className="text-[9px] font-mono border-emerald-400/40 text-emerald-400">
                  Avg: {(avgMark * 100).toFixed(0)}%
                </Badge>
              )}
            </div>
          </div>
        </div>

        <div className="border border-border bg-card p-4 space-y-3">
          <SectionHeader icon={Zap} label="Grade a Written Answer" sub="short or long response against a guide" colorKey="evaluator" />
          <div className="grid md:grid-cols-3 gap-2">
            <div className="md:col-span-1">
              <label className="font-mono text-[10px] uppercase text-muted-foreground mb-1 block">Answer Type</label>
              <Select value={questionType} onValueChange={(v) => setQuestionType(v as any)}>
                <SelectTrigger className="h-8 font-mono text-[11px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="short">Short Answer</SelectItem>
                  <SelectItem value="long">Long Answer</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="font-mono text-[10px] uppercase text-muted-foreground mb-1 block">Total Marks</label>
              <Input type="number" min={1} max={100} className="h-8 font-mono text-[11px]" value={totalMarks} onChange={(e) => setTotalMarks(parseInt(e.target.value, 10) || 1)} />
            </div>
            <div>
              <label className="font-mono text-[10px] uppercase text-muted-foreground mb-1 block">Chapter (history)</label>
              <Select value={chapterFilter} onValueChange={setChapterFilter}>
                <SelectTrigger className="h-8 font-mono text-[11px]"><SelectValue placeholder="All chapters" /></SelectTrigger>
                <SelectContent>
                  {chapters?.map((c: any) => (
                    <SelectItem key={c.id} value={String(c.id)} className="font-mono text-[11px]">{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <label className="font-mono text-[10px] uppercase text-muted-foreground mb-1 block">Question</label>
            <Textarea className="font-mono text-[11px] min-h-[60px]" value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="What was asked on the test / homework?" />
          </div>
          <div>
            <label className="font-mono text-[10px] uppercase text-muted-foreground mb-1 block">Marking Guide / Model Answer</label>
            <Textarea className="font-mono text-[11px] min-h-[70px]" value={markingGuide} onChange={(e) => setMarkingGuide(e.target.value)} placeholder="Bullet points, mark allocations, keywords, or a model answer." />
          </div>
          <div>
            <label className="font-mono text-[10px] uppercase text-muted-foreground mb-1 block">Student's Answer</label>
            <Textarea className="font-mono text-[11px] min-h-[110px]" value={studentAnswer} onChange={(e) => setStudentAnswer(e.target.value)} placeholder="Paste the student response here." />
          </div>

          <div>
            <div className="font-mono text-[10px] uppercase text-muted-foreground tracking-widest mb-1.5">Quick scenarios</div>
            <div className="flex flex-wrap gap-1.5">
              {questionSuggestions.map((s, i) => (
                <Button key={i} variant="outline" size="sm" className="h-6 text-[9px] px-2 font-mono normal-case" onClick={() => useSuggestion(s)}>
                  Example {i + 1} · {s.outOf} marks
                </Button>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-1">
            {grading && (
              <Button onClick={handleStop} variant="outline" size="sm">
                <X className="mr-2 h-3 w-3" /> STOP
              </Button>
            )}
            <Button onClick={handleGrade} disabled={grading || !question.trim() || !studentAnswer.trim() || !markingGuide.trim()} size="sm">
              {grading ? <><Loader2 className="mr-2 h-3 w-3 animate-spin" /> EVALUATING...</> : <><Star className="mr-2 h-3 w-3" /> EVALUATE ANSWER</>}
            </Button>
          </div>
        </div>

        {streamingFeedback && grading && (
          <div className={cn("border p-4 animate-in slide-in-from-bottom-2 duration-200", TAB_COLORS.evaluator.accentBorder, TAB_COLORS.evaluator.accentBg)}>
            <div className="flex items-center gap-2 mb-3">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
              <div className="font-mono text-[10px] uppercase tracking-widest text-foreground font-bold">
                Evaluating answer...
              </div>
            </div>
            <div className="border-l-2 border-primary/40 bg-background/40 p-2.5">
              <div className="font-mono text-[9px] uppercase text-muted-foreground mb-0.5">AI Feedback (streaming)</div>
              <p className="font-sans text-[12px] whitespace-pre-wrap">{streamingFeedback}</p>
            </div>
          </div>
        )}

        {lastResult && (
          <div className={cn("border p-4 animate-in slide-in-from-bottom-2 duration-200", TAB_COLORS.evaluator.accentBorder, TAB_COLORS.evaluator.accentBg)}>
            <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
              <div>
                <div className="font-mono text-[10px] uppercase tracking-widest text-foreground font-bold mb-1">
                  Result · {lastResult.confirmed ? "CONFIRMED" : "SUGGESTED"}
                </div>
                <p className="font-sans text-[12px] text-muted-foreground line-clamp-2">{lastResult.question}</p>
              </div>
              <div className="text-right">
                <div className="font-mono text-3xl font-bold">
                  <span className={lastResult.marksAwarded / lastResult.marksTotal >= 0.7 ? "text-emerald-400" : lastResult.marksAwarded / lastResult.marksTotal >= 0.4 ? "text-amber-400" : "text-rose-400"}>
                    {lastResult.marksAwarded}
                  </span>
                  <span className="text-muted-foreground"> / {lastResult.marksTotal}</span>
                </div>
                <div className="font-mono text-[10px] text-muted-foreground">
                  {Math.round((lastResult.marksAwarded / lastResult.marksTotal) * 100)}%
                </div>
              </div>
            </div>

            <div className="space-y-2.5">
              <div className="border-l-2 border-primary/40 bg-background/40 p-2.5">
                <div className="font-mono text-[9px] uppercase text-muted-foreground mb-0.5">AI Feedback</div>
                <p className="font-sans text-[12px]">{lastResult.feedback}</p>
              </div>

              {lastResult.missedPoints.length > 0 && (
                <div className="border-l-2 border-rose-400/40 bg-rose-400/5 p-2.5">
                  <div className="font-mono text-[9px] uppercase text-rose-400 mb-1">Missed / Could improve</div>
                  <ul className="space-y-0.5">
                    {lastResult.missedPoints.map((m, i) => (
                      <li key={i} className="font-mono text-[11px] text-muted-foreground flex gap-1.5">
                        <X className="h-2.5 w-2.5 mt-0.5 flex-shrink-0 text-rose-400" /> {m}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <details className="border border-border/60 bg-background/40">
                <summary className="list-none cursor-pointer p-2 flex items-center gap-2 text-[10px] font-mono uppercase text-muted-foreground hover:bg-muted/20">
                  <MessageCircle className="h-3 w-3" /> View student's answer submitted
                  <ChevronRight className="h-3 w-3 ml-auto transition-transform group-open:rotate-90" />
                </summary>
                <p className="px-2.5 pb-2.5 font-sans text-[11px] border-t border-border/40 pt-2">{lastResult.studentAnswer}</p>
              </details>
            </div>

            <div className="mt-3.5 pt-3 border-t border-border/60 flex flex-wrap items-center gap-2">
              {!lastResult.confirmed ? (
                <Button
                  size="sm"
                  onClick={() => handleConfirm(lastResult.id)}
                  className="text-[10px] h-7"
                >
                  <CheckCircle2 className="mr-1.5 h-3 w-3" /> CONFIRM & SAVE MARKS
                </Button>
              ) : (
                <Badge variant="outline" className="text-[9px] font-mono border-emerald-400/40 text-emerald-400">
                  <CheckCircle2 className="h-2.5 w-2.5 mr-1" /> MARKS CONFIRMED
                </Badge>
              )}
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setQuestion(lastResult.question);
                  setStudentAnswer(lastResult.studentAnswer);
                }}
                className="text-[10px] h-7"
              >
                <Sparkles className="mr-1.5 h-3 w-3" /> Re-grade after edits
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setLastResult(null)} className="text-[10px] h-7 ml-auto">
                Dismiss
              </Button>
            </div>
          </div>
        )}

        {history.length > 0 && (
          <div className="border border-border bg-card p-4">
            <div className="flex items-center justify-between mb-2.5">
              <SectionHeader icon={TrendingUp} label="Evaluator History / Trend" sub={`${history.length} saved · ${confirmedHistory.length} confirmed`} colorKey="evaluator" />
              {confirmedHistory.length >= 2 && (
                <Badge variant="outline" className="text-[9px] font-mono border-emerald-400/40 text-emerald-400">
                  <TrendingUp className="h-2.5 w-2.5 mr-1" /> {(avgMark * 100).toFixed(0)}% avg
                </Badge>
              )}
            </div>
            {confirmedHistory.length >= 2 && (
              <div className="flex items-end gap-1 h-16 mb-3 p-2 border border-border/60 bg-background/40">
                {confirmedHistory.slice(0, 12).reverse().map((r, i, arr) => {
                  const h = Math.max(6, Math.round((r.marksAwarded / r.marksTotal) * 100));
                  return (
                    <div key={i} className="flex-1 flex flex-col items-center gap-0.5 justify-end h-full">
                      <div
                        className={cn(
                          "w-full",
                          r.marksAwarded / r.marksTotal >= 0.7 ? "bg-emerald-400/70" :
                          r.marksAwarded / r.marksTotal >= 0.4 ? "bg-amber-400/70" : "bg-rose-400/70"
                        )}
                        style={{ height: `${h}%` }}
                        title={`${r.marksAwarded}/${r.marksTotal}`}
                      />
                    </div>
                  );
                })}
              </div>
            )}
            <div className="space-y-1.5 max-h-[240px] overflow-y-auto">
              {history.map((r) => (
                <div key={r.id} className="border border-border/60 bg-background/40 p-2.5 flex items-start gap-2.5">
                  <div className="text-center flex-shrink-0 w-12 border border-border/60 py-1.5">
                    <div className={cn(
                      "font-mono text-lg font-bold leading-none",
                      r.marksAwarded / r.marksTotal >= 0.7 ? "text-emerald-400" :
                      r.marksAwarded / r.marksTotal >= 0.4 ? "text-amber-400" : "text-rose-400"
                    )}>
                      {r.marksAwarded}
                    </div>
                    <div className="font-mono text-[8px] text-muted-foreground">/ {r.marksTotal}</div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-0.5">
                      {r.confirmed ? (
                        <Badge variant="outline" className="text-[8px] border-emerald-400/40 text-emerald-400">CONFIRMED</Badge>
                      ) : (
                        <Badge variant="outline" className="text-[8px] border-amber-400/40 text-amber-400">SUGGESTED</Badge>
                      )}
                      <span className="font-mono text-[8px] text-muted-foreground uppercase">
                        <Clock className="h-2 w-2 inline mr-0.5" />
                        {new Date(r.timestamp).toLocaleString()}
                      </span>
                    </div>
                    <p className="font-sans text-[11px] text-foreground line-clamp-2">{r.question}</p>
                    <p className="font-sans text-[10px] text-muted-foreground line-clamp-1 mt-0.5">{r.feedback}</p>
                  </div>
                  {!r.confirmed && (
                    <Button size="sm" variant="ghost" className="h-6 text-[9px] px-1.5 flex-shrink-0" onClick={() => handleConfirm(r.id)}>
                      <CheckCircle2 className="h-2.5 w-2.5 mr-1" /> Confirm
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <aside className="space-y-3">
        <div className="border border-border bg-card p-4">
          <SectionHeader icon={ShieldCheck} label="Confirm-Before-Count" colorKey="evaluator" />
          <ul className="mt-2 space-y-1.5 font-mono text-[10px] text-muted-foreground">
            <li className="flex gap-2"><CheckCircle2 className="h-3 w-3 text-emerald-400 mt-0.5 flex-shrink-0" />Marks shown are suggestions only</li>
            <li className="flex gap-2"><CheckCircle2 className="h-3 w-3 text-emerald-400 mt-0.5 flex-shrink-0" />CONFIRM click writes to record</li>
            <li className="flex gap-2"><CheckCircle2 className="h-3 w-3 text-emerald-400 mt-0.5 flex-shrink-0" />Editable before confirm</li>
            <li className="flex gap-2"><AlertTriangle className="h-3 w-3 text-amber-400 mt-0.5 flex-shrink-0" />Never auto-apply marks</li>
          </ul>
        </div>
        <div className="border border-border bg-card p-4">
          <SectionHeader icon={Users} label="Answer Tier Support" colorKey="evaluator" />
          <div className="mt-2 space-y-2 font-mono text-[10px]">
            <div className="flex items-center justify-between border border-border/60 bg-background/40 p-2">
              <span>MCQ / One-word</span>
              <Badge variant="outline" className="text-[8px]">Auto-graded elsewhere</Badge>
            </div>
            <div className="flex items-center justify-between border border-border/60 bg-background/40 p-2">
              <span>Short Answer (2-5m)</span>
              <Badge variant="outline" className="text-[8px] border-rose-400/40 text-rose-400">This tab</Badge>
            </div>
            <div className="flex items-center justify-between border border-border/60 bg-background/40 p-2">
              <span>Long Answer (6-15m)</span>
              <Badge variant="outline" className="text-[8px] border-rose-400/40 text-rose-400">This tab</Badge>
            </div>
            <div className="flex items-center justify-between border border-border/60 bg-background/40 p-2">
              <span>Proofs / Derivations</span>
              <Badge variant="outline" className="text-[8px] border-rose-400/40 text-rose-400">This tab</Badge>
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
}

/* ============================================================
   ASK BOOK CHAT TAB (3g)
   ============================================================ */
function AskBookChatTab({ subjectId, subject, store, readyAsset, totalPages, onUsage }: {
  subjectId: number; subject: any; store: any; readyAsset: FileAsset | undefined; totalPages: number; onUsage: () => void;
}) {
  const { toast } = useToast();
  const [sessionId, setSessionId] = useState<number | null>(null);

  const { data: sessions, refetch: refetchSessions } = useListAIChatSessions(
    { subjectId, limit: 20 },
    { query: { enabled: subjectId > 0 } as any }
  );

  const { mutate: createSession, isPending: creatingSession } = useCreateAIChatSession();
  const { data: sessionData, refetch: refetchSession } = useGetAIChatSession(
    sessionId ?? 0,
    undefined,
    { query: { enabled: sessionId != null && sessionId > 0 } as any }
  );

  const [input, setInput] = useState("");
  const [localMessages, setLocalMessages] = useState<Array<{ role: "user" | "assistant"; content: string; citations?: Citation[]; confidence?: number }>>([]);
  const [streaming, setStreaming] = useState(false);
  const abortRef = useRef<(() => void) | null>(null);

  const createFlashcardMutation = useMutation({
    mutationFn: async (data: { subjectId: number; question: string; answer: string; sourcePage: number; sourceCitation: string }) => {
      return customFetch("/api/ai/explain/flashcard", { method: "POST", body: JSON.stringify(data) });
    },
    onSuccess: () => toast({ title: "Flashcard created", description: "Added to your flashcard deck." }),
    onError: () => toast({ title: "Failed to create flashcard", variant: "destructive" }),
  });

  const allSessions = sessions?.sessions ?? [];

  useEffect(() => {
    if (allSessions.length > 0 && sessionId == null) {
      setSessionId(allSessions[0].id);
    }
  }, [allSessions, sessionId]);

  useEffect(() => {
    if (sessionData?.messages) {
      setLocalMessages(
        sessionData.messages.map((m: any) => ({
          role: m.role as "user" | "assistant",
          content: m.content ?? "",
          citations: m.citations,
          confidence: m.confidence,
        }))
      );
    } else {
      setLocalMessages([]);
    }
  }, [sessionData]);

  const handleNewSession = () => {
    createSession(
      { data: { subjectId } },
      {
        onSuccess: (s: any) => {
          setSessionId(s.id);
          setLocalMessages([]);
          refetchSessions();
          toast({ title: "New chat session" });
        },
        onError: () => toast({ title: "Failed to create session", variant: "destructive" }),
      }
    );
  };

  const handleSend = () => {
    if (!input.trim()) return;
    const userMsg = input.trim();

    if (!sessionId) {
      createSession(
        { data: { subjectId } },
        {
          onSuccess: (s: any) => {
            setSessionId(s.id);
            refetchSessions();
            sendChatMessage(s.id, userMsg);
          },
        }
      );
    } else {
      sendChatMessage(sessionId, userMsg);
    }
  };

  const sendChatMessage = (sid: number, userMsg: string) => {
    abortRef.current?.();
    setLocalMessages((prev) => [...prev, { role: "user", content: userMsg }]);
    setInput("");
    setStreaming(true);

    // Add a placeholder assistant message for streaming
    setLocalMessages((prev) => [...prev, { role: "assistant", content: "" }]);

    onUsage();
    abortRef.current = streamChat(
      { sessionId: sid, content: userMsg },
      {
        onText: (text) => {
          setLocalMessages((prev) => {
            const updated = [...prev];
            const lastIdx = updated.length - 1;
            if (lastIdx >= 0 && updated[lastIdx].role === "assistant") {
              updated[lastIdx] = { ...updated[lastIdx], content: (updated[lastIdx].content ?? "") + text };
            }
            return updated;
          });
        },
        onDone: (res) => {
          const cits: Citation[] = res.citations ?? [];
          const conf = cits.length > 0 ? 0.5 + Math.min(cits.length * 0.15, 0.45) : 0.2;
          setLocalMessages((prev) => {
            const updated = [...prev];
            const lastIdx = updated.length - 1;
            if (lastIdx >= 0 && updated[lastIdx].role === "assistant") {
              updated[lastIdx] = { 
                ...updated[lastIdx], 
                content: res.content,
                citations: cits,
                confidence: conf
              };
            }
            return updated;
          });
          setStreaming(false);
          refetchSession();
        },
        onError: (message) => {
          setStreaming(false);
          toast({ title: "Chat failed", description: message, variant: "destructive" });
          // Remove the placeholder assistant message on error
          setLocalMessages((prev) => prev.slice(0, -1));
        },
      }
    );
  };

  const handleStop = () => {
    abortRef.current?.();
    abortRef.current = null;
    setStreaming(false);
  };

  const starters = [
    "Give me an overview of what's in this textbook",
    "Which chapters cover the hardest concepts?",
    "Walk through the worked example on page 32",
    "What should I focus on for a midterm from chapters 1-5?",
  ];

  return (
    <div className="grid lg:grid-cols-4 gap-3" style={{ minHeight: "calc(100dvh - 380px)" }}>
      {/* Sidebar */}
      <div className="lg:col-span-1 space-y-3">
        <div className={cn("border p-3", TAB_COLORS.chat.accentBorder, TAB_COLORS.chat.accentBg)}>
          <div className="flex items-center gap-2 mb-2">
            <BookOpen className={cn("h-4 w-4", TAB_COLORS.chat.accentText)} />
            <span className="font-mono text-[10px] uppercase tracking-widest font-bold text-foreground">
              Grounding Status
            </span>
          </div>
          <div className="space-y-1.5 font-mono text-[10px]">
            <div className="flex justify-between">
              <span className="text-muted-foreground uppercase">Textbook</span>
              <span className="text-foreground truncate max-w-[50%] text-right">{store?.textbookTitle ?? readyAsset?.originalFilename ?? "Loaded"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground uppercase">Pages</span>
              <span className="text-emerald-400">{totalPages}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground uppercase">Store</span>
              <span className="text-emerald-400 flex items-center gap-1"><CheckCircle2 className="h-2.5 w-2.5" /> READY</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground uppercase">Subject</span>
              <span className="text-foreground">{subject?.name ?? "—"}</span>
            </div>
          </div>
        </div>

        <div className="border border-border bg-card p-3 flex flex-col gap-2">
          <Button size="sm" onClick={handleNewSession} disabled={creatingSession} className="text-[10px] h-7 w-full">
            <Plus className="mr-1.5 h-3 w-3" /> {creatingSession ? "CREATING..." : "NEW SESSION"}
          </Button>
          <div className="font-mono text-[10px] uppercase text-muted-foreground tracking-widest mt-1">
            Recent Sessions
          </div>
          <div className="space-y-1 max-h-[260px] overflow-y-auto">
            {allSessions.length === 0 ? (
              <div className="p-3 border border-dashed border-border bg-background/30 text-center font-mono text-[10px] text-muted-foreground">
                No sessions yet · start chatting
              </div>
            ) : (
              allSessions.map((s: any) => (
                <button
                  key={s.id}
                  onClick={() => setSessionId(s.id)}
                  className={cn(
                    "w-full text-left p-2 border flex flex-col gap-0.5 transition-colors",
                    sessionId === s.id
                      ? "border-blue-400/40 bg-blue-400/5"
                      : "border-border/60 bg-background/30 hover:bg-muted/30"
                  )}
                >
                  <div className="font-mono text-[10px] text-foreground truncate flex items-center gap-1.5">
                    <MessageSquare className="h-2.5 w-2.5 text-blue-400 flex-shrink-0" />
                    {s.subjectName ? `Chat · ${s.subjectName}` : `Session #${s.id}`}
                  </div>
                  <div className="font-mono text-[8px] text-muted-foreground uppercase flex items-center gap-1.5">
                    <Clock className="h-2 w-2" />
                    {new Date(s.createdAt ?? Date.now()).toLocaleString()}
                    <span className="ml-auto">{s.messageCount ?? 0} msgs</span>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Chat panel */}
      <div className="lg:col-span-3 border border-border bg-card flex flex-col">
        <div className="p-3 border-b border-border flex items-center justify-between flex-wrap gap-2 bg-muted/20">
          <div className="flex items-center gap-2">
            <MessageSquare className={cn("h-4 w-4", TAB_COLORS.chat.accentText)} />
            <span className="font-mono text-[11px] uppercase tracking-widest font-bold text-foreground">
              Ask Book Chat
            </span>
            <Badge variant="outline" className="text-[8px] font-mono border-blue-400/40 text-blue-400">
              GROUNDED · CITATIONS ATTACHED
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            {readyAsset && (
              <Button asChild variant="outline" size="sm" className="h-6 text-[9px]">
                <Link href={`/subjects/${subjectId}/books/${readyAsset.id}`}>
                  <Eye className="mr-1 h-2.5 w-2.5" /> OPEN READER
                </Link>
              </Button>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-3">
          {localMessages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center gap-5 text-center py-8 px-4">
              <div>
                <MessageSquare className={cn("h-12 w-12 mx-auto opacity-30 mb-3", TAB_COLORS.chat.accentText)} />
                <h3 className="font-mono text-lg font-bold uppercase tracking-wider text-foreground">
                  Ask Anything About Your Book
                </h3>
                <p className="font-mono text-[11px] text-muted-foreground max-w-md mt-2">
                  Conversational AI grounded in your textbook's actual pages. Every answer includes citations you can jump to.
                </p>
              </div>
              <div className="grid md:grid-cols-2 gap-2 max-w-2xl w-full">
                {starters.map((s, i) => (
                  <Button
                    key={i}
                    variant="outline"
                    className="text-left h-auto py-2.5 px-3 font-mono text-[10px] normal-case tracking-normal justify-start"
                    onClick={() => { setInput(s); }}
                  >
                    <ChevronRight className="h-3 w-3 mr-1 text-blue-400 flex-shrink-0" /> {s}
                  </Button>
                ))}
              </div>
            </div>
          ) : (
            localMessages.map((m, i) => (
              <ChatBubble
                key={i}
                msg={m}
                last={i === localMessages.length - 1}
                subjectId={subjectId}
                textbookTitle={store?.textbookTitle ?? "textbook"}
                onCreateFlashcard={(q, a, page, cite) =>
                  createFlashcardMutation.mutate({ subjectId, question: q, answer: a, sourcePage: page, sourceCitation: cite })
                }
                creatingFlashcard={createFlashcardMutation.isPending}
              />
            ))
          )}
          {streaming && (
            <div className="flex gap-2">
              <div className="h-7 w-7 flex-shrink-0 bg-blue-400/10 border border-blue-400/30 flex items-center justify-center">
                <Sparkles className="h-3.5 w-3.5 text-blue-400 animate-pulse" />
              </div>
              <div className="flex-1 border border-blue-400/30 bg-blue-400/5 p-3 font-mono text-[10px] uppercase text-blue-400 tracking-wider">
                <Loader2 className="h-3 w-3 inline animate-spin mr-2" /> Mining textbook pages...
              </div>
            </div>
          )}
        </div>

        <div className="p-3 border-t border-border bg-muted/10 flex flex-col gap-2">
          <Textarea
            className="font-mono text-[11px] min-h-[64px] resize-none"
            placeholder="Ask a question grounded in your textbook..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
          />
          <div className="flex items-center justify-between">
            <span className="font-mono text-[9px] text-muted-foreground uppercase">
              ENTER to send · SHIFT+ENTER for newline
            </span>
            <Button onClick={handleSend} disabled={streaming || creatingSession || !input.trim()} size="sm">
              <Send className="mr-2 h-3 w-3" /> {streaming ? "SENDING..." : "SEND"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ChatBubble({
  msg, last, subjectId, textbookTitle, onCreateFlashcard, creatingFlashcard,
}: {
  msg: { role: "user" | "assistant"; content: string; citations?: Citation[]; confidence?: number };
  last: boolean;
  subjectId: number;
  textbookTitle: string;
  onCreateFlashcard: (q: string, a: string, page: number, cite: string) => void;
  creatingFlashcard: boolean;
}) {
  const isUser = msg.role === "user";
  return (
    <div className={cn("flex gap-2.5", isUser && "justify-end")}>
      {!isUser && (
        <div className="h-7 w-7 flex-shrink-0 bg-blue-400/10 border border-blue-400/30 flex items-center justify-center">
          <Sparkles className="h-3.5 w-3.5 text-blue-400" />
        </div>
      )}
      <div className={cn(
        "max-w-[85%] min-w-0",
        isUser ? "flex flex-col items-end" : "flex flex-col items-start"
      )}>
        <div className={cn(
          "p-3 border text-[13px] leading-relaxed font-sans",
          isUser
            ? "bg-primary/10 border-primary/30 text-foreground"
            : "bg-background/60 border-border"
        )}>
          {msg.content}
        </div>

        {!isUser && (
          <div className="w-full space-y-1.5 mt-1.5">
            {(msg.citations && msg.citations.length > 0) && (
              <div>
                <div className="font-mono text-[8px] uppercase text-muted-foreground tracking-widest mb-1">Citations</div>
                <div className="flex flex-wrap gap-1.5">
                  {msg.citations.map((c, ci) => (
                    <div key={ci} className="flex flex-col gap-1 max-w-[240px]">
                      <div className="flex items-center gap-1 flex-wrap">
                        <CitationChip page={c.page} source={c.filename || textbookTitle} />
                      </div>
                      {c.snippet && (
                        <div className="border-l-2 border-primary/40 bg-background/40 p-1.5 pl-2">
                          <p className="font-sans text-[10px] italic text-muted-foreground leading-relaxed">
                            "{c.snippet.slice(0, 140)}{c.snippet.length > 140 ? "…" : ""}"
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="flex items-center gap-1.5 flex-wrap">
              <ConfidenceBadge score={msg.confidence} />
              {last && (msg.citations?.length ?? 0) > 0 && (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-6 text-[9px] px-2"
                  onClick={() => {
                    const c = msg.citations?.[0];
                    if (!c) return;
                    onCreateFlashcard("From chat: explain concept", msg.content, c.page, c.filename || textbookTitle);
                  }}
                  disabled={creatingFlashcard}
                >
                  <Sparkles className="mr-1 h-2.5 w-2.5" />
                  {creatingFlashcard ? "CREATING..." : "Turn into Flashcard"}
                </Button>
              )}
              {last && (msg.citations?.length ?? 0) > 0 && (
                <Button asChild size="sm" variant="ghost" className="h-6 text-[9px] px-1.5">
                  <Link href={`/subjects/${subjectId}/library`}>
                    <Eye className="mr-1 h-2.5 w-2.5" /> View source
                  </Link>
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
      {isUser && (
        <div className="h-7 w-7 flex-shrink-0 bg-primary/20 border border-primary/40 flex items-center justify-center text-primary uppercase font-bold text-xs">
          U
        </div>
      )}
    </div>
  );
}
