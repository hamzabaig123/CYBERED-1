import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { Shell } from "@/components/layout/shell";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useGetQuestion, useCreateQuestion, useUpdateQuestion } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft } from "lucide-react";
import { Link } from "wouter";

const questionSchema = z.object({
  questionType: z.enum(["mcq", "short", "long"]),
  questionText: z.string().min(1, "Question text required"),
  optionA: z.string().optional(),
  optionB: z.string().optional(),
  optionC: z.string().optional(),
  optionD: z.string().optional(),
  correctOption: z.enum(["A", "B", "C", "D"]).optional(),
  explanation: z.string().optional(),
  modelAnswer: z.string().optional(),
  marks: z.coerce.number().optional(),
  referenceSource: z.string().optional(),
  referenceYear: z.coerce.number().optional(),
  referenceType: z.enum(["board_paper", "coaching_paper", "other"]).optional(),
  referenceNote: z.string().optional(),
  difficulty: z.enum(["easy", "medium", "hard"]).optional(),
  tags: z.array(z.string()).default([]),
  bookPage: z.coerce.number().optional(),
  bookExplanation: z.string().optional(),
});

type QuestionFormValues = z.infer<typeof questionSchema>;

export default function QuestionEdit() {
  const { id } = useParams();
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  
  // Try to grab sectionId from query params if new
  const searchParams = new URLSearchParams(window.location.search);
  const sectionId = searchParams.get("sectionId");
  
  const isNew = !id || id === "new";
  const numId = isNew ? 0 : parseInt(id, 10);

  const { data: existingData, isLoading: isLoadingExisting } = useGetQuestion(numId, {
    query: { enabled: !isNew && !isNaN(numId) } as any
  });

  const { mutate: createQ, isPending: isCreating } = useCreateQuestion();
  const { mutate: updateQ, isPending: isUpdating } = useUpdateQuestion();

  const form = useForm<QuestionFormValues>({
    resolver: zodResolver(questionSchema),
    defaultValues: {
      questionType: "mcq",
      questionText: "",
      optionA: "", optionB: "", optionC: "", optionD: "",
      correctOption: undefined,
      explanation: "", modelAnswer: "",
      marks: undefined, referenceSource: "", referenceYear: undefined,
      referenceType: undefined, referenceNote: "",
      difficulty: undefined, tags: [], bookPage: undefined, bookExplanation: "",
    }
  });

  const qType = form.watch("questionType");

  useEffect(() => {
    if (existingData && !isNew) {
      form.reset({
        questionType: existingData.questionType as any,
        questionText: existingData.questionText,
        optionA: existingData.optionA || "",
        optionB: existingData.optionB || "",
        optionC: existingData.optionC || "",
        optionD: existingData.optionD || "",
        correctOption: existingData.correctOption as any || undefined,
        explanation: existingData.explanation || "",
        modelAnswer: existingData.modelAnswer || "",
        marks: existingData.marks || undefined,
        referenceSource: existingData.referenceSource || "",
        referenceYear: existingData.referenceYear || undefined,
        referenceType: existingData.referenceType as any || undefined,
        referenceNote: existingData.referenceNote || "",
        difficulty: existingData.difficulty as any || undefined,
        tags: existingData.tags || [],
        bookPage: existingData.bookPage || undefined,
        bookExplanation: existingData.bookExplanation || "",
      });
    }
  }, [existingData, isNew, form]);

  const onSubmit = (data: QuestionFormValues) => {
    // cleanup unused fields based on type
    const payload = { ...data };
    if (payload.questionType !== "mcq") {
      delete payload.optionA;
      delete payload.optionB;
      delete payload.optionC;
      delete payload.optionD;
      delete payload.correctOption;
    }
    if (payload.questionType === "mcq") {
      delete payload.modelAnswer;
    }

    if (isNew) {
      if (!sectionId) {
         toast({ title: "ERROR", description: "Target section missing. Navigate via Curriculum.", variant: "destructive" });
         return;
      }
      createQ({ sectionId: parseInt(sectionId, 10), data: payload as any }, {
        onSuccess: () => {
          toast({ title: "RECORD INJECTED", description: "Question successfully added to matrix." });
          setLocation(`/curriculum`);
        },
        onError: () => toast({ title: "INJECTION FAILED", variant: "destructive" })
      });
    } else {
      updateQ({ questionId: numId, data: payload as any }, {
        onSuccess: () => {
          toast({ title: "RECORD UPDATED", description: "Modification successful." });
        },
        onError: () => toast({ title: "UPDATE FAILED", variant: "destructive" })
      });
    }
  };

  if (!isNew && isLoadingExisting) {
    return <Shell><div className="p-8 text-center text-primary font-mono animate-pulse">ACCESSING RECORD...</div></Shell>;
  }

  const isPending = isCreating || isUpdating;

  return (
    <Shell>
      <div className="mb-6 flex items-center gap-4">
        <Button asChild variant="outline" size="icon" className="h-8 w-8">
          <Link href="/curriculum"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div>
          <h1 className="text-xl font-bold font-mono text-primary uppercase tracking-widest leading-none">
            {isNew ? "Inject New Record" : `Modify Record [${id}]`}
          </h1>
          <p className="text-muted-foreground font-mono text-[10px] mt-1 uppercase">
            {isNew && sectionId ? `Target Sector: ${sectionId}` : "Metadata editor"}
          </p>
        </div>
      </div>

      <div className="border border-border bg-card p-6 relative">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            
            {/* Core Settings */}
            <div className="grid md:grid-cols-3 gap-6 p-4 border border-border/50 bg-muted/10">
              <FormField control={form.control} name="questionType" render={({ field }) => (
                <FormItem>
                  <FormLabel>Format</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="mcq">Multiple Choice</SelectItem>
                      <SelectItem value="short">Short Answer</SelectItem>
                      <SelectItem value="long">Long Answer</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="marks" render={({ field }) => (
                <FormItem>
                  <FormLabel>Value (Marks)</FormLabel>
                  <FormControl><Input type="number" {...field} value={field.value || ""} className="font-mono" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            {/* Question Text */}
            <FormField control={form.control} name="questionText" render={({ field }) => (
              <FormItem>
                <FormLabel>Question Content</FormLabel>
                <FormControl>
                  <textarea 
                    {...field} 
                    className="flex min-h-[120px] w-full rounded-none border border-input bg-background px-3 py-2 text-sm font-sans focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:border-primary"
                    placeholder="Enter question text here..."
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />

            {/* MCQ Specific */}
            {qType === "mcq" && (
              <div className="p-4 border border-primary/20 bg-primary/5 space-y-4">
                <h3 className="font-mono text-xs uppercase text-primary font-bold">MCQ Options</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <FormField control={form.control} name="optionA" render={({ field }) => (
                    <FormItem><FormLabel>Option A</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
                  )} />
                  <FormField control={form.control} name="optionB" render={({ field }) => (
                    <FormItem><FormLabel>Option B</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
                  )} />
                  <FormField control={form.control} name="optionC" render={({ field }) => (
                    <FormItem><FormLabel>Option C</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
                  )} />
                  <FormField control={form.control} name="optionD" render={({ field }) => (
                    <FormItem><FormLabel>Option D</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
                  )} />
                </div>
                <FormField control={form.control} name="correctOption" render={({ field }) => (
                  <FormItem className="w-[200px]">
                    <FormLabel>Correct Answer</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Select correct" /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="A">Option A</SelectItem>
                        <SelectItem value="B">Option B</SelectItem>
                        <SelectItem value="C">Option C</SelectItem>
                        <SelectItem value="D">Option D</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
            )}

            {/* Non-MCQ Specific */}
            {qType !== "mcq" && (
              <FormField control={form.control} name="modelAnswer" render={({ field }) => (
                <FormItem>
                  <FormLabel>Model Answer</FormLabel>
                  <FormControl>
                    <textarea 
                      {...field} 
                      className="flex min-h-[120px] w-full rounded-none border border-input bg-background px-3 py-2 text-sm font-sans focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:border-primary"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            )}

            {/* Common Explanation */}
            <FormField control={form.control} name="explanation" render={({ field }) => (
              <FormItem>
                <FormLabel>Explanation / Working</FormLabel>
                <FormControl>
                  <textarea 
                    {...field} 
                    className="flex min-h-[80px] w-full rounded-none border border-input bg-background px-3 py-2 text-sm font-sans focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:border-primary"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />

            {/* Reference Data */}
            <div className="p-4 border border-border/50 space-y-4">
              <h3 className="font-mono text-xs uppercase text-muted-foreground font-bold">Reference Metadata</h3>
              <div className="grid md:grid-cols-3 gap-4">
                <FormField control={form.control} name="referenceYear" render={({ field }) => (
                  <FormItem><FormLabel>Year</FormLabel><FormControl><Input type="number" {...field} value={field.value || ""} /></FormControl></FormItem>
                )} />
                <FormField control={form.control} name="referenceType" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Source Type</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl><SelectTrigger><SelectValue placeholder="-" /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="board_paper">Board Paper</SelectItem>
                        <SelectItem value="coaching_paper">Coaching Paper</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormItem>
                )} />
                <FormField control={form.control} name="referenceSource" render={({ field }) => (
                  <FormItem><FormLabel>Source Name</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
                )} />
              </div>
              <div className="grid md:grid-cols-3 gap-4 mt-4">
                <FormField control={form.control} name="difficulty" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Difficulty</FormLabel>
                    <Select onValueChange={(v) => field.onChange(v === "none" ? undefined : v)} defaultValue={field.value || "none"}>
                      <FormControl><SelectTrigger><SelectValue placeholder="-" /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="none">-</SelectItem>
                        <SelectItem value="easy">Easy</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="hard">Hard</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormItem>
                )} />
                <FormField control={form.control} name="bookPage" render={({ field }) => (
                  <FormItem><FormLabel>Book Page</FormLabel><FormControl><Input type="number" {...field} value={field.value || ""} /></FormControl></FormItem>
                )} />
                <FormField control={form.control} name="bookExplanation" render={({ field }) => (
                  <FormItem><FormLabel>Book Explanation</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
                )} />
              </div>
              <FormField control={form.control} name="tags" render={({ field }) => (
                <FormItem className="mt-4">
                  <FormLabel>Tags (comma-separated)</FormLabel>
                  <FormControl>
                    <Input
                      value={(field.value || []).join(", ")}
                      onChange={(e) => field.onChange(e.target.value.split(",").map((t) => t.trim()).filter(Boolean))}
                      placeholder="circuit, derivation, previous year"
                    />
                  </FormControl>
                </FormItem>
              )} />
            </div>

            <Button type="submit" disabled={isPending} className="w-full h-12">
              {isPending ? "TRANSMITTING..." : (isNew ? "COMMIT RECORD TO MATRIX" : "UPDATE RECORD")}
            </Button>
          </form>
        </Form>
      </div>
    </Shell>
  );
}
