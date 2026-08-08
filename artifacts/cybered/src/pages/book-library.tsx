import { useState, useCallback } from "react";
import { Link, useParams } from "wouter";
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
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { IndexingStatusBadge } from "@/components/ai/indexing-status-badge";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery } from "@tanstack/react-query";
import { customFetch } from "@workspace/api-client-react/custom-fetch";
import {
  BookOpen,
  Sparkles,
  MessageSquare,
  Check,
  RefreshCw,
  ArrowLeft,
  Upload,
  FileText,
  Eye,
  Trash2,
  Loader2,
} from "lucide-react";

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
}

interface FileAssetListResponse {
  assets: FileAsset[];
}

async function fetchFileAssets(subjectId: number): Promise<FileAsset[]> {
  const res = await customFetch<FileAssetListResponse>(`/api/books/${subjectId}/assets`);
  return res.assets;
}

interface UploadUrlResponse {
  assetId: number;
  uploadUrl: string;
  storageKey: string;
  expiresIn: number;
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

export default function BookLibraryPage() {
  const { id } = useParams();
  const subjectId = parseInt(id ?? "0", 10);

  const { data: subject } = useGetSubject(subjectId, {
    query: { enabled: !isNaN(subjectId) } as any,
  });
  const { data: subjects } = useListSubjects(
    { classId: subject?.classId ?? 0, includeArchived: false },
    { query: { enabled: !isNaN(subjectId) && !!subject?.classId } as any }
  );
  const { data: storeStatus, refetch: refetchStore } = useGetBookStoreStatus(subjectId, {
    query: { enabled: !isNaN(subjectId) } as any,
  });
  const { data: assets = [], refetch: refetchAssets } = useQuery({
    queryKey: ["fileAssets", subjectId],
    queryFn: () => fetchFileAssets(subjectId),
    enabled: !isNaN(subjectId),
    refetchInterval: 5000,
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
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [bookTitle, setBookTitle] = useState("");
  const [licenseConfirmed, setLicenseConfirmed] = useState(false);
  const [uploading, setUploading] = useState(false);

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
          refetchStore();
        },
        onError: () => toast({ title: "Failed to create store", variant: "destructive" }),
      }
    );
  };

  const handleIndex = () => {
    if (!bookTitle.trim() || !licenseConfirmed) return;
    indexBook(
      { subjectId, data: { bookTitle: bookTitle.trim(), fileName: selectedFile?.name || "textbook.pdf", textbookContent: "", licenseConfirmed } },
      {
        onSuccess: (res) => {
          toast({ title: "Indexing started", description: `Operation: ${res.operationName ?? "index"}` });
          setOperationName(res.operationName ?? null);
          setBookTitle("");
          setSelectedFile(null);
          setLicenseConfirmed(false);
          refetchStore();
        },
        onError: () => toast({ title: "Indexing failed", variant: "destructive" }),
      }
    );
  };

  const isPending = effectiveStatus === "pending";

  const uploadMutation = useMutation({
    mutationFn: ({ file, subjectId }: { file: File; subjectId: number }) => uploadFile(file, subjectId),
    onSuccess: () => {
      toast({ title: "Upload complete", description: "File queued for processing." });
      setSelectedFile(null);
      setUploading(false);
    },
    onError: (err) => {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
      setUploading(false);
    },
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type !== "application/pdf") {
        toast({ title: "Invalid file type", description: "Please select a PDF file.", variant: "destructive" });
        return;
      }
      if (file.size > 100 * 1024 * 1024) {
        toast({ title: "File too large", description: "Maximum file size is 100MB.", variant: "destructive" });
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

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  const getAssetStatus = (asset: FileAsset) => {
    if (asset.virusScanStatus === "infected") return { label: "Infected", variant: "destructive" as const };
    if (asset.virusScanStatus === "error" || asset.processingStatus === "error") return { label: "Error", variant: "destructive" as const };
    if (asset.virusScanStatus === "pending" || asset.processingStatus === "pending" || asset.processingStatus === "processing") return { label: "Processing...", variant: "secondary" as const };
    if (asset.processingStatus === "done") return { label: "Ready", variant: "default" as const };
    return { label: "Pending", variant: "secondary" as const };
  };

  const handleViewBook = (asset: FileAsset) => {
    window.location.href = `/subjects/${subjectId}/books/${asset.id}`;
  };

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
              {subject?.name ?? "Subject"} — Textbook Library
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
                    { subjectId, data: { bookTitle: bookTitle.trim() || store?.textbookTitle || "textbook", fileName: selectedFile?.name || "textbook.pdf", textbookContent: "", licenseConfirmed } },
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
            <span>Add Textbook</span>
            <Badge variant="outline" className="text-[8px] text-warning border-amber/30">
              PDF upload
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
              <label className="font-mono text-[10px] uppercase text-muted-foreground">PDF File</label>
              <div className="border border-dashed border-border rounded p-4 text-center">
                <input
                  type="file"
                  accept="application/pdf"
                  onChange={handleFileSelect}
                  className="sr-only"
                  id="pdf-upload"
                  disabled={uploading}
                />
                <label htmlFor="pdf-upload" className="cursor-pointer flex flex-col items-center gap-2">
                  <Upload className="h-8 w-8 text-muted-foreground" />
                  {selectedFile ? (
                    <div className="flex items-center gap-2 text-sm font-mono">
                      <FileText className="h-4 w-4 text-primary" />
                      <span className="truncate max-w-[200px]">{selectedFile.name}</span>
                      <span className="text-muted-foreground">({formatBytes(selectedFile.size)})</span>
                    </div>
                  ) : (
                    <span className="font-mono text-xs text-muted-foreground">Click to select PDF</span>
                  )}
                </label>
              </div>
            </div>
          </div>

          <label className="flex items-start gap-2 cursor-pointer text-xs font-mono text-muted-foreground">
            <Checkbox checked={licenseConfirmed} onCheckedChange={(v) => setLicenseConfirmed(v === true)} />
            <span>
              I confirm this textbook is licensed for use / my own material and can be indexed into the store.
            </span>
          </label>

          <Button
            disabled={!selectedFile || !bookTitle.trim() || !licenseConfirmed || uploading || uploadMutation.isPending}
            onClick={handleUpload}
            className="w-full"
          >
            <Upload className="mr-2 h-4 w-4" />
            {uploading || uploadMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> UPLOADING...
              </>
            ) : (
              "UPLOAD & INDEX"
            )}
          </Button>
        </div>
      </div>

      {/* Book Cards Grid */}
      {assets.length > 0 && (
        <div className="mt-6">
          <div className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold border-b border-border pb-2 mb-4">
            Uploaded Books
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {assets.map((asset) => {
              const assetStatus = getAssetStatus(asset);
              return (
                <div key={asset.id} className="border border-border bg-card p-4 flex flex-col gap-3">
                  <div className="flex items-start justify-between gap-2">
                    <FileText className="h-6 w-6 text-primary flex-shrink-0 mt-0.5" />
                    <Badge variant={assetStatus.variant} className="text-[8px] font-mono">
                      {assetStatus.label}
                    </Badge>
                  </div>
                  <div className="flex-1 min-h-0">
                    <h3 className="font-mono text-sm font-bold truncate">{asset.originalFilename.replace(/\.pdf$/i, "")}</h3>
                    <p className="font-mono text-[10px] text-muted-foreground mt-1">
                      {formatBytes(asset.sizeBytes)} • {asset.pageCount ? `${asset.pageCount} pages` : "—"}
                    </p>
                    {asset.textPreview && (
                      <p className="font-sans text-xs text-muted-foreground mt-2 line-clamp-3">{asset.textPreview.slice(0, 200)}...</p>
                    )}
                    {asset.errorMessage && (
                      <p className="font-mono text-[10px] text-destructive mt-2">{asset.errorMessage}</p>
                    )}
                  </div>
                  <div className="flex gap-2 pt-2 border-t border-border">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 text-[10px]"
                      onClick={() => handleViewBook(asset)}
                      disabled={asset.processingStatus !== "done"}
                    >
                      <Eye className="mr-1.5 h-3 w-3" /> View
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-[10px] text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="mr-1.5 h-3 w-3" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

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