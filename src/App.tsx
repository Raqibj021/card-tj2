import { useEffect } from "react";
import { Route, Routes, useLocation } from "react-router";
import Header from "./components/layout/Header";
import HomePage from "./pages/HomePage";
import CreatePage from "./pages/CreatePage";
import CardPage from "./pages/CardPage";
import DashboardPage from "./pages/DashboardPage";
import AdminPage from "./pages/AdminPage";
import NotFoundPage from "./pages/NotFoundPage";
import DirectoryPage from "./pages/DirectoryPage";
import OrganizationsPage from "./pages/OrganizationsPage";
import OrganizationApplyPage from "./pages/OrganizationApplyPage";
import SupportPage from "./pages/SupportPage";
import ServicesPage from "./pages/ServicesPage";
import AuthPage from "./pages/AuthPage";
import PromoClaimer from "./components/PromoClaimer";
import OrganizationDashboardPage from "./pages/OrganizationDashboardPage";
import PaymentPage from "./pages/PaymentPage";
import AdminPaymentsPage from "./pages/AdminPaymentsPage";
import CrmPage from "./pages/CrmPage";
import LoadingScreen from "./components/LoadingScreen";
import HelpWidget from "./components/HelpWidget";
import ProtectedRoute from "./components/ProtectedRoute";
import PasswordRecoveryPage from "./pages/PasswordRecoveryPage";
import ModerationPage from "./pages/ModerationPage";
import VerificationPage from "./pages/VerificationPage";

function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [pathname]);

  return null;
}

export default function App() {
  const location = useLocation();
  const standaloneCard = location.pathname.startsWith("/card/");
  const standaloneAuth = ["/login", "/register", "/forgot-password", "/reset-password"].includes(location.pathname);

  return (
    <div className="min-h-screen bg-[var(--page)] text-[var(--ink)]">
      <LoadingScreen />
      <PromoClaimer />
      <ScrollToTop />
      {!standaloneCard && !standaloneAuth && <Header />}
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/directory" element={<DirectoryPage />} />
        <Route path="/organizations" element={<OrganizationsPage />} />
        <Route path="/organization/apply" element={<ProtectedRoute><OrganizationApplyPage /></ProtectedRoute>} />
        <Route path="/organization/dashboard" element={<ProtectedRoute><OrganizationDashboardPage /></ProtectedRoute>} />
        <Route path="/payment" element={<ProtectedRoute><PaymentPage /></ProtectedRoute>} />
        <Route path="/support" element={<SupportPage />} />
        <Route path="/services" element={<ServicesPage />} />
        <Route path="/login" element={<AuthPage mode="login" />} />
        <Route path="/register" element={<AuthPage mode="register" />} />
        <Route path="/forgot-password" element={<PasswordRecoveryPage />} />
        <Route path="/reset-password" element={<PasswordRecoveryPage reset />} />
        <Route path="/create" element={<CreatePage />} />
        <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
        <Route path="/dashboard/leads" element={<ProtectedRoute><CrmPage /></ProtectedRoute>} />
        <Route path="/verification" element={<ProtectedRoute><VerificationPage /></ProtectedRoute>} />
        <Route path="/admin" element={<ProtectedRoute roles={["admin", "moderator"]}><AdminPage /></ProtectedRoute>} />
        <Route path="/admin/payments" element={<ProtectedRoute roles={["admin", "moderator"]}><AdminPaymentsPage /></ProtectedRoute>} />
        <Route path="/admin/moderation" element={<ProtectedRoute roles={["admin", "moderator"]}><ModerationPage /></ProtectedRoute>} />
        <Route path="/card/:slug" element={<CardPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
      {!standaloneCard && !standaloneAuth && <HelpWidget />}
    </div>
  );
}
