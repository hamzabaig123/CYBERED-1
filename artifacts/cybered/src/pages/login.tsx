import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useLogin } from "@workspace/api-client-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function Login() {
  const [booting, setBooting] = useState(true);
  const [bootLog, setBootLog] = useState<string[]>([]);
  const [, setLocation] = useLocation();
  const { login } = useAuth();
  const { toast } = useToast();
  
  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const { mutate: loginMutation, isPending } = useLogin();

  useEffect(() => {
    const logs = [
      "INITIALIZING SECURE PROTOCOLS...",
      "LOADING KERNEL MODULES... OK",
      "MOUNTING ENCRYPTED DATABASES... OK",
      "ESTABLISHING SECURE CONNECTION...",
      "SYSTEM READY. AWAITING CREDENTIALS."
    ];
    let currentStep = 0;
    
    const interval = setInterval(() => {
      if (currentStep < logs.length) {
        setBootLog(prev => [...prev, logs[currentStep]]);
        currentStep++;
      } else {
        clearInterval(interval);
        setTimeout(() => setBooting(false), 500);
      }
    }, 400);

    return () => clearInterval(interval);
  }, []);

  const onSubmit = (data: LoginFormValues) => {
    loginMutation(
      { data },
      {
        onSuccess: (res) => {
          if (res.token && res.refreshToken) {
            login(res.token, res.refreshToken);
            toast({ title: "ACCESS GRANTED", description: "Welcome back, Operator." });
            setLocation("/dashboard");
          } else {
            toast({ title: "AUTHENTICATION INCOMPLETE", description: "Missing tokens in response.", variant: "destructive" });
          }
        },
        onError: () => {
          toast({ title: "ACCESS DENIED", description: "Invalid credentials.", variant: "destructive" });
        }
      }
    );
  };

  if (booting) {
    return (
      <div className="min-h-screen bg-black text-primary font-mono p-8 crt-overlay flex flex-col justify-end">
        {bootLog.map((log, i) => (
          <div key={i} className="animate-in fade-in slide-in-from-bottom-2 duration-300">
            &gt; {log}
          </div>
        ))}
        <div className="animate-pulse">&gt; _</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 crt-overlay">
      <div className="w-full max-w-md">
        <div className="border border-primary/30 bg-card p-8 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-primary"></div>
          
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-bold font-mono tracking-widest text-primary uppercase mb-2">CyberEd</h1>
            <p className="text-xs font-mono text-muted-foreground uppercase tracking-widest">Secure Learning Console</p>
          </div>

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

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Passphrase</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="••••••••" {...field} className="font-mono tracking-widest" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button type="submit" className="w-full" disabled={isPending}>
                {isPending ? "AUTHENTICATING..." : "INITIATE LOGIN"}
              </Button>
            </form>
          </Form>

          <div className="mt-6 text-center text-xs font-mono text-muted-foreground">
            UNREGISTERED OPERATOR? <Link href="/register" className="text-primary hover:underline">REQUEST ACCESS</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
