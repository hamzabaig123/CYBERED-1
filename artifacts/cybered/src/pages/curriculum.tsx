import { useState } from "react";
import { Shell } from "@/components/layout/shell";
import { useListClasses, useListSubjects, useListChapters, useListSections, useGetSection, useExploreQuestions, useCountExploredQuestions, useListSectionTags, useListFlashcards, useExplainFromBook } from "@workspace/api-client-react";
import { ChevronRight, ChevronDown, Folder, FileText, Settings2, Plus, BookOpen, Table2, Printer, Search, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Link } from "wouter";
import { ExplainPanel } from "@/components/ai/explain-panel";

const SECTION_TYPE_LABELS: Record<string, string> = {
  mcqs: "MCQs",
  short_questions: "Short Questions",
  long_questions: "Long Questions",
  notes: "Notes",
  past_papers: "Past Papers",
  essays: "Essays",
  practical_questions: "Practical Questions",
  viva_questions: "Viva Questions",
  programming_questions: "Programming",
  flashcards: "Flashcards",
  mind_maps: "Mind Maps",
  formula_sheets: "Formula Sheets",
  cheat_sheets: "Cheat Sheets",
  custom: "Custom",
};

// Recursive tree component
export default function Curriculum() {
  const [selectedSection, setSelectedSection] = useState<number | null>(null);

  return (
    <Shell>
      <div className="mb-4 border-b border-border pb-4 flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold font-mono text-primary uppercase tracking-widest">
            Curriculum Matrix
          </h1>
          <p className="text-muted-foreground font-mono text-xs mt-2 uppercase">Hierarchical Knowledge Access</p>
        </div>
        {selectedSection && (
           <Button asChild size="sm" variant="outline" className="text-xs">
             <Link href={`/questions/new?sectionId=${selectedSection}`}>
               <Plus className="mr-2 h-3 w-3" /> Inject Question
             </Link>
           </Button>
        )}
      </div>

      <div className="grid md:grid-cols-3 gap-6 h-[calc(100dvh-180px)]">
        <div className="border border-border bg-card overflow-y-auto p-4 flex flex-col font-mono text-sm">
          <div className="text-[10px] text-muted-foreground uppercase tracking-widest mb-4 font-bold border-b border-border pb-2">
            Directory Structure
          </div>
          <ClassTree onSelectSection={setSelectedSection} selectedSection={selectedSection} />
        </div>

        <div className="md:col-span-2 border border-border bg-card overflow-y-auto p-0 relative">
          {selectedSection ? (
            <SectionWorkspace sectionId={selectedSection} />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-muted-foreground text-sm font-mono flex-col gap-4">
              <Settings2 className="h-12 w-12 opacity-20" />
              <p>AWAITING SELECTION PROTOCOL</p>
            </div>
          )}
        </div>
      </div>
    </Shell>
  );
}

function ClassTree({ onSelectSection, selectedSection }: { onSelectSection: (id: number) => void, selectedSection: number | null }) {
  const { data: classes } = useListClasses();
  return (
    <div className="space-y-1">
      {classes?.map(c => (
        <ClassNode key={c.id} c={c} onSelectSection={onSelectSection} selectedSection={selectedSection} />
      ))}
    </div>
  );
}

function ClassNode({ c, onSelectSection, selectedSection }: any) {
  const [open, setOpen] = useState(false);
  const { data: subjects } = useListSubjects({ classId: c.id }, { query: { enabled: open } as any });

  return (
    <div className="select-none">
      <div
        className="flex items-center gap-2 py-1 px-2 hover:bg-muted/50 cursor-pointer text-foreground"
        onClick={() => setOpen(!open)}
      >
        {open ? <ChevronDown className="h-3 w-3 opacity-50" /> : <ChevronRight className="h-3 w-3 opacity-50" />}
        <Folder className="h-3 w-3 text-primary" />
        <span className="truncate">{c.name}</span>
      </div>
      {open && subjects && (
        <div className="ml-4 pl-2 border-l border-border/50">
          {subjects.map((s: any) => (
            <SubjectNode key={s.id} s={s} onSelectSection={onSelectSection} selectedSection={selectedSection} />
          ))}
        </div>
      )}
    </div>
  );
}

