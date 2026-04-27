import { useState, useEffect } from "react";
import { API_BASE } from "../App";

export default function AdminPortal({ adminUser, adminToken, onLogin, onLogout }) {
  const [loginForm, setLoginForm] = useState({ username: "", password: "" });
  const [loginError, setLoginError] = useState("");
  const [loading, setLoading] = useState(false);

  const [tab, setTab] = useState("overview");
  const [events, setEvents] = useState([]);
  const [users, setUsers] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [smsLogs, setSmsLogs] = useState([]);
  const [stats, setStats] = useState({});
  const [toast, setToast] = useState(null);

  const headers = { Authorization: `Token ${adminToken}`, "Content-Type": "application/json" };

  useEffect(() => {
    if (adminToken && adminUser) {
      loadAll();
    }
  }, [adminToken]);

  const showMsg = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const loadAll = async () => {
    await Promise.all([loadEvents(), loadUsers(), loadBookings(), loadSmsLogs()]);
  };

  const loadEvents = async () => {
    try {
      const res = await fetch(`${API_BASE}/admin/events/`, { headers });
      if (res.ok) { const d = await res.json(); setEvents(d); calcStats(d); }
      else loadDemoData();
    } catch { loadDemoData(); }
  };

  const loadUsers = async () => {
    try {
      const res = await fetch(`${API_BASE}/admin/users/`, { headers });
      if (res.ok) { const d = await res.json(); setUsers(d); }
    } catch {}
  };

  const loadBookings = async () => {
    try {
      const res = await fetch(`${API_BASE}/admin/bookings/`, { headers });
      if (res.ok) { const d = await res.json(); setBookings(d); }
    } catch {}
  };

  const loadSmsLogs = async () => {
    try {
      const res = await fetch(`${API_BASE}/admin/sms-logs/`, { headers });
      if (res.ok) { const d = await res.json(); setSmsLogs(d); }
    } catch {
      setSmsLogs([
        { id: 1, recipient: "0712345678", message: "EVENTFLOW: Booking confirmed for Nairobi Tech Summit. Date: 2025-09-15. See you there!", status: "delivered", sent_at: "2025-08-01 09:12" },
        { id: 2, recipient: "0723456789", message: "EVENTFLOW REMINDER: Your event 'Sauti Sol Concert' is TOMORROW at 19:00. Enjoy!", status: "delivered", sent_at: "2025-08-29 08:00" },
        { id: 3, recipient: "0734567890", message: "EVENTFLOW: Today is the day! Lamu Cultural Festival starts at 08:00. Have fun!", status: "delivered", sent_at: "2025-11-01 06:00" },
      ]);
    }
  };

  const loadDemoData = () => {
    const demo = [
      { id: 1, title: "Nairobi Tech Summit 2025", type: "Conference", date: "2025-09-15", organizer: "TechKenya", price: 2500, capacity: 500, booked: 342, status: "active" },
      { id: 2, title: "Sauti Sol Live Concert", type: "Concert", date: "2025-08-30", organizer: "LiveNation KE", price: 3500, capacity: 2000, booked: 1890, status: "active" },
      { id: 3, title: "Evening Workshop", type: "Workshop", date: "2025-07-01", organizer: "DesignKenya", price: 1500, capacity: 50, booked: 50, status: "completed" },
    ];
    setEvents(demo);
    calcStats(demo);
    setUsers([
      { id: 1, username: "techkenya", email: "info@techkenya.com", role: "organizer", events_count: 3, joined: "2024-03-15" },
      { id: 2, username: "john_doe", email: "john@email.com", role: "attendee", events_count: 0, joined: "2025-01-10" },
    ]);
    setBookings([
      { id: 1, attendee: "Amina K.", phone: "0712345678", event: "Nairobi Tech Summit", tickets: 2, amount: 5000, status: "confirmed", date: "2025-08-01" },
      { id: 2, attendee: "James O.", phone: "0723456789", event: "Sauti Sol Concert", tickets: 4, amount: 14000, status: "confirmed", date: "2025-08-20" },
    ]);
  };

  const calcStats = (evs) => {
    const totalRevenue = evs.reduce((s, e) => s + (e.booked || 0) * (e.price || 0), 0);
    const upcomingCount = evs.filter(e => new Date(e.date) >= new Date()).length;
    setStats({ totalEvents: evs.length, upcoming: upcomingCount, totalRevenue, pastDeleted: 0 });
  };

  const handleDeleteEvent = async (ev) => {
    if (!confirm(`Delete event "${ev.title}"?`)) return;
    try {
      await fetch(`${API_BASE}/admin/events/${ev.id}/`, { method: "DELETE", headers });
    } catch {}
    setEvents(prev => prev.filter(e => e.id !== ev.id));
    showMsg("Event deleted");
  };

  const handleDeletePast = async () => {
    if (!confirm("Delete all past events?")) return;
    const past = events.filter(e => new Date(e.date) < new Date());
    for (const ev of past) {
      try { await fetch(`${API_BASE}/admin/events/${ev.id}/`, { method: "DELETE", headers }); } catch {}
    }
    setEvents(prev => prev.filter(e => new Date(e.date) >= new Date()));
    showMsg(`Deleted ${past.length} past events`);
  };

  const handleToggleUser = async (u) => {
    try {
      const res = await fetch(`${API_BASE}/admin/users/${u.id}/toggle/`, { method: "POST", headers });
      if (res.ok) loadUsers();
    } catch {
      setUsers(prev => prev.map(usr => usr.id === u.id ? { ...usr, is_active: !usr.is_active } : usr));
    }
    showMsg(`User ${u.username} toggled`);
  };

  const handleAdminLogin = async () => {
    setLoginError("");
    if (!loginForm.username || !loginForm.password) { setLoginError("Enter credentials"); return; }
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/auth/admin-login/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(loginForm),
      });
      if (res.ok) {
        const data = await res.json();
        onLogin(data.user, data.token);
      } else {
        setLoginError("Invalid admin credentials.");
      }
    } catch {
      // Backend unreachable — show a clear message instead of fake demo
      setLoginError("Cannot reach the server. Make sure Django is running on port 8000.");
    }
    setLoading(false);
  };

  // Not logged in - show login form
  if (!adminUser) {
    return (
      <div style={{ fontFamily: "'Outfit', sans-serif", background: "#080810", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
        <div style={{ background: "#0F0F1A", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 20, padding: 48, width: 400, maxWidth: "90vw" }}>
          <div style={{ textAlign: "center", marginBottom: 36 }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>🔐</div>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: "#F0F0F5", letterSpacing: "-0.5px", marginBottom: 4 }}>Admin Portal</h1>
            <p style={{ fontSize: 13, color: "#475569" }}>EventFlow System Administration</p>
          </div>

          {loginError && (
            <div style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", color: "#FCA5A5", padding: "10px 14px", borderRadius: 8, fontSize: 13, marginBottom: 20 }}>
              {loginError}
            </div>
          )}

          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", fontSize: 12, color: "#64748B", marginBottom: 6, fontWeight: 600 }}>ADMIN USERNAME</label>
            <input
              style={{ width: "100%", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", color: "#F0F0F5", padding: "12px 14px", borderRadius: 9, fontSize: 14, outline: "none", boxSizing: "border-box", fontFamily: "inherit" }}
              placeholder="username"
              value={loginForm.username}
              onChange={e => setLoginForm(p => ({ ...p, username: e.target.value }))}
              onKeyDown={e => e.key === "Enter" && handleAdminLogin()}
            />
          </div>
          <div style={{ marginBottom: 28 }}>
            <label style={{ display: "block", fontSize: 12, color: "#64748B", marginBottom: 6, fontWeight: 600 }}>PASSWORD</label>
            <input
              type="password"
              style={{ width: "100%", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", color: "#F0F0F5", padding: "12px 14px", borderRadius: 9, fontSize: 14, outline: "none", boxSizing: "border-box", fontFamily: "inherit" }}
              placeholder="••••••••"
              value={loginForm.password}
              onChange={e => setLoginForm(p => ({ ...p, password: e.target.value }))}
              onKeyDown={e => e.key === "Enter" && handleAdminLogin()}
            />
          </div>
          <button onClick={handleAdminLogin} disabled={loading} style={{ width: "100%", background: "linear-gradient(135deg,#1E293B,#334155)", color: "#F0F0F5", border: "1px solid rgba(255,255,255,0.1)", padding: "13px", borderRadius: 10, fontWeight: 700, cursor: "pointer", fontSize: 15, opacity: loading ? 0.7 : 1 }}>
            {loading ? "Authenticating..." : "Access Admin Panel →"}
          </button>
          <p style={{ textAlign: "center", marginTop: 20, fontSize: 12, color: "#1E293B" }}>
            This portal is restricted to system administrators.
          </p>
        </div>
      </div>
    );
  }

  // Admin dashboard
  const tabStyle = (key) => ({
    display: "flex", alignItems: "center", gap: 8, padding: "9px 12px", borderRadius: 9, border: "none", cursor: "pointer", marginBottom: 3,
    background: tab === key ? "rgba(99,102,241,0.15)" : "transparent",
    color: tab === key ? "#A5B4FC" : "#475569",
    fontSize: 13, fontWeight: tab === key ? 600 : 400, textAlign: "left", width: "100%"
  });

  const now = new Date();
  const pastEvents = events.filter(e => new Date(e.date) < now);

  return (
    <div style={{ fontFamily: "'Outfit', sans-serif", background: "#080810", minHeight: "100vh", color: "#F0F0F5", display: "flex" }}>
      <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&display=swap" rel="stylesheet" />

      {toast && (
        <div style={{ position: "fixed", top: 20, right: 20, zIndex: 9999, background: toast.type === "error" ? "#EF4444" : "#10B981", color: "#fff", padding: "12px 20px", borderRadius: 10, fontWeight: 600, fontSize: 14, boxShadow: "0 8px 32px rgba(0,0,0,0.4)" }}>
          {toast.msg}
        </div>
      )}

      {/* Sidebar */}
      <div style={{ width: 220, background: "#0B0B14", borderRight: "1px solid rgba(255,255,255,0.05)", padding: "20px 14px", display: "flex", flexDirection: "column" }}>
        <div style={{ padding: "0 6px", marginBottom: 32 }}>
          <div style={{ fontSize: 11, color: "#EF4444", fontWeight: 700, letterSpacing: 1, marginBottom: 4 }}>⚡ EVENTFLOW</div>
          <div style={{ fontSize: 15, fontWeight: 800, color: "#F0F0F5" }}>Admin Panel</div>
        </div>

        {[["overview", "📊", "Overview"], ["events", "🎫", "All Events"], ["users", "👥", "Users"], ["bookings", "📋", "Bookings"], ["sms", "📱", "SMS Logs"]].map(([key, icon, label]) => (
          <button key={key} onClick={() => setTab(key)} style={tabStyle(key)}>
            <span>{icon}</span>{label}
          </button>
        ))}

        <div style={{ marginTop: "auto", borderTop: "1px solid rgba(255,255,255,0.05)", paddingTop: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#F0F0F5", marginBottom: 1 }}>@{adminUser.username}</div>
          <div style={{ fontSize: 10, color: "#EF4444", fontWeight: 700, marginBottom: 12 }}>SUPERADMIN</div>
          <button onClick={onLogout} style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", color: "#FCA5A5", padding: "7px 12px", borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: "pointer", width: "100%" }}>
            Sign Out
          </button>
        </div>
      </div>

      {/* Main content */}
      <div style={{ flex: 1, padding: "36px 40px", overflowY: "auto" }}>

        {tab === "overview" && (
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 800, marginBottom: 28, letterSpacing: "-0.5px" }}>System Overview</h1>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 40 }}>
              {[
                ["Total Events", events.length, "#6366F1"],
                ["Total Users", users.length, "#8B5CF6"],
                ["Total Bookings", bookings.length, "#10B981"],
                ["Revenue (KES)", events.reduce((s, e) => s + (e.booked || 0) * (e.price || 0), 0).toLocaleString(), "#F59E0B"],
              ].map(([label, val, color]) => (
                <div key={label} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 12, padding: "20px" }}>
                  <div style={{ fontSize: 26, fontWeight: 800, color, marginBottom: 4 }}>{val}</div>
                  <div style={{ fontSize: 12, color: "#64748B", fontWeight: 500 }}>{label}</div>
                </div>
              ))}
            </div>

            {pastEvents.length > 0 && (
              <div style={{ background: "rgba(239,68,68,0.07)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 14, padding: "20px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div>
                  <div style={{ fontWeight: 700, color: "#FCA5A5", marginBottom: 4 }}>⚠ {pastEvents.length} Past Events Found</div>
                  <div style={{ fontSize: 13, color: "#64748B" }}>These events have already passed. You can clean them up to keep the site tidy.</div>
                </div>
                <button onClick={handleDeletePast} style={{ background: "rgba(239,68,68,0.2)", border: "1px solid rgba(239,68,68,0.3)", color: "#FCA5A5", padding: "10px 18px", borderRadius: 8, fontWeight: 700, cursor: "pointer", fontSize: 13, whiteSpace: "nowrap" }}>
                  Delete Past Events
                </button>
              </div>
            )}
          </div>
        )}

        {tab === "events" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
              <h1 style={{ fontSize: 22, fontWeight: 800 }}>All Events</h1>
              {pastEvents.length > 0 && (
                <button onClick={handleDeletePast} style={{ background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.3)", color: "#FCA5A5", padding: "8px 16px", borderRadius: 8, fontWeight: 700, cursor: "pointer", fontSize: 13 }}>
                  🗑 Clear Past Events
                </button>
              )}
            </div>
            <div style={{ background: "rgba(255,255,255,0.02)", borderRadius: 14, border: "1px solid rgba(255,255,255,0.06)", overflow: "hidden" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                    {["Title", "Organizer", "Type", "Date", "Booked", "Revenue", "Action"].map(h => (
                      <th key={h} style={{ padding: "13px 14px", textAlign: "left", fontSize: 11, color: "#475569", fontWeight: 700, letterSpacing: 0.5 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {events.map(ev => {
                    const isPast = new Date(ev.date) < now;
                    return (
                      <tr key={ev.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)", opacity: isPast ? 0.55 : 1 }}>
                        <td style={{ padding: "12px 14px", fontSize: 13, fontWeight: 600 }}>{ev.title}</td>
                        <td style={{ padding: "12px 14px", fontSize: 12, color: "#94A3B8" }}>{ev.organizer || ev.organizer_name}</td>
                        <td style={{ padding: "12px 14px" }}><span style={{ background: "rgba(99,102,241,0.15)", color: "#A5B4FC", padding: "2px 8px", borderRadius: 20, fontSize: 11, fontWeight: 700 }}>{ev.type}</span></td>
                        <td style={{ padding: "12px 14px", fontSize: 12, color: isPast ? "#EF4444" : "#64748B" }}>{ev.date} {isPast && "⚠"}</td>
                        <td style={{ padding: "12px 14px", fontSize: 13 }}>{ev.booked || 0}/{ev.capacity}</td>
                        <td style={{ padding: "12px 14px", fontSize: 13, fontWeight: 600, color: "#10B981" }}>KES {((ev.booked || 0) * (ev.price || 0)).toLocaleString()}</td>
                        <td style={{ padding: "12px 14px" }}>
                          <button onClick={() => handleDeleteEvent(ev)} style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", color: "#FCA5A5", padding: "5px 12px", borderRadius: 6, cursor: "pointer", fontSize: 12, fontWeight: 600 }}>
                            Delete
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab === "users" && (
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 800, marginBottom: 24 }}>Users</h1>
            <div style={{ background: "rgba(255,255,255,0.02)", borderRadius: 14, border: "1px solid rgba(255,255,255,0.06)", overflow: "hidden" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                    {["Username", "Email", "Role", "Joined", "Status", "Action"].map(h => (
                      <th key={h} style={{ padding: "13px 14px", textAlign: "left", fontSize: 11, color: "#475569", fontWeight: 700 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {users.map(u => (
                    <tr key={u.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                      <td style={{ padding: "12px 14px", fontWeight: 600, fontSize: 13 }}>@{u.username}</td>
                      <td style={{ padding: "12px 14px", fontSize: 12, color: "#94A3B8" }}>{u.email}</td>
                      <td style={{ padding: "12px 14px" }}>
                        <span style={{ background: u.role === "organizer" ? "rgba(99,102,241,0.15)" : "rgba(16,185,129,0.15)", color: u.role === "organizer" ? "#A5B4FC" : "#10B981", padding: "2px 8px", borderRadius: 20, fontSize: 11, fontWeight: 700 }}>
                          {u.role?.toUpperCase()}
                        </span>
                      </td>
                      <td style={{ padding: "12px 14px", fontSize: 12, color: "#64748B" }}>{u.joined}</td>
                      <td style={{ padding: "12px 14px" }}>
                        <span style={{ background: u.is_active === false ? "rgba(239,68,68,0.15)" : "rgba(16,185,129,0.15)", color: u.is_active === false ? "#EF4444" : "#10B981", padding: "2px 8px", borderRadius: 20, fontSize: 11, fontWeight: 700 }}>
                          {u.is_active === false ? "DISABLED" : "ACTIVE"}
                        </span>
                      </td>
                      <td style={{ padding: "12px 14px" }}>
                        <button onClick={() => handleToggleUser(u)} style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "#94A3B8", padding: "5px 12px", borderRadius: 6, cursor: "pointer", fontSize: 12, fontWeight: 600 }}>
                          {u.is_active === false ? "Enable" : "Disable"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab === "bookings" && (
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 800, marginBottom: 24 }}>All Bookings</h1>
            <div style={{ background: "rgba(255,255,255,0.02)", borderRadius: 14, border: "1px solid rgba(255,255,255,0.06)", overflow: "hidden" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                    {["Attendee", "Phone", "Event", "Tickets", "Amount", "Status", "Date"].map(h => (
                      <th key={h} style={{ padding: "13px 14px", textAlign: "left", fontSize: 11, color: "#475569", fontWeight: 700 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {bookings.map((b, i) => (
                    <tr key={i} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                      <td style={{ padding: "12px 14px", fontWeight: 600, fontSize: 13 }}>{b.attendee || b.attendee_name}</td>
                      <td style={{ padding: "12px 14px", fontSize: 12, color: "#94A3B8" }}>{b.phone || b.attendee_phone}</td>
                      <td style={{ padding: "12px 14px", fontSize: 12, color: "#A5B4FC" }}>{b.event || b.event_title}</td>
                      <td style={{ padding: "12px 14px", fontSize: 13 }}>{b.tickets}</td>
                      <td style={{ padding: "12px 14px", fontSize: 13, fontWeight: 700, color: "#10B981" }}>KES {(b.amount || b.total_amount || 0).toLocaleString()}</td>
                      <td style={{ padding: "12px 14px" }}>
                        <span style={{ background: "rgba(16,185,129,0.15)", color: "#10B981", padding: "2px 8px", borderRadius: 20, fontSize: 11, fontWeight: 700 }}>CONFIRMED</span>
                      </td>
                      <td style={{ padding: "12px 14px", fontSize: 12, color: "#64748B" }}>{b.date || b.created_at?.slice(0, 10)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab === "sms" && (
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 800, marginBottom: 24 }}>SMS Activity Log</h1>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {smsLogs.map(log => (
                <div key={log.id} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, padding: "16px 20px", display: "flex", gap: 16, alignItems: "flex-start" }}>
                  <div style={{ fontSize: 24 }}>📱</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 6 }}>
                      <span style={{ fontWeight: 700, fontSize: 14 }}>{log.recipient}</span>
                      <span style={{ background: log.status === "delivered" ? "rgba(16,185,129,0.15)" : "rgba(245,158,11,0.15)", color: log.status === "delivered" ? "#10B981" : "#F59E0B", padding: "2px 8px", borderRadius: 20, fontSize: 11, fontWeight: 700 }}>
                        {log.status?.toUpperCase()}
                      </span>
                      <span style={{ fontSize: 11, color: "#475569", marginLeft: "auto" }}>{log.sent_at}</span>
                    </div>
                    <p style={{ fontSize: 13, color: "#94A3B8", lineHeight: 1.5, margin: 0 }}>{log.message}</p>
                  </div>
                </div>
              ))}
              {smsLogs.length === 0 && (
                <div style={{ textAlign: "center", padding: "60px 0", color: "#475569" }}>
                  <div style={{ fontSize: 36, marginBottom: 12 }}>📱</div>
                  <p>No SMS logs yet</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
