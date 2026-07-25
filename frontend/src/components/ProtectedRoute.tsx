import { useEffect, useState, ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  children: ReactNode;
  role?: "admin" | "committee" | "visitor";
}

const ProtectedRoute = ({ children, role }: Props) => {
  const { user, loading } = useAuth();
  const [checking, setChecking] = useState<boolean>(!!role);
  const [allowed, setAllowed] = useState<boolean>(false);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      setChecking(false);
      return;
    }
    if (!role) {
      setAllowed(true);
      setChecking(false);
      return;
    }
    (async () => {
      const { data } = await (supabase as any)
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);
      const hasRole = (data ?? []).some((r: any) => r.role === role);
      setAllowed(hasRole);
      setChecking(false);
    })();
  }, [user, loading, role]);

  if (loading || checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cream">
        <div className="w-8 h-8 border-3 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  if (role && !allowed) return <Navigate to="/" replace />;
  return <>{children}</>;
};

export default ProtectedRoute;
