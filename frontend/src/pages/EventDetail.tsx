import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Calendar, Clock, Loader2, MapPin } from "lucide-react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

const sb = supabase as any;

const formatDate = (value?: string) => {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString();
};

const EventDetail = () => {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [event, setEvent] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data } = await sb.from("events").select("*").eq("id", id).single();
      setEvent(data);
      setLoading(false);
    };
    load();
  }, [id]);

  const goBack = () => {
    const returnScroll = location.state?.mandirReturnScroll;
    if (typeof returnScroll === "number") sessionStorage.setItem("mandirReturnScroll", String(returnScroll));
    if (window.history.length > 1) navigate(-1);
    else navigate("/#events", { state: { mandirReturnScroll: returnScroll } });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cream">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-cream gap-4">
        <p className="text-muted-foreground">Event not found</p>
        <button type="button" onClick={() => navigate("/#events")} className="text-primary underline">Go Back</button>
      </div>
    );
  }

  const eventDate = event.event_date || event.date;
  const eventTime = event.start_time || event.time;

  return (
    <div className="min-h-screen bg-cream">
      <div className="container mx-auto max-w-4xl px-4 py-8 md:py-16">
        <button type="button" onClick={goBack} className="inline-flex items-center gap-2 text-primary hover:underline mb-6 text-sm font-medium">
          <ArrowLeft className="w-4 h-4" /> Back to Events
        </button>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          {event.image_url && (
            <div className="rounded-2xl overflow-hidden mb-8 glow-gold">
              <img src={event.image_url} alt={event.title || "Event"} className="w-full max-h-[500px] object-cover" />
            </div>
          )}

          <div className="glass-card p-6 md:p-8 mb-8">
            <span className="inline-flex mb-4 text-xs font-medium px-3 py-1 rounded-full bg-emerald-100 text-emerald-700">
              {event.status || "upcoming"}
            </span>
            <h1 className="font-display text-2xl md:text-4xl font-bold gold-text mb-4">{event.title || event.event_name}</h1>
            {event.description && <p className="text-foreground/80 leading-relaxed whitespace-pre-wrap">{event.description}</p>}
          </div>

          <div className="glass-card p-4 md:p-6 text-xs md:text-sm text-muted-foreground grid sm:grid-cols-3 gap-4">
            {eventDate && <span className="flex items-center gap-2"><Calendar className="w-4 h-4 text-primary" /> {formatDate(eventDate)}</span>}
            {eventTime && <span className="flex items-center gap-2"><Clock className="w-4 h-4 text-primary" /> {eventTime}</span>}
            {event.location && <span className="flex items-center gap-2"><MapPin className="w-4 h-4 text-primary" /> {event.location}</span>}
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default EventDetail;
