import { Heart, Phone, Mail, MapPin, Facebook, Youtube, MessageCircle } from "lucide-react";
import { useTranslation } from "react-i18next";
import templeLogo from "@/assets/temple-logo.png";

const Footer = () => {
  const { t } = useTranslation();

  return (
    <footer className="bg-temple-brown text-sand py-12 md:py-16">
      <div className="container mx-auto max-w-6xl px-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-10 mb-8 md:mb-12">
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-3 mb-4">
              <img src={templeLogo} alt="Logo" className="w-8 h-8 md:w-10 md:h-10 object-contain brightness-150" />
              <div>
                <h4 className="font-display text-xs md:text-sm font-bold text-gold-light">Shri Parshwanath Digambar Bada</h4>
                <p className="text-[10px] md:text-xs text-sand-dark">Jain Mandir Parham</p>
              </div>
            </div>
            <p className="text-xs md:text-sm text-sand-dark leading-relaxed">{t("footer.desc")}</p>
          </div>

          <div>
            <h4 className="font-display text-sm md:text-base font-bold text-gold-light mb-3 md:mb-4">{t("footer.quickLinks")}</h4>
            <ul className="space-y-1.5 md:space-y-2">
              {[
                { label: t("nav.home"), href: "/#home" },
                { label: t("nav.about"), href: "/#about" },
                { label: t("nav.events"), href: "/#events" },
                { label: t("nav.gallery"), href: "/#gallery" },
                { label: t("nav.contact"), href: "/#contact" },
              ].map((link) => (
                <li key={link.label}>
                  <a href={link.href} className="text-xs md:text-sm text-sand-dark hover:text-gold-light transition-colors">{link.label}</a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-display text-sm md:text-base font-bold text-gold-light mb-3 md:mb-4">{t("footer.services")}</h4>
            <ul className="space-y-1.5 md:space-y-2">
              {[t("footer.spiritualGuidance"), t("footer.culturalEvents"), t("footer.communityOutreach"), t("footer.dailyPuja"), t("footer.liveDarshanService")].map((s) => (
                <li key={s} className="text-xs md:text-sm text-sand-dark">{s}</li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-display text-sm md:text-base font-bold text-gold-light mb-3 md:mb-4">{t("footer.contactInfo")}</h4>
            <div className="space-y-2 md:space-y-3">
              <div className="flex items-center gap-2 text-xs md:text-sm text-sand-dark">
                <MapPin className="w-3.5 h-3.5 md:w-4 md:h-4 text-gold-light flex-shrink-0" />
                Parham, Uttar Pradesh, India
              </div>
              <a href="tel:+916399003541" className="flex items-center gap-2 text-xs md:text-sm text-sand-dark hover:text-gold-light transition-colors">
                <Phone className="w-3.5 h-3.5 md:w-4 md:h-4 text-gold-light flex-shrink-0" />
                +91 6399003541
              </a>
              <a href="mailto:badajainmandirparham@gmail.com" className="flex items-center gap-2 text-xs md:text-sm text-sand-dark hover:text-gold-light transition-colors break-all">
                <Mail className="w-3.5 h-3.5 md:w-4 md:h-4 text-gold-light flex-shrink-0" />
                badajainmandirparham@gmail.com
              </a>
              <div className="flex items-center gap-3 pt-1">
                <a href="https://www.facebook.com/share/1Cvqd1HPga/" target="_blank" rel="noopener noreferrer" aria-label="Temple Facebook page" className="text-sand-dark hover:text-gold-light transition-colors">
                  <Facebook className="w-4 h-4" />
                </a>
                <a href="https://www.facebook.com/share/1Cpb6FHeAG/" target="_blank" rel="noopener noreferrer" aria-label="Temple Facebook channel" className="text-sand-dark hover:text-gold-light transition-colors">
                  <MessageCircle className="w-4 h-4" />
                </a>
                <a href="https://www.youtube.com/@jainmandirparham" target="_blank" rel="noopener noreferrer" aria-label="Temple YouTube channel" className="text-sand-dark hover:text-gold-light transition-colors">
                  <Youtube className="w-4 h-4" />
                </a>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-sand-dark/20 pt-4 md:pt-6 text-center">
          <p className="text-xs md:text-sm text-sand-dark">
            Copyright ©{new Date().getFullYear()} Shri Parshwanath Digambar Bada Jain Mandir Parham. | Made with{" "}
            <Heart className="w-3 h-3 md:w-3.5 md:h-3.5 inline text-red-400 fill-red-400" />{" "}
            by <span className="text-gold-light font-semibold">Arpan Jain (AJ001)</span>
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
