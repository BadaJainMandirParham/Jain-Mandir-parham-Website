import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const WhatsAppButton = () => {
  const [hovered, setHovered] = useState(false);

  return (
    <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3">
      <AnimatePresence>
        {hovered && (
          <motion.span
            initial={{ opacity: 0, x: 10, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 10, scale: 0.9 }}
            transition={{ duration: 0.2 }}
            className="px-3 py-1.5 rounded-full bg-foreground text-background text-xs font-medium shadow-lg whitespace-nowrap"
          >
            Chat with us 🙏
          </motion.span>
        )}
      </AnimatePresence>

      <motion.a
        href="https://whatsapp.com/channel/0029VbDqWoP17EmwQFaOPA0c"
        target="_blank"
        rel="noopener noreferrer"
        className="relative w-14 h-14 rounded-full bg-[hsl(142,70%,45%)] flex items-center justify-center shadow-lg"
        aria-label="Chat on WhatsApp"
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
      >
        {/* Pulse ring */}
        <span className="absolute inset-0 rounded-full bg-[hsl(142,70%,45%)] animate-ping opacity-25" />
        <svg viewBox="0 0 32 32" className="w-7 h-7 fill-white relative z-10">
          <path d="M16.004 0h-.008C7.174 0 0 7.176 0 16.004c0 3.502 1.14 6.742 3.072 9.37L1.062 31.11l5.898-1.968A15.9 15.9 0 0016.004 32C24.826 32 32 24.826 32 16.004 32 7.176 24.826 0 16.004 0zm9.314 22.594c-.39 1.1-1.932 2.014-3.164 2.28-.844.18-1.946.322-5.656-1.216-4.748-1.966-7.804-6.778-8.038-7.094-.226-.316-1.886-2.512-1.886-4.792s1.194-3.4 1.618-3.866c.39-.428.85-.536 1.134-.536.284 0 .568.002.816.016.262.012.614-.1.96.732.356.852 1.21 2.952 1.318 3.168.108.216.18.468.036.752-.144.284-.216.46-.432.712-.216.252-.454.562-.648.754-.216.216-.44.45-.19.884.252.432 1.12 1.848 2.404 2.994 1.652 1.474 3.044 1.932 3.476 2.148.432.216.684.18.936-.108.252-.288 1.08-1.26 1.368-1.692.288-.432.576-.36.972-.216.396.144 2.496 1.176 2.922 1.392.432.216.716.324.822.504.108.18.108 1.044-.282 2.146z" />
        </svg>
      </motion.a>
    </div>
  );
};

export default WhatsAppButton;
