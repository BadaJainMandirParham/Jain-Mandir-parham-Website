import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, Globe, LogOut, Smartphone } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import templeLogo from "@/assets/temple-logo.png";

const Header = () => {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { t, i18n } = useTranslation();
  const { user, signOut, committeeMember, committeeLogout } = useAuth();
  const navigate = useNavigate();
  const isLoggedIn = !!user || !!committeeMember;

  const navItems = [
    { label: t("nav.home"), href: "/" },
    { label: t("nav.about"), href: "/#about" },
    { label: t("nav.donations"), href: "/donations" },
    { label: t("nav.projects"), href: "/#projects" },
    { label: t("nav.committee"), href: "/#committee" },
    { label: t("nav.gallery"), href: "/#gallery" },
    { label: t("nav.events"), href: "/#events" },
    { label: t("nav.liveDarshan"), href: "/live-darshan" },
    { label: t("nav.contact"), href: "/#contact" },
  ];

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const toggleLang = () => {
    i18n.changeLanguage(i18n.language === "en" ? "hi" : "en");
  };

  const handleNavClick = (href: string) => {
    setMobileOpen(false);
    if (href.startsWith("/#")) {
      const hash = href.slice(1);
      if (window.location.pathname === "/") {
        const el = document.querySelector(hash);
        el?.scrollIntoView({ behavior: "smooth" });
      } else {
        navigate("/");
        setTimeout(() => {
          const el = document.querySelector(hash);
          el?.scrollIntoView({ behavior: "smooth" });
        }, 300);
      }
    } else {
      navigate(href);
    }
  };

  const getDashboardLink = () => {
    // Default to admin, but we'll check role in dashboard pages
    return "/devotee-dashboard";
  };

  return (
    <motion.header
      className={`fixed top-0 left-0 right-0 z-40 transition-all duration-500 ${
        scrolled ? "glass-card-strong shadow-lg py-1.5 md:py-2" : "bg-transparent py-3 md:py-4"
      }`}
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
    >
      <div className="container mx-auto flex items-center justify-between px-3 md:px-4">
        <button onClick={() => handleNavClick("/")} className="flex items-center gap-2 md:gap-3 group">
          <img src={templeLogo} alt="Logo" className="w-8 h-8 md:w-12 md:h-12 object-contain group-hover:scale-110 transition-transform" />
          <div className="hidden sm:block">
            <h1 className="font-display text-[11px] md:text-sm font-bold gold-text leading-tight">
              Shri Parshwanath Digambar Bada Jain Mandir
            </h1>
            <p className="text-[10px] md:text-xs text-muted-foreground">Parham, Uttar Pradesh</p>
          </div>
        </button>

        <nav className="hidden lg:flex items-center gap-0.5">
          {navItems.map((item) => (
            <button
              key={item.href}
              onClick={() => handleNavClick(item.href)}
              className="px-2.5 py-2 text-xs xl:text-sm font-medium text-foreground/80 hover:text-primary rounded-lg hover:bg-primary/5 transition-all duration-300"
            >
              {item.label}
            </button>
          ))}
        </nav>

        <div className="flex items-center gap-1.5 md:gap-2">
          <a
            href="https://www.indusappstore.com/apps/devotional/bada-jain-mandir-parham/com.parham.jainmandir/?page=details&id=com.parham.jainmandir"
            target="_blank"
            rel="noopener noreferrer"
            title="Install Mandir App"
            className="hidden sm:flex items-center gap-1 px-2.5 md:px-3 py-1 md:py-1.5 text-[10px] md:text-xs font-semibold rounded-full gold-gradient text-primary-foreground glow-gold-hover transition-all"
          >
            <Smartphone className="w-3 h-3 md:w-3.5 md:h-3.5" />
            <span className="hidden md:inline">Install App</span>
            <span className="md:hidden">App</span>
          </a>
          <button
            onClick={toggleLang}
            className="flex items-center gap-1 px-2.5 md:px-3 py-1 md:py-1.5 text-[10px] md:text-xs font-medium rounded-full border border-border hover:border-primary/50 hover:bg-primary/5 transition-all"
          >
            <Globe className="w-3 h-3 md:w-3.5 md:h-3.5" />
            {i18n.language === "en" ? "हिं" : "EN"}
          </button>

          {isLoggedIn ? (
            <div className="hidden md:flex items-center gap-2">
              <span className="text-xs font-medium text-primary">🙏 Jai Jinendra</span>
              <Link to={committeeMember ? "/committee-dashboard" : "/devotee-dashboard"} className="px-3 py-1.5 text-xs font-medium rounded-full border border-primary/20 text-primary hover:bg-primary/5 transition-all">
                {t("nav.dashboard")}
              </Link>
              <button
                onClick={() => { if (committeeMember) { committeeLogout(); navigate("/"); } else { signOut(); } }}
                className="p-1.5 md:p-2 rounded-full hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-all"
              >
                <LogOut className="w-3.5 h-3.5 md:w-4 md:h-4" />
              </button>
            </div>
          ) : (
            <Link to="/login" className="hidden md:block px-3 md:px-4 py-1.5 md:py-2 text-xs md:text-sm font-medium gold-gradient text-primary-foreground rounded-full glow-gold-hover transition-all duration-300">
              {t("nav.login")}
            </Link>
          )}

          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="lg:hidden p-1.5 md:p-2 rounded-lg hover:bg-primary/5"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            className="lg:hidden glass-card-strong mt-2 mx-3 md:mx-4 rounded-2xl overflow-hidden"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
          >
            <nav className="flex flex-col p-3 md:p-4 gap-0.5 md:gap-1">
              {navItems.map((item) => (
                <button
                  key={item.href}
                  onClick={() => handleNavClick(item.href)}
                  className="px-4 py-2.5 md:py-3 text-sm font-medium rounded-xl hover:bg-primary/5 transition-colors text-left"
                >
                  {item.label}
                </button>
              ))}
              <a
                href="https://www.indusappstore.com/apps/devotional/bada-jain-mandir-parham/com.parham.jainmandir/?page=details&id=com.parham.jainmandir"
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setMobileOpen(false)}
                className="mt-1 px-4 py-2.5 text-sm font-semibold gold-gradient text-primary-foreground rounded-xl text-center flex items-center justify-center gap-2"
              >
                <Smartphone className="w-4 h-4" /> Install Mandir App
              </a>
              {isLoggedIn ? (
                <>
                  <Link to={committeeMember ? "/committee-dashboard" : "/devotee-dashboard"} onClick={() => setMobileOpen(false)} className="mt-1 px-4 py-2.5 text-sm font-medium rounded-xl border border-primary/20 text-primary text-center">
                    {t("nav.dashboard")}
                  </Link>
                  <button onClick={() => { if (committeeMember) { committeeLogout(); navigate("/"); } else { signOut(); } setMobileOpen(false); }} className="mt-1 px-4 py-2.5 text-sm font-medium rounded-xl border border-destructive/20 text-destructive text-center">
                    {t("nav.logout")}
                  </button>
                </>
              ) : (
                <Link to="/login" onClick={() => setMobileOpen(false)} className="mt-1 px-4 py-2.5 md:py-3 text-sm font-medium gold-gradient text-primary-foreground rounded-xl text-center">
                  {t("nav.loginSignup")}
                </Link>
              )}
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  );
};

export default Header;
