import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "wouter";
import { Shell } from "@/components/layout/shell";
import {
  useGetSubject,
  useGetBookStoreStatus,
  useListAIChatSessions,
  useGetAIChatSession,
  useCreateAIChatSession,
  useSendAIChatMessage,
  type Citation,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { IndexingStatusBadge } from "@/components/ai/indexing-status-badge";
import { CitationChip } from "@/components/ai/citation-chip";
import { useToast } from "@/hooks/use-toast";
import { MessageSquare, Sparkles, Send, ArrowLeft, Clock } from "lucide-react";

const ROLE_LABEL: Record<string, string> = {
  user: "YOU",
  assistant: "CYBERED // AI",
};

export default function AskBookPage() {
  const { id } = useParams();
  const subjectId = parseInt(id ?? "0", 10);

  const { data: subject } = useGetSubject(subjectId, {
    query: { enabled: !isNaN(subjectId) } as any,
  });
  const { data: storeStatus } = useGetBookStoreStatus(subjectId, {
    query: { enabled: !isNaN(subjectId) } as any,
  });

  const { data: sessionsData } = useListAIChatSessions(
    { subjectId, limit: 50 },
    { query: { enabled: !isNaN(subjectId) } as any }
  );

  const [sessionId, setSessionId] = useState<number | null>(null);
  const { data: sessionData } = useGetAIChatSession(sessionId ?? 0, { limit: 100 }, {
    query: { enabled: !!sessionId } as any,
  });

  const { mutate: createSession } = useCreateAIChatSession();
  const { mutate: sendMessage, isPending: thinking } = useSendAIChatMessage();
  const { toast } = useToast();

  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const messages = sessionData?.messages ?? [];

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length, thinking]);

  const handleSend = () => {
    const content = input.trim();
    if (!content || thinking) return;

    const doSend = (sid: number) => {
      sendMessage(
        { sessionId: sid, data: { content } },
        {
          onSuccess: () => setInput(""),
          onError: () => toast({ title: "Message failed", variant: "destructive" }),
        }
      );
    };

    if (sessionId) {
      doSend(sessionId);
    } else {
      createSession(
        { data: { subjectId } },
        {
          onSuccess: (res) => {
            setSessionId(res.id);
            doSend(res.id);
          },
          onError: () => toast({ title: "Failed to start session", variant: "destructive" }),
        }
      );
    }
  };

  const canChat = storeStatus?.status === "ready";

  return (
    <Shell>
      <div className="mb-4 border-b border-border pb-4 flex justify-between items-end">
        <div>
          <div className="flex items-center gap-3">
            <Button asChild size="sm" variant="outline" className="h-8 w-8 p-0">
              <Link href={`/subjects/${subjectId}/library`} title="Textbook Store">
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
        <div className="flex flex-col items-center justify-center gap-4 border border-dashed border-border bg-card p-12 text-center">
          <MessageSquare className="h-10 w-10 opacity-30 text-primary" />
          <p className="text-sm font-mono text-muted-foreground max-w-sm">
            The textbook store is not ready yet. Index a textbook before chatting.
          </p>
          <Button asChild size="sm" variant="outline" className="text-xs">
            <Link href={`/subjects/${subjectId}/library`}>OPEN STORE</Link>
          </Button>
        </div>
      ) : (
        <div className="flex flex-col h-[calc(100dvh-240px)] border border-border bg-card">
          {/* Session history */}
          {sessionsData?.sessions && sessionsData.sessions.length > 0 && (
            <div className="p-2 border-b border-border bg-muted/10 flex items-center gap-1.5 overflow-x-auto">
              <span className="font-mono text-[9px] uppercase text-muted-foreground flex-shrink-0 pl-1">Sessions:</span>
              {sessionsData.sessions.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setSessionId(s.id)}
                  className={`flex items-center gap-1 px-2 py-1 text-[9px] font-mono uppercase border transition-colors flex-shrink-0 ${
                    sessionId === s.id
                      ? "border-primary bg-primary/20 text-primary"
                      : "border-border text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Clock className="h-2.5 w-2.5" />
                  #{s.id}
                </button>
              ))}
            </div>
          )}

          {/* Message thread */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.length === 0 && !thinking ? (
              <div className="text-center p-12 text-muted-foreground font-mono text-sm">
                ASK ANYTHING ABOUT {subject?.name?.toUpperCase() ?? "THE BOOK"}
              </div>
            ) : (
              messages.map((m) => (
                <MessageBubble key={m.id} role={m.role} content={m.content} citations={m.citationsJson} />
              ))
            )}

            {thinking && (
              <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-teal animate-pulse">
                <Sparkles className="h-3 w-3" />
                Thinking...
              </div>
            )}
          </div>

          {/* Composer */}
          <div className="p-3 border-t border-border bg-muted/10 flex gap-2">
            <Input
              className="h-10 font-mono text-xs flex-1"
              placeholder="Ask a question grounded in the textbook..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend(input)}
            />
            <Button className="h-10" onClick={() => handleSend(input)} disabled={thinking || !input.trim()}>
              <Send className="mr-2 h-3.5 w-3.5" /> SEND
            </Button>
          </div>
        </div>
      )}
    </Shell>
  );
}

function MessageBubble({
  role,
  content,
  citations,
}: {
  role: string;
  content: string;
  citations?: Citation[];
}) {
  const isUser = role === "user";
  return (
    <div className={`flex flex-col gap-1.5 ${isUser ? "items-end" : "items-start"}`}>
      <span
        className={`font-mono text-[9px] uppercase tracking-widest ${
          isUser ? "text-primary" : "text-teal"
        }`}
      >
        {ROLE_LABEL[role] ?? role}
      </span>
      <div
        className={`max-w-[85%] p-3 font-sans text-sm leading-relaxed border ${
          isUser
            ? "border-primary/40 bg-primary/10 text-foreground"
            : "border-teal/30 bg-teal/5 text-foreground"
        }`}
      >
        <p className="whitespace-pre-wrap">{content}</p>
        {citations && citations.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {citations.map((c, i) => (
              <CitationChip key={i} page={c.page} source={c.filename} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}