import { Link, useLocation } from "wouter";
import { useRegister } from "@workspace/api-client-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";

const registerSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

type RegisterFormValues = z.infer<typeof registerSchema>;

export default function Register() {
  const [, setLocation] = useLocation();
  const { login } = useAuth();
  const { toast } = useToast();
  
  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { username: "", email: "", password: "" },
  });

  const { mutate: registerMutation, isPending } = useRegister();

  const onSubmit = (data: RegisterFormValues) => {
    registerMutation(
      { data },
      {
        onSuccess: (res) => {
          if (res.token && res.refreshToken) {
            login(res.token, res.refreshToken);
            toast({ title: "REGISTRATION COMPLETE", description: "Welcome to the network." });
            setLocation("/dashboard");
          } else {
            toast({ title: "REGISTRATION INCOMPLETE", description: "Missing tokens in response.", variant: "destructive" });
          }
        },
        onError: () => {
          toast({ title: "REGISTRATION FAILED", description: "Identity conflict or invalid parameters.", variant: "destructive" });
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
            <h1 className="text-3xl font-bold font-mono tracking-widest text-primary uppercase mb-2">New Operator</h1>
            <p className="text-xs font-mono text-muted-foreground uppercase tracking-widest">Network Registration</p>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Callsign (Username)</FormLabel>
                    <FormControl>
                      <Input placeholder="neo" {...field} className="font-mono" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Comms Link (Email)</FormLabel>
                    <FormControl>
                      <Input placeholder="neo@matrix.net" {...field} className="font-mono" />
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
                    <FormLabel>Encryption Key (Password)</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="••••••••" {...field} className="font-mono tracking-widest" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button type="submit" className="w-full" disabled={isPending}>
                {isPending ? "PROCESSING..." : "REGISTER IDENTITY"}
              </Button>
            </form>
          </Form>

          <div className="mt-6 text-center text-xs font-mono text-muted-foreground">
            ALREADY REGISTERED? <Link href="/login" className="text-primary hover:underline">AUTHENTICATE HERE</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
