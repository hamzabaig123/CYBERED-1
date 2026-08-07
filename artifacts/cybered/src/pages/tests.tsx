import { Shell } from "@/components/layout/shell";
import { useListTests, useGenerateTest } from "@workspace/api-client-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { useLocation, Link } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Play, Timer, Target } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

const genSchema = z.object({
  title: z.string().min(1, "Title required"),
  classId: z.coerce.number().optional(),
  subjectId: z.coerce.number().optional(),
  chapterId: z.coerce.number().optional(),
  mcqCount: z.coerce.number().default(5),
  shortQuestionCount: z.coerce.number().default(0),
  longQuestionCount: z.coerce.number().default(0),
  mode: z.enum(["practice", "exam"]).default("practice"),
  timeLimitMinutes: z.coerce.number().optional(),
  weakTopicsOnly: z.boolean().default(false),
  referenceYearFrom: z.coerce.number().optional(),
  referenceYearTo: z.coerce.number().optional(),
});

type GenFormValues = z.infer<typeof genSchema>;

export default function Tests() {
  const { data: pastTests, isLoading: testsLoading } = useListTests();
  const { mutate: generate, isPending } = useGenerateTest();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const form = useForm<GenFormValues>({
    resolver: zodResolver(genSchema),
    defaultValues: {
      title: `Simulation-${new Date().getTime().toString().slice(-6)}`,
      mcqCount: 10,
      shortQuestionCount: 0,
      longQuestionCount: 0,
      mode: "practice",
      timeLimitMinutes: 60,
      weakTopicsOnly: false,
    },
  });

  const selectedMode = form.watch("mode");

  const onSubmit = (data: GenFormValues) => {
    const scope: any = {};
    if (data.classId) scope.classId = data.classId;
    if (data.subjectId) scope.subjectId = data.subjectId;
    if (data.chapterId) scope.chapterId = data.chapterId;

    const payload: any = {
      title: data.title,
      scope,
      mode: data.mode,
      mcqCount: data.mcqCount,
      shortQuestionCount: data.shortQuestionCount,
      longQuestionCount: data.longQuestionCount,
      referenceYearFrom: data.referenceYearFrom,
      referenceYearTo: data.referenceYearTo,
    };
    if (data.mode === "exam") payload.timeLimitMinutes = data.timeLimitMinutes || 60;
    if (data.weakTopicsOnly) payload.weakTopicsOnly = true;

    generate({ data: payload }, {
      onSuccess: (res: any) => {
        toast({ title: "SIMULATION COMPILED", description: "Test environment prepared." });
        if (res?.id) {
          setLocation(`/tests/${res.id}`);
        } else {
          window.location.reload();
        }
      },
      onError: (err: any) => {
        const detail = (err as any)?.data?.details;
        const msg = detail ? detail.map((d: any) => `${d.type}: need ${d.requested}, have ${d.available}`).join(", ") : (err as any)?.data?.error;
        toast({ title: "COMPILATION FAILED", description: msg || "Not enough questions match criteria.", variant: "destructive" });
      },
    });
  };

  return (
    <Shell>
      <div className="mb-6">
        <h1 className="text-2xl font-bold font-mono text-primary uppercase tracking-widest">
          Simulation Chamber
        </h1>
        <p className="text-muted-foreground font-mono text-xs mt-1 uppercase">Test Generation & Execution</p>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        <div>
          <div className="border border-primary bg-primary/5 p-6 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-primary"></div>
            <h2 className="font-mono text-lg uppercase font-bold text-primary mb-6">Compile New Simulation</h2>
            
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField control={form.control} name="title" render={({ field }) => (
                  <FormItem><FormLabel>Simulation Designation</FormLabel><FormControl><Input {...field} className="font-mono" /></FormControl><FormMessage /></FormItem>
                )} />

                <FormField control={form.control} name="mode" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Mode</FormLabel>
                    <FormControl>
                      <div className="grid grid-cols-2 gap-3">
                        {(["practice", "exam"] as const).map((m) => (
                          <button
                            key={m}
                            type="button"
                            onClick={() => field.onChange(m)}
                            className={cn(
                              "p-3 border font-mono text-xs uppercase tracking-wider transition-colors text-left",
                              field.value === m
                                ? "border-primary bg-primary/10 text-primary"
                                : "border-border bg-background text-muted-foreground hover:bg-muted/50"
                            )}
                          >
                            <div className="font-bold mb-1">{m === "practice" ? "Practice" : "Exam"}</div>
                            <div className="text-[10px] opacity-70 normal-case">
                              {m === "practice" ? "No time limit, instant feedback" : "Server-enforced deadline"}
                            </div>
                          </button>
                        ))}
                      </div>
                    </FormControl>
                  </FormItem>
                )} />

                {selectedMode === "exam" && (
                  <FormField control={form.control} name="timeLimitMinutes" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Time Limit (minutes)</FormLabel>
                      <FormControl><Input type="number" min={1} {...field} value={field.value ?? 60} /></FormControl>
                    </FormItem>
                  )} />
                )}

                <FormField control={form.control} name="weakTopicsOnly" render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <button
                        type="button"
                        onClick={() => field.onChange(!field.value)}
                        className={cn(
                          "w-full flex items-center gap-3 p-3 border font-mono text-xs uppercase tracking-wider transition-colors",
                          field.value
                            ? "border-accent bg-accent/10 text-accent"
                            : "border-border bg-background text-muted-foreground hover:bg-muted/50"
                        )}
                      >
                        <Target className="h-4 w-4" />
                        <span>Target Weak Topics Only</span>
                        <span className="ml-auto text-[10px] opacity-70">{field.value ? "ARMED" : "OFF"}</span>
                      </button>
                    </FormControl>
                  </FormItem>
                )} />

                <div className="grid grid-cols-3 gap-4 p-4 border border-border/50 bg-background">
                  <FormField control={form.control} name="classId" render={({ field }) => (
                    <FormItem><FormLabel>Class ID</FormLabel><FormControl><Input type="number" {...field} value={field.value || ""} /></FormControl></FormItem>
                  )} />
                  <FormField control={form.control} name="subjectId" render={({ field }) => (
                    <FormItem><FormLabel>Subject ID</FormLabel><FormControl><Input type="number" {...field} value={field.value || ""} /></FormControl></FormItem>
                  )} />
                  <FormField control={form.control} name="chapterId" render={({ field }) => (
                    <FormItem><FormLabel>Chapter ID</FormLabel><FormControl><Input type="number" {...field} value={field.value || ""} /></FormControl></FormItem>
                  )} />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <FormField control={form.control} name="mcqCount" render={({ field }) => (
                    <FormItem><FormLabel>MCQ Count</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="shortQuestionCount" render={({ field }) => (
                    <FormItem><FormLabel>Short Q Count</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="longQuestionCount" render={({ field }) => (
                    <FormItem><FormLabel>Long Q Count</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="referenceYearFrom" render={({ field }) => (
                    <FormItem><FormLabel>Year From</FormLabel><FormControl><Input type="number" {...field} value={field.value || ""} /></FormControl></FormItem>
                  )} />
                  <FormField control={form.control} name="referenceYearTo" render={({ field }) => (
                    <FormItem><FormLabel>Year To</FormLabel><FormControl><Input type="number" {...field} value={field.value || ""} /></FormControl></FormItem>
                  )} />
                </div>

                <Button type="submit" disabled={isPending} className="w-full mt-4">
                  {isPending ? "COMPILING..." : "INITIALIZE SIMULATION"}
                </Button>
              </form>
            </Form>
          </div>
        </div>

        <div>
          <h2 className="font-mono text-sm uppercase font-bold text-muted-foreground mb-4">Past Simulations</h2>
          <div className="space-y-3 max-h-[calc(100dvh-200px)] overflow-y-auto pr-2">
            {testsLoading ? (
              <div className="text-center font-mono text-sm animate-pulse text-muted-foreground">LOADING ARCHIVES...</div>
            ) : pastTests?.length ? (
              pastTests.map(t => (
                <div key={t.id} className="border border-border bg-card p-4 hover:border-primary/50 transition-colors group">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-bold font-mono text-primary group-hover:underline uppercase truncate">{t.title}</h3>
                    <Badge variant="outline" className="text-[10px]">{format(new Date(t.createdAt), "MMM dd, yyyy")}</Badge>
                  </div>
                  <div className="flex gap-4 text-xs font-mono text-muted-foreground mb-4">
                    <span>Qs: {t.questionCount}</span>
                    <span>Marks: {t.totalMarks}</span>
                    <span className={t.mode === "exam" ? "text-accent" : ""}>{String(t.mode || "practice").toUpperCase()}</span>
                    {t.timeLimitMinutes ? <span className="flex items-center gap-1"><Timer className="h-3 w-3" />{t.timeLimitMinutes}m</span> : null}
                  </div>
                  <Button asChild size="sm" variant="secondary" className="w-full h-8 text-[10px]">
                    <Link href={`/tests/${t.id}`}><Play className="mr-2 h-3 w-3" /> ENTER SIMULATION</Link>
                  </Button>
                </div>
              ))
            ) : (
              <div className="p-8 border border-dashed border-border text-center font-mono text-sm text-muted-foreground">
                NO PREVIOUS SIMULATIONS
              </div>
            )}
          </div>
        </div>
      </div>
    </Shell>
  );
}
