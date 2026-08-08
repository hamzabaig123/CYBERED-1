import { useEffect } from "react";
import { Link, useParams, useLocation } from "wouter";
import { Shell } from "@/components/layout/shell";
import {
  useGetSubject,
  useGetBookStoreStatus,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { IndexingStatusBadge } from "@/components/ai/indexing-status-badge";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { customFetch } from "@workspace/api-client-react/custom-fetch";
import { MessageSquare, Sparkles, ArrowLeft, BookOpen, Loader2 } from "lucide-react";

interface FileAsset {
  id: number;
  originalFilename: string;
  processingStatus: string;
}

interface FileAssetListResponse {
  assets: FileAsset[];
}

async function fetchFileAssets(subjectId: number): Promise<FileAsset[]> {
  const res = await customFetch<FileAssetListResponse>(`/api/books/${subjectId}/assets`);
  return res.assets;
}

export default function AskBookPage() {
  const { id } = useParams();
  const subjectId = parseInt(id ?? "0", 10);
  const [, navigate] = useLocation();

  const { data: subject } = useGetSubject(subjectId, {
    query: { enabled: !isNaN(subjectId) } as any,
  });
  const { data: storeStatus } = useGetBookStoreStatus(subjectId, {
    query: { enabled: !isNaN(subjectId) } as any,
  });
  const { data: assets = [] } = useQuery({
    queryKey: ["fileAssets", subjectId],
    queryFn: () => fetchFileAssets(subjectId),
    enabled: !isNaN(subjectId),
  });

  const readyAsset = assets.find(a => a.processingStatus === "done");

  useEffect(() => {
    if (readyAsset) {
      navigate(`/subjects/${subjectId}/books/${readyAsset.id}`);
    }
  }, [readyAsset, subjectId, navigate]);

  const canChat = storeStatus?.status === "ready";

  return (
    <Shell>
      <div className="mb-4 border-b border-border pb-4 flex justify-between items-end">
        <div>
          <div className="flex items-center gap-3">
            <Button asChild size="sm" variant="outline" className="h-8 w-8 p-0">
              <Link href={`/subjects/${subjectId}/library`} title="Textbook Library">
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
            <h1 className="text-2xl font-bold font-mono text-primary uppercase tracking-widest">
              {subject?.name ?? "Subject"} — Ask The Book
            </h1>
          </div>
          <p className="text-muted-foreground font-mono text-xs mt-2 uppercase">
            AI Knowledge Engine // grounded answers with citations
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
      ) : readyAsset ? (
        <div className="flex flex-col items-center justify-center gap-6 border border-border bg-card h-[calc(100dvh-240px)] text-center p-8">
          <div className="flex flex-col items-center gap-4 max-w-md">
            <BookOpen className="h-16 w-16 text-primary/50" />
            <div>
              <h2 className="font-mono text-lg font-bold text-foreground">
                Ready to Ask Questions
              </h2>
              <p className="text-sm font-mono text-muted-foreground mt-1">
                Select a textbook to start asking questions with page-level citations.
              </p>
            </div>
            <Button
              size="lg"
              onClick={() => navigate(`/subjects/${subjectId}/books/${readyAsset.id}`)}
              className="w-full max-w-xs"
            >
              <MessageSquare className="mr-2 h-4 w-4" />
              OPEN {readyAsset.originalFilename.replace(/\.pdf$/i, "").toUpperCase()}
            </Button>
            {assets.length > 1 && (
              <Button
                variant="outline"
                size="sm"
                asChild
                className="text-xs w-full max-w-xs"
              >
                <Link href={`/subjects/${subjectId}/library`}>
                  View all books in library
                </Link>
              </Button>
            )}
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center gap-4 border border-dashed border-border bg-card h-[calc(100dvh-240px)] text-center">
          <MessageSquare className="h-10 w-10 opacity-30 text-primary" />
          <p className="text-sm font-mono text-muted-foreground max-w-sm">
            No processed textbooks found. Upload a PDF in the library first.
          </p>
          <Button asChild size="sm" variant="outline" className="text-xs">
            <Link href={`/subjects/${subjectId}/library`}>OPEN LIBRARY</Link>
          </Button>
        </div>
      )}
    </Shell>
  );
}