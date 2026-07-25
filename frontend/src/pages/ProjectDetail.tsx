import { useParams, Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Construction, Play, MapPin, Calendar, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useTranslation } from "react-i18next";

const sb = supabase as any;

const ProjectDetail = () => {
  const { id } = useParams();
  const [project, setProject] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { t } = useTranslation();

  useEffect(() => {
    const load = async () => {
      const { data } = await sb.from("projects").select("*").eq("id", id).single();
      setProject(data);
      setLoading(false);
    };
    load();
  }, [id]);

  const statusColors: Record<string, string> = {
    under_construction: "bg-amber-100 text-amber-700",
    completed: "bg-emerald-100 text-emerald-700",
    future: "bg-purple-100 text-purple-700",
  };

  const getStatusLabel = (status: string) => {
    if (status === "completed") return t("projects.completed");
    if (status === "under_construction") return t("projects.underConstruction");
    if (status === "future") return t("projects.future");
    return status;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cream">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-cream gap-4">
        <p className="text-muted-foreground">Project not found</p>
        <Link to="/" className="text-primary underline">Go Back</Link>
      </div>
    );
  }

  const getYouTubeEmbedUrl = (url: string) => {
    const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([\w-]+)/);
    return match ? `https://www.youtube.com/embed/${match[1]}` : url;
  };

  return (
    <div className="min-h-screen bg-cream">
      <div className="container mx-auto max-w-4xl px-4 py-8 md:py-16">
        <Link to="/#projects" className="inline-flex items-center gap-2 text-primary hover:underline mb-6 text-sm font-medium">
          <ArrowLeft className="w-4 h-4" /> {t("projects.backToProjects", "Back to Projects")}
        </Link>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          {/* Header */}
          <div className="flex items-start gap-4 mb-6">
            <div className="w-14 h-14 rounded-xl gold-gradient flex items-center justify-center flex-shrink-0">
              <Construction className="w-7 h-7 text-primary-foreground" />
            </div>
            <div className="flex-1">
              {project.title && (
                <h1 className="font-display text-2xl md:text-4xl font-bold gold-text mb-2">{project.title}</h1>
              )}
              <span className={`inline-block text-xs font-medium px-3 py-1 rounded-full ${statusColors[project.status] ?? "bg-muted text-muted-foreground"}`}>
                {getStatusLabel(project.status)}
              </span>
            </div>
          </div>

          {/* Image */}
          {project.image_url && (
            <div className="rounded-2xl overflow-hidden mb-8 glow-gold">
              <img src={project.image_url} alt={project.title || "Project"} className="w-full max-h-[500px] object-cover" />
            </div>
          )}

          {/* Description */}
          {project.description && (
            <div className="glass-card p-6 md:p-8 mb-8">
              <h3 className="font-display text-lg font-bold mb-3">{t("projects.description", "Description")}</h3>
              <p className="text-foreground/80 leading-relaxed whitespace-pre-wrap">{project.description}</p>
            </div>
          )}

          {/* Video */}
          {project.video_url && (
            <div className="mb-8">
              <h3 className="font-display text-lg font-bold mb-4 flex items-center gap-2">
                <Play className="w-5 h-5 text-primary" /> {t("projects.video", "Project Video")}
              </h3>
              <div className="rounded-2xl overflow-hidden glow-gold aspect-video">
                <iframe
                  src={getYouTubeEmbedUrl(project.video_url)}
                  title="Project Video"
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  referrerPolicy="strict-origin-when-cross-origin"
                  allowFullScreen
                  className="w-full h-full"
                />
              </div>
            </div>
          )}

          {/* Meta */}
          <div className="glass-card p-4 md:p-6 text-xs md:text-sm text-muted-foreground flex flex-wrap gap-4">
            {project.created_at && (
              <span className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" /> Created: {new Date(project.created_at).toLocaleDateString()}
              </span>
            )}
            {project.updated_at && (
              <span className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" /> Updated: {new Date(project.updated_at).toLocaleDateString()}
              </span>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default ProjectDetail;
