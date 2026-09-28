import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { Route, Routes, useLocation, useNavigate } from "react-router";
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
import ServiceDetailPage from "./pages/ServiceDetailPage";
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

const AboutPage = lazy(() => import("./pages/AboutPage"));

function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [pathname]);

  return null;
}

export default function App() {
  const location = useLocation();
  const navigate = useNavigate();
  const previousPage = useRef<typeof location | null>(null);
  const [desktop, setDesktop] = useState(() => window.matchMedia("(min-width: 681px)").matches);
  useEffect(() => {
    const media = window.matchMedia("(min-width: 681px)");
    const update = () => setDesktop(media.matches);
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  const rootSlug = /^\/[^/]+\/?$/.test(location.pathname) && !new Set([
    "/", "/directory", "/organizations", "/organization", "/payment", "/notifications",
    "/support", "/services", "/about", "/service-order", "/contract", "/print-card",
    "/login", "/register", "/forgot-password", "/reset-password", "/create", "/dashboard", "/verification"
  ]).has(location.pathname.replace(/\/$/, "") || "/");
  const standaloneCard = location.pathname.startsWith("/card/") || rootSlug;
  const modalCard = desktop && standaloneCard;
  const background = previousPage.current ?? { ...location, pathname: "/", search: "", hash: "" };
  if (!standaloneCard) previousPage.current = location;
  const closeCard = () => previousPage.current ? navigate(`${background.pathname}${background.search}${background.hash}`) : navigate("/");
  useEffect(() => {
    if (!modalCard) return;
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") closeCard(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [modalCard, location.pathname]);
  const standaloneAuth = ["/login", "/register", "/forgot-password", "/reset-password", "/admin/login"].includes(location.pathname);
  const standaloneAdmin = location.pathname.startsWith("/admin");

  return (
    <div className="app-shell min-h-screen text-[var(--ink)]">
      <LoadingScreen />
      <ScrollToTop />
      {(!standaloneCard || modalCard) && !standaloneAuth && !standaloneAdmin && <Header />}
      <div className={modalCard ? "card-modal-background" : undefined} aria-hidden={modalCard || undefined}>
      <Routes location={modalCard ? background : location}>
        <Route path="/" element={<HomePage />} />
        <Route path="/directory" element={<DirectoryPage />} />
        <Route path="/organizations" element={<OrganizationsPage />} />
        <Route path="/organization" element={<OrganizationsPage />} />
        <Route path="/organization/apply" element={<ProtectedRoute><OrganizationApplyPage /></ProtectedRoute>} />
        <Route path="/organization/dashboard" element={<ProtectedRoute><OrganizationDashboardPage /></ProtectedRoute>} />
        <Route path="/organization/join" element={<ProtectedRoute><OrganizationJoinPage /></ProtectedRoute>} />
        <Route path="/organization/:slug" element={<OrganizationPublicPage />} />
        <Route path="/payment" element={<ProtectedRoute><PaymentPage /></ProtectedRoute>} />
        <Route path="/notifications" element={<ProtectedRoute><NotificationsPage /></ProtectedRoute>} />
        <Route path="/support" element={<SupportPage />} />
        <Route path="/services" element={<ServicesPage />} />
        <Route path="/services/:serviceId" element={<ServiceDetailPage />} />
        <Route
          path="/about"
          element={
            <Suspense fallback={<div className="min-h-[70vh]" aria-busy="true" aria-label="Loading" />}>
              <AboutPage />
            </Suspense>
          }
        />
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
        <Route path="/:slug" element={<CardPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
      </div>
      {modalCard && <div className="card-modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) closeCard(); }}>
        <section className="card-modal-window" role="dialog" aria-modal="true" aria-label="Цифровая визитка">
          <button type="button" className="card-modal-close" onClick={closeCard} aria-label="Закрыть визитку">×</button>
          <Routes location={location}><Route path="/card/:slug" element={<CardPage />} /><Route path="/:slug" element={<CardPage />} /></Routes>
        </section>
      </div>}
      {(!standaloneCard || modalCard) && !standaloneAuth && !standaloneAdmin && <HelpWidget />}
    </div>
  );
}
