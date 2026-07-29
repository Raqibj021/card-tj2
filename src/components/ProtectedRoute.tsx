import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router";
import { useAuth, type AccountRole } from "../context/AuthContext";

export default function ProtectedRoute({
  children,
  roles,
  loginPath = "/login",
  deniedPath = "/dashboard"
}: {
  children: ReactNode;
  roles?: AccountRole[];
  loginPath?: string;
  deniedPath?: string;
}) {
  const { user, profile, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <main className="route-loading" aria-live="polite">
        <span />
        <p>Загрузка кабинета…</p>
      </main>
    );
  }
  if (!user) {
    return <Navigate to={loginPath} replace state={{ from: location.pathname }} />;
  }
  if (roles?.length && (!profile || !roles.includes(profile.role))) {
    return <Navigate to={deniedPath} replace />;
  }
  return children;
}
