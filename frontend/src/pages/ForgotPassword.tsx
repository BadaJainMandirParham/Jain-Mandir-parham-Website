import { useState } from "react";
import { motion } from "framer-motion";
import { Mail, ArrowLeft, ArrowRight, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import templeLogo from "@/assets/temple-logo.png";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const { resetPassword } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await resetPassword(email);
    setLoading(false);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }
    setSent(true);
    toast({ title: "Secure link sent", description: "If the address exists, we’ve emailed a secure reset link for your account." });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-cream p-4 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 -left-20 w-72 h-72 rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute bottom-1/4 -right-20 w-96 h-96 rounded-full bg-gold-light/10 blur-3xl" />
      </div>

      <motion.div
        className="glass-card-strong p-8 md:p-10 w-full max-w-md relative z-10"
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
      >
        <div className="text-center mb-8">
          <Link to="/" className="inline-block">
            <motion.img
              src={templeLogo}
              alt="Logo"
              className="w-20 h-20 mx-auto mb-4 object-contain"
              whileHover={{ scale: 1.1, rotate: 5 }}
              transition={{ type: "spring", stiffness: 300 }}
            />
          </Link>
          <h2 className="font-display text-2xl font-bold gold-text">
            {sent ? "Check Your Email" : "Forgot Password"}
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            {sent ? "We've sent a secure reset link to your email" : "Enter your email to receive a secure reset link"}
          </p>
        </div>

        {!sent ? (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium mb-1.5">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-border bg-background/50 focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm"
                  placeholder="your@email.com"
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 gold-gradient text-primary-foreground font-semibold rounded-xl glow-gold-hover flex items-center justify-center gap-2 hover:scale-[1.02] transition-all disabled:opacity-60"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Send Reset Link <ArrowRight className="w-4 h-4" /></>}
            </button>
          </form>
        ) : (
          <div className="text-center space-y-6">
            <div className="w-20 h-20 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
              <Mail className="w-8 h-8 text-primary" />
            </div>
            <p className="text-sm text-muted-foreground">
              A secure password reset link has been sent to <strong className="text-foreground">{email}</strong>.
              Please open the link in your inbox to continue.
            </p>
            <Link to="/reset-password" className="inline-flex items-center justify-center gap-2 px-5 py-2.5 gold-gradient text-primary-foreground font-semibold rounded-xl">
              Open Reset Page <ArrowRight className="w-4 h-4" />
            </Link>
            <button onClick={() => setSent(false)} className="block mx-auto text-sm text-primary font-medium hover:underline">
              Didn't receive it? Try again
            </button>
          </div>
        )}

        <div className="text-center mt-6">
          <Link to="/login" className="text-sm text-muted-foreground hover:text-primary flex items-center justify-center gap-1 font-medium">
            <ArrowLeft className="w-4 h-4" /> Back to Login
          </Link>
        </div>
      </motion.div>
    </div>
  );
};

export default ForgotPassword;
