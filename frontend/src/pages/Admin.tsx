import { useState, useEffect, useCallback, useRef } from "react";
import { motion } from "framer-motion";
import {
  LayoutDashboard, Calendar, Image, FolderOpen, Users, Mail, Bell,
  Plus, Trash2, Edit, Send, Upload, Video, ImageIcon, MessageSquare,
  X, Check, Loader2, Menu, LogOut, Shield, Heart, Radio, Eye, EyeOff,
  Megaphone, MapPin, Construction,
} from "lucide-react";
import Cropper from "react-easy-crop";
import templeLogo from "@/assets/temple-logo.png";
import { Link, useNavigate } from "react-router-dom";
import { supabase, backendBaseUrl } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { buildWelcomeEmailPreview } from "@/lib/welcomeEmailPreview";
import { resolveContentTableName } from "@/lib/contentTables";

const sb = supabase as any;

// ─── Helpers ────────────────────────────────────────────
const getCroppedImg = async (imageSrc: string, pixelCrop: any): Promise<Blob> => {
  const image = document.createElement("img") as HTMLImageElement;
  image.src = imageSrc;
  await new Promise((resolve) => { image.onload = resolve; });
  const canvas = document.createElement("canvas");
  canvas.width = pixelCrop.width;
  canvas.height = pixelCrop.height;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(image, pixelCrop.x, pixelCrop.y, pixelCrop.width, pixelCrop.height, 0, 0, pixelCrop.width, pixelCrop.height);
  return new Promise((resolve) => canvas.toBlob((blob) => resolve(blob!), "image/jpeg", 0.9));
};

const useAdminCheck = () => {
  const { user, loading: authLoading } = useAuth();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (authLoading) return;
    if (!user) { navigate("/login"); return; }
    const check = async () => {
      const { data } = await sb.from("user_roles").select("role").eq("user_id", user.id);
      const hasAdmin = data?.some((r: any) => r.role === "admin");
      if (!hasAdmin) { toast.error("Access denied. Admin role required."); navigate("/"); }
      else setIsAdmin(true);
    };
    check();
  }, [user, authLoading, navigate]);

  return { isAdmin, user, authLoading };
};

const useTable = (table: string) => {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const resolvedTable = resolveContentTableName(table);

  const fetchRows = async () => {
    setLoading(true);
    const { data, error } = await sb.from(resolvedTable).select("*").order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    else setRows(data ?? []);
    setLoading(false);
  };

  useEffect(() => { fetchRows(); }, [table]);

  const remove = async (id: string) => {
    const { error } = await sb.from(resolvedTable).delete().eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Deleted"); fetchRows(); }
  };

  const upsert = async (row: any) => {
    const payload = { ...row };
    if (table === "committee") {
      payload.id = payload.id || row.id;
      payload.created_at = payload.created_at || new Date().toISOString();
      payload.email = String(payload.email || "").trim();
      payload.phone = String(payload.phone || "").trim();
      if (!payload.password && payload.phone) payload.password = payload.phone;
      if (!payload.password_hash && payload.phone) payload.password_hash = payload.phone;
    }
    const { error } = await sb.from(resolvedTable).upsert(payload);
    if (error) toast.error(error.message);
    else { toast.success(row.id ? "Updated" : "Created"); fetchRows(); }
  };

  const update = async (id: string, patch: any) => {
    const { error } = await sb.from(resolvedTable).update(patch).eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Updated"); fetchRows(); }
  };

  return { rows, loading, remove, upsert, update, refetch: fetchRows };
};

const sidebarItems = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "events", label: "Events", icon: Calendar },
  { id: "gallery", label: "Gallery", icon: Image },
  { id: "banners", label: "Banners", icon: ImageIcon },
  { id: "projects", label: "Projects", icon: FolderOpen },
  { id: "recent-work", label: "Recent Work", icon: Construction },
  { id: "announcements", label: "Announcements", icon: Megaphone },
  { id: "committee", label: "Committee", icon: Users },
  { id: "donations", label: "Donations", icon: Heart },
  { id: "live-darshan", label: "Live Darshan", icon: Radio },
  { id: "messages", label: "Messages", icon: Mail },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "promotions", label: "Promotions", icon: Megaphone },
  { id: "all-users", label: "All Users", icon: Users },
  { id: "welcome-emails", label: "Welcome Emails", icon: Send },
];

// ─── Welcome Emails Panel ──────────────────────────────
const WelcomeEmailsPanel = () => {
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [previewName, setPreviewName] = useState("Devotee");

  const handleSend = async () => {
    if (!confirm("Sabhi registered users aur committee members ko welcome email bhejein? Yeh process kuch minute le sakta hai.")) return;
    setSending(true);
    setResult(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const { data, error } = await sb.functions.invoke("send-bulk-welcome-email", {
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });
      if (error) throw error;
      setResult(data);
      if (data?.success) toast.success(`Sent ${data.sent} / ${data.total} emails`);
      else toast.error(data?.error || "Failed");
    } catch (e: any) {
      toast.error(e.message || "Failed to send");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="max-w-3xl">
      <h2 className="font-display text-2xl md:text-3xl font-bold gold-text mb-2">Welcome Emails Bhejein</h2>
      <p className="text-sm text-muted-foreground mb-6">
        Sabhi registered users (profiles) aur committee members ko ek professional welcome email bhejein jismein mandir app (Indus App Store) ka download link aur install ke baad ke steps honge. Bina email wale users skip ho jayenge.
      </p>

      <div className="glass-card p-6 rounded-2xl border border-primary/20 space-y-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full gold-gradient flex items-center justify-center flex-shrink-0">
            <Mail className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h3 className="font-semibold text-base">Email me kya hoga?</h3>
            <ul className="text-sm text-muted-foreground mt-2 space-y-1 list-disc list-inside">
              <li>Naam ke saath greeting (Jai Jinendra)</li>
              <li>Indus App Store par app download ka CTA button</li>
              <li>App install ke baad account create + notification allow karne ke steps</li>
              <li>Website aur app ka direct link</li>
            </ul>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-3">
          <button
            onClick={() => setShowPreview(true)}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold border-2 border-primary/40 text-primary hover:bg-primary/5 transition"
          >
            <Eye className="w-4 h-4" /> Preview Email
          </button>
          <button
            onClick={handleSend}
            disabled={sending}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 gold-gradient text-primary-foreground rounded-xl font-semibold glow-gold-hover disabled:opacity-50"
          >
            {sending ? <><Loader2 className="w-4 h-4 animate-spin" /> Bhej rahe hain...</> : <><Send className="w-4 h-4" /> Sabhi ko Bhejein</>}
          </button>
        </div>


        {result && (
          <div className="mt-4 p-4 rounded-xl bg-muted/50 text-sm">
            <p><strong>Total recipients:</strong> {result.total}</p>
            <p className="text-green-600"><strong>Sent:</strong> {result.sent}</p>
            {result.failed > 0 && <p className="text-destructive"><strong>Failed:</strong> {result.failed}</p>}
            {result.errors?.length > 0 && (
              <details className="mt-2">
                <summary className="cursor-pointer text-xs text-muted-foreground">View errors</summary>
                <ul className="mt-2 text-xs space-y-1">
                  {result.errors.map((e: string, i: number) => <li key={i} className="font-mono">{e}</li>)}
                </ul>
              </details>
            )}
          </div>
        )}
      </div>

      {showPreview && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowPreview(false)}>
          <div className="bg-background rounded-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden border border-primary/30 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-border bg-muted/40">
              <div className="flex items-center gap-2 min-w-0">
                <Mail className="w-4 h-4 text-primary flex-shrink-0" />
                <h3 className="font-semibold truncate">Email Preview</h3>
              </div>
              <div className="flex items-center gap-2">
                <label className="text-xs text-muted-foreground hidden sm:block">Name:</label>
                <input
                  value={previewName}
                  onChange={(e) => setPreviewName(e.target.value || "Devotee")}
                  className="px-3 py-1.5 rounded-lg border border-border bg-background text-sm w-32 sm:w-40"
                  placeholder="Devotee"
                />
                <button onClick={() => setShowPreview(false)} className="p-2 rounded-lg hover:bg-muted transition">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
            <iframe
              title="Email preview"
              srcDoc={buildWelcomeEmailPreview(previewName)}
              className="w-full flex-1 bg-white"
              style={{ minHeight: "60vh" }}
            />
          </div>
        </div>
      )}
    </div>
  );
};


