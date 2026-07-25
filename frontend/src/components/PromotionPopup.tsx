import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const sb = supabase as any;

const PromotionPopup = () => {
  const [promo, setPromo] = useState<any>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const load = async () => {
      const { data } = await sb
        .from("promotions")
        .select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(1);
      if (data && data.length > 0) {
        const dismissed = sessionStorage.getItem(`promo_dismissed_${data[0].id}`);
        if (!dismissed) {
          setPromo(data[0]);
          setVisible(true);
          const duration = (data[0].display_duration || 5) * 1000;
          setTimeout(() => setVisible(false), duration);
        }
      }
    };
    load();
  }, []);

  const dismiss = () => {
    setVisible(false);
    if (promo) sessionStorage.setItem(`promo_dismissed_${promo.id}`, "true");
  };

  return (
    <AnimatePresence>
      {visible && promo && (
        <motion.div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-foreground/60 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={dismiss}
        >
          <motion.div
            className="relative bg-card border border-border rounded-2xl shadow-2xl max-w-md w-full overflow-hidden"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ type: "spring", damping: 25 }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={dismiss}
              className="absolute top-3 right-3 z-10 p-1.5 rounded-full bg-background/80 hover:bg-background transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            {promo.image_url && (
              <div className="aspect-video w-full overflow-hidden">
                <img
                  src={promo.image_url}
                  alt={promo.title}
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            <div className="p-5">
              <h3 className="font-display text-lg font-bold gold-text mb-1">
                {promo.title}
              </h3>
              {promo.event_date && (
                <p className="text-xs text-primary font-medium mb-2">
                  📅 {promo.event_date}
                </p>
              )}
              {promo.description && (
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {promo.description}
                </p>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default PromotionPopup;
