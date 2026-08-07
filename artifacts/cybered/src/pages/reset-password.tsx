import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useResetPassword } from "@workspace/api-client-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";

const resetSchema = z.object({
  newPassword: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string()
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

type ResetFormValues = z.infer<typeof resetSchema>;

export default function ResetPassword() {
  const { toast } = useToast();
  const [location, setLocation] = useLocation();
  const [token, setToken] = useState<string | null>(null);
  
  useEffect(() => {
    // Extract token from URL query string
    const searchParams = new URLSearchParams(window.location.search);
    const tokenParam = searchParams.get("token");
    if (tokenParam) {
      setToken(tokenParam);
    } else {
      toast({ title: "INVALID LINK", description: "No reset token found in URL.", variant: "destructive" });
      setLocation("/login");
    }
  }, [setLocation, toast]);

  const form = useForm<ResetFormValues>({
    resolver: zodResolver(resetSchema),
    defaultValues: { newPassword: "", confirmPassword: "" },
  });

  const { mutate: resetMutation, isPending } = useResetPassword();

  const onSubmit = (data: ResetFormValues) => {
    if (!token) return;
    resetMutation(
      { data: { token, newPassword: data.newPassword } },
      {
        onSuccess: () => {
          toast({ title: "PASSPHRASE UPDATED", description: "Your identity has been secured with the new passphrase." });
          setLocation("/login");
        },
        onError: (err: any) => {
          toast({ 
            title: "RESET FAILED", 
            description: err?.response?.data?.error || "Invalid or expired reset token.", 
            variant: "destructive" 
          });
        }
      }
    );
  };

  if (!token) return null;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 crt-overlay">
      <div className="w-full max-w-md">
        <div className="border border-primary/30 bg-card p-8 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-primary"></div>
          
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-bold font-mono tracking-widest text-primary uppercase mb-2">Update Passphrase</h1>
            <p className="text-xs font-mono text-muted-foreground uppercase tracking-widest">Establish New Security Key</p>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="newPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>New Passphrase</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="••••••••" {...field} className="font-mono tracking-widest" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirm Passphrase</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="••••••••" {...field} className="font-mono tracking-widest" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button type="submit" className="w-full" disabled={isPending}>
                {isPending ? "UPDATING..." : "CONFIRM NEW PASSPHRASE"}
              </Button>
            </form>
          </Form>

          <div className="mt-6 text-center text-xs font-mono text-muted-foreground">
            <Link href="/login" className="text-primary hover:underline">ABORT AND RETURN TO LOGIN</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
