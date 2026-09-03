import { motion, useInView } from "framer-motion";
import { CalendarDays, Loader2, Sparkles } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiBaseUrl } from "@/integrations/supabase/client";

const todayText = () => new Date().toISOString().slice(0, 10);
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
  upcoming: "bg-amber-100 text-amber-700",
  ongoing: "bg-emerald-100 text-emerald-700",
  completed: "bg-muted text-muted-foreground",
};

const FestivalsSection = () => {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-100px" });
  const navigate = useNavigate();
  const [festivals, setFestivals] = useState<any[]>(() => festivalsCache ?? []);
  const [loading, setLoading] = useState(() => festivalsCache === null);

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

  const grouped = useMemo(() => ({
    ongoing: festivals.filter((festival) => getFestivalStatus(festival) === "ongoing"),
    upcoming: festivals.filter((festival) => getFestivalStatus(festival) === "upcoming"),
    completed: festivals.filter((festival) => getFestivalStatus(festival) === "completed"),
  }), [festivals]);

  const openFestival = (festivalId: string) => {
    navigate(`/festival/${festivalId}`, { state: { from: "/#festivals", mandirReturnScroll: window.scrollY } });
  };

  const renderFestival = (festival: any, index: number) => {
    const status = getFestivalStatus(festival);
    return (
      <motion.button
        key={festival.id}
        type="button"
        onClick={() => openFestival(festival.id)}
        className="glass-card p-4 md:p-5 text-left hover-lift cursor-pointer"
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
          <span className={`text-[10px] md:text-xs font-medium px-2.5 py-1 rounded-full ${statusStyles[status] || statusStyles.upcoming}`}>
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

  const groups = [
    { key: "ongoing", title: "Ongoing Festivals", items: grouped.ongoing },
    { key: "upcoming", title: "Upcoming Festivals", items: grouped.upcoming },
    { key: "completed", title: "Completed Festivals", items: grouped.completed },
  ];

  return (
    <section id="festivals" className="section-padding" ref={ref}>
      <div className="container mx-auto max-w-6xl">
        <motion.div className="text-center mb-10 md:mb-16" initial={{ opacity: 0, y: 30 }} animate={inView ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.7 }}>
          <h3 className="font-heading text-base md:text-lg text-primary tracking-widest uppercase mb-3">Jain Calendar</h3>
          <h2 className="font-display text-2xl md:text-5xl font-bold gold-text">Festivals</h2>
        </motion.div>

        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
        ) : festivals.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">No festivals yet. Check back soon!</p>
        ) : (
          <div className="space-y-10">
            {groups.filter((group) => group.items.length > 0).map((group) => (
              <div key={group.key}>
                <h3 className="font-display text-lg md:text-xl font-bold mb-4 md:mb-6">{group.title}</h3>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                  {group.items.map(renderFestival)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export default FestivalsSection;