function SubjectNode({ s, onSelectSection, selectedSection }: any) {
  const [open, setOpen] = useState(false);
  const { data: chapters } = useListChapters({ subjectId: s.id }, { query: { enabled: open } as any });

  return (
    <div className="select-none mt-1">
      <div
        className="flex items-center gap-2 py-1 px-2 hover:bg-muted/50 cursor-pointer text-foreground/90"
        onClick={() => setOpen(!open)}
      >
        {open ? <ChevronDown className="h-3 w-3 opacity-50" /> : <ChevronRight className="h-3 w-3 opacity-50" />}
        <Folder className="h-3 w-3 text-accent" />
        <span className="truncate">{s.name}</span>
      </div>
      {open && chapters && (
        <div className="ml-4 pl-2 border-l border-border/50">
          {chapters.map((ch: any) => (
            <ChapterNode key={ch.id} ch={ch} onSelectSection={onSelectSection} selectedSection={selectedSection} />
          ))}
        </div>
      )}
    </div>
  );
}

function ChapterNode({ ch, onSelectSection, selectedSection }: any) {
  const [open, setOpen] = useState(false);
  const { data: sections } = useListSections({ chapterId: ch.id }, { query: { enabled: open } as any });

  return (
    <div className="select-none mt-1">
      <div
        className="flex items-center gap-2 py-1 px-2 hover:bg-muted/50 cursor-pointer text-foreground/80"
        onClick={() => setOpen(!open)}
      >
        {open ? <ChevronDown className="h-3 w-3 opacity-50" /> : <ChevronRight className="h-3 w-3 opacity-50" />}
        <Folder className="h-3 w-3 text-secondary-foreground/60" />
        <span className="truncate">{ch.name}</span>
      </div>
      {open && sections && (
        <div className="ml-4 pl-2 border-l border-border/50">
          {sections.map((sec: any) => (
            <div
              key={sec.id}
              onClick={() => onSelectSection(sec.id)}
              className={`flex items-center justify-between py-1.5 px-2 mt-1 cursor-pointer transition-colors ${
                selectedSection === sec.id
                  ? "bg-primary/20 text-primary border-l-2 border-primary -ml-[2px]"
                  : "hover:bg-muted/50 text-foreground/70"
              }`}
            >
              <div className="flex items-center gap-2 overflow-hidden">
                <FileText className="h-3 w-3 opacity-50 flex-shrink-0" />
                <span className="truncate text-xs">{sec.name}</span>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <Badge variant="outline" className="text-[8px] px-1 py-0 h-4 border-muted-foreground/30">
                  {sec.questionCount || 0}
                </Badge>
                <Badge variant="secondary" className="text-[7px] px-1 py-0 h-4 hidden xl:inline-flex">
                  {SECTION_TYPE_LABELS[sec.sectionType] || sec.sectionType}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Chapter Workspace ─────────────────────────────────────────────────────────
function SectionWorkspace({ sectionId }: { sectionId: number }) {
  const { data: section } = useGetSection(sectionId);

  const isFlashcards = section?.sectionType === "flashcards";

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-border bg-muted/20 flex justify-between items-center sticky top-0 z-10 backdrop-blur-sm">
        <div>
          <div className="font-mono text-sm text-foreground uppercase font-bold">
            {section?.name ?? "Sector"}
          </div>
          {section?.sectionType && (
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="outline" className="text-[9px] text-primary border-primary/40">
                {SECTION_TYPE_LABELS[section.sectionType] || section.sectionType}
              </Badge>
              <span className="font-mono text-[10px] text-muted-foreground">
                Sector [{sectionId}]
              </span>
            </div>
          )}
        </div>
        <div className="flex gap-2">
          <Button asChild size="sm" variant="outline" className="h-7 text-[10px]">
            <Link href={`/questions/new?sectionId=${sectionId}`}>
              <Plus className="mr-1 h-3 w-3" /> NEW
            </Link>
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {isFlashcards ? (
          <FlashcardsPanel sectionId={sectionId} />
        ) : (
          <QuestionExplorer sectionId={sectionId} />
        )}
      </div>
    </div>
  );
}

// ── Question Explorer ─────────────────────────────────────────────────────────
function QuestionExplorer({ sectionId }: { sectionId: number }) {
  const [cursor, setCursor] = useState<number | null>(null);
  const [backStack, setBackStack] = useState<number[]>([]);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [difficulty, setDifficulty] = useState<string | undefined>(undefined);
  const [referenceYear, setReferenceYear] = useState<number | undefined>(undefined);
  const [referenceType, setReferenceType] = useState<string | undefined>(undefined);
  const [tag, setTag] = useState<string | undefined>(undefined);
  const [status, setStatus] = useState<string | undefined>(undefined);
  const [questionType, setQuestionType] = useState<string | undefined>(undefined);
  const [view, setView] = useState<"list" | "study" | "reading">("list");

  const params = {
    sectionId,
    cursor: cursor ?? undefined,
    limit: 25,
    search: search || undefined,
    difficulty,
    referenceYear,
    referenceType,
    tag,
    status,
    questionType,
  };

  const { data, isLoading, isFetching } = useExploreQuestions(params);
  const { data: countData } = useCountExploredQuestions({
    sectionId,
    search: search || undefined,
    difficulty,
    referenceYear,
    referenceType,
    tag,
    status,
    questionType,
  });
  const { data: tagsData } = useListSectionTags(sectionId);
  const tags = tagsData?.tags ?? [];

  const questions = data?.questions ?? [];
  const hasMore = !!data?.hasMore;

  const applyFilters = () => {
    setBackStack([]);
    setCursor(null);
    setSearch(searchInput.trim());
  };

  const resetFilters = () => {
    setSearch(""); setSearchInput("");
    setDifficulty(undefined); setReferenceYear(undefined);
    setReferenceType(undefined); setTag(undefined);
    setStatus(undefined); setQuestionType(undefined);
    setBackStack([]); setCursor(null);
  };

  const nextPage = () => {
    if (data?.nextCursor != null) {
      setBackStack((s) => [...s, cursor ?? 0]);
      setCursor(data.nextCursor);
    }
  };

  const prevPage = () => {
    const prev = backStack[backStack.length - 1];
    if (prev != null) {
      setCursor(prev === 0 ? null : prev);
      setBackStack((s) => s.slice(0, -1));
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Filter bar */}
      <div className="p-3 border-b border-border bg-muted/10 space-y-2">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              className="pl-8 h-9 font-mono text-xs"
              placeholder="Search question text / answers..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && applyFilters()}
            />
          </div>
          <Button size="sm" className="h-9 text-xs" onClick={applyFilters}>FILTER</Button>
          <Button size="sm" variant="outline" className="h-9 text-xs" onClick={resetFilters}>RESET</Button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <Select value={difficulty ?? "all"} onValueChange={(v) => setDifficulty(v === "all" ? undefined : v)}>
            <SelectTrigger className="h-8 font-mono text-[10px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Difficulty</SelectItem>
              <SelectItem value="easy">Easy</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="hard">Hard</SelectItem>
            </SelectContent>
          </Select>
          <Select value={referenceType ?? "all"} onValueChange={(v) => setReferenceType(v === "all" ? undefined : v)}>
            <SelectTrigger className="h-8 font-mono text-[10px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Source Types</SelectItem>
              <SelectItem value="board_paper">Board Paper</SelectItem>
              <SelectItem value="coaching_paper">Coaching Paper</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
          <Select value={questionType ?? "all"} onValueChange={(v) => setQuestionType(v === "all" ? undefined : v)}>
            <SelectTrigger className="h-8 font-mono text-[10px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Formats</SelectItem>
              <SelectItem value="mcq">MCQ</SelectItem>
              <SelectItem value="short">Short</SelectItem>
              <SelectItem value="long">Long</SelectItem>
            </SelectContent>
          </Select>
          <Select value={status ?? "all"} onValueChange={(v) => setStatus(v === "all" ? undefined : v)}>
            <SelectTrigger className="h-8 font-mono text-[10px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All States</SelectItem>
              <SelectItem value="solved">Solved</SelectItem>
              <SelectItem value="wrong">Wrong</SelectItem>
              <SelectItem value="bookmarked">Bookmarked</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Input
            type="number"
            className="h-8 w-24 font-mono text-[10px]"
            placeholder="Year"
            value={referenceYear ?? ""}
            onChange={(e) => setReferenceYear(e.target.value ? parseInt(e.target.value, 10) : undefined)}
          />
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-1 items-center">
              {tags.map((t) => (
                <button
                  key={t}
                  onClick={() => setTag(tag === t ? undefined : t)}
                  className={`px-2 py-0.5 text-[9px] font-mono border transition-colors ${
                    tag === t ? "border-primary bg-primary/20 text-primary" : "border-border hover:border-primary/50"
                  }`}
                >
                  #{t}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Toolbar */}
      <div className="p-2 border-b border-border bg-muted/10 flex justify-between items-center">
        <div className="font-mono text-[10px] text-muted-foreground uppercase">
          Records: <span className="text-primary font-bold">{countData?.total ?? "..."}</span>
        </div>
        <div className="flex gap-1">
          {([
            ["list", "LIST", Table2],
            ["study", "STUDY", BookOpen],
            ["reading", "READING", Printer],
          ] as const).map(([v, label, Icon]) => (
            <Button
              key={v}
              size="sm"
              variant={view === v ? "default" : "outline"}
              className="h-7 text-[10px]"
              onClick={() => setView(v)}
            >
              <Icon className="mr-1 h-3 w-3" /> {label}
            </Button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {isLoading ? (
          <div className="p-8 text-center text-muted-foreground font-mono animate-pulse">EXTRACTING DATA...</div>
        ) : questions.length === 0 ? (
          <div className="text-center p-12 text-muted-foreground font-mono text-sm border border-dashed border-border">
            NO RECORDS MATCH FILTERS
          </div>
        ) : (
          questions.map((q: any) => (
            <QuestionCard key={q.id} q={q} view={view} sectionId={sectionId} />
          ))
        )}

        {isFetching && !isLoading && (
          <div className="text-center text-[10px] text-muted-foreground font-mono animate-pulse">SYNCING...</div>
        )}

        {/* Pagination */}
        <div className="flex gap-2 justify-center pt-2 sticky bottom-0 bg-card/80 backdrop-blur-sm py-2">
          <Button
            variant="outline" size="sm" className="h-7 text-[10px]"
            disabled={backStack.length === 0}
            onClick={prevPage}
          >
            &lt; PREV
          </Button>
          <Button
            variant="outline" size="sm" className="h-7 text-[10px]"
            disabled={!hasMore}
            onClick={nextPage}
          >
            NEXT &gt;
          </Button>
        </div>
      </div>
    </div>
  );
}

function QuestionCard({ q, view, sectionId }: { q: any; view: "list" | "study" | "reading"; sectionId: number }) {
  const [revealed, setRevealed] = useState(false);
  const [explain, setExplain] = useState<{ text: string; citations: { page: number; filename: string; snippet: string }[] } | null>(null);
  const [explaining, setExplaining] = useState(false);
  const { mutate: explainFromBook } = useExplainFromBook();

  const runExplain = () => {
    if (explaining) return;
    setExplain(null);
    setExplaining(true);
    explainFromBook(
      { data: { questionText: q.questionText, questionId: q.id } },
      {
        onSuccess: (res) => {
          setExplain({ explanation: res.explanation, citations: res.citations ?? [] });
          setExplaining(false);
        },
        onError: () => {
          setExplaining(false);
        },
      }
    );
  };

  if (view === "reading") {
    return (
      <div className="border border-border bg-background p-6 relative">
        <div className="flex gap-2 mb-3">
          <Badge variant="default" className="text-[10px]">{q.questionType}</Badge>
          {q.difficulty && <Badge variant="outline" className="text-[10px]">{q.difficulty}</Badge>}
          {q.referenceYear && <Badge variant="outline" className="text-[10px]">{q.referenceYear}</Badge>}
        </div>
        <div className="font-serif text-sm leading-relaxed mb-4">{q.questionText}</div>
        {q.bookExplanation && (
          <div className="mt-4 p-3 border-l-2 border-primary/50 bg-primary/5">
            <p className="font-mono text-[10px] text-primary uppercase mb-1">Book Reference {q.bookPage ? `(p.${q.bookPage})` : ""}</p>
            <p className="font-serif text-sm">{q.bookExplanation}</p>
          </div>
        )}
        {q.explanation && (
          <div className="mt-4 p-3 border-l-2 border-muted bg-muted/20">
            <p className="font-mono text-[10px] text-muted-foreground uppercase mb-1">Explanation</p>
            <p className="font-serif text-sm">{q.explanation}</p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="border border-border bg-background p-4 relative group">
      <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
        <Button asChild size="sm" variant="secondary" className="h-7 text-[10px]">
          <Link href={`/questions/${q.id}`}>EDIT</Link>
        </Button>
        {view === "study" && (
          <Button size="sm" variant="outline" className="h-7 text-[10px]" onClick={() => setRevealed(!revealed)}>
            {revealed ? "HIDE" : "REVEAL"}
          </Button>
        )}
      </div>

      <div className="flex gap-2 mb-3 flex-wrap">
        <Badge variant="default" className="text-[10px]">{q.questionType}</Badge>
        {q.difficulty && <Badge variant="outline" className="text-[10px]">{q.difficulty}</Badge>}
        {q.referenceYear && <Badge variant="outline" className="text-[10px]">{q.referenceYear}</Badge>}
        {q.referenceType && <Badge variant="secondary" className="text-[10px]">{q.referenceType.replace('_', ' ')}</Badge>}
        {q.userStatus && <Badge variant={q.userStatus === "solved" ? "default" : q.userStatus === "wrong" ? "destructive" : "outline"} className="text-[10px]">{q.userStatus}</Badge>}
        {Array.isArray(q.tags) && q.tags.length > 0 && q.tags.map((t: string) => (
          <Badge key={t} variant="outline" className="text-[9px] text-primary border-primary/30">#{t}</Badge>
        ))}
      </div>

      <div className="font-sans text-sm mb-4">{q.questionText}</div>

      {q.questionType === "mcq" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-4 text-xs font-mono">
          {(["A", "B", "C", "D"] as const).map((opt) => (
            <div
              key={opt}
              className={`p-2 border transition-colors ${
                (view === "study" && revealed && q.correctOption === opt)
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border"
              }`}
            >
              <span className="opacity-50 mr-2">{opt}]</span> {q[`option${opt}`]}
            </div>
          ))}
        </div>
      )}

      {view === "study" && revealed && (q.modelAnswer || q.explanation) && (
        <div className="mt-4 p-3 border-l-2 border-primary bg-primary/5 space-y-2">
          {q.modelAnswer && (
            <div>
              <p className="font-mono text-[10px] text-primary uppercase">Model Answer</p>
              <p className="font-sans text-xs mt-1">{q.modelAnswer}</p>
            </div>
          )}
          {q.explanation && (
            <div>
              <p className="font-mono text-[10px] text-muted-foreground uppercase">Explanation</p>
              <p className="font-sans text-xs mt-1">{q.explanation}</p>
            </div>
          )}
        </div>
      )}

      {view === "list" && q.modelAnswer && (
        <details className="mt-3 text-xs">
          <summary className="font-mono text-[10px] text-muted-foreground uppercase cursor-pointer hover:text-primary">Model Answer</summary>
          <p className="font-sans text-xs mt-2">{q.modelAnswer}</p>
        </details>
      )}
    </div>
  );
}

// ── Flashcards ────────────────────────────────────────────────────────────────
function FlashcardsPanel({ sectionId }: { sectionId: number }) {
  const [search, setSearch] = useState("");
  const { data } = useListFlashcards({ sectionId, search: search || undefined, limit: 100 });
  const flashcards = data?.flashcards ?? [];

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b border-border bg-muted/10">
        <Input
          className="h-9 font-mono text-xs"
          placeholder="Search flashcards..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>
      <div className="flex-1 overflow-y-auto p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {flashcards.map((fc) => (
            <Flashcard key={fc.id} fc={fc} />
          ))}
        </div>
        {flashcards.length === 0 && (
          <div className="text-center p-12 text-muted-foreground font-mono text-sm border border-dashed border-border">
            NO CARDS IN THIS DECK
          </div>
        )}
      </div>
    </div>
  );
}

function Flashcard({ fc }: { fc: any }) {
  const [flipped, setFlipped] = useState(false);

  return (
    <div
      className="border border-border bg-background p-4 min-h-[140px] cursor-pointer relative group"
      onClick={() => setFlipped(!flipped)}
    >
      <div className="absolute top-2 right-2 flex items-center gap-1">
        <Badge variant="outline" className="text-[9px] text-muted-foreground">
          {flipped ? "BACK" : "FRONT"}
        </Badge>
        {fc.referenceYear && <Badge variant="outline" className="text-[9px]">{fc.referenceYear}</Badge>}
      </div>
      {!flipped ? (
        <div className="pt-4">
          <p className="font-mono text-[10px] text-muted-foreground uppercase mb-2">Front</p>
          <p className="font-sans text-sm">{fc.front}</p>
        </div>
      ) : (
        <div className="pt-4">
          <p className="font-mono text-[10px] text-primary uppercase mb-2">Back</p>
          <p className="font-sans text-sm">{fc.back}</p>
        </div>
      )}
    </div>
  );
}
