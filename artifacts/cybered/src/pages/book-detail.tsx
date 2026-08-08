import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "wouter";
import { Shell } from "@/components/layout/shell";
import {
  useGetSubject,
  useGetBookStoreStatus,
  useExplainFromBook,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { IndexingStatusBadge } from "@/components/ai/indexing-status-badge";
import { CitationChip } from "@/components/ai/citation-chip";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { customFetch } from "@workspace/api-client-react/custom-fetch";
import { PanelGroup, Panel, PanelResizeHandle } from "react-resizable-panels";
import {
  MessageSquare,
  Sparkles,
  Send,
  ArrowLeft,
  BookOpen,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Download,
  RotateCcw,
  Highlighter,
  Layers,
} from "lucide-react";
import { Document, Page, pdfjs } from "react-pdf";
import { cn } from "@/lib/utils";

pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.mjs`;

interface Citation {
  page: number;
  filename: string;
  snippet: string;
}

interface ExplainResponse {
  explanation: string;
  citations: Citation[];
  subjectId?: number;
}

interface FileAsset {
  id: number;
  storageKey: string;
  originalFilename: string;
  pageCount: number | null;
}

export default function BookDetailPage() {
  const { id, bookId } = useParams();
  const subjectId = parseInt(id ?? "0", 10);
  const assetId = parseInt(bookId ?? "0", 10);

  const { data: subject } = useGetSubject(subjectId, {
    query: { enabled: !isNaN(subjectId) } as any,
  });
  const { data: storeStatus } = useGetBookStoreStatus(subjectId, {
    query: { enabled: !isNaN(subjectId) } as any,
  });

  const { mutate: explain, isPending: explaining } = useExplainFromBook();
  const { toast } = useToast();

  const createFlashcardMutation = useMutation({
    mutationFn: async (data: { subjectId: number; question: string; answer: string; sourcePage: number; sourceCitation: string }) => {
      const res = await customFetch("/api/ai/explain/flashcard", {
        method: "POST",
        body: JSON.stringify(data),
      });
      return res;
    },
    onSuccess: () => {
      toast({ title: "Flashcard created", description: "Added to your flashcard deck." });
    },
    onError: () => {
      toast({ title: "Failed to create flashcard", variant: "destructive" });
    },
  });

  const [asset, setAsset] = useState<FileAsset | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [numPages, setNumPages] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [scale, setScale] = useState(1.0);
  const [question, setQuestion] = useState("");
  const [explanation, setExplanation] = useState<string | null>(null);
  const [citations, setCitations] = useState<Citation[]>([]);
  const [highlightedPages, setHighlightedPages] = useState<Set<number>>(new Set());
  const [showExplanation, setShowExplanation] = useState(false);

  const pdfContainerRef = useRef<HTMLDivElement>(null);
  const questionInputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!assetId) return;
    
    const fetchAsset = async () => {
      try {
        const res = await fetch(`/api/books/${subjectId}/assets`);
        const data = await res.json();
        const found = data.assets?.find((a: FileAsset) => a.id === assetId);
        if (found) {
          setAsset(found);
          setPdfUrl(`/api/files/serve/${found.storageKey}`);
          if (found.pageCount) setNumPages(found.pageCount);
        }
      } catch (error) {
        console.error("Failed to fetch asset:", error);
      }
    };
    fetchAsset();
  }, [assetId, subjectId]);

  const handleExplain = () => {
    if (!question.trim() || !storeStatus?.store?.geminiStoreName) return;
    
    explain(
      { data: { questionText: question.trim(), subjectId } },
      {
        onSuccess: (res: ExplainResponse) => {
          setExplanation(res.explanation);
          setCitations(res.citations ?? []);
          const pages = new Set((res.citations ?? []).map(c => c.page));
          setHighlightedPages(pages);
          setShowExplanation(true);
          setQuestion("");
        },
        onError: () => toast({ title: "Explanation failed", variant: "destructive" }),
      }
    );
  };

  const handleCreateFlashcard = () => {
    if (!explanation || !citations.length) return;
    
    createFlashcardMutation.mutate({
      subjectId,
      question: question || "Generated from explanation",
      answer: explanation,
      sourcePage: citations[0].page,
      sourceCitation: citations[0].filename,
    });
  };

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= (numPages ?? 1)) {
      setCurrentPage(page);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleExplain();
    }
  };

  const canChat = storeStatus?.status === "ready";

  const goToCitationPage = (page: number) => {
    handlePageChange(page);
    setShowExplanation(false);
  };

  if (!asset) {
    return (
      <Shell>
        <div className="flex items-center justify-center h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Shell>
    );
  }

  const pdfFileUrl = pdfUrl || `/api/files/serve/${asset.storageKey}`;

  return (
    <Shell>
      <div className="mb-4 border-b border-border pb-4 flex justify-between items-end">
        <div>
          <div className="flex items-center gap-3">
            <Button asChild size="sm" variant="outline" className="h-8 w-8 p-0">
              <Link href={`/subjects/${subjectId}/library`} title="Back to Library">
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
            <h1 className="text-2xl font-bold font-mono text-primary uppercase tracking-widest truncate max-w-[400px]">
              {asset.originalFilename.replace(/\.pdf$/i, "")}
            </h1>
          </div>
          <p className="text-muted-foreground font-mono text-xs mt-2 uppercase">
            {subject?.name ?? "Subject"} • {asset.pageCount ? `${asset.pageCount} pages` : "—"}
          </p>
        </div>
        <IndexingStatusBadge status={storeStatus?.status} />
      </div>

      {!canChat ? (
        <div className="flex flex-col items-center justify-center gap-4 border border-dashed border-border bg-card h-[calc(100dvh-240px)] text-center">
          <MessageSquare className="h-10 w-10 opacity-30 text-primary" />
          <p className="text-sm font-mono text-muted-foreground max-w-sm">
            The textbook store is not ready yet. Index a textbook before asking questions.
          </p>
          <Button asChild size="sm" variant="outline" className="text-xs">
            <Link href={`/subjects/${subjectId}/library`}>OPEN LIBRARY</Link>
          </Button>
        </div>
      ) : (
        <PanelGroup className="h-[calc(100dvh-220px)]" direction="horizontal">
          {/* PDF Viewer Panel */}
          <Panel defaultSize={60} minSize={40}>
            <div className="h-full flex flex-col border-r border-border bg-card">
              {/* PDF Toolbar */}
              <div className="p-2 border-b border-border flex items-center gap-2 bg-muted/30">
                <div className="flex items-center gap-1">
                  <Button variant="outline" size="icon" onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage <= 1} title="Previous page">
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="font-mono text-sm px-2 w-24 text-center">
                    {currentPage} / {numPages ?? "—"}
                  </span>
                  <Button variant="outline" size="icon" onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage >= (numPages ?? 1)} title="Next page">
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex-1" />
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="icon" onClick={() => setScale(Math.max(0.5, scale - 0.1))} title="Zoom out">
                    <RotateCcw className="h-4 w-4" />
                  </Button>
                  <span className="font-mono text-xs text-muted-foreground w-16 text-right">{Math.round(scale * 100)}%</span>
                  <Button variant="outline" size="icon" onClick={() => setScale(Math.min(2, scale + 0.1))} title="Zoom in">
                    <RotateCcw className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="sm" className="text-xs" title="Download">
                    <Download className="mr-1.5 h-3 w-3" />
                  </Button>
                </div>
              </div>

              {/* PDF Viewer */}
              <div className="flex-1 overflow-auto relative bg-gray-100/50 p-4" ref={pdfContainerRef}>
                <div className="flex justify-center">
                  <Document
                    file={pdfFileUrl}
                    onLoadSuccess={(pdf) => setNumPages(pdf.numPages)}
                    loading={
                      <div className="flex items-center justify-center h-full">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                      </div>
                    }
                    error={
                      <div className="flex items-center justify-center h-full text-destructive">
                        Failed to load PDF
                      </div>
                    }
                  >
                    {Array.from({ length: numPages ?? 1 }, (_, i) => i + 1).map((pageNum) => (
                      <Page
                        key={pageNum}
                        pageNumber={pageNum}
                        scale={scale}
                        renderAnnotationLayer={true}
                        renderTextLayer={true}
                        className={cn(
                          "shadow-lg mx-auto my-4 bg-white",
                          highlightedPages.has(pageNum) && "ring-2 ring-amber-400 ring-offset-2 ring-offset-black"
                        )}
                      />
                    ))}
                  </Document>
                </div>
              </div>
            </div>
          </Panel>

          <PanelResizeHandle className="bg-border" />
          
          {/* Ask Panel */}
          <Panel defaultSize={40} minSize={35} maxSize={60}>
            <div className="h-full flex flex-col border-l border-border bg-card">
              <div className="p-3 border-b border-border bg-muted/30 flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-primary" />
                <span className="font-mono text-xs uppercase tracking-widest text-primary">Ask the Book</span>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {showExplanation && explanation && (
                  <div className="rounded border border-teal/30 bg-teal/5 p-3 animate-in slide-in-from-bottom-2 duration-200">
                    <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-teal mb-2">
                      <Sparkles className="h-3 w-3" />
                      Explain From Book
                    </div>
                    <p className="font-sans text-sm leading-relaxed mb-3">{explanation}</p>
                    
                    {citations.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 items-center mb-3">
                        {citations.map((c, i) => (
                          <Button
                            key={i}
                            variant="ghost"
                            size="sm"
                            className="text-[10px] font-mono h-6 px-2"
                            onClick={() => goToCitationPage(c.page)}
                          >
                            <Layers className="mr-1 h-2.5 w-2.5" />
                            p.{c.page}
                          </Button>
                        ))}
                      </div>
                    )}

                    <div className="flex items-center gap-2 pt-2 border-t border-teal/20">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleCreateFlashcard}
                        disabled={createFlashcardMutation.isPending}
                        className="text-xs"
                      >
                        <Sparkles className="mr-1.5 h-3 w-3" />
                        {createFlashcardMutation.isPending ? "CREATING..." : "Turn into Flashcard"}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => { setShowExplanation(false); setExplanation(null); setCitations([]); setHighlightedPages(new Set()); }}
                        className="text-xs"
                      >
                        Dismiss
                      </Button>
                    </div>
                  </div>
                )}

                {!showExplanation && (
                  <div className="text-center p-8 text-muted-foreground font-mono text-sm">
                    ASK ANYTHING ABOUT THE BOOK
                  </div>
                )}

                {explaining && (
                  <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-teal animate-pulse">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Mining textbook...
                  </div>
                )}
              </div>

              {/* Composer */}
              <div className="p-3 border-t border-border bg-muted/10 flex flex-col gap-2">
                <Textarea
                  ref={questionInputRef}
                  className="font-mono text-xs min-h-[80px] resize-none"
                  placeholder="Ask a question grounded in the textbook..."
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  onKeyDown={handleKeyDown}
                  rows={3}
                />
                <div className="flex justify-end">
                  <Button
                    className="h-10"
                    onClick={handleExplain}
                    disabled={explaining || !question.trim() || createFlashcardMutation.isPending}
                  >
                    <Send className="mr-2 h-3.5 w-3.5" /> ASK
                  </Button>
                </div>
              </div>
            </div>
          </Panel>
        </PanelGroup>
      )}
    </Shell>
  );
}