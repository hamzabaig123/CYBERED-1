import { useGetDashboardStats, useGetRecentQuestions, useGetAnalyticsDashboard } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Shell } from "@/components/layout/shell";
import { BookOpen, Database, FolderTree, Target, Activity, AlertTriangle, Flame, Crosshair, RefreshCw } from "lucide-react";
import { Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

export default function Dashboard() {
  const { data: stats, isLoading: statsLoading } = useGetDashboardStats();
  const { data: recent, isLoading: recentLoading } = useGetRecentQuestions();
  const { data: analytics } = useGetAnalyticsDashboard();
  const { user } = useAuth();

  return (
    <Shell>
      {!user?.emailVerifiedAt && (
        <Alert variant="destructive" className="mb-8 border-destructive/50 bg-destructive/10 crt-overlay">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle className="font-mono tracking-widest uppercase">Security Alert: Comms Link Unverified</AlertTitle>
          <AlertDescription className="font-mono mt-2 flex items-center justify-between">
            <span>Your comms link has not been verified. Some network features may be restricted.</span>
            <Link href="/verify-email">
              <Button variant="outline" size="sm" className="border-destructive/50 hover:bg-destructive/20 text-destructive-foreground">VERIFY NOW</Button>
            </Link>
          </AlertDescription>
        </Alert>
      )}

      <div className="mb-8">
        <h1 className="text-3xl font-bold font-mono text-primary uppercase tracking-widest mb-2 flex items-center gap-3">
          <Activity className="h-8 w-8" />
          Command Center
        </h1>
        <p className="text-muted-foreground font-mono uppercase text-sm">System Overview & Activity Feed</p>
      </div>

      {statsLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[1,2,3,4].map(i => <div key={i} className="h-24 bg-card border border-border animate-pulse" />)}
        </div>
      ) : stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <StatCard title="Knowledge Base" value={stats.totalQuestions} icon={<Database className="h-4 w-4 text-primary" />} />
          <StatCard title="Test Archives" value={stats.totalTests} icon={<BookOpen className="h-4 w-4 text-primary" />} />
          <StatCard title="Classes" value={stats.totalClasses} icon={<FolderTree className="h-4 w-4 text-primary" />} />
          <StatCard title="Subjects" value={stats.totalSubjects} icon={<Target className="h-4 w-4 text-primary" />} />
        </div>
      )}

      {analytics && (
        <div className="mb-8 space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 border border-border bg-card flex flex-col justify-between">
              <div className="flex justify-between items-start mb-4">
                <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">Answer Accuracy</span>
                <Crosshair className="h-4 w-4 text-primary" />
              </div>
              <div>
                <div className="text-2xl font-mono font-bold text-foreground">
                  {Math.round((analytics.accuracy.accuracy || 0) * 100)}%
                </div>
                <div className="text-[10px] text-muted-foreground font-mono mt-1 uppercase">{analytics.accuracy.attempts} graded attempts</div>
              </div>
            </div>
            <div className="p-4 border border-border bg-card flex flex-col justify-between">
              <div className="flex justify-between items-start mb-4">
                <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">Streak</span>
                <Flame className="h-4 w-4 text-orange-500" />
              </div>
              <div>
                <div className="text-2xl font-mono font-bold text-foreground">{analytics.currentStreak} <span className="text-xs text-muted-foreground">days</span></div>
                <div className="text-[10px] text-muted-foreground font-mono mt-1 uppercase">Best: {analytics.bestStreak}</div>
              </div>
            </div>
            <div className="p-4 border border-border bg-card flex flex-col justify-between">
              <div className="flex justify-between items-start mb-4">
                <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">Week Solved</span>
                <Target className="h-4 w-4 text-accent" />
              </div>
              <div>
                <div className="text-2xl font-mono font-bold text-foreground">{analytics.questionsSolvedThisWeek}</div>
                <div className="text-[10px] text-muted-foreground font-mono mt-1 uppercase">Solved {analytics.solvedCount} / Wrong {analytics.wrongCount}</div>
              </div>
            </div>
            <div className="p-4 border border-border bg-card flex flex-col justify-between">
              <div className="flex justify-between items-start mb-4">
                <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">Due Revisions</span>
                <RefreshCw className="h-4 w-4 text-primary" />
              </div>
              <div>
                <div className="text-2xl font-mono font-bold text-foreground">{analytics.dueRevisions}</div>
                <Link href="/learning-hub" className="text-[10px] font-mono mt-1 uppercase text-primary hover:underline block">
                  &gt; open hub
                </Link>
              </div>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader className="border-b border-border/50 pb-4">
                <CardTitle className="text-sm flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-destructive" />
                  Weak Topic Signals
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                {(analytics.weakTopics ?? []).length === 0 ? (
                  <div className="text-center p-6 text-muted-foreground font-mono text-sm border border-dashed border-border">
                    NO WEAK TOPICS DETECTED
                  </div>
                ) : (
                  <div className="space-y-2">
                    {(analytics.weakTopics ?? []).map(t => (
                      <div key={t.sectionId} className="flex items-center gap-3 p-2 border border-destructive/30 bg-destructive/5">
                        <div className="flex-1">
                          <div className="font-mono text-xs font-bold uppercase text-foreground">{t.sectionName}</div>
                          <div className="text-[10px] text-muted-foreground">{t.subjectName} / {t.chapterName} // {t.attempts} attempts</div>
                        </div>
                        <Badge variant="destructive" className="text-[9px]">{Math.round(t.accuracy * 100)}%</Badge>
                        <Link href={`/tests`}><Button size="sm" variant="outline" className="h-7 text-[10px] border-destructive/40 text-destructive">TARGET</Button></Link>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="border-b border-border/50 pb-4">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Target className="h-4 w-4 text-primary" />
                  Topic Mastery Ladder
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                {(analytics.masteryBySection ?? []).length === 0 ? (
                  <div className="text-center p-6 text-muted-foreground font-mono text-sm border border-dashed border-border">
                    NO MASTERY DATA YET
                  </div>
                ) : (
                  <div className="space-y-2">
                    {(analytics.masteryBySection ?? []).slice(0, 6).map(t => (
                      <div key={t.sectionId} className="flex items-center gap-3 p-2 border border-border/50 bg-muted/10">
                        <div className="flex-1">
                          <div className="font-mono text-xs font-bold uppercase">{t.sectionName}</div>
                          <div className="text-[10px] text-muted-foreground">{t.attempts} attempts // acc {(t.accuracy * 100).toFixed(0)}%</div>
                        </div>
                        <div className="w-28 h-2 bg-muted">
                          <div className="h-full bg-primary" style={{ width: `${t.mastery}%` }} />
                        </div>
                        <span className="font-mono text-[10px] text-muted-foreground w-8 text-right">{t.mastery}</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      <div className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <Card className="h-full">
            <CardHeader className="border-b border-border/50 pb-4">
              <CardTitle className="text-primary flex items-center gap-2 text-sm">
                <span className="h-2 w-2 bg-primary animate-pulse inline-block" />
                Recent Intel
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              {recentLoading ? (
                <div className="space-y-4">
                  {[1,2,3].map(i => <div key={i} className="h-16 bg-muted/20 animate-pulse border border-border/50" />)}
                </div>
              ) : recent && recent.length > 0 ? (
                <div className="space-y-3">
                  {recent.map(q => (
                    <div key={q.id} className="p-3 border border-border/50 bg-muted/10 hover:bg-muted/30 transition-colors group">
                      <div className="flex justify-between items-start mb-2">
                        <Badge variant="outline" className="text-[10px] text-muted-foreground border-muted-foreground/30">
                          {q.className} &gt; {q.subjectName} &gt; {q.chapterName}
                        </Badge>
                        <Badge variant="secondary" className="text-[10px]">
                          {q.questionType.toUpperCase()}
                        </Badge>
                      </div>
                      <p className="font-sans text-sm line-clamp-2 text-foreground/90 group-hover:text-foreground">
                        {q.questionText}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center p-8 text-muted-foreground font-mono text-sm border border-dashed border-border">
                  NO RECENT INTEL FOUND
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader className="border-b border-border/50 pb-4">
              <CardTitle className="text-sm">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-3">
              <Link href="/curriculum" className="block w-full text-left px-4 py-3 border border-primary/20 bg-primary/5 hover:bg-primary/10 text-primary font-mono text-sm uppercase tracking-wide transition-colors">
                &gt; Browse Curriculum
              </Link>
              <Link href="/questions/new" className="block w-full text-left px-4 py-3 border border-accent/20 bg-accent/5 hover:bg-accent/10 text-accent font-mono text-sm uppercase tracking-wide transition-colors">
                &gt; Inject New Question
              </Link>
              <Link href="/tests" className="block w-full text-left px-4 py-3 border border-border bg-muted/20 hover:bg-muted/40 text-foreground font-mono text-sm uppercase tracking-wide transition-colors">
                &gt; Generate Practice Test
              </Link>
            </CardContent>
          </Card>

          {stats && (
             <Card>
             <CardHeader className="border-b border-border/50 pb-4">
               <CardTitle className="text-sm">Data Breakdown</CardTitle>
             </CardHeader>
             <CardContent className="pt-4 font-mono text-xs space-y-2 uppercase">
               <div className="flex justify-between border-b border-border/30 pb-1">
                 <span className="text-muted-foreground">MCQs</span>
                 <span className="text-primary">{stats.totalMcqs}</span>
               </div>
               <div className="flex justify-between border-b border-border/30 pb-1">
                 <span className="text-muted-foreground">Short Qs</span>
                 <span className="text-primary">{stats.totalShortQuestions}</span>
               </div>
               <div className="flex justify-between border-b border-border/30 pb-1">
                 <span className="text-muted-foreground">Long Qs</span>
                 <span className="text-primary">{stats.totalLongQuestions}</span>
               </div>
             </CardContent>
           </Card>
          )}
        </div>
      </div>
    </Shell>
  );
}

function StatCard({ title, value, icon }: { title: string, value: number, icon: React.ReactNode }) {
  return (
    <div className="p-4 border border-border bg-card flex flex-col justify-between">
      <div className="flex justify-between items-start mb-4">
        <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">{title}</span>
        {icon}
      </div>
      <div className="text-2xl font-mono font-bold text-foreground">
        {value.toLocaleString()}
      </div>
    </div>
  );
}
