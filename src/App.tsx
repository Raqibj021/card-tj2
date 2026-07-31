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
import UserAuthPage from "./pages/UserAuthPage";
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
import OrganizationPublicPage from "./pages/OrganizationPublicPage";
import OrganizationJoinPage from "./pages/OrganizationJoinPage";
import NotificationsPage from "./pages/NotificationsPage";
import ServiceOrderPage from "./pages/ServiceOrderPage";
import ContractPage from "./pages/ContractPage";
import PrintCardDesignerPage from "./pages/PrintCardDesignerPage";
import OrdersPage from "./pages/OrdersPage";
import AdminCommercePage from "./pages/AdminCommercePage";
import AdminSupportPage from "./pages/AdminSupportPage";
import AdminLoginPage from "./pages/AdminLoginPage";
import AdminAccountsPage from "./pages/AdminAccountsPage";
import AdminCardsPage from "./pages/AdminCardsPage";
import AdminProtectedRoute from "./components/AdminProtectedRoute";

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
  const standaloneAuth = ["/login", "/register", "/forgot-password", "/reset-password", "/admin/login"].includes(location.pathname);
  const standaloneAdmin = location.pathname.startsWith("/admin");

  return (
    <div className="app-shell min-h-screen text-[var(--ink)]">
      <LoadingScreen />
      <ScrollToTop />
      {!standaloneCard && !standaloneAuth && !standaloneAdmin && <Header />}
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/directory" element={<DirectoryPage />} />
        <Route path="/organizations" element={<OrganizationsPage />} />
        <Route path="/organization/apply" element={<ProtectedRoute><OrganizationApplyPage /></ProtectedRoute>} />
        <Route path="/organization/dashboard" element={<ProtectedRoute><OrganizationDashboardPage /></ProtectedRoute>} />
        <Route path="/organization/:slug" element={<OrganizationPublicPage />} />
        <Route path="/organization/join" element={<ProtectedRoute><OrganizationJoinPage /></ProtectedRoute>} />
        <Route path="/payment" element={<ProtectedRoute><PaymentPage /></ProtectedRoute>} />
        <Route path="/notifications" element={<ProtectedRoute><NotificationsPage /></ProtectedRoute>} />
        <Route path="/support" element={<SupportPage />} />
        <Route path="/services" element={<ServicesPage />} />
        <Route path="/service-order" element={<ProtectedRoute><ServiceOrderPage /></ProtectedRoute>} />
        <Route path="/contract" element={<ProtectedRoute><ContractPage /></ProtectedRoute>} />
        <Route path="/print-card" element={<PrintCardDesignerPage />} />
        <Route path="/login" element={<UserAuthPage mode="login" />} />
        <Route path="/register" element={<UserAuthPage mode="register" />} />
        <Route path="/forgot-password" element={<PasswordRecoveryPage />} />
        <Route path="/reset-password" element={<PasswordRecoveryPage reset />} />
        <Route path="/create" element={<CreatePage />} />
        <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
        <Route path="/dashboard/leads" element={<ProtectedRoute><CrmPage /></ProtectedRoute>} />
        <Route path="/dashboard/orders" element={<ProtectedRoute><OrdersPage /></ProtectedRoute>} />
        <Route path="/verification" element={<ProtectedRoute><VerificationPage /></ProtectedRoute>} />
        <Route path="/admin/login" element={<AdminLoginPage />} />
        <Route path="/admin" element={<AdminProtectedRoute><AdminPage /></AdminProtectedRoute>} />
        <Route path="/admin/accounts" element={<AdminProtectedRoute><AdminAccountsPage /></AdminProtectedRoute>} />
        <Route path="/admin/cards" element={<AdminProtectedRoute><AdminCardsPage /></AdminProtectedRoute>} />
        <Route path="/admin/payments" element={<AdminProtectedRoute><AdminPaymentsPage /></AdminProtectedRoute>} />
        <Route path="/admin/moderation" element={<AdminProtectedRoute><ModerationPage /></AdminProtectedRoute>} />
        <Route path="/admin/commerce" element={<AdminProtectedRoute><AdminCommercePage /></AdminProtectedRoute>} />
        <Route path="/admin/support" element={<AdminProtectedRoute><AdminSupportPage /></AdminProtectedRoute>} />
        <Route path="/card/:slug" element={<CardPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
      {!standaloneCard && !standaloneAuth && !standaloneAdmin && <HelpWidget />}
    </div>
  );
}
