import { useState } from "react";
import { Shell } from "@/components/layout/shell";
import { useListClasses, useListSubjects, useListChapters, useListSections, useListQuestions } from "@workspace/api-client-react";
import { ChevronRight, ChevronDown, Folder, FileText, Settings2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";

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
            <SectionQuestions sectionId={selectedSection} />
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
              <Badge variant="outline" className="text-[8px] px-1 py-0 h-4 border-muted-foreground/30 ml-2">
                {sec.questionCount || 0}
              </Badge>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SectionQuestions({ sectionId }: { sectionId: number }) {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useListQuestions({ sectionId, page, limit: 10 });

  if (isLoading) return <div className="p-8 text-center text-muted-foreground font-mono animate-pulse">EXTRACTING DATA...</div>;
  if (!data) return null;

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-border bg-muted/20 flex justify-between items-center sticky top-0 z-10 backdrop-blur-sm">
        <div className="font-mono text-xs text-muted-foreground uppercase">
          Records Found: <span className="text-primary font-bold">{data.total}</span>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            className="h-7 text-xs" 
            disabled={page === 1}
            onClick={() => setPage(p => p - 1)}
          >
            &lt; PREV
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            className="h-7 text-xs"
            disabled={page * data.limit >= data.total}
            onClick={() => setPage(p => p + 1)}
          >
            NEXT &gt;
          </Button>
        </div>
      </div>
      
      <div className="p-4 space-y-4">
        {data.questions.map(q => (
          <div key={q.id} className="border border-border bg-background p-4 relative group">
            <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button asChild size="sm" variant="secondary" className="h-7 text-[10px]">
                <Link href={`/questions/${q.id}`}>EDIT RECORD</Link>
              </Button>
            </div>
            
            <div className="flex gap-2 mb-3">
              <Badge variant="default" className="text-[10px]">{q.questionType}</Badge>
              {q.referenceYear && <Badge variant="outline" className="text-[10px]">{q.referenceYear}</Badge>}
              {q.referenceType && <Badge variant="secondary" className="text-[10px]">{q.referenceType.replace('_', ' ')}</Badge>}
            </div>
            
            <div className="font-sans text-sm mb-4">
              {q.questionText}
            </div>

            {q.questionType === "mcq" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-4 text-xs font-mono">
                <div className={`p-2 border ${q.correctOption === 'A' ? 'border-primary bg-primary/10 text-primary' : 'border-border'}`}>
                  <span className="opacity-50 mr-2">A]</span> {q.optionA}
                </div>
                <div className={`p-2 border ${q.correctOption === 'B' ? 'border-primary bg-primary/10 text-primary' : 'border-border'}`}>
                  <span className="opacity-50 mr-2">B]</span> {q.optionB}
                </div>
                <div className={`p-2 border ${q.correctOption === 'C' ? 'border-primary bg-primary/10 text-primary' : 'border-border'}`}>
                  <span className="opacity-50 mr-2">C]</span> {q.optionC}
                </div>
                <div className={`p-2 border ${q.correctOption === 'D' ? 'border-primary bg-primary/10 text-primary' : 'border-border'}`}>
                  <span className="opacity-50 mr-2">D]</span> {q.optionD}
                </div>
              </div>
            )}
          </div>
        ))}
        
        {data.questions.length === 0 && (
          <div className="text-center p-12 text-muted-foreground font-mono text-sm border border-dashed border-border">
            NO RECORDS IN THIS SECTOR
          </div>
        )}
      </div>
    </div>
  );
}
