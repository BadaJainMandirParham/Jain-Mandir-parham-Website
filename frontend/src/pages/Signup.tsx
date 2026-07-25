import { useState } from "react";
import { motion } from "framer-motion";
import { Mail, Lock, User, Phone, Eye, EyeOff, ArrowRight, Loader2, UserCheck } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import templeLogo from "@/assets/temple-logo.png";

const Signup = () => {
  const [form, setForm] = useState({ name: "", email: "", phone: "", password: "", confirmPassword: "" });
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { signUp } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!form.name.trim()) errs.name = "Name is required";
    if (!form.phone.trim()) errs.phone = "Phone is required";
    else if (!/^[\d+\-\s()]{7,15}$/.test(form.phone)) errs.phone = "Enter a valid phone number";
    if (!form.email.trim()) errs.email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errs.email = "Enter a valid email";
    if (!form.password) errs.password = "Password is required";
    else if (form.password.length < 6) errs.password = "Minimum 6 characters";
    if (!form.confirmPassword) errs.confirmPassword = "Please confirm password";
    else if (form.password !== form.confirmPassword) errs.confirmPassword = "Passwords don't match";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    // Client-side rate limiting - prevent rapid signups
    const lastAttempt = sessionStorage.getItem("lastSignupAttempt");
    const now = Date.now();
    if (lastAttempt && now - parseInt(lastAttempt) < 30000) {
      toast({ title: "Please Wait", description: "Kripya 30 second baad try karein.", variant: "destructive" });
      return;
    }
    sessionStorage.setItem("lastSignupAttempt", now.toString());

    setLoading(true);
    const { error } = await signUp(form.email, form.password, {
      display_name: form.name,
      phone: form.phone,
      role: "visitor",
    });
    setLoading(false);
    if (error) {
      const msg = error.message.toLowerCase().includes("rate") || error.message.toLowerCase().includes("limit") || error.message.toLowerCase().includes("block")
        ? "Bahut zyada requests ho gayi hain. Kripya 1 ghante baad try karein."
        : error.message;
      toast({ title: "Signup Failed", description: msg, variant: "destructive" });
    } else {
      toast({ title: "Jai Jinendra!", description: "Account ban gaya! Ab aap login kar sakte hain." });
      navigate("/login");
    }
  };

  const update = (key: string, val: string) => {
    setForm({ ...form, [key]: val });
    if (errors[key]) setErrors({ ...errors, [key]: "" });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-cream p-4 py-8 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-primary/5 blur-[100px]" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full bg-gold-light/8 blur-[80px]" />
      </div>

      <motion.div
        className="glass-card-strong p-8 md:p-10 w-full max-w-md relative z-10"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {/* Header */}
        <div className="text-center mb-6">
          <Link to="/">
            <motion.img src={templeLogo} alt="Logo" className="w-16 h-16 mx-auto mb-3 object-contain" whileHover={{ scale: 1.1, rotate: 5 }} />
          </Link>
          <h2 className="font-display text-2xl font-bold gold-text">{t("auth.createAccount")}</h2>
          <p className="text-sm text-muted-foreground mt-1">{t("auth.joinCommunity")}</p>
        </div>

        {/* Role badge */}
        <div className="glass-card p-3 flex items-center gap-3 mb-6 border border-primary/10">
          <div className="w-9 h-9 rounded-xl gold-gradient flex items-center justify-center flex-shrink-0">
            <UserCheck className="w-4 h-4 text-primary-foreground" />
          </div>
          <div>
            <p className="text-xs font-semibold text-primary">Visitor / Devotee (भक्त)</p>
            <p className="text-[10px] text-muted-foreground">Explore temple & receive updates</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium mb-1.5 text-foreground/80">Full Name</label>
            <div className="relative">
              <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input type="text" value={form.name} onChange={(e) => update("name", e.target.value)}
                className={`w-full pl-11 pr-4 py-3 rounded-2xl border-2 bg-background/60 text-sm focus:outline-none transition-all ${errors.name ? "border-destructive/50 focus:border-destructive" : "border-border/50 focus:border-primary/50"}`}
                placeholder="Enter your full name" />
            </div>
            {errors.name && <p className="text-xs text-destructive mt-1 ml-1">{errors.name}</p>}
          </div>

          {/* Phone */}
          <div>
            <label className="block text-sm font-medium mb-1.5 text-foreground/80">Phone Number</label>
            <div className="relative">
              <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input type="tel" value={form.phone} onChange={(e) => update("phone", e.target.value)}
                className={`w-full pl-11 pr-4 py-3 rounded-2xl border-2 bg-background/60 text-sm focus:outline-none transition-all ${errors.phone ? "border-destructive/50 focus:border-destructive" : "border-border/50 focus:border-primary/50"}`}
                placeholder="+91 XXXXXXXXXX" />
            </div>
            {errors.phone && <p className="text-xs text-destructive mt-1 ml-1">{errors.phone}</p>}
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium mb-1.5 text-foreground/80">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input type="email" value={form.email} onChange={(e) => update("email", e.target.value)}
                className={`w-full pl-11 pr-4 py-3 rounded-2xl border-2 bg-background/60 text-sm focus:outline-none transition-all ${errors.email ? "border-destructive/50 focus:border-destructive" : "border-border/50 focus:border-primary/50"}`}
                placeholder="your@email.com" />
            </div>
            {errors.email && <p className="text-xs text-destructive mt-1 ml-1">{errors.email}</p>}
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm font-medium mb-1.5 text-foreground/80">Password</label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input type={showPass ? "text" : "password"} value={form.password} onChange={(e) => update("password", e.target.value)}
                className={`w-full pl-11 pr-12 py-3 rounded-2xl border-2 bg-background/60 text-sm focus:outline-none transition-all ${errors.password ? "border-destructive/50 focus:border-destructive" : "border-border/50 focus:border-primary/50"}`}
                placeholder="Min 6 characters" />
              <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {errors.password && <p className="text-xs text-destructive mt-1 ml-1">{errors.password}</p>}
          </div>

          {/* Confirm Password */}
          <div>
            <label className="block text-sm font-medium mb-1.5 text-foreground/80">Confirm Password</label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input type={showConfirm ? "text" : "password"} value={form.confirmPassword} onChange={(e) => update("confirmPassword", e.target.value)}
                className={`w-full pl-11 pr-12 py-3 rounded-2xl border-2 bg-background/60 text-sm focus:outline-none transition-all ${errors.confirmPassword ? "border-destructive/50 focus:border-destructive" : "border-border/50 focus:border-primary/50"}`}
                placeholder="Re-enter password" />
              <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {errors.confirmPassword && <p className="text-xs text-destructive mt-1 ml-1">{errors.confirmPassword}</p>}
          </div>

          <button type="submit" disabled={loading}
            className="w-full py-3.5 gold-gradient text-primary-foreground font-semibold rounded-2xl glow-gold-hover flex items-center justify-center gap-2 hover:scale-[1.02] transition-all duration-300 disabled:opacity-60 disabled:hover:scale-100 mt-2">
            {loading ? <><Loader2 className="w-5 h-5 animate-spin" /> Creating Account...</> : <>{t("auth.createAccount")} <ArrowRight className="w-4 h-4" /></>}
          </button>
        </form>

        <p className="text-center text-sm text-muted-foreground mt-6">
          {t("auth.hasAccount")}{" "}
          <Link to="/login" className="text-primary font-semibold hover:underline">{t("nav.login")}</Link>
        </p>
      </motion.div>
    </div>
  );
};

export default Signup;
