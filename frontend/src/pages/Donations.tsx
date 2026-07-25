import { useEffect, useState, useRef } from "react";
import { motion } from "framer-motion";
import { Heart, CreditCard, Smartphone, Download, CheckCircle, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { backendBaseUrl, apiBaseUrl, supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import templeLogo from "@/assets/temple-logo.png";

const sb = supabase as any;

const purposes = [
  "General Donation",
  "Temple Renovation",
  "Sandhya Aarti",
  "RO Water Service",
  "Ek Divasiya Mela",
  "Gau Seva",
  "Jain Festival Support",
  "Library Development",
  "Food Distribution",
];

const websiteUrl = "https://jainmandirparham.netlify.app/";

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => { open: () => void };
  }
}

interface ReceiptData {
  id: string; name: string; email: string; phone: string; amount: string; purpose: string; date: string; method: string;
  order_id?: string;
  payment_id?: string;
}

const loadRazorpayScript = () => new Promise<boolean>((resolve) => {
  if (window.Razorpay) {
    resolve(true);
    return;
  }
  const script = document.createElement("script");
  script.src = "https://checkout.razorpay.com/v1/checkout.js";
  script.async = true;
  script.onload = () => resolve(true);
  script.onerror = () => resolve(false);
  document.body.appendChild(script);
});

