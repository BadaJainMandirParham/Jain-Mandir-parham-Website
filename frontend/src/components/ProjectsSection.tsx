import { motion, useInView } from "framer-motion";
import { useRef, useState, useEffect } from "react";
import { Construction, FolderCheck, Heart, Users, Star, Loader2, ChevronRight, Play } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

const INITIAL_COUNT = 6;

const Counter = ({ end, label, icon: Icon }: { end: number; label: string; icon: React.ElementType }) => {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true });
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!inView) return;
    let start = 0;
    const duration = 2000;
    const step = end / (duration / 16);
    const timer = setInterval(() => {
      start += step;
      if (start >= end) { setCount(end); clearInterval(timer); }
      else setCount(Math.floor(start));
    }, 16);
    return () => clearInterval(timer);
  }, [inView, end]);

  return (
    <div ref={ref} className="glass-card px-4 md:px-6 py-5 md:py-8 text-center hover-lift">
      <Icon className="w-6 h-6 md:w-8 md:h-8 text-primary mx-auto mb-2 md:mb-3" />
      <div className="font-display text-2xl md:text-4xl font-bold text-primary">{count}+</div>
      <div className="text-xs md:text-sm text-muted-foreground mt-1 md:mt-2">{label}</div>
    </div>
  );
};

const ProjectsSection = () => {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-100px" });
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAll, setShowAll] = useState(false);
  const { t } = useTranslation();
  const navigate = useNavigate();

  const statusColors: Record<string, string> = {
    under_construction: "bg-amber-100 text-amber-700",
    completed: "bg-emerald-100 text-emerald-700",
    future: "bg-purple-100 text-purple-700",
  };

  useEffect(() => {
    const load = async () => {
      const { data } = await (supabase as any).from("projects").select("*").order("created_at", { ascending: false });
      setProjects(data ?? []);
      setLoading(false);
    };
    load();
  }, []);

  const getStatusLabel = (status: string) => {
    if (status === "completed") return t("projects.completed");
    if (status === "under_construction") return t("projects.underConstruction");
    if (status === "future") return t("projects.future");
    return status;
  };

  const displayProjects = showAll ? projects : projects.slice(0, INITIAL_COUNT);
  const hasMore = projects.length > INITIAL_COUNT;

  return (
    <section id="projects" className="section-padding" ref={ref}>
      <div className="container mx-auto max-w-6xl">
        <motion.div className="text-center mb-10 md:mb-16" initial={{ opacity: 0, y: 30 }} animate={inView ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.7 }}>
          <h3 className="font-heading text-base md:text-lg text-primary tracking-widest uppercase mb-3">{t("projects.tag")}</h3>
          <h2 className="font-display text-2xl md:text-5xl font-bold gold-text">{t("projects.title")}</h2>
        </motion.div>

        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
        ) : projects.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">{t("projects.noProjects")}</p>
        ) : (
          <>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 mb-8">
              {displayProjects.map((project, i) => (
                <motion.div
                  key={project.id}
                  className="glass-card overflow-hidden hover-lift group cursor-pointer"
                  initial={{ opacity: 0, y: 30 }}
                  animate={inView ? { opacity: 1, y: 0 } : {}}
                  transition={{ duration: 0.5, delay: i * 0.1 }}
                  onClick={() => navigate(`/project/${project.id}`)}
                >
                  {project.image_url && (
                    <div className="aspect-video overflow-hidden">
                      <img src={project.image_url} alt={project.title || ""} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                    </div>
                  )}
                  <div className="p-4 md:p-6">
                    <div className="flex items-start justify-between mb-3 md:mb-4">
                      <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl gold-gradient flex items-center justify-center group-hover:scale-110 transition-transform">
                        <Construction className="w-5 h-5 md:w-6 md:h-6 text-primary-foreground" />
                      </div>
                      <span className={`text-[10px] md:text-xs font-medium px-2 md:px-3 py-1 rounded-full ${statusColors[project.status] ?? "bg-muted text-muted-foreground"}`}>
                        {getStatusLabel(project.status)}
                      </span>
                    </div>
                    {project.title && <h4 className="font-display text-base md:text-lg font-bold mb-1 md:mb-2">{project.title}</h4>}
                    {project.description && <p className="text-xs md:text-sm text-muted-foreground line-clamp-2">{project.description}</p>}
                    {project.video_url && (
                      <span className="inline-flex items-center gap-1.5 mt-3 text-xs font-medium text-primary">
                        <Play className="w-3.5 h-3.5" /> Video Available
                      </span>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>

            {hasMore && !showAll && (
              <motion.div className="flex justify-center mb-12 md:mb-20" initial={{ opacity: 0 }} animate={inView ? { opacity: 1 } : {}} transition={{ delay: 0.4 }}>
                <button onClick={() => setShowAll(true)} className="group px-6 md:px-8 py-3 md:py-3.5 gold-gradient text-primary-foreground font-semibold rounded-full text-sm md:text-base flex items-center gap-2 shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300">
                  {t("gallery.viewMore", "View More")}
                  <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </button>
              </motion.div>
            )}

            {showAll && hasMore && (
              <motion.div className="flex justify-center mb-12 md:mb-20" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <button onClick={() => setShowAll(false)} className="px-6 py-3 bg-sand hover:bg-sand-dark text-foreground/70 font-medium rounded-full text-sm transition-all duration-300">
                  Show Less
                </button>
              </motion.div>
            )}
          </>
        )}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
          <Counter end={12} label={t("projects.completed")} icon={FolderCheck} />
          <Counter end={5000} label={t("projects.devotees")} icon={Heart} />
          <Counter end={7} label={t("projects.committeeMembers")} icon={Users} />
          <Counter end={2500} label={t("projects.followers")} icon={Star} />
        </div>
      </div>
    </section>
  );
};

export default ProjectsSection;
