import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router";
import App from "./App";
import { AppProvider } from "./context/AppContext";
import { AuthProvider } from "./context/AuthContext";
import { AdminAuthProvider } from "./context/AdminAuthContext";
import AppErrorBoundary from "./components/AppErrorBoundary";
import "./index.css";

const basename = import.meta.env.BASE_URL === "/"
  ? "/"
  : import.meta.env.BASE_URL.replace(/\/$/, "");

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter basename={basename}>
      <AppProvider>
        <AuthProvider>
          <AdminAuthProvider>
            <AppErrorBoundary>
              <App />
            </AppErrorBoundary>
          </AdminAuthProvider>
        </AuthProvider>
      </AppProvider>
    </BrowserRouter>
  </StrictMode>
);
