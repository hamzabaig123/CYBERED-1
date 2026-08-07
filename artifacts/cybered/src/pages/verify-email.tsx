import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useVerifyEmail, useRequestEmailVerification } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";

export default function VerifyEmail() {
  const { toast } = useToast();
  const [location, setLocation] = useLocation();
  const { user } = useAuth();
  
  const [status, setStatus] = useState<"verifying" | "success" | "error" | "requesting">("verifying");
  
  const { mutate: verifyMutation } = useVerifyEmail();
  const { mutate: requestMutation } = useRequestEmailVerification();

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const token = searchParams.get("token");
    
    if (token) {
      verifyMutation(
        { data: { token } },
        {
          onSuccess: () => {
            setStatus("success");
            toast({ title: "IDENTITY VERIFIED", description: "Your comms link is now secured." });
          },
          onError: () => {
            setStatus("error");
          }
        }
      );
    } else {
      setStatus("requesting");
    }
  }, [verifyMutation, toast]);

  const handleResend = () => {
    requestMutation(undefined, {
      onSuccess: () => {
        toast({ title: "VERIFICATION TRANSMITTED", description: "Check your comms link for the verification token." });
      }
    });
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 crt-overlay">
      <div className="w-full max-w-md">
        <div className="border border-primary/30 bg-card p-8 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-primary"></div>
          
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-bold font-mono tracking-widest text-primary uppercase mb-2">Identity Verification</h1>
            <p className="text-xs font-mono text-muted-foreground uppercase tracking-widest">Comms Link Security</p>
          </div>

          <div className="flex flex-col items-center justify-center py-6 text-center space-y-6">
            {status === "verifying" && (
              <>
                <Loader2 className="w-16 h-16 animate-spin text-primary" />
                <p className="font-mono text-primary tracking-widest">VERIFYING TOKEN...</p>
              </>
            )}

            {status === "success" && (
              <>
                <CheckCircle className="w-16 h-16 text-primary" />
                <p className="font-mono text-primary tracking-widest">VERIFICATION COMPLETE</p>
                <div className="pt-4 w-full">
                  <Link href="/dashboard">
                    <Button className="w-full">RETURN TO DASHBOARD</Button>
                  </Link>
                </div>
              </>
            )}

            {status === "error" && (
              <>
                <XCircle className="w-16 h-16 text-destructive" />
                <p className="font-mono text-destructive tracking-widest">VERIFICATION FAILED</p>
                <p className="text-sm text-muted-foreground font-mono">The token is invalid or has expired.</p>
                <div className="pt-4 w-full space-y-4">
                  {user && (
                    <Button variant="outline" className="w-full" onClick={handleResend}>
                      REQUEST NEW TOKEN
                    </Button>
                  )}
                  <Link href={user ? "/dashboard" : "/login"}>
                    <Button variant="ghost" className="w-full">RETURN</Button>
                  </Link>
                </div>
              </>
            )}

            {status === "requesting" && user && !user.emailVerifiedAt && (
              <>
                <p className="font-mono text-primary">Your comms link has not been verified.</p>
                <Button className="w-full mt-4" onClick={handleResend}>
                  TRANSMIT VERIFICATION LINK
                </Button>
                <Link href="/dashboard" className="w-full mt-4 block">
                  <Button variant="outline" className="w-full">SKIP FOR NOW</Button>
                </Link>
              </>
            )}
            
            {status === "requesting" && user && user.emailVerifiedAt && (
              <>
                <CheckCircle className="w-16 h-16 text-primary" />
                <p className="font-mono text-primary">IDENTITY ALREADY VERIFIED</p>
                <div className="pt-4 w-full">
                  <Link href="/dashboard">
                    <Button className="w-full">RETURN TO DASHBOARD</Button>
                  </Link>
                </div>
              </>
            )}
            
            {status === "requesting" && !user && (
              <>
                <p className="font-mono text-muted-foreground">Please authenticate to request verification.</p>
                <Link href="/login" className="w-full mt-4 block">
                  <Button className="w-full">AUTHENTICATE</Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
