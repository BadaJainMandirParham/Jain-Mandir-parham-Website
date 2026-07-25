import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { useTranslation } from "react-i18next";
import templeAbout from "@/assets/temple-about.jpg";

const AboutSection = () => {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-100px" });
  const { t } = useTranslation();

  return (
    <section id="about" className="section-padding bg-cream" ref={ref}>
      <div className="container mx-auto max-w-6xl">
        <motion.div className="text-center mb-10 md:mb-16" initial={{ opacity: 0, y: 30 }} animate={inView ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.7 }}>
          <h3 className="font-heading text-base md:text-lg text-primary tracking-widest uppercase mb-3">{t("about.tag")}</h3>
          <h2 className="font-display text-2xl md:text-5xl font-bold gold-text mb-2 md:mb-4">{t("about.title")}</h2>
          <p className="text-muted-foreground text-xs md:text-sm tracking-wider uppercase">{t("about.subtitle")}</p>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-8 md:gap-12 items-center">
          <motion.div initial={{ opacity: 0, x: -50 }} animate={inView ? { opacity: 1, x: 0 } : {}} transition={{ duration: 0.7, delay: 0.2 }}>
            <div className="relative rounded-2xl overflow-hidden glow-gold group">
              <img src={templeAbout} alt="Shri Parshwanath Digambar Bada Jain Mandir Parham" className="w-full h-64 md:h-96 object-cover group-hover:scale-105 transition-transform duration-700" />
              <div className="absolute inset-0 bg-gradient-to-t from-foreground/20 to-transparent" />
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, x: 50 }} animate={inView ? { opacity: 1, x: 0 } : {}} transition={{ duration: 0.7, delay: 0.4 }} className="space-y-4 md:space-y-6">
            <p className="text-foreground/80 leading-relaxed text-base md:text-lg" dangerouslySetInnerHTML={{ __html: t("about.desc1") }} />
            <p className="text-foreground/70 leading-relaxed text-sm md:text-base" dangerouslySetInnerHTML={{ __html: t("about.desc2") }} />
            <div className="flex gap-3 md:gap-4 pt-2 md:pt-4">
              <div className="glass-card px-4 md:px-6 py-3 md:py-4 text-center hover-lift">
                <div className="font-display text-xl md:text-2xl font-bold text-primary">1000+</div>
                <div className="text-[10px] md:text-xs text-muted-foreground mt-1">{t("about.yearsHistory")}</div>
              </div>
              <div className="glass-card px-4 md:px-6 py-3 md:py-4 text-center hover-lift">
                <div className="font-display text-xl md:text-2xl font-bold text-primary">{t("about.daily")}</div>
                <div className="text-[10px] md:text-xs text-muted-foreground mt-1">{t("about.dailyPuja")}</div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default AboutSection;
