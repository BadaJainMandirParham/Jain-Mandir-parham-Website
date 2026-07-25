import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import templeLogo from "@/assets/temple-logo.png";

const SplashScreen = ({ onComplete }: { onComplete: () => void }) => {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((p) => {
        if (p >= 100) {
          clearInterval(interval);
          setTimeout(onComplete, 300);
          return 100;
        }
        return p + 4;
      });
    }, 80);
    return () => clearInterval(interval);
  }, [onComplete]);

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex flex-col items-center justify-center"
        style={{
          background: "linear-gradient(135deg, hsl(40 30% 97%), hsl(40 60% 92%), hsl(35 30% 90%))",
        }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.5 }}
      >
        {/* Decorative circles */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/4 left-1/4 w-64 h-64 rounded-full bg-primary/5 blur-3xl" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full bg-gold-light/10 blur-3xl" />
        </div>

        <motion.div
          className="relative z-10 flex flex-col items-center"
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        >
          <div className="animate-logo-glow animate-float mb-8">
            <img
              src={templeLogo}
              alt="Temple Logo"
              className="w-28 h-28 md:w-36 md:h-36 object-contain"
            />
          </div>

          <h1 className="font-display text-xl md:text-2xl font-bold gold-text text-center mb-2 px-4">
            श्री पार्श्वनाथ दिगम्बर बड़ा जैन मन्दिर
          </h1>
          <p className="font-heading text-base md:text-lg text-muted-foreground mb-8">
            पाढ़म, उत्तर प्रदेश
          </p>

          {/* Progress bar */}
          <div className="w-48 h-1 bg-sand-dark/30 rounded-full overflow-hidden">
            <motion.div
              className="h-full gold-gradient rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.1 }}
            />
          </div>

          {/* Skeleton lines */}
          <div className="mt-8 space-y-3 w-64">
            <div className="h-3 skeleton-shimmer rounded-full" />
            <div className="h-3 skeleton-shimmer rounded-full w-4/5" />
            <div className="h-3 skeleton-shimmer rounded-full w-3/5" />
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default SplashScreen;
