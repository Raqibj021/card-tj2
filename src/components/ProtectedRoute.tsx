import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router";
import { useAuth, type AccountRole } from "../context/AuthContext";

export default function ProtectedRoute({
  children,
  roles
}: {
  children: ReactNode;
  roles?: AccountRole[];
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
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  if (roles?.length && (!profile || !roles.includes(profile.role))) {
    return <Navigate to="/dashboard" replace />;
  }
  return children;
}
