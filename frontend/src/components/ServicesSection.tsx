import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { Sparkles, CalendarHeart, HandHeart } from "lucide-react";
import { useTranslation } from "react-i18next";

const ServicesSection = () => {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-100px" });
  const { t } = useTranslation();

  const services = [
    { icon: Sparkles, title: t("services.spiritual"), desc: t("services.spiritualDesc") },
    { icon: CalendarHeart, title: t("services.cultural"), desc: t("services.culturalDesc") },
    { icon: HandHeart, title: t("services.community"), desc: t("services.communityDesc") },
  ];

  return (
    <section className="section-padding bg-cream" ref={ref}>
      <div className="container mx-auto max-w-5xl">
        <motion.div className="text-center mb-10 md:mb-16" initial={{ opacity: 0, y: 30 }} animate={inView ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.7 }}>
          <h3 className="font-heading text-base md:text-lg text-primary tracking-widest uppercase mb-3">{t("services.tag")}</h3>
          <h2 className="font-display text-2xl md:text-5xl font-bold gold-text">{t("services.title")}</h2>
        </motion.div>

        <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4 md:gap-8">
          {services.map((s, i) => (
            <motion.div key={s.title} className="glass-card-strong p-6 md:p-8 text-center hover-lift group" initial={{ opacity: 0, y: 30 }} animate={inView ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.5, delay: i * 0.15 }}>
              <div className="w-12 h-12 md:w-16 md:h-16 mx-auto mb-4 md:mb-6 rounded-2xl gold-gradient flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                <s.icon className="w-6 h-6 md:w-8 md:h-8 text-primary-foreground" />
              </div>
              <h4 className="font-display text-lg md:text-xl font-bold mb-2 md:mb-3">{s.title}</h4>
              <p className="text-xs md:text-sm text-muted-foreground leading-relaxed">{s.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ServicesSection;
