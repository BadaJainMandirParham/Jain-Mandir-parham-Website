import { useState, useCallback } from "react";
import { AnimatePresence } from "framer-motion";
import SplashScreen from "@/components/SplashScreen";
import Header from "@/components/Header";
import HeroSection from "@/components/HeroSection";
import AboutSection from "@/components/AboutSection";
import ProjectsSection from "@/components/ProjectsSection";
import ServicesSection from "@/components/ServicesSection";
import CommitteeSection from "@/components/CommitteeSection";
import GallerySection from "@/components/GallerySection";
import EventsSection from "@/components/EventsSection";
import HowToReachSection from "@/components/HowToReachSection";
import ContactSection from "@/components/ContactSection";
import Footer from "@/components/Footer";
import WhatsAppButton from "@/components/WhatsAppButton";
import PromotionPopup from "@/components/PromotionPopup";

const Index = () => {
  const [loading, setLoading] = useState(true);

  const handleSplashComplete = useCallback(() => {
    setLoading(false);
  }, []);

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
