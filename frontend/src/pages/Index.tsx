import { useState, useCallback, useEffect } from "react";
import { AnimatePresence } from "framer-motion";
import { useLocation } from "react-router-dom";
import SplashScreen from "@/components/SplashScreen";
import Header from "@/components/Header";
import HeroSection from "@/components/HeroSection";
import AboutSection from "@/components/AboutSection";
import ProjectsSection from "@/components/ProjectsSection";
import ServicesSection from "@/components/ServicesSection";
import CommitteeSection from "@/components/CommitteeSection";
import GallerySection from "@/components/GallerySection";
import EventsSection from "@/components/EventsSection";
import FestivalsSection from "@/components/FestivalsSection";
import HowToReachSection from "@/components/HowToReachSection";
import ContactSection from "@/components/ContactSection";
import Footer from "@/components/Footer";
import WhatsAppButton from "@/components/WhatsAppButton";
import PromotionPopup from "@/components/PromotionPopup";

const Index = () => {
  const location = useLocation();
  const [loading, setLoading] = useState(() => sessionStorage.getItem("mandirSplashSeen") !== "true");

  const handleSplashComplete = useCallback(() => {
    sessionStorage.setItem("mandirSplashSeen", "true");
    setLoading(false);
  }, []);

  useEffect(() => {
    if (loading) return;

    const storedReturnScroll = sessionStorage.getItem("mandirReturnScroll");
    const restore = storedReturnScroll === null ? null : Number(storedReturnScroll);
    if (Number.isFinite(restore)) {
      sessionStorage.removeItem("mandirReturnScroll");
      requestAnimationFrame(() => window.scrollTo({ top: restore, behavior: "auto" }));
      return;
    }

    if (!location.hash) return;
    const target = document.querySelector(location.hash);
    if (!target) return;
    requestAnimationFrame(() => target.scrollIntoView({ behavior: "auto", block: "start" }));
  }, [loading, location.hash]);

  return (
    <>
      <AnimatePresence>
        {loading && <SplashScreen onComplete={handleSplashComplete} />}
      </AnimatePresence>

      {!loading && (
        <div className="min-h-screen">
          <Header />
          <HeroSection />
          <AboutSection />
          <ProjectsSection />
          <ServicesSection />
          <CommitteeSection />
          <GallerySection />
          <EventsSection />
          <FestivalsSection />
          <HowToReachSection />
          <ContactSection />
          <Footer />
          <WhatsAppButton />
          <PromotionPopup />
        </div>
      )}
    </>
  );
};

export default Index;
