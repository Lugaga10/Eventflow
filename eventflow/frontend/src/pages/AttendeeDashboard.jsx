import { useState, useEffect, useContext } from "react";
import { API_BASE, ThemeContext } from "../App";
import DigitalTicket from "../components/DigitalTicket";

export default function AttendeeDashboard({ user, token, onLogout }) {
  const { theme, toggleTheme } = useContext(ThemeContext);
  const isDark = theme === "dark";

  const [tab, setTab] = useState("bookings");
  const [bookings, setBookings] = useState([]);
  const [events, setEvents] = useState([]);
  const [filter, setFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [bookingEvent, setBookingEvent] = useState(null);
  const [bookingForm, setBookingForm] = useState({ name: `${user.first_name} ${user.last_name}`, phone: user.phone || "", email: user.email || "", tickets: 1 });
  const [bookingStep, setBookingStep] = useState("form");
  const [mpesaCode, setMpesaCode] = useState("");
  const [toast, setToast] = useState(null);
  const [loading, setLoading] = useState(false);
  const [viewingTicket, setViewingTicket] = useState(null);

  const headers = { Authorization: `Token ${token}`, "Content-Type": "application/json" };

  const categories = ["All", "Conference", "Concert", "Workshop", "Festival", "Networking", "Sports"];

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

  const typeColors = {
    Conference: "#3B82F6", Concert: "#8B5CF6", Workshop: "#10B981",
    Festival: "#F59E0B", Networking: "#EC4899", Sports: "#EF4444"
  };

  useEffect(() => { loadBookings(); loadEvents(); }, []);

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  const loadBookings = async () => {
    try {
      const res = await fetch(`${API_BASE}/bookings/my/`, { headers });
      if (res.ok) { const data = await res.json(); setBookings(data); }
      else loadDemoBookings();
    } catch { loadDemoBookings(); }
  };

  const loadDemoBookings = () => {
    setBookings([
      { id: 1, event_title: "Nairobi Tech Summit 2025", event_date: "2026-09-15", event_time: "09:00", event_venue: "KICC, Nairobi", tickets: 2, total_amount: 5000, status: "confirmed", booking_code: "EF-A1B2C3", mpesa_code: "QKL4XY8Z99", created_at: "2025-08-01" },
      { id: 2, event_title: "Lamu Cultural Festival", event_date: "2026-11-01", event_time: "08:00", event_venue: "Lamu Town", tickets: 1, total_amount: 500, status: "confirmed", booking_code: "EF-D4E5F6", mpesa_code: "RLM9ZA7B33", created_at: "2025-08-10" },
    ]);
  };

  const loadEvents = async () => {
    try {
      const res = await fetch(`${API_BASE}/events/public/`);
      if (res.ok) { const data = await res.json(); setEvents(data); }
      else loadDemoEvents();
    } catch { loadDemoEvents(); }
  };

  const loadDemoEvents = () => {
    setEvents([
      { id: 3, title: "Product Design Workshop", type: "Workshop", date: "2026-09-05", time: "10:00", venue: "iHub, Nairobi", price: 1500, capacity: 50, booked: 38, description: "Hands-on Figma and UX research workshop for designers.", organizer_name: "DesignKenya", is_featured: false },
      { id: 4, title: "Startup Founders Mixer", type: "Networking", date: "2026-08-22", time: "18:30", venue: "Alchemist, Nairobi", price: 0, capacity: 150, booked: 89, description: "Connect with Nairobi's hottest startup founders over drinks.", organizer_name: "StartupGrind KE", is_featured: false },
      { id: 5, title: "Nairobi Marathon 2025", type: "Sports", date: "2026-10-26", time: "06:00", venue: "Uhuru Park, Nairobi", price: 1000, capacity: 5000, booked: 3400, description: "Run Nairobi's most iconic marathon through the city centre.", organizer_name: "Athletics Kenya", is_featured: true },
      { id: 6, title: "Sauti Sol Live in Concert", type: "Concert", date: "2026-08-30", time: "19:00", venue: "Carnivore, Nairobi", price: 3500, capacity: 2000, booked: 1890, description: "An unforgettable night with Africa's finest musical group.", organizer_name: "LiveNation KE", is_featured: true },
    ]);
  };

  const handleBook = () => {
    if (!bookingForm.name || !bookingForm.phone || !bookingForm.email) {
      showToast("Please fill all fields", "error"); return;
    }
    setBookingStep("payment");
  };

  const handleMpesaPayment = async () => {
    if (!mpesaCode.trim()) { showToast("Enter M-Pesa code", "error"); return; }
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/bookings/create/`, {
        method: "POST", headers,
        body: JSON.stringify({ event: bookingEvent.id, attendee_name: bookingForm.name, attendee_phone: bookingForm.phone, attendee_email: bookingForm.email, tickets: bookingForm.tickets, mpesa_code: mpesaCode }),
      });
      if (res.ok) { setBookingStep("success"); loadBookings(); }
      else showToast("Booking failed. Check your details.", "error");
    } catch { setBookingStep("success"); loadBookings(); }
    setLoading(false);
  };

  const closeBooking = () => {
    setBookingEvent(null); setBookingStep("form"); setMpesaCode("");
    setBookingForm({ name: `${user.first_name} ${user.last_name}`, phone: user.phone || "", email: user.email || "", tickets: 1 });
  };

  const filtered = events.filter(e => {
    const matchCat = filter === "All" || e.type === filter;
    const matchSearch = e.title.toLowerCase().includes(search.toLowerCase()) || e.venue?.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  const upcomingBookings = bookings.filter(b => new Date(b.event_date) >= new Date());
  const pastBookings = bookings.filter(b => new Date(b.event_date) < new Date());

  const inputStyle = { width: "100%", background: T.inputBg, border: `1px solid ${T.inputBorder}`, color: T.text, padding: "11px 14px", borderRadius: 9, fontSize: 14, outline: "none", boxSizing: "border-box", fontFamily: "inherit" };
  const labelStyle = { display: "block", fontSize: 12, color: T.textSub, marginBottom: 5, fontWeight: 500 };

  const navItems = [
    ["bookings", "🎟", "My Bookings"],
    ["explore", "🔍", "Explore Events"],
    ["profile", "👤", "Profile"],
  ];

  return (
    <div style={{ fontFamily: "'Outfit', 'DM Sans', sans-serif", background: T.bg, minHeight: "100vh", color: T.text, transition: "background 0.3s" }}>
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

          <div style={{ fontSize: 10, color: T.textMuted, fontWeight: 700, letterSpacing: 1.2, padding: "0 10px", marginBottom: 8 }}>ATTENDEE</div>

          {navItems.map(([key, icon, label]) => (
            <button key={key} onClick={() => setTab(key)} style={{
              display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 10,
              border: "none", cursor: "pointer", marginBottom: 2,
              background: tab === key ? "linear-gradient(135deg,rgba(99,102,241,0.2),rgba(139,92,246,0.2))" : "transparent",
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
              <div style={{ width: 36, height: 36, background: "linear-gradient(135deg,#EC4899,#8B5CF6)", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 800, color: "#fff" }}>
                {user.first_name?.[0] || "A"}
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: T.text }}>{user.first_name} {user.last_name}</div>
                <div style={{ fontSize: 11, color: T.textMuted }}>Attendee</div>
              </div>
            </div>
            <button onClick={onLogout} style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", color: "#FCA5A5", padding: "8px 14px", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer", width: "100%" }}>
              Sign Out
            </button>
          </div>
        </div>

        {/* Main */}
        <div style={{ flex: 1, padding: "36px 40px", overflowY: "auto" }}>

          {/* MY BOOKINGS TAB */}
          {tab === "bookings" && (
            <div>
              <div style={{ marginBottom: 32 }}>
                <h1 style={{ fontSize: 24, fontWeight: 800, letterSpacing: "-0.5px", color: T.text, marginBottom: 4 }}>My Bookings</h1>
                <p style={{ color: T.textSub, fontSize: 14 }}>{bookings.length} booking{bookings.length !== 1 ? "s" : ""} total · {upcomingBookings.length} upcoming</p>
              </div>

              {/* Summary cards */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 32 }}>
                {[
                  { label: "Total Bookings", val: bookings.length, icon: "🎟", color: "#6366F1" },
                  { label: "Upcoming Events", val: upcomingBookings.length, icon: "📅", color: "#10B981" },
                  { label: "Total Spent (KES)", val: bookings.reduce((s, b) => s + (b.total_amount || 0), 0).toLocaleString(), icon: "💳", color: "#F59E0B" },
                ].map(({ label, val, icon, color }) => (
                  <div key={label} style={{ background: T.surface, border: `1px solid ${T.surfaceBorder}`, borderRadius: 14, padding: "20px" }}>
                    <div style={{ fontSize: 22, marginBottom: 10 }}>{icon}</div>
                    <div style={{ fontSize: 24, fontWeight: 800, color, marginBottom: 2 }}>{val}</div>
                    <div style={{ fontSize: 12, color: T.textSub }}>{label}</div>
                  </div>
                ))}
              </div>

              {upcomingBookings.length > 0 && (
                <>
                  <div style={{ fontSize: 11, color: "#10B981", fontWeight: 700, marginBottom: 12, letterSpacing: 1.2 }}>UPCOMING</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 28 }}>
                    {upcomingBookings.map(b => <BookingCard key={b.id} booking={b} T={T} typeColors={typeColors} onViewTicket={() => setViewingTicket({
                      booking_code:   b.booking_code,
                      event_title:    b.event_title,
                      event_date:     b.event_date,
                      event_time:     b.event_time,
                      event_venue:    b.event_venue,
                      event_type:     b.event_type || "Conference",
                      ticket_tier:    b.ticket_tier,
                      tier_type:      b.tier_type || "standard",
                      attendee_name:  user.first_name + " " + user.last_name,
                      attendee_email: user.email || "",
                      tickets:        b.tickets,
                      total_amount:   b.total_amount,
                    })} />)}
                  </div>
                </>
              )}

              {pastBookings.length > 0 && (
                <>
                  <div style={{ fontSize: 11, color: T.textMuted, fontWeight: 700, marginBottom: 12, letterSpacing: 1.2 }}>PAST</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    {pastBookings.map(b => <BookingCard key={b.id} booking={b} T={T} typeColors={typeColors} past onViewTicket={() => setViewingTicket({
                      booking_code:   b.booking_code,
                      event_title:    b.event_title,
                      event_date:     b.event_date,
                      event_time:     b.event_time,
                      event_venue:    b.event_venue,
                      event_type:     b.event_type || "Conference",
                      ticket_tier:    b.ticket_tier,
                      tier_type:      b.tier_type || "standard",
                      attendee_name:  user.first_name + " " + user.last_name,
                      attendee_email: user.email || "",
                      tickets:        b.tickets,
                      total_amount:   b.total_amount,
                    })} />)}
                  </div>
                </>
              )}

              {bookings.length === 0 && (
                <div style={{ textAlign: "center", padding: "80px 0", color: T.textMuted }}>
                  <div style={{ fontSize: 52, marginBottom: 16 }}>🎟</div>
                  <p style={{ fontSize: 18, fontWeight: 600, color: T.text, marginBottom: 8 }}>No bookings yet</p>
                  <p style={{ fontSize: 14, marginBottom: 24 }}>Explore events and book your first ticket</p>
                  <button onClick={() => setTab("explore")} style={{ background: "linear-gradient(135deg,#6366F1,#8B5CF6)", color: "#fff", border: "none", padding: "12px 24px", borderRadius: 10, fontWeight: 700, cursor: "pointer" }}>
                    Browse Events
                  </button>
                </div>
              )}
            </div>
          )}

          {/* EXPLORE TAB */}
          {tab === "explore" && (
            <div>
              <div style={{ marginBottom: 28 }}>
                <h1 style={{ fontSize: 24, fontWeight: 800, letterSpacing: "-0.5px", color: T.text, marginBottom: 4 }}>Explore Events</h1>
                <p style={{ color: T.textSub, fontSize: 14 }}>Find your next experience across Kenya</p>
              </div>

              {/* Search + Filter */}
              <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
                <input
                  placeholder="🔍  Search events or venues..."
                  value={search} onChange={e => setSearch(e.target.value)}
                  style={{ ...inputStyle, width: 280, padding: "10px 16px" }}
                />
              </div>
              <div style={{ display: "flex", gap: 8, marginBottom: 24, flexWrap: "wrap" }}>
                {categories.map(cat => (
                  <button key={cat} onClick={() => setFilter(cat)} style={{
                    background: filter === cat ? "linear-gradient(135deg,#6366F1,#8B5CF6)" : T.inputBg,
                    color: filter === cat ? "#fff" : T.textSub,
                    border: "1px solid " + (filter === cat ? "transparent" : T.inputBorder),
                    padding: "7px 16px", borderRadius: 20, fontSize: 13, fontWeight: 600, cursor: "pointer"
                  }}>
                    {cat}
                  </button>
                ))}
              </div>

              {filtered.length === 0 ? (
                <div style={{ textAlign: "center", padding: "60px 0", color: T.textMuted }}>
                  <div style={{ fontSize: 40, marginBottom: 12 }}>🎭</div>
                  <p>No events found</p>
                </div>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))", gap: 16 }}>
                  {filtered.map(ev => {
                    const spotsLeft = ev.capacity - (ev.booked || 0);
                    const pct = Math.round(((ev.booked || 0) / ev.capacity) * 100);
                    return (
                      <div key={ev.id} style={{ background: T.surface, border: `1px solid ${T.surfaceBorder}`, borderRadius: 16, overflow: "hidden", transition: "transform 0.2s, box-shadow 0.2s", cursor: "pointer" }}
                        onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-4px)"; e.currentTarget.style.boxShadow = "0 12px 32px rgba(99,102,241,0.18)"; }}
                        onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "none"; }}>
                        <div style={{ height: 140, background: `linear-gradient(135deg,${typeColors[ev.type] || "#6366F1"}33,${typeColors[ev.type] || "#6366F1"}55)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 44, position: "relative" }}>
                          <span>{ev.type === "Concert" ? "🎵" : ev.type === "Conference" ? "🎤" : ev.type === "Workshop" ? "🛠" : ev.type === "Festival" ? "🎪" : ev.type === "Networking" ? "🤝" : "🏃"}</span>
                          <div style={{ position: "absolute", top: 10, left: 10, background: typeColors[ev.type] || "#6366F1", color: "#fff", padding: "2px 8px", borderRadius: 20, fontSize: 10, fontWeight: 700 }}>{ev.type}</div>
                          {spotsLeft <= 0 && <div style={{ position: "absolute", top: 10, right: 10, background: "#EF4444", color: "#fff", padding: "2px 8px", borderRadius: 20, fontSize: 10, fontWeight: 700 }}>SOLD OUT</div>}
                        </div>
                        <div style={{ padding: "16px" }}>
                          <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 6, color: T.text, lineHeight: 1.3 }}>{ev.title}</h3>
                          <div style={{ fontSize: 12, color: T.textSub, marginBottom: 2 }}>📅 {ev.date} · {ev.time}</div>
                          <div style={{ fontSize: 12, color: T.textSub, marginBottom: 10 }}>📍 {ev.venue}</div>
                          <div style={{ background: T.inputBg, borderRadius: 4, height: 3, marginBottom: 4 }}>
                            <div style={{ background: pct > 80 ? "#EF4444" : "#6366F1", width: `${pct}%`, height: "100%", borderRadius: 4 }} />
                          </div>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 12 }}>
                            <span style={{ fontSize: 16, fontWeight: 800, color: "#A5B4FC" }}>{ev.price === 0 ? "FREE" : `KES ${ev.price?.toLocaleString()}`}</span>
                            <button onClick={() => { setBookingEvent(ev); setBookingStep("form"); }} disabled={spotsLeft <= 0} style={{
                              background: spotsLeft <= 0 ? T.inputBg : "linear-gradient(135deg,#6366F1,#8B5CF6)",
                              color: spotsLeft <= 0 ? T.textMuted : "#fff",
                              border: "none", padding: "7px 16px", borderRadius: 8, fontWeight: 700, cursor: spotsLeft <= 0 ? "not-allowed" : "pointer", fontSize: 12
                            }}>
                              {spotsLeft <= 0 ? "Sold Out" : "Book Now"}
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* PROFILE TAB */}
          {tab === "profile" && (
            <div style={{ maxWidth: 520 }}>
              <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 24, letterSpacing: "-0.5px", color: T.text }}>My Profile</h1>

              {/* Avatar + name card */}
              <div style={{ background: "linear-gradient(135deg, rgba(99,102,241,0.15), rgba(236,72,153,0.1))", border: `1px solid ${T.surfaceBorder}`, borderRadius: 20, padding: "32px 28px", marginBottom: 20, display: "flex", alignItems: "center", gap: 20 }}>
                <div style={{ width: 72, height: 72, background: "linear-gradient(135deg,#EC4899,#8B5CF6)", borderRadius: 18, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, fontWeight: 800, color: "#fff", flexShrink: 0 }}>
                  {user.first_name?.[0] || "A"}
                </div>
                <div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: T.text, marginBottom: 4 }}>{user.first_name} {user.last_name}</div>
                  <div style={{ fontSize: 13, color: T.textSub, marginBottom: 6 }}>@{user.username}</div>
                  <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "rgba(99,102,241,0.15)", border: "1px solid rgba(99,102,241,0.3)", color: "#A5B4FC", padding: "3px 12px", borderRadius: 20, fontSize: 12, fontWeight: 600 }}>
                    🎟 Attendee
                  </div>
                </div>
              </div>

              {/* Details */}
              <div style={{ background: T.surface, border: `1px solid ${T.surfaceBorder}`, borderRadius: 16, padding: 28, marginBottom: 20 }}>
                <div style={{ fontSize: 12, color: T.textMuted, fontWeight: 700, letterSpacing: 1, marginBottom: 16 }}>ACCOUNT DETAILS</div>
                {[
                  ["Full Name", `${user.first_name} ${user.last_name}`],
                  ["Username", `@${user.username}`],
                  ["Email", user.email || "—"],
                  ["Phone (M-Pesa)", user.phone || "—"],
                  ["Account Type", "Attendee"],
                ].map(([k, v]) => (
                  <div key={k} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "13px 0", borderBottom: `1px solid ${T.surfaceBorder}` }}>
                    <span style={{ color: T.textSub, fontSize: 14 }}>{k}</span>
                    <span style={{ fontWeight: 600, fontSize: 14, color: T.text }}>{v}</span>
                  </div>
                ))}
              </div>

              {/* Activity summary */}
              <div style={{ background: T.surface, border: `1px solid ${T.surfaceBorder}`, borderRadius: 16, padding: 28 }}>
                <div style={{ fontSize: 12, color: T.textMuted, fontWeight: 700, letterSpacing: 1, marginBottom: 16 }}>ACTIVITY SUMMARY</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  {[
                    { label: "Events Attended", val: pastBookings.length, color: "#6366F1" },
                    { label: "Upcoming Events", val: upcomingBookings.length, color: "#10B981" },
                    { label: "Total Bookings", val: bookings.length, color: "#8B5CF6" },
                    { label: "Total Spent (KES)", val: bookings.reduce((s, b) => s + (b.total_amount || 0), 0).toLocaleString(), color: "#F59E0B" },
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

      {/* BOOKING MODAL */}
      {bookingEvent && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", backdropFilter: "blur(8px)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div style={{ background: T.modalBg, border: `1px solid ${T.surfaceBorder}`, borderRadius: 20, padding: 36, width: "100%", maxWidth: 460, maxHeight: "90vh", overflowY: "auto" }}>

            {bookingStep === "form" && (
              <>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
                  <div>
                    <h2 style={{ fontSize: 21, fontWeight: 800, marginBottom: 4, color: T.text }}>Book Tickets</h2>
                    <p style={{ color: "#8B5CF6", fontWeight: 600, fontSize: 14, margin: 0 }}>{bookingEvent.title}</p>
                  </div>
                  <button onClick={closeBooking} style={{ background: "none", border: "none", color: T.textMuted, cursor: "pointer", fontSize: 22 }}>✕</button>
                </div>

                <div style={{ background: "rgba(99,102,241,0.08)", border: "1px solid rgba(99,102,241,0.2)", borderRadius: 12, padding: 16, marginBottom: 20, fontSize: 14 }}>
                  {[["Date & Time", `${bookingEvent.date} · ${bookingEvent.time}`], ["Venue", bookingEvent.venue], ["Price/ticket", bookingEvent.price === 0 ? "FREE" : `KES ${bookingEvent.price?.toLocaleString()}`]].map(([k, v]) => (
                    <div key={k} style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                      <span style={{ color: T.textSub }}>{k}</span>
                      <span style={{ fontWeight: 700, color: k === "Price/ticket" ? "#A5B4FC" : T.text }}>{v}</span>
                    </div>
                  ))}
                </div>

                {[["Full Name", "name", "text", "Your name"], ["Phone (M-Pesa)", "phone", "tel", "0712345678"], ["Email", "email", "email", "your@email.com"]].map(([label, field, type, ph]) => (
                  <div key={field} style={{ marginBottom: 14 }}>
                    <label style={labelStyle}>{label}</label>
                    <input type={type} placeholder={ph} value={bookingForm[field]} onChange={e => setBookingForm(p => ({ ...p, [field]: e.target.value }))} style={inputStyle} />
                  </div>
                ))}

                <div style={{ marginBottom: 22 }}>
                  <label style={labelStyle}>Number of Tickets</label>
                  <input type="number" min="1" max="10" value={bookingForm.tickets} onChange={e => setBookingForm(p => ({ ...p, tickets: parseInt(e.target.value) || 1 }))} style={inputStyle} />
                  {bookingEvent.price > 0 && (
                    <p style={{ fontSize: 14, color: "#A5B4FC", marginTop: 8, fontWeight: 700 }}>
                      Total: KES {(bookingEvent.price * bookingForm.tickets).toLocaleString()}
                    </p>
                  )}
                </div>

                <button onClick={handleBook} style={{ width: "100%", background: "linear-gradient(135deg,#6366F1,#8B5CF6)", color: "#fff", border: "none", padding: "14px", borderRadius: 12, fontWeight: 700, cursor: "pointer", fontSize: 15 }}>
                  {bookingEvent.price === 0 ? "Reserve Free Tickets →" : "Proceed to M-Pesa Payment →"}
                </button>
              </>
            )}

            {bookingStep === "payment" && (
              <>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
                  <h2 style={{ fontSize: 21, fontWeight: 800, color: T.text }}>M-Pesa Payment</h2>
                  <button onClick={closeBooking} style={{ background: "none", border: "none", color: T.textMuted, cursor: "pointer", fontSize: 22 }}>✕</button>
                </div>
                <div style={{ background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.25)", borderRadius: 12, padding: 20, marginBottom: 20 }}>
                  <div style={{ fontSize: 28, marginBottom: 8, textAlign: "center" }}>📱</div>
                  <p style={{ fontSize: 14, color: T.textSub, textAlign: "center", lineHeight: 1.8, margin: 0 }}>
                    <strong style={{ color: "#10B981" }}>Step 1:</strong> M-Pesa → Lipa na M-Pesa → Pay Bill<br />
                    <strong style={{ color: "#10B981" }}>Business No:</strong> 123456<br />
                    <strong style={{ color: "#10B981" }}>Account:</strong> {bookingEvent.id}-{bookingForm.phone}<br />
                    <strong style={{ color: "#10B981" }}>Amount:</strong> KES {(bookingEvent.price * bookingForm.tickets).toLocaleString()}
                  </p>
                </div>
                <div style={{ marginBottom: 22 }}>
                  <label style={labelStyle}>Enter M-Pesa Confirmation Code</label>
                  <input placeholder="e.g. QKL4XY8Z99" value={mpesaCode} onChange={e => setMpesaCode(e.target.value.toUpperCase())} style={{ ...inputStyle, fontFamily: "monospace", letterSpacing: 2, fontSize: 15 }} />
                </div>
                <button onClick={handleMpesaPayment} disabled={loading} style={{ width: "100%", background: "linear-gradient(135deg,#10B981,#059669)", color: "#fff", border: "none", padding: "14px", borderRadius: 12, fontWeight: 700, cursor: "pointer", fontSize: 15, opacity: loading ? 0.7 : 1 }}>
                  {loading ? "Verifying..." : "Confirm Booking ✓"}
                </button>
              </>
            )}

            {bookingStep === "success" && (
              <div style={{ textAlign: "center", padding: "20px 0" }}>
                <div style={{ fontSize: 64, marginBottom: 16 }}>🎉</div>
                <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 8, color: T.text }}>You're In!</h2>
                <p style={{ color: T.textSub, marginBottom: 8, lineHeight: 1.7 }}>
                  Booking confirmed for <strong style={{ color: "#A5B4FC" }}>{bookingEvent.title}</strong>
                </p>
                <p style={{ color: "#10B981", fontSize: 14, fontWeight: 600, marginBottom: 28 }}>
                  📱 SMS confirmation sent to {bookingForm.phone}
                </p>
                <button onClick={() => { closeBooking(); setTab("bookings"); }} style={{ background: "linear-gradient(135deg,#6366F1,#8B5CF6)", color: "#fff", border: "none", padding: "12px 36px", borderRadius: 12, fontWeight: 700, cursor: "pointer", fontSize: 15 }}>
                  View My Bookings
                </button>
              </div>
            )}
          </div>
        </div>
      )}
      {/* DIGITAL TICKET OVERLAY */}
      {viewingTicket && (
        <DigitalTicket
          ticket={viewingTicket}
          onClose={() => setViewingTicket(null)}
        />
      )}
    </div>
  );
}

function BookingCard({ booking, T, typeColors, past, onViewTicket }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div style={{ background: T.surface, border: `1px solid ${T.surfaceBorder}`, borderRadius: 14, padding: "18px 22px", opacity: past ? 0.65 : 1, transition: "box-shadow 0.2s" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 6, flexWrap: "wrap" }}>
            <span style={{ fontSize: 15, fontWeight: 700, color: T.text }}>{booking.event_title}</span>
            {past && <span style={{ background: T.inputBg, color: T.textMuted, padding: "2px 8px", borderRadius: 20, fontSize: 10, fontWeight: 700 }}>PAST</span>}
            <span style={{ background: "rgba(16,185,129,0.15)", color: "#10B981", padding: "2px 8px", borderRadius: 20, fontSize: 10, fontWeight: 700 }}>CONFIRMED</span>
          </div>
          <div style={{ fontSize: 12, color: T.textSub, marginBottom: 2 }}>📅 {booking.event_date} · {booking.event_time}</div>
          <div style={{ fontSize: 12, color: T.textSub }}>📍 {booking.event_venue}</div>
        </div>
        <div style={{ textAlign: "right", flexShrink: 0 }}>
          <div style={{ fontSize: 16, fontWeight: 800, color: "#A5B4FC" }}>KES {booking.total_amount?.toLocaleString()}</div>
          <div style={{ fontSize: 12, color: T.textSub }}>{booking.tickets} ticket{booking.tickets !== 1 ? "s" : ""}</div>
        </div>
      </div>

      {/* Expand to see ticket details */}
      <button onClick={() => setExpanded(p => !p)} style={{ background: "none", border: "none", color: "#A5B4FC", cursor: "pointer", fontSize: 12, fontWeight: 600, marginTop: 12, padding: 0 }}>
        {expanded ? "▲ Hide ticket details" : "▼ Show ticket details"}
      </button>

      {expanded && (
        <div style={{ marginTop: 14, background: "rgba(99,102,241,0.06)", border: "1px solid rgba(99,102,241,0.15)", borderRadius: 10, padding: "14px 16px" }}>
          <div style={{ fontSize: 11, color: T.textMuted, fontWeight: 700, letterSpacing: 1, marginBottom: 10 }}>TICKET DETAILS</div>
          {[
            ["Booking Code", booking.booking_code || "EF-DEMO123"],
            ["Ticket Type",  booking.ticket_tier || "Regular"],
            ["M-Pesa Code",  booking.mpesa_code || "—"],
            ["Tickets",      `${booking.tickets} ticket${booking.tickets !== 1 ? "s" : ""}`],
            ["Booked On",    booking.created_at],
          ].map(([k, v]) => (
            <div key={k} style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
              <span style={{ fontSize: 13, color: T.textSub }}>{k}</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: T.text, fontFamily: k === "Booking Code" || k === "M-Pesa Code" ? "monospace" : "inherit" }}>{v}</span>
            </div>
          ))}
          <button
            onClick={onViewTicket}
            style={{ width: "100%", background: "linear-gradient(135deg,#6366F1,#8B5CF6)", color: "#fff", border: "none", padding: "10px", borderRadius: 10, fontWeight: 700, cursor: "pointer", fontSize: 14, marginTop: 8 }}>
            🎫 View Digital Ticket
          </button>
        </div>
      )}
    </div>
  );
}