const DonationReceipt = ({ data, onClose }: { data: ReceiptData; onClose: () => void }) => {
  const { t } = useTranslation();
  const receiptRef = useRef<HTMLDivElement>(null);

  const handleDownload = () => {
    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(`
        <html><head><title>Donation Receipt - ${data.id}</title>
        <style>body{font-family:'Georgia',serif;padding:40px;max-width:620px;margin:0 auto;color:#2c2c2c;background:#f7f3ed}.container{background:#fff;border-radius:28px;box-shadow:0 24px 60px rgba(0,0,0,.08);overflow:hidden}.header{text-align:center;background:#f2e6c9;padding:30px 24px;border-bottom:1px solid #e0c38d}.header h1{color:#b8860b;font-size:24px;margin:0}.header p{margin:10px 0 0;color:#5f4a2d;font-size:14px;line-height:1.6}.source{background:#fffdf5;color:#78350f;padding:10px 14px;border-radius:12px;display:inline-block;font-size:12px;font-weight:bold;margin:18px 0;border:1px solid #f0e0b6}.details{padding:28px 28px 24px}.row{display:flex;justify-content:space-between;padding:12px 0;border-bottom:1px solid #f2e6d1;gap:16px}.label{color:#6c5843;font-size:14px}.value{font-weight:700;font-size:14px;text-align:right;word-break:break-word;color:#2c2c2c}.amount-row{background:#faf3e7;padding:22px;border-radius:18px;margin:24px 0;text-align:center}.amount{font-size:34px;color:#b8860b;font-weight:800}.payment-badge{display:inline-flex;align-items:center;gap:10px;padding:10px 14px;background:#eef3ff;border:1px solid #d3e0ff;border-radius:999px;font-weight:700;color:#1f3d94;font-size:13px}.payment-badge svg{display:block;width:22px;height:22px}.sign{margin-top:30px;text-align:left;font-size:13px;line-height:1.7;color:#4f4f4f}.sign-line{font-family:monospace;letter-spacing:.5px}.sign-name{margin-top:12px;font-weight:800;letter-spacing:.7px}.footer{text-align:center;margin-top:28px;padding:24px 24px 30px;border-top:1px solid #e2d6bf;font-size:12px;color:#75624a}.footer p{margin:6px 0}.brand-title{font-size:15px;color:#5f4a2d;margin-top:14px;line-height:1.5}</style></head><body>
        <div class="container"><div class="header"><img src="${templeLogo}" alt="Bada Jain Mandir Parham Logo" style="max-width:84px;height:auto;margin:0 auto 18px;display:block;" /><h1>Shri Parshwanath Digambar Bada Jain Mandir Parham</h1><p class="brand-title">श्री 1008 पार्श्वनाथ दिगम्बर बड़ा जैन मन्दिर पाढ़म</p><div class="source">Donation Reference: Payment received through official website - ${websiteUrl}</div></div>
        <div class="details"><h2 style="text-align:center;color:#b8860b;margin:0 0 22px;font-size:22px;letter-spacing:.6px;">Donation Receipt</h2>
        <div class="row"><span class="label">Receipt No.</span><span class="value">${data.id}</span></div>
        <div class="row"><span class="label">Date</span><span class="value">${data.date}</span></div>
        <div class="row"><span class="label">Donor</span><span class="value">${data.name}</span></div>
        <div class="row"><span class="label">Email</span><span class="value">${data.email}</span></div>
        <div class="row"><span class="label">Phone</span><span class="value">${data.phone}</span></div>
        <div class="row"><span class="label">Order ID</span><span class="value">${data.order_id || ''}</span></div>
        <div class="row"><span class="label">Payment ID</span><span class="value">${data.payment_id || ''}</span></div>
        <div class="row"><span class="label">Purpose</span><span class="value">${data.purpose}</span></div>
        <div class="row"><span class="label">Method</span><span class="value">${data.method}</span></div>
        <div class="amount-row"><div class="amount">INR ${data.amount}</div></div>
        <div class="payment-badge"><svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M4 12.5C4 8.91 6.91 6 10.5 6H13.5C17.09 6 20 8.91 20 12.5C20 16.09 17.09 19 13.5 19H10.5C6.91 19 4 16.09 4 12.5Z" fill="#dbe5ff"/><path d="M12.272 14.94L16.292 10.92L15.127 9.76L12.272 12.62L10.87 11.22L9.705 12.39L12.272 14.94Z" fill="#1f3d94"/></svg>Razorpay</div>
        <div class="sign"><div class="sign-line">__________________________________</div><div>Authorized Signatory</div><div class="sign-name">ARPAN JAIN</div><div>Head – IT & Media</div><div>(Web & App Development)</div></div>
        <div class="footer"><p>This receipt was generated automatically through the official website.</p><p>${websiteUrl}</p><p>Shri पार्श्वनाथ दिगम्बर बड़ा जैन मन्दिर पाढ़म</p></div></div></body></html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  };

  return (
    <motion.div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/50 backdrop-blur-sm p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <motion.div ref={receiptRef} className="bg-background rounded-3xl shadow-2xl max-w-md w-full p-6 md:p-8 relative max-h-[90vh] overflow-y-auto" initial={{ scale: 0.8, y: 50 }} animate={{ scale: 1, y: 0 }}>
        <button onClick={onClose} className="absolute top-4 right-4 p-2 rounded-full hover:bg-muted"><X className="w-5 h-5" /></button>
        <div className="text-center mb-4 md:mb-6">
          <img src={templeLogo} alt="Logo" className="w-14 h-14 md:w-16 md:h-16 mx-auto mb-3 object-contain" />
          <h3 className="font-display text-lg font-bold gold-text">{t("donations.receipt")}</h3>
          <div className="mt-2 inline-block px-3 py-1 bg-amber-50 text-amber-700 rounded-full text-[10px] md:text-xs font-bold border border-amber-200">Website Payment</div>
        </div>
        <div className="w-14 h-14 md:w-16 md:h-16 mx-auto mb-4 rounded-full bg-emerald-50 flex items-center justify-center">
          <CheckCircle className="w-7 h-7 md:w-8 md:h-8 text-emerald-500" />
        </div>
        <div className="space-y-2 md:space-y-3 text-sm">
          {[["Receipt No.", data.id], ["Date", data.date], ["Donor", data.name], ["Email", data.email], ["Phone", data.phone], ["Order ID", data.order_id || "—"], ["Payment ID", data.payment_id || "—"], ["Purpose", data.purpose], ["Method", data.method]].map(([l, v]) => (
            <div key={l} className="flex justify-between py-1.5 md:py-2 border-b border-border gap-4">
              <span className="text-muted-foreground text-xs md:text-sm">{l}</span>
              <span className="font-medium text-xs md:text-sm text-right break-words">{v}</span>
            </div>
          ))}
        </div>
        <div className="my-4 md:my-6 p-3 md:p-4 rounded-2xl bg-primary/5 text-center">
          <p className="text-3xl font-display font-bold gold-text">INR {data.amount}</p>
        </div>
        <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-center text-[11px] md:text-xs text-amber-800">
          Donation Reference: Payment received through official website - {websiteUrl}
        </div>
        <div className="mb-5 text-xs md:text-sm text-foreground leading-relaxed">
          <div className="font-mono text-muted-foreground">__________________________________</div>
          <div className="mt-1 text-muted-foreground">Authorized Signatory</div>
          <div className="mt-2 font-bold tracking-wide">ARPAN JAIN</div>
          <div>Head – IT &amp; Media</div>
          <div>(Web &amp; App Development)</div>
        </div>
        <button onClick={handleDownload} className="w-full py-2.5 md:py-3 gold-gradient text-primary-foreground font-semibold rounded-xl flex items-center justify-center gap-2 hover:scale-[1.02] transition-transform">
          <Download className="w-4 h-4" /> {t("donations.downloadReceipt")}
        </button>
      </motion.div>
    </motion.div>
  );
};
const Donations = () => {
  const [form, setForm] = useState({ name: "", email: "", phone: "", amount: "", purpose: purposes[0] });
  const [method, setMethod] = useState("UPI");
  const [receipt, setReceipt] = useState<ReceiptData | null>(null);
  const [processing, setProcessing] = useState(false);
  const { user } = useAuth();
  const { t } = useTranslation();

  useEffect(() => {
    if (!user) return;
    setForm((current) => ({
      ...current,
      name: current.name || user.user_metadata?.display_name || user.email?.split("@")[0] || "",
      email: current.email || user.email || "",
      phone: current.phone || user.user_metadata?.phone || "",
    }));
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setProcessing(true);

    const receiptId = `BJMP-${Date.now().toString(36).toUpperCase()}`;
    const donorName = form.name.trim();
    const donorEmail = form.email.trim();
    const donorPhone = form.phone.trim();
    const amount = Number(form.amount);

    try {
      if (!donorName || !donorEmail) throw new Error("Name aur email required hai");
      if (!amount || amount < 1) throw new Error("Donation amount kam se kam 1 hona chahiye");

      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(`${apiBaseUrl}/donations/create-order`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({
          donor_name: donorName,
          donor_email: donorEmail,
          donor_phone: donorPhone,
          amount,
          purpose: form.purpose,
          metadata: { website_receipt_id: receiptId, method },
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || data.detail || data.message || "Unable to create payment order");

      const orderReceiptId = data.receipt_id || receiptId;

      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded || !window.Razorpay) throw new Error("Razorpay checkout load nahi ho pa raha hai");
      if (!data.key_id && !data.razorpayKey) throw new Error("Razorpay key backend se nahi aa rahi hai. RAZORPAY_KEY_ID check karo.");

      const checkout = new window.Razorpay({
        key: data.key_id || data.razorpayKey,
        amount: data.amount,
        currency: data.currency || "INR",
        name: "Shri Parshwanath Digambar Bada Jain Mandir Parham",
        description: form.purpose,
        order_id: data.order_id || data.orderId,
        prefill: {
          name: donorName,
          email: donorEmail,
          contact: donorPhone,
        },
        notes: {
          website: websiteUrl,
          donation_id: data.donation_id,
          receipt_id: orderReceiptId,
        },
        theme: { color: "#B88722" },
        handler: async (payment: any) => {
          try {
            const verifyResponse = await fetch(`${apiBaseUrl}/donations/verify-browser`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
              },
              body: JSON.stringify(payment),
            });
            const verifyData = await verifyResponse.json().catch(() => ({}));
            if (!verifyResponse.ok) throw new Error(verifyData.error || verifyData.message || "Payment verification failed");
            setReceipt({
              id: verifyData.receipt?.id || verifyData.receipt_id || orderReceiptId,
              name: donorName,
              email: donorEmail,
              phone: donorPhone,
              amount: String(amount),
              purpose: form.purpose,
              date: new Date().toLocaleString("en-IN"),
              method,
              order_id: verifyData.donation?.razorpay_order_id || payment.razorpay_order_id || orderReceiptId,
              payment_id: verifyData.donation?.razorpay_payment_id || payment.razorpay_payment_id || "",
            });
            toast.success("Donation successful");
          } catch (error: any) {
            toast.error(error.message || "Payment verification failed");
          } finally {
            setProcessing(false);
          }
        },
        modal: {
          ondismiss: () => {
            setProcessing(false);
            toast.info("Payment cancelled");
          },
        },
      });

      checkout.open();
    } catch (error: any) {
      toast.error(error.message || "Donation failed");
      setProcessing(false);
    }
  };

  return (
    <div className="min-h-screen">
      <Header />
      <section className="pt-24 md:pt-28 pb-16 md:pb-20 section-padding bg-cream">
        <div className="container mx-auto max-w-4xl">
          <motion.div className="text-center mb-8 md:mb-12" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}>
            <h3 className="font-heading text-base md:text-lg text-primary tracking-widest uppercase mb-3">{t("donations.tag")}</h3>
            <h2 className="font-display text-2xl md:text-5xl font-bold gold-text mb-3 md:mb-4">{t("donations.title")}</h2>
            <p className="text-sm md:text-base text-muted-foreground max-w-xl mx-auto">{t("donations.desc")}</p>
          </motion.div>

          <motion.form onSubmit={handleSubmit} className="glass-card-strong p-6 md:p-10 space-y-5 md:space-y-6" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <div className="p-2.5 md:p-3 rounded-xl bg-amber-50 text-amber-700 text-xs md:text-sm text-center font-medium border border-amber-200">
              Secure payment through official website - {websiteUrl}
            </div>

            <div className="grid md:grid-cols-2 gap-4 md:gap-5">
              {[
                { name: "name", label: t("donations.fullName"), type: "text", placeholder: t("contact.enterName") },
                { name: "email", label: t("donations.email"), type: "email", placeholder: "your@email.com" },
                { name: "phone", label: t("donations.phone"), type: "tel", placeholder: "+91 XXXXXXXXXX" },
                { name: "amount", label: t("donations.amount"), type: "number", placeholder: "Enter amount" },
              ].map((field) => (
                <div key={field.name}>
                  <label className="block text-xs md:text-sm font-medium mb-1.5">{field.label}</label>
                  <input name={field.name} type={field.type} required value={form[field.name as keyof typeof form]} onChange={(e) => setForm({ ...form, [field.name]: e.target.value })}
                    className="w-full px-4 py-2.5 md:py-3 rounded-xl border border-border bg-background/50 focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm" placeholder={field.placeholder} />
                </div>
              ))}
            </div>

            <div>
              <label className="block text-xs md:text-sm font-medium mb-1.5">{t("donations.purpose")}</label>
              <select value={form.purpose} onChange={(e) => setForm({ ...form, purpose: e.target.value })}
                className="w-full px-4 py-2.5 md:py-3 rounded-xl border border-border bg-background/50 focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm">
                {purposes.map((p) => (<option key={p}>{p}</option>))}
              </select>
            </div>

            <div>
              <label className="block text-xs md:text-sm font-medium mb-2 md:mb-3">{t("donations.paymentMethod")}</label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3">
                {[
                  { id: "UPI", icon: Smartphone, label: "UPI" },
                  { id: "Card", icon: CreditCard, label: "Credit/Debit" },
                  { id: "Net Banking", icon: CreditCard, label: "Net Banking" },
                  { id: "Other", icon: Heart, label: "Other" },
                ].map((m) => (
                  <button key={m.id} type="button" onClick={() => setMethod(m.id)}
                    className={`p-3 md:p-4 rounded-xl border-2 text-center transition-all ${method === m.id ? "border-primary bg-primary/5 text-primary" : "border-border hover:border-primary/30"}`}>
                    <m.icon className="w-4 h-4 md:w-5 md:h-5 mx-auto mb-1" />
                    <span className="text-[10px] md:text-xs font-medium">{m.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <button type="submit" disabled={processing}
              className="w-full py-3 md:py-4 gold-gradient text-primary-foreground font-bold rounded-xl glow-gold-hover transition-all duration-300 flex items-center justify-center gap-2 hover:scale-[1.02] disabled:opacity-60">
              {processing ? (
                <><div className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" /> {t("donations.processing")}</>
              ) : (
                <><Heart className="w-5 h-5" /> {t("donations.donateNow")}</>
              )}
            </button>
          </motion.form>
        </div>
      </section>
      <Footer />
      {receipt && <DonationReceipt data={receipt} onClose={() => setReceipt(null)} />}
    </div>
  );
};

export default Donations;
