import { useState } from "react";
import { Link } from "wouter";
import { useParams } from "wouter";
import { Shell } from "@/components/layout/shell";
import {
  useGetSubject,
  useListSubjects,
  useGetBookStoreStatus,
  useCreateBookStore,
  useIndexBook,
  useGetIndexingStatus,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { IndexingStatusBadge } from "@/components/ai/indexing-status-badge";
import { useToast } from "@/hooks/use-toast";
import {
  BookOpen,
  Sparkles,
  MessageSquare,
  Check,
  RefreshCw,
  ArrowLeft,
} from "lucide-react";

export default function BookLibraryPage() {
  const { id } = useParams();
  const subjectId = parseInt(id ?? "0", 10);

  const { data: subject } = useGetSubject(subjectId, {
    query: { enabled: !isNaN(subjectId) } as any,
  });
  const { data: subjects } = useListSubjects();
  const { data: storeStatus, refetch } = useGetBookStoreStatus(subjectId, {
    query: { enabled: !isNaN(subjectId) } as any,
  });

  const store = storeStatus?.store;
  const status = storeStatus?.status ?? "not_created";

  const { mutate: createStore, isPending: creatingStore } = useCreateBookStore();
  const { mutate: indexBook, isPending: indexing } = useIndexBook();
  const [operationName, setOperationName] = useState<string | null>(null);
  const { data: indexingStatus } = useGetIndexingStatus(
    store?.id ?? 0,
    { operationName: operationName ?? "" },
    {
      query: {
        enabled: !!store && store.id > 0 && !!operationName && status === "pending",
        refetchInterval: 4000,
      } as any,
    }
  );

  const { toast } = useToast();

  const [bookTitle, setBookTitle] = useState("");
  const [fileName, setFileName] = useState("");
  const [textbookContent, setTextbookContent] = useState("");
  const [licenseConfirmed, setLicenseConfirmed] = useState(false);

  let effectiveStatus = status;
  if (status === "pending" && indexingStatus) {
    if (indexingStatus.error) effectiveStatus = "error";
    else if (indexingStatus.done) effectiveStatus = "ready";
  }

  const handleCreate = () => {
    createStore(
      { subjectId, data: { textbookTitle: subject?.name ?? undefined } },
      {
        onSuccess: () => {
          toast({ title: "Book store created", description: "Ready for indexing." });
          refetch();
        },
        onError: () => toast({ title: "Failed to create store", variant: "destructive" }),
      }
    );
  };

  const handleIndex = () => {
    if (!bookTitle.trim() || !fileName.trim() || !textbookContent.trim() || !licenseConfirmed) return;
    indexBook(
      { subjectId, data: { bookTitle: bookTitle.trim(), fileName: fileName.trim(), textbookContent: textbookContent.trim(), licenseConfirmed } },
      {
        onSuccess: (res) => {
          toast({ title: "Indexing started", description: `Operation: ${res.operationName ?? "index"}` });
          setOperationName(res.operationName ?? null);
          setTextbookContent("");
          refetch();
        },
        onError: () => toast({ title: "Indexing failed", variant: "destructive" }),
      }
    );
  };

  const isPending = effectiveStatus === "pending";

  return (
    <Shell>
      <div className="mb-4 border-b border-border pb-4 flex justify-between items-end">
        <div>
          <div className="flex items-center gap-3">
            <Button asChild size="sm" variant="outline" className="h-8 w-8 p-0">
              <Link href={`/subjects/${subjectId}/ai-chat`} title="Ask AI about this book">
                <MessageSquare className="h-4 w-4" />
              </Link>
            </Button>
            <h1 className="text-2xl font-bold font-mono text-primary uppercase tracking-widest">
              {subject?.name ?? "Subject"} — Textbook Store
            </h1>
          </div>
          <p className="text-muted-foreground font-mono text-xs mt-2 uppercase">
            AI Knowledge Engine v1 // File Search Index
          </p>
        </div>
        <IndexingStatusBadge status={effectiveStatus} />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Status / explanation card */}
        <div className="border border-border bg-card p-6 flex flex-col gap-4">
          <div className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold border-b border-border pb-2">
            Store Status
          </div>

          {status === "not_created" || !store ? (
            <div className="flex flex-col items-center justify-center gap-4 py-8 text-center">
              <BookOpen className="h-12 w-12 opacity-30 text-primary" />
              <p className="text-sm font-mono text-muted-foreground max-w-xs">
                No textbook indexed yet. Create a store to start uploading a textbook for AI-powered study.
              </p>
              <Button onClick={handleCreate} disabled={creatingStore}>
                {creatingStore ? "CREATING..." : "CREATE STORE"}
              </Button>
            </div>
          ) : isPending ? (
            <div className="flex flex-col items-center justify-center gap-4 py-8 text-center">
              <RefreshCw className="h-10 w-10 text-primary animate-spin" />
              <div className="font-mono text-sm text-foreground">Indexing in progress...</div>
              <p className="text-xs font-mono text-muted-foreground">
                Gemini is processing the textbook. This can take a few minutes. Page status auto-refreshes.
              </p>
            </div>
          ) : status === "error" || effectiveStatus === "error" ? (
            <div className="flex flex-col items-center justify-center gap-3 py-8 text-center">
              <div className="font-mono text-sm text-destructive">Indexing failed</div>
              <p className="text-xs font-mono text-muted-foreground max-w-sm">
                {store?.errorMessage ?? "Unknown error. Re-upload to retry."}
              </p>
              <Button
                variant="outline"
                onClick={() => {
                  indexBook(
                    { subjectId, data: { bookTitle: bookTitle.trim() || store?.textbookTitle || "textbook", fileName: fileName.trim() || "textbook.txt", textbookContent: textbookContent.trim(), licenseConfirmed } },
                    { onSuccess: () => toast({ title: "Re-index started" }), onError: () => toast({ title: "Failed", variant: "destructive" }) }
                  );
                }}
              >
                RE-INDEX
              </Button>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-mono text-xs text-muted-foreground uppercase">Store Name</div>
                  <div className="font-mono text-sm text-foreground break-all">{store.geminiStoreName}</div>
                </div>
                <Check className="text-teal" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="font-mono text-xs text-muted-foreground uppercase">Indexed Pages</div>
                  <div className="font-mono text-2xl text-primary font-bold">{store.indexedPages}</div>
                </div>
                <div>
                  <div className="font-mono text-xs text-muted-foreground uppercase">Textbook</div>
                  <div className="font-mono text-sm text-foreground truncate">{store.textbookTitle ?? "—"}</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Upload card */}
        <div className="lg:col-span-2 border border-border bg-card p-6 flex flex-col gap-4">
          <div className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold border-b border-border pb-2 flex items-center justify-between">
            <span>Index Textbook</span>
            <Badge variant="outline" className="text-[8px] text-warning border-amber/30">
              plain text / OCR extract
            </Badge>
          </div>

          <div className="grid md:grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="font-mono text-[10px] uppercase text-muted-foreground">Book Title</label>
              <Input
                className="font-mono text-xs"
                placeholder="e.g. Computer Science 9th"
                value={bookTitle}
                onChange={(e) => setBookTitle(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="font-mono text-[10px] uppercase text-muted-foreground">File Name</label>
              <Input
                className="font-mono text-xs"
                placeholder="e.g. cs-9th-edition.pdf.txt"
                value={fileName}
                onChange={(e) => setFileName(e.target.value)}
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5 flex-1">
            <label className="font-mono text-[10px] uppercase text-muted-foreground">
              Textbook Content (raw text)
            </label>
            <Textarea
              className="font-mono text-xs min-h-[220px] flex-1"
              placeholder="Paste the extracted plain text of the textbook here..."
              value={textbookContent}
              onChange={(e) => setTextbookContent(e.target.value)}
            />
          </div>

          <label className="flex items-start gap-2 cursor-pointer text-xs font-mono text-muted-foreground">
            <Checkbox checked={licenseConfirmed} onCheckedChange={(v) => setLicenseConfirmed(v === true)} />
            <span>
              I confirm this textbook is licensed for use / my own material and can be indexed into the store.
            </span>
          </label>

          <Button
            disabled={!bookTitle.trim() || !fileName.trim() || !textbookContent.trim() || !licenseConfirmed || indexing}
            onClick={handleIndex}
          >
            <Sparkles className="mr-2 h-4 w-4" />
            {indexing ? "INDEXING..." : isPending ? "RE-INDEX" : "INDEX INTO STORE"}
          </Button>
        </div>
      </div>

      {/* Subject pick footer */}
      {subjects && subjects.length > 0 && (
        <div className="mt-4 border border-border bg-card p-4 flex items-center gap-3">
          <BookOpen className="h-4 w-4 text-primary" />
          <span className="font-mono text-[10px] uppercase text-muted-foreground">Switch subject:</span>
          <div className="flex flex-wrap gap-1.5">
            {subjects.map((s) => (
              <Button
                key={s.id}
                size="sm"
                variant={s.id === subjectId ? "default" : "outline"}
                className="h-7 text-[10px]"
                onClick={() => window.location.assign(`/subjects/${s.id}/library`)}
              >
                {s.name}
              </Button>
            ))}
          </div>
        </div>
      )}

      <div className="mt-4">
        <Button asChild size="sm" variant="outline" className="text-xs">
          <Link href="/curriculum"><ArrowLeft className="mr-2 h-3 w-3" /> Back to Curriculum</Link>
        </Button>
      </div>
    </Shell>
  );
}