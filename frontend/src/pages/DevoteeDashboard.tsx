import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { User, Heart, Bookmark, Bell, Edit, Save, Loader2, ArrowLeft, Calendar, MapPin, Trash2, Gift, TrendingUp, Clock, Lock, Settings } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

const sb = supabase as any;

const DevoteeDashboard = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState("profile");
  const [profile, setProfile] = useState<any>(null);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({ display_name: "", phone: "", email: "" });
  const [donations, setDonations] = useState<any[]>([]);
  const [bookmarks, setBookmarks] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { navigate("/login"); return; }

    const loadAll = async () => {
      const { data: roles } = await sb.from("user_roles").select("role").eq("user_id", user.id);
      const role = roles?.[0]?.role;
      if (role === "admin") { navigate("/admin"); return; }
      if (role === "committee") { navigate("/committee-dashboard"); return; }

      const [profRes, donsRes, bmarksRes, notifsRes, eventsRes] = await Promise.all([
        sb.from("profiles").select("*").eq("user_id", user.id).single(),
        sb.from("donations").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
        sb.from("event_bookmarks").select("*, events(*)").eq("user_id", user.id).order("created_at", { ascending: false }),
        sb.from("notifications").select("*").or("target_role.eq.all,target_role.eq.visitor").order("created_at", { ascending: false }).limit(20),
        sb.from("events").select("*").eq("status", "upcoming").order("event_date", { ascending: true }).limit(5),
      ]);

      if (profRes.data) {
        setProfile(profRes.data);
        setEditForm({ display_name: profRes.data.display_name || "", phone: profRes.data.phone || "", email: profRes.data.email || "" });
      }
      setDonations(donsRes.data ?? []);
      setBookmarks(bmarksRes.data ?? []);
      setNotifications(notifsRes.data ?? []);
      setUpcomingEvents(eventsRes.data ?? []);
      setLoading(false);
    };
    loadAll();
  }, [user, authLoading, navigate]);

  const saveProfile = async () => {
    if (!user) return;
    const { error } = await sb.from("profiles").update(editForm).eq("user_id", user.id);
    if (error) { toast.error("Failed to update profile"); return; }
    toast.success("Profile updated!");
    setProfile({ ...profile, ...editForm });
    setEditing(false);
  };

  const removeBookmark = async (id: string) => {
    await sb.from("event_bookmarks").delete().eq("id", id);
    setBookmarks(bookmarks.filter(b => b.id !== id));
    toast.success("Bookmark removed");
  };

  const totalDonated = donations.reduce((sum, d) => sum + Number(d.amount || 0), 0);
  const lastDonation = donations[0];

  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);

  const handleChangePassword = async () => {
    if (!newPassword || newPassword.length < 6) { toast.error("Password must be at least 6 characters"); return; }
    if (newPassword !== confirmNewPassword) { toast.error("Passwords don't match"); return; }
    setChangingPassword(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setChangingPassword(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Password changed successfully!");
    setNewPassword("");
    setConfirmNewPassword("");
  };

  const tabs = [
    { id: "profile", label: t("devoteeDashboard.profile"), icon: User },
    { id: "donations", label: t("devoteeDashboard.donationHistory"), icon: Heart },
    { id: "bookmarks", label: t("devoteeDashboard.bookmarkedEvents"), icon: Bookmark },
    { id: "notifications", label: t("devoteeDashboard.notifications"), icon: Bell },
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
          {/* Header with greeting */}
          <div className="flex items-center gap-3 mb-6 md:mb-8">
            <Link to="/" className="p-2 rounded-xl hover:bg-muted transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="flex-1">
              <h2 className="font-display text-xl md:text-3xl font-bold gold-text">{t("devoteeDashboard.title")}</h2>
              <p className="text-xs md:text-sm text-muted-foreground">🙏 {profile?.display_name ? `Jai Jinendra, ${profile.display_name}!` : t("devoteeDashboard.welcome")}</p>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6 md:mb-8">
            <motion.div className="glass-card p-3 md:p-4" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <div className="w-8 h-8 rounded-lg bg-pink-50 flex items-center justify-center mb-2">
                <Heart className="w-4 h-4 text-pink-600" />
              </div>
              <p className="font-display text-lg md:text-xl font-bold gold-text">₹{totalDonated.toLocaleString()}</p>
              <p className="text-[10px] md:text-xs text-muted-foreground">{t("devoteeDashboard.totalDonated")}</p>
            </motion.div>
            <motion.div className="glass-card p-3 md:p-4" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
              <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center mb-2">
                <Gift className="w-4 h-4 text-blue-600" />
              </div>
              <p className="font-display text-lg md:text-xl font-bold">{donations.length}</p>
              <p className="text-[10px] md:text-xs text-muted-foreground">Donations Made</p>
            </motion.div>
            <motion.div className="glass-card p-3 md:p-4" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center mb-2">
                <Bookmark className="w-4 h-4 text-emerald-600" />
              </div>
              <p className="font-display text-lg md:text-xl font-bold">{bookmarks.length}</p>
              <p className="text-[10px] md:text-xs text-muted-foreground">Saved Events</p>
            </motion.div>
            <motion.div className="glass-card p-3 md:p-4" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
              <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center mb-2">
                <Calendar className="w-4 h-4 text-amber-600" />
              </div>
              <p className="font-display text-lg md:text-xl font-bold">{upcomingEvents.length}</p>
              <p className="text-[10px] md:text-xs text-muted-foreground">Upcoming Events</p>
            </motion.div>
          </div>

          {/* Upcoming Events Quick View */}
          {upcomingEvents.length > 0 && activeTab === "profile" && (
            <motion.div className="glass-card p-4 md:p-5 mb-6" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <h3 className="font-display text-sm font-bold mb-3 flex items-center gap-2"><Calendar className="w-4 h-4 text-primary" /> Upcoming Events</h3>
              <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-hide">
                {upcomingEvents.map(e => (
                  <div key={e.id} className="min-w-[200px] p-3 rounded-xl border border-border bg-background/50 flex-shrink-0">
                    <h4 className="text-xs font-medium truncate">{e.title}</h4>
                    <div className="flex items-center gap-1 text-[10px] text-muted-foreground mt-1">
                      <Clock className="w-3 h-3" />
                      {e.event_date ? new Date(e.event_date).toLocaleDateString() : "TBA"}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

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

          {/* Profile Tab */}
          {activeTab === "profile" && (
            <motion.div className="glass-card-strong p-5 md:p-8" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-display text-lg md:text-xl font-bold">{t("devoteeDashboard.profile")}</h3>
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
                  {(profile?.display_name || "U")[0].toUpperCase()}
                </div>
                <div className="flex-1 w-full space-y-4">
                  {[
                    { key: "display_name", label: t("auth.fullName") },
                    { key: "phone", label: t("auth.phoneNumber") },
                    { key: "email", label: t("auth.emailAddress") },
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
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary">
                      <User className="w-3 h-3" /> Devotee
                    </span>
                  </div>
                </div>
              </div>

              {/* Quick donation summary on profile */}
              {lastDonation && (
                <div className="mt-6 p-4 rounded-xl border border-border bg-background/30">
                  <h4 className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1.5"><TrendingUp className="w-3.5 h-3.5" /> Last Donation</h4>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">{lastDonation.purpose}</p>
                      <p className="text-[10px] text-muted-foreground">{new Date(lastDonation.created_at).toLocaleDateString()} • {lastDonation.method}</p>
                    </div>
                    <p className="font-display text-lg font-bold text-primary">₹{Number(lastDonation.amount).toLocaleString()}</p>
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* Donations Tab */}
          {activeTab === "donations" && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              {donations.length > 0 && (
                <div className="glass-card p-4 md:p-6 mb-4 md:mb-6 text-center">
                  <p className="text-xs md:text-sm text-muted-foreground">{t("devoteeDashboard.totalDonated")}</p>
                  <p className="font-display text-2xl md:text-4xl font-bold gold-text">₹{totalDonated.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground mt-1">{donations.length} donations</p>
                  <Link to="/donations" className="inline-flex items-center gap-1.5 mt-3 px-4 py-2 text-xs font-medium rounded-xl gold-gradient text-primary-foreground hover:scale-[1.02] transition-transform">
                    <Heart className="w-3.5 h-3.5" /> Donate More
                  </Link>
                </div>
              )}
              <div className="space-y-3">
                {donations.length === 0 ? (
                  <div className="glass-card p-8 text-center">
                    <Heart className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                    <p className="text-muted-foreground text-sm">{t("devoteeDashboard.noDonations")}</p>
                    <Link to="/donations" className="inline-flex items-center gap-1.5 mt-4 px-5 py-2.5 text-sm font-medium rounded-xl gold-gradient text-primary-foreground">
                      Make Your First Donation
                    </Link>
                  </div>
                ) : (
                  donations.map((d) => (
                    <div key={d.id} className="glass-card p-4 md:p-5 flex flex-col md:flex-row md:items-center justify-between gap-2 hover-lift">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-pink-50 flex items-center justify-center flex-shrink-0">
                          <Heart className="w-4 h-4 text-pink-600" />
                        </div>
                        <div>
                          <h4 className="font-medium text-sm">{d.purpose}</h4>
                          <p className="text-xs text-muted-foreground">{new Date(d.created_at).toLocaleDateString()} • {d.method}</p>
                        </div>
                      </div>
                      <p className="font-display text-lg font-bold text-primary">₹{Number(d.amount).toLocaleString()}</p>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          )}

          {/* Bookmarks Tab */}
          {activeTab === "bookmarks" && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <div className="space-y-3">
                {bookmarks.length === 0 ? (
                  <div className="glass-card p-8 text-center">
                    <Bookmark className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                    <p className="text-muted-foreground text-sm">{t("devoteeDashboard.noBookmarks")}</p>
                  </div>
                ) : (
                  bookmarks.map((b) => {
                    const ev = b.events;
                    return (
                      <div key={b.id} className="glass-card p-4 md:p-5 flex items-center gap-3 md:gap-4 hover-lift">
                        <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl gold-gradient flex items-center justify-center flex-shrink-0">
                          <Calendar className="w-5 h-5 text-primary-foreground" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-sm truncate">{ev?.title ?? "Event"}</h4>
                          <div className="flex gap-3 text-xs text-muted-foreground mt-0.5">
                            {ev?.event_date && <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{new Date(ev.event_date).toLocaleDateString()}</span>}
                            {ev?.location && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{ev.location}</span>}
                          </div>
                        </div>
                        <button onClick={() => removeBookmark(b.id)} className="p-2 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </motion.div>
          )}

          {/* Notifications Tab */}
          {activeTab === "notifications" && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <div className="space-y-3">
                {notifications.length === 0 ? (
                  <div className="glass-card p-8 text-center">
                    <Bell className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                    <p className="text-muted-foreground text-sm">{t("devoteeDashboard.noNotifications")}</p>
                  </div>
                ) : (
                  notifications.map((n) => (
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
                  ))
                )}
              </div>
            </motion.div>
          )}

          {/* Settings Tab */}
          {activeTab === "settings" && (
            <motion.div className="glass-card-strong p-5 md:p-8 max-w-lg" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <h3 className="font-display text-lg md:text-xl font-bold mb-6 flex items-center gap-2">
                <Lock className="w-5 h-5 text-primary" /> Change Password
              </h3>
              <div className="space-y-4">
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

export default DevoteeDashboard;
