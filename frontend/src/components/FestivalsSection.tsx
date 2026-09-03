import { motion, useInView } from "framer-motion";
import { CalendarDays, ChevronRight, Loader2, Sparkles } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiBaseUrl } from "@/integrations/supabase/client";

const todayText = () => new Date().toISOString().slice(0, 10);
const INITIAL_VISIBLE = 5;
let festivalsCache: any[] | null = null;

export const getFestivalStatus = (festival: any) => {
  const today = todayText();
  if (festival.status) return festival.status;
  if (festival.start_date <= today && festival.end_date >= today) return "ongoing";
  if (festival.end_date < today) return "completed";
  return "upcoming";
};

export const formatFestivalDateRange = (festival: any) => {
  const start = festival.start_date ? new Date(festival.start_date).toLocaleDateString() : "";
  const end = festival.end_date ? new Date(festival.end_date).toLocaleDateString() : "";
  if (!start) return "";
  return start === end || !end ? start : `${start} - ${end}`;
};

const statusStyles: Record<string, string> = {
  upcoming: "bg-amber-100 text-amber-700 ring-1 ring-amber-300/60",
  ongoing: "bg-emerald-100 text-emerald-700 ring-1 ring-emerald-300/70",
  completed: "bg-muted text-muted-foreground ring-1 ring-border",
};

const FestivalsSection = () => {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-100px" });
  const navigate = useNavigate();
  const [festivals, setFestivals] = useState<any[]>(() => festivalsCache ?? []);
  const [loading, setLoading] = useState(() => festivalsCache === null);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    const load = async () => {
      if (festivalsCache) return;
      try {
        const res = await fetch(`${apiBaseUrl}/jain-calendar`);
        const payload = await res.json();
        festivalsCache = Array.isArray(payload) ? payload : payload.data || [];
        setFestivals(festivalsCache);
      } catch {
        festivalsCache = [];
        setFestivals([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const openFestival = (festivalId: string) => {
    navigate(`/festival/${festivalId}`, { state: { from: "/#festivals", mandirReturnScroll: window.scrollY } });
  };

  const sortedFestivals = [...festivals].sort((a, b) => {
    const priority: Record<string, number> = { ongoing: 0, upcoming: 1, completed: 2 };
    const statusDiff = (priority[getFestivalStatus(a)] ?? 3) - (priority[getFestivalStatus(b)] ?? 3);
    if (statusDiff !== 0) return statusDiff;
    return String(a.start_date || "").localeCompare(String(b.start_date || ""));
  });
  const visibleFestivals = showAll ? sortedFestivals : sortedFestivals.slice(0, INITIAL_VISIBLE);
  const hasMore = sortedFestivals.length > INITIAL_VISIBLE;

  const renderFestival = (festival: any, index: number) => {
    const status = getFestivalStatus(festival);
    return (
      <motion.button
        key={festival.id}
        type="button"
        onClick={() => openFestival(festival.id)}
        className="glass-card-strong w-full p-4 md:p-5 text-left hover-lift cursor-pointer overflow-hidden"
        initial={{ opacity: 0, y: 24 }}
        animate={inView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.45, delay: index * 0.06 }}
      >
        {festival.image_url ? (
          <div className="aspect-video rounded-xl overflow-hidden mb-4">
            <img src={festival.image_url} alt={festival.title} className="w-full h-full object-cover" />
          </div>
        ) : (
          <div className="aspect-video rounded-xl mb-4 gold-gradient flex items-center justify-center">
            <Sparkles className="w-10 h-10 text-primary-foreground" />
          </div>
        )}
        <div className="flex items-start justify-between gap-3 mb-3">
          <h4 className="font-display text-base md:text-lg font-bold">{festival.title}</h4>
          <span className={`shrink-0 text-[10px] md:text-xs font-semibold px-2.5 py-1 rounded-full capitalize animate-pulse ${statusStyles[status] || statusStyles.upcoming}`}>
            {status}
          </span>
        </div>
        {festival.description && <p className="text-xs md:text-sm text-muted-foreground line-clamp-2 mb-3">{festival.description}</p>}
        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1"><CalendarDays className="w-3.5 h-3.5" /> {formatFestivalDateRange(festival)}</span>
          {festival.festival_type && <span>{festival.festival_type}</span>}
        </div>
      </motion.button>
    );
  };

  return (
    <section id="festivals" className="section-padding" ref={ref}>
      <div className="container mx-auto max-w-6xl">
        <motion.div className="text-center mb-10 md:mb-16" initial={{ opacity: 0, y: 30 }} animate={inView ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.7 }}>
          <h3 className="font-heading text-base md:text-lg text-primary tracking-widest uppercase mb-3">Jain Calendar</h3>
          <h2 className="font-display text-2xl md:text-5xl font-bold gold-text">Festival</h2>
        </motion.div>

        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
        ) : festivals.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">No festivals yet. Check back soon!</p>
        ) : (
          <>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
              {visibleFestivals.map(renderFestival)}
            </div>

            {hasMore && !showAll && (
              <motion.div className="flex justify-center mt-8" initial={{ opacity: 0 }} animate={inView ? { opacity: 1 } : {}} transition={{ delay: 0.25 }}>
                <button onClick={() => setShowAll(true)} className="group px-6 md:px-8 py-3 md:py-3.5 gold-gradient text-primary-foreground font-semibold rounded-full text-sm md:text-base flex items-center gap-2 shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300">
                  View More
                  <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </button>
              </motion.div>
            )}

            {hasMore && showAll && (
              <motion.div className="flex justify-center mt-8" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <button onClick={() => setShowAll(false)} className="px-6 py-3 bg-sand hover:bg-sand-dark text-foreground/70 font-medium rounded-full text-sm transition-all duration-300">
                  Show Less
                </button>
              </motion.div>
            )}
          </>
        )}
      </div>
    </section>
  );
};

export default FestivalsSection;
