import { useState, useEffect } from "react";
import { useParams, Link } from "wouter";
import { Shell } from "@/components/layout/shell";
import { useGetTest, useSubmitTest } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, CheckCircle2, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export default function TestView() {
  const { id } = useParams();
  const numId = parseInt(id || "0", 10);
  const { data: test, isLoading } = useGetTest(numId, { query: { enabled: !!numId } as any });
  const { mutate: submitTest, isPending: isSubmitting } = useSubmitTest();
  const { toast } = useToast();

  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, any>>({});
  const [result, setResult] = useState<any>(null); // TestResult

  if (isLoading) return <Shell><div className="p-12 text-center text-primary font-mono animate-pulse">LOADING SIMULATION ENVIRONMENT...</div></Shell>;
  if (!test) return <Shell><div className="p-12 text-center text-destructive font-mono">SIMULATION NOT FOUND</div></Shell>;

  const questions = test.questions || [];
  const q = questions[currentIndex];

  const handleSelectOption = (questionId: number, option: string) => {
    if (result) return; // Prevent change after submit
    setAnswers(prev => ({ ...prev, [questionId]: { ...prev[questionId], selectedOption: option } }));
  };

  const handleWriteAnswer = (questionId: number, text: string) => {
    if (result) return;
    setAnswers(prev => ({ ...prev, [questionId]: { ...prev[questionId], writtenAnswer: text } }));
  };

  const handleSubmit = () => {
    const formattedAnswers = Object.entries(answers).map(([qId, ans]) => ({
      questionId: parseInt(qId, 10),
      selectedOption: ans.selectedOption || null,
      writtenAnswer: ans.writtenAnswer || null
    }));

    submitTest({ testId: numId, data: { answers: formattedAnswers } }, {
      onSuccess: (res) => {
        setResult(res);
        toast({ title: "EVALUATION COMPLETE", description: `Score: ${res.score}/${res.totalMarks}` });
      },
      onError: () => toast({ title: "SUBMISSION FAILED", variant: "destructive" })
    });
  };

  const isLast = currentIndex === questions.length - 1;
  const isFirst = currentIndex === 0;

  return (
    <Shell>
      <div className="mb-6 flex justify-between items-center">
        <div className="flex items-center gap-4">
          <Button asChild variant="outline" size="icon" className="h-8 w-8">
            <Link href="/tests"><ArrowLeft className="h-4 w-4" /></Link>
          </Button>
          <div>
            <h1 className="text-xl font-bold font-mono text-primary uppercase tracking-widest leading-none">
              {test.title}
            </h1>
            <p className="text-muted-foreground font-mono text-[10px] mt-1 uppercase">
              Simulation in progress // Qs: {questions.length} // Marks: {test.totalMarks}
            </p>
          </div>
        </div>
        
        {result && (
          <div className="px-4 py-2 bg-primary text-primary-foreground font-mono font-bold border border-primary">
            SCORE: {result.score} / {result.totalMarks}
          </div>
        )}
      </div>

      <div className="grid md:grid-cols-4 gap-6 h-[calc(100dvh-200px)]">
        <div className="md:col-span-3 border border-border bg-card flex flex-col relative">
          {/* Progress bar */}
          <div className="h-1 bg-muted w-full absolute top-0 left-0">
            <div 
              className="h-full bg-primary transition-all duration-300" 
              style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
            />
          </div>

          <div className="p-6 md:p-8 flex-1 overflow-y-auto mt-2">
            <div className="flex justify-between items-center mb-6">
              <Badge variant="outline" className="font-mono">Question {currentIndex + 1} of {questions.length}</Badge>
              <div className="flex gap-2">
                <Badge variant="secondary">{q.questionType.toUpperCase()}</Badge>
                {q.marks && <Badge>{q.marks} MARKS</Badge>}
              </div>
            </div>

            <div className="text-lg font-sans mb-8 leading-relaxed">
              {q.questionText}
            </div>

            {q.questionType === "mcq" && (
              <div className="space-y-3">
                {['A', 'B', 'C', 'D'].map(opt => {
                  const val = (q as any)[`option${opt}`];
                  if (!val) return null;
                  
                  const isSelected = answers[q.id]?.selectedOption === opt;
                  
                  // Post-submit styling
                  let resStyle = "";
                  if (result) {
                    const qRes = result.results.find((r: any) => r.questionId === q.id);
                    if (qRes?.correctOption === opt) {
                      resStyle = "bg-primary/20 border-primary text-primary";
                    } else if (isSelected && qRes?.correctOption !== opt) {
                      resStyle = "bg-destructive/20 border-destructive text-destructive line-through opacity-70";
                    } else {
                      resStyle = "opacity-50 grayscale";
                    }
                  } else {
                    resStyle = isSelected ? "bg-accent/20 border-accent text-accent" : "hover:bg-muted/50 border-border cursor-pointer";
                  }

                  return (
                    <div 
                      key={opt}
                      onClick={() => handleSelectOption(q.id, opt)}
                      className={cn(
                        "p-4 border transition-all font-mono text-sm flex items-start gap-3",
                        resStyle
                      )}
                    >
                      <span className="font-bold opacity-70">[{opt}]</span>
                      <span>{val}</span>
                      {result && result.results.find((r: any) => r.questionId === q.id)?.correctOption === opt && (
                        <CheckCircle2 className="h-4 w-4 ml-auto text-primary" />
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {q.questionType !== "mcq" && (
              <div className="space-y-4">
                <textarea
                  className="w-full min-h-[150px] p-4 bg-background border border-input font-sans text-sm focus:outline-none focus:border-primary disabled:opacity-70 disabled:cursor-not-allowed"
                  placeholder="Enter your response here..."
                  value={answers[q.id]?.writtenAnswer || ""}
                  onChange={e => handleWriteAnswer(q.id, e.target.value)}
                  disabled={!!result}
                />
              </div>
            )}

            {result && (
              <div className="mt-8 p-4 border border-border bg-muted/10 space-y-4 animate-in fade-in">
                <h3 className="font-mono text-xs uppercase font-bold text-primary border-b border-primary/20 pb-2">Analysis / Feedback</h3>
                
                {q.questionType !== "mcq" && result.results.find((r: any) => r.questionId === q.id)?.modelAnswer && (
                  <div>
                    <span className="text-[10px] text-muted-foreground uppercase block mb-1">Model Answer</span>
                    <p className="font-sans text-sm text-foreground/90 bg-background border border-border/50 p-3">
                      {result.results.find((r: any) => r.questionId === q.id)?.modelAnswer}
                    </p>
                  </div>
                )}
                
                {result.results.find((r: any) => r.questionId === q.id)?.explanation && (
                  <div>
                    <span className="text-[10px] text-muted-foreground uppercase block mb-1">Explanation</span>
                    <p className="font-sans text-sm text-foreground/90">
                      {result.results.find((r: any) => r.questionId === q.id)?.explanation}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="p-4 border-t border-border bg-muted/20 flex justify-between">
            <Button variant="outline" disabled={isFirst} onClick={() => setCurrentIndex(i => i - 1)}>
              &lt; PREV
            </Button>
            
            {!result && isLast ? (
              <Button onClick={handleSubmit} disabled={isSubmitting} variant="default">
                {isSubmitting ? "PROCESSING..." : "SUBMIT SIMULATION"}
              </Button>
            ) : (
              <Button variant="outline" disabled={isLast} onClick={() => setCurrentIndex(i => i + 1)}>
                NEXT &gt;
              </Button>
            )}
          </div>
        </div>

        <div className="border border-border bg-card p-4 overflow-y-auto">
          <div className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest mb-4 font-bold border-b border-border pb-2">
            Navigation Map
          </div>
          <div className="grid grid-cols-4 gap-2">
            {questions.map((qItem, idx) => {
              const isCurrent = idx === currentIndex;
              const hasAnswer = qItem.questionType === "mcq" ? !!answers[qItem.id]?.selectedOption : !!answers[qItem.id]?.writtenAnswer;
              
              let statusClass = "border-border text-muted-foreground hover:bg-muted/50";
              if (result) {
                const qRes = result.results.find((r: any) => r.questionId === qItem.id);
                if (qRes?.isCorrect) statusClass = "border-primary bg-primary/10 text-primary";
                else if (qItem.questionType === "mcq") statusClass = "border-destructive bg-destructive/10 text-destructive"; // only strictly grade mcq for now
                else statusClass = "border-accent bg-accent/10 text-accent"; // manual review needed
              } else {
                if (isCurrent) statusClass = "border-foreground text-foreground";
                else if (hasAnswer) statusClass = "border-primary/50 text-primary bg-primary/5";
              }

              return (
                <button
                  key={qItem.id}
                  onClick={() => setCurrentIndex(idx)}
                  className={cn(
                    "aspect-square flex items-center justify-center font-mono text-xs border transition-colors relative",
                    statusClass
                  )}
                >
                  {idx + 1}
                  {isCurrent && !result && <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1/2 h-[2px] bg-foreground" />}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </Shell>
  );
}
