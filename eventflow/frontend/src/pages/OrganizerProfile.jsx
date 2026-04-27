import { useState, useEffect } from "react";
import { API_BASE, useTheme } from "../App";

export default function OrganizerProfile({ organizerId, onBack, onBookEvent }) {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const [organizer, setOrganizer] = useState(null);
  const [events, setEvents] = useState([]);
  const [activeTab, setActiveTab] = useState("upcoming");
  const [loading, setLoading] = useState(true);

  const T = {
    bg: isDark ? "#0A0A0F" : "#F8F9FF",
    surface: isDark ? "rgba(255,255,255,0.03)" : "rgba(255,255,255,0.9)",
    surfaceBorder: isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.07)",
    text: isDark ? "#F0F0F5" : "#0F172A",
    textSub: isDark ? "#94A3B8" : "#64748B",
    textMuted: isDark ? "#64748B" : "#94A3B8",
    inputBg: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)",
    inputBorder: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)",
  };

  useEffect(() => { loadOrganizerProfile(); }, [organizerId]);

  const loadOrganizerProfile = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/auth/organizer/${organizerId}/`);
      if (res.ok) { const data = await res.json(); setOrganizer(data.organizer); setEvents(data.events || []); }
      else loadDemoData();
    } catch { loadDemoData(); }
    setLoading(false);
  };

  const loadDemoData = () => {
    setOrganizer({ id: organizerId || 1, company_name: "Nairobi Tech Events Ltd", username: "nairobitech", bio: "Kenya's leading tech events organizer. We bring together innovators, entrepreneurs, and developers across East Africa.", location: "Nairobi, Kenya", website: "nairobitech.co.ke", events_hosted: 24, total_attendees: 4800, member_since: "2022", avatar_letter: "N" });
    setEvents([
      { id: 1, title: "Nairobi Tech Summit 2025", type: "Conference", date: "2025-09-15", time: "09:00", venue: "KICC, Nairobi", price: 2500, capacity: 300, booked: 187, city: "Nairobi", past: false },
      { id: 2, title: "AI & Future of Work Workshop", type: "Workshop", date: "2025-08-22", time: "10:00", venue: "iHub, Nairobi", price: 1500, capacity: 60, booked: 43, city: "Nairobi", past: false },
      { id: 3, title: "Startup Pitch Night", type: "Networking", date: "2024-11-10", time: "18:00", venue: "Westgate Mall", price: 500, capacity: 120, booked: 120, city: "Nairobi", past: true },
      { id: 4, title: "DevFest Nakuru 2024", type: "Conference", date: "2024-10-05", time: "09:00", venue: "Sarova Woodlands", price: 1000, capacity: 200, booked: 198, city: "Nakuru", past: true },
    ]);
  };

  const upcoming = events.filter(e => !e.past);
  const past = events.filter(e => e.past);
  const displayed = activeTab === "upcoming" ? upcoming : past;

  if (loading) return <div style={{ minHeight: "100vh", background: T.bg, display: "flex", alignItems: "center", justifyContent: "center", color: T.textSub }}>Loading profile...</div>;
  if (!organizer) return null;

  return (
    <div style={{ minHeight: "100vh", background: T.bg, color: T.text, fontFamily: "'DM Sans', sans-serif" }}>
      <div style={{ padding: "20px 32px 0" }}>
        <button onClick={onBack} style={{ background: "none", border: "none", color: T.textSub, cursor: "pointer", fontSize: 14, display: "flex", alignItems: "center", gap: 6, padding: 0 }}>← Back to events</button>
      </div>

      <div style={{ margin: "20px 32px 0", borderRadius: 20, background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)", padding: "40px 40px 0", overflow: "hidden", position: "relative", border: `1px solid ${T.surfaceBorder}` }}>
        <div style={{ position: "absolute", top: -40, right: -40, width: 200, height: 200, borderRadius: "50%", background: "rgba(99,102,241,0.15)" }} />
        <div style={{ display: "flex", alignItems: "flex-end", gap: 24, position: "relative" }}>
          <div style={{ width: 80, height: 80, background: "linear-gradient(135deg,#6366F1,#8B5CF6)", borderRadius: 20, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 32, fontWeight: 800, color: "#fff", flexShrink: 0, border: "3px solid rgba(255,255,255,0.15)" }}>
            {organizer.avatar_letter || organizer.company_name?.[0] || "O"}
          </div>
          <div style={{ paddingBottom: 24 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
              <h1 style={{ fontSize: 26, fontWeight: 800, color: "#fff", margin: 0 }}>{organizer.company_name}</h1>
              <span style={{ background: "rgba(99,102,241,0.4)", color: "#A5B4FC", padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700 }}>ORGANIZER</span>
            </div>
            <div style={{ fontSize: 13, color: "rgba(255,255,255,0.55)", display: "flex", gap: 16 }}>
              <span>📍 {organizer.location}</span>
              <span>🗓 Since {organizer.member_since}</span>
            </div>
          </div>
        </div>
      </div>

      <div style={{ padding: "28px 32px", maxWidth: 1100, margin: "0 auto" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 28 }}>
          <div>
            {organizer.bio && (
              <div style={{ background: T.surface, border: `1px solid ${T.surfaceBorder}`, borderRadius: 16, padding: 24, marginBottom: 24 }}>
                <p style={{ fontSize: 15, color: T.textSub, lineHeight: 1.7, margin: 0 }}>{organizer.bio}</p>
              </div>
            )}
            <div style={{ display: "flex", gap: 4, marginBottom: 20, background: T.inputBg, borderRadius: 12, padding: 4, width: "fit-content" }}>
              {[["upcoming", `Upcoming (${upcoming.length})`], ["past", `Past Events (${past.length})`]].map(([key, label]) => (
                <button key={key} onClick={() => setActiveTab(key)} style={{ background: activeTab === key ? "linear-gradient(135deg,#6366F1,#8B5CF6)" : "none", color: activeTab === key ? "#fff" : T.textSub, border: "none", borderRadius: 9, padding: "9px 20px", fontWeight: 600, fontSize: 14, cursor: "pointer", fontFamily: "inherit" }}>{label}</button>
              ))}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {displayed.length === 0 && <div style={{ textAlign: "center", color: T.textMuted, padding: 40, background: T.surface, borderRadius: 16, border: `1px solid ${T.surfaceBorder}` }}>No {activeTab} events.</div>}
              {displayed.map(event => (
                <div key={event.id} style={{ background: T.surface, border: `1px solid ${T.surfaceBorder}`, borderRadius: 14, padding: "20px 24px", display: "flex", alignItems: "center", gap: 20, opacity: event.past ? 0.75 : 1 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                      <span style={{ fontWeight: 700, fontSize: 16, color: T.text }}>{event.title}</span>
                      <span style={{ background: "rgba(99,102,241,0.15)", color: "#A5B4FC", padding: "2px 8px", borderRadius: 20, fontSize: 11, fontWeight: 700 }}>{event.type}</span>
                    </div>
                    <div style={{ fontSize: 13, color: T.textSub }}>📅 {event.date} · {event.time} · 📍 {event.venue}</div>
                  </div>
                  {event.past && <div style={{ textAlign: "center", minWidth: 90 }}><div style={{ fontSize: 20, fontWeight: 800, color: "#10B981" }}>{event.booked}</div><div style={{ fontSize: 11, color: T.textMuted }}>attended</div></div>}
                  <div style={{ textAlign: "right", minWidth: 100 }}>
                    <div style={{ fontSize: 16, fontWeight: 800, color: T.text }}>{event.price === 0 ? "FREE" : `KES ${event.price?.toLocaleString()}`}</div>
                    {!event.past && <div style={{ fontSize: 12, color: T.textMuted }}>{event.capacity - event.booked} spots left</div>}
                  </div>
                  {!event.past && <button onClick={() => onBookEvent && onBookEvent(event)} style={{ background: "linear-gradient(135deg,#6366F1,#8B5CF6)", color: "#fff", border: "none", padding: "10px 20px", borderRadius: 10, fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" }}>Book Now</button>}
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ background: T.surface, border: `1px solid ${T.surfaceBorder}`, borderRadius: 16, padding: 24 }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: T.textSub, marginBottom: 20, textTransform: "uppercase", letterSpacing: "0.5px" }}>Organizer Stats</h3>
              {[["🎪", "Events Hosted", organizer.events_hosted], ["👥", "Total Attendees", organizer.total_attendees?.toLocaleString()], ["📅", "Upcoming", upcoming.length], ["✅", "Past Events", past.length]].map(([icon, label, value]) => (
                <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 0", borderBottom: `1px solid ${T.surfaceBorder}` }}>
                  <span style={{ fontSize: 14, color: T.textSub }}>{icon} {label}</span>
                  <span style={{ fontSize: 18, fontWeight: 800, color: T.text }}>{value}</span>
                </div>
              ))}
            </div>
            <div style={{ background: "linear-gradient(135deg, rgba(99,102,241,0.1), rgba(139,92,246,0.1))", border: "1px solid rgba(99,102,241,0.2)", borderRadius: 16, padding: 24, textAlign: "center" }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>⭐</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#A5B4FC", marginBottom: 4 }}>Verified Organizer</div>
              <div style={{ fontSize: 12, color: T.textMuted, lineHeight: 1.5 }}>This organizer has been verified on EventFlow.</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
