import { useState, useEffect, createContext, useContext } from "react";
import PublicSite from "./pages/PublicSite";
import OrganizerPortal from "./pages/OrganizerPortal";
import AttendeeDashboard from "./pages/AttendeeDashboard";
import AdminPortal from "./pages/AdminPortal";
import AuthModal from "./components/AuthModal";

const API_BASE = "http://localhost:8000/api";
export { API_BASE };

export const ThemeContext = createContext({ theme: "dark", toggleTheme: () => {} });
export const useTheme = () => useContext(ThemeContext);

export default function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [adminUser, setAdminUser] = useState(null);
  const [view, setView] = useState("public");
  const [authModal, setAuthModal] = useState(null);
  const [token, setToken] = useState(localStorage.getItem("ef_token") || null);
  const [adminToken, setAdminToken] = useState(localStorage.getItem("ef_admin_token") || null);

  const savedTheme = localStorage.getItem("ef_theme");
  const [theme, setTheme] = useState(savedTheme === "light" ? "light" : "dark");

  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    localStorage.setItem("ef_theme", next);
  };

  useEffect(() => {
    document.body.style.background = theme === "dark" ? "#0A0A0F" : "#F1F5F9";
    document.body.style.color = theme === "dark" ? "#F0F0F5" : "#0F172A";
    document.body.style.margin = "0";
    document.body.style.padding = "0";
    document.body.style.transition = "background 0.3s, color 0.3s";
  }, [theme]);

  document.body.style.background = theme === "dark" ? "#0A0A0F" : "#F1F5F9";
  document.body.style.color = theme === "dark" ? "#F0F0F5" : "#0F172A";
  document.body.style.margin = "0";
  document.body.style.padding = "0";

  useEffect(() => {
    if (window.location.hash === "#/admin-portal-secure") setView("admin");
  }, []);

  useEffect(() => {
    if (token) fetchMe(token);
    if (adminToken) fetchAdminMe(adminToken);
  }, []);

  const fetchMe = async (t) => {
    try {
      const res = await fetch(`${API_BASE}/auth/me/`, { headers: { Authorization: `Token ${t}` } });
      if (res.ok) {
        const data = await res.json();
        setCurrentUser(data);
        setView(data.role === "attendee" ? "attendee" : "organizer");
      } else {
        localStorage.removeItem("ef_token");
        setToken(null);
      }
    } catch {}
  };

  const fetchAdminMe = async (t) => {
    try {
      const res = await fetch(`${API_BASE}/auth/admin-me/`, { headers: { Authorization: `Token ${t}` } });
      if (res.ok) {
        const data = await res.json();
        setAdminUser(data);
        setView("admin");
      } else {
        localStorage.removeItem("ef_admin_token");
        setAdminToken(null);
      }
    } catch {}
  };

  const handleLogin = (userData, userToken) => {
    setCurrentUser(userData);
    setToken(userToken);
    localStorage.setItem("ef_token", userToken);
    // Route based on role
    setView(userData.role === "attendee" ? "attendee" : "organizer");
    setAuthModal(null);
  };

  const handleAdminLogin = (adminData, aToken) => {
    setAdminUser(adminData);
    setAdminToken(aToken);
    localStorage.setItem("ef_admin_token", aToken);
    setView("admin");
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setToken(null);
    localStorage.removeItem("ef_token");
    setView("public");
  };

  const handleAdminLogout = () => {
    setAdminUser(null);
    setAdminToken(null);
    localStorage.removeItem("ef_admin_token");
    setView("public");
    window.location.hash = "";
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {view === "admin" && (
        <AdminPortal adminUser={adminUser} adminToken={adminToken} onLogin={handleAdminLogin} onLogout={handleAdminLogout} />
      )}
      {view === "organizer" && currentUser && (
        <OrganizerPortal user={currentUser} token={token} onLogout={handleLogout} />
      )}
      {view === "attendee" && currentUser && (
        <AttendeeDashboard user={currentUser} token={token} onLogout={handleLogout} />
      )}
      {view === "public" && (
        <>
          <PublicSite onOpenAuth={(mode) => setAuthModal(mode)} currentUser={currentUser} onGoToDashboard={() => setView(currentUser?.role === "attendee" ? "attendee" : "organizer")} />
          {authModal && (
            <AuthModal mode={authModal} onClose={() => setAuthModal(null)} onLogin={handleLogin} onSwitchMode={(m) => setAuthModal(m)} />
          )}
        </>
      )}
    </ThemeContext.Provider>
  );
}
