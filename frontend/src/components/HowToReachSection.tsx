import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { Plane, Car, MapPin, Navigation } from "lucide-react";
import { useTranslation } from "react-i18next";

const HowToReachSection = () => {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-100px" });
  const { t } = useTranslation();

  return (
    <section className="section-padding" ref={ref}>
      <div className="container mx-auto max-w-6xl">
        <motion.div className="text-center mb-10 md:mb-16" initial={{ opacity: 0, y: 30 }} animate={inView ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.7 }}>
          <h3 className="font-heading text-base md:text-lg text-primary tracking-widest uppercase mb-3">{t("howToReach.tag")}</h3>
          <h2 className="font-display text-2xl md:text-5xl font-bold gold-text">{t("howToReach.title")}</h2>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-6 md:gap-8 mb-8 md:mb-12">
          <motion.div className="space-y-4 md:space-y-6" initial={{ opacity: 0, x: -30 }} animate={inView ? { opacity: 1, x: 0 } : {}} transition={{ duration: 0.7, delay: 0.2 }}>
            <div className="glass-card p-4 md:p-6 hover-lift">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 md:w-10 md:h-10 rounded-xl gold-gradient flex items-center justify-center">
                  <MapPin className="w-4 h-4 md:w-5 md:h-5 text-primary-foreground" />
                </div>
                <h4 className="font-display text-base md:text-lg font-bold">{t("howToReach.location")}</h4>
              </div>
              <p className="text-muted-foreground text-xs md:text-sm leading-relaxed" dangerouslySetInnerHTML={{ __html: t("howToReach.locationDesc") }} />
              <div className="flex gap-4 mt-4">
                <div className="text-center">
                  <div className="font-display text-lg md:text-xl font-bold text-primary">25 km</div>
                  <div className="text-[10px] md:text-xs text-muted-foreground">{t("howToReach.fromEtah")}</div>
                </div>
                <div className="text-center">
                  <div className="font-display text-lg md:text-xl font-bold text-primary">25 km</div>
                  <div className="text-[10px] md:text-xs text-muted-foreground">{t("howToReach.fromShikohabad")}</div>
                </div>
              </div>
            </div>

            <div className="glass-card p-4 md:p-6 hover-lift">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 md:w-10 md:h-10 rounded-xl gold-gradient flex items-center justify-center">
                  <Plane className="w-4 h-4 md:w-5 md:h-5 text-primary-foreground" />
                </div>
                <h4 className="font-display text-base md:text-lg font-bold">{t("howToReach.byAir")}</h4>
              </div>
              <div className="flex items-center gap-2 text-xs md:text-sm text-muted-foreground flex-wrap">
                <span>Agra Airport</span>
                <Navigation className="w-3 h-3 text-primary" />
                <span>ISBT</span>
                <Navigation className="w-3 h-3 text-primary" />
                <span>Shikohabad</span>
                <Navigation className="w-3 h-3 text-primary" />
                <span className="font-semibold text-foreground">Parham</span>
              </div>
            </div>

            <div className="glass-card p-4 md:p-6 hover-lift">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 md:w-10 md:h-10 rounded-xl gold-gradient flex items-center justify-center">
                  <Car className="w-4 h-4 md:w-5 md:h-5 text-primary-foreground" />
                </div>
                <h4 className="font-display text-base md:text-lg font-bold">{t("howToReach.nearbyLandmark")} 🚩</h4>
              </div>
              <p className="text-xs md:text-sm text-muted-foreground" dangerouslySetInnerHTML={{ __html: t("howToReach.landmarkDesc") }} />
            </div>
          </motion.div>

          <motion.div className="rounded-2xl overflow-hidden glow-gold h-64 md:h-full min-h-[280px]" initial={{ opacity: 0, x: 30 }} animate={inView ? { opacity: 1, x: 0 } : {}} transition={{ duration: 0.7, delay: 0.4 }}>
            <iframe src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3544.831352659391!2d78.66175367545358!3d27.318466176407767!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3975ad29a0abaaab%3A0x8a10e3b687d4e583!2sBada%20Mandir!5e0!3m2!1sen!2sin!4v1772966503602!5m2!1sen!2sin" width="100%" height="100%" style={{ border: 0 }} allowFullScreen loading="lazy" referrerPolicy="no-referrer-when-downgrade" title="Bada Mandir Parham" />
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default HowToReachSection;
