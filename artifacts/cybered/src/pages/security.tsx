import { useState } from "react";
import { Shell } from "@/components/layout/shell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import {
  useEnroll2fa,
  useConfirm2fa,
  useDisable2fa,
  useListSessions,
  useRevokeSession,
  useRevokeAllSessions,
  useRequestEmailVerification,
} from "@workspace/api-client-react";
import {
  Shield,
  ShieldCheck,
  ShieldOff,
  Monitor,
  Trash2,
  AlertTriangle,
  CheckCircle,
  Copy,
  Loader2,
} from "lucide-react";
import { Link } from "wouter";

type TwoFaStep = "idle" | "enrolling" | "confirming" | "done";

export default function SecuritySettings() {
  const { user } = useAuth();
  const { toast } = useToast();

  // 2FA state
  const [twoFaStep, setTwoFaStep] = useState<TwoFaStep>("idle");
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [totpCode, setTotpCode] = useState("");
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [disableCode, setDisableCode] = useState("");
  const [showDisable, setShowDisable] = useState(false);

  const { mutate: enrollMutate, isPending: isEnrolling } = useEnroll2fa();
  const { mutate: confirmMutate, isPending: isConfirming } = useConfirm2fa();
  const { mutate: disableMutate, isPending: isDisabling } = useDisable2fa();

  // Sessions state
  const { data: sessions, isLoading: sessionsLoading, refetch: refetchSessions } = useListSessions();
  const { mutate: revokeSession, isPending: isRevoking } = useRevokeSession();
  const { mutate: revokeAll, isPending: isRevokingAll } = useRevokeAllSessions();

  // Email verification
  const { mutate: requestVerify } = useRequestEmailVerification();

  const handleEnroll = () => {
    enrollMutate(undefined, {
      onSuccess: (res) => {
        setQrCode(res.qrCode);
        setSecret(res.secret);
        setTwoFaStep("confirming");
      },
      onError: () => toast({ title: "ENROLLMENT FAILED", variant: "destructive" }),
    });
  };

  const handleConfirm = () => {
    confirmMutate(
      { data: { code: totpCode } },
      {
        onSuccess: (res) => {
          setBackupCodes(res.backupCodes);
          setTwoFaStep("done");
          toast({ title: "2FA ENABLED", description: "Two-factor authentication is now active." });
        },
        onError: () => toast({ title: "INVALID CODE", description: "Check your authenticator app.", variant: "destructive" }),
      }
    );
  };

  const handleDisable = () => {
    disableMutate(
      { data: { code: disableCode } },
      {
        onSuccess: () => {
          setShowDisable(false);
          setDisableCode("");
          toast({ title: "2FA DISABLED", description: "Two-factor authentication has been deactivated." });
        },
        onError: () => toast({ title: "INVALID CODE", variant: "destructive" }),
      }
    );
  };

  const handleRevokeSession = (sessionId: number) => {
    revokeSession(
      { sessionId },
      { onSuccess: () => refetchSessions() }
    );
  };

  const handleRevokeAll = () => {
    revokeAll(undefined, {
      onSuccess: () => {
        refetchSessions();
        toast({ title: "ALL SESSIONS REVOKED", description: "All devices except current session terminated." });
      },
    });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "COPIED", description: "Copied to clipboard." });
  };

  return (
    <Shell>
      <div className="mb-8">
        <h1 className="text-3xl font-bold font-mono text-primary uppercase tracking-widest mb-2 flex items-center gap-3">
          <Shield className="h-8 w-8" />
          Security Console
        </h1>
        <p className="text-muted-foreground font-mono uppercase text-sm">Identity Protection & Access Management</p>
      </div>

      <div className="space-y-6">
        {/* Email Verification Banner */}
        {!user?.emailVerifiedAt && (
          <Card className="border-yellow-500/50 bg-yellow-500/5">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="h-5 w-5 text-yellow-500" />
                  <div>
                    <p className="font-mono text-sm font-semibold text-yellow-500 uppercase tracking-wide">Comms Link Unverified</p>
                    <p className="text-xs text-muted-foreground font-mono mt-1">Verify your email to unlock all features.</p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-yellow-500/50 text-yellow-500 hover:bg-yellow-500/10"
                  onClick={() => requestVerify(undefined, {
                    onSuccess: () => toast({ title: "VERIFICATION SENT", description: "Check your email." }),
                  })}
                >
                  SEND LINK
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {user?.emailVerifiedAt && (
          <Card className="border-primary/30">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <CheckCircle className="h-5 w-5 text-primary" />
                <div>
                  <p className="font-mono text-sm font-semibold text-primary uppercase tracking-wide">Comms Link Verified</p>
                  <p className="text-xs text-muted-foreground font-mono mt-1">
                    Verified on {new Date(user.emailVerifiedAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* 2FA Section */}
        <Card>
          <CardHeader className="border-b border-border/50 pb-4">
            <CardTitle className="text-primary flex items-center gap-2 text-sm">
              <ShieldCheck className="h-4 w-4" />
              TWO-FACTOR AUTHENTICATION
            </CardTitle>
            <CardDescription className="font-mono text-xs">
              Add an extra layer of security using a TOTP authenticator app (Google Authenticator, Authy, etc.)
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            {twoFaStep === "idle" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border border-border bg-muted/10">
                  <div>
                    <p className="font-mono text-sm uppercase tracking-wide">STATUS</p>
                    <Badge variant="outline" className="mt-1 text-xs border-red-500/50 text-red-400">DISABLED</Badge>
                  </div>
                  <Button onClick={() => { setTwoFaStep("enrolling"); handleEnroll(); }} disabled={isEnrolling}>
                    {isEnrolling ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    ENABLE 2FA
                  </Button>
                </div>
              </div>
            )}

            {twoFaStep === "confirming" && qrCode && (
              <div className="space-y-6">
                <div>
                  <p className="font-mono text-xs text-muted-foreground uppercase mb-4">
                    Scan this QR code with your authenticator app, or enter the secret manually.
                  </p>
                  <div className="flex flex-col items-center gap-4">
                    <img src={qrCode} alt="2FA QR Code" className="w-48 h-48 border border-primary/30" />
                    {secret && (
                      <div className="flex items-center gap-2 p-2 bg-muted/30 border border-border font-mono text-xs break-all">
                        <span className="text-primary">{secret}</span>
                        <Button variant="ghost" size="sm" onClick={() => copyToClipboard(secret!)}>
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
                <div className="space-y-3">
                  <p className="font-mono text-xs text-muted-foreground uppercase">Enter the 6-digit code from your authenticator:</p>
                  <div className="flex gap-2">
                    <Input
                      placeholder="000000"
                      value={totpCode}
                      onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                      className="font-mono tracking-[0.5em] text-center text-lg"
                      maxLength={6}
                    />
                    <Button onClick={handleConfirm} disabled={totpCode.length < 6 || isConfirming}>
                      {isConfirming ? <Loader2 className="h-4 w-4 animate-spin" /> : "CONFIRM"}
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {twoFaStep === "done" && (
              <div className="space-y-6">
                <div className="flex items-center gap-3 p-4 border border-primary/30 bg-primary/5">
                  <CheckCircle className="h-5 w-5 text-primary" />
                  <div>
                    <p className="font-mono text-sm font-semibold text-primary uppercase">2FA ENABLED SUCCESSFULLY</p>
                    <p className="text-xs text-muted-foreground font-mono mt-1">Store your backup codes in a safe place.</p>
                  </div>
                </div>
                <div>
                  <p className="font-mono text-xs text-muted-foreground uppercase mb-3">Backup Codes (one-time use):</p>
                  <div className="grid grid-cols-2 gap-2">
                    {backupCodes.map((code, i) => (
                      <div key={i} className="flex items-center justify-between p-2 bg-muted/30 border border-border">
                        <span className="font-mono text-xs text-primary tracking-widest">{code}</span>
                        <Button variant="ghost" size="sm" onClick={() => copyToClipboard(code)}>
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                  <Button variant="outline" className="mt-4 w-full" onClick={() => copyToClipboard(backupCodes.join("\n"))}>
                    COPY ALL BACKUP CODES
                  </Button>
                </div>
              </div>
            )}

            {/* Disable 2FA (when enabled) */}
            {showDisable && (
              <div className="mt-6 p-4 border border-destructive/30 bg-destructive/5 space-y-3">
                <p className="font-mono text-xs text-destructive uppercase">Enter TOTP code to disable 2FA:</p>
                <div className="flex gap-2">
                  <Input
                    placeholder="000000"
                    value={disableCode}
                    onChange={(e) => setDisableCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    className="font-mono tracking-[0.5em] text-center"
                    maxLength={6}
                  />
                  <Button variant="destructive" onClick={handleDisable} disabled={disableCode.length < 6 || isDisabling}>
                    {isDisabling ? <Loader2 className="h-4 w-4 animate-spin" /> : "DISABLE"}
                  </Button>
                  <Button variant="ghost" onClick={() => setShowDisable(false)}>CANCEL</Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Active Sessions */}
        <Card>
          <CardHeader className="border-b border-border/50 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-primary flex items-center gap-2 text-sm">
                  <Monitor className="h-4 w-4" />
                  ACTIVE SESSIONS
                </CardTitle>
                <CardDescription className="font-mono text-xs mt-1">
                  Devices & locations with active access tokens.
                </CardDescription>
              </div>
              {sessions && sessions.length > 1 && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleRevokeAll}
                  disabled={isRevokingAll}
                >
                  {isRevokingAll ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <ShieldOff className="h-4 w-4 mr-2" />}
                  REVOKE ALL
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            {sessionsLoading ? (
              <div className="space-y-3">
                {[1, 2].map((i) => <div key={i} className="h-14 bg-muted/20 animate-pulse border border-border/50" />)}
              </div>
            ) : sessions && sessions.length > 0 ? (
              <div className="space-y-3">
                {sessions.map((session) => (
                  <div key={session.id} className="flex items-center justify-between p-3 border border-border/50 bg-muted/10">
                    <div className="flex items-center gap-3">
                      <Monitor className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="font-mono text-xs text-foreground">{session.userAgent || "Unknown Device"}</p>
                        <p className="font-mono text-[10px] text-muted-foreground mt-0.5">
                          {session.ipAddress || "Unknown IP"} · {new Date(session.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {session.current && (
                        <Badge variant="outline" className="text-[10px] border-primary/50 text-primary">CURRENT</Badge>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRevokeSession(session.id)}
                        disabled={isRevoking || session.current}
                      >
                        <Trash2 className="h-3 w-3 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center p-8 text-muted-foreground font-mono text-sm border border-dashed border-border">
                NO ACTIVE SESSIONS FOUND
              </div>
            )}
          </CardContent>
        </Card>

        {/* Password Reset */}
        <Card>
          <CardHeader className="border-b border-border/50 pb-4">
            <CardTitle className="text-primary flex items-center gap-2 text-sm">
              <Shield className="h-4 w-4" />
              PASSPHRASE MANAGEMENT
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between p-4 border border-border bg-muted/10">
              <div>
                <p className="font-mono text-sm uppercase tracking-wide">Change Passphrase</p>
                <p className="text-xs text-muted-foreground font-mono mt-1">
                  Use the forgot password flow to change your passphrase securely.
                </p>
              </div>
              <Link href="/forgot-password">
                <Button variant="outline" size="sm">CHANGE PASSPHRASE</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </Shell>
  );
}
