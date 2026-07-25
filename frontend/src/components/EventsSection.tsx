import { motion, useInView } from "framer-motion";
import { useRef, useState, useEffect } from "react";
import { Calendar, MapPin, Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { ScrollArea } from "@/components/ui/scroll-area";

const PAST_VISIBLE = 5;
const PAST_SCROLL_HEIGHT = 480;

const EventsSection = () => {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-100px" });
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  // removed pastOpen state - always visible now
  const { t } = useTranslation();

  useEffect(() => {
    const load = async () => {
      const { data } = await (supabase as any).from("events").select("*").order("event_date", { ascending: false });
      setEvents(data ?? []);
      setLoading(false);
    };
    load();
  }, []);

  const upcoming = events.filter((e) => e.status === "upcoming" || e.status === "ongoing");
  const past = events.filter((e) => e.status === "completed");

  const EventCard = ({ e, isPast = false }: { e: any; isPast?: boolean }) => (
    <div className={`glass-card${isPast ? "" : "-strong"} p-4 md:p-6 flex flex-col md:flex-row md:items-center gap-3 md:gap-4 ${isPast ? "" : "hover-lift"}`}>
      {e.image_url ? (
        <div className="w-12 h-12 md:w-14 md:h-14 rounded-xl overflow-hidden flex-shrink-0">
          <img src={e.image_url} alt={e.title} className="w-full h-full object-cover" />
        </div>
      ) : (
        <div className={`w-12 h-12 md:w-14 md:h-14 rounded-xl ${isPast ? "bg-muted" : "gold-gradient"} flex items-center justify-center flex-shrink-0`}>
          <Calendar className={`w-5 h-5 md:w-6 md:h-6 ${isPast ? "text-muted-foreground" : "text-primary-foreground"}`} />
        </div>
      )}
      <div className="flex-1">
        <h4 className="font-display text-base md:text-lg font-bold">{e.title}</h4>
        {e.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{e.description}</p>}
        <div className="flex flex-wrap gap-3 md:gap-4 mt-1 md:mt-2 text-xs md:text-sm text-muted-foreground">
          {e.event_date && <span className="flex items-center gap-1"><Calendar className="w-3 h-3 md:w-3.5 md:h-3.5" />{new Date(e.event_date).toLocaleDateString()}</span>}
          {e.location && <span className="flex items-center gap-1"><MapPin className="w-3 h-3 md:w-3.5 md:h-3.5" />{e.location}</span>}
        </div>
      </div>
      {!isPast && (
        <span className="text-xs font-medium px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 self-start">
          {e.status === "ongoing" ? t("events.ongoing") : t("events.upcoming")}
        </span>
      )}
      {isPast && (
        <span className="text-xs font-medium px-3 py-1 rounded-full bg-muted text-muted-foreground self-start">
          {t("events.completedLabel", "Completed")}
        </span>
      )}
    </div>
  );

  return (
    <section id="events" className="section-padding" ref={ref}>
      <div className="container mx-auto max-w-5xl">
        <motion.div className="text-center mb-10 md:mb-16" initial={{ opacity: 0, y: 30 }} animate={inView ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.7 }}>
          <h3 className="font-heading text-base md:text-lg text-primary tracking-widest uppercase mb-3">{t("events.tag")}</h3>
          <h2 className="font-display text-2xl md:text-5xl font-bold gold-text">{t("events.title")}</h2>
        </motion.div>

        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
        ) : events.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">{t("events.noEvents")}</p>
        ) : (
          <div className="space-y-8 md:space-y-12">
            {/* Upcoming */}
            {upcoming.length > 0 && (
              <div>
                <h3 className="font-display text-lg md:text-xl font-bold mb-4 md:mb-6 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" /> {t("events.upcoming")}
                </h3>
                <div className="space-y-3 md:space-y-4">
                  {upcoming.map((e, i) => (
                    <motion.div key={e.id} initial={{ opacity: 0, x: -30 }} animate={inView ? { opacity: 1, x: 0 } : {}} transition={{ duration: 0.5, delay: i * 0.1 }}>
                      <EventCard e={e} />
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            {/* Past Events */}
            {past.length > 0 && (
              <div>
                <h3 className="font-display text-lg md:text-xl font-bold mb-4 md:mb-6 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-muted-foreground" />
                  {t("events.past")} ({past.length})
                </h3>
                <div className="rounded-2xl border-2 border-border/40 bg-background/50 p-3 md:p-5">
                  <ScrollArea className={past.length > PAST_VISIBLE ? "h-[460px]" : ""}>
                    <div className="space-y-3 md:space-y-4 opacity-80 pr-2">
                      {past.map((e) => <EventCard key={e.id} e={e} isPast />)}
                    </div>
                  </ScrollArea>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
};

export default EventsSection;
