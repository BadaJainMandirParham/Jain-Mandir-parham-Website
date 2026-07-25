import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { KeyRound, ArrowRight, Loader2, CheckCircle, MailCheck } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { apiBaseUrl } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import templeLogo from "@/assets/temple-logo.png";
import { getResetTokenFromUrl } from "@/lib/passwordReset";

const ResetPassword = () => {
  const [token, setToken] = useState(() => getResetTokenFromUrl(window.location.search));
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(Boolean(getResetTokenFromUrl(window.location.search)));
  const [verified, setVerified] = useState(Boolean(getResetTokenFromUrl(window.location.search)));
  const [verificationError, setVerificationError] = useState("");
  const [done, setDone] = useState(false);
  const navigate = useNavigate();
  const hasUrlToken = Boolean(getResetTokenFromUrl(window.location.search));

  useEffect(() => {
    const urlToken = getResetTokenFromUrl(window.location.search);
    if (!urlToken) return;
    void verifyResetToken(urlToken);
  }, []);

  const verifyResetToken = async (value: string) => {
    if (!value) {
      setVerified(false);
      setVerificationError("Enter the reset link token to continue.");
      return;
    }
    setVerifying(true);
    setVerificationError("");
    try {
      const res = await fetch(`${apiBaseUrl}/auth/verify-reset-token`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: value }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(payload.error || "The reset link has expired or is invalid.");
      setVerified(true);
      setToken(value);
      toast({ title: "Link verified", description: "You can now create a new password." });
    } catch (error: any) {
      setVerified(false);
      setVerificationError(error.message || "The reset link has expired or is invalid.");
      toast({ title: "Verification failed", description: error.message || "The reset link has expired or is invalid.", variant: "destructive" });
    } finally {
      setVerifying(false);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    await verifyResetToken(token);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      toast({ title: "Error", description: "Please verify the reset link first", variant: "destructive" });
      return;
    }
    if (password !== confirm) {
      toast({ title: "Error", description: "Passwords do not match", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${apiBaseUrl}/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(payload.error || "Unable to reset password");
      setDone(true);
      setTimeout(() => navigate("/login"), 3000);
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Unable to reset password", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-cream p-4 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 -left-20 w-72 h-72 rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute bottom-1/4 -right-20 w-96 h-96 rounded-full bg-gold-light/10 blur-3xl" />
      </div>

      <motion.div className="glass-card-strong p-8 md:p-10 w-full max-w-md relative z-10" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="text-center mb-8">
          <img src={templeLogo} alt="Logo" className="w-20 h-20 mx-auto mb-4 object-contain" />
          <h2 className="font-display text-2xl font-bold gold-text">{done ? "Password Reset!" : verified ? "Set New Password" : "Verify Reset Link"}</h2>
        </div>

        {done ? (
          <div className="text-center space-y-4">
            <div className="w-16 h-16 mx-auto rounded-full bg-emerald-50 flex items-center justify-center">
              <CheckCircle className="w-8 h-8 text-emerald-500" />
            </div>
            <p className="text-sm text-muted-foreground">Your password has been reset. Redirecting to login...</p>
          </div>
        ) : !verified ? (
          <form onSubmit={handleVerify} className="space-y-5">
            <div className="rounded-2xl border border-primary/10 bg-primary/5 p-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-2 text-primary font-medium">
                <MailCheck className="w-4 h-4" />
                Open the secure reset link from your inbox, or paste the token below.
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Reset Link Token</label>
              <div className="relative">
                <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  required
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-border bg-background/50 focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm"
                  placeholder="Paste the token from your email"
                />
              </div>
            </div>
            {verificationError ? <p className="text-sm text-destructive">{verificationError}</p> : null}
            <button
              type="submit"
              disabled={verifying}
              className="w-full py-3.5 gold-gradient text-primary-foreground font-semibold rounded-xl flex items-center justify-center gap-2 hover:scale-[1.02] transition-all disabled:opacity-60"
            >
              {verifying ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Verify Link <ArrowRight className="w-4 h-4" /></>}
            </button>
          </form>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium mb-1.5">New Password</label>
              <div className="relative">
                <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-border bg-background/50 focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm"
                  placeholder="Min 6 characters"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Confirm Password</label>
              <div className="relative">
                <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="password"
                  required
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-border bg-background/50 focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm"
                  placeholder="Confirm password"
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 gold-gradient text-primary-foreground font-semibold rounded-xl flex items-center justify-center gap-2 hover:scale-[1.02] transition-all disabled:opacity-60"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Reset Password <ArrowRight className="w-4 h-4" /></>}
            </button>
          </form>
        )}
      </motion.div>
    </div>
  );
};

export default ResetPassword;
