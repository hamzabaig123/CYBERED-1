export type ReplyLanguage = "auto" | "english" | "urdu" | "sindhi";

export const REPLY_LANGUAGES: { value: ReplyLanguage; label: string }[] = [
  { value: "auto", label: "Auto (detect)" },
  { value: "english", label: "English" },
  { value: "urdu", label: "Urdu" },
  { value: "sindhi", label: "Sindhi" },
];

interface StreamEvent {
  type: string;
  text?: string;
  explanation?: string;
  citations?: Array<{ page: number; filename: string; snippet: string }>;
  message?: string;
  subjectId?: number;
}

/**
 * POST an SSE stream to `/api/ai/explain/stream` and invoke callbacks as
 * chunks arrive. Returns an abort function to stop the stream early.
 */
export function streamExplain(
  input: { questionText: string; subjectId: number; language?: ReplyLanguage },
  handlers: {
    onText: (text: string) => void;
    onDone: (summary: { explanation: string; citations: StreamEvent["citations"] }) => void;
    onError: (message: string) => void;
  }
): () => void {
  const controller = new AbortController();

  (async () => {
    try {
      const res = await fetch("/api/ai/explain/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
        signal: controller.signal,
      });

      if (!res.ok || !res.body) {
        let message = `HTTP ${res.status}`;
        try {
          const data = await res.json();
          if (data?.error) message = data.error;
        } catch {
          /* ignore */
        }
        handlers.onError(message);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let explanation = "";

      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        let sep = buffer.indexOf("\n\n");
        while (sep !== -1) {
          const rawEvent = buffer.slice(0, sep);
          buffer = buffer.slice(sep + 2);
          for (const line of rawEvent.split("\n")) {
            if (!line.startsWith("data:")) continue;
            const payload = line.slice(5).trim();
            if (!payload) continue;
            let evt: StreamEvent;
            try {
              evt = JSON.parse(payload);
            } catch {
              continue;
            }
            if (evt.type === "text" && evt.text) {
              explanation += evt.text;
              handlers.onText(evt.text);
            } else if (evt.type === "done") {
              handlers.onDone({
                explanation: evt.explanation ?? explanation,
                citations: evt.citations ?? [],
              });
              return;
            } else if (evt.type === "error") {
              handlers.onError(evt.message ?? "Stream interrupted.");
              return;
            }
          }
          sep = buffer.indexOf("\n\n");
        }
      }

      handlers.onDone({ explanation, citations: [] });
    } catch (err) {
      if ((err as Error)?.name === "AbortError") return;
      handlers.onError((err as Error)?.message ?? "Failed to stream explanation.");
    }
  })();

  return () => controller.abort();
}