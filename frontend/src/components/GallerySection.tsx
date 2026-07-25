import { motion, useInView } from "framer-motion";
import { useRef, useState, useEffect } from "react";
import { X, Image as ImageIcon, Loader2, ChevronRight, Play } from "lucide-react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";

const INITIAL_COUNT = 6;

const GallerySection = () => {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-100px" });
  const [filter, setFilter] = useState("All");
  const [lightbox, setLightbox] = useState<{ url: string; type: string } | null>(null);
  const [photos, setPhotos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAll, setShowAll] = useState(false);
  const { t } = useTranslation();

  useEffect(() => {
    const load = async () => {
      const { data } = await (supabase as any).from("gallery").select("*").order("created_at", { ascending: false });
      setPhotos(data ?? []);
      setLoading(false);
    };
    load();
  }, []);

  const isVideo = (item: any) => {
    const url = (item.url || "").toLowerCase();
    return item.type === "video" || url.includes("youtube.com") || url.includes("youtu.be") || url.match(/\.(mp4|webm|ogg)$/);
  };

  const isYouTube = (url: string) => url.includes("youtube.com") || url.includes("youtu.be");

  const getYouTubeEmbedUrl = (url: string) => {
    const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([\w-]+)/);
    return match ? `https://www.youtube.com/embed/${match[1]}` : url;
  };

  const getYouTubeThumbnail = (url: string) => {
    const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([\w-]+)/);
    return match ? `https://img.youtube.com/vi/${match[1]}/hqdefault.jpg` : "";
  };

  const categories = [t("gallery.all"), ...Array.from(new Set(photos.map(p => p.type)))];
  const filtered = filter === t("gallery.all") ? photos : photos.filter((p) => p.type === filter);
  const displayPhotos = showAll ? filtered : filtered.slice(0, INITIAL_COUNT);
  const hasMore = filtered.length > INITIAL_COUNT;

  return (
    <section id="gallery" className="section-padding bg-cream" ref={ref}>
      <div className="container mx-auto max-w-6xl">
        <motion.div className="text-center mb-8 md:mb-12" initial={{ opacity: 0, y: 30 }} animate={inView ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.7 }}>
          <h3 className="font-heading text-base md:text-lg text-primary tracking-widest uppercase mb-3">{t("gallery.tag")}</h3>
          <h2 className="font-display text-2xl md:text-5xl font-bold gold-text">{t("gallery.title")}</h2>
        </motion.div>

        {photos.length > 0 && (
          <div className="flex justify-center gap-2 mb-8 md:mb-10 flex-wrap">
            {categories.map((c) => (
              <button key={c} onClick={() => { setFilter(c); setShowAll(false); }} className={`px-4 md:px-5 py-1.5 md:py-2 text-xs md:text-sm font-medium rounded-full transition-all duration-300 ${filter === c ? "gold-gradient text-primary-foreground glow-gold" : "bg-sand hover:bg-sand-dark text-foreground/70"}`}>
                {c}
              </button>
            ))}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
        ) : displayPhotos.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-foreground/50">
            <ImageIcon className="w-12 h-12 mb-4 opacity-40" />
            <p className="text-sm md:text-base font-medium">{t("gallery.empty")}</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
              {displayPhotos.map((photo, i) => (
                <motion.div
                  key={photo.id}
                  className="relative rounded-xl md:rounded-2xl overflow-hidden cursor-pointer group aspect-[4/3]"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={inView ? { opacity: 1, scale: 1 } : {}}
                  transition={{ duration: 0.5, delay: i * 0.05 }}
                  onClick={() => setLightbox({ url: photo.url, type: isVideo(photo) ? "video" : "image" })}
                >
                  {isVideo(photo) ? (
                    <>
                      {isYouTube(photo.url) ? (
                        <img src={getYouTubeThumbnail(photo.url)} alt={photo.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                      ) : (
                        <video src={photo.url} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" muted preload="metadata" />
                      )}
                      <div className="absolute inset-0 bg-foreground/10 group-hover:bg-foreground/30 transition-colors duration-300 flex items-center justify-center">
                        <div className="w-12 h-12 rounded-full bg-primary/80 flex items-center justify-center opacity-90 group-hover:opacity-100 group-hover:scale-110 transition-all">
                          <Play className="w-5 h-5 text-primary-foreground ml-0.5" fill="currentColor" />
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      <img src={photo.url} alt={photo.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                      <div className="absolute inset-0 bg-foreground/0 group-hover:bg-foreground/30 transition-colors duration-300 flex items-center justify-center">
                        <ImageIcon className="w-6 h-6 md:w-8 md:h-8 text-primary-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </>
                  )}
                  <div className="absolute bottom-0 left-0 right-0 p-2 md:p-3 bg-gradient-to-t from-foreground/60 to-transparent">
                    <span className="text-xs md:text-sm font-medium text-primary-foreground">{photo.title}</span>
                  </div>
                </motion.div>
              ))}
            </div>

            {hasMore && !showAll && (
              <motion.div className="flex justify-center mt-8" initial={{ opacity: 0 }} animate={inView ? { opacity: 1 } : {}} transition={{ delay: 0.4 }}>
                <button onClick={() => setShowAll(true)} className="group px-6 md:px-8 py-3 md:py-3.5 gold-gradient text-primary-foreground font-semibold rounded-full text-sm md:text-base flex items-center gap-2 shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300">
                  {t("gallery.viewMore", "View More")}
                  <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </button>
              </motion.div>
            )}

            {showAll && hasMore && (
              <motion.div className="flex justify-center mt-8" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <button onClick={() => setShowAll(false)} className="px-6 py-3 bg-sand hover:bg-sand-dark text-foreground/70 font-medium rounded-full text-sm transition-all duration-300">
                  Show Less
                </button>
              </motion.div>
            )}
          </>
        )}

        <motion.div className="mt-10 md:mt-16" initial={{ opacity: 0, y: 30 }} animate={inView ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.7, delay: 0.5 }}>
          <h3 className="font-display text-xl md:text-2xl font-bold text-center mb-6 md:mb-8 gold-text">{t("gallery.templeBhajan")}</h3>
          <div className="max-w-3xl mx-auto rounded-2xl overflow-hidden glow-gold aspect-video">
            <iframe src="https://www.youtube.com/embed/GgxAAJe2sMM?si=JmW_sfkJiPDfpUu6" title="Temple Bhajan" frameBorder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerPolicy="strict-origin-when-cross-origin" allowFullScreen className="w-full h-full" />
          </div>
        </motion.div>
      </div>

      {/* Lightbox */}
      {lightbox && (
        <motion.div className="fixed inset-0 z-50 bg-foreground/90 flex items-center justify-center p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} onClick={() => setLightbox(null)}>
          <button className="absolute top-4 md:top-6 right-4 md:right-6 text-primary-foreground z-10" onClick={() => setLightbox(null)}><X className="w-6 h-6 md:w-8 md:h-8" /></button>
          <div className="max-w-full max-h-[85vh] w-full flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
            {lightbox.type === "video" ? (
              isYouTube(lightbox.url) ? (
                <div className="w-full max-w-4xl aspect-video rounded-xl overflow-hidden">
                  <iframe src={getYouTubeEmbedUrl(lightbox.url) + "?autoplay=1"} title="Video" frameBorder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen className="w-full h-full" />
                </div>
              ) : (
                <video src={lightbox.url} controls autoPlay className="max-w-full max-h-[85vh] rounded-xl" />
              )
            ) : (
              <img src={lightbox.url} alt="" className="max-w-full max-h-[85vh] rounded-xl object-contain" />
            )}
          </div>
        </motion.div>
      )}
    </section>
  );
};

export default GallerySection;
