import { motion } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { useTranslation } from "react-i18next";
import templeHero from "@/assets/temple-hero-new.jpg";

const HeroSection = () => {
  const { t } = useTranslation();

  return (
    <section id="home" className="relative min-h-screen flex items-center justify-center overflow-hidden">
      <div className="absolute inset-0">
        <img src={templeHero} alt="Shri Parshwanath Digambar Bada Jain Mandir Parham" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-b from-background/60 via-background/40 to-background" />
      </div>

      <div className="relative z-10 text-center px-4 max-w-4xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.2 }} className="mb-4 md:mb-6">
          <h2 className="font-heading text-lg md:text-2xl text-primary font-semibold tracking-wider uppercase">
            {t("hero.greeting")}
          </h2>
        </motion.div>

        <motion.h1
          className="font-display text-3xl sm:text-4xl md:text-6xl lg:text-7xl font-bold gold-text mb-4 md:mb-6 leading-tight"
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
        >
          {t("hero.title1")}
          <br />
          {t("hero.title2")}
        </motion.h1>

        <motion.p
          className="text-base md:text-xl text-foreground/70 max-w-2xl mx-auto mb-8 md:mb-10 font-body px-2"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.6 }}
        >
          {t("hero.subtitle")}
        </motion.p>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.8 }}>
          <a href="#about" className="inline-flex items-center gap-2 px-6 md:px-8 py-3 md:py-4 gold-gradient text-primary-foreground font-semibold text-base md:text-lg rounded-full glow-gold-hover transition-all duration-300 hover:scale-105">
            {t("hero.cta")}
          </a>
        </motion.div>

        <motion.div className="absolute bottom-10 left-1/2 -translate-x-1/2" animate={{ y: [0, 10, 0] }} transition={{ duration: 2, repeat: Infinity }}>
          <ChevronDown className="w-6 h-6 text-primary/60" />
        </motion.div>
      </div>
    </section>
  );
};

export default HeroSection;