// ─── Reusable Image Upload + Crop Component ─────────────
const ImageUploadCrop = ({ value, onChange, aspect = 4 / 3, bucket = "gallery" }: {
  value: string; onChange: (url: string) => void; aspect?: number; bucket?: string;
}) => {
  const [useUrl, setUseUrl] = useState(false);
  const [urlInput, setUrlInput] = useState(value || "");
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState(value || "");
  const [showCrop, setShowCrop] = useState(false);
  const [cropImage, setCropImage] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => { setCropImage(reader.result as string); setShowCrop(true); };
    reader.readAsDataURL(file);
  };

  const handleCropDone = async () => {
    if (!cropImage || !croppedAreaPixels) return;
    setUploading(true);
    try {
      const blob = await getCroppedImg(cropImage, croppedAreaPixels);
      const file = new File([blob], `upload-${Date.now()}.jpg`, { type: "image/jpeg" });
      const fileName = `${Date.now()}-${file.name}`;
      const { error } = await supabase.storage.from(bucket).upload(fileName, file);
      if (error) throw error;
      const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(fileName);
      onChange(urlData.publicUrl);
      setPreview(urlData.publicUrl);
    } catch (err: any) { toast.error(err.message); }
    setUploading(false);
    setShowCrop(false);
    setCropImage(null);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <button type="button" onClick={() => setUseUrl(false)} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${!useUrl ? "gold-gradient text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
          <Upload className="w-3 h-3 inline mr-1" /> Upload
        </button>
        <button type="button" onClick={() => setUseUrl(true)} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${useUrl ? "gold-gradient text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
          🔗 URL
        </button>
      </div>

      {useUrl ? (
        <div>
          <input value={urlInput} onChange={e => { setUrlInput(e.target.value); onChange(e.target.value); }} className="w-full px-4 py-2.5 rounded-xl border border-border bg-background/50 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" placeholder="https://..." />
        </div>
      ) : (
        <div>
          <input type="file" accept="image/*" onChange={handleFileSelect} className="w-full text-sm file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20 cursor-pointer" />
        </div>
      )}

      {(preview || value) && !showCrop && (
        <div className="relative mt-2">
          <img src={preview || value} alt="Preview" className="w-full h-40 object-cover rounded-xl border border-border" />
          <button type="button" onClick={() => { setPreview(""); onChange(""); }} className="absolute top-2 right-2 p-1 rounded-full bg-destructive/80 text-destructive-foreground"><X className="w-3 h-3" /></button>
        </div>
      )}

      {uploading && <div className="flex items-center gap-2 text-xs text-muted-foreground"><Loader2 className="w-4 h-4 animate-spin" /> Uploading...</div>}

      {showCrop && cropImage && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-foreground/60 backdrop-blur-sm p-4">
          <div className="bg-card border border-border rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
            <div className="p-4 border-b border-border flex items-center justify-between">
              <h3 className="font-display text-sm font-bold">Crop Image</h3>
              <button onClick={() => { setShowCrop(false); setCropImage(null); }} className="p-1 rounded-lg hover:bg-muted"><X className="w-4 h-4" /></button>
            </div>
            <div className="relative w-full h-80 bg-foreground/10">
              <Cropper image={cropImage} crop={crop} zoom={zoom} aspect={aspect} onCropChange={setCrop} onZoomChange={setZoom} onCropComplete={(_, c) => setCroppedAreaPixels(c)} />
            </div>
            <div className="p-4 space-y-3">
              <div className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground">Zoom</span>
                <input type="range" min={1} max={3} step={0.1} value={zoom} onChange={e => setZoom(Number(e.target.value))} className="flex-1 accent-primary" />
              </div>
              <div className="flex justify-end gap-3">
                <button onClick={() => { setShowCrop(false); setCropImage(null); }} className="px-4 py-2 text-sm rounded-xl border border-border hover:bg-muted">Cancel</button>
                <button onClick={handleCropDone} disabled={uploading} className="px-4 py-2 gold-gradient text-primary-foreground text-sm font-semibold rounded-xl flex items-center gap-2 disabled:opacity-50">
                  {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Crop & Upload
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Generic Form Modal ─────────────────────────────────
const FormModal = ({ title, fields, initial, onSave, onClose }: {
  title: string; fields: { key: string; label: string; type?: string; optional?: boolean }[]; initial?: any; onSave: (data: any) => void; onClose: () => void;
}) => {
  const [form, setForm] = useState<any>(initial ?? {});
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 backdrop-blur-sm p-4" onClick={onClose}>
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-card border border-border rounded-2xl p-5 md:p-6 w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4 md:mb-5">
          <h3 className="font-display text-base md:text-lg font-bold">{title}</h3>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-muted"><X className="w-4 h-4" /></button>
        </div>
        <div className="space-y-3 md:space-y-4">
          {fields.map(f => (
            <div key={f.key}>
              <label className="block text-xs md:text-sm font-medium mb-1">{f.label} {f.optional && <span className="text-muted-foreground">(optional)</span>}</label>
              {f.type === "textarea" ? (
                <textarea rows={3} value={form[f.key] ?? ""} onChange={e => setForm({ ...form, [f.key]: e.target.value })} className="w-full px-4 py-2.5 rounded-xl border border-border bg-background/50 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none" />
              ) : f.type === "select-status" ? (
                <select value={form[f.key] ?? ""} onChange={e => setForm({ ...form, [f.key]: e.target.value })} className="w-full px-4 py-2.5 rounded-xl border border-border bg-background/50 text-sm">
                  <option value="upcoming">Upcoming</option><option value="ongoing">Ongoing</option><option value="completed">Completed</option>
                </select>
              ) : f.type === "select-project-status" ? (
                <select value={form[f.key] ?? ""} onChange={e => setForm({ ...form, [f.key]: e.target.value })} className="w-full px-4 py-2.5 rounded-xl border border-border bg-background/50 text-sm">
                  <option value="under_construction">Under Construction</option><option value="completed">Completed</option><option value="future">Future</option>
                </select>
              ) : f.type === "select-media" ? (
                <select value={form[f.key] ?? "photo"} onChange={e => setForm({ ...form, [f.key]: e.target.value })} className="w-full px-4 py-2.5 rounded-xl border border-border bg-background/50 text-sm">
                  <option value="photo">Photo</option><option value="video">Video</option>
                </select>
              ) : f.type === "image-upload" ? (
                <ImageUploadCrop value={form[f.key] ?? ""} onChange={v => setForm({ ...form, [f.key]: v })} />
              ) : (
                <input type={f.type ?? "text"} value={form[f.key] ?? ""} onChange={e => setForm({ ...form, [f.key]: e.target.value })} className="w-full px-4 py-2.5 rounded-xl border border-border bg-background/50 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
              )}
            </div>
          ))}
        </div>
        <div className="flex justify-end gap-3 mt-5 md:mt-6">
          <button onClick={onClose} className="px-4 py-2 text-sm rounded-xl border border-border hover:bg-muted">Cancel</button>
          <button onClick={() => { onSave(form); onClose(); }} className="px-4 py-2 gold-gradient text-primary-foreground text-sm font-semibold rounded-xl flex items-center gap-2">
            <Check className="w-4 h-4" /> Save
          </button>
        </div>
      </motion.div>
    </div>
  );
};

// ─── Dashboard Panel ────────────────────────────────────
const DashboardPanel = () => {
  const [counts, setCounts] = useState({ events: 0, gallery: 0, projects: 0, committee: 0, messages: 0, notifications: 0, donations: 0 });
  useEffect(() => {
    const load = async () => {
      const tables = ["events", "gallery", "projects", "committee", "contact_messages", "notifications", "donations"];
      const results = await Promise.all(tables.map(t => sb.from(t).select("id", { count: "exact", head: true })));
      setCounts({ events: results[0].count ?? 0, gallery: results[1].count ?? 0, projects: results[2].count ?? 0, committee: results[3].count ?? 0, messages: results[4].count ?? 0, notifications: results[5].count ?? 0, donations: results[6].count ?? 0 });
    };
    load();
  }, []);
  const stats = [
    { label: "Events", value: counts.events, icon: Calendar, color: "bg-emerald-50 text-emerald-600" },
    { label: "Gallery", value: counts.gallery, icon: ImageIcon, color: "bg-purple-50 text-purple-600" },
    { label: "Projects", value: counts.projects, icon: FolderOpen, color: "bg-blue-50 text-blue-600" },
    { label: "Committee", value: counts.committee, icon: Users, color: "bg-teal-50 text-teal-600" },
    { label: "Donations", value: counts.donations, icon: Heart, color: "bg-pink-50 text-pink-600" },
    { label: "Messages", value: counts.messages, icon: MessageSquare, color: "bg-amber-50 text-amber-600" },
  ];
  return (
    <div>
      <h2 className="font-display text-xl md:text-2xl font-bold mb-4 md:mb-6">🙏 Jai Jinendra! Dashboard</h2>
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
        {stats.map(s => (
          <motion.div key={s.label} className="glass-card p-4 md:p-5 hover-lift" whileHover={{ scale: 1.02 }}>
            <div className={`w-8 h-8 md:w-10 md:h-10 rounded-xl flex items-center justify-center mb-2 md:mb-3 ${s.color}`}><s.icon className="w-4 h-4 md:w-5 md:h-5" /></div>
            <p className="text-xl md:text-2xl font-display font-bold">{s.value}</p>
            <p className="text-[10px] md:text-xs text-muted-foreground">{s.label}</p>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

// ─── Generic CRUD Panel ─────────────────────────────────
const CrudPanel = ({ title, table, fields, renderRow }: {
  title: string; table: string;
  fields: { key: string; label: string; type?: string; optional?: boolean }[];
  renderRow: (r: any, edit: () => void, del: () => void) => React.ReactNode;
}) => {
  const { rows, loading, remove, upsert } = useTable(table);
  const [editing, setEditing] = useState<any | null>(null);
  const [showForm, setShowForm] = useState(false);

  return (
    <div>
      <div className="flex items-center justify-between mb-4 md:mb-6">
        <h2 className="font-display text-xl md:text-2xl font-bold">{title}</h2>
        <button onClick={() => { setEditing(null); setShowForm(true); }} className="px-3 md:px-4 py-2 gold-gradient text-primary-foreground text-xs md:text-sm font-semibold rounded-xl flex items-center gap-2">
          <Plus className="w-4 h-4" /> Add
        </button>
      </div>
      {loading ? <Loader2 className="w-6 h-6 animate-spin mx-auto mt-10 text-primary" /> : (
        <div className="glass-card overflow-x-auto">
          <table className="w-full text-xs md:text-sm">
            <tbody>
              {rows.map(r => renderRow(r, () => { setEditing(r); setShowForm(true); }, () => remove(r.id)))}
              {rows.length === 0 && <tr><td className="p-8 text-center text-muted-foreground">No items yet</td></tr>}
            </tbody>
          </table>
        </div>
      )}
      {showForm && <FormModal title={editing ? `Edit ${title}` : `Add ${title}`} fields={fields} initial={editing} onSave={upsert} onClose={() => setShowForm(false)} />}
    </div>
  );
};

// ─── Events Panel (with image upload) ───────────────────
const EventsPanel = () => (
  <CrudPanel title="Events" table="events"
    fields={[
      { key: "title", label: "Title", optional: true },
      { key: "description", label: "Description", type: "textarea", optional: true },
      { key: "event_date", label: "Date", type: "datetime-local" },
      { key: "location", label: "Location", optional: true },
      { key: "image_url", label: "Image", type: "image-upload" },
      { key: "status", label: "Status", type: "select-status" },
    ]}
    renderRow={(r, edit, del) => (
      <tr key={r.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
        <td className="p-3 md:p-4">
          <div className="flex items-center gap-3">
            {r.image_url && <img src={r.image_url} className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />}
            <div>
              <span className="font-medium">{r.title || "Untitled"}</span>
              {r.event_date && <p className="text-[10px] text-muted-foreground">{new Date(r.event_date).toLocaleDateString()}</p>}
            </div>
          </div>
        </td>
        <td className="p-3 md:p-4 hidden md:table-cell">{r.location ?? "—"}</td>
        <td className="p-3 md:p-4"><span className={`px-2 py-1 rounded-full text-[10px] md:text-xs font-medium ${r.status === "completed" ? "bg-emerald-100 text-emerald-700" : r.status === "ongoing" ? "bg-blue-100 text-blue-700" : "bg-amber-100 text-amber-700"}`}>{r.status}</span></td>
        <td className="p-3 md:p-4 text-right">
          <button onClick={edit} className="p-1.5 md:p-2 rounded-lg hover:bg-primary/5 text-primary"><Edit className="w-3.5 h-3.5 md:w-4 md:h-4" /></button>
          <button onClick={del} className="p-1.5 md:p-2 rounded-lg hover:bg-destructive/5 text-destructive"><Trash2 className="w-3.5 h-3.5 md:w-4 md:h-4" /></button>
        </td>
      </tr>
    )}
  />
);

// ─── Gallery Panel (with image upload + crop) ───────────
const GalleryPanel = () => {
  const { rows, loading, remove, upsert, refetch } = useTable("gallery");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadPreview, setUploadPreview] = useState<string | null>(null);
  const [uploadTitle, setUploadTitle] = useState("");
  const [uploadType, setUploadType] = useState("photo");
  const [uploadUrl, setUploadUrl] = useState("");
  const [useUrl, setUseUrl] = useState(false);
  const [showCrop, setShowCrop] = useState(false);
  const [cropImage, setCropImage] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => { setCropImage(reader.result as string); setShowCrop(true); };
    reader.readAsDataURL(file);
  };

  const handleCropDone = async () => {
    if (!cropImage || !croppedAreaPixels) return;
    const blob = await getCroppedImg(cropImage, croppedAreaPixels);
    const file = new File([blob], `gallery-${Date.now()}.jpg`, { type: "image/jpeg" });
    setUploadFile(file);
    setUploadPreview(URL.createObjectURL(blob));
    setShowCrop(false);
    setCropImage(null);
  };

  const handleUpload = async () => {
    if (useUrl) {
      if (!uploadUrl) { toast.error("URL is required"); return; }
      await upsert({ ...(editing?.id ? { id: editing.id } : {}), title: uploadTitle || "Untitled", url: uploadUrl, type: uploadType });
      resetForm();
      return;
    }

    if (!uploadFile && !editing?.url) { toast.error("Please select an image"); return; }
    setUploading(true);
    let finalUrl = editing?.url || "";
    if (uploadFile) {
      const fileName = `${Date.now()}-${uploadFile.name}`;
      const { error: uploadError } = await supabase.storage.from("gallery").upload(fileName, uploadFile);
      if (uploadError) { toast.error(uploadError.message); setUploading(false); return; }
      const { data: urlData } = supabase.storage.from("gallery").getPublicUrl(fileName);
      finalUrl = urlData.publicUrl;
    }
    await upsert({ ...(editing?.id ? { id: editing.id } : {}), title: uploadTitle || "Untitled", url: finalUrl, type: uploadType });
    setUploading(false);
    resetForm();
  };

  const resetForm = () => {
    setShowForm(false);
    setEditing(null);
    setUploadFile(null);
    setUploadPreview(null);
    setUploadTitle("");
    setUploadType("photo");
    setUploadUrl("");
    setUseUrl(false);
  };

  const openEdit = (r: any) => {
    setEditing(r);
    setUploadTitle(r.title || "");
    setUploadType(r.type || "photo");
    setUploadUrl(r.url || "");
    setUploadPreview(r.url || "");
    setShowForm(true);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4 md:mb-6">
        <h2 className="font-display text-xl md:text-2xl font-bold">Gallery</h2>
        <button onClick={() => { resetForm(); setShowForm(true); }} className="px-3 md:px-4 py-2 gold-gradient text-primary-foreground text-xs md:text-sm font-semibold rounded-xl flex items-center gap-2"><Upload className="w-4 h-4" /> Add Media</button>
      </div>
      {loading ? <Loader2 className="w-6 h-6 animate-spin mx-auto mt-10 text-primary" /> : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
          {rows.map(r => (
            <div key={r.id} className="glass-card overflow-hidden group relative">
              <div className="aspect-square bg-muted">
                {r.type === "photo" ? <img src={r.url} alt={r.title} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center"><Video className="w-8 h-8 text-muted-foreground" /></div>}
              </div>
              <div className="absolute inset-0 bg-foreground/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                <button onClick={() => openEdit(r)} className="p-2 rounded-full bg-primary/80 text-primary-foreground"><Edit className="w-4 h-4" /></button>
                <button onClick={() => remove(r.id)} className="p-2 rounded-full bg-destructive/80 text-destructive-foreground"><Trash2 className="w-4 h-4" /></button>
              </div>
              <div className="p-2"><p className="text-xs truncate">{r.title}</p></div>
            </div>
          ))}
          {rows.length === 0 && <p className="col-span-full text-center text-muted-foreground py-8">No gallery items yet</p>}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 backdrop-blur-sm p-4" onClick={resetForm}>
          <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-card border border-border rounded-2xl p-5 md:p-6 w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display text-base md:text-lg font-bold">{editing ? "Edit Media" : "Add Media"}</h3>
              <button onClick={resetForm} className="p-1 rounded-lg hover:bg-muted"><X className="w-4 h-4" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs md:text-sm font-medium mb-1">Title <span className="text-muted-foreground">(optional)</span></label>
                <input value={uploadTitle} onChange={e => setUploadTitle(e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-border bg-background/50 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" placeholder="Image title" />
              </div>
              <div>
                <label className="block text-xs md:text-sm font-medium mb-1">Type</label>
                <select value={uploadType} onChange={e => setUploadType(e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-border bg-background/50 text-sm">
                  <option value="photo">Photo</option><option value="video">Video</option>
                </select>
              </div>
              <div className="flex items-center gap-3">
                <button onClick={() => setUseUrl(false)} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${!useUrl ? "gold-gradient text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                  <Upload className="w-3 h-3 inline mr-1" /> Upload Image
                </button>
                <button onClick={() => setUseUrl(true)} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${useUrl ? "gold-gradient text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                  🔗 Use URL
                </button>
              </div>
              {useUrl ? (
                <div>
                  <label className="block text-xs md:text-sm font-medium mb-1">Image/Video URL</label>
                  <input value={uploadUrl} onChange={e => setUploadUrl(e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-border bg-background/50 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" placeholder="https://..." />
                </div>
              ) : (
                <div>
                  <label className="block text-xs md:text-sm font-medium mb-1">Select Image</label>
                  <input type="file" accept="image/*" onChange={handleFileSelect} className="w-full text-sm file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20 cursor-pointer" />
                  {uploadPreview && (
                    <div className="mt-3 relative">
                      <img src={uploadPreview} alt="Preview" className="w-full h-48 object-cover rounded-xl border border-border" />
                      <button onClick={() => { setUploadPreview(null); setUploadFile(null); }} className="absolute top-2 right-2 p-1 rounded-full bg-destructive/80 text-destructive-foreground"><X className="w-3 h-3" /></button>
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="flex justify-end gap-3 mt-5">
              <button onClick={resetForm} className="px-4 py-2 text-sm rounded-xl border border-border hover:bg-muted">Cancel</button>
              <button onClick={handleUpload} disabled={uploading} className="px-4 py-2 gold-gradient text-primary-foreground text-sm font-semibold rounded-xl flex items-center gap-2 disabled:opacity-50">
                {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Save
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {showCrop && cropImage && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-foreground/60 backdrop-blur-sm p-4">
          <div className="bg-card border border-border rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
            <div className="p-4 border-b border-border flex items-center justify-between">
              <h3 className="font-display text-sm font-bold">Crop Image</h3>
              <button onClick={() => { setShowCrop(false); setCropImage(null); }} className="p-1 rounded-lg hover:bg-muted"><X className="w-4 h-4" /></button>
            </div>
            <div className="relative w-full h-80 bg-foreground/10">
              <Cropper image={cropImage} crop={crop} zoom={zoom} aspect={4 / 3} onCropChange={setCrop} onZoomChange={setZoom} onCropComplete={(_, c) => setCroppedAreaPixels(c)} />
            </div>
            <div className="p-4 space-y-3">
              <div className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground">Zoom</span>
                <input type="range" min={1} max={3} step={0.1} value={zoom} onChange={e => setZoom(Number(e.target.value))} className="flex-1 accent-primary" />
              </div>
              <div className="flex justify-end gap-3">
                <button onClick={() => { setShowCrop(false); setCropImage(null); }} className="px-4 py-2 text-sm rounded-xl border border-border hover:bg-muted">Cancel</button>
                <button onClick={handleCropDone} className="px-4 py-2 gold-gradient text-primary-foreground text-sm font-semibold rounded-xl flex items-center gap-2">
                  <Check className="w-4 h-4" /> Crop & Use
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Projects Panel (with image upload + video URL) ─────
const ProjectsPanel = () => (
  <CrudPanel title="Projects" table="projects"
    fields={[
      { key: "title", label: "Title", optional: true },
      { key: "description", label: "Description", type: "textarea", optional: true },
      { key: "status", label: "Status", type: "select-project-status" },
      { key: "image_url", label: "Image", type: "image-upload" },
      { key: "video_url", label: "YouTube Video URL", optional: true },
    ]}
    renderRow={(r, edit, del) => (
      <tr key={r.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
        <td className="p-3 md:p-4">
          <div className="flex items-center gap-3">
            {r.image_url && <img src={r.image_url} className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />}
            <div>
              <span className="font-medium">{r.title || "Untitled"}</span>
              {r.video_url && <p className="text-[10px] text-blue-600">🎬 Has video</p>}
            </div>
          </div>
        </td>
        <td className="p-3 md:p-4"><span className="px-2 py-1 rounded-full text-[10px] md:text-xs font-medium bg-primary/10 text-primary">{r.status?.replace("_", " ")}</span></td>
        <td className="p-3 md:p-4 max-w-xs truncate text-muted-foreground hidden md:table-cell">{r.description ?? "—"}</td>
        <td className="p-3 md:p-4 text-right">
          <button onClick={edit} className="p-1.5 md:p-2 rounded-lg hover:bg-primary/5 text-primary"><Edit className="w-3.5 h-3.5 md:w-4 md:h-4" /></button>
          <button onClick={del} className="p-1.5 md:p-2 rounded-lg hover:bg-destructive/5 text-destructive"><Trash2 className="w-3.5 h-3.5 md:w-4 md:h-4" /></button>
        </td>
      </tr>
    )}
  />
);

const RecentWorkPanel = () => (
  <CrudPanel title="Recent Work" table="recent_work"
    fields={[
      { key: "title", label: "Title", optional: true },
      { key: "description", label: "Description", type: "textarea", optional: true },
      { key: "status", label: "Status", type: "select-project-status" },
      { key: "image_url", label: "Image", type: "image-upload" },
      { key: "youtube_url", label: "YouTube Video URL", optional: true },
    ]}
    renderRow={(r, edit, del) => (
      <tr key={r.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
        <td className="p-3 md:p-4">
          <div className="flex items-center gap-3">
            {r.image_url && <img src={r.image_url} className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />}
            <div>
              <span className="font-medium">{r.title || "Untitled"}</span>
              <p className="text-[10px] text-muted-foreground line-clamp-1">{r.description || "No description"}</p>
            </div>
          </div>
        </td>
        <td className="p-3 md:p-4 hidden md:table-cell">{r.status?.replace("_", " ") || "ongoing"}</td>
        <td className="p-3 md:p-4 text-right">
          <button onClick={edit} className="p-1.5 md:p-2 rounded-lg hover:bg-primary/5 text-primary"><Edit className="w-3.5 h-3.5 md:w-4 md:h-4" /></button>
          <button onClick={del} className="p-1.5 md:p-2 rounded-lg hover:bg-destructive/5 text-destructive"><Trash2 className="w-3.5 h-3.5 md:w-4 md:h-4" /></button>
        </td>
      </tr>
    )}
  />
);

const BannersPanel = () => (
  <CrudPanel title="Banners" table="banners"
    fields={[
      { key: "title", label: "Title", optional: true },
      { key: "image_url", label: "Image", type: "image-upload" },
      { key: "link_url", label: "Link URL", optional: true },
      { key: "sort_order", label: "Sort Order", type: "number" },
    ]}
    renderRow={(r, edit, del) => (
      <tr key={r.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
        <td className="p-3 md:p-4">
          <div className="flex items-center gap-3">
            {r.image_url && <img src={r.image_url} className="w-14 h-9 rounded-lg object-cover flex-shrink-0" />}
            <div>
              <span className="font-medium">{r.title || "Banner"}</span>
              {r.link_url && <p className="text-[10px] text-blue-600 truncate max-w-xs">{r.link_url}</p>}
            </div>
          </div>
        </td>
        <td className="p-3 md:p-4 hidden md:table-cell">{r.sort_order ?? 0}</td>
        <td className="p-3 md:p-4 text-right">
          <button onClick={edit} className="p-1.5 md:p-2 rounded-lg hover:bg-primary/5 text-primary"><Edit className="w-3.5 h-3.5 md:w-4 md:h-4" /></button>
          <button onClick={del} className="p-1.5 md:p-2 rounded-lg hover:bg-destructive/5 text-destructive"><Trash2 className="w-3.5 h-3.5 md:w-4 md:h-4" /></button>
        </td>
      </tr>
    )}
  />
);

const AnnouncementsPanel = () => (
  <CrudPanel title="Announcements" table="announcements"
    fields={[
      { key: "title", label: "Title" },
      { key: "message", label: "Message", type: "textarea" },
      { key: "category", label: "Category", optional: true },
    ]}
    renderRow={(r, edit, del) => (
      <tr key={r.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
        <td className="p-3 md:p-4">
          <span className="font-medium">{r.title || "Announcement"}</span>
          <p className="text-[10px] text-muted-foreground line-clamp-1">{r.message || ""}</p>
        </td>
        <td className="p-3 md:p-4 hidden md:table-cell">{r.category || "announcements"}</td>
        <td className="p-3 md:p-4 text-right">
          <button onClick={edit} className="p-1.5 md:p-2 rounded-lg hover:bg-primary/5 text-primary"><Edit className="w-3.5 h-3.5 md:w-4 md:h-4" /></button>
          <button onClick={del} className="p-1.5 md:p-2 rounded-lg hover:bg-destructive/5 text-destructive"><Trash2 className="w-3.5 h-3.5 md:w-4 md:h-4" /></button>
        </td>
      </tr>
    )}
  />
);

// ─── Committee Panel ────────────────────────────────────
const getWelcomeMessage = (member: any, websiteUrl: string) => {
  const phone10 = member.phone?.replace(/\D/g, "").slice(-10) || "";
  return [
    "🙏 *जय जिनेन्द्र*", "", "प्रिय *" + member.name + "* जी,", "",
    "━━━━━━━━━━━━━━━━━━━━", "🛕 *श्री पार्श्वनाथ दिगम्बर बड़ा जैन मन्दिर, पाढ़म*", "━━━━━━━━━━━━━━━━━━━━", "",
    "हमारे मन्दिर की नई वेबसाइट बन गई है!", "", "🌐 *वेबसाइट:* https://jainmandirparham.netlify.app", "",
    "📋 *लॉगिन कैसे करें:*", "",
    "1️⃣ इस लिंक पर जाएं: https://jainmandirparham.netlify.app/login",
    "2️⃣ *Committee* रोल चुनें", "3️⃣ अपनी *पद (Position)* चुनें", "4️⃣ अपना *नाम* चुनें",
    "5️⃣ अपना *मोबाइल नंबर* डालें", "6️⃣ *Login* बटन दबाएं", "",
    "🔑 *पहली बार लॉगिन:*", "आपका पासवर्ड आपका मोबाइल नंबर है: *" + phone10 + "*", "",
    "⚙️ *पासवर्ड बदलें:*", "लॉगिन के बाद *Settings > Change Password* में जाकर नया पासवर्ड बनाएं।", "",
    "❓ *पासवर्ड भूल गए?*", "Login page पर *Forgot Password* से दोबारा पासवर्ड बनाएं।", "",
    "━━━━━━━━━━━━━━━━━━━━", "",
    "🙏 *Jai Jinendra*", "", "Dear *" + member.name + "* Ji,", "",
    "━━━━━━━━━━━━━━━━━━━━", "🛕 *Shri Parshwanath Digambar Bada Jain Mandir, Parham*", "━━━━━━━━━━━━━━━━━━━━", "",
    "Our temple's new website is ready!", "", "🌐 *Website:* https://jainmandirparham.netlify.app", "",
    "📋 *How to Login:*", "",
    "1️⃣ Open this link: https://jainmandirparham.netlify.app/login",
    "2️⃣ Select *Committee* role", "3️⃣ Select your *Position*", "4️⃣ Select your *Name*",
    "5️⃣ Enter your *Mobile Number*", "6️⃣ Press the *Login* button", "",
    "🔑 *First Time Login:*", "Your password is your mobile number: *" + phone10 + "*", "",
    "⚙️ *Change Password:*", "After login, go to *Settings > Change Password* to set a new password.", "",
    "❓ *Forgot Password?*", "Use *Forgot Password* on the Login page to reset it.", "",
    "━━━━━━━━━━━━━━━━━━━━", "", "*Regards,*", "*Arpan Jain*", "",
    "_This is an automated message sent by the website._", "",
    `© ${new Date().getFullYear()} Shri Parshwanath Digambar Bada Jain Mandir, Parham. All rights reserved.`,
  ].join("\n");
};

const MessagePreview = ({ member, websiteUrl }: { member: any; websiteUrl: string }) => {
  const phone10 = member.phone?.replace(/\D/g, "").slice(-10) || "";
  return (
    <div className="max-w-sm mx-auto">
      <div className="bg-[hsl(142,40%,95%)] rounded-2xl p-4 space-y-2 text-sm shadow-md border border-[hsl(142,30%,85%)]">
        <div className="flex items-center gap-2 pb-2 border-b border-[hsl(142,30%,85%)]">
          <div className="w-8 h-8 rounded-full bg-[hsl(142,70%,45%)] flex items-center justify-center text-white text-xs font-bold">W</div>
          <div>
            <p className="font-semibold text-foreground text-xs">Jain Mandir Parham</p>
            <p className="text-[10px] text-muted-foreground">WhatsApp Business</p>
          </div>
        </div>
        <div className="space-y-1.5 text-foreground/90 leading-relaxed text-[11px]">
          <p>🙏 <strong>जय जिनेन्द्र</strong></p>
          <p>प्रिय <strong>{member.name}</strong> जी,</p>
          <p className="text-[10px] text-muted-foreground">━━━━━━━━━━━━━━━━━━━━</p>
          <p>🛕 <strong>श्री पार्श्वनाथ दिगम्बर बड़ा जैन मन्दिर, पाढ़म</strong></p>
          <p>हमारे मन्दिर की नई वेबसाइट बन गई है!</p>
          <p>🌐 <strong>वेबसाइट:</strong> <span className="text-blue-600 underline">{websiteUrl}</span></p>
          <p>📋 <strong>लॉगिन कैसे करें:</strong></p>
          <div className="pl-2 space-y-0.5">
            <p>1️⃣ लिंक पर जाएं</p><p>2️⃣ <strong>Committee</strong> रोल चुनें</p><p>3️⃣ अपनी <strong>पद</strong> चुनें</p>
            <p>4️⃣ अपना <strong>नाम</strong> चुनें</p><p>5️⃣ <strong>मोबाइल नंबर</strong> डालें</p><p>6️⃣ <strong>Login</strong> दबाएं</p>
          </div>
          <p>🔑 पासवर्ड: <strong>{phone10}</strong></p>
          <p className="text-[10px] text-muted-foreground italic mt-2">+ English version...</p>
          <p className="text-[9px] text-muted-foreground mt-2">© {new Date().getFullYear()} Shri Parshwanath Digambar Bada Jain Mandir, Parham</p>
        </div>
        <div className="flex items-center justify-end gap-1 pt-1">
          <span className="text-[9px] text-muted-foreground">{new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}</span>
          <Check className="w-3 h-3 text-blue-500" />
        </div>
      </div>
    </div>
  );
};

const CommitteePanel = () => {
  const { rows, loading } = useTable("committee");
  const websiteUrl = "https://jainmandirparham.netlify.app";
  const [previewMember, setPreviewMember] = useState<any>(null);
  const [sendingEmail, setSendingEmail] = useState<string | null>(null);

  const sendEmail = async (member: any) => {
    if (!member.email) { toast.error(`${member.name} की email नहीं है`); return; }
    setSendingEmail(member.id);
    try {
      const { data, error } = await supabase.functions.invoke("send-welcome-email", {
        body: { to: member.email, name: member.name, position: member.position, phone: member.phone || "", websiteUrl },
      });
      if (error) throw error;
      if (data?.success) toast.success(`✉️ Email sent to ${member.name}!`);
      else throw new Error(data?.error || "Failed to send email");
    } catch (err: any) { toast.error(`Email failed: ${err.message}`); }
    setSendingEmail(null);
  };

  const sendWhatsApp = (member: any) => {
    const phone = member.phone?.replace(/\D/g, "") || "";
    if (!phone || phone === "xxxxxxxxxx") { toast.error(`${member.name} का valid phone number नहीं है`); return; }
    const msg = encodeURIComponent(getWelcomeMessage(member, websiteUrl));
    window.open(`https://wa.me/${phone}?text=${msg}`, "_blank");
  };

  const sendBoth = async (member: any) => {
    if (member.email) await sendEmail(member);
    sendWhatsApp(member);
  };

  const sendAllMembers = async () => {
    toast.info(`Sending to ${rows.length} members...`);
    for (let i = 0; i < rows.length; i++) {
      const member = rows[i];
      if (member.email) await sendEmail(member);
      setTimeout(() => sendWhatsApp(member), i * 1500);
    }
  };

  return (
    <div className="space-y-6">
      <CrudPanel title="Committee Members" table="committee"
        fields={[
          { key: "name", label: "Name" },
          { key: "position", label: "Position" },
          { key: "phone", label: "Phone", optional: true },
          { key: "email", label: "Email", optional: true },
          { key: "image_url", label: "Photo", type: "image-upload" },
          { key: "display_order", label: "Display Order", type: "number" },
        ]}
        renderRow={(r, edit, del) => (
          <tr key={r.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
            <td className="p-3 md:p-4 flex items-center gap-2 md:gap-3">
              {r.image_url ? <img src={r.image_url} className="w-7 h-7 md:w-8 md:h-8 rounded-full object-cover" /> : <div className="w-7 h-7 md:w-8 md:h-8 rounded-full gold-gradient flex items-center justify-center text-primary-foreground text-[10px] md:text-xs font-bold">{r.name?.charAt(0)}</div>}
              <div className="min-w-0">
                <span className="truncate block">{r.name}</span>
                {r.email && <span className="text-[10px] text-muted-foreground truncate block">{r.email}</span>}
              </div>
            </td>
            <td className="p-3 md:p-4 hidden sm:table-cell">{r.position}</td>
            <td className="p-3 md:p-4 hidden md:table-cell">{r.phone ?? "—"}</td>
            <td className="p-3 md:p-4 text-right flex items-center justify-end gap-1">
              <button onClick={() => setPreviewMember(r)} title="Preview" className="p-1.5 md:p-2 rounded-lg hover:bg-muted text-muted-foreground"><Eye className="w-3.5 h-3.5 md:w-4 md:h-4" /></button>
              {r.email && (
                <button onClick={() => sendEmail(r)} title="Send Email" disabled={sendingEmail === r.id} className="p-1.5 md:p-2 rounded-lg hover:bg-blue-50 text-blue-600 disabled:opacity-50">
                  {sendingEmail === r.id ? <Loader2 className="w-3.5 h-3.5 md:w-4 md:h-4 animate-spin" /> : <Mail className="w-3.5 h-3.5 md:w-4 md:h-4" />}
                </button>
              )}
              <button onClick={() => sendWhatsApp(r)} title="Send WhatsApp" className="p-1.5 md:p-2 rounded-lg hover:bg-accent text-accent-foreground"><MessageSquare className="w-3.5 h-3.5 md:w-4 md:h-4" /></button>
              <button onClick={edit} className="p-1.5 md:p-2 rounded-lg hover:bg-primary/5 text-primary"><Edit className="w-3.5 h-3.5 md:w-4 md:h-4" /></button>
              <button onClick={del} className="p-1.5 md:p-2 rounded-lg hover:bg-destructive/5 text-destructive"><Trash2 className="w-3.5 h-3.5 md:w-4 md:h-4" /></button>
            </td>
          </tr>
        )}
      />

      {previewMember && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setPreviewMember(null)}>
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-background rounded-2xl p-6 max-w-lg w-full shadow-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display text-lg font-bold text-foreground">📧 Email & WhatsApp Preview</h3>
              <button onClick={() => setPreviewMember(null)} className="p-1 rounded-lg hover:bg-muted"><X className="w-4 h-4" /></button>
            </div>
            <div className="mb-4">
              <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
                <Mail className="w-3 h-3" /> Email Preview {previewMember.email ? `(${previewMember.email})` : "(No email)"}
              </p>
              <div className="border border-border rounded-xl overflow-hidden bg-[#f8f6f0]">
                <div className="p-4 text-center" style={{ background: "linear-gradient(135deg,#b8860b,#daa520,#f0c040)" }}>
                  <div className="text-2xl mb-1">🙏🛕</div>
                  <p className="text-white font-bold text-sm">श्री पार्श्वनाथ दिगम्बर बड़ा जैन मन्दिर</p>
                  <p className="text-white/80 text-[10px]">ग्राम - परहम, जिला - मैनपुरी</p>
                </div>
                <div className="bg-white p-4 space-y-3">
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-center">
                    <p className="text-sm text-amber-800">🙏 <strong>जय जिनेन्द्र</strong></p>
                    <p className="text-xs text-amber-700">प्रिय <strong>{previewMember.name}</strong> जी</p>
                    <p className="text-[10px] text-amber-600">पद: {previewMember.position}</p>
                  </div>
                  <p className="text-xs text-gray-600">हमारे मन्दिर की नई वेबसाइट बन गई है!</p>
                  <div className="bg-amber-100 border border-amber-300 rounded-lg p-3 text-center">
                    <p className="text-[10px] text-amber-800">🔑 पासवर्ड</p>
                    <p className="text-lg font-bold text-amber-900 tracking-widest">{previewMember.phone?.replace(/\D/g, "").slice(-10) || "N/A"}</p>
                  </div>
                </div>
                <div className="bg-gray-800 p-3 text-center">
                  <p className="text-[9px] text-gray-400">© {new Date().getFullYear()} Shri Parshwanath Digambar Bada Jain Mandir, Parham</p>
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 justify-center">
              {previewMember.email && (
                <button onClick={() => sendEmail(previewMember)} disabled={sendingEmail === previewMember.id} className="px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-xl flex items-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50">
                  {sendingEmail === previewMember.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />} Email भेजें
                </button>
              )}
              <button onClick={() => sendWhatsApp(previewMember)} className="px-4 py-2 bg-[hsl(142,70%,45%)] text-white text-sm font-semibold rounded-xl flex items-center gap-2 hover:opacity-90 transition-opacity">
                <MessageSquare className="w-4 h-4" /> WhatsApp
              </button>
              {previewMember.email && (
                <button onClick={() => sendBoth(previewMember)} className="px-4 py-2 gold-gradient text-primary-foreground text-sm font-semibold rounded-xl flex items-center gap-2 hover:opacity-90 transition-opacity">
                  <Send className="w-4 h-4" /> दोनों भेजें
                </button>
              )}
              <button onClick={() => setPreviewMember(null)} className="px-4 py-2 bg-muted text-muted-foreground text-sm rounded-xl hover:bg-muted/80">Cancel</button>
            </div>
          </motion.div>
        </div>
      )}

      <div className="flex flex-col items-center gap-3">
        <button onClick={sendAllMembers} className="px-6 py-3 gold-gradient text-primary-foreground text-sm font-semibold rounded-xl flex items-center gap-2 hover:opacity-90 transition-opacity">
          <Send className="w-4 h-4" /> Send Welcome to All Members
        </button>
        <p className="text-[10px] text-muted-foreground text-center">Email + WhatsApp दोनों से भेजेगा (जिनकी email है उनको)</p>
      </div>
    </div>
  );
};

// ─── Donations Panel ────────────────────────────────────
const DonationsPanel = () => {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ startDate: '', endDate: '', receipt: '', orderId: '', paymentId: '', status: '' });
  const { committeeToken } = useAuth();
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [total, setTotal] = useState(0);
  const [exportOpen, setExportOpen] = useState(false);
  const [exportFrom, setExportFrom] = useState('');
  const [exportTo, setExportTo] = useState('');
  const [exportStatus, setExportStatus] = useState('');
  const [selectedDonation, setSelectedDonation] = useState<any | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  const fetchRows = useCallback(async (pageNum = 1) => {
    setLoading(true);
    try {
      if (!committeeToken) { toast.error('Not authenticated'); setLoading(false); return; }
      const body = {
        page: pageNum,
        limit,
        start_date: filters.startDate || undefined,
        end_date: filters.endDate || undefined,
        receipt_id: filters.receipt || undefined,
        order_id: filters.orderId || undefined,
        payment_id: filters.paymentId || undefined,
        status: filters.status || undefined,
        search: filters.receipt || undefined,
      };
      const resp = await fetch(`${backendBaseUrl}/api/donations/list`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${committeeToken}` }, body: JSON.stringify(body) });
      if (!resp.ok) { const j = await resp.json().catch(() => ({})); toast.error(j.error || 'Failed to load donations'); setLoading(false); return; }
      const json = await resp.json();
      setRows(json.data || []);
      setTotal(json.total || 0);
    } catch (e: any) { toast.error(e.message || 'Failed to load donations'); }
    setLoading(false);
  }, [filters, committeeToken, limit]);

  useEffect(() => { fetchRows(page); }, [fetchRows, page]);

  const totalAmount = rows.reduce((sum, d) => sum + Number(d.amount || 0), 0);

  const openDonationDetails = (donation: any) => {
    setSelectedDonation(donation);
    setDetailsOpen(true);
  };

  const exportServerCsv = async (from?: string, to?: string) => {
    try {
      if (!committeeToken) return toast.error('Not authenticated');
      const body: any = {};
      if (from) body.start_date = from;
      if (to) body.end_date = to;
      if (filters.receipt) body.receipt_id = filters.receipt;
      if (filters.orderId) body.order_id = filters.orderId;
      if (filters.paymentId) body.payment_id = filters.paymentId;
      if (exportStatus) body.status = exportStatus;
      else if (filters.status) body.status = filters.status;
      const resp = await fetch(`${backendBaseUrl}/api/donations/export`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${committeeToken}` }, body: JSON.stringify(body) });
      if (!resp.ok) { const j = await resp.json().catch(() => ({})); return toast.error(j.error || 'Export failed'); }
      const blob = await resp.blob();
      const dlUrl = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = dlUrl; a.download = `donations_export_${Date.now()}.csv`; a.click(); URL.revokeObjectURL(dlUrl);
      setExportOpen(false);
    } catch (err: any) { toast.error(err.message || 'Export failed'); }
  };

  const fetchReceiptHtml = async (id: string) => {
    if (!committeeToken) return toast.error('Not authenticated');
    try {
      const resp = await fetch(`${backendBaseUrl}/api/donations/receipt/${id}`, { headers: { Authorization: `Bearer ${committeeToken}` } });
      if (!resp.ok) { const j = await resp.json().catch(() => ({})); return toast.error(j.error || 'Failed to fetch receipt'); }
      const html = await resp.text();
      const w = window.open('about:blank', '_blank');
      if (w) { w.document.write(html); w.document.close(); }
    } catch (err: any) { toast.error(err.message || 'Failed to fetch receipt'); }
  };

  const fetchReceiptPdf = async (id: string) => {
    if (!committeeToken) return toast.error('Not authenticated');
    try {
      const resp = await fetch(`${backendBaseUrl}/api/donations/receipt-pdf/${id}`, { headers: { Authorization: `Bearer ${committeeToken}` } });
      if (!resp.ok) { const j = await resp.json().catch(() => ({})); return toast.error(j.error || 'Failed to fetch PDF'); }
      const blob = await resp.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = `receipt_${id}.pdf`; a.click(); URL.revokeObjectURL(url);
    } catch (err: any) { toast.error(err.message || 'Failed to fetch PDF'); }
  };

  return (
    <div>
      <h2 className="font-display text-xl md:text-2xl font-bold mb-4 md:mb-6">Donations</h2>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 md:gap-4 mb-4">
        <input type="date" value={filters.startDate} onChange={e => setFilters(f => ({ ...f, startDate: e.target.value }))} className="px-3 py-2 rounded-xl border border-border" />
        <input type="date" value={filters.endDate} onChange={e => setFilters(f => ({ ...f, endDate: e.target.value }))} className="px-3 py-2 rounded-xl border border-border" />
        <input placeholder="Search donor / receipt" value={filters.receipt} onChange={e => setFilters(f => ({ ...f, receipt: e.target.value }))} className="px-3 py-2 rounded-xl border border-border" />
        <select value={filters.status} onChange={e => setFilters(f => ({ ...f, status: e.target.value }))} className="px-3 py-2 rounded-xl border border-border bg-background">
          <option value="">All Status</option>
          <option value="created">Created</option>
          <option value="paid">Paid</option>
          <option value="failed">Failed</option>
        </select>
      </div>

      <div className="flex flex-wrap gap-3 mb-4">
        <button onClick={() => fetchRows()} className="px-4 py-2 rounded-xl gold-gradient text-primary-foreground">Search</button>
        <button onClick={() => { setFilters({ startDate: '', endDate: '', receipt: '', orderId: '', paymentId: '', status: '' }); }} className="px-4 py-2 rounded-xl border">Clear</button>
        <button onClick={() => { setExportStatus(filters.status); setExportOpen(true); }} className="px-4 py-2 rounded-xl bg-emerald-600 text-white">Export CSV</button>
      </div>

      <Dialog open={exportOpen} onOpenChange={setExportOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Export Donations CSV</DialogTitle>
            <DialogDescription>Leave dates blank to export all matching rows. You can also filter by status before exporting.</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 gap-3 mt-4">
            <label className="text-sm">From</label>
            <input type="date" value={exportFrom} onChange={e => setExportFrom(e.target.value)} className="px-3 py-2 rounded-xl border border-border" />
            <label className="text-sm">To</label>
            <input type="date" value={exportTo} onChange={e => setExportTo(e.target.value)} className="px-3 py-2 rounded-xl border border-border" />
            <label className="text-sm">Status</label>
            <select value={exportStatus} onChange={e => setExportStatus(e.target.value)} className="px-3 py-2 rounded-xl border border-border bg-background">
              <option value="">All Status</option>
              <option value="created">Created</option>
              <option value="paid">Paid</option>
              <option value="failed">Failed</option>
            </select>
          </div>
          <DialogFooter>
            <div className="flex gap-2">
              <button onClick={() => setExportOpen(false)} className="px-3 py-2 rounded-xl border">Cancel</button>
              <button onClick={() => exportServerCsv(exportFrom, exportTo)} className="px-3 py-2 rounded-xl bg-emerald-600 text-white">Export</button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4 mb-6">
        <div className="glass-card p-4 text-center">
          <p className="text-xs text-muted-foreground">Visible Donations</p>
          <p className="font-display text-xl md:text-2xl font-bold text-primary">{rows.length}</p>
        </div>
        <div className="glass-card p-4 text-center">
          <p className="text-xs text-muted-foreground">Visible Total</p>
          <p className="font-display text-xl md:text-2xl font-bold gold-text">₹{totalAmount.toLocaleString()}</p>
        </div>
        <div className="glass-card p-4 text-center">
          <p className="text-xs text-muted-foreground">Total Records</p>
          <p className="font-display text-xl md:text-2xl font-bold text-primary">{total}</p>
        </div>
      </div>

      {loading ? <Loader2 className="w-6 h-6 animate-spin mx-auto mt-10 text-primary" /> : (
        <div className="glass-card overflow-x-auto">
          <table className="w-full text-xs md:text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="p-3 text-left font-medium">Donor</th>
                <th className="p-3 text-left font-medium hidden md:table-cell">Email</th>
                <th className="p-3 text-left font-medium hidden sm:table-cell">Phone</th>
                <th className="p-3 text-left font-medium">Amount</th>
                <th className="p-3 text-left font-medium hidden md:table-cell">Purpose</th>
                <th className="p-3 text-left font-medium hidden lg:table-cell">Status</th>
                <th className="p-3 text-left font-medium">Receipt</th>
                <th className="p-3 text-left font-medium">Date</th>
                <th className="p-3 text-left font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="hidden md:table-row-group">
              {rows.map(r => (
                <tr key={r.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                  <td className="p-3 font-medium">{r.donor_name || r.name || '—'}</td>
                  <td className="p-3 text-muted-foreground hidden md:table-cell">{r.donor_email || r.email || '—'}</td>
                  <td className="p-3 hidden sm:table-cell">{r.donor_phone || r.phone || '—'}</td>
                  <td className="p-3 font-bold text-primary">₹{Number(r.amount).toLocaleString()}</td>
                  <td className="p-3 hidden md:table-cell">{r.purpose || '—'}</td>
                  <td className="p-3 hidden lg:table-cell"><span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${String(r.status || '').toLowerCase() === 'paid' ? 'bg-emerald-100 text-emerald-700' : 'bg-primary/10 text-primary'}`}>{String(r.status || 'created').toUpperCase()}</span></td>
                  <td className="p-3">{r.receipt_number || '—'}</td>
                  <td className="p-3 text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</td>
                  <td className="p-3"><div className="flex gap-2"><button onClick={() => fetchReceiptHtml(r.id)} className="text-amber-700 underline">View</button><button onClick={() => fetchReceiptPdf(r.id)} className="text-emerald-700 underline">PDF</button></div></td>
                </tr>
              ))}
              {rows.length === 0 && <tr><td colSpan={9} className="p-8 text-center text-muted-foreground">No donations yet</td></tr>}
            </tbody>
            <tbody className="md:hidden">
              {rows.map(r => (
                <tr key={r.id} className="border-b border-border/50 hover:bg-muted/30">
                  <td className="p-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-medium">{r.donor_name || r.name || '—'}</div>
                        <div className="text-xs text-muted-foreground">₹{Number(r.amount).toLocaleString()} · {new Date(r.created_at).toLocaleDateString()}</div>
                        <div className="text-xs text-muted-foreground mt-1">Receipt: {r.receipt_number || '—'}</div>
                        <div className="text-xs text-muted-foreground">Status: {String(r.status || 'created').toUpperCase()}</div>
                      </div>
                      <div className="flex flex-col gap-2 text-right">
                        <button onClick={() => fetchReceiptHtml(r.id)} className="text-amber-700 text-sm">View</button>
                        <button onClick={() => fetchReceiptPdf(r.id)} className="text-emerald-700 text-sm">PDF</button>
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

// ─── Live Darshan Panel ─────────────────────────────────
const LiveDarshanPanel = () => {
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ youtube_url: "", title: "", description: "", is_live: false, schedule: "" });

  useEffect(() => {
    const load = async () => {
      const { data } = await sb.from("live_darshan_settings").select("*").limit(1).single();
      if (data) {
        setSettings(data);
        setForm({ youtube_url: data.youtube_url || "", title: data.title || "", description: data.description || "", is_live: data.is_live || false, schedule: data.schedule || "" });
      }
      setLoading(false);
    };
    load();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    if (settings?.id) {
      const { error } = await sb.from("live_darshan_settings").update(form).eq("id", settings.id);
      if (error) toast.error(error.message);
      else { toast.success("Live Darshan settings updated!"); setSettings({ ...settings, ...form }); }
    } else {
      const { data, error } = await sb.from("live_darshan_settings").insert(form).select().single();
      if (error) toast.error(error.message);
      else { toast.success("Live Darshan settings saved!"); setSettings(data); }
    }
    setSaving(false);
  };

  if (loading) return <Loader2 className="w-6 h-6 animate-spin mx-auto mt-10 text-primary" />;

  return (
    <div>
      <h2 className="font-display text-xl md:text-2xl font-bold mb-4 md:mb-6">Live Darshan Settings</h2>
      <div className="glass-card p-4 md:p-5 mb-6 flex items-center gap-4">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${form.is_live ? "bg-red-100" : "bg-muted"}`}>
          <Radio className={`w-6 h-6 ${form.is_live ? "text-red-600 animate-pulse" : "text-muted-foreground"}`} />
        </div>
        <div className="flex-1">
          <h3 className="font-medium text-sm">Stream Status</h3>
          <p className="text-xs text-muted-foreground">{form.is_live ? "🔴 LIVE — Darshan is currently streaming" : "⚫ OFFLINE — No active stream"}</p>
        </div>
        <button
          onClick={async () => {
            const newLive = !form.is_live;
            setForm({ ...form, is_live: newLive });
            if (settings?.id) {
              const { error } = await sb.from("live_darshan_settings").update({ is_live: newLive, updated_at: new Date().toISOString() }).eq("id", settings.id);
              if (error) { toast.error(error.message); setForm({ ...form, is_live: !newLive }); }
              else toast.success(newLive ? "🔴 Stream is now LIVE!" : "⚫ Stream is now Offline");
            }
          }}
          className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all ${form.is_live ? "bg-red-100 text-red-700 hover:bg-red-200" : "gold-gradient text-primary-foreground"}`}
        >
          {form.is_live ? <><EyeOff className="w-3.5 h-3.5" /> Go Offline</> : <><Eye className="w-3.5 h-3.5" /> Go Live</>}
        </button>
      </div>
      {form.youtube_url && (
        <div className="glass-card overflow-hidden rounded-2xl mb-6">
          <div className="aspect-video">
            <iframe src={form.youtube_url} title="Live Darshan Preview" className="w-full h-full" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
          </div>
        </div>
      )}
      <div className="glass-card p-5 md:p-6 max-w-2xl space-y-4">
        <div>
          <label className="block text-xs md:text-sm font-medium mb-1">YouTube Embed URL</label>
          <input value={form.youtube_url} onChange={e => setForm({ ...form, youtube_url: e.target.value })} placeholder="https://www.youtube.com/embed/VIDEO_ID" className="w-full px-4 py-2.5 rounded-xl border border-border bg-background/50 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
          <p className="text-[10px] text-muted-foreground mt-1">Format: https://www.youtube.com/embed/VIDEO_ID</p>
        </div>
        <div>
          <label className="block text-xs md:text-sm font-medium mb-1">Title</label>
          <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} className="w-full px-4 py-2.5 rounded-xl border border-border bg-background/50 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
        </div>
        <div>
          <label className="block text-xs md:text-sm font-medium mb-1">Description</label>
          <textarea rows={3} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="w-full px-4 py-2.5 rounded-xl border border-border bg-background/50 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none" />
        </div>
        <div>
          <label className="block text-xs md:text-sm font-medium mb-1">Schedule / Timings</label>
          <input value={form.schedule} onChange={e => setForm({ ...form, schedule: e.target.value })} placeholder="Morning 6 AM & Evening 7 PM" className="w-full px-4 py-2.5 rounded-xl border border-border bg-background/50 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
        </div>
        <button onClick={handleSave} disabled={saving} className="px-5 py-2.5 gold-gradient text-primary-foreground font-semibold rounded-xl flex items-center gap-2 hover:scale-[1.02] transition-transform disabled:opacity-50 text-sm">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Save Settings
        </button>
      </div>
    </div>
  );
};

// ─── Messages Panel ─────────────────────────────────────
const MessagesPanel = () => {
  const { rows, loading, remove, update } = useTable("contact_messages");
  return (
    <div>
      <h2 className="font-display text-xl md:text-2xl font-bold mb-4 md:mb-6">Contact Messages</h2>
      {loading ? <Loader2 className="w-6 h-6 animate-spin mx-auto mt-10 text-primary" /> : (
        <div className="space-y-3 md:space-y-4">
          {rows.map(r => (
            <div key={r.id} className={`glass-card p-4 md:p-5 ${!r.is_read ? "border-l-4 border-l-primary" : ""}`}>
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="font-medium text-sm">{r.name} <span className="text-[10px] md:text-xs text-muted-foreground ml-2">{r.email}</span></h4>
                  <p className="text-xs md:text-sm font-medium text-primary mt-1">{r.subject}</p>
                  <p className="text-xs md:text-sm text-muted-foreground mt-2">{r.message}</p>
                  <p className="text-[10px] md:text-xs text-muted-foreground mt-2">{new Date(r.created_at).toLocaleString()}</p>
                </div>
                <div className="flex items-center gap-1">
                  {!r.is_read && <button onClick={() => update(r.id, { is_read: true })} className="p-1.5 md:p-2 rounded-lg hover:bg-primary/5 text-primary" title="Mark as read"><Check className="w-3.5 h-3.5 md:w-4 md:h-4" /></button>}
                  <button onClick={() => remove(r.id)} className="p-1.5 md:p-2 rounded-lg hover:bg-destructive/5 text-destructive"><Trash2 className="w-3.5 h-3.5 md:w-4 md:h-4" /></button>
                </div>
              </div>
            </div>
          ))}
          {rows.length === 0 && <p className="text-center text-muted-foreground py-8 text-sm">No messages yet</p>}
        </div>
      )}
    </div>
  );
};

// ─── Notifications Panel ────────────────────────────────
const NotificationsPanel = () => {
  const { rows, loading, upsert, remove } = useTable("notifications");
  const [form, setForm] = useState({ title: "", message: "", target_role: "all" });
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    if (!form.title || !form.message) { toast.error("Please fill title and message"); return; }
    setSending(true);
    await upsert({ ...form });
    setForm({ title: "", message: "", target_role: "all" });
    setSending(false);
  };

  return (
    <div>
      <h2 className="font-display text-xl md:text-2xl font-bold mb-4 md:mb-6">Notifications</h2>
      <div className="glass-card p-4 md:p-6 max-w-2xl mb-6 md:mb-8">
        <h3 className="font-medium mb-3 md:mb-4 text-sm">Send New Notification</h3>
        <div className="space-y-3 md:space-y-4">
          <div>
            <label className="block text-xs md:text-sm font-medium mb-1">Title</label>
            <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} className="w-full px-4 py-2.5 rounded-xl border border-border bg-background/50 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" placeholder="Notification title" />
          </div>
          <div>
            <label className="block text-xs md:text-sm font-medium mb-1">Message</label>
            <textarea rows={3} value={form.message} onChange={e => setForm({ ...form, message: e.target.value })} className="w-full px-4 py-2.5 rounded-xl border border-border bg-background/50 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none" placeholder="Notification message..." />
          </div>
          <div>
            <label className="block text-xs md:text-sm font-medium mb-1">Target Audience</label>
            <select value={form.target_role} onChange={e => setForm({ ...form, target_role: e.target.value })} className="w-full px-4 py-2.5 rounded-xl border border-border bg-background/50 text-sm">
              <option value="all">All Users</option><option value="visitor">Visitors</option><option value="committee">Committee</option>
            </select>
          </div>
          <button onClick={handleSend} disabled={sending} className="px-5 md:px-6 py-2.5 md:py-3 gold-gradient text-primary-foreground font-semibold rounded-xl flex items-center gap-2 hover:scale-[1.02] transition-transform disabled:opacity-50 text-sm">
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />} Send
          </button>
        </div>
      </div>
      <h3 className="font-medium mb-3 md:mb-4 text-sm">Sent Notifications</h3>
      {loading ? <Loader2 className="w-6 h-6 animate-spin mx-auto text-primary" /> : (
        <div className="space-y-2 md:space-y-3">
          {rows.map(r => (
            <div key={r.id} className="glass-card p-3 md:p-4 flex items-start justify-between">
              <div>
                <h4 className="font-medium text-xs md:text-sm">{r.title}</h4>
                <p className="text-[10px] md:text-xs text-muted-foreground mt-1">{r.message}</p>
                <p className="text-[10px] md:text-xs text-muted-foreground mt-1">To: {r.target_role} • {new Date(r.created_at).toLocaleString()}</p>
              </div>
              <button onClick={() => remove(r.id)} className="p-1.5 md:p-2 rounded-lg hover:bg-destructive/5 text-destructive"><Trash2 className="w-3.5 h-3.5 md:w-4 md:h-4" /></button>
            </div>
          ))}
          {rows.length === 0 && <p className="text-center text-muted-foreground py-4 text-sm">No notifications sent yet</p>}
        </div>
      )}
    </div>
  );
};

// ─── Promotions Panel ───────────────────────────────────
const PromotionsPanel = () => {
  const { rows, loading, upsert, remove, update } = useTable("promotions");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any>(null);

  const handleToggle = async (row: any) => { await update(row.id, { is_active: !row.is_active }); };

  return (
    <div>
      <div className="flex items-center justify-between mb-4 md:mb-6">
        <h2 className="font-display text-xl md:text-2xl font-bold">Promotions</h2>
        <button onClick={() => { setEditing(null); setShowForm(true); }} className="px-3 md:px-4 py-2 gold-gradient text-primary-foreground text-xs md:text-sm font-semibold rounded-xl flex items-center gap-2">
          <Plus className="w-4 h-4" /> Add Promotion
        </button>
      </div>
      {loading ? <Loader2 className="w-6 h-6 animate-spin mx-auto mt-10 text-primary" /> : (
        <div className="space-y-3">
          {rows.map(r => (
            <div key={r.id} className="glass-card p-4 md:p-5 flex flex-col sm:flex-row gap-4">
              {r.image_url && (
                <div className="w-full sm:w-32 h-24 rounded-xl overflow-hidden flex-shrink-0">
                  <img src={r.image_url} alt={r.title} className="w-full h-full object-cover" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className="font-medium text-sm">{r.title}</h4>
                    {r.event_date && <p className="text-[10px] text-primary mt-0.5">📅 {r.event_date}</p>}
                    {r.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{r.description}</p>}
                    <p className="text-[10px] text-muted-foreground mt-1">Auto-hide: {r.display_duration}s</p>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button onClick={() => handleToggle(r)} className={`px-2.5 py-1 rounded-full text-[10px] font-semibold transition-all ${r.is_active ? "bg-emerald-100 text-emerald-700" : "bg-muted text-muted-foreground"}`}>
                      {r.is_active ? "Active" : "Inactive"}
                    </button>
                    <button onClick={() => { setEditing(r); setShowForm(true); }} className="p-1.5 rounded-lg hover:bg-primary/5 text-primary"><Edit className="w-3.5 h-3.5" /></button>
                    <button onClick={() => remove(r.id)} className="p-1.5 rounded-lg hover:bg-destructive/5 text-destructive"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                </div>
              </div>
            </div>
          ))}
          {rows.length === 0 && <p className="text-center text-muted-foreground py-8 text-sm">No promotions yet</p>}
        </div>
      )}
      {showForm && (
        <FormModal
          title={editing ? "Edit Promotion" : "Add Promotion"}
          fields={[
            { key: "title", label: "Title", optional: true },
            { key: "description", label: "Description", type: "textarea", optional: true },
            { key: "event_date", label: "Event Date (e.g. 15 March 2026)", optional: true },
            { key: "image_url", label: "Image", type: "image-upload" },
            { key: "display_duration", label: "Display Duration (seconds)", type: "number" },
          ]}
          initial={editing}
          onSave={(data) => { upsert({ ...data, is_active: editing?.is_active ?? false }); }}
          onClose={() => setShowForm(false)}
        />
      )}
    </div>
  );
};

// ─── All Users Panel ────────────────────────────────────
const AllUsersPanel = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const [profilesRes, rolesRes] = await Promise.all([
        sb.from("profiles").select("*").order("created_at", { ascending: false }),
        sb.from("user_roles").select("*"),
      ]);
      if (profilesRes.error) { toast.error(profilesRes.error.message); setLoading(false); return; }
      const rolesMap: Record<string, string> = {};
      (rolesRes.data ?? []).forEach((r: any) => { rolesMap[r.user_id] = r.role; });
      const combined = (profilesRes.data ?? []).map((p: any) => ({ ...p, role: rolesMap[p.user_id] ?? "visitor" }));
      setUsers(combined);
      setLoading(false);
    };
    load();
  }, []);

  return (
    <div>
      <h2 className="font-display text-xl md:text-2xl font-bold mb-4 md:mb-6">All Users ({users.length})</h2>
      {loading ? <Loader2 className="w-6 h-6 animate-spin mx-auto mt-10 text-primary" /> : (
        <div className="glass-card overflow-x-auto">
          <table className="w-full text-xs md:text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="p-3 text-left font-medium">#</th>
                <th className="p-3 text-left font-medium">Name</th>
                <th className="p-3 text-left font-medium">Email</th>
                <th className="p-3 text-left font-medium hidden sm:table-cell">Phone</th>
                <th className="p-3 text-left font-medium hidden md:table-cell">Role</th>
                <th className="p-3 text-left font-medium hidden lg:table-cell">Joined</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u, i) => (
                <tr key={u.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                  <td className="p-3 text-muted-foreground">{i + 1}</td>
                  <td className="p-3 font-medium flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full gold-gradient flex items-center justify-center text-primary-foreground text-[10px] font-bold flex-shrink-0">
                      {(u.display_name || "U")[0].toUpperCase()}
                    </div>
                    {u.display_name || "—"}
                  </td>
                  <td className="p-3 text-muted-foreground">{u.email || "—"}</td>
                  <td className="p-3 hidden sm:table-cell">{u.phone || "—"}</td>
                  <td className="p-3 hidden md:table-cell">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${u.role === "admin" ? "bg-red-100 text-red-700" : u.role === "committee" ? "bg-blue-100 text-blue-700" : "bg-primary/10 text-primary"}`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="p-3 text-muted-foreground hidden lg:table-cell">{new Date(u.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
              {users.length === 0 && <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">No users found</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

// ─── Main Admin Component ───────────────────────────────
const Admin = () => {
  const { isAdmin, user, authLoading } = useAdminCheck();
  const [active, setActive] = useState("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { signOut } = useAuth();
  const navigate = useNavigate();

  if (authLoading || isAdmin === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-primary mx-auto mb-4" />
          <p className="text-sm text-muted-foreground">Verifying admin access...</p>
        </div>
      </div>
    );
  }

  const renderPanel = () => {
    switch (active) {
      case "dashboard": return <DashboardPanel />;
      case "events": return <EventsPanel />;
      case "gallery": return <GalleryPanel />;
      case "banners": return <BannersPanel />;
      case "projects": return <ProjectsPanel />;
      case "recent-work": return <RecentWorkPanel />;
      case "announcements": return <AnnouncementsPanel />;
      case "committee": return <CommitteePanel />;
      case "donations": return <DonationsPanel />;
      case "live-darshan": return <LiveDarshanPanel />;
      case "messages": return <MessagesPanel />;
      case "notifications": return <NotificationsPanel />;
      case "promotions": return <PromotionsPanel />;
      case "all-users": return <AllUsersPanel />;
      case "welcome-emails": return <WelcomeEmailsPanel />;
      default: return <DashboardPanel />;
    }
  };

  const handleLogout = async () => { await signOut(); navigate("/"); };
  const userEmail = user?.email ?? "";
  const userName = user?.user_metadata?.display_name ?? userEmail.split("@")[0];

  return (
    <div className="min-h-screen flex bg-background">
      {sidebarOpen && <div className="fixed inset-0 bg-foreground/40 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />}

      <aside className={`w-56 md:w-64 bg-card border-r border-border flex flex-col fixed inset-y-0 left-0 z-50 transition-transform duration-300 lg:translate-x-0 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="p-3 md:p-4 border-b border-border">
          <Link to="/" className="flex items-center gap-2 md:gap-3">
            <img src={templeLogo} alt="Logo" className="w-7 h-7 md:w-8 md:h-8 object-contain" />
            <div>
              <h4 className="font-display text-[10px] md:text-xs font-bold gold-text leading-tight">Admin Panel</h4>
              <p className="text-[9px] md:text-[10px] text-muted-foreground">Bada Jain Mandir</p>
            </div>
          </Link>
        </div>
        <nav className="flex-1 p-2 md:p-3 space-y-0.5 md:space-y-1 overflow-y-auto">
          {sidebarItems.map(item => (
            <button key={item.id} onClick={() => { setActive(item.id); setSidebarOpen(false); }}
              className={`w-full flex items-center gap-2 md:gap-3 px-2.5 md:px-3 py-2 md:py-2.5 rounded-xl text-xs md:text-sm font-medium transition-all ${active === item.id ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}>
              <item.icon className="w-3.5 h-3.5 md:w-4 md:h-4" />{item.label}
            </button>
          ))}
        </nav>
        <div className="p-3 md:p-4 border-t border-border space-y-2">
          <div className="flex items-center gap-2 md:gap-3">
            <div className="w-7 h-7 md:w-8 md:h-8 rounded-full gold-gradient flex items-center justify-center text-primary-foreground text-[10px] md:text-xs font-bold">
              <Shield className="w-3.5 h-3.5 md:w-4 md:h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] md:text-xs font-medium truncate">{userName}</p>
              <p className="text-[8px] md:text-[10px] text-muted-foreground truncate">{userEmail}</p>
            </div>
          </div>
          <button onClick={handleLogout} className="w-full flex items-center gap-2 px-2.5 md:px-3 py-1.5 md:py-2 text-[10px] md:text-xs text-destructive rounded-lg hover:bg-destructive/5 transition-colors">
            <LogOut className="w-3 h-3 md:w-3.5 md:h-3.5" /> Logout
          </button>
        </div>
      </aside>

      <main className="flex-1 lg:ml-64">
        <div className="lg:hidden sticky top-0 z-30 glass-card-strong p-2.5 md:p-3 flex items-center gap-2 md:gap-3">
          <button onClick={() => setSidebarOpen(true)} className="p-1.5 md:p-2 rounded-lg hover:bg-muted"><Menu className="w-5 h-5" /></button>
          <h4 className="font-display text-xs md:text-sm font-bold gold-text">Admin Panel</h4>
        </div>
        <div className="p-3 md:p-8">
          <motion.div key={active} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
            {renderPanel()}
          </motion.div>
        </div>
      </main>
    </div>
  );
};

export default Admin;
