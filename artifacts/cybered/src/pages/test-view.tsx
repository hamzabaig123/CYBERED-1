import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, Link } from "wouter";
import { Shell } from "@/components/layout/shell";
import {
  useGetTest,
  useSubmitTest,
  useSaveTestDraft,
  useSelfGradeTest,
  useScheduleRevision,
  useSetQuestionState,
} from "@workspace/api-client-react";
import type { TestResult, TestQuestionItem, QuestionResultItem } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, CheckCircle2, XCircle, Timer, Target, Loader2, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

type Answer = { selectedOption?: string | null; writtenAnswer?: string | null };
type SelfGradeMap = Record<number, string>;

export default function TestView() {
  const { id } = useParams();
  const numId = parseInt(id || "0", 10);
  const { data: test, isLoading } = useGetTest(numId, { query: { enabled: !!numId } as any });
  const { mutate: submitTest, isPending: isSubmitting } = useSubmitTest();
  const { mutate: saveDraft, isPending: draftSaving } = useSaveTestDraft();
  const { mutate: selfGrade, isPending: isGrading } = useSelfGradeTest();
  const { mutate: scheduleRevision, isPending: revising } = useScheduleRevision();
  const { mutate: setQuestionState } = useSetQuestionState();
  const { toast } = useToast();

  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, Answer>>({});
  const [result, setResult] = useState<TestResult | null>(null);
  const [remainingSec, setRemainingSec] = useState<number | null>(null);
  const [selfGrades, setSelfGrades] = useState<SelfGradeMap>({});
  const [addedToRevision, setAddedToRevision] = useState(false);

  const answersRef = useRef<Record<number, Answer>>({});
  answersRef.current = answers;
  const draftIdRef = useRef<number | null>(null);
  const startedAtRef = useRef<number | null>(null);
  const submittedRef = useRef(false);

  const isExam = test?.mode === "exam";
  const questions: TestQuestionItem[] = test?.questions || [];
  const q = questions[currentIndex];
  const isLast = currentIndex === questions.length - 1;
  const isFirst = currentIndex === 0;

  const formatAnswers = useCallback((src: Record<number, Answer>) =>
    Object.entries(src).map(([qId, ans]) => ({
      questionId: parseInt(qId, 10),
      selectedOption: ans.selectedOption || null,
      writtenAnswer: ans.writtenAnswer || null,
    })), []);

  const doSubmit = useCallback((auto = false) => {
    if (submittedRef.current) return;
    submittedRef.current = true;
    submitTest({ testId: numId, data: { answers: formatAnswers(answersRef.current), draftId: draftIdRef.current } }, {
      onSuccess: (res) => {
        setResult(res);
        toast({
          title: auto ? "DEADLINE REACHED — AUTO-SUBMITTED" : "EVALUATION COMPLETE",
          description: `Score: ${res.score}/${res.totalMarks}`,
          variant: auto ? "default" : "default",
        });
      },
      onError: () => {
        submittedRef.current = false;
        toast({ title: "SUBMISSION FAILED", variant: "destructive" });
      },
    });
  }, [submitTest, numId, formatAnswers]);

  // Exam mode: create an in-progress draft to anchor the server deadline.
  useEffect(() => {
    if (!isExam || result || draftIdRef.current) return;
    saveDraft({ testId: numId, data: { attemptId: null, answers: [] } }, {
      onSuccess: (d) => {
        draftIdRef.current = d.attemptId;
        startedAtRef.current = new Date(d.startedAt).getTime();
        const deadline = startedAtRef.current + (test.timeLimitMinutes ?? 60) * 60000;
        setRemainingSec(Math.max(0, Math.floor((deadline - Date.now()) / 1000)));
      },
      onError: () => toast({ title: "DRAFT FAILED", variant: "destructive" }),
    });
  }, [isExam, result, numId, saveDraft, test?.timeLimitMinutes]);

  // Exam countdown + auto-submit.
  useEffect(() => {
    if (!isExam || result || startedAtRef.current == null) return;
    const deadline = startedAtRef.current + (test.timeLimitMinutes ?? 60) * 60000;
    const iv = setInterval(() => {
      const rem = Math.max(0, Math.floor((deadline - Date.now()) / 1000));
      setRemainingSec(rem);
      if (rem <= 0) {
        clearInterval(iv);
        doSubmit(true);
      }
    }, 1000);
    return () => clearInterval(iv);
  }, [isExam, result, test?.timeLimitMinutes, doSubmit]);

  // Exam autosave heartbeat (every 20s).
  useEffect(() => {
    if (!isExam || result || draftIdRef.current == null) return;
    const iv = setInterval(() => {
      saveDraft({ testId: numId, data: { attemptId: draftIdRef.current, answers: formatAnswers(answersRef.current) } }, {
        onError: () => {},
      });
    }, 20000);
    return () => clearInterval(iv);
  }, [isExam, result, numId, saveDraft, formatAnswers]);

  const handleSelectOption = (questionId: number, option: string) => {
    if (result) return;
    setAnswers(prev => ({ ...prev, [questionId]: { ...prev[questionId], selectedOption: option } }));
  };

  const handleWriteAnswer = (questionId: number, text: string) => {
    if (result) return;
    setAnswers(prev => ({ ...prev, [questionId]: { ...prev[questionId], writtenAnswer: text } }));
  };

  const handleSelfGrade = () => {
    if (!result) return;
    const payload = Object.entries(selfGrades)
      .filter(([qid, val]) => val !== "")
      .map(([qid, val]) => ({ questionId: parseInt(qid, 10), marksAwarded: parseInt(val, 10) || 0 }));

    selfGrade({ testId: numId, attemptId: result.attemptId, data: { answers: payload } }, {
      onSuccess: (res) => {
        setResult({ ...result, score: res.score, shortScore: res.shortScore, longScore: res.longScore, writtenScore: res.writtenScore, results: res.results });
        toast({ title: "SELF-GRADE APPLIED", description: `Score updated to ${res.score}/${res.totalMarks}` });
      },
      onError: () => toast({ title: "SELF-GRADE FAILED", variant: "destructive" }),
    });
  };

  const wrongQuestionIds = result?.results.filter(r => r.questionType === "mcq" && r.isCorrect === false).map(r => r.questionId) ?? [];
  const needsGradingCount = result?.results.filter(r => r.needsGrading).length ?? 0;

  const handleAddWrongToRevision = () => {
    if (wrongQuestionIds.length === 0) return;
    scheduleRevision({ data: { questionIds: wrongQuestionIds } }, {
      onSuccess: () => {
        wrongQuestionIds.forEach(qid =>
          setQuestionState({ questionId: qid, data: { status: "wrong", questionType: "mcq" } }, { onError: () => {} })
        );
        setAddedToRevision(true);
        toast({ title: "QUEUED FOR REVISION", description: `${wrongQuestionIds.length} questions added to spaced repetition.` });
      },
      onError: () => toast({ title: "REVISION QUEUE FAILED", variant: "destructive" }),
    });
  };

  if (isLoading) return <Shell><div className="p-12 text-center text-primary font-mono animate-pulse">LOADING SIMULATION ENVIRONMENT...</div></Shell>;
  if (!test) return <Shell><div className="p-12 text-center text-destructive font-mono">SIMULATION NOT FOUND</div></Shell>;
  if (!q) return <Shell><div className="p-12 text-center text-destructive font-mono">EMPTY SIMULATION</div></Shell>;

  const qResult: QuestionResultItem | undefined = result?.results.find(r => r.questionId === q.questionId);

  const mmss = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  };

  return (
    <Shell>
      <div className="mb-6 flex justify-between items-start gap-4">
        <div className="flex items-center gap-4">
          <Button asChild variant="outline" size="icon" className="h-8 w-8">
            <Link href="/tests"><ArrowLeft className="h-4 w-4" /></Link>
          </Button>
          <div>
            <h1 className="text-xl font-bold font-mono text-primary uppercase tracking-widest leading-none">
              {test.title}
            </h1>
            <p className="text-muted-foreground font-mono text-[10px] mt-1 uppercase">
              {isExam ? "Exam Mode // Server Deadline Active" : "Practice Mode // Instant Feedback"} // Qs: {questions.length} // Marks: {test.totalMarks}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {isExam && !result && remainingSec != null && (
            <div className={cn(
              "px-4 py-2 border font-mono font-bold flex items-center gap-2",
              remainingSec < 60 ? "border-destructive text-destructive bg-destructive/10 animate-pulse" : "border-accent text-accent bg-accent/5"
            )}>
              <Timer className="h-4 w-4" />
              {mmss(remainingSec)}
            </div>
          )}
          {isExam && !result && draftSaving && <Loader2 className="h-4 w-4 text-muted-foreground animate-spin" />}
          {result && (
            <div className="px-4 py-2 bg-primary text-primary-foreground font-mono font-bold border border-primary">
              SCORE: {result.score} / {result.totalMarks}
            </div>
          )}
        </div>
      </div>

      {result && (
        <div className="mb-6 flex flex-wrap gap-3 items-center">
          <div className="px-4 py-2 border border-border bg-card font-mono text-xs uppercase flex items-center gap-2">
            <span className="text-muted-foreground">Mcq</span><span className="text-primary font-bold">{result.mcqScore}</span>
            <span className="text-muted-foreground">Written</span><span className="text-accent font-bold">{result.writtenScore ?? 0}</span>
            <span className="text-muted-foreground">Auto</span><span className="font-bold">{result.autoSubmitted ? "YES" : "NO"}</span>
          </div>
          {result.autoSubmitted && (
            <Badge variant="destructive" className="text-[10px]">DEADLINE EXCEEDED — AUTO-SUBMITTED</Badge>
          )}
          {needsGradingCount > 0 && (
            <Badge variant="secondary" className="text-[10px]">{needsGradingCount} WRITTEN ANSWER(S) PENDING SELF-GRADE</Badge>
          )}
          {wrongQuestionIds.length > 0 && (
            <Button size="sm" variant="secondary" className="h-8 text-[10px]" onClick={handleAddWrongToRevision} disabled={addedToRevision || revising}>
              <Target className="mr-2 h-3 w-3" />
              {addedToRevision ? "IN REVISION QUEUE" : `QUEUE ${wrongQuestionIds.length} WRONG FOR REVISION`}
            </Button>
          )}
          {needsGradingCount > 0 && (
            <Button size="sm" variant="default" className="h-8 text-[10px]" onClick={handleSelfGrade} disabled={isGrading}>
              {isGrading ? <Loader2 className="mr-2 h-3 w-3 animate-spin" /> : <RefreshCw className="mr-2 h-3 w-3" />}
              GRADE SELF
            </Button>
          )}
        </div>
      )}

      <div className="grid md:grid-cols-4 gap-6 h-[calc(100dvh-240px)]">
        <div className="md:col-span-3 border border-border bg-card flex flex-col relative">
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

                  const isSelected = answers[q.questionId]?.selectedOption === opt;

                  let resStyle = "";
                  if (result) {
                    if (qResult?.correctOption === opt) {
                      resStyle = "bg-primary/20 border-primary text-primary";
                    } else if (isSelected && qResult?.correctOption !== opt) {
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
                      onClick={() => handleSelectOption(q.questionId, opt)}
                      className={cn(
                        "p-4 border transition-all font-mono text-sm flex items-start gap-3",
                        resStyle
                      )}
                    >
                      <span className="font-bold opacity-70">[{opt}]</span>
                      <span>{val}</span>
                      {result && qResult?.correctOption === opt && (
                        <CheckCircle2 className="h-4 w-4 ml-auto text-primary" />
                      )}
                      {result && isSelected && qResult?.correctOption !== opt && (
                        <XCircle className="h-4 w-4 ml-auto text-destructive" />
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
                  value={answers[q.questionId]?.writtenAnswer || ""}
                  onChange={e => handleWriteAnswer(q.questionId, e.target.value)}
                  disabled={!!result}
                />
              </div>
            )}

            {result && (
              <div className="mt-8 p-4 border border-border bg-muted/10 space-y-4 animate-in fade-in">
                <h3 className="font-mono text-xs uppercase font-bold text-primary border-b border-primary/20 pb-2">
                  Analysis / Feedback
                  {qResult?.gradedBy && <span className="ml-2 text-muted-foreground normal-case">// graded: {qResult.gradedBy}</span>}
                </h3>

                {qResult?.isCorrect === false && (
                  <div className="text-destructive font-mono text-xs uppercase">INCORRECT — 0/{qResult.marksPossible} marks</div>
                )}
                {qResult?.isCorrect === true && (
                  <div className="text-primary font-mono text-xs uppercase">CORRECT — {qResult.marksAwarded}/{qResult.marksPossible} marks</div>
                )}
                {qResult?.needsGrading && (
                  <div className="space-y-3">
                    <div className="text-accent font-mono text-xs uppercase">WRITTEN ANSWER PENDING SELF-GRADE // KEYWORD MATCH: {qResult.keywordMatch}/{qResult.keywordTotal}</div>
                    <div className="flex items-center gap-3">
                      <label className="text-[10px] text-muted-foreground uppercase font-mono">Marks Awarded (0–{qResult.marksPossible})</label>
                      <input
                        type="number"
                        min={0}
                        max={qResult.marksPossible}
                        className="w-24 p-2 bg-background border border-input font-mono text-sm"
                        value={selfGrades[q.questionId] ?? ""}
                        onChange={e => setSelfGrades(prev => ({ ...prev, [q.questionId]: e.target.value }))}
                      />
                    </div>
                  </div>
                )}

                {q.questionType !== "mcq" && qResult?.modelAnswer && (
                  <div>
                    <span className="text-[10px] text-muted-foreground uppercase block mb-1">Model Answer</span>
                    <p className="font-sans text-sm text-foreground/90 bg-background border border-border/50 p-3">
                      {qResult.modelAnswer}
                    </p>
                  </div>
                )}

                {qResult?.explanation && (
                  <div>
                    <span className="text-[10px] text-muted-foreground uppercase block mb-1">Explanation</span>
                    <p className="font-sans text-sm text-foreground/90">
                      {qResult.explanation}
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
              <Button onClick={() => doSubmit(false)} disabled={isSubmitting} variant="default">
                {isSubmitting ? "PROCESSING..." : isExam ? "SUBMIT EXAM" : "SUBMIT SIMULATION"}
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
              const hasAnswer = qItem.questionType === "mcq" ? !!answers[qItem.questionId]?.selectedOption : !!answers[qItem.questionId]?.writtenAnswer;

              let statusClass = "border-border text-muted-foreground hover:bg-muted/50";
              if (result) {
                const qRes = result.results.find((r: any) => r.questionId === qItem.questionId);
                if (qRes?.isCorrect) statusClass = "border-primary bg-primary/10 text-primary";
                else if (qRes?.needsGrading) statusClass = "border-accent bg-accent/10 text-accent";
                else if (qItem.questionType === "mcq") statusClass = "border-destructive bg-destructive/10 text-destructive";
                else statusClass = "border-accent bg-accent/10 text-accent";
              } else {
                if (isCurrent) statusClass = "border-foreground text-foreground";
                else if (hasAnswer) statusClass = "border-primary/50 text-primary bg-primary/5";
              }

              return (
                <button
                  key={qItem.questionId}
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
