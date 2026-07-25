import { motion, useInView } from "framer-motion";
import { useRef, useState } from "react";
import { Send, Phone, Mail, MapPin, Facebook, MessageCircle } from "lucide-react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const ContactSection = () => {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-100px" });
  const [form, setForm] = useState({ name: "", email: "", subject: "", message: "" });
  const [submitted, setSubmitted] = useState(false);
  const [sending, setSending] = useState(false);
  const { t } = useTranslation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    const { error } = await (supabase as any).from("contact_messages").insert(form);
    setSending(false);
    if (error) { toast.error(t("contact.failed")); return; }
    toast.success(t("contact.success"));
    setSubmitted(true);
    setTimeout(() => setSubmitted(false), 3000);
    setForm({ name: "", email: "", subject: "", message: "" });
  };

  return (
    <section id="contact" className="section-padding bg-cream" ref={ref}>
      <div className="container mx-auto max-w-6xl">
        <motion.div className="text-center mb-10 md:mb-16" initial={{ opacity: 0, y: 30 }} animate={inView ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.7 }}>
          <h3 className="font-heading text-base md:text-lg text-primary tracking-widest uppercase mb-3">{t("contact.tag")}</h3>
          <h2 className="font-display text-2xl md:text-5xl font-bold gold-text">{t("contact.title")}</h2>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-8 md:gap-12">
          <motion.form onSubmit={handleSubmit} className="glass-card-strong p-6 md:p-8 space-y-4 md:space-y-5" initial={{ opacity: 0, x: -30 }} animate={inView ? { opacity: 1, x: 0 } : {}} transition={{ duration: 0.7, delay: 0.2 }}>
            {submitted && (
              <div className="p-3 md:p-4 rounded-xl bg-emerald-50 text-emerald-700 text-xs md:text-sm font-medium text-center">
                ✅ {t("contact.success")}
              </div>
            )}
            {[
              { key: "name", label: t("contact.name"), type: "text", placeholder: t("contact.enterName") },
              { key: "email", label: t("contact.email"), type: "email", placeholder: t("contact.enterEmail") },
              { key: "subject", label: t("contact.subject"), type: "text", placeholder: t("contact.enterSubject") },
            ].map((field) => (
              <div key={field.key}>
                <label className="block text-sm font-medium mb-1.5">{field.label}</label>
                <input
                  type={field.type}
                  value={form[field.key as keyof typeof form]}
                  onChange={(e) => setForm({ ...form, [field.key]: e.target.value })}
                  required
                  className="w-full px-4 py-2.5 md:py-3 rounded-xl border border-border bg-background/50 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all text-sm"
                  placeholder={field.placeholder}
                />
              </div>
            ))}
            <div>
              <label className="block text-sm font-medium mb-1.5">{t("contact.message")}</label>
              <textarea value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} required rows={4}
                className="w-full px-4 py-2.5 md:py-3 rounded-xl border border-border bg-background/50 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all text-sm resize-none"
                placeholder={t("contact.enterMessage")} />
            </div>
            <button type="submit" className="w-full py-2.5 md:py-3 gold-gradient text-primary-foreground font-semibold rounded-xl glow-gold-hover transition-all duration-300 flex items-center justify-center gap-2 hover:scale-[1.02]">
              <Send className="w-4 h-4" /> {t("contact.send")}
            </button>
          </motion.form>

          <motion.div className="space-y-4 md:space-y-6" initial={{ opacity: 0, x: 30 }} animate={inView ? { opacity: 1, x: 0 } : {}} transition={{ duration: 0.7, delay: 0.4 }}>
            {[
              { icon: MapPin, label: t("contact.location"), value: "Parham, Uttar Pradesh, India" },
              { icon: Phone, label: t("contact.phone"), value: "+91 6399003541", href: "tel:+916399003541" },
              { icon: Mail, label: t("contact.email"), value: "badajainmandirparham@gmail.com", href: "mailto:badajainmandirparham@gmail.com" },
              { icon: Facebook, label: "Facebook Page", value: "Follow official temple updates", href: "https://www.facebook.com/share/1Cvqd1HPga/" },
              { icon: MessageCircle, label: "Facebook Channel", value: "Join temple channel", href: "https://www.facebook.com/share/1Cpb6FHeAG/" },
            ].map((item) => (
              <div key={item.label} className="glass-card p-4 md:p-6 hover-lift flex items-start gap-3 md:gap-4">
                <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl gold-gradient flex items-center justify-center flex-shrink-0">
                  <item.icon className="w-4 h-4 md:w-5 md:h-5 text-primary-foreground" />
                </div>
                <div>
                  <h4 className="font-display text-sm md:text-base font-bold mb-1">{item.label}</h4>
                  {item.href ? (
                    <a href={item.href} className="text-xs md:text-sm text-muted-foreground hover:text-primary transition-colors">{item.value}</a>
                  ) : (
                    <p className="text-xs md:text-sm text-muted-foreground">{item.value}</p>
                  )}
                </div>
              </div>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default ContactSection;
