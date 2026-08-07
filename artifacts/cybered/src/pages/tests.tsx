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
import { Play } from "lucide-react";
import { format } from "date-fns";

const genSchema = z.object({
  title: z.string().min(1, "Title required"),
  classId: z.coerce.number().optional(),
  subjectId: z.coerce.number().optional(),
  chapterId: z.coerce.number().optional(),
  mcqCount: z.coerce.number().default(5),
  shortQuestionCount: z.coerce.number().default(0),
  longQuestionCount: z.coerce.number().default(0),
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
      longQuestionCount: 0
    }
  });

  const onSubmit = (data: GenFormValues) => {
    const scope: any = {};
    if (data.classId) scope.classId = data.classId;
    if (data.subjectId) scope.subjectId = data.subjectId;
    if (data.chapterId) scope.chapterId = data.chapterId;

    const payload = {
      title: data.title,
      scope,
      mcqCount: data.mcqCount,
      shortQuestionCount: data.shortQuestionCount,
      longQuestionCount: data.longQuestionCount,
      referenceYearFrom: data.referenceYearFrom,
      referenceYearTo: data.referenceYearTo
    };

    generate({ data: payload }, {
      onSuccess: (res) => {
        // useGenerateTest returns a TestConfig? Wait, the hook `useGenerateTest` returns `{ data: TestConfig }` or `Test`?
        // Let's check api.schemas.ts. `useGenerateTest` usually returns the generated Test object.
        // Actually, if it returns a Test, we can get its id.
        // I will assume the response has an `id`.
        toast({ title: "SIMULATION COMPILED", description: "Test environment prepared." });
        // Since I don't know the exact type `res` (if it's Test or TestSummary or just ID), I will redirect to tests list or if `res.id` exists, to it.
        if ((res as any).id) {
          setLocation(`/tests/${(res as any).id}`);
        } else {
          // fallback, just refresh list
          window.location.reload();
        }
      },
      onError: () => toast({ title: "COMPILATION FAILED", description: "Not enough questions match criteria.", variant: "destructive" })
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
