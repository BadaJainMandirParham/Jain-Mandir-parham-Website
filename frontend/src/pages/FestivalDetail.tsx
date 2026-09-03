import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, CalendarDays, Loader2, Sparkles } from "lucide-react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { apiBaseUrl } from "@/integrations/supabase/client";
import { formatFestivalDateRange, getFestivalStatus } from "@/components/FestivalsSection";

const statusStyles: Record<string, string> = {
  upcoming: "bg-amber-100 text-amber-700",
  ongoing: "bg-emerald-100 text-emerald-700",
  completed: "bg-muted text-muted-foreground",
};

const FestivalDetail = () => {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [festival, setFestival] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`${apiBaseUrl}/jain-calendar`);
        const payload = await res.json();
        const rows = Array.isArray(payload) ? payload : payload.data || [];
        setFestival(rows.find((item: any) => String(item.id || item._id) === String(id)) || null);
      } catch {
        setFestival(null);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  const goBack = () => {
    const returnScroll = location.state?.mandirReturnScroll;
    if (typeof returnScroll === "number") sessionStorage.setItem("mandirReturnScroll", String(returnScroll));
    if (window.history.length > 1) navigate(-1);
    else navigate("/#festivals", { state: { mandirReturnScroll: returnScroll } });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cream">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!festival) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-cream gap-4">
        <p className="text-muted-foreground">Festival not found</p>
        <button type="button" onClick={() => navigate("/#festivals")} className="text-primary underline">Go Back</button>
      </div>
    );
  }

  const status = getFestivalStatus(festival);

  return (
    <div className="min-h-screen bg-cream">
      <div className="container mx-auto max-w-4xl px-4 py-8 md:py-16">
        <button type="button" onClick={goBack} className="inline-flex items-center gap-2 text-primary hover:underline mb-6 text-sm font-medium">
          <ArrowLeft className="w-4 h-4" /> Back to Festivals
        </button>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          {festival.image_url ? (
            <div className="rounded-2xl overflow-hidden mb-8 glow-gold">
              <img src={festival.image_url} alt={festival.title || "Festival"} className="w-full max-h-[500px] object-cover" />
            </div>
          ) : (
            <div className="rounded-2xl mb-8 min-h-64 gold-gradient flex items-center justify-center glow-gold">
              <Sparkles className="w-16 h-16 text-primary-foreground" />
            </div>
          )}

          <div className="glass-card p-6 md:p-8 mb-8">
            <span className={`inline-flex mb-4 text-xs font-medium px-3 py-1 rounded-full ${statusStyles[status] || statusStyles.upcoming}`}>
              {status}
            </span>
            <h1 className="font-display text-2xl md:text-4xl font-bold gold-text mb-4">{festival.title}</h1>
            {festival.description && <p className="text-foreground/80 leading-relaxed whitespace-pre-wrap">{festival.description}</p>}
          </div>

          <div className="glass-card p-4 md:p-6 text-xs md:text-sm text-muted-foreground flex flex-wrap gap-4">
            <span className="flex items-center gap-2"><CalendarDays className="w-4 h-4 text-primary" /> {formatFestivalDateRange(festival)}</span>
            {festival.festival_type && <span>{festival.festival_type}</span>}
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default FestivalDetail;
