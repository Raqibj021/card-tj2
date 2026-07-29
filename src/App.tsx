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
import LoadingScreen from "./components/LoadingScreen";
import HelpWidget from "./components/HelpWidget";

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

  return (
    <div className="min-h-screen bg-[var(--page)] text-[var(--ink)]">
      <LoadingScreen />
      <ScrollToTop />
      {!standaloneCard && <Header />}
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/directory" element={<DirectoryPage />} />
        <Route path="/organizations" element={<OrganizationsPage />} />
        <Route path="/organization/apply" element={<OrganizationApplyPage />} />
        <Route path="/support" element={<SupportPage />} />
        <Route path="/services" element={<ServicesPage />} />
        <Route path="/create" element={<CreatePage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="/card/:slug" element={<CardPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
      {!standaloneCard && <HelpWidget />}
    </div>
  );
}
