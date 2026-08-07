import { useState } from "react";
import { Link } from "wouter";
import { useForgotPassword } from "@workspace/api-client-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";

const forgotSchema = z.object({
  email: z.string().email("Invalid email address"),
});

type ForgotFormValues = z.infer<typeof forgotSchema>;

export default function ForgotPassword() {
  const { toast } = useToast();
  const [submitted, setSubmitted] = useState(false);
  
  const form = useForm<ForgotFormValues>({
    resolver: zodResolver(forgotSchema),
    defaultValues: { email: "" },
  });

  const { mutate: forgotMutation, isPending } = useForgotPassword();

  const onSubmit = (data: ForgotFormValues) => {
    forgotMutation(
      { data },
      {
        onSuccess: () => {
          setSubmitted(true);
          toast({ title: "REQUEST RECEIVED", description: "If the identity exists, reset instructions will be transmitted." });
        },
        onError: () => {
          // Even on error, we might want to pretend it succeeded for security,
          // but we will just show the same message.
          setSubmitted(true);
          toast({ title: "REQUEST RECEIVED", description: "If the identity exists, reset instructions will be transmitted." });
        }
      }
    );
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 crt-overlay">
      <div className="w-full max-w-md">
        <div className="border border-primary/30 bg-card p-8 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-primary"></div>
          
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-bold font-mono tracking-widest text-primary uppercase mb-2">Password Reset</h1>
            <p className="text-xs font-mono text-muted-foreground uppercase tracking-widest">Identity Recovery</p>
          </div>

          {submitted ? (
            <div className="text-center font-mono space-y-4">
              <p className="text-primary">Instructions have been transmitted to your comms link.</p>
              <p className="text-sm text-muted-foreground">Please check your email and follow the secure link to reset your passphrase.</p>
              <div className="pt-4">
                <Link href="/login">
                  <Button variant="outline" className="w-full">RETURN TO LOGIN</Button>
                </Link>
              </div>
            </div>
          ) : (
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Identity (Email)</FormLabel>
                      <FormControl>
                        <Input placeholder="operator@cybered.local" {...field} className="font-mono" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button type="submit" className="w-full" disabled={isPending}>
                  {isPending ? "TRANSMITTING..." : "REQUEST RESET"}
                </Button>
              </form>
            </Form>
          )}

          <div className="mt-6 text-center text-xs font-mono text-muted-foreground">
            REMEMBERED IT? <Link href="/login" className="text-primary hover:underline">RETURN TO AUTHENTICATION</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
