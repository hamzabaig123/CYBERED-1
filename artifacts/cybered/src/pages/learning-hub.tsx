import { useState } from "react";
import { Shell } from "@/components/layout/shell";
import {
  useGetLearningStreak,
  useGetLearningCalendar,
  useGetLearningTimeline,
  useGetLearningHeatmap,
  useGetLearningReport,
  useGetDueRevisions,
  useCompleteRevision,
  useListGoals,
  useSetTodayGoal,
  useDeleteGoal,
} from "@workspace/api-client-react";
import type { CalendarDay } from "@workspace/api-client-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Flame, Calendar as CalendarIcon, Activity, Grid3X3, RefreshCw, Target, FileText, ChevronLeft, ChevronRight, Trash2, CheckCircle2, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

export default function LearningHub() {
  const [period, setPeriod] = useState<"week" | "month">("week");
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);

  const { data: streak } = useGetLearningStreak();
  const { data: calendar, refetch: refetchCalendar } = useGetLearningCalendar({ year, month } as any);
  const { data: timeline } = useGetLearningTimeline({ limit: 60 } as any);
  const { data: heatmap } = useGetLearningHeatmap({ year } as any);
  const { data: report, refetch: refetchReport } = useGetLearningReport({ period } as any);
  const { data: dueRevisions, refetch: refetchRevisions } = useGetDueRevisions();
  const { data: goals, refetch: refetchGoals } = useListGoals({ year, month } as any);
  const { mutate: completeRevision } = useCompleteRevision();
  const { mutate: setTodayGoal } = useSetTodayGoal();
  const { mutate: deleteGoal } = useDeleteGoal();
  const { toast } = useToast();

  const [qTarget, setQTarget] = useState("");
  const [mTarget, setMTarget] = useState("");
  const [tTarget, setTTarget] = useState("");

  const prevMonth = () => {
    let y = year;
    let m = month - 1;
    if (m < 1) { m = 12; y -= 1; }
    setYear(y); setMonth(m);
  };
  const nextMonth = () => {
    let y = year;
    let m = month + 1;
    if (m > 12) { m = 1; y += 1; }
    setYear(y); setMonth(m);
  };

  const handleSetGoal = () => {
    setTodayGoal({ data: {
      questionsTarget: parseInt(qTarget, 10) || 0,
      minutesTarget: parseInt(mTarget, 10) || 0,
      testsTarget: parseInt(tTarget, 10) || 0,
    }}, {
      onSuccess: () => {
        toast({ title: "GOAL LOCKED IN", description: "Daily targets configured." });
        setQTarget(""); setMTarget(""); setTTarget("");
        refetchGoals(); refetchCalendar();
      },
      onError: () => toast({ title: "GOAL FAILED", variant: "destructive" }),
    });
  };

  const handleComplete = (revisionId: number, grade: "again" | "hard" | "good" | "easy") => {
    completeRevision({ revisionId, data: { grade } }, {
      onSuccess: () => { refetchRevisions(); refetchCalendar(); },
      onError: () => toast({ title: "RESCHEDULE FAILED", variant: "destructive" }),
    });
  };

  const dayOfWeekNames = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
  const monthDays: CalendarDay[] = calendar?.days ?? [];
  const firstDow = new Date(year, month - 1, 1).getDay();

  return (
    <Shell>
      <div className="mb-6">
        <h1 className="text-3xl font-bold font-mono text-primary uppercase tracking-widest mb-2 flex items-center gap-3">
          <Activity className="h-8 w-8" />
          Learning Hub
        </h1>
        <p className="text-muted-foreground font-mono uppercase text-sm">Study Sessions, Revisions & Progress Telemetry</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="p-4 border border-border bg-card">
          <div className="flex justify-between items-start mb-4">
            <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">Current Streak</span>
            <Flame className="h-4 w-4 text-orange-500" />
          </div>
          <div className="text-2xl font-mono font-bold text-foreground">{streak?.currentStreak ?? 0} <span className="text-xs text-muted-foreground">days</span></div>
        </div>
        <div className="p-4 border border-border bg-card">
          <div className="flex justify-between items-start mb-4">
            <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">Best Streak</span>
            <Flame className="h-4 w-4 text-primary" />
          </div>
          <div className="text-2xl font-mono font-bold text-foreground">{streak?.bestStreak ?? 0} <span className="text-xs text-muted-foreground">days</span></div>
        </div>
        <div className="p-4 border border-border bg-card">
          <div className="flex justify-between items-start mb-4">
            <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">Due Revisions</span>
            <RefreshCw className="h-4 w-4 text-accent" />
          </div>
          <div className="text-2xl font-mono font-bold text-foreground">{dueRevisions?.length ?? 0}</div>
        </div>
        <div className="p-4 border border-border bg-card">
          <div className="flex justify-between items-start mb-4">
            <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">Week Questions Solved</span>
            <Target className="h-4 w-4 text-primary" />
          </div>
          <div className="text-2xl font-mono font-bold text-foreground">{report?.totals.questionsSolved ?? 0}</div>
        </div>
      </div>

      <Tabs defaultValue="calendar">
        <TabsList className="mb-4">
          <TabsTrigger value="calendar"><CalendarIcon className="mr-2 h-4 w-4" />Calendar</TabsTrigger>
          <TabsTrigger value="timeline"><Activity className="mr-2 h-4 w-4" />Timeline</TabsTrigger>
          <TabsTrigger value="heatmap"><Grid3X3 className="mr-2 h-4 w-4" />Heatmap</TabsTrigger>
          <TabsTrigger value="revisions"><RefreshCw className="mr-2 h-4 w-4" />Revisions</TabsTrigger>
          <TabsTrigger value="goals"><Target className="mr-2 h-4 w-4" />Goals</TabsTrigger>
          <TabsTrigger value="reports"><FileText className="mr-2 h-4 w-4" />Reports</TabsTrigger>
        </TabsList>

        {/* ── CALENDAR ─────────────────────────────────────────────────── */}
        <TabsContent value="calendar">
          <div className="border border-border bg-card p-4">
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-2 font-mono">
                <Button variant="outline" size="icon" className="h-8 w-8" onClick={prevMonth}><ChevronLeft className="h-4 w-4" /></Button>
                <span className="text-sm font-bold uppercase tracking-widest text-primary">{new Date(year, month - 1, 1).toLocaleString("en-US", { month: "long" })} {year}</span>
                <Button variant="outline" size="icon" className="h-8 w-8" onClick={nextMonth}><ChevronRight className="h-4 w-4" /></Button>
              </div>
            </div>

            <div className="grid grid-cols-7 gap-1 mb-2">
              {dayOfWeekNames.map(d => (
                <div key={d} className="text-center text-[10px] font-mono text-muted-foreground uppercase">{d}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {Array.from({ length: firstDow }).map((_, i) => <div key={`pad${i}`} />)}
              {monthDays.map(day => {
                const active = day.events > 0;
                const goal = day.goal;
                return (
                  <div
                    key={day.date}
                    className={cn(
                      "min-h-[72px] p-2 border font-mono flex flex-col gap-1",
                      active ? "border-primary/40 bg-primary/5" : "border-border/60 bg-background",
                      goal && (day.goalMet ? "border-primary" : "border-accent")
                    )}
                  >
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold">{parseInt(day.date.slice(8), 10)}</span>
                      {goal && (day.goalMet ? <CheckCircle2 className="h-3 w-3 text-primary" /> : <AlertTriangle className="h-3 w-3 text-accent" />)}
                    </div>
                    {active && (
                      <div className="text-[9px] text-primary space-y-0.5">
                        <div>✓ {day.questionsSolved} qs</div>
                        <div>⏱ {day.minutes}m</div>
                        <div>▣ {day.testsTaken} tests</div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </TabsContent>

        {/* ── TIMELINE ─────────────────────────────────────────────────── */}
        <TabsContent value="timeline">
          <div className="border border-border bg-card p-4 max-h-[calc(100dvh-320px)] overflow-y-auto space-y-2">
            {!timeline || timeline.length === 0 ? (
              <div className="p-8 border border-dashed border-border text-center font-mono text-sm text-muted-foreground">NO ACTIVITY LOGGED</div>
            ) : timeline.map(e => (
              <div key={e.id} className="p-3 border border-border/60 bg-muted/10 flex justify-between items-start gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="outline" className="text-[9px] uppercase">{e.type.replace(/_/g, " ")}</Badge>
                    {(e.minutes ?? 0) > 0 && <span className="text-[10px] text-muted-foreground font-mono">{e.minutes}m</span>}
                    {(e.count ?? 1) > 1 && <span className="text-[10px] text-muted-foreground font-mono">x{e.count}</span>}
                  </div>
                  {e.questionText && <p className="font-sans text-sm text-foreground/90">{e.questionText}</p>}
                  {e.testTitle && <p className="font-mono text-xs text-primary">{e.testTitle}</p>}
                </div>
                <span className="text-[10px] text-muted-foreground font-mono whitespace-nowrap">{e.activityDate}</span>
              </div>
            ))}
          </div>
        </TabsContent>

        {/* ── HEATMAP ──────────────────────────────────────────────────── */}
        <TabsContent value="heatmap">
          <div className="border border-border bg-card p-4">
            <div className="flex justify-between items-center mb-4">
              <span className="font-mono text-sm font-bold uppercase tracking-widest text-primary">Activity Heatmap {year}</span>
              <div className="flex items-center gap-1 font-mono text-[9px] text-muted-foreground">
                LESS
                {["bg-muted/20", "bg-primary/20", "bg-primary/40", "bg-primary/60", "bg-primary"].map(c => <span key={c} className={cn("h-3 w-3", c)} />)}
                MORE
              </div>
            </div>
            <div className="overflow-x-auto">
              <div className="grid grid-flow-col grid-rows-7 gap-1 w-max">
                {(() => {
                  const days = heatmap?.days ?? [];
                  const columns = Array.from({ length: Math.ceil(days.length / 7) }, (_, ci) => days.slice(ci * 7, ci * 7 + 7));
                  return columns.map((col, ci) => (
                    <div key={ci} className="grid grid-rows-7 gap-1">
                      {Array.from({ length: 7 }).map((_, ri) => {
                        const day = col[ri];
                        if (!day) return <div key={ri} className="h-3 w-3" />;
                        const level = day.events === 0 ? 0 : day.events >= 6 ? 4 : day.events >= 3 ? 3 : day.events >= 2 ? 2 : 1;
                        const colors = ["bg-muted/20", "bg-primary/20", "bg-primary/40", "bg-primary/70", "bg-primary"];
                        return <div key={ri} title={`${day.date}: ${day.events} events`} className={cn("h-3 w-3", colors[level])} />;
                      })}
                    </div>
                  ));
                })()}
              </div>
            </div>
          </div>
        </TabsContent>

        {/* ── REVISIONS ────────────────────────────────────────────────── */}
        <TabsContent value="revisions">
          <div className="space-y-3 max-h-[calc(100dvh-320px)] overflow-y-auto pr-1">
            {!dueRevisions || dueRevisions.length === 0 ? (
              <div className="p-8 border border-dashed border-border text-center font-mono text-sm text-muted-foreground">NO REVISIONS DUE — CLEAR</div>
            ) : dueRevisions.map(r => (
              <div key={r.id} className="border border-border bg-card p-4">
                <div className="flex justify-between items-start gap-4 mb-3">
                  <div>
                    <Badge variant="secondary" className="text-[9px] mb-2">{r.questionType?.toUpperCase()}{r.sectionName ? ` // ${r.sectionName}` : ""}</Badge>
                    <p className="font-sans text-sm text-foreground/90">{r.questionText}</p>
                  </div>
                  <div className="font-mono text-[10px] text-muted-foreground text-right whitespace-nowrap">
                    <div>INTERVAL {r.intervalDays ?? 1}d</div>
                    <div>REPS {r.repetitions ?? 0}</div>
                    <div>EASE {((r.easeFactor ?? 250) / 100).toFixed(2)}</div>
                  </div>
                </div>
                <div className="flex gap-2">
                  {(["again", "hard", "good", "easy"] as const).map(g => (
                    <Button key={g} size="sm" variant={g === "again" ? "destructive" : g === "easy" ? "default" : "secondary"} className="h-8 text-[10px] flex-1 uppercase"
                      onClick={() => handleComplete(r.id, g)}>
                      {g}
                    </Button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </TabsContent>

        {/* ── GOALS ────────────────────────────────────────────────────── */}
        <TabsContent value="goals">
          <div className="grid md:grid-cols-2 gap-6">
            <div className="border border-primary bg-primary/5 p-4">
              <h3 className="font-mono text-sm uppercase font-bold text-primary mb-4">Configure Daily Targets</h3>
              <div className="grid grid-cols-3 gap-3 mb-4">
                <label className="block">
                  <span className="text-[10px] text-muted-foreground uppercase font-mono">Questions</span>
                  <input type="number" min={0} value={qTarget} onChange={e => setQTarget(e.target.value)} className="w-full mt-1 p-2 bg-background border border-input font-mono text-sm" />
                </label>
                <label className="block">
                  <span className="text-[10px] text-muted-foreground uppercase font-mono">Minutes</span>
                  <input type="number" min={0} value={mTarget} onChange={e => setMTarget(e.target.value)} className="w-full mt-1 p-2 bg-background border border-input font-mono text-sm" />
                </label>
                <label className="block">
                  <span className="text-[10px] text-muted-foreground uppercase font-mono">Tests</span>
                  <input type="number" min={0} value={tTarget} onChange={e => setTTarget(e.target.value)} className="w-full mt-1 p-2 bg-background border border-input font-mono text-sm" />
                </label>
              </div>
              <Button onClick={handleSetGoal} className="w-full">LOCK IN TODAY'S GOAL</Button>
            </div>

            <div className="border border-border bg-card p-4">
              <h3 className="font-mono text-sm uppercase font-bold text-muted-foreground mb-4">Month Goals — {new Date(year, month - 1, 1).toLocaleString("en-US", { month: "long" })} {year}</h3>
              {!goals || goals.length === 0 ? (
                <div className="p-8 border border-dashed border-border text-center font-mono text-sm text-muted-foreground">NO GOALS SET</div>
              ) : (
                <div className="space-y-2 max-h-[calc(100dvh-440px)] overflow-y-auto">
                  {goals.map(g => (
                    <div key={g.id} className="flex justify-between items-center p-3 border border-border/60 bg-muted/10">
                      <div className="font-mono text-xs">
                        <div className="font-bold text-primary uppercase">{g.goalDate}</div>
                        <div className="text-muted-foreground mt-1">Q:{g.questionsTarget} M:{g.minutesTarget} T:{g.testsTarget}</div>
                      </div>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => {
                        deleteGoal({ goalId: g.id }, { onSuccess: () => { refetchGoals(); refetchCalendar(); }, onError: () => toast({ title: "DELETE FAILED", variant: "destructive" }) });
                      }}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        {/* ── REPORTS ──────────────────────────────────────────────────── */}
        <TabsContent value="reports">
          <div className="mb-4 flex gap-2">
            {(["week", "month"] as const).map(p => (
              <Button key={p} size="sm" variant={period === p ? "default" : "secondary"} className="h-8 text-[10px] uppercase" onClick={() => { setPeriod(p); refetchReport(); }}>
                {p} report
              </Button>
            ))}
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="md:col-span-2 border border-border bg-card p-4">
              <h3 className="font-mono text-sm uppercase font-bold text-primary mb-4">Totals — {period === "week" ? "Last 7 Days" : "Last 30 Days"}</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {[
                  { label: "Minutes", value: report?.totals.minutes },
                  { label: "Questions Solved", value: report?.totals.questionsSolved },
                  { label: "Questions Added", value: report?.totals.questionsAdded },
                  { label: "Tests Taken", value: report?.totals.testsTaken },
                  { label: "Flashcards", value: report?.totals.flashcardsReviewed },
                  { label: "Revisions", value: report?.totals.revisionsCompleted },
                ].map(s => (
                  <div key={s.label} className="p-3 border border-border/60 bg-muted/10">
                    <div className="text-[10px] text-muted-foreground uppercase font-mono">{s.label}</div>
                    <div className="text-xl font-mono font-bold text-primary mt-1">{s.value ?? 0}</div>
                  </div>
                ))}
              </div>

              <h3 className="font-mono text-sm uppercase font-bold text-primary mt-6 mb-3">Topic Accuracy</h3>
              {!report?.topicStats || report.topicStats.length === 0 ? (
                <div className="p-6 border border-dashed border-border text-center font-mono text-sm text-muted-foreground">NO GRADED DATA YET</div>
              ) : (
                <div className="space-y-2">
                  {report.topicStats.map(t => (
                    <div key={t.sectionId} className="flex items-center gap-3 p-2 border border-border/60 bg-muted/10">
                      <div className="flex-1">
                        <div className="font-mono text-xs font-bold uppercase">{t.sectionName}</div>
                        <div className="text-[10px] text-muted-foreground">{t.subjectName} / {t.chapterName} // {t.attempts} attempts</div>
                      </div>
                      <Badge variant={t.label === "weak" ? "destructive" : t.label === "strong" ? "default" : "secondary"} className="text-[9px]">{t.label}</Badge>
                      <span className="font-mono text-xs text-primary w-14 text-right">{(t.accuracy * 100).toFixed(0)}%</span>
                      <div className="w-24 h-2 bg-muted">
                        <div className="h-full bg-primary" style={{ width: `${t.mastery}%` }} />
                      </div>
                      <span className="font-mono text-[10px] text-muted-foreground w-10 text-right">{t.mastery}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="border border-border bg-card p-4">
              <h3 className="font-mono text-sm uppercase font-bold text-muted-foreground mb-4">Tests Taken</h3>
              {!report?.tests || report.tests.length === 0 ? (
                <div className="p-6 border border-dashed border-border text-center font-mono text-sm text-muted-foreground">NO TESTS</div>
              ) : (
                <div className="space-y-2">
                  {report.tests.map(t => (
                    <div key={t.testId} className="p-3 border border-border/60 bg-muted/10">
                      <div className="font-mono text-xs font-bold uppercase text-primary truncate">{t.title}</div>
                      <div className="text-[10px] text-muted-foreground mt-1">SCORE {t.score}/{t.totalMarks} // {t.submittedAt ? new Date(t.submittedAt).toLocaleDateString() : ""}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </Shell>
  );
}
