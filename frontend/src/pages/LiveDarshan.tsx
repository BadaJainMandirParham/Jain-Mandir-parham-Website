import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Video, Radio, Loader2, ExternalLink } from "lucide-react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

const sb = supabase as any;

const LiveDarshan = () => {
  const { t } = useTranslation();
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data } = await sb.from("live_darshan_settings").select("*").limit(1).single();
      setSettings(data);
      setLoading(false);
    };
    load();

    // Realtime subscription for live status updates
    const channel = supabase
      .channel('live-darshan-status')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'live_darshan_settings' },
        (payload: any) => {
          setSettings((prev: any) => prev ? { ...prev, ...payload.new } : payload.new);
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const youtubeUrl = settings?.youtube_url || "https://www.youtube.com/embed/GgxAAJe2sMM";
  const isLive = settings?.is_live || false;

  // Convert embed URL to watch URL for external link
  const watchUrl = youtubeUrl.replace("/embed/", "/watch?v=");

  return (
    <div className="min-h-screen">
      <Header />
      <section className="pt-24 md:pt-28 pb-16 md:pb-20 section-padding bg-cream">
        <div className="container mx-auto max-w-5xl">
          <motion.div className="text-center mb-8 md:mb-12" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}>
            {isLive && (
              <div className="inline-flex items-center gap-2 px-3 md:px-4 py-1.5 md:py-2 rounded-full bg-red-50 text-red-600 text-xs md:text-sm font-medium mb-3 md:mb-4">
                <Radio className="w-3.5 h-3.5 md:w-4 md:h-4 animate-pulse" /> 🔴 LIVE NOW
              </div>
            )}
            {!isLive && (
              <div className="inline-flex items-center gap-2 px-3 md:px-4 py-1.5 md:py-2 rounded-full bg-muted text-muted-foreground text-xs md:text-sm font-medium mb-3 md:mb-4">
                <Video className="w-3.5 h-3.5 md:w-4 md:h-4" /> {t("liveDarshan.tag")}
              </div>
            )}
            <h2 className="font-display text-2xl md:text-5xl font-bold gold-text mb-3 md:mb-4">
              {settings?.title || t("liveDarshan.title")}
            </h2>
            <p className="text-sm md:text-base text-muted-foreground max-w-xl mx-auto">
              {settings?.description || t("liveDarshan.desc")}
            </p>
          </motion.div>

          {loading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : (
            <>
              <motion.div className="glass-card-strong overflow-hidden rounded-2xl md:rounded-3xl relative" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                {isLive && (
                  <div className="absolute top-4 left-4 z-10 flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-600 text-primary-foreground text-xs font-bold shadow-lg">
                    <span className="w-2 h-2 rounded-full bg-primary-foreground animate-pulse" /> LIVE
                  </div>
                )}
                <div className="aspect-video">
                  <iframe src={youtubeUrl} title="Temple Live Darshan" className="w-full h-full" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
                </div>
              </motion.div>

              {/* Watch on YouTube button */}
              <motion.div className="text-center mt-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
                <a href={watchUrl} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-border hover:bg-muted transition-colors text-sm font-medium">
                  <ExternalLink className="w-4 h-4" /> Watch on YouTube
                </a>
              </motion.div>
            </>
          )}

          <motion.div className="mt-6 md:mt-8 grid sm:grid-cols-2 md:grid-cols-3 gap-4 md:gap-6" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
            {[
              { icon: Video, title: t("liveDarshan.dailyAarti"), time: t("liveDarshan.aartiTime") },
              { icon: Radio, title: t("liveDarshan.liveStream"), time: settings?.schedule || t("liveDarshan.liveStreamTime") },
              { icon: Video, title: t("liveDarshan.templeBhajan"), time: t("liveDarshan.bhajanTime") },
            ].map((item) => (
              <div key={item.title} className="glass-card p-4 md:p-6 text-center hover-lift">
                <div className="w-10 h-10 md:w-12 md:h-12 mx-auto mb-2 md:mb-3 rounded-xl gold-gradient flex items-center justify-center">
                  <item.icon className="w-4 h-4 md:w-5 md:h-5 text-primary-foreground" />
                </div>
                <h4 className="font-display text-sm md:text-base font-bold mb-1">{item.title}</h4>
                <p className="text-[10px] md:text-xs text-muted-foreground">{item.time}</p>
              </div>
            ))}
          </motion.div>

          <motion.div className="mt-8 md:mt-12 text-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}>
            <h3 className="font-display text-lg md:text-xl font-bold mb-3 md:mb-4">{t("liveDarshan.youtubeChannel")}</h3>
            <a href="https://www.youtube.com/@jainmandirparham" target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-5 md:px-6 py-2.5 md:py-3 bg-red-600 text-primary-foreground font-semibold rounded-full hover:bg-red-700 transition-colors text-sm md:text-base">
              {t("liveDarshan.subscribe")}
            </a>
          </motion.div>
        </div>
      </section>
      <Footer />
    </div>
  );
};

export default LiveDarshan;
