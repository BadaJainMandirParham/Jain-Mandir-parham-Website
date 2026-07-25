import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { User, Users, Calendar, Bell, Loader2, ArrowLeft, MapPin, Phone, Edit, Save, Heart, Eye, Lock, Settings, Image as ImageIcon, Upload, Trash2, Video } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

const sb = supabase as any;

const CommitteeDashboard = () => {
  const { user, loading: authLoading, committeeMember, committeeToken, committeeLogout } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState("myinfo");
  const [profile, setProfile] = useState<any>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [donations, setDonations] = useState<any[]>([]);
  const [gallery, setGallery] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({ display_name: "", phone: "", email: "" });

  useEffect(() => {
    if (authLoading) return;
    
    // Allow committee member session (position+phone login)
    if (committeeMember) {
      // Load data for committee member session
      const loadCommitteeData = async () => {
        const [memsRes, evtsRes, notifsRes, galRes] = await Promise.all([
          sb.from("committee_public").select("*").order("display_order", { ascending: true }),
          sb.from("events").select("*").order("event_date", { ascending: false }).limit(10),
          sb.from("notifications").select("*").or("target_role.eq.all,target_role.eq.committee").order("created_at", { ascending: false }).limit(20),
          sb.from("gallery").select("*").order("created_at", { ascending: false }),
        ]);
        // Donations fetched via edge function (RLS-protected)
        let dons: any[] = [];
        if (committeeToken) {
          const { data: donsData } = await supabase.functions.invoke("committee-auth", {
            body: { action: "list-donations", sessionToken: committeeToken },
          });
          dons = (donsData as any)?.donations ?? [];
        }
        setProfile({ display_name: committeeMember.name, phone: committeeMember.phone, email: (committeeMember as any).email || "" });
        setEditForm({ display_name: committeeMember.name, phone: committeeMember.phone || "", email: (committeeMember as any).email || "" });
        setMembers((memsRes.data ?? []).filter((m: any) => m.id !== committeeMember.id));
        setEvents(evtsRes.data ?? []);
        setNotifications(notifsRes.data ?? []);
        setDonations(dons);
        setGallery(galRes.data ?? []);
        setLoading(false);
      };
      loadCommitteeData();
      return;
    }
    
    if (!user) { navigate("/login"); return; }

    const loadAll = async () => {
      const { data: roles } = await sb.from("user_roles").select("role").eq("user_id", user.id);
      const role = roles?.[0]?.role;
      if (role === "admin") { navigate("/admin"); return; }
      if (role !== "committee") { navigate("/devotee-dashboard"); return; }

      const [profRes, memsRes, evtsRes, notifsRes, donsRes, galRes] = await Promise.all([
        sb.from("profiles").select("*").eq("user_id", user.id).single(),
        sb.from("committee_public").select("*").order("display_order", { ascending: true }),
        sb.from("events").select("*").order("event_date", { ascending: false }).limit(10),
        sb.from("notifications").select("*").or("target_role.eq.all,target_role.eq.committee").order("created_at", { ascending: false }).limit(20),
        sb.from("donations").select("*").order("created_at", { ascending: false }),
        sb.from("gallery").select("*").order("created_at", { ascending: false }),
      ]);

      if (profRes.data) {
        setProfile(profRes.data);
        setEditForm({ display_name: profRes.data.display_name || "", phone: profRes.data.phone || "", email: profRes.data.email || "" });
      }
      setMembers(memsRes.data ?? []);
      setEvents(evtsRes.data ?? []);
      setNotifications(notifsRes.data ?? []);
      setDonations(donsRes.data ?? []);
      setGallery(galRes.data ?? []);
      setLoading(false);
    };
    loadAll();
  }, [user, authLoading, navigate, committeeMember, committeeToken]);

  // Gallery upload state
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [galleryUploading, setGalleryUploading] = useState(false);
  const [galleryType, setGalleryType] = useState<"photo" | "video">("photo");
  const [galleryTitle, setGalleryTitle] = useState("");
  const [galleryUrlInput, setGalleryUrlInput] = useState("");

  const refreshGallery = async () => {
    const { data } = await sb.from("gallery").select("*").order("created_at", { ascending: false });
    setGallery(data ?? []);
  };

  const handleGalleryFileUpload = async (file: File) => {
    setGalleryUploading(true);
    try {
      let publicUrl = "";
      if (committeeMember && committeeToken) {
        // Get signed upload URL via edge function
        const { data: signData, error: signErr } = await supabase.functions.invoke("committee-auth", {
          body: { action: "gallery-signed-upload", sessionToken: committeeToken, fileName: file.name },
        });
        if (signErr || !(signData as any)?.signedUrl) throw new Error((signData as any)?.error || "Upload URL failed");
        const s = signData as any;
        const putRes = await fetch(s.signedUrl, { method: "PUT", body: file, headers: { "Content-Type": file.type } });
        if (!putRes.ok) throw new Error(`Upload failed (${putRes.status})`);
        publicUrl = s.publicUrl;
        const { data: addData, error: addErr } = await supabase.functions.invoke("committee-auth", {
          body: { action: "gallery-add", sessionToken: committeeToken, title: galleryTitle || file.name, type: galleryType, url: publicUrl },
        });
        if (addErr || !(addData as any)?.item) throw new Error((addData as any)?.error || "Save failed");
      } else if (user) {
        const fileName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
        const { error: upErr } = await supabase.storage.from("gallery").upload(fileName, file);
        if (upErr) throw upErr;
        const { data: urlData } = supabase.storage.from("gallery").getPublicUrl(fileName);
        publicUrl = urlData.publicUrl;
        const { error: insErr } = await sb.from("gallery").insert({ title: galleryTitle || file.name, type: galleryType, url: publicUrl });
        if (insErr) throw insErr;
      }
      toast.success("Uploaded!");
      setGalleryTitle("");
      await refreshGallery();
    } catch (e: any) {
      toast.error(e.message || "Upload failed");
    } finally {
      setGalleryUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleGalleryUrlAdd = async () => {
    if (!galleryUrlInput.trim()) { toast.error("Enter a URL"); return; }
    setGalleryUploading(true);
    try {
      if (committeeMember && committeeToken) {
        const { data, error } = await supabase.functions.invoke("committee-auth", {
          body: { action: "gallery-add", sessionToken: committeeToken, title: galleryTitle || "Untitled", type: galleryType, url: galleryUrlInput.trim() },
        });
        if (error || !(data as any)?.item) throw new Error((data as any)?.error || "Save failed");
      } else if (user) {
        const { error } = await sb.from("gallery").insert({ title: galleryTitle || "Untitled", type: galleryType, url: galleryUrlInput.trim() });
        if (error) throw error;
      }
      toast.success("Added!");
      setGalleryTitle("");
      setGalleryUrlInput("");
      await refreshGallery();
    } catch (e: any) {
      toast.error(e.message || "Failed");
    } finally {
      setGalleryUploading(false);
    }
  };

  const handleGalleryDelete = async (id: string) => {
    if (!confirm("Delete this item?")) return;
    try {
      if (committeeMember && committeeToken) {
        const { data, error } = await supabase.functions.invoke("committee-auth", {
          body: { action: "gallery-delete", sessionToken: committeeToken, id },
        });
        if (error || !(data as any)?.ok) throw new Error((data as any)?.error || "Delete failed");
      } else if (user) {
        const { error } = await sb.from("gallery").delete().eq("id", id);
        if (error) throw error;
      }
      toast.success("Deleted");
      await refreshGallery();
    } catch (e: any) {
      toast.error(e.message || "Delete failed");
    }
  };

  const saveProfile = async () => {
    if (committeeMember) {
      // Update email via edge function (committee table is admin-write only)
      const { data, error } = await supabase.functions.invoke("committee-auth", {
        body: {
          action: "update-email",
          memberId: committeeMember.id,
          currentPassword: prompt("Enter your current password to confirm email change:") || "",
          email: editForm.email,
        },
      });
      if (error || !data?.ok) { toast.error((data as any)?.error || "Failed to update profile"); return; }
      toast.success("Profile updated!");
      setProfile({ ...profile, ...editForm });
      setEditing(false);
      return;
    }
    if (!user) return;
    const { error } = await sb.from("profiles").update(editForm).eq("user_id", user.id);
    if (error) { toast.error("Failed to update profile"); return; }
    toast.success("Profile updated!");
    setProfile({ ...profile, ...editForm });
    setEditing(false);
  };

  const [newPassword, setNewPassword] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);

  const handleChangePassword = async () => {
    if (!newPassword || newPassword.length < 6) { toast.error("Password must be at least 6 characters"); return; }
    if (newPassword !== confirmNewPassword) { toast.error("Passwords don't match"); return; }
    setChangingPassword(true);

    if (committeeMember) {
      if (!currentPassword) { setChangingPassword(false); toast.error("Enter your current password"); return; }
      const { data, error } = await supabase.functions.invoke("committee-auth", {
        body: { action: "change-password", memberId: committeeMember.id, currentPassword, newPassword },
      });
      setChangingPassword(false);
      if (error || !data?.ok) { toast.error((data as any)?.error || (error as any)?.message || "Failed"); return; }
      toast.success("Password changed successfully! Use this new password to login next time.");
    } else if (user) {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      setChangingPassword(false);
      if (error) { toast.error(error.message); return; }
      toast.success("Password changed successfully!");
    }
    setCurrentPassword("");
    setNewPassword("");
    setConfirmNewPassword("");
  };

  const totalDonations = donations.reduce((sum, d) => sum + Number(d.amount || 0), 0);
  const upcomingEvents = events.filter(e => e.status === "upcoming" || e.status === "ongoing").length;

  const tabs = [
    { id: "myinfo", label: t("committeeDashboard.myInfo"), icon: User },
    { id: "members", label: t("committeeDashboard.committeeMembers"), icon: Users },
    { id: "events", label: t("committeeDashboard.templeEvents"), icon: Calendar },
    { id: "donations", label: t("devoteeDashboard.donationHistory"), icon: Heart },
    { id: "gallery", label: "Gallery", icon: ImageIcon },
    { id: "notifications", label: t("committeeDashboard.notifications"), icon: Bell },
    { id: "settings", label: "Settings", icon: Settings },
  ];

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cream">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cream">
      <Header />
      <section className="pt-20 md:pt-28 pb-12 md:pb-20 px-3 md:px-8">
        <div className="container mx-auto max-w-5xl">
          {/* Header */}
          <div className="flex items-center gap-3 mb-6 md:mb-8">
            <Link to="/" className="p-2 rounded-xl hover:bg-muted transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="flex-1">
              <h2 className="font-display text-xl md:text-3xl font-bold gold-text">{t("committeeDashboard.title")}</h2>
              <p className="text-xs md:text-sm text-muted-foreground">🙏 {t("committeeDashboard.welcome")}</p>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6 md:mb-8">
            {[
              { label: "Committee Members", value: members.length, icon: Users, color: "bg-emerald-50 text-emerald-600" },
              { label: "Upcoming Events", value: upcomingEvents, icon: Calendar, color: "bg-blue-50 text-blue-600" },
              { label: "Total Donations", value: `₹${totalDonations.toLocaleString()}`, icon: Heart, color: "bg-pink-50 text-pink-600" },
              { label: "Notifications", value: notifications.length, icon: Bell, color: "bg-amber-50 text-amber-600" },
            ].map((s) => (
              <motion.div key={s.label} className="glass-card p-3 md:p-4" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-2 ${s.color}`}>
                  <s.icon className="w-4 h-4" />
                </div>
                <p className="font-display text-lg md:text-xl font-bold">{s.value}</p>
                <p className="text-[10px] md:text-xs text-muted-foreground">{s.label}</p>
              </motion.div>
            ))}
          </div>

          {/* Tabs */}
          <div className="flex gap-1.5 md:gap-2 mb-6 md:mb-8 overflow-x-auto pb-2 scrollbar-hide">
            {tabs.map((tab) => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 md:gap-2 px-3 md:px-5 py-2 md:py-2.5 text-xs md:text-sm font-medium rounded-xl whitespace-nowrap transition-all ${activeTab === tab.id ? "gold-gradient text-primary-foreground shadow-md" : "bg-background border border-border hover:bg-muted"}`}>
                <tab.icon className="w-3.5 h-3.5 md:w-4 md:h-4" />
                {tab.label}
              </button>
            ))}
          </div>

          {/* My Info */}
          {activeTab === "myinfo" && (
            <motion.div className="glass-card-strong p-5 md:p-8" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-display text-lg md:text-xl font-bold">{t("committeeDashboard.myInfo")}</h3>
                {!editing ? (
                  <button onClick={() => setEditing(true)} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-xl border border-primary/20 text-primary hover:bg-primary/5">
                    <Edit className="w-3.5 h-3.5" /> {t("devoteeDashboard.editProfile")}
                  </button>
                ) : (
                  <button onClick={saveProfile} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-xl gold-gradient text-primary-foreground">
                    <Save className="w-3.5 h-3.5" /> {t("devoteeDashboard.saveProfile")}
                  </button>
                )}
              </div>
              <div className="flex flex-col md:flex-row gap-6 md:gap-8 items-start">
                <div className="w-20 h-20 md:w-24 md:h-24 rounded-full gold-gradient flex items-center justify-center text-primary-foreground text-2xl md:text-3xl font-bold mx-auto md:mx-0">
                  {(profile?.display_name || "C")[0].toUpperCase()}
                </div>
                <div className="flex-1 w-full space-y-4">
                  {[
                    { key: "display_name", label: t("auth.fullName") },
                    { key: "email", label: t("auth.emailAddress") },
                    { key: "phone", label: t("auth.phoneNumber") },
                  ].map((f) => (
                    <div key={f.key}>
                      <label className="block text-xs md:text-sm font-medium mb-1 text-muted-foreground">{f.label}</label>
                      {editing ? (
                        <input value={editForm[f.key as keyof typeof editForm]} onChange={(e) => setEditForm({ ...editForm, [f.key]: e.target.value })}
                          className="w-full px-4 py-2.5 rounded-xl border border-border bg-background/50 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
                      ) : (
                        <p className="text-sm md:text-base font-medium">{profile?.[f.key] || "—"}</p>
                      )}
                    </div>
                  ))}
                  <div>
                    <label className="block text-xs md:text-sm font-medium mb-1 text-muted-foreground">Role</label>
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium gold-gradient text-primary-foreground">
                      <Users className="w-3 h-3" /> Committee Member
                    </span>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* Members */}
          {activeTab === "members" && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
                {members.map((m) => {
                  const initials = m.name?.split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase();
                  return (
                    <div key={m.id} className="glass-card p-4 md:p-5 flex items-center gap-3 md:gap-4 hover-lift">
                      {m.image_url ? (
                        <img src={m.image_url} alt={m.name} className="w-14 h-14 rounded-full object-cover ring-2 ring-primary/20" />
                      ) : (
                        <div className="w-14 h-14 rounded-full gold-gradient flex items-center justify-center text-primary-foreground font-bold">{initials}</div>
                      )}
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-sm truncate">{m.name}</h4>
                        <p className="text-xs text-primary font-medium">{m.position}</p>
                      </div>
                      {m.phone && (
                        <a href={`tel:${m.phone}`} className="p-2.5 rounded-xl gold-gradient text-primary-foreground hover:scale-105 transition-transform">
                          <Phone className="w-4 h-4" />
                        </a>
                      )}
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* Events */}
          {activeTab === "events" && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <div className="space-y-3">
                {events.length === 0 ? (
                  <div className="glass-card p-8 text-center text-muted-foreground">{t("events.noEvents")}</div>
                ) : events.map((e) => (
                  <div key={e.id} className="glass-card p-4 md:p-5 flex items-center gap-3 md:gap-4 hover-lift">
                    <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl gold-gradient flex items-center justify-center flex-shrink-0">
                      <Calendar className="w-5 h-5 text-primary-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-sm truncate">{e.title}</h4>
                      <div className="flex gap-3 text-xs text-muted-foreground mt-0.5">
                        {e.event_date && <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{new Date(e.event_date).toLocaleDateString()}</span>}
                        {e.location && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{e.location}</span>}
                      </div>
                    </div>
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${e.status === "completed" ? "bg-muted text-muted-foreground" : e.status === "ongoing" ? "bg-blue-100 text-blue-700" : "bg-emerald-100 text-emerald-700"}`}>{e.status}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Donations Overview */}
          {activeTab === "donations" && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <div className="glass-card p-4 md:p-6 mb-4 md:mb-6 text-center">
                <p className="text-xs md:text-sm text-muted-foreground">Total Temple Donations</p>
                <p className="font-display text-2xl md:text-4xl font-bold gold-text">₹{totalDonations.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground mt-1">{donations.length} donations received</p>
              </div>
              <div className="glass-card overflow-x-auto">
                <div className="p-4 flex items-center justify-end gap-3">
                  <button onClick={() => {
                    const rows = donations || [];
                    if (!rows.length) return;
                    const headers = ["id","donor_name","email","phone","amount","currency","purpose","method","receipt_id","receipt_number","razorpay_order_id","razorpay_payment_id","created_at"];
                    const csv = [headers.join(',')].concat(rows.map(r => headers.map(h => JSON.stringify(r[h] || r[h.replace(/_/g,' ')] || '')).join(','))).join('\n');
                    const blob = new Blob([csv], { type: 'text/csv' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url; a.download = `donations_export_${Date.now()}.csv`; a.click(); URL.revokeObjectURL(url);
                  }} className="py-2 px-3 rounded-xl bg-emerald-600 text-white text-sm">Export CSV</button>
                </div>
                <table className="w-full text-xs md:text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/30">
                      <th className="p-3 text-left font-medium">Donor</th>
                      <th className="p-3 text-left font-medium">Email</th>
                      <th className="p-3 text-left font-medium">Phone</th>
                      <th className="p-3 text-left font-medium">Amount</th>
                      <th className="p-3 text-left font-medium">Purpose</th>
                      <th className="p-3 text-left font-medium">Method</th>
                      <th className="p-3 text-left font-medium">Receipt</th>
                      <th className="p-3 text-left font-medium">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {donations.map(d => (
                      <tr key={d.id} className="border-b border-border/50 hover:bg-muted/30">
                        <td className="p-3 font-medium whitespace-nowrap">{d.name || "—"}</td>
                        <td className="p-3 text-muted-foreground whitespace-nowrap">{d.email || "—"}</td>
                        <td className="p-3 text-muted-foreground whitespace-nowrap">{d.phone || "—"}</td>
                        <td className="p-3 font-bold text-primary whitespace-nowrap">₹{Number(d.amount).toLocaleString()}</td>
                        <td className="p-3 text-muted-foreground">{d.purpose || "—"}</td>
                        <td className="p-3 text-muted-foreground whitespace-nowrap">{d.method || "—"}</td>
                        <td className="p-3 text-muted-foreground whitespace-nowrap">{d.receipt_id || d.receipt_number || "—"}</td>
                        <td className="p-3 text-muted-foreground whitespace-nowrap">{d.razorpay_order_id || "—"}</td>
                        <td className="p-3 text-muted-foreground whitespace-nowrap">{d.razorpay_payment_id || "—"}</td>
                        <td className="p-3 text-muted-foreground whitespace-nowrap">{new Date(d.created_at).toLocaleDateString()}</td>
                        <td className="p-3 text-muted-foreground whitespace-nowrap"><button onClick={() => window.open(`${backendBaseUrl}/api/donations/receipt/${d.id}`, '_blank')} className="text-sm text-amber-700 underline">Download</button></td>
                      </tr>
                    ))}
                    {donations.length === 0 && <tr><td colSpan={10} className="p-8 text-center text-muted-foreground">No donations yet</td></tr>}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}

          {/* Gallery Upload */}
          {activeTab === "gallery" && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <div className="glass-card-strong p-4 md:p-6 mb-4 md:mb-6">
                <h3 className="font-display text-base md:text-lg font-bold mb-4 flex items-center gap-2">
                  <Upload className="w-5 h-5 text-primary" /> Add Photo / Video
                </h3>
                <div className="grid gap-3">
                  <div className="flex gap-2">
                    {(["photo", "video"] as const).map(t => (
                      <button key={t} onClick={() => setGalleryType(t)}
                        className={`px-4 py-2 rounded-xl text-xs md:text-sm font-medium border transition ${galleryType === t ? "gold-gradient text-primary-foreground border-transparent" : "bg-background border-border hover:bg-muted"}`}>
                        {t === "photo" ? "📷 Photo" : "🎬 Video"}
                      </button>
                    ))}
                  </div>
                  <input
                    type="text"
                    value={galleryTitle}
                    onChange={(e) => setGalleryTitle(e.target.value)}
                    placeholder="Title (optional)"
                    className="w-full px-4 py-2.5 rounded-xl border border-border bg-background/50 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                  {galleryType === "photo" ? (
                    <div>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) handleGalleryFileUpload(f);
                        }}
                        className="block w-full text-xs md:text-sm file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:bg-primary file:text-primary-foreground file:cursor-pointer"
                      />
                      <p className="text-[10px] md:text-xs text-muted-foreground mt-2">Upload from device (max ~10MB)</p>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={galleryUrlInput}
                        onChange={(e) => setGalleryUrlInput(e.target.value)}
                        placeholder="YouTube/Video URL"
                        className="flex-1 px-4 py-2.5 rounded-xl border border-border bg-background/50 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                      />
                      <button
                        onClick={handleGalleryUrlAdd}
                        disabled={galleryUploading}
                        className="px-4 py-2.5 gold-gradient text-primary-foreground text-sm font-semibold rounded-xl disabled:opacity-50"
                      >
                        {galleryUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Add"}
                      </button>
                    </div>
                  )}
                  {galleryUploading && galleryType === "photo" && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground"><Loader2 className="w-4 h-4 animate-spin" /> Uploading...</div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
                {gallery.map((g) => (
                  <div key={g.id} className="glass-card overflow-hidden group relative">
                    <div className="aspect-square bg-muted">
                      {g.type === "photo" ? (
                        <img src={g.url} alt={g.title} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-muted">
                          <Video className="w-8 h-8 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => handleGalleryDelete(g.id)}
                      className="absolute top-2 right-2 p-2 rounded-full bg-destructive/80 text-destructive-foreground opacity-0 group-hover:opacity-100 transition"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    <div className="p-2"><p className="text-[10px] md:text-xs truncate">{g.title}</p></div>
                  </div>
                ))}
                {gallery.length === 0 && (
                  <p className="col-span-full text-center text-muted-foreground py-8 text-sm">No gallery items yet</p>
                )}
              </div>
            </motion.div>
          )}

          {/* Notifications */}
          {activeTab === "notifications" && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <div className="space-y-3">
                {notifications.length === 0 ? (
                  <div className="glass-card p-8 text-center text-muted-foreground">{t("devoteeDashboard.noNotifications")}</div>
                ) : notifications.map((n) => (
                  <div key={n.id} className="glass-card p-4 md:p-5 hover-lift">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <Bell className="w-4 h-4 text-primary" />
                      </div>
                      <div>
                        <h4 className="font-medium text-sm">{n.title}</h4>
                        <p className="text-xs text-muted-foreground mt-1">{n.message}</p>
                        <p className="text-[10px] text-muted-foreground mt-1.5">{new Date(n.created_at).toLocaleString()}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Settings */}
          {activeTab === "settings" && (user || committeeMember) && (
            <motion.div className="glass-card-strong p-5 md:p-8 max-w-lg" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <h3 className="font-display text-lg md:text-xl font-bold mb-6 flex items-center gap-2">
                <Lock className="w-5 h-5 text-primary" /> Change Password
              </h3>
              <div className="space-y-4">
                {committeeMember && (
                  <div>
                    <label className="block text-xs md:text-sm font-medium mb-1 text-muted-foreground">Current Password</label>
                    <input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-border bg-background/50 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                      placeholder="Enter current password" />
                  </div>
                )}
                <div>
                  <label className="block text-xs md:text-sm font-medium mb-1 text-muted-foreground">New Password</label>
                  <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-border bg-background/50 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                    placeholder="Min 6 characters" />
                </div>
                <div>
                  <label className="block text-xs md:text-sm font-medium mb-1 text-muted-foreground">Confirm New Password</label>
                  <input type="password" value={confirmNewPassword} onChange={(e) => setConfirmNewPassword(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-border bg-background/50 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                    placeholder="Re-enter new password" />
                </div>
                <button onClick={handleChangePassword} disabled={changingPassword}
                  className="px-5 py-2.5 gold-gradient text-primary-foreground font-semibold rounded-xl flex items-center gap-2 hover:scale-[1.02] transition-transform disabled:opacity-50 text-sm">
                  {changingPassword ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />} Change Password
                </button>
              </div>
            </motion.div>
          )}
        </div>
      </section>
      <Footer />
    </div>
  );
};

export default CommitteeDashboard;
