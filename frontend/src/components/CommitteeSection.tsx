import { motion, useInView } from "framer-motion";
import { useRef, useState, useEffect, useCallback } from "react";
import { Phone, Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import useEmblaCarousel from "embla-carousel-react";
import Autoplay from "embla-carousel-autoplay";

const CommitteeSection = () => {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-100px" });
  const { t } = useTranslation();
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isMobile, setIsMobile] = useState(false);

  const [emblaRef, emblaApi] = useEmblaCarousel(
    { loop: true, align: "start", slidesToScroll: 1 },
    [Autoplay({ delay: 3000, stopOnInteraction: false, stopOnMouseEnter: true })]
  );

  const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi]);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  useEffect(() => {
    const load = async () => {
      const { data } = await (supabase as any).from("committee_public").select("*").order("display_order", { ascending: true });
      setMembers(data ?? []);
      setLoading(false);
    };
    load();
  }, []);

  const renderCard = (m: any, i: number) => {
    const initials = m.name?.split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase();
    return (
      <div className="relative overflow-hidden rounded-2xl md:rounded-3xl bg-background border border-border/50 shadow-md hover:shadow-xl transition-all duration-500 hover:-translate-y-1 md:hover:-translate-y-2 h-full">
        <div className="h-1 w-full gold-gradient" />
        <div className="p-4 md:p-6 text-center">
          <div className="relative mx-auto mb-3 md:mb-4 w-16 h-16 md:w-20 md:h-20">
            {m.image_url ? (
              <img src={m.image_url} alt={m.name} className="w-full h-full rounded-full object-cover shadow-md ring-2 ring-primary/20" />
            ) : (
              <div className="w-full h-full rounded-full gold-gradient flex items-center justify-center shadow-md ring-2 ring-primary/20">
                <span className="text-lg md:text-xl font-display font-bold text-primary-foreground">{initials}</span>
              </div>
            )}
          </div>
          <h4 className="font-display text-sm md:text-base font-bold mb-0.5 md:mb-1">{m.name}</h4>
          <p className="text-[10px] md:text-xs text-muted-foreground font-medium uppercase tracking-wider mb-3 md:mb-4">{m.position}</p>
          {m.phone && (
            <a
              href={`tel:${m.phone}`}
              className="inline-flex items-center gap-1.5 md:gap-2 px-3 md:px-4 py-1.5 md:py-2 text-[10px] md:text-xs font-semibold rounded-full gold-gradient text-primary-foreground shadow-sm hover:shadow-md hover:scale-105 transition-all duration-300"
            >
              <Phone className="w-3 h-3 md:w-3.5 md:h-3.5" /> {t("committee.callNow")}
            </a>
          )}
        </div>
      </div>
    );
  };

  const topRow = members.slice(0, 4);
  const bottomRow = members.slice(4);

  return (
    <section id="committee" className="section-padding bg-cream" ref={ref}>
      <div className="container mx-auto max-w-6xl">
        <motion.div
          className="text-center mb-12 md:mb-16"
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7 }}
        >
          <h3 className="font-heading text-base md:text-lg text-primary tracking-widest uppercase mb-3">{t("committee.tag")}</h3>
          <h2 className="font-display text-2xl md:text-5xl font-bold gold-text">{t("committee.title")}</h2>
        </motion.div>

        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
        ) : isMobile ? (
          /* Mobile: Auto-sliding carousel */
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6 }}
            className="relative"
          >
            <div className="overflow-hidden" ref={emblaRef}>
              <div className="flex -ml-3">
                {members.map((m, i) => (
                  <div key={m.id} className="min-w-0 shrink-0 grow-0 basis-[75%] pl-3">
                    {renderCard(m, i)}
                  </div>
                ))}
              </div>
            </div>
            {/* Nav arrows */}
            <button onClick={scrollPrev} className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1 z-10 w-8 h-8 rounded-full bg-background/90 border border-border shadow-md flex items-center justify-center">
              <ChevronLeft className="w-4 h-4 text-foreground" />
            </button>
            <button onClick={scrollNext} className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1 z-10 w-8 h-8 rounded-full bg-background/90 border border-border shadow-md flex items-center justify-center">
              <ChevronRight className="w-4 h-4 text-foreground" />
            </button>
          </motion.div>
        ) : (
          /* Desktop: Grid layout */
          <div className="space-y-4 md:space-y-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
              {topRow.map((m, i) => (
                <motion.div key={m.id} className="group" initial={{ opacity: 0, y: 40 }} animate={inView ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.6, delay: i * 0.08 }}>
                  {renderCard(m, i)}
                </motion.div>
              ))}
            </div>
            {bottomRow.length > 0 && (
              <div className="flex justify-center">
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 w-full lg:max-w-[75%]">
                  {bottomRow.map((m, i) => {
                    const isLastAndOdd = i === bottomRow.length - 1 && bottomRow.length % 2 !== 0;
                    if (isLastAndOdd) {
                      return (
                        <div key={m.id} className="col-span-2 lg:col-span-1 flex justify-center">
                          <div className="w-[calc(50%-0.5rem)] lg:w-full">
                            <motion.div className="group" initial={{ opacity: 0, y: 40 }} animate={inView ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.6, delay: (topRow.length + i) * 0.08 }}>
                              {renderCard(m, topRow.length + i)}
                            </motion.div>
                          </div>
                        </div>
                      );
                    }
                    return (
                      <motion.div key={m.id} className="group" initial={{ opacity: 0, y: 40 }} animate={inView ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.6, delay: (topRow.length + i) * 0.08 }}>
                        {renderCard(m, topRow.length + i)}
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
};

export default CommitteeSection;
