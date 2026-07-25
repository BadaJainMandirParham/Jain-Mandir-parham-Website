import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Mail, Lock, Eye, EyeOff, ArrowRight, Loader2, UserCheck, Users, Shield, Phone, ChevronDown, KeyRound, ArrowLeft } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import templeLogo from "@/assets/temple-logo.png";

const sb = supabase as any;

const roleOptions = [
  { id: "visitor", label: "Visitor / Devotee", labelHi: "भक्त", icon: UserCheck, desc: "Explore temple & receive updates", descHi: "मंदिर देखें और अपडेट पाएं" },
  { id: "committee", label: "Committee", labelHi: "समिति", icon: Users, desc: "Manage temple activities", descHi: "मंदिर गतिविधियाँ प्रबंधित करें" },
  { id: "admin", label: "Admin", labelHi: "प्रशासक", icon: Shield, desc: "Full website control", descHi: "पूर्ण वेबसाइट नियंत्रण" },
];

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("visitor");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  // Committee forgot password state
  const [showForgotCommittee, setShowForgotCommittee] = useState(false);
  const [forgotPosition, setForgotPosition] = useState("");
  const [forgotMemberId, setForgotMemberId] = useState("");
  const [forgotPhone, setForgotPhone] = useState("");
  const [forgotNewPass, setForgotNewPass] = useState("");
  const [forgotConfirmPass, setForgotConfirmPass] = useState("");
  const [forgotStep, setForgotStep] = useState<"verify" | "reset">("verify");
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotResetToken, setForgotResetToken] = useState<string>("");
  const { signIn, committeeLogin } = useAuth();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const isHi = i18n.language === "hi";

  // Committee-specific state
  const [committeeMembers, setCommitteeMembers] = useState<any[]>([]);
  const [selectedPosition, setSelectedPosition] = useState("");
  const [selectedMemberId, setSelectedMemberId] = useState("");
  const [committeePassword, setCommitteePassword] = useState("");
  const [loadingPositions, setLoadingPositions] = useState(false);

  // Unique positions from committee members
  const uniquePositions = [...new Set(committeeMembers.map((m) => m.position))];
  // Members filtered by selected position
  const filteredMembers = committeeMembers.filter((m) => m.position === selectedPosition);

  // Fetch committee members (public view — no password/email exposed) when committee role is selected
  useEffect(() => {
    if (role === "committee") {
      setLoadingPositions(true);
      sb.from("committee_public").select("*").order("display_order", { ascending: true })
        .then(({ data }: any) => {
          setCommitteeMembers(data || []);
          setLoadingPositions(false);
        });
    }
    setSelectedPosition("");
    setSelectedMemberId("");
    setCommitteePassword("");
  }, [role]);

  const validate = () => {
    const errs: Record<string, string> = {};
    if (role === "committee") {
      if (!selectedPosition) errs.position = isHi ? "पद चुनें" : "Select a position";
      if (!selectedMemberId) errs.member = isHi ? "नाम चुनें" : "Select a name";
      if (!committeePassword.trim()) errs.phone = isHi ? "पासवर्ड डालें" : "Enter password";
    } else {
      if (!email.trim()) errs.email = "Email is required";
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errs.email = "Enter a valid email";
      if (!password) errs.password = "Password is required";
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleCommitteeLogin = async () => {
    setLoading(true);
    // Server-side password verification via edge function (no plaintext password on client)
    const { data, error } = await supabase.functions.invoke("committee-auth", {
      body: { action: "login", memberId: selectedMemberId, password: committeePassword },
    });
    if (error || !data?.member) {
      setLoading(false);
      const msg = (data as any)?.error || (error as any)?.message || (isHi ? "गलत पासवर्ड" : "Incorrect password.");
      toast({ title: isHi ? "लॉगिन विफल" : "Login Failed", description: msg, variant: "destructive" });
      return;
    }
    const member = data.member;
    committeeLogin(member, (data as any).sessionToken);
    setLoading(false);
    toast({ title: "🙏 Jai Jinendra!", description: isHi ? `स्वागत है ${member.name} जी! (${member.position})` : `Welcome ${member.name}! (${member.position})` });
    navigate("/committee-dashboard");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    if (role === "committee") {
      await handleCommitteeLogin();
      return;
    }

    setLoading(true);

    const { error } = await signIn(email, password);
    if (error) {
      setLoading(false);
      toast({ title: "Login Failed", description: error.message, variant: "destructive" });
      return;
    }

    // Verify user has the selected role
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      toast({ title: "Error", description: "Could not retrieve user.", variant: "destructive" });
      return;
    }

    const { data: roles, error: roleError } = await sb.from("user_roles").select("role").eq("user_id", user.id);
    if (roleError) {
      await supabase.auth.signOut();
      setLoading(false);
      toast({
        title: "Role Check Failed",
        description: "Please try logging in again.",
        variant: "destructive",
      });
      return;
    }

    const userRoles = (roles ?? []).map((item: { role: string }) => item.role);
    const hasSelectedRole = userRoles.includes(role);
    const primaryRole = userRoles[0];

    if (!hasSelectedRole) {
      await supabase.auth.signOut();
      setLoading(false);
      const roleLabel = roleOptions.find(r => r.id === primaryRole)?.label ?? primaryRole ?? "unassigned";
      toast({
        title: "Role Mismatch",
        description: `Your account is registered as "${roleLabel}". Please select the correct role to continue.`,
        variant: "destructive",
      });
      return;
    }

    setLoading(false);

    const greetings: Record<string, string> = {
      admin: "Welcome Admin! Redirecting to dashboard...",
      visitor: "Welcome Devotee! Explore the temple. 🙏",
    };

    toast({ title: "🙏 Jai Jinendra!", description: greetings[role] ?? "Welcome!" });

    if (role === "admin") navigate("/admin");
    else navigate("/");
  };

  // Committee forgot password: verify phone then reset
  const forgotFilteredMembers = committeeMembers.filter((m) => m.position === forgotPosition);

  const handleForgotVerify = async () => {
    if (!forgotMemberId) {
      toast({ title: isHi ? "त्रुटि" : "Error", description: isHi ? "सदस्य चुनें" : "Select a member", variant: "destructive" });
      return;
    }
    const input = forgotPhone.trim();
    if (!input) {
      toast({ title: isHi ? "त्रुटि" : "Error", description: isHi ? "मोबाइल नंबर या ईमेल डालें" : "Enter mobile number or email", variant: "destructive" });
      return;
    }
    setForgotLoading(true);
    const { data, error } = await supabase.functions.invoke("committee-auth", {
      body: { action: "verify-reset", memberId: forgotMemberId, phoneOrEmail: input },
    });
    setForgotLoading(false);
    if (error || !data?.token) {
      toast({ title: isHi ? "सत्यापन विफल" : "Verification Failed", description: isHi ? "मोबाइल नंबर या ईमेल मेल नहीं खाता। दर्ज किया गया डेटा दोबारा चेक करें।" : "Mobile number or email does not match. Please double-check the value you entered.", variant: "destructive" });
      return;
    }
    setForgotResetToken(data.token);
    setForgotStep("reset");
  };

  const handleForgotReset = async () => {
    if (!forgotNewPass || forgotNewPass.length < 6) {
      toast({ title: isHi ? "त्रुटि" : "Error", description: isHi ? "पासवर्ड कम से कम 6 अक्षर का होना चाहिए" : "Password must be at least 6 characters", variant: "destructive" });
      return;
    }
    if (forgotNewPass !== forgotConfirmPass) {
      toast({ title: isHi ? "त्रुटि" : "Error", description: isHi ? "पासवर्ड मेल नहीं खाते" : "Passwords don't match", variant: "destructive" });
      return;
    }
    setForgotLoading(true);
    const { data, error } = await supabase.functions.invoke("committee-auth", {
      body: { action: "reset-password", token: forgotResetToken, newPassword: forgotNewPass },
    });
    setForgotLoading(false);
    if (error || !data?.ok) {
      toast({ title: "Error", description: (data as any)?.error || (error as any)?.message || "Failed to reset password", variant: "destructive" });
      return;
    }
    toast({ title: "🙏", description: isHi ? "पासवर्ड सफलतापूर्वक बदला गया! अब नये पासवर्ड से लॉगिन करें।" : "Password reset successfully! Login with your new password." });
    setShowForgotCommittee(false);
    setForgotStep("verify");
    setForgotPosition("");
    setForgotMemberId("");
    setForgotPhone("");
    setForgotNewPass("");
    setForgotConfirmPass("");
    setForgotResetToken("");
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
          <h2 className="font-display text-2xl font-bold gold-text">{t("auth.welcomeBack")}</h2>
          <p className="text-sm text-muted-foreground mt-1">{t("auth.loginDesc")}</p>
        </div>

        {/* Role Selection */}
        <div className="mb-6">
          <label className="block text-sm font-medium mb-3 text-foreground/80">{t("auth.selectRole")}</label>
          <div className="grid grid-cols-3 gap-2">
            {roleOptions.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => { setRole(r.id); setErrors({}); }}
                className={`relative p-3 rounded-2xl border-2 text-center transition-all duration-300 group ${
                  role === r.id
                    ? "border-primary bg-primary/5 shadow-lg shadow-primary/10 scale-[1.03]"
                    : "border-border/50 hover:border-primary/30 hover:bg-muted/50"
                }`}
              >
                {role === r.id && (
                  <motion.div
                    className="absolute -top-1 -right-1 w-3 h-3 rounded-full gold-gradient shadow-md"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 500 }}
                  />
                )}
                <r.icon className={`w-5 h-5 mx-auto mb-1.5 transition-colors ${role === r.id ? "text-primary" : "text-muted-foreground group-hover:text-foreground"}`} />
                <span className={`text-[11px] font-semibold block leading-tight ${role === r.id ? "text-primary" : "text-foreground/80"}`}>
                  {isHi ? r.labelHi : r.label}
                </span>
                <span className="text-[9px] text-muted-foreground block mt-0.5 leading-tight">
                  {isHi ? r.descHi : r.desc}
                </span>
              </button>
            ))}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {role === "committee" ? (
            <>
              {/* Position Selector */}
              <div>
                <label className="block text-sm font-medium mb-1.5 text-foreground/80">
                  {isHi ? "पद चुनें" : "Select Position"}
                </label>
                <div className="relative">
                  <Users className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <select
                    value={selectedPosition}
                    onChange={(e) => { setSelectedPosition(e.target.value); setSelectedMemberId(""); if (errors.position) setErrors({ ...errors, position: "" }); }}
                    className={`w-full pl-11 pr-10 py-3.5 rounded-2xl border-2 bg-background/60 text-sm focus:outline-none transition-all duration-300 appearance-none cursor-pointer ${
                      errors.position ? "border-destructive/50 focus:border-destructive" : "border-border/50 focus:border-primary/50"
                    }`}
                  >
                    <option value="">{isHi ? "-- पद चुनें --" : "-- Select Position --"}</option>
                    {loadingPositions ? (
                      <option disabled>{isHi ? "लोड हो रहा है..." : "Loading..."}</option>
                    ) : (
                      uniquePositions.map((pos) => (
                        <option key={pos} value={pos}>{pos}</option>
                      ))
                    )}
                  </select>
                  <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                </div>
                {errors.position && <p className="text-xs text-destructive mt-1.5 ml-1">{errors.position}</p>}
              </div>

              {/* Name Selector - shown after position is selected */}
              {selectedPosition && (
                <div>
                  <label className="block text-sm font-medium mb-1.5 text-foreground/80">
                    {isHi ? "नाम चुनें" : "Select Name"}
                  </label>
                  <div className="relative">
                    <UserCheck className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <select
                      value={selectedMemberId}
                      onChange={(e) => { setSelectedMemberId(e.target.value); if (errors.member) setErrors({ ...errors, member: "" }); }}
                      className={`w-full pl-11 pr-10 py-3.5 rounded-2xl border-2 bg-background/60 text-sm focus:outline-none transition-all duration-300 appearance-none cursor-pointer ${
                        errors.member ? "border-destructive/50 focus:border-destructive" : "border-border/50 focus:border-primary/50"
                      }`}
                    >
                      <option value="">{isHi ? "-- नाम चुनें --" : "-- Select Name --"}</option>
                      {filteredMembers.map((m) => (
                        <option key={m.id} value={m.id}>{m.name}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                  </div>
                  {errors.member && <p className="text-xs text-destructive mt-1.5 ml-1">{errors.member}</p>}
                </div>
              )}

              {/* Password */}
              <div>
                <label className="block text-sm font-medium mb-1.5 text-foreground/80">
                  {isHi ? "मोबाइल नंबर / पासवर्ड" : "Mobile Number / Password"}
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type={showPass ? "text" : "password"}
                    value={committeePassword}
                    onChange={(e) => { setCommitteePassword(e.target.value); if (errors.phone) setErrors({ ...errors, phone: "" }); }}
                    className={`w-full pl-11 pr-12 py-3.5 rounded-2xl border-2 bg-background/60 text-sm focus:outline-none transition-all duration-300 ${
                      errors.phone ? "border-destructive/50 focus:border-destructive" : "border-border/50 focus:border-primary/50"
                    }`}
                    placeholder={isHi ? "अपना मोबाइल नंबर या पासवर्ड डालें" : "Enter your mobile number or password"}
                  />
                  <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                    {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {errors.phone && <p className="text-xs text-destructive mt-1.5 ml-1">{errors.phone}</p>}
              </div>
              <div className="flex justify-end pt-1">
                <button type="button" onClick={() => setShowForgotCommittee(true)} className="text-xs text-primary hover:underline font-medium">
                  {isHi ? "पासवर्ड भूल गए?" : "Forgot Password?"}
                </button>
              </div>
            </>
          ) : (
            <>
              {/* Email */}
              <div>
                <label className="block text-sm font-medium mb-1.5 text-foreground/80">{t("contact.email")}</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); if (errors.email) setErrors({ ...errors, email: "" }); }}
                    className={`w-full pl-11 pr-4 py-3.5 rounded-2xl border-2 bg-background/60 text-sm focus:outline-none transition-all duration-300 ${
                      errors.email ? "border-destructive/50 focus:border-destructive" : "border-border/50 focus:border-primary/50"
                    }`}
                    placeholder="your@email.com"
                  />
                </div>
                {errors.email && <p className="text-xs text-destructive mt-1.5 ml-1">{errors.email}</p>}
              </div>

              {/* Password */}
              <div>
                <label className="block text-sm font-medium mb-1.5 text-foreground/80">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type={showPass ? "text" : "password"}
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); if (errors.password) setErrors({ ...errors, password: "" }); }}
                    className={`w-full pl-11 pr-12 py-3.5 rounded-2xl border-2 bg-background/60 text-sm focus:outline-none transition-all duration-300 ${
                      errors.password ? "border-destructive/50 focus:border-destructive" : "border-border/50 focus:border-primary/50"
                    }`}
                    placeholder="Enter your password"
                  />
                  <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                    {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {errors.password && <p className="text-xs text-destructive mt-1.5 ml-1">{errors.password}</p>}
              </div>

              <div className="flex justify-between items-center text-sm pt-1">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input type="checkbox" className="rounded border-border accent-primary w-3.5 h-3.5" />
                  <span className="text-xs text-muted-foreground">{t("auth.rememberMe")}</span>
                </label>
                <Link to="/forgot-password" className="text-xs text-primary hover:underline font-medium">{t("auth.forgotPassword")}</Link>
              </div>
            </>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 gold-gradient text-primary-foreground font-semibold rounded-2xl glow-gold-hover flex items-center justify-center gap-2 hover:scale-[1.02] transition-all duration-300 disabled:opacity-60 disabled:hover:scale-100 mt-2"
          >
            {loading ? (
              <><Loader2 className="w-5 h-5 animate-spin" /> {isHi ? "सत्यापन..." : "Verifying..."}</>
            ) : (
              <>{t("nav.login")} <ArrowRight className="w-4 h-4" /></>
            )}
          </button>
        </form>

        {role !== "committee" && (
          <p className="text-center text-sm text-muted-foreground mt-6">
            {t("auth.noAccount")}{" "}
            <Link to="/signup" className="text-primary font-semibold hover:underline">{t("nav.signup")}</Link>
          </p>
        )}
      </motion.div>

      {/* Committee Forgot Password Modal */}
      {showForgotCommittee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setShowForgotCommittee(false)}>
          <motion.div
            className="glass-card-strong p-6 md:p-8 w-full max-w-md relative"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            onClick={(e) => e.stopPropagation()}
          >
            <button onClick={() => { setShowForgotCommittee(false); setForgotStep("verify"); }} className="absolute top-4 right-4 text-muted-foreground hover:text-foreground">
              ✕
            </button>

            <div className="text-center mb-5">
              <KeyRound className="w-10 h-10 mx-auto text-primary mb-2" />
              <h3 className="font-display text-xl font-bold gold-text">
                {isHi ? "पासवर्ड रीसेट करें" : "Reset Password"}
              </h3>
              <p className="text-xs text-muted-foreground mt-1">
                {forgotStep === "verify"
                  ? (isHi ? "अपना पद, नाम और मोबाइल नंबर या ईमेल से सत्यापित करें" : "Verify with your position, name & mobile number or email")
                  : (isHi ? "नया पासवर्ड सेट करें" : "Set your new password")}
              </p>
            </div>

            {forgotStep === "verify" ? (
              <div className="space-y-4">
                {/* Position */}
                <div>
                  <label className="block text-sm font-medium mb-1.5 text-foreground/80">{isHi ? "पद चुनें" : "Select Position"}</label>
                  <div className="relative">
                    <Users className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <select value={forgotPosition} onChange={(e) => { setForgotPosition(e.target.value); setForgotMemberId(""); }}
                      className="w-full pl-11 pr-10 py-3 rounded-2xl border-2 border-border/50 bg-background/60 text-sm focus:outline-none focus:border-primary/50 appearance-none cursor-pointer">
                      <option value="">{isHi ? "-- पद चुनें --" : "-- Select Position --"}</option>
                      {uniquePositions.map((pos) => <option key={pos} value={pos}>{pos}</option>)}
                    </select>
                    <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                  </div>
                </div>
                {/* Name */}
                {forgotPosition && (
                  <div>
                    <label className="block text-sm font-medium mb-1.5 text-foreground/80">{isHi ? "नाम चुनें" : "Select Name"}</label>
                    <div className="relative">
                      <UserCheck className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <select value={forgotMemberId} onChange={(e) => setForgotMemberId(e.target.value)}
                        className="w-full pl-11 pr-10 py-3 rounded-2xl border-2 border-border/50 bg-background/60 text-sm focus:outline-none focus:border-primary/50 appearance-none cursor-pointer">
                        <option value="">{isHi ? "-- नाम चुनें --" : "-- Select Name --"}</option>
                        {forgotFilteredMembers.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                      </select>
                      <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                    </div>
                  </div>
                )}
                {/* Phone or Email */}
                <div>
                  <label className="block text-sm font-medium mb-1.5 text-foreground/80">{isHi ? "रजिस्टर्ड मोबाइल नंबर या ईमेल" : "Registered Mobile Number or Email"}</label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input type="text" value={forgotPhone} onChange={(e) => setForgotPhone(e.target.value)}
                      className="w-full pl-11 pr-4 py-3 rounded-2xl border-2 border-border/50 bg-background/60 text-sm focus:outline-none focus:border-primary/50"
                      placeholder={isHi ? "मोबाइल नंबर या ईमेल डालें" : "Enter mobile number or email"} />
                  </div>
                </div>
                <button type="button" onClick={handleForgotVerify}
                  className="w-full py-3 gold-gradient text-primary-foreground font-semibold rounded-2xl flex items-center justify-center gap-2 hover:scale-[1.02] transition-all">
                  {isHi ? "सत्यापित करें" : "Verify"} <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1.5 text-foreground/80">{isHi ? "नया पासवर्ड" : "New Password"}</label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input type="password" value={forgotNewPass} onChange={(e) => setForgotNewPass(e.target.value)}
                      className="w-full pl-11 pr-4 py-3 rounded-2xl border-2 border-border/50 bg-background/60 text-sm focus:outline-none focus:border-primary/50"
                      placeholder={isHi ? "कम से कम 6 अक्षर" : "Min 6 characters"} />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5 text-foreground/80">{isHi ? "पासवर्ड पुष्टि करें" : "Confirm Password"}</label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input type="password" value={forgotConfirmPass} onChange={(e) => setForgotConfirmPass(e.target.value)}
                      className="w-full pl-11 pr-4 py-3 rounded-2xl border-2 border-border/50 bg-background/60 text-sm focus:outline-none focus:border-primary/50"
                      placeholder={isHi ? "पासवर्ड दोबारा डालें" : "Re-enter password"} />
                  </div>
                </div>
                <div className="flex gap-3">
                  <button type="button" onClick={() => setForgotStep("verify")}
                    className="flex-1 py-3 border-2 border-border rounded-2xl text-sm font-medium hover:bg-muted transition-colors flex items-center justify-center gap-1">
                    <ArrowLeft className="w-4 h-4" /> {isHi ? "वापस" : "Back"}
                  </button>
                  <button type="button" onClick={handleForgotReset} disabled={forgotLoading}
                    className="flex-1 py-3 gold-gradient text-primary-foreground font-semibold rounded-2xl flex items-center justify-center gap-2 hover:scale-[1.02] transition-all disabled:opacity-60">
                    {forgotLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}
                    {isHi ? "रीसेट करें" : "Reset"}
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default Login;
