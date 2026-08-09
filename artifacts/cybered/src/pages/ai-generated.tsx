import { useState } from "react";
import { useParams } from "wouter";
import { Link } from "wouter";
import { Shell } from "@/components/layout/shell";
import {
  useGetChapter,
  useGetSubject,
  useGenerateAIQuestions,
  useListAIGeneratedQuestions,
  useApproveAIGeneratedQuestion,
  useDismissAIGeneratedQuestion,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AIGeneratedBadge } from "@/components/ai/ai-generated-badge";
import { CitationChip } from "@/components/ai/citation-chip";
import { useToast } from "@/hooks/use-toast";
import { Sparkles, Check, X, FileQuestion, ArrowLeft, Layers } from "lucide-react";
import type { ReplyLanguage, } from "@/lib/ai-stream";
import { REPLY_LANGUAGES } from "@/lib/ai-stream";

const STATUS_FILTERS = [
  { value: "pending", label: "Unreviewed" },
  { value: "approved", label: "Approved" },
  { value: "dismissed", label: "Dismissed" },
];

const QUESTION_TYPE_LABELS: Record<string, string> = {
  mcq: "MCQ",
  short: "Short",
  long: "Long",
};

export default function GeneratedQuestionsReviewPage() {
  const { id } = useParams();
  const chapterId = parseInt(id ?? "0", 10);

  const { data: chapter } = useGetChapter(chapterId, {
    query: { enabled: !isNaN(chapterId) } as any,
  });
  const { data: subject } = useGetSubject(chapter?.subjectId ?? 0, {
    query: { enabled: !!chapter && !isNaN(chapter.subjectId) } as any,
  });

  const [statusFilter, setStatusFilter] = useState<"pending" | "approved" | "dismissed" | undefined>("pending");
  const { data, refetch } = useListAIGeneratedQuestions(chapterId, { status: statusFilter, limit: 100 }, {
    query: { enabled: !isNaN(chapterId) } as any,
  });

  const { mutate: generate } = useGenerateAIQuestions();
  const { mutate: approve } = useApproveAIGeneratedQuestion();
  const { mutate: dismiss } = useDismissAIGeneratedQuestion();
  const { toast } = useToast();

  const [pageRange, setPageRange] = useState("");
  const [questionType, setQuestionType] = useState<"mcq" | "short" | "long">("mcq");
  const [count, setCount] = useState(5);
  const [topicFocus, setTopicFocus] = useState("");
  const [difficulty, setDifficulty] = useState<"auto" | "easier" | "harder">("auto");
  const [language, setLanguage] = useState<ReplyLanguage>("auto");

  const handleGenerate = () => {
    if (!pageRange.trim() || count < 1 || count > 20) return;
    generate(
      {
        chapterId,
        data: {
          pageRange: pageRange.trim(),
          questionType,
          count,
          topicFocus: topicFocus.trim() || null,
          difficulty,
          language,
        },
      },
      {
        onSuccess: () => {
          toast({ title: "Drafts generated", description: "Ready for review." });
          setPageRange("");
          setTopicFocus("");
          refetch();
        },
        onError: () => toast({ title: "Generation failed", variant: "destructive" }),
      }
    );
  };

  const drafts = data?.drafts ?? [];

  return (
    <Shell>
      <div className="mb-4 border-b border-border pb-4 flex justify-between items-end">
        <div>
          <div className="flex items-center gap-3">
            <Button asChild size="sm" variant="outline" className="h-8 w-8 p-0">
              <Link href="/curriculum" title="Back to Curriculum">
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
            <h1 className="text-2xl font-bold font-mono text-primary uppercase tracking-widest">
              AI Question Drafts
            </h1>
          </div>
          <p className="text-muted-foreground font-mono text-xs mt-2 uppercase">
            {subject?.name ?? "Subject"} / {chapter?.name ?? "Chapter"} — review generated questions
          </p>
        </div>
        <Badge variant="outline" className="text-[10px] text-muted-foreground">
          {data?.total ?? 0} drafts
        </Badge>
      </div>

      {/* Generate form */}
      <div className="p-4 border border-border bg-card mb-4 flex flex-col gap-3">
        <div className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold flex items-center gap-2">
          <Sparkles className="h-3 w-3 text-teal" />
          Generate From Textbook Pages
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <div className="flex flex-col gap-1.5">
            <label className="font-mono text-[10px] uppercase text-muted-foreground">Page Range</label>
            <Input
              className="h-9 font-mono text-xs"
              placeholder="e.g. 45-60"
              value={pageRange}
              onChange={(e) => setPageRange(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="font-mono text-[10px] uppercase text-muted-foreground">Type</label>
            <Select value={questionType} onValueChange={(v) => setQuestionType(v as any)}>
              <SelectTrigger className="h-9 font-mono text-[10px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="mcq">MCQ</SelectItem>
                <SelectItem value="short">Short</SelectItem>
                <SelectItem value="long">Long</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="font-mono text-[10px] uppercase text-muted-foreground">Count (1-20)</label>
            <Input
              type="number"
              min={1}
              max={20}
              className="h-9 font-mono text-xs"
              value={count}
              onChange={(e) => setCount(parseInt(e.target.value, 10) || 1)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="font-mono text-[10px] uppercase text-muted-foreground">Topic Focus</label>
            <Input
              className="h-9 font-mono text-xs"
              placeholder="optional"
              value={topicFocus}
              onChange={(e) => setTopicFocus(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="font-mono text-[10px] uppercase text-muted-foreground">Difficulty</label>
            <Select value={difficulty} onValueChange={(v) => setDifficulty(v as any)}>
              <SelectTrigger className="h-9 font-mono text-[10px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="auto">Auto (adaptive)</SelectItem>
                <SelectItem value="easier">Easier</SelectItem>
                <SelectItem value="harder">Harder</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="font-mono text-[10px] uppercase text-muted-foreground">Language</label>
            <Select value={language} onValueChange={(v) => setLanguage(v as ReplyLanguage)}>
              <SelectTrigger className="h-9 font-mono text-[10px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {REPLY_LANGUAGES.map((l) => (
                  <SelectItem key={l.value} value={l.value} className="font-mono text-[10px]">
                    {l.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <Button onClick={handleGenerate} disabled={!pageRange.trim() || count < 1 || count > 20}>
          <Sparkles className="mr-2 h-4 w-4" /> GENERATE DRAFTS
        </Button>
      </div>

      {/* Status filter */}
      <div className="flex gap-1.5 mb-4 flex-wrap">
        {STATUS_FILTERS.map((f) => (
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

      <div className="space-y-3">
        {drafts.length === 0 ? (
          <div className="text-center p-12 text-muted-foreground font-mono text-sm border border-dashed border-border">
            NO DRAFTS IN THIS QUEUE
          </div>
        ) : (
          drafts.map((d) => (
            <DraftCard
              key={d.id}
              draft={d}
              onApprove={() =>
                approve(
                  { questionId: d.id },
                  {
                    onSuccess: () => {
                      toast({ title: "Draft approved", description: "Saved as real question." });
                      refetch();
                    },
                    onError: () => toast({ title: "Approve failed", variant: "destructive" }),
                  }
                )
              }
              onDismiss={() =>
                dismiss(
                  { questionId: d.id },
                  {
                    onSuccess: () => {
                      toast({ title: "Draft dismissed" });
                      refetch();
                    },
                    onError: () => toast({ title: "Dismiss failed", variant: "destructive" }),
                  }
                )
              }
            />
          ))
        )}
      </div>
    </Shell>
  );
}

function DraftCard({ draft, onApprove, onDismiss }: any) {
  const p = draft.payloadJson ?? {};
  const isMcqType = draft.questionType === "mcq";
  const resolvedStatus = draft.approvedAt
    ? "approved"
    : draft.dismissedAt
    ? "dismissed"
    : "pending";

  return (
    <div
      className={`border ${
        resolvedStatus === "pending" ? "border-amber/30" : "border-border/60 opacity-80"
      } bg-card p-4`}
    >
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="default" className="text-[10px]">
            {QUESTION_TYPE_LABELS[draft.questionType] ?? draft.questionType}
          </Badge>
          <AIGeneratedBadge status={resolvedStatus} />
          {draft.topicFocus && (
            <Badge variant="outline" className="text-[9px] text-muted-foreground">{draft.topicFocus}</Badge>
          )}
        </div>
        {draft.sourcePage != null && (
          <CitationChip page={draft.sourcePage} source={"textbook"} />
        )}
      </div>

      {p.question ? (
        <p className="font-sans text-sm mb-3">{p.question}</p>
      ) : null}

      {isMcqOptions(p) ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-3 text-xs font-mono">
          {["A", "B", "C", "D"].map((opt) => {
            const val = p.options?.[opt] ?? p.options?.[opt.toLowerCase()];
            if (!val) return null;
            return (
              <div
                key={opt}
                className={`p-2 border ${
                  p.correctOption?.toUpperCase() === opt
                    ? "border-teal/60 bg-teal/10 text-teal"
                    : "border-border"
                }`}
              >
                <span className="opacity-50 mr-2">{opt}]</span> {val}
              </div>
            );
          })}
        </div>
      ) : null}

      {isMcqType && p.correctOption && !isMcqOptions(p) && (
        <div className="mb-3">
          <Badge variant="outline" className="text-[10px] text-teal border-teal/40">
            Correct: {p.correctOption}
          </Badge>
        </div>
      )}

      {(p.modelAnswer || p.explanation) && (
        <div className="mt-2 space-y-2">
          {p.modelAnswer && (
            <div className="p-3 border-l-2 border-teal/50 bg-teal/5">
              <p className="font-mono text-[10px] text-teal uppercase mb-1">Model Answer</p>
              <p className="font-sans text-xs">{p.modelAnswer}</p>
            </div>
          )}
          {p.explanation && (
            <div className="p-3 border-l-2 border-border bg-muted/20">
              <p className="font-mono text-[10px] text-muted-foreground uppercase mb-1">Explanation</p>
              <p className="font-sans text-xs">{p.explanation}</p>
            </div>
          )}
        </div>
      )}

      {resolvedStatus === "pending" && (
        <div className="mt-4 flex gap-2">
          <Button size="sm" className="h-8 text-[10px]" onClick={onApprove}>
            <Check className="mr-1 h-3 w-3" /> APPROVE & SAVE
          </Button>
          <Button size="sm" variant="outline" className="h-8 text-[10px] text-destructive border-destructive/40 hover:bg-destructive/10" onClick={onDismiss}>
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

function isMcq(p: any): boolean {
  return !!(p.correctOption || p.options);
}