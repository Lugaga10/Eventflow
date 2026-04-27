import { useState, useEffect, useContext } from "react";
import { API_BASE, ThemeContext } from "../App";

const EVENT_TYPES = ["Conference", "Concert", "Workshop", "Festival", "Networking", "Sports", "Other"];
const EMPTY_FORM = { title: "", type: "Conference", date: "", time: "", venue: "", price: 0, capacity: 100, description: "", is_featured: false, image: "" };

function MiniBarChart({ data, color = "#6366F1", T }) {
  if (!data || data.length === 0) return null;
  const max = Math.max(...data.map(d => d.value), 1);
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 4, height: 48, marginTop: 12 }}>
      {data.map((d, i) => (
        <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
          <div style={{ width: "100%", background: color, borderRadius: "3px 3px 0 0", height: `${(d.value / max) * 40}px`, minHeight: 3, opacity: i === data.length - 1 ? 1 : 0.5, transition: "height 0.5s" }} title={`${d.label}: ${d.value}`} />
          <div style={{ fontSize: 9, color: T.textMuted, fontWeight: 600 }}>{d.label}</div>
        </div>
      ))}
    </div>
  );
}

export default function OrganizerPortal({ user, token, onLogout }) {
  const { theme, toggleTheme } = useContext(ThemeContext);
  const isDark = theme === "dark";

  const [events, setEvents] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [tab, setTab] = useState("overview");
  const [showForm, setShowForm] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [toast, setToast] = useState(null);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({ total: 0, upcoming: 0, totalBookings: 0, revenue: 0 });
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Ticket tier management
  const [tiers, setTiers] = useState([]);
  const [showTierForm, setShowTierForm] = useState(false);
  const [tierForm, setTierForm] = useState({ name: "", tier_type: "standard", price: 0, capacity: 50, description: "" });
  const EMPTY_TIER = { name: "", tier_type: "standard", price: 0, capacity: 50, description: "" };
  const TIER_PRESETS = [
    { name: "Early Bird", tier_type: "early_bird", price: "", capacity: 20, description: "Limited early bird tickets at a discounted price." },
    { name: "Regular",    tier_type: "standard",   price: "", capacity: 50, description: "Standard admission ticket." },
    { name: "VIP",        tier_type: "vip",        price: "", capacity: 15, description: "VIP access with exclusive seating and perks." },
    { name: "VVIP",       tier_type: "vvip",       price: "", capacity: 5,  description: "Premium VVIP experience with full hospitality." },
  ];

  // Org profile state
  const [orgForm, setOrgForm] = useState({
    org_name: user.org_name || "",
    org_description: user.org_description || "",
    org_website: user.org_website || "",
    org_logo: user.org_logo || "",
  });
  const [orgSaving, setOrgSaving] = useState(false);

  // M-Pesa state — event-based bulk push
  const [mpesaEventId, setMpesaEventId] = useState("");
  const [mpesaLoading, setMpesaLoading] = useState(false);
  const [mpesaResult, setMpesaResult] = useState(null);

  // SMS state — event-based automated
  const [smsEventId, setSmsEventId] = useState("");
  const [smsType, setSmsType] = useState("reminder");
  const [smsLoading, setSmsLoading] = useState(false);
  const [smsResult, setSmsResult] = useState(null);
  const [smsLogs, setSmsLogs] = useState([
    { id: 1, phone: "0712345678", message: "EVENTFLOW: Booking confirmed for Nairobi Tech Summit. Date: 2026-09-15.", status: "delivered", time: "2025-08-01 09:12" },
    { id: 2, phone: "0723456789", message: "EVENTFLOW REMINDER: Your event is TOMORROW at 10:00. See you there!", status: "delivered", time: "2025-09-04 08:00" },
  ]);

  const headers = { Authorization: `Token ${token}`, "Content-Type": "application/json" };

  const T = {
    bg: isDark ? "#0A0A0F" : "#F1F5F9",
    sidebar: isDark ? "#0D0D15" : "#FFFFFF",
    sidebarBorder: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.07)",
    surface: isDark ? "rgba(255,255,255,0.03)" : "#FFFFFF",
    surfaceBorder: isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.08)",
    text: isDark ? "#F0F0F5" : "#0F172A",
    textSub: isDark ? "#94A3B8" : "#64748B",
    textMuted: isDark ? "#64748B" : "#94A3B8",
    inputBg: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)",
    inputBorder: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)",
    modalBg: isDark ? "#12121A" : "#FFFFFF",
    rowBorder: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)",
  };

  useEffect(() => { loadEvents(); loadBookings(); }, []);

  const showMsg = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const loadEvents = async () => {
    try {
      const res = await fetch(`${API_BASE}/events/my/`, { headers });
      if (res.ok) { const data = await res.json(); setEvents(data); calcStats(data); }
      else loadDemoEvents();
    } catch { loadDemoEvents(); }
  };

  const loadDemoEvents = () => {
    const demo = [
      { id: 1, title: "My Tech Conference", type: "Conference", date: "2026-09-15", time: "09:00", venue: "KICC Nairobi", price: 2500, capacity: 200, booked: 87, description: "Annual tech conference", is_featured: true },
      { id: 2, title: "Evening Workshop", type: "Workshop", date: "2026-10-10", time: "14:00", venue: "iHub", price: 1000, capacity: 40, booked: 22, description: "Design workshop", is_featured: false },
      { id: 3, title: "Music Night", type: "Concert", date: "2025-06-01", time: "19:00", venue: "Carnivore", price: 2000, capacity: 300, booked: 300, description: "Past concert", is_featured: false },
    ];
    setEvents(demo);
    calcStats(demo);
  };

  const calcStats = (evs) => {
    const now = new Date();
    const upcoming = evs.filter(e => new Date(e.date) >= now).length;
    const totalBookings = evs.reduce((s, e) => s + (e.booked || 0), 0);
    const revenue = evs.reduce((s, e) => s + (e.booked || 0) * (e.price || 0), 0);
    setStats({ total: evs.length, upcoming, totalBookings, revenue });
  };

  const loadBookings = async () => {
    try {
      const res = await fetch(`${API_BASE}/bookings/my-events/`, { headers });
      if (res.ok) { const data = await res.json(); setBookings(data); }
    } catch {}
  };

  const openCreate = () => { setEditingEvent(null); setForm(EMPTY_FORM); setTiers([]); setShowTierForm(false); setShowForm(true); };
  const openEdit = (ev) => {
    setEditingEvent(ev);
    setForm({ title: ev.title, type: ev.type, date: ev.date, time: ev.time, venue: ev.venue, price: ev.price, capacity: ev.capacity, description: ev.description, is_featured: ev.is_featured, image: ev.image || "" });
    setTiers(ev.ticket_tiers || []);
    setShowTierForm(false);
    setShowForm(true);
    if (ev.id) loadTiers(ev.id);
  };

  const saveOrgProfile = async () => {
    setOrgSaving(true);
    try {
      const res = await fetch(`${API_BASE}/events/organizer/update-profile/`, { method: "PATCH", headers, body: JSON.stringify(orgForm) });
      if (res.ok) showMsg("Organisation profile updated!");
      else showMsg("Update failed", "error");
    } catch { showMsg("Organisation profile updated! (demo)"); }
    setOrgSaving(false);
  };

  const loadTiers = async (eventId) => {
    try {
      const res = await fetch(`${API_BASE}/events/${eventId}/tiers/`, { headers });
      if (res.ok) setTiers(await res.json());
    } catch { setTiers([]); }
  };

  const deleteTier = async (tierId) => {
    // For existing events, delete from backend
    if (editingEvent && typeof tierId === "number") {
      try {
        await fetch(`${API_BASE}/events/${editingEvent.id}/tiers/${tierId}/`, { method: "DELETE", headers });
      } catch {}
    }
    setTiers(prev => prev.filter(t => t.id !== tierId));
    showMsg("Tier removed");
  };

  // Add tier to local state (saved to backend when event is saved)
  const addTier = async () => {
    if (!tierForm.name || tierForm.price === "" || !tierForm.capacity) {
      showMsg("Fill tier name, price and capacity", "error"); return;
    }
    const newTier = { ...tierForm, id: `temp-${Date.now()}`, booked: 0, spots_left: tierForm.capacity, is_active: true };

    // If editing existing event, save immediately to backend
    if (editingEvent) {
      try {
        const res = await fetch(`${API_BASE}/events/${editingEvent.id}/tiers/`, {
          method: "POST", headers, body: JSON.stringify(tierForm),
        });
        if (res.ok) {
          const saved = await res.json();
          setTiers(prev => [...prev, saved]);
          showMsg("Tier added!");
          setTierForm(EMPTY_TIER); setShowTierForm(false);
          return;
        }
      } catch {}
    }

    // For new events or backend offline — stage locally
    setTiers(prev => [...prev, newTier]);
    showMsg("Tier added!");
    setTierForm(EMPTY_TIER); setShowTierForm(false);
  };

  const handleSave = async () => {
    if (!form.title || !form.date || !form.time || !form.venue) { showMsg("Fill all required fields", "error"); return; }
    setLoading(true);
    try {
      const method = editingEvent ? "PUT" : "POST";
      const url = editingEvent ? `${API_BASE}/events/${editingEvent.id}/` : `${API_BASE}/events/create/`;
      const res = await fetch(url, { method, headers, body: JSON.stringify(form) });
      if (res.ok) {
        const savedEvent = await res.json();

        // Save any staged tiers for a newly created event
        if (!editingEvent && tiers.length > 0) {
          for (const tier of tiers) {
            const { id, booked, spots_left, ...tierData } = tier;
            try {
              await fetch(`${API_BASE}/events/${savedEvent.id}/tiers/`, {
                method: "POST", headers, body: JSON.stringify(tierData),
              });
            } catch {}
          }
        }

        showMsg(editingEvent ? "Event updated!" : "Event created!");
        setShowForm(false); loadEvents();
      } else {
        showMsg("Save failed", "error");
      }
    } catch {
      // Demo mode — just update local state with tiers attached
      if (editingEvent) {
        setEvents(prev => prev.map(e => e.id === editingEvent.id ? { ...e, ...form, ticket_tiers: tiers } : e));
        showMsg("Event updated!");
      } else {
        const newId = Date.now();
        setEvents(prev => [...prev, { id: newId, ...form, booked: 0, ticket_tiers: tiers }]);
        showMsg("Event created!");
      }
      setShowForm(false);
    }
    setLoading(false);
  };

  const handleDelete = async (ev) => {
    if (!confirm(`Delete "${ev.title}"?`)) return;
    try {
      await fetch(`${API_BASE}/events/${ev.id}/`, { method: "DELETE", headers });
    } catch {}
    setEvents(prev => prev.filter(e => e.id !== ev.id));
    showMsg("Event deleted");
  };

  const handleBulkMpesaPush = async () => {
    if (!mpesaEventId) { showMsg("Select an event first", "error"); return; }
    setMpesaLoading(true);
    setMpesaResult(null);
    try {
      const res = await fetch(`${API_BASE}/mpesa/stk-push/bulk/`, {
        method: "POST", headers,
        body: JSON.stringify({ event_id: mpesaEventId }),
      });
      const data = await res.json();
      if (res.ok) {
        showMsg(`📱 STK push sent to ${data.sent?.length || 0} attendee(s)`);
        setMpesaResult(data);
      } else {
        showMsg(data.error || "M-Pesa bulk push failed", "error");
      }
    } catch {
      // demo fallback
      const ev = events.find(e => String(e.id) === String(mpesaEventId));
      const demoResult = { sent: ["0712345678", "0723456789"], failed: [], message: "STK push sent to 2 attendee(s) (demo)" };
      showMsg("📱 " + demoResult.message);
      setMpesaResult(demoResult);
    }
    setMpesaLoading(false);
  };

  const handleBulkSms = async () => {
    if (!smsEventId) { showMsg("Select an event first", "error"); return; }
    setSmsLoading(true);
    setSmsResult(null);
    try {
      const res = await fetch(`${API_BASE}/bookings/bulk-sms/`, {
        method: "POST", headers,
        body: JSON.stringify({ event_id: smsEventId, sms_type: smsType }),
      });
      const data = await res.json();
      if (res.ok) {
        showMsg(`📨 SMS sent to ${data.sent_count || 0} attendee(s)`);
        setSmsResult(data);
        // add to log
        const ev = events.find(e => String(e.id) === String(smsEventId));
        const msgMap = {
          confirmation: `EVENTFLOW: Booking confirmed for ${ev?.title}. See you there!`,
          reminder: `EVENTFLOW REMINDER: ${ev?.title} is TOMORROW. Don't forget!`,
          update: `EVENTFLOW: Important update for ${ev?.title}. Check the app.`,
        };
        if (data.sent?.length) {
          setSmsLogs(prev => [
            ...data.sent.map((ph, i) => ({ id: Date.now() + i, phone: ph, message: msgMap[smsType] || "Custom message", status: "delivered", time: new Date().toLocaleString() })),
            ...prev,
          ]);
        }
      } else {
        showMsg(data.error || "Bulk SMS failed", "error");
      }
    } catch {
      // demo fallback
      const ev = events.find(e => String(e.id) === String(smsEventId));
      const demoResult = { sent_count: 2, failed_count: 0, sent: ["0712345678", "0723456789"], failed: [] };
      showMsg(`📨 SMS sent to ${demoResult.sent_count} attendee(s) (demo)`);
      setSmsResult(demoResult);
    }
    setSmsLoading(false);
  };

  const inputStyle = { width: "100%", background: T.inputBg, border: `1px solid ${T.inputBorder}`, color: T.text, padding: "11px 14px", borderRadius: 9, fontSize: 14, outline: "none", boxSizing: "border-box", fontFamily: "inherit" };
  const labelStyle = { display: "block", fontSize: 12, color: T.textSub, marginBottom: 5, fontWeight: 500 };

  const upcomingEvents = events.filter(e => new Date(e.date) >= new Date());
  const pastEvents = events.filter(e => new Date(e.date) < new Date());

  // Build simple revenue chart data from past 5 months
  const revenueChartData = (() => {
    const months = [];
    for (let i = 4; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const label = d.toLocaleString("default", { month: "short" });
      const value = events
        .filter(e => {
          const ed = new Date(e.date);
          return ed.getMonth() === d.getMonth() && ed.getFullYear() === d.getFullYear();
        })
        .reduce((s, e) => s + (e.booked || 0) * (e.price || 0), 0);
      months.push({ label, value });
    }
    return months;
  })();

  const navItems = [
    ["overview", "📊", "Overview"],
    ["events", "🎫", "My Events"],
    ["bookings", "📋", "Bookings"],
    ["mpesa", "💳", "M-Pesa"],
    ["sms", "📱", "SMS"],
    ["profile", "👤", "Profile"],
  ];

  return (
    <div style={{ fontFamily: "'Outfit', 'DM Sans', sans-serif", background: T.bg, minHeight: "100vh", color: T.text, transition: "background 0.3s, color 0.3s" }}>
      <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet" />

      {toast && (
        <div style={{ position: "fixed", top: 20, right: 20, zIndex: 9999, background: toast.type === "error" ? "#EF4444" : "#10B981", color: "#fff", padding: "12px 20px", borderRadius: 10, fontWeight: 600, fontSize: 14, boxShadow: "0 8px 32px rgba(0,0,0,0.4)" }}>
          {toast.msg}
        </div>
      )}

      <div style={{ display: "flex", minHeight: "100vh" }}>
        {/* Sidebar */}
        <div style={{ width: 240, background: T.sidebar, borderRight: `1px solid ${T.sidebarBorder}`, padding: "24px 16px", display: "flex", flexDirection: "column", flexShrink: 0, transition: "background 0.3s" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 36, padding: "0 8px" }}>
            <div style={{ width: 28, height: 28, background: "linear-gradient(135deg,#6366F1,#8B5CF6)", borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>⚡</div>
            <span style={{ fontSize: 18, fontWeight: 800, background: "linear-gradient(90deg,#A5B4FC,#C4B5FD)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>EventFlow</span>
          </div>

          <div style={{ fontSize: 10, color: T.textMuted, fontWeight: 700, letterSpacing: 1.2, padding: "0 10px", marginBottom: 8 }}>ORGANIZER</div>

          {navItems.map(([key, icon, label]) => (
            <button key={key} onClick={() => setTab(key)} style={{
              display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 10,
              border: "none", cursor: "pointer", marginBottom: 2,
              background: tab === key ? "linear-gradient(135deg, rgba(99,102,241,0.2), rgba(139,92,246,0.2))" : "transparent",
              color: tab === key ? "#A5B4FC" : T.textSub,
              fontSize: 14, fontWeight: tab === key ? 600 : 400, textAlign: "left", width: "100%",
              borderLeft: tab === key ? "3px solid #6366F1" : "3px solid transparent",
            }}>
              <span style={{ fontSize: 16 }}>{icon}</span>{label}
            </button>
          ))}

          <div style={{ marginTop: "auto", padding: "16px 8px", borderTop: `1px solid ${T.sidebarBorder}` }}>
            <button onClick={toggleTheme} style={{ display: "flex", alignItems: "center", gap: 8, background: T.inputBg, border: `1px solid ${T.inputBorder}`, color: T.textSub, padding: "8px 12px", borderRadius: 8, fontSize: 13, cursor: "pointer", width: "100%", marginBottom: 12, fontWeight: 500 }}>
              {isDark ? "☀️" : "🌙"} {isDark ? "Light Mode" : "Dark Mode"}
            </button>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
              <div style={{ width: 36, height: 36, background: "linear-gradient(135deg,#6366F1,#8B5CF6)", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 800, color: "#fff" }}>
                {user.first_name?.[0] || "U"}
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: T.text }}>{user.first_name} {user.last_name}</div>
                <div style={{ fontSize: 11, color: T.textMuted }}>@{user.username}</div>
              </div>
            </div>
            <button onClick={onLogout} style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", color: "#FCA5A5", padding: "8px 14px", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer", width: "100%" }}>
              Sign Out
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div style={{ flex: 1, padding: "36px 40px", overflowY: "auto" }}>

          {/* OVERVIEW TAB */}
          {tab === "overview" && (
            <div>
              {/* Stats Grid */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 32 }}>
                {[
                  { label: "Total Events", val: stats.total, icon: "🎫", color: "#6366F1", sub: `${stats.upcoming} upcoming` },
                  { label: "Total Bookings", val: stats.totalBookings, icon: "👥", color: "#10B981", sub: "across all events" },
                  { label: "Revenue (KES)", val: stats.revenue.toLocaleString(), icon: "💰", color: "#F59E0B", sub: "total earned" },
                  { label: "Avg. Fill Rate", val: stats.total > 0 ? Math.round((stats.totalBookings / events.reduce((s, e) => s + e.capacity, 0)) * 100) + "%" : "0%", icon: "📈", color: "#8B5CF6", sub: "capacity used" },
                ].map(({ label, val, icon, color, sub }) => (
                  <div key={label} style={{ background: T.surface, border: `1px solid ${T.surfaceBorder}`, borderRadius: 16, padding: "20px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                      <div style={{ fontSize: 22 }}>{icon}</div>
                      <div style={{ background: color + "22", color, padding: "3px 8px", borderRadius: 6, fontSize: 11, fontWeight: 700 }}>↑</div>
                    </div>
                    <div style={{ fontSize: 26, fontWeight: 800, color, marginBottom: 2 }}>{val}</div>
                    <div style={{ fontSize: 12, color: T.textSub, fontWeight: 500 }}>{label}</div>
                    <div style={{ fontSize: 11, color: T.textMuted, marginTop: 2 }}>{sub}</div>
                  </div>
                ))}
              </div>

              {/* Revenue Chart + Quick Actions */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 28 }}>
                <div style={{ background: T.surface, border: `1px solid ${T.surfaceBorder}`, borderRadius: 16, padding: 24 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                    <div style={{ fontWeight: 700, fontSize: 14, color: T.text }}>Revenue (Last 5 Months)</div>
                    <div style={{ fontSize: 12, color: "#10B981", fontWeight: 700 }}>KES {stats.revenue.toLocaleString()}</div>
                  </div>
                  <div style={{ fontSize: 12, color: T.textMuted, marginBottom: 4 }}>Based on confirmed bookings</div>
                  <MiniBarChart data={revenueChartData} color="#6366F1" T={T} />
                </div>

                <div style={{ background: T.surface, border: `1px solid ${T.surfaceBorder}`, borderRadius: 16, padding: 24 }}>
                  <div style={{ fontWeight: 700, fontSize: 14, color: T.text, marginBottom: 16 }}>Quick Actions</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {[
                      { label: "➕ Create New Event", action: () => { setTab("events"); setTimeout(openCreate, 100); }, color: "linear-gradient(135deg,#6366F1,#8B5CF6)" },
                      { label: "📱 Send M-Pesa Request", action: () => setTab("mpesa"), color: "linear-gradient(135deg,#10B981,#059669)" },
                      { label: "📨 Send SMS to Attendees", action: () => setTab("sms"), color: "linear-gradient(135deg,#8B5CF6,#EC4899)" },
                    ].map(({ label, action, color }) => (
                      <button key={label} onClick={action} style={{ background: color, color: "#fff", border: "none", padding: "10px 16px", borderRadius: 10, fontWeight: 600, cursor: "pointer", fontSize: 13, textAlign: "left" }}>
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Recent Upcoming Events */}
              {upcomingEvents.length > 0 && (
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                    <div style={{ fontWeight: 700, fontSize: 15, color: T.text }}>Upcoming Events</div>
                    <button onClick={() => setTab("events")} style={{ background: "none", border: "none", color: "#A5B4FC", cursor: "pointer", fontSize: 13, fontWeight: 600 }}>See all →</button>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {upcomingEvents.slice(0, 3).map(ev => <EventRow key={ev.id} event={ev} onEdit={openEdit} onDelete={handleDelete} T={T} />)}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* EVENTS TAB */}
          {tab === "events" && (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28 }}>
                <div>
                  <h1 style={{ fontSize: 24, fontWeight: 800, letterSpacing: "-0.5px", color: T.text, marginBottom: 2 }}>My Events</h1>
                  <p style={{ color: T.textSub, fontSize: 13 }}>{events.length} total · {upcomingEvents.length} upcoming</p>
                </div>
                <button onClick={openCreate} style={{ background: "linear-gradient(135deg,#6366F1,#8B5CF6)", color: "#fff", border: "none", padding: "10px 20px", borderRadius: 10, fontWeight: 700, cursor: "pointer", fontSize: 14 }}>
                  + New Event
                </button>
              </div>

              {upcomingEvents.length > 0 && (
                <>
                  <div style={{ fontSize: 11, color: "#10B981", fontWeight: 700, marginBottom: 10, letterSpacing: 1.2 }}>UPCOMING</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 28 }}>
                    {upcomingEvents.map(ev => <EventRow key={ev.id} event={ev} onEdit={openEdit} onDelete={handleDelete} T={T} />)}
                  </div>
                </>
              )}

              {pastEvents.length > 0 && (
                <>
                  <div style={{ fontSize: 11, color: T.textMuted, fontWeight: 700, marginBottom: 10, letterSpacing: 1.2 }}>PAST EVENTS</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {pastEvents.map(ev => <EventRow key={ev.id} event={ev} onEdit={openEdit} onDelete={handleDelete} past T={T} />)}
                  </div>
                </>
              )}

              {events.length === 0 && (
                <div style={{ textAlign: "center", padding: "80px 0", color: T.textMuted }}>
                  <div style={{ fontSize: 52, marginBottom: 16 }}>🎭</div>
                  <p style={{ fontSize: 18, fontWeight: 600, color: T.text, marginBottom: 8 }}>No events yet</p>
                  <p style={{ fontSize: 14, marginBottom: 24 }}>Create your first event to get started</p>
                  <button onClick={openCreate} style={{ background: "linear-gradient(135deg,#6366F1,#8B5CF6)", color: "#fff", border: "none", padding: "12px 24px", borderRadius: 10, fontWeight: 700, cursor: "pointer" }}>
                    Create Event
                  </button>
                </div>
              )}
            </div>
          )}

          {/* BOOKINGS TAB */}
          {tab === "bookings" && (
            <div>
              <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 24, letterSpacing: "-0.5px", color: T.text }}>Bookings</h1>
              {bookings.length === 0 ? (
                <div style={{ textAlign: "center", padding: "60px 0", color: T.textMuted }}>
                  <div style={{ fontSize: 40, marginBottom: 12 }}>📋</div>
                  <p>No bookings yet</p>
                </div>
              ) : (
                <div style={{ background: T.surface, borderRadius: 14, border: `1px solid ${T.surfaceBorder}`, overflow: "hidden" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr style={{ borderBottom: `1px solid ${T.surfaceBorder}` }}>
                        {["Attendee", "Event", "Tickets", "Amount", "Status", "Date"].map(h => (
                          <th key={h} style={{ padding: "14px 16px", textAlign: "left", fontSize: 11, color: T.textMuted, fontWeight: 700, letterSpacing: 0.5 }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {bookings.map((b, i) => (
                        <tr key={i} style={{ borderBottom: `1px solid ${T.rowBorder}` }}>
                          <td style={{ padding: "12px 16px", fontSize: 14, color: T.text }}>{b.attendee_name}<br /><span style={{ color: T.textMuted, fontSize: 11 }}>{b.attendee_phone}</span></td>
                          <td style={{ padding: "12px 16px", fontSize: 13, color: "#A5B4FC" }}>{b.event_title}</td>
                          <td style={{ padding: "12px 16px", fontSize: 14, color: T.text }}>{b.tickets}</td>
                          <td style={{ padding: "12px 16px", fontSize: 14, fontWeight: 700, color: "#10B981" }}>KES {b.total_amount?.toLocaleString()}</td>
                          <td style={{ padding: "12px 16px" }}>
                            <span style={{ background: "rgba(16,185,129,0.15)", color: "#10B981", padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700 }}>
                              {b.status?.toUpperCase() || "CONFIRMED"}
                            </span>
                          </td>
                          <td style={{ padding: "12px 16px", fontSize: 12, color: T.textMuted }}>{b.created_at?.slice(0, 10)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* M-PESA TAB */}
          {tab === "mpesa" && (
            <div style={{ maxWidth: 560 }}>
              <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 6, letterSpacing: "-0.5px", color: T.text }}>M-Pesa Payment Requests</h1>
              <p style={{ color: T.textSub, fontSize: 14, marginBottom: 28 }}>Select one of your events to automatically send an M-Pesa STK Push to all attendees who have not yet paid.</p>

              <div style={{ background: T.surface, border: `1px solid ${T.surfaceBorder}`, borderRadius: 16, padding: 28, marginBottom: 20 }}>
                <h3 style={{ fontWeight: 700, fontSize: 15, marginBottom: 20, color: T.text }}>📲 Bulk STK Push — Select Event</h3>

                <div style={{ marginBottom: 20 }}>
                  <label style={labelStyle}>Choose Event</label>
                  <select style={{ ...inputStyle, appearance: "none" }} value={mpesaEventId} onChange={e => { setMpesaEventId(e.target.value); setMpesaResult(null); }}>
                    <option value="">— Select an event —</option>
                    {upcomingEvents.filter(e => e.price > 0).map(ev => (
                      <option key={ev.id} value={ev.id}>{ev.title} — KES {ev.price?.toLocaleString()}/ticket</option>
                    ))}
                  </select>
                  {upcomingEvents.filter(e => e.price > 0).length === 0 && (
                    <p style={{ fontSize: 12, color: T.textMuted, marginTop: 8 }}>No upcoming paid events found. Create a paid event first.</p>
                  )}
                </div>

                {mpesaEventId && (
                  <div style={{ background: "rgba(16,185,129,0.07)", border: "1px solid rgba(16,185,129,0.2)", borderRadius: 10, padding: "12px 16px", marginBottom: 20 }}>
                    {(() => {
                      const ev = events.find(e => String(e.id) === String(mpesaEventId));
                      const pending = bookings.filter(b => String(b.event) === String(mpesaEventId) || b.event_title === ev?.title);
                      return (
                        <p style={{ fontSize: 13, color: T.textSub, margin: 0, lineHeight: 1.7 }}>
                          <strong style={{ color: "#10B981" }}>Event:</strong> {ev?.title}<br />
                          <strong style={{ color: "#10B981" }}>Ticket Price:</strong> KES {ev?.price?.toLocaleString()}<br />
                          <strong style={{ color: "#10B981" }}>Action:</strong> An STK Push will be sent to each attendee's phone with the exact amount owed.
                        </p>
                      );
                    })()}
                  </div>
                )}

                <button onClick={handleBulkMpesaPush} disabled={mpesaLoading || !mpesaEventId} style={{ background: mpesaEventId ? "linear-gradient(135deg,#10B981,#059669)" : T.inputBg, color: mpesaEventId ? "#fff" : T.textMuted, border: "none", padding: "12px 28px", borderRadius: 10, fontWeight: 700, cursor: mpesaEventId ? "pointer" : "not-allowed", fontSize: 15, opacity: mpesaLoading ? 0.7 : 1 }}>
                  {mpesaLoading ? "Sending to all attendees..." : "📲 Send STK Push to All Attendees"}
                </button>
              </div>

              {/* Result */}
              {mpesaResult && (
                <div style={{ background: T.surface, border: `1px solid ${T.surfaceBorder}`, borderRadius: 14, padding: 20 }}>
                  <div style={{ fontWeight: 700, fontSize: 14, color: T.text, marginBottom: 12 }}>📊 Push Results</div>
                  <div style={{ display: "flex", gap: 12, marginBottom: 12 }}>
                    <div style={{ flex: 1, background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.2)", borderRadius: 10, padding: "12px", textAlign: "center" }}>
                      <div style={{ fontSize: 22, fontWeight: 800, color: "#10B981" }}>{mpesaResult.sent?.length || 0}</div>
                      <div style={{ fontSize: 12, color: T.textSub }}>Sent</div>
                    </div>
                    <div style={{ flex: 1, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 10, padding: "12px", textAlign: "center" }}>
                      <div style={{ fontSize: 22, fontWeight: 800, color: "#EF4444" }}>{mpesaResult.failed?.length || 0}</div>
                      <div style={{ fontSize: 12, color: T.textSub }}>Failed</div>
                    </div>
                  </div>
                  {mpesaResult.sent?.length > 0 && (
                    <div style={{ fontSize: 12, color: T.textSub }}>
                      Sent to: {mpesaResult.sent.join(", ")}
                    </div>
                  )}
                </div>
              )}

              <div style={{ background: "rgba(16,185,129,0.06)", border: "1px solid rgba(16,185,129,0.18)", borderRadius: 12, padding: 16, marginTop: 16 }}>
                <p style={{ fontSize: 13, color: T.textSub, lineHeight: 1.7, margin: 0 }}>
                  <strong style={{ color: "#10B981" }}>How it works:</strong> Each attendee with a pending booking receives a payment prompt on their phone. Once they enter their M-Pesa PIN, the payment is confirmed automatically and their booking is updated to confirmed — no manual follow-up needed.
                </p>
              </div>
            </div>
          )}

          {/* SMS TAB */}
          {tab === "sms" && (
            <div style={{ maxWidth: 640 }}>
              <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 6, letterSpacing: "-0.5px", color: T.text }}>Automated SMS Notifications</h1>
              <p style={{ color: T.textSub, fontSize: 14, marginBottom: 28 }}>Select an event and message type — EventFlow sends the SMS automatically to all confirmed attendees.</p>

              <div style={{ background: T.surface, border: `1px solid ${T.surfaceBorder}`, borderRadius: 16, padding: 28, marginBottom: 24 }}>
                <h3 style={{ fontWeight: 700, fontSize: 15, marginBottom: 20, color: T.text }}>📨 Send to All Attendees</h3>

                <div style={{ marginBottom: 16 }}>
                  <label style={labelStyle}>Choose Event</label>
                  <select style={{ ...inputStyle, appearance: "none" }} value={smsEventId} onChange={e => { setSmsEventId(e.target.value); setSmsResult(null); }}>
                    <option value="">— Select an event —</option>
                    {events.map(ev => (
                      <option key={ev.id} value={ev.id}>{ev.title} ({new Date(ev.date) >= new Date() ? "Upcoming" : "Past"})</option>
                    ))}
                  </select>
                </div>

                <div style={{ marginBottom: 20 }}>
                  <label style={labelStyle}>Message Type</label>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {[
                      { key: "confirmation", label: "✅ Booking Confirmed", desc: "Sends booking code + event date" },
                      { key: "reminder",     label: "⏰ Event Reminder",    desc: "Sends event name + date + time" },
                      { key: "update",       label: "🔔 General Update",    desc: "Tells attendees to check the app" },
                    ].map(({ key, label, desc }) => (
                      <button key={key} onClick={() => setSmsType(key)} style={{
                        flex: 1, minWidth: 140,
                        background: smsType === key ? "rgba(99,102,241,0.2)" : T.inputBg,
                        border: "1px solid " + (smsType === key ? "rgba(99,102,241,0.6)" : T.inputBorder),
                        color: smsType === key ? "#A5B4FC" : T.textSub,
                        padding: "10px 12px", borderRadius: 10, cursor: "pointer", textAlign: "left",
                      }}>
                        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 3 }}>{label}</div>
                        <div style={{ fontSize: 11, opacity: 0.8 }}>{desc}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Preview of what will be sent */}
                {smsEventId && (
                  <div style={{ background: T.inputBg, border: `1px solid ${T.inputBorder}`, borderRadius: 10, padding: "12px 16px", marginBottom: 20 }}>
                    <div style={{ fontSize: 11, color: T.textMuted, fontWeight: 700, marginBottom: 6, letterSpacing: 0.5 }}>MESSAGE PREVIEW</div>
                    <p style={{ fontSize: 13, color: T.textSub, margin: 0, lineHeight: 1.6, fontFamily: "monospace" }}>
                      {(() => {
                        const ev = events.find(e => String(e.id) === String(smsEventId));
                        if (!ev) return "";
                        if (smsType === "confirmation") return `EVENTFLOW: Booking confirmed for ${ev.title} on ${ev.date}. Your booking code is [CODE]. See you there!`;
                        if (smsType === "reminder")     return `EVENTFLOW REMINDER: ${ev.title} is TOMORROW on ${ev.date} at ${ev.time}. Don't forget to come prepared. See you there!`;
                        if (smsType === "update")       return `EVENTFLOW: Important update for ${ev.title} on ${ev.date}. Please check the EventFlow platform for details.`;
                        return "";
                      })()}
                    </p>
                  </div>
                )}

                <button onClick={handleBulkSms} disabled={smsLoading || !smsEventId} style={{
                  background: smsEventId ? "linear-gradient(135deg,#6366F1,#8B5CF6)" : T.inputBg,
                  color: smsEventId ? "#fff" : T.textMuted,
                  border: "none", padding: "12px 28px", borderRadius: 10,
                  fontWeight: 700, cursor: smsEventId ? "pointer" : "not-allowed",
                  fontSize: 15, opacity: smsLoading ? 0.7 : 1
                }}>
                  {smsLoading ? "Sending to all attendees..." : "📨 Send to All Confirmed Attendees"}
                </button>
              </div>

              {/* SMS Result */}
              {smsResult && (
                <div style={{ background: T.surface, border: `1px solid ${T.surfaceBorder}`, borderRadius: 14, padding: 20, marginBottom: 20 }}>
                  <div style={{ fontWeight: 700, fontSize: 14, color: T.text, marginBottom: 12 }}>📊 Send Results</div>
                  <div style={{ display: "flex", gap: 12 }}>
                    <div style={{ flex: 1, background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.2)", borderRadius: 10, padding: "12px", textAlign: "center" }}>
                      <div style={{ fontSize: 22, fontWeight: 800, color: "#10B981" }}>{smsResult.sent_count || 0}</div>
                      <div style={{ fontSize: 12, color: T.textSub }}>Delivered</div>
                    </div>
                    <div style={{ flex: 1, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 10, padding: "12px", textAlign: "center" }}>
                      <div style={{ fontSize: 22, fontWeight: 800, color: "#EF4444" }}>{smsResult.failed_count || 0}</div>
                      <div style={{ fontSize: 12, color: T.textSub }}>Failed</div>
                    </div>
                  </div>
                </div>
              )}

              {/* SMS Log */}
              <div style={{ fontWeight: 700, fontSize: 14, color: T.text, marginBottom: 14 }}>Recent SMS Log</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {smsLogs.map(log => (
                  <div key={log.id} style={{ background: T.surface, border: `1px solid ${T.surfaceBorder}`, borderRadius: 12, padding: "14px 18px", display: "flex", gap: 14, alignItems: "flex-start" }}>
                    <div style={{ fontSize: 20 }}>📱</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 4 }}>
                        <span style={{ fontWeight: 700, fontSize: 13, color: T.text }}>{log.phone}</span>
                        <span style={{ background: "rgba(16,185,129,0.15)", color: "#10B981", padding: "2px 8px", borderRadius: 20, fontSize: 11, fontWeight: 700 }}>DELIVERED</span>
                        <span style={{ fontSize: 11, color: T.textMuted, marginLeft: "auto" }}>{log.time}</span>
                      </div>
                      <p style={{ fontSize: 12, color: T.textSub, margin: 0, lineHeight: 1.5 }}>{log.message}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* PROFILE TAB */}
          {tab === "profile" && (
            <div style={{ maxWidth: 560 }}>
              <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 6, letterSpacing: "-0.5px", color: T.text }}>Organisation Profile</h1>
              <p style={{ color: T.textSub, fontSize: 14, marginBottom: 28 }}>This is how your organisation appears to attendees when they view your events.</p>

              {/* Live preview card */}
              <div style={{ background: "linear-gradient(135deg,rgba(99,102,241,0.15),rgba(139,92,246,0.1))", border: `1px solid ${T.surfaceBorder}`, borderRadius: 20, padding: 24, marginBottom: 24 }}>
                <div style={{ fontSize: 11, color: T.textMuted, fontWeight: 700, letterSpacing: 1, marginBottom: 16 }}>PREVIEW — HOW ATTENDEES SEE YOU</div>
                <div style={{ display: "flex", gap: 16, alignItems: "center", marginBottom: 16 }}>
                  {orgForm.org_logo ? (
                    <img src={orgForm.org_logo} alt="org logo" style={{ width: 64, height: 64, borderRadius: 14, objectFit: "cover", border: `1px solid ${T.surfaceBorder}` }} onError={e => e.target.style.display = "none"} />
                  ) : (
                    <div style={{ width: 64, height: 64, background: "linear-gradient(135deg,#6366F1,#8B5CF6)", borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, fontWeight: 800, color: "#fff", flexShrink: 0 }}>
                      {(orgForm.org_name || user.first_name || "O")[0].toUpperCase()}
                    </div>
                  )}
                  <div>
                    <div style={{ fontSize: 18, fontWeight: 800, color: T.text }}>{orgForm.org_name || user.first_name + " " + user.last_name || user.username}</div>
                    <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "rgba(99,102,241,0.15)", border: "1px solid rgba(99,102,241,0.3)", color: "#A5B4FC", padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600, marginTop: 6 }}>
                      🎤 Event Organizer
                    </div>
                  </div>
                </div>
                {orgForm.org_description && (
                  <p style={{ fontSize: 13, color: T.textSub, lineHeight: 1.65, margin: 0 }}>{orgForm.org_description}</p>
                )}
                {orgForm.org_website && (
                  <div style={{ fontSize: 13, color: "#A5B4FC", marginTop: 8 }}>🌐 {orgForm.org_website}</div>
                )}
              </div>

              {/* Org profile form */}
              <div style={{ background: T.surface, border: `1px solid ${T.surfaceBorder}`, borderRadius: 16, padding: 28, marginBottom: 20 }}>
                <div style={{ fontSize: 12, color: T.textMuted, fontWeight: 700, letterSpacing: 1, marginBottom: 20 }}>ORGANISATION DETAILS</div>

                <div style={{ marginBottom: 16 }}>
                  <label style={labelStyle}>Organisation / Company Name</label>
                  <input style={inputStyle} placeholder="e.g. TechKenya Events, LiveNation KE" value={orgForm.org_name} onChange={e => setOrgForm(p => ({ ...p, org_name: e.target.value }))} />
                  <p style={{ fontSize: 11, color: T.textMuted, marginTop: 4 }}>This replaces your personal name on all event listings.</p>
                </div>

                <div style={{ marginBottom: 16 }}>
                  <label style={labelStyle}>About Your Organisation</label>
                  <textarea style={{ ...inputStyle, height: 90, resize: "vertical" }} placeholder="Tell attendees who you are and what kind of events you host..." value={orgForm.org_description} onChange={e => setOrgForm(p => ({ ...p, org_description: e.target.value }))} />
                </div>

                <div style={{ marginBottom: 16 }}>
                  <label style={labelStyle}>Logo / Banner Image URL</label>
                  <input style={inputStyle} placeholder="https://yoursite.com/logo.png" value={orgForm.org_logo} onChange={e => setOrgForm(p => ({ ...p, org_logo: e.target.value }))} />
                  <p style={{ fontSize: 11, color: T.textMuted, marginTop: 4 }}>Paste a direct link to your organisation's logo or banner image.</p>
                </div>

                <div style={{ marginBottom: 24 }}>
                  <label style={labelStyle}>Website (optional)</label>
                  <input style={inputStyle} placeholder="https://yourwebsite.com" value={orgForm.org_website} onChange={e => setOrgForm(p => ({ ...p, org_website: e.target.value }))} />
                </div>

                <button onClick={saveOrgProfile} disabled={orgSaving} style={{ background: "linear-gradient(135deg,#6366F1,#8B5CF6)", color: "#fff", border: "none", padding: "12px 28px", borderRadius: 10, fontWeight: 700, cursor: "pointer", fontSize: 14, opacity: orgSaving ? 0.7 : 1 }}>
                  {orgSaving ? "Saving..." : "Save Organisation Profile"}
                </button>
              </div>

              {/* Account details (read only) */}
              <div style={{ background: T.surface, border: `1px solid ${T.surfaceBorder}`, borderRadius: 16, padding: 28, marginBottom: 20 }}>
                <div style={{ fontSize: 12, color: T.textMuted, fontWeight: 700, letterSpacing: 1, marginBottom: 16 }}>ACCOUNT DETAILS</div>
                {[["Username", `@${user.username}`], ["Email", user.email || "—"], ["Phone (M-Pesa)", user.phone || "—"], ["Role", "Organizer"]].map(([k, v]) => (
                  <div key={k} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 0", borderBottom: `1px solid ${T.surfaceBorder}` }}>
                    <span style={{ color: T.textSub, fontSize: 14 }}>{k}</span>
                    <span style={{ fontWeight: 600, fontSize: 14, color: T.text }}>{v}</span>
                  </div>
                ))}
              </div>

              {/* Event stats */}
              <div style={{ background: T.surface, border: `1px solid ${T.surfaceBorder}`, borderRadius: 16, padding: 28 }}>
                <div style={{ fontSize: 12, color: T.textMuted, fontWeight: 700, letterSpacing: 1, marginBottom: 16 }}>EVENT SUMMARY</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  {[
                    { label: "Total Events", val: stats.total, color: "#6366F1" },
                    { label: "Upcoming", val: stats.upcoming, color: "#10B981" },
                    { label: "Total Bookings", val: stats.totalBookings, color: "#8B5CF6" },
                    { label: "Revenue (KES)", val: stats.revenue.toLocaleString(), color: "#F59E0B" },
                  ].map(({ label, val, color }) => (
                    <div key={label} style={{ background: T.inputBg, borderRadius: 12, padding: "16px" }}>
                      <div style={{ fontSize: 20, fontWeight: 800, color, marginBottom: 4 }}>{val}</div>
                      <div style={{ fontSize: 12, color: T.textSub }}>{label}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* EVENT FORM MODAL */}
      {showForm && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", backdropFilter: "blur(8px)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div style={{ background: T.modalBg, border: `1px solid ${T.surfaceBorder}`, borderRadius: 20, padding: 36, width: "100%", maxWidth: 560, maxHeight: "90vh", overflowY: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28 }}>
              <h2 style={{ fontSize: 20, fontWeight: 800, color: T.text }}>{editingEvent ? "Edit Event" : "Create New Event"}</h2>
              <button onClick={() => setShowForm(false)} style={{ background: "none", border: "none", color: T.textMuted, cursor: "pointer", fontSize: 20 }}>✕</button>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>Event Title *</label>
              <input style={inputStyle} placeholder="e.g. Nairobi Tech Summit" value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
              <div>
                <label style={labelStyle}>Event Type *</label>
                <select style={{ ...inputStyle, appearance: "none" }} value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value }))}>
                  {EVENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Price (KES)</label>
                <input type="number" style={inputStyle} placeholder="0 for free" value={form.price} onChange={e => setForm(p => ({ ...p, price: Number(e.target.value) }))} />
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
              <div>
                <label style={labelStyle}>Date *</label>
                <input type="date" style={inputStyle} value={form.date} onChange={e => setForm(p => ({ ...p, date: e.target.value }))} />
              </div>
              <div>
                <label style={labelStyle}>Time *</label>
                <input type="time" style={inputStyle} value={form.time} onChange={e => setForm(p => ({ ...p, time: e.target.value }))} />
              </div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>Venue *</label>
              <input style={inputStyle} placeholder="e.g. KICC, Nairobi" value={form.venue} onChange={e => setForm(p => ({ ...p, venue: e.target.value }))} />
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>Capacity</label>
              <input type="number" style={inputStyle} value={form.capacity} onChange={e => setForm(p => ({ ...p, capacity: Number(e.target.value) }))} />
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={labelStyle}>Description</label>
              <textarea style={{ ...inputStyle, height: 90, resize: "vertical" }} placeholder="Tell people about your event..." value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} />
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>Event Banner / Image URL (optional)</label>
              <input style={inputStyle} placeholder="https://yoursite.com/event-banner.jpg" value={form.image} onChange={e => setForm(p => ({ ...p, image: e.target.value }))} />
              {form.image && (
                <div style={{ marginTop: 10, borderRadius: 10, overflow: "hidden", height: 120 }}>
                  <img src={form.image} alt="preview" style={{ width: "100%", height: "100%", objectFit: "cover" }} onError={e => e.target.style.display = "none"} />
                </div>
              )}
              <p style={{ fontSize: 11, color: T.textMuted, marginTop: 4 }}>Paste a direct image link. This appears on the event card and detail page.</p>
            </div>

            <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", marginBottom: 24 }}>
              <input type="checkbox" checked={form.is_featured} onChange={e => setForm(p => ({ ...p, is_featured: e.target.checked }))} />
              <span style={{ fontSize: 13, color: T.textSub }}>Mark as featured event</span>
            </label>

            {/* ── TICKET TIERS ── */}
            <div style={{ marginBottom: 24, borderTop: `1px solid ${T.surfaceBorder}`, paddingTop: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14, color: T.text }}>Ticket Tiers</div>
                  <div style={{ fontSize: 12, color: T.textSub, marginTop: 2 }}>Set different prices for Early Bird, Regular, VIP and VVIP.</div>
                </div>
                <button onClick={() => { setShowTierForm(p => !p); setTierForm(EMPTY_TIER); }} style={{ background: "rgba(99,102,241,0.15)", border: "1px solid rgba(99,102,241,0.3)", color: "#A5B4FC", padding: "6px 14px", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 600 }}>
                  {showTierForm ? "Cancel" : "+ Add Tier"}
                </button>
              </div>

              {showTierForm && (
                <div style={{ background: T.inputBg, border: `1px solid ${T.inputBorder}`, borderRadius: 14, padding: 18, marginBottom: 14 }}>
                  {/* One-click presets */}
                  <div style={{ fontSize: 11, color: T.textMuted, fontWeight: 700, marginBottom: 8, letterSpacing: 0.5 }}>QUICK PRESETS — click to fill</div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
                    {TIER_PRESETS.map(preset => {
                      const COLORS = { early_bird: "#10B981", standard: "#6366F1", vip: "#F59E0B", vvip: "#EC4899" };
                      const color = COLORS[preset.tier_type] || "#6366F1";
                      return (
                        <button key={preset.name} onClick={() => setTierForm({ ...EMPTY_TIER, ...preset })}
                          style={{ background: color + "18", border: `1px solid ${color}44`, color, padding: "6px 14px", borderRadius: 8, cursor: "pointer", fontSize: 12, fontWeight: 700 }}>
                          {preset.name}
                        </button>
                      );
                    })}
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
                    <div>
                      <label style={labelStyle}>Tier Name *</label>
                      <input style={inputStyle} placeholder="e.g. Early Bird" value={tierForm.name} onChange={e => setTierForm(p => ({ ...p, name: e.target.value }))} />
                    </div>
                    <div>
                      <label style={labelStyle}>Tier Type</label>
                      <select style={{ ...inputStyle, appearance: "none" }} value={tierForm.tier_type} onChange={e => setTierForm(p => ({ ...p, tier_type: e.target.value }))}>
                        <option value="early_bird">Early Bird</option>
                        <option value="standard">Regular / Standard</option>
                        <option value="vip">VIP</option>
                        <option value="vvip">VVIP</option>
                        <option value="free">Free</option>
                      </select>
                    </div>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
                    <div>
                      <label style={labelStyle}>Price (KES) *</label>
                      <input type="number" min="0" style={inputStyle} placeholder="e.g. 2500" value={tierForm.price} onChange={e => setTierForm(p => ({ ...p, price: Number(e.target.value) }))} />
                    </div>
                    <div>
                      <label style={labelStyle}>Capacity (tickets) *</label>
                      <input type="number" min="1" style={inputStyle} placeholder="e.g. 50" value={tierForm.capacity} onChange={e => setTierForm(p => ({ ...p, capacity: Number(e.target.value) }))} />
                    </div>
                  </div>

                  <div style={{ marginBottom: 14 }}>
                    <label style={labelStyle}>Description (optional)</label>
                    <input style={inputStyle} placeholder="e.g. Limited early bird offer — save 40%" value={tierForm.description} onChange={e => setTierForm(p => ({ ...p, description: e.target.value }))} />
                  </div>

                  <button onClick={addTier} style={{ background: "linear-gradient(135deg,#6366F1,#8B5CF6)", color: "#fff", border: "none", padding: "10px 22px", borderRadius: 8, fontWeight: 700, cursor: "pointer", fontSize: 13 }}>
                    + Add This Tier
                  </button>
                </div>
              )}

              {/* Staged / saved tiers */}
              {tiers.length > 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {tiers.map(tier => {
                    const COLORS = { early_bird: "#10B981", standard: "#6366F1", vip: "#F59E0B", vvip: "#EC4899", free: "#64748B" };
                    const color = COLORS[tier.tier_type] || "#6366F1";
                    return (
                      <div key={tier.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: color + "10", border: `1px solid ${color}33`, borderRadius: 10, padding: "12px 14px" }}>
                        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                          <span style={{ background: color + "22", color, padding: "2px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700 }}>{tier.name}</span>
                          <span style={{ fontSize: 14, fontWeight: 800, color: T.text }}>{Number(tier.price) === 0 ? "FREE" : `KES ${Number(tier.price).toLocaleString()}`}</span>
                          <span style={{ fontSize: 12, color: T.textSub }}>{tier.capacity} tickets</span>
                        </div>
                        <button onClick={() => deleteTier(tier.id)} style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", color: "#FCA5A5", padding: "4px 10px", borderRadius: 6, cursor: "pointer", fontSize: 12, fontWeight: 600 }}>
                          Remove
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}

              {tiers.length === 0 && !showTierForm && (
                <div style={{ fontSize: 12, color: T.textMuted, fontStyle: "italic", padding: "8px 0" }}>
                  No tiers added yet. Click "+ Add Tier" to set prices for Early Bird, Regular, VIP, VVIP.
                </div>
              )}
            </div>

            <div style={{ display: "flex", gap: 12 }}>
              <button onClick={() => setShowForm(false)} style={{ flex: 1, background: T.inputBg, border: `1px solid ${T.inputBorder}`, color: T.textSub, padding: "12px", borderRadius: 10, fontWeight: 600, cursor: "pointer" }}>
                Cancel
              </button>
              <button onClick={handleSave} disabled={loading} style={{ flex: 2, background: "linear-gradient(135deg,#6366F1,#8B5CF6)", color: "#fff", border: "none", padding: "12px", borderRadius: 10, fontWeight: 700, cursor: "pointer", opacity: loading ? 0.7 : 1 }}>
                {loading ? "Saving..." : editingEvent ? "Update Event" : "Create Event"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function EventRow({ event, onEdit, onDelete, past, T }) {
  const spotsLeft = event.capacity - (event.booked || 0);
  const pct = Math.round(((event.booked || 0) / event.capacity) * 100);
  const isSoldOut = spotsLeft <= 0;

  return (
    <div style={{ background: T.surface, border: `1px solid ${T.surfaceBorder}`, borderRadius: 12, padding: "16px 20px", display: "flex", alignItems: "center", gap: 20, opacity: past ? 0.55 : 1 }}>
      <div style={{ flex: 1 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: T.text }}>{event.title}</span>
          <span style={{ background: "rgba(99,102,241,0.18)", color: "#A5B4FC", padding: "2px 8px", borderRadius: 20, fontSize: 10, fontWeight: 700 }}>{event.type}</span>
          {event.is_featured && <span style={{ background: "rgba(245,158,11,0.18)", color: "#F59E0B", padding: "2px 8px", borderRadius: 20, fontSize: 10, fontWeight: 700 }}>FEATURED</span>}
          {isSoldOut && <span style={{ background: "rgba(239,68,68,0.18)", color: "#FCA5A5", padding: "2px 8px", borderRadius: 20, fontSize: 10, fontWeight: 700 }}>SOLD OUT</span>}
          {past && <span style={{ background: T.inputBg, color: T.textMuted, padding: "2px 8px", borderRadius: 20, fontSize: 10, fontWeight: 700 }}>PAST</span>}
        </div>
        <div style={{ fontSize: 12, color: T.textSub }}>📅 {event.date} · {event.time} &nbsp;·&nbsp; 📍 {event.venue}</div>
      </div>

      <div style={{ textAlign: "center", minWidth: 90 }}>
        <div style={{ fontSize: 17, fontWeight: 800, color: "#A5B4FC" }}>{event.booked || 0}<span style={{ fontSize: 12, color: T.textMuted, fontWeight: 400 }}>/{event.capacity}</span></div>
        <div style={{ background: T.inputBg, borderRadius: 3, height: 3, marginTop: 5 }}>
          <div style={{ background: pct > 80 ? "#EF4444" : "#6366F1", width: `${pct}%`, height: "100%", borderRadius: 3 }} />
        </div>
        <div style={{ fontSize: 10, color: T.textMuted, marginTop: 3 }}>{pct}% full</div>
      </div>

      <div style={{ textAlign: "right", minWidth: 90 }}>
        <div style={{ fontSize: 14, fontWeight: 800, color: T.text }}>{event.price === 0 ? "FREE" : `KES ${event.price?.toLocaleString()}`}</div>
        <div style={{ fontSize: 10, color: T.textMuted }}>per ticket</div>
        <div style={{ fontSize: 12, fontWeight: 700, color: "#10B981" }}>+{((event.booked || 0) * (event.price || 0)).toLocaleString()}</div>
      </div>

      <div style={{ display: "flex", gap: 8 }}>
        <button onClick={() => onEdit(event)} style={{ background: "rgba(99,102,241,0.15)", border: "1px solid rgba(99,102,241,0.3)", color: "#A5B4FC", padding: "7px 14px", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 600 }}>
          Edit
        </button>
        <button onClick={() => onDelete(event)} style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", color: "#FCA5A5", padding: "7px 14px", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 600 }}>
          Del
        </button>
      </div>
    </div>
  );
}
