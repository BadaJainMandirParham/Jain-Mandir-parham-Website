import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { trackPulseIQ } from "@/lib/pulseiq";

const PulseIQAnalytics = () => {
  const { pathname, search, hash } = useLocation();
  const { user, committeeMember } = useAuth();

  useEffect(() => {
    void trackPulseIQ("page_view", null, {
      path: pathname,
      title: document.title,
    });
  }, [pathname, search, hash]);

  const userId = user?.id || committeeMember?.id || null;
  useEffect(() => {
    if (userId) void trackPulseIQ("identify", userId);
  }, [userId]);

  return null;
};

export default PulseIQAnalytics;
