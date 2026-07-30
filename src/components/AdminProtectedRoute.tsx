import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router";
import { useAdminAuth } from "../context/AdminAuthContext";

export default function AdminProtectedRoute({ children }: { children: ReactNode }) {
  const { user, isAdmin, loading } = useAdminAuth();
  const location = useLocation();

  if (loading) {
    return (
      <main className="route-loading" aria-live="polite">
        <span />
        <p>Загрузка кабинета администратора…</p>
      </main>
    );
  }
  if (!user || !isAdmin) {
    return <Navigate to="/admin/login" replace state={{ from: location.pathname }} />;
  }
  return children;
}
