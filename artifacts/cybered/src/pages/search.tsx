import { useState } from "react";
import { Shell } from "@/components/layout/shell";
import { useSearchQuestions } from "@workspace/api-client-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search as SearchIcon, Filter } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";

export default function Search() {
  const [query, setQuery] = useState("");
  const [params, setParams] = useState<any>({ q: "" });
  const [page, setPage] = useState(1);

  const { data, isLoading } = useSearchQuestions(
    { ...params, page, limit: 10 },
    { query: { enabled: params.q !== "" || !!params.questionType || !!params.referenceType || !!params.referenceYearFrom } as any }
  );

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    setParams({ ...params, q: query });
  };

  return (
    <Shell>
      <div className="mb-6">
        <h1 className="text-2xl font-bold font-mono text-primary uppercase tracking-widest">
          Global Query
        </h1>
      </div>

      <div className="grid md:grid-cols-4 gap-6">
        <div className="md:col-span-1 space-y-4">
          <form onSubmit={handleSearch} className="space-y-4">
            <div>
              <label className="text-[10px] font-mono font-bold uppercase text-muted-foreground mb-1 block">Keywords</label>
              <div className="relative">
                <SearchIcon className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input 
                  value={query} 
                  onChange={e => setQuery(e.target.value)} 
                  placeholder="Query string..." 
                  className="pl-9"
                />
              </div>
            </div>
            
            <div className="p-4 border border-border bg-card space-y-4">
              <h3 className="font-mono text-xs uppercase flex items-center gap-2 border-b border-border pb-2">
                <Filter className="h-3 w-3" /> Filters
              </h3>
              
              <div>
                <label className="text-[10px] font-mono uppercase text-muted-foreground block mb-1">Format</label>
                <Select onValueChange={v => setParams({ ...params, questionType: v === "all" ? undefined : v })}>
                  <SelectTrigger className="h-8"><SelectValue placeholder="All formats" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Formats</SelectItem>
                    <SelectItem value="mcq">MCQ</SelectItem>
                    <SelectItem value="short">Short Answer</SelectItem>
                    <SelectItem value="long">Long Answer</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-[10px] font-mono uppercase text-muted-foreground block mb-1">Source</label>
                <Select onValueChange={v => setParams({ ...params, referenceType: v === "all" ? undefined : v })}>
                  <SelectTrigger className="h-8"><SelectValue placeholder="All sources" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Sources</SelectItem>
                    <SelectItem value="board_paper">Board Paper</SelectItem>
                    <SelectItem value="coaching_paper">Coaching Paper</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-[10px] font-mono uppercase text-muted-foreground block mb-1">Year (exact)</label>
                <Input 
                  type="number" 
                  className="h-8" 
                  placeholder="e.g. 2022" 
                  onChange={e => {
                    const v = e.target.value ? parseInt(e.target.value) : undefined;
                    setParams({ ...params, referenceYearFrom: v, referenceYearTo: v });
                  }} 
                />
              </div>
            </div>

            <Button type="submit" className="w-full">EXECUTE QUERY</Button>
          </form>
        </div>

        <div className="md:col-span-3 border border-border bg-card">
          <div className="p-3 border-b border-border bg-muted/20 flex justify-between items-center text-xs font-mono text-muted-foreground uppercase">
            <span>Query Results {data && `[${data.total} matches]` }</span>
          </div>
          
          <div className="p-4 space-y-4 overflow-y-auto max-h-[calc(100dvh-200px)]">
            {isLoading ? (
              <div className="text-center p-8 animate-pulse text-primary font-mono text-sm">SCANNING ARCHIVES...</div>
            ) : data?.questions.length ? (
              data.questions.map(q => (
                <div key={q.id} className="border border-border/50 p-4 hover:bg-muted/10 transition-colors relative group">
                  <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button asChild size="sm" variant="outline" className="h-7 text-[10px]">
                      <Link href={`/questions/${q.id}`}>VIEW</Link>
                    </Button>
                  </div>
                  <div className="flex gap-2 mb-2">
                    <Badge variant="secondary" className="text-[10px]">{q.questionType}</Badge>
                    {q.referenceYear && <Badge variant="outline" className="text-[10px] border-muted-foreground/30 text-muted-foreground">{q.referenceYear}</Badge>}
                  </div>
                  <p className="font-sans text-sm text-foreground/90">{q.questionText}</p>
                </div>
              ))
            ) : (
              <div className="text-center p-12 text-muted-foreground font-mono text-sm">
                NO MATCHING RECORDS FOUND
              </div>
            )}

            {data && data.total > data.limit && (
              <div className="flex justify-between items-center pt-4 border-t border-border/50">
                <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>&lt; PREV</Button>
                <span className="font-mono text-xs text-muted-foreground">PAGE {page}</span>
                <Button variant="outline" size="sm" disabled={page * data.limit >= data.total} onClick={() => setPage(p => p + 1)}>NEXT &gt;</Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </Shell>
  );
}
