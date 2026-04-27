import { useState, useEffect, useContext, useRef } from "react";
import { API_BASE, ThemeContext } from "../App";
import DigitalTicket from "../components/DigitalTicket";

const categories = ["All", "Conference", "Concert", "Workshop", "Festival", "Networking", "Sports"];

const EVENT_TYPES_SHOWCASE = [
  { icon: "🎤", type: "Conferences", desc: "Tech summits, business forums and professional expos.", filter: "Conference" },
  { icon: "🎵", type: "Concerts", desc: "Live music, performances and entertainment nights.", filter: "Concert" },
  { icon: "🛠", type: "Workshops", desc: "Skill-building sessions, bootcamps and creative classes.", filter: "Workshop" },
  { icon: "🎪", type: "Festivals", desc: "Cultural celebrations, food fests and art shows.", filter: "Festival" },
  { icon: "🤝", type: "Networking", desc: "Founder meetups, career fairs and industry mixers.", filter: "Networking" },
  { icon: "🏃", type: "Sports", desc: "Marathons, tournaments and outdoor adventures.", filter: "Sports" },
];

const HOW_IT_WORKS = [
  { step: "01", icon: "🔍", title: "Browse Events", desc: "Explore hundreds of events across Kenya — filter by category, date or location." },
  { step: "02", icon: "🎟", title: "Reserve Your Spot", desc: "Pick your tickets and fill in your details in under 60 seconds." },
  { step: "03", icon: "📱", title: "Pay via M-Pesa", desc: "Complete your booking instantly with M-Pesa. Get your confirmation SMS immediately." },
];

function useWindowWidth() {
  const [width, setWidth] = useState(window.innerWidth);
  useEffect(() => {
    const handler = () => setWidth(window.innerWidth);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);
  return width;
}

function CountdownTimer({ date }) {
  const [timeLeft, setTimeLeft] = useState({});

  useEffect(() => {
    const calc = () => {
      const diff = new Date(date) - new Date();
      if (diff <= 0) return setTimeLeft(null);
      setTimeLeft({
        d: Math.floor(diff / 86400000),
        h: Math.floor((diff % 86400000) / 3600000),
        m: Math.floor((diff % 3600000) / 60000),
      });
    };
    calc();
    const t = setInterval(calc, 60000);
    return () => clearInterval(t);
  }, [date]);

  if (!timeLeft) return null;
  return (
    <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
      {[["d", "days"], ["h", "hrs"], ["m", "min"]].map(([k, label]) => (
        <div key={k} style={{ background: "rgba(99,102,241,0.2)", border: "1px solid rgba(99,102,241,0.3)", borderRadius: 6, padding: "3px 8px", textAlign: "center" }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: "#A5B4FC" }}>{timeLeft[k]}</div>
          <div style={{ fontSize: 9, color: "#64748B", fontWeight: 600, letterSpacing: 0.5 }}>{label}</div>
        </div>
      ))}
    </div>
  );
}

function SkeletonCard({ T }) {
  return (
    <div style={{ background: T.surface, border: `1px solid ${T.surfaceBorder}`, borderRadius: 16, overflow: "hidden" }}>
      <div style={{ height: 160, background: T.inputBg, animation: "pulse 1.5s ease-in-out infinite" }} />
      <div style={{ padding: 20 }}>
        {[80, 60, 40].map((w, i) => (
          <div key={i} style={{ height: 12, background: T.inputBg, borderRadius: 6, marginBottom: 10, width: `${w}%`, animation: "pulse 1.5s ease-in-out infinite" }} />
        ))}
      </div>
    </div>
  );
}

export default function PublicSite({ onOpenAuth, currentUser, onGoToDashboard }) {
  const { theme, toggleTheme } = useContext(ThemeContext);
  const isDark = theme === "dark";
  const width = useWindowWidth();
  const isMobile = width < 768;

  const [events, setEvents] = useState([]);
  const [featured, setFeatured] = useState([]);
  const [filter, setFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [bookingEvent, setBookingEvent] = useState(null);
  const [selectedTier, setSelectedTier] = useState(null);
  const [bookingForm, setBookingForm] = useState({ name: "", phone: "", email: "", tickets: 1 });
  const [bookingStep, setBookingStep] = useState("form");
  const [mpesaCode, setMpesaCode] = useState("");
  const [loadingBooking, setLoadingBooking] = useState(false);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [toast, setToast] = useState(null);
  const [navScrolled, setNavScrolled] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [orgProfile, setOrgProfile] = useState(null);
  const [orgLoading, setOrgLoading] = useState(false);
  const [generatedTicket, setGeneratedTicket] = useState(null); // digital ticket data

  const T = {
    bg: isDark ? "#0A0A0F" : "#F8F9FF",
    surface: isDark ? "rgba(255,255,255,0.03)" : "#FFFFFF",
    surfaceBorder: isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.08)",
    navBg: navScrolled
      ? (isDark ? "rgba(10,10,15,0.97)" : "rgba(248,249,255,0.97)")
      : (isDark ? "rgba(10,10,15,0.8)" : "rgba(248,249,255,0.8)"),
    navBorder: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)",
    text: isDark ? "#F0F0F5" : "#0F172A",
    textSub: isDark ? "#94A3B8" : "#64748B",
    textMuted: isDark ? "#64748B" : "#94A3B8",
    inputBg: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)",
    inputBorder: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)",
    modalBg: isDark ? "#12121A" : "#FFFFFF",
    sectionAlt: isDark ? "rgba(255,255,255,0.015)" : "rgba(99,102,241,0.025)",
  };

  useEffect(() => {
    const onScroll = () => setNavScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => { loadEvents(); }, []);

  const loadEvents = async () => {
    setLoadingEvents(true);
    const today = new Date(new Date().toDateString());
    try {
      const res = await fetch(`${API_BASE}/events/public/`);
      const data = await res.json();
      const upcoming = data.filter(e => new Date(e.date) >= today);
      setEvents(upcoming);
      setFeatured(upcoming.filter(e => e.is_featured).slice(0, 3));
    } catch {
      const TIERS_CONFERENCE = [
          { id: 101, name: "Early Bird", tier_type: "early_bird", price: 1500, capacity: 50, spots_left: 12, description: "Limited early bird offer.", is_active: true },
          { id: 102, name: "Regular",    tier_type: "standard",   price: 2500, capacity: 200, spots_left: 120, description: "Standard admission.", is_active: true },
          { id: 103, name: "VIP",        tier_type: "vip",        price: 5000, capacity: 30, spots_left: 8, description: "VIP seating and networking dinner.", is_active: true },
          { id: 104, name: "VVIP",       tier_type: "vvip",       price: 10000, capacity: 10, spots_left: 3, description: "Full hospitality package.", is_active: true },
        ];
        const TIERS_CONCERT = [
          { id: 201, name: "Early Bird", tier_type: "early_bird", price: 2000, capacity: 100, spots_left: 0, description: "Sold out early bird.", is_active: true },
          { id: 202, name: "Regular",    tier_type: "standard",   price: 3500, capacity: 800, spots_left: 110, description: "General standing area.", is_active: true },
          { id: 203, name: "VIP",        tier_type: "vip",        price: 7500, capacity: 100, spots_left: 22, description: "VIP section with best views.", is_active: true },
          { id: 204, name: "VVIP",       tier_type: "vvip",       price: 15000, capacity: 20, spots_left: 5, description: "Backstage access + hospitality.", is_active: true },
        ];
        const sample = [
        { id: 1, title: "Nairobi Tech Summit 2025", type: "Conference", date: "2026-09-15", time: "09:00", venue: "KICC, Nairobi", price: 2500, capacity: 500, booked: 342, image: null, description: "Kenya's biggest tech gathering for developers, founders and innovators.", organizer_name: "TechKenya", organizer_id: 1, is_featured: true, ticket_tiers: TIERS_CONFERENCE },
        { id: 2, title: "Sauti Sol Live in Concert", type: "Concert", date: "2026-08-30", time: "19:00", venue: "Carnivore, Nairobi", price: 3500, capacity: 2000, booked: 1890, image: null, description: "An unforgettable night with Africa's finest musical group.", organizer_name: "LiveNation KE", organizer_id: 2, is_featured: true, ticket_tiers: TIERS_CONCERT },
        { id: 3, title: "Product Design Workshop", type: "Workshop", date: "2026-09-05", time: "10:00", venue: "iHub, Nairobi", price: 1500, capacity: 50, booked: 38, image: null, description: "Hands-on Figma and UX research workshop for designers.", organizer_name: "DesignKenya", organizer_id: 3, is_featured: false, ticket_tiers: [
          { id: 301, name: "Early Bird", tier_type: "early_bird", price: 800, capacity: 10, spots_left: 2, description: "Discounted early access.", is_active: true },
          { id: 302, name: "Regular",    tier_type: "standard",   price: 1500, capacity: 40, spots_left: 10, description: "Standard workshop seat.", is_active: true },
        ]},
        { id: 4, title: "Lamu Cultural Festival", type: "Festival", date: "2026-11-01", time: "08:00", venue: "Lamu Town", price: 500, capacity: 1000, booked: 210, image: null, description: "Celebrate Swahili heritage, dhow racing, and traditional cuisine.", organizer_name: "Lamu County", organizer_id: 4, is_featured: true, ticket_tiers: [
          { id: 401, name: "Regular", tier_type: "standard", price: 500, capacity: 800, spots_left: 590, description: "General admission.", is_active: true },
          { id: 402, name: "VIP",     tier_type: "vip",      price: 2000, capacity: 200, spots_left: 0, description: "VIP cultural experience.", is_active: true },
        ]},
        { id: 5, title: "Startup Founders Mixer", type: "Networking", date: "2026-08-22", time: "18:30", venue: "Alchemist, Nairobi", price: 0, capacity: 150, booked: 89, image: null, description: "Connect with Nairobi's hottest startup founders over drinks.", organizer_name: "StartupGrind KE", organizer_id: 5, is_featured: false, ticket_tiers: [] },
        { id: 6, title: "Nairobi Marathon 2025", type: "Sports", date: "2026-10-26", time: "06:00", venue: "Uhuru Park, Nairobi", price: 1000, capacity: 5000, booked: 3400, image: null, description: "Run Nairobi's most iconic marathon through the city centre.", organizer_name: "Athletics Kenya", organizer_id: 6, is_featured: false, ticket_tiers: [
          { id: 601, name: "Early Bird", tier_type: "early_bird", price: 600, capacity: 500, spots_left: 0, description: "Early registration discount.", is_active: true },
          { id: 602, name: "Regular",    tier_type: "standard",   price: 1000, capacity: 4500, spots_left: 1100, description: "Standard race entry.", is_active: true },
        ]},
      ];
      setEvents(sample);
      setFeatured(sample.filter(e => e.is_featured));
    }
    setLoadingEvents(false);
  };

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  const openEventDetail = async (ev) => {
    setSelectedEvent(ev);
    setOrgProfile(null);
    if (!ev.organizer_id && !ev.organizer) return;
    const orgId = ev.organizer_id || ev.organizer;
    setOrgLoading(true);
    try {
      const res = await fetch(`${API_BASE}/events/organizer/${orgId}/`);
      if (res.ok) setOrgProfile(await res.json());
    } catch {
      // demo fallback organizer profile
      setOrgProfile({
        organizer: { display_name: ev.organizer_name || "EventFlow Organizer", org_description: "Professional event organizer bringing world-class experiences to Kenya.", org_logo: null, org_website: "" },
        stats: { total_events: 8, total_bookings: 1200, avg_fill_rate: 78, upcoming_count: 3, past_count: 5 },
        upcoming_events: [],
        past_events: [],
      });
    }
    setOrgLoading(false);
  };

  const filtered = events.filter(e => {
    const matchCat = filter === "All" || e.type === filter;
    const matchSearch = e.title.toLowerCase().includes(search.toLowerCase()) || e.venue?.toLowerCase().includes(search.toLowerCase());
    const isUpcoming = new Date(e.date) >= new Date(new Date().toDateString()); // remove past events
    return matchCat && matchSearch && isUpcoming;
  });

  const handleBook = () => {
    if (!bookingForm.name || !bookingForm.phone || !bookingForm.email) {
      showToast("Please fill all fields", "error"); return;
    }
    if (!selectedTier) {
      showToast("Please select a ticket type", "error"); return;
    }
    setBookingStep("payment");
  };

  // Always produce tiers — use event's own tiers if set, otherwise build defaults from base price
  const getEffectiveTiers = (ev) => {
    if (!ev) return [];
    const activeTiers = (ev.ticket_tiers || []).filter(t => t.is_active);
    if (activeTiers.length > 0) return activeTiers;
    if (Number(ev.price) === 0) return [
      { id: "free", name: "Free Entry", tier_type: "free", price: 0, capacity: ev.capacity, spots_left: ev.capacity - (ev.booked || 0), description: "Free admission — reserve your spot.", is_active: true },
    ];
    const base = Number(ev.price);
    return [
      { id: "eb",  name: "Early Bird", tier_type: "early_bird", price: Math.round(base * 0.6), capacity: Math.round(ev.capacity * 0.15), spots_left: Math.round(ev.capacity * 0.05), description: "Limited early bird discount.", is_active: true },
      { id: "reg", name: "Regular",    tier_type: "standard",   price: base,                  capacity: Math.round(ev.capacity * 0.6),  spots_left: Math.round(ev.capacity * 0.3),  description: "Standard admission ticket.",  is_active: true },
      { id: "vip", name: "VIP",        tier_type: "vip",        price: Math.round(base * 2),  capacity: Math.round(ev.capacity * 0.15), spots_left: Math.round(ev.capacity * 0.08), description: "VIP seating and exclusive perks.", is_active: true },
      { id: "vvip",name: "VVIP",       tier_type: "vvip",       price: Math.round(base * 4),  capacity: Math.round(ev.capacity * 0.05), spots_left: Math.round(ev.capacity * 0.02), description: "Premium VVIP full hospitality.", is_active: true },
    ];
  };

  const handleMpesaPayment = async () => {
    if (!mpesaCode.trim()) { showToast("Enter M-Pesa code", "error"); return; }
    setLoadingBooking(true);
    try {
      const res = await fetch(`${API_BASE}/bookings/create/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event: bookingEvent.id,
          ticket_tier_id: selectedTier?.id || null,
          attendee_name: bookingForm.name,
          attendee_phone: bookingForm.phone,
          attendee_email: bookingForm.email,
          tickets: bookingForm.tickets,
          mpesa_code: mpesaCode,
        }),
      });

      let bookingCode = "EF-" + Math.random().toString(36).substring(2, 8).toUpperCase();
      if (res.ok) {
        const data = await res.json();
        bookingCode = data.booking_code || bookingCode;
      }

      // Build digital ticket data
      const unit = selectedTier ? Number(selectedTier.price) : Number(bookingEvent.price);
      setGeneratedTicket({
        booking_code:   bookingCode,
        event_title:    bookingEvent.title,
        event_date:     bookingEvent.date,
        event_time:     bookingEvent.time,
        event_venue:    bookingEvent.venue,
        event_type:     bookingEvent.type,
        ticket_tier:    selectedTier?.name || "Regular",
        tier_type:      selectedTier?.tier_type || "standard",
        attendee_name:  bookingForm.name,
        attendee_email: bookingForm.email,
        tickets:        bookingForm.tickets,
        total_amount:   unit * bookingForm.tickets,
      });

      setBookingStep("success");
    } catch {
      // demo mode
      const unit = selectedTier ? Number(selectedTier.price) : Number(bookingEvent.price);
      const bookingCode = "EF-" + Math.random().toString(36).substring(2, 8).toUpperCase();
      setGeneratedTicket({
        booking_code:   bookingCode,
        event_title:    bookingEvent.title,
        event_date:     bookingEvent.date,
        event_time:     bookingEvent.time,
        event_venue:    bookingEvent.venue,
        event_type:     bookingEvent.type,
        ticket_tier:    selectedTier?.name || "Regular",
        tier_type:      selectedTier?.tier_type || "standard",
        attendee_name:  bookingForm.name,
        attendee_email: bookingForm.email,
        tickets:        bookingForm.tickets,
        total_amount:   unit * bookingForm.tickets,
      });
      setBookingStep("success");
    }
    setLoadingBooking(false);
  };

  const closeBooking = () => {
    setBookingEvent(null); setBookingStep("form"); setSelectedTier(null);
    setBookingForm({ name: "", phone: "", email: "", tickets: 1 });
    setMpesaCode(""); setGeneratedTicket(null);
  };

  const typeColors = {
    Conference: "#3B82F6", Concert: "#8B5CF6", Workshop: "#10B981",
    Festival: "#F59E0B", Networking: "#EC4899", Sports: "#EF4444"
  };

  const inputStyle = { width: "100%", background: T.inputBg, border: `1px solid ${T.inputBorder}`, color: T.text, padding: "12px 16px", borderRadius: 10, fontSize: 14, outline: "none", boxSizing: "border-box", fontFamily: "'Outfit', sans-serif" };

  return (
    <div style={{ fontFamily: "'Outfit', 'DM Sans', sans-serif", background: T.bg, minHeight: "100vh", color: T.text, transition: "background 0.3s, color 0.3s" }}>

      {/* Pulse animation keyframe */}
      <style>{`
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
        @keyframes floatUp { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
        .hero-content { animation: floatUp 0.7s ease forwards; }
      `}</style>

      {/* Toast */}
      {toast && (
        <div style={{ position: "fixed", top: 24, right: 24, zIndex: 9999, background: toast.type === "error" ? "#EF4444" : "#10B981", color: "#fff", padding: "12px 20px", borderRadius: 10, fontWeight: 600, fontSize: 14, boxShadow: "0 8px 32px rgba(0,0,0,0.4)", animation: "floatUp 0.3s ease" }}>
          {toast.msg}
        </div>
      )}

      {/* NAV */}
      <nav style={{ position: "sticky", top: 0, zIndex: 100, background: T.navBg, backdropFilter: "blur(24px)", borderBottom: `1px solid ${T.navBorder}`, padding: isMobile ? "0 20px" : "0 40px", height: 64, display: "flex", alignItems: "center", justifyContent: "space-between", transition: "background 0.3s, box-shadow 0.3s", boxShadow: navScrolled ? "0 4px 24px rgba(0,0,0,0.2)" : "none" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 32, height: 32, background: "linear-gradient(135deg, #6366F1, #8B5CF6)", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0 }}>⚡</div>
          <span style={{ fontSize: 20, fontWeight: 800, letterSpacing: "-0.5px", background: "linear-gradient(90deg, #A5B4FC, #C4B5FD)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>EventFlow</span>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button onClick={toggleTheme} title={isDark ? "Light Mode" : "Dark Mode"} style={{ background: T.inputBg, border: `1px solid ${T.inputBorder}`, color: T.textSub, width: 36, height: 36, borderRadius: 8, cursor: "pointer", fontSize: 15, display: "flex", alignItems: "center", justifyContent: "center" }}>
            {isDark ? "☀️" : "🌙"}
          </button>
          {currentUser ? (
            <button onClick={onGoToDashboard} style={{ background: "linear-gradient(135deg,#6366F1,#8B5CF6)", color: "#fff", border: "none", padding: "8px 20px", borderRadius: 8, fontWeight: 600, cursor: "pointer", fontSize: 14 }}>
              Dashboard
            </button>
          ) : (
            <>
              {!isMobile && (
                <button onClick={() => onOpenAuth("login")} style={{ background: "transparent", color: "#A5B4FC", border: "1px solid rgba(165,180,252,0.3)", padding: "8px 18px", borderRadius: 8, fontWeight: 500, cursor: "pointer", fontSize: 14 }}>
                  Sign In
                </button>
              )}
              <button onClick={() => onOpenAuth("signup")} style={{ background: "linear-gradient(135deg,#6366F1,#8B5CF6)", color: "#fff", border: "none", padding: "8px 20px", borderRadius: 8, fontWeight: 600, cursor: "pointer", fontSize: 14 }}>
                {isMobile ? "Sign Up" : "Get Started"}
              </button>
            </>
          )}
        </div>
      </nav>

      {/* HERO */}
      <section style={{ padding: isMobile ? "80px 20px 60px" : "110px 40px 80px", textAlign: "center", position: "relative", overflow: "hidden" }}>
        {/* Animated background blobs */}
        <div style={{ position: "absolute", top: "20%", left: "10%", width: 400, height: 400, background: "radial-gradient(circle, rgba(99,102,241,0.12) 0%, transparent 70%)", pointerEvents: "none", animation: "pulse 4s ease-in-out infinite" }} />
        <div style={{ position: "absolute", bottom: "10%", right: "10%", width: 300, height: 300, background: "radial-gradient(circle, rgba(139,92,246,0.1) 0%, transparent 70%)", pointerEvents: "none", animation: "pulse 5s ease-in-out infinite 1s" }} />

        <div className="hero-content">

          <h1 style={{ fontSize: isMobile ? "clamp(36px,8vw,52px)" : "clamp(48px,6vw,80px)", fontWeight: 900, lineHeight: 1.05, letterSpacing: "-2px", marginBottom: 24, maxWidth: 820, margin: "0 auto 24px" }}>
            Every Event in Kenya,<br />
            <span style={{ background: "linear-gradient(90deg, #818CF8, #C084FC, #F472B6)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              One Platform
            </span>
          </h1>

          <p style={{ fontSize: isMobile ? 16 : 18, color: T.textSub, maxWidth: 540, margin: "0 auto 40px", lineHeight: 1.75 }}>
            Concerts, conferences, workshops, festivals and more — find, book and pay via M-Pesa in under 60 seconds.
          </p>

          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <button onClick={() => document.getElementById("events-section").scrollIntoView({ behavior: "smooth" })} style={{ background: "linear-gradient(135deg,#6366F1,#8B5CF6)", color: "#fff", border: "none", padding: "14px 32px", borderRadius: 12, fontWeight: 700, cursor: "pointer", fontSize: 16, boxShadow: "0 8px 32px rgba(99,102,241,0.35)" }}>
              Browse Events →
            </button>
            <button onClick={() => onOpenAuth("signup")} style={{ background: T.inputBg, color: T.text, border: `1px solid ${T.inputBorder}`, padding: "14px 32px", borderRadius: 12, fontWeight: 600, cursor: "pointer", fontSize: 16 }}>
              Host an Event
            </button>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section style={{ padding: isMobile ? "50px 20px" : "70px 40px", background: T.sectionAlt, borderTop: `1px solid ${T.surfaceBorder}`, borderBottom: `1px solid ${T.surfaceBorder}` }}>
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 48 }}>
            <h2 style={{ fontSize: isMobile ? 24 : 30, fontWeight: 800, letterSpacing: "-0.5px", color: T.text, marginBottom: 10 }}>Book in 3 Simple Steps</h2>
            <p style={{ color: T.textSub, fontSize: 15 }}>No app download needed. Works on any phone.</p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(3, 1fr)", gap: 20 }}>
            {HOW_IT_WORKS.map(({ step, icon, title, desc }, i) => (
              <div key={step} style={{ background: T.surface, border: `1px solid ${T.surfaceBorder}`, borderRadius: 16, padding: "28px 24px", position: "relative", overflow: "hidden" }}>
                <div style={{ position: "absolute", top: 16, right: 20, fontSize: 40, fontWeight: 900, color: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)", lineHeight: 1 }}>{step}</div>
                <div style={{ fontSize: 36, marginBottom: 16 }}>{icon}</div>
                <h3 style={{ fontWeight: 700, fontSize: 16, marginBottom: 8, color: T.text }}>{title}</h3>
                <p style={{ fontSize: 13, color: T.textSub, lineHeight: 1.65, margin: 0 }}>{desc}</p>
                {i < HOW_IT_WORKS.length - 1 && !isMobile && (
                  <div style={{ position: "absolute", right: -14, top: "50%", transform: "translateY(-50%)", fontSize: 20, color: T.textMuted, zIndex: 1 }}>→</div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* EVENT TYPES */}
      <section style={{ padding: isMobile ? "50px 20px" : "70px 40px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 40 }}>
            <h2 style={{ fontSize: isMobile ? 24 : 30, fontWeight: 800, letterSpacing: "-0.5px", color: T.text, marginBottom: 10 }}>Every Type of Event</h2>
            <p style={{ color: T.textSub, fontSize: 15 }}>Click any category to explore events</p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "repeat(2,1fr)" : "repeat(6, 1fr)", gap: 12 }}>
            {EVENT_TYPES_SHOWCASE.map(({ icon, type, desc, filter: f }) => (
              <div key={type}
                onClick={() => { setFilter(f); document.getElementById("events-section").scrollIntoView({ behavior: "smooth" }); }}
                style={{ background: T.surface, border: `1px solid ${T.surfaceBorder}`, borderRadius: 14, padding: "20px 12px", textAlign: "center", cursor: "pointer", transition: "all 0.2s" }}
                onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-4px)"; e.currentTarget.style.borderColor = "rgba(99,102,241,0.5)"; e.currentTarget.style.boxShadow = "0 12px 32px rgba(99,102,241,0.15)"; }}
                onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.borderColor = T.surfaceBorder; e.currentTarget.style.boxShadow = "none"; }}>
                <div style={{ fontSize: 30, marginBottom: 8 }}>{icon}</div>
                <div style={{ fontWeight: 700, fontSize: 13, color: T.text, marginBottom: 4 }}>{type}</div>
                <div style={{ fontSize: 11, color: T.textSub, lineHeight: 1.5 }}>{desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURED */}
      {featured.length > 0 && (
        <section style={{ padding: isMobile ? "10px 20px 50px" : "10px 40px 60px", maxWidth: 1200, margin: "0 auto" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28 }}>
            <h2 style={{ fontSize: isMobile ? 22 : 28, fontWeight: 800, letterSpacing: "-0.5px", color: T.text }}>🔥 Featured Events</h2>
            <button onClick={() => document.getElementById("events-section").scrollIntoView({ behavior: "smooth" })} style={{ background: "none", border: "none", color: "#A5B4FC", cursor: "pointer", fontSize: 14, fontWeight: 600 }}>
              See all →
            </button>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fill,minmax(340px,1fr))", gap: 20 }}>
            {featured.map(ev => (
              <EventCard key={ev.id} event={ev} typeColors={typeColors} onBook={() => openEventDetail(ev)} featured T={T} />
            ))}
          </div>
        </section>
      )}

      {/* ALL EVENTS */}
      <section id="events-section" style={{ padding: isMobile ? "40px 20px" : "60px 40px", maxWidth: 1200, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24, flexWrap: "wrap", gap: 16 }}>
          <h2 style={{ fontSize: isMobile ? 22 : 28, fontWeight: 800, letterSpacing: "-0.5px", color: T.text }}>All Events</h2>
          <input
            placeholder="🔍  Search events or venues..."
            value={search} onChange={e => setSearch(e.target.value)}
            style={{ ...inputStyle, width: isMobile ? "100%" : 280, padding: "10px 16px" }}
          />
        </div>

        <div style={{ display: "flex", gap: 8, marginBottom: 28, flexWrap: "wrap" }}>
          {categories.map(cat => (
            <button key={cat} onClick={() => setFilter(cat)} style={{
              background: filter === cat ? "linear-gradient(135deg,#6366F1,#8B5CF6)" : T.inputBg,
              color: filter === cat ? "#fff" : T.textSub,
              border: "1px solid " + (filter === cat ? "transparent" : T.inputBorder),
              padding: "7px 16px", borderRadius: 20, fontSize: 13, fontWeight: 600, cursor: "pointer", transition: "all 0.2s"
            }}>
              {cat}
            </button>
          ))}
        </div>

        {loadingEvents ? (
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fill,minmax(300px,1fr))", gap: 20 }}>
            {[1, 2, 3, 4, 5, 6].map(i => <SkeletonCard key={i} T={T} />)}
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: "80px 0", color: T.textMuted }}>
            <div style={{ fontSize: 52, marginBottom: 16 }}>🎭</div>
            <p style={{ fontSize: 18, fontWeight: 600, color: T.text, marginBottom: 8 }}>No events found</p>
            <p style={{ fontSize: 14 }}>Try a different category or search term</p>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fill,minmax(300px,1fr))", gap: 20 }}>
            {filtered.map(ev => (
              <EventCard key={ev.id} event={ev} typeColors={typeColors} onBook={() => openEventDetail(ev)} T={T} />
            ))}
          </div>
        )}
      </section>

      {/* WHY EVENTFLOW */}
      <section style={{ padding: isMobile ? "50px 20px" : "70px 40px", background: T.sectionAlt, borderTop: `1px solid ${T.surfaceBorder}` }}>
        <div style={{ maxWidth: 1000, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 48 }}>
            <h2 style={{ fontSize: isMobile ? 24 : 30, fontWeight: 800, letterSpacing: "-0.5px", color: T.text, marginBottom: 10 }}>Built for Kenya</h2>
            <p style={{ color: T.textSub, fontSize: 15, maxWidth: 460, margin: "0 auto" }}>Everything you need, nothing you don't.</p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(2, 1fr)", gap: 16 }}>
            {[
              { icon: "📱", title: "M-Pesa Native Payments", desc: "No bank card required. Every Kenyan with an M-Pesa account can book and pay instantly." },
              { icon: "🎟", title: "All Event Categories", desc: "One platform for concerts, conferences, workshops, festivals, sports and networking events." },
              { icon: "⚡", title: "Instant SMS Confirmation", desc: "Your booking confirmation and ticket details arrive via SMS within seconds of payment." },
              { icon: "🎛", title: "Powerful Organizer Tools", desc: "Create events, track bookings, monitor revenue and manage attendees from one dashboard." },
            ].map((f, i) => (
              <div key={i} style={{ background: T.surface, border: `1px solid ${T.surfaceBorder}`, borderRadius: 16, padding: "24px", display: "flex", gap: 16, alignItems: "flex-start" }}>
                <div style={{ fontSize: 32, flexShrink: 0 }}>{f.icon}</div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 6, color: T.text }}>{f.title}</div>
                  <div style={{ fontSize: 13, color: T.textSub, lineHeight: 1.65 }}>{f.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA BANNER */}
      <section style={{ padding: isMobile ? "50px 20px" : "70px 40px", textAlign: "center" }}>
        <div style={{ maxWidth: 600, margin: "0 auto" }}>
          <div style={{ background: "linear-gradient(135deg, rgba(99,102,241,0.15), rgba(139,92,246,0.15))", border: "1px solid rgba(99,102,241,0.3)", borderRadius: 24, padding: isMobile ? "36px 24px" : "52px 48px" }}>
            <div style={{ fontSize: 40, marginBottom: 16 }}>🎪</div>
            <h2 style={{ fontSize: isMobile ? 24 : 30, fontWeight: 800, marginBottom: 12, color: T.text, letterSpacing: "-0.5px" }}>Ready to Host Your Event?</h2>
            <p style={{ color: T.textSub, marginBottom: 28, lineHeight: 1.7, fontSize: 15 }}>
              Create your event in minutes. Manage bookings, track revenue and send SMS reminders — all from your dashboard.
            </p>
            <button onClick={() => onOpenAuth("signup")} style={{ background: "linear-gradient(135deg,#6366F1,#8B5CF6)", color: "#fff", border: "none", padding: "14px 36px", borderRadius: 12, fontWeight: 700, cursor: "pointer", fontSize: 16, boxShadow: "0 8px 32px rgba(99,102,241,0.35)" }}>
              Create Free Account →
            </button>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{ borderTop: `1px solid ${T.surfaceBorder}`, padding: isMobile ? "40px 20px" : "48px 40px", background: T.sectionAlt }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "2fr 1fr 1fr 1fr", gap: 32, marginBottom: 40 }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                <div style={{ width: 28, height: 28, background: "linear-gradient(135deg,#6366F1,#8B5CF6)", borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>⚡</div>
                <span style={{ fontSize: 18, fontWeight: 800, color: "#A5B4FC" }}>EventFlow</span>
              </div>
              <p style={{ color: T.textSub, fontSize: 13, lineHeight: 1.7, maxWidth: 280, margin: 0 }}>
                Discover and book events across Kenya — concerts, conferences, workshops, festivals and more.
              </p>
            </div>
            {[
              { title: "Explore", links: ["All Events", "Concerts", "Conferences", "Workshops", "Festivals"] },
              { title: "Organizers", links: ["Create Event", "Dashboard", "Pricing", "Help Center"] },
              { title: "Company", links: ["About Us", "Contact", "Privacy Policy", "Terms of Use"] },
            ].map(col => (
              <div key={col.title}>
                <div style={{ fontWeight: 700, fontSize: 13, color: T.text, marginBottom: 14, letterSpacing: 0.5 }}>{col.title}</div>
                {col.links.map(link => (
                  <div key={link} style={{ color: T.textSub, fontSize: 13, marginBottom: 8, cursor: "pointer" }}
                    onMouseEnter={e => e.target.style.color = "#A5B4FC"}
                    onMouseLeave={e => e.target.style.color = T.textSub}>
                    {link}
                  </div>
                ))}
              </div>
            ))}
          </div>
          <div style={{ borderTop: `1px solid ${T.surfaceBorder}`, paddingTop: 24, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
            <p style={{ color: T.textMuted, fontSize: 13, margin: 0 }}>© 2025 EventFlow. Built for Kenya.</p>
            <div style={{ display: "flex", gap: 16 }}>
              {["Twitter/X", "Instagram", "LinkedIn"].map(s => (
                <span key={s} style={{ color: T.textMuted, fontSize: 12, cursor: "pointer" }}
                  onMouseEnter={e => e.target.style.color = "#A5B4FC"}
                  onMouseLeave={e => e.target.style.color = T.textMuted}>
                  {s}
                </span>
              ))}
            </div>
          </div>
        </div>
      </footer>

      {/* EVENT DETAIL + ORGANIZER PROFILE MODAL */}
      {selectedEvent && !bookingEvent && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", backdropFilter: "blur(8px)", zIndex: 1000, display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "24px 16px", overflowY: "auto" }}>
          <div style={{ background: T.modalBg, border: `1px solid ${T.surfaceBorder}`, borderRadius: 20, width: "100%", maxWidth: 680, marginTop: 16 }}>

            {/* Event banner */}
            <div style={{ height: 220, background: `linear-gradient(135deg,${typeColors[selectedEvent.type] || "#6366F1"}44,${typeColors[selectedEvent.type] || "#8B5CF6"}66)`, borderRadius: "20px 20px 0 0", position: "relative", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
              {selectedEvent.image
                ? <img src={selectedEvent.image} alt={selectedEvent.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                : <span style={{ fontSize: 72 }}>{selectedEvent.type === "Concert" ? "🎵" : selectedEvent.type === "Conference" ? "🎤" : selectedEvent.type === "Workshop" ? "🛠" : selectedEvent.type === "Festival" ? "🎪" : selectedEvent.type === "Networking" ? "🤝" : "🏃"}</span>
              }
              <button onClick={() => { setSelectedEvent(null); setOrgProfile(null); }} style={{ position: "absolute", top: 16, right: 16, background: "rgba(0,0,0,0.5)", border: "none", color: "#fff", width: 36, height: 36, borderRadius: 8, cursor: "pointer", fontSize: 18, display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
              <div style={{ position: "absolute", top: 16, left: 16, background: typeColors[selectedEvent.type] || "#6366F1", color: "#fff", padding: "4px 12px", borderRadius: 20, fontSize: 12, fontWeight: 700 }}>{selectedEvent.type}</div>
            </div>

            <div style={{ padding: isMobile ? 20 : 32 }}>
              {/* Event info */}
              <h2 style={{ fontSize: isMobile ? 20 : 26, fontWeight: 800, color: T.text, marginBottom: 8, lineHeight: 1.2 }}>{selectedEvent.title}</h2>

              <div style={{ display: "flex", gap: 20, marginBottom: 16, flexWrap: "wrap" }}>
                <div style={{ fontSize: 13, color: T.textSub }}>📅 {selectedEvent.date} · {selectedEvent.time}</div>
                <div style={{ fontSize: 13, color: T.textSub }}>📍 {selectedEvent.venue}</div>
              </div>

              <p style={{ fontSize: 14, color: T.textSub, lineHeight: 1.7, marginBottom: 20 }}>{selectedEvent.description}</p>

              {/* Ticket info */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "rgba(99,102,241,0.08)", border: "1px solid rgba(99,102,241,0.2)", borderRadius: 12, padding: "16px 20px", marginBottom: 24 }}>
                <div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: "#A5B4FC" }}>{selectedEvent.price === 0 ? "FREE" : `KES ${selectedEvent.price?.toLocaleString()}`}</div>
                  <div style={{ fontSize: 12, color: T.textSub }}>per ticket · {selectedEvent.capacity - (selectedEvent.booked || 0)} spots left</div>
                  <CountdownTimer date={selectedEvent.date} />
                </div>
                <button
                  onClick={() => { setBookingEvent(selectedEvent); setBookingStep("form"); }}
                  disabled={(selectedEvent.capacity - (selectedEvent.booked || 0)) <= 0}
                  style={{ background: "linear-gradient(135deg,#6366F1,#8B5CF6)", color: "#fff", border: "none", padding: "12px 28px", borderRadius: 12, fontWeight: 700, cursor: "pointer", fontSize: 15, boxShadow: "0 4px 16px rgba(99,102,241,0.3)" }}>
                  Book Now →
                </button>
              </div>

              {/* Organizer profile */}
              <div style={{ borderTop: `1px solid ${T.surfaceBorder}`, paddingTop: 24 }}>
                <div style={{ fontSize: 12, color: T.textMuted, fontWeight: 700, letterSpacing: 1, marginBottom: 16 }}>ORGANISED BY</div>

                {orgLoading ? (
                  <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                    <div style={{ width: 52, height: 52, borderRadius: 12, background: T.inputBg, animation: "pulse 1.5s infinite" }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ height: 14, background: T.inputBg, borderRadius: 4, marginBottom: 8, width: "60%", animation: "pulse 1.5s infinite" }} />
                      <div style={{ height: 10, background: T.inputBg, borderRadius: 4, width: "80%", animation: "pulse 1.5s infinite" }} />
                    </div>
                  </div>
                ) : orgProfile ? (
                  <>
                    {/* Org header */}
                    <div style={{ display: "flex", gap: 14, alignItems: "center", marginBottom: 16 }}>
                      {orgProfile.organizer?.org_logo ? (
                        <img src={orgProfile.organizer.org_logo} alt="org" style={{ width: 52, height: 52, borderRadius: 12, objectFit: "cover", border: `1px solid ${T.surfaceBorder}` }} onError={e => e.target.style.display = "none"} />
                      ) : (
                        <div style={{ width: 52, height: 52, background: "linear-gradient(135deg,#6366F1,#8B5CF6)", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, fontWeight: 800, color: "#fff", flexShrink: 0 }}>
                          {(orgProfile.organizer?.display_name || "O")[0].toUpperCase()}
                        </div>
                      )}
                      <div>
                        <div style={{ fontSize: 17, fontWeight: 800, color: T.text }}>{orgProfile.organizer?.display_name}</div>
                        <div style={{ fontSize: 12, color: T.textSub, marginTop: 2 }}>Event Organizer · Kenya</div>
                        {orgProfile.organizer?.org_website && (
                          <a href={orgProfile.organizer.org_website} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: "#A5B4FC", textDecoration: "none" }}>🌐 {orgProfile.organizer.org_website}</a>
                        )}
                      </div>
                    </div>

                    {orgProfile.organizer?.org_description && (
                      <p style={{ fontSize: 13, color: T.textSub, lineHeight: 1.65, marginBottom: 16 }}>{orgProfile.organizer.org_description}</p>
                    )}

                    {/* Org stats */}
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10, marginBottom: 20 }}>
                      {[
                        { label: "Events", val: orgProfile.stats?.total_events || 0 },
                        { label: "Bookings", val: (orgProfile.stats?.total_bookings || 0).toLocaleString() },
                        { label: "Avg Fill", val: `${orgProfile.stats?.avg_fill_rate || 0}%` },
                        { label: "Upcoming", val: orgProfile.stats?.upcoming_count || 0 },
                      ].map(({ label, val }) => (
                        <div key={label} style={{ background: T.inputBg, borderRadius: 10, padding: "12px 8px", textAlign: "center" }}>
                          <div style={{ fontSize: 17, fontWeight: 800, color: "#A5B4FC" }}>{val}</div>
                          <div style={{ fontSize: 10, color: T.textMuted, fontWeight: 600 }}>{label}</div>
                        </div>
                      ))}
                    </div>

                    {/* Past events */}
                    {orgProfile.past_events?.length > 0 && (
                      <div style={{ marginBottom: 16 }}>
                        <div style={{ fontSize: 12, color: T.textMuted, fontWeight: 700, letterSpacing: 0.5, marginBottom: 10 }}>PAST EVENTS</div>
                        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                          {orgProfile.past_events.slice(0, 3).map(ev => (
                            <div key={ev.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: T.inputBg, borderRadius: 10, padding: "10px 14px" }}>
                              <div>
                                <div style={{ fontSize: 13, fontWeight: 600, color: T.text }}>{ev.title}</div>
                                <div style={{ fontSize: 11, color: T.textSub }}>{ev.date} · {ev.venue}</div>
                              </div>
                              <div style={{ textAlign: "right" }}>
                                <div style={{ fontSize: 12, fontWeight: 700, color: ev.fill_rate >= 80 ? "#10B981" : "#F59E0B" }}>{ev.fill_rate}% full</div>
                                <div style={{ fontSize: 11, color: T.textMuted }}>{ev.booked} attended</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Upcoming events by same organizer */}
                    {orgProfile.upcoming_events?.filter(e => e.id !== selectedEvent.id).length > 0 && (
                      <div>
                        <div style={{ fontSize: 12, color: T.textMuted, fontWeight: 700, letterSpacing: 0.5, marginBottom: 10 }}>MORE UPCOMING EVENTS</div>
                        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                          {orgProfile.upcoming_events.filter(e => e.id !== selectedEvent.id).slice(0, 3).map(ev => {
                            const spots = ev.capacity - (ev.booked || 0);
                            return (
                              <div key={ev.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: T.inputBg, borderRadius: 10, padding: "10px 14px", cursor: "pointer" }}
                                onClick={() => openEventDetail(ev)}>
                                <div>
                                  <div style={{ fontSize: 13, fontWeight: 600, color: T.text }}>{ev.title}</div>
                                  <div style={{ fontSize: 11, color: T.textSub }}>{ev.date} · {ev.venue}</div>
                                </div>
                                <div style={{ textAlign: "right" }}>
                                  <div style={{ fontSize: 13, fontWeight: 800, color: "#A5B4FC" }}>{ev.price === 0 ? "FREE" : `KES ${ev.price?.toLocaleString()}`}</div>
                                  <div style={{ fontSize: 11, color: spots <= 10 ? "#EF4444" : T.textMuted }}>{spots} left</div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div style={{ fontSize: 13, color: T.textSub }}>Organizer info unavailable.</div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* BOOKING MODAL */}
      {bookingEvent && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", backdropFilter: "blur(8px)", zIndex: 1100, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div style={{ background: T.modalBg, border: `1px solid ${T.surfaceBorder}`, borderRadius: 20, padding: isMobile ? 24 : 40, width: "100%", maxWidth: 480, maxHeight: "90vh", overflowY: "auto" }}>

            {bookingStep === "form" && (
              <>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
                  <div>
                    <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 4, color: T.text }}>Book Tickets</h2>
                    <p style={{ color: "#8B5CF6", fontWeight: 600, fontSize: 14, margin: 0 }}>{bookingEvent.title}</p>
                  </div>
                  <button onClick={closeBooking} style={{ background: "none", border: "none", color: T.textMuted, cursor: "pointer", fontSize: 22 }}>x</button>
                </div>

                {/* TIER SELECTOR — always visible */}
                <div style={{ marginBottom: 20 }}>
                  <label style={{ display: "block", fontSize: 13, color: T.textSub, marginBottom: 10, fontWeight: 700 }}>Select Ticket Type</label>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {getEffectiveTiers(bookingEvent).map(tier => {
                      const COLORS = { early_bird: "#10B981", standard: "#6366F1", vip: "#F59E0B", vvip: "#EC4899", free: "#64748B" };
                      const color = COLORS[tier.tier_type] || "#6366F1";
                      const isSelected = selectedTier?.id === tier.id;
                      const soldOut = (tier.spots_left ?? 0) <= 0;
                      return (
                        <div key={tier.id}
                          onClick={() => !soldOut && setSelectedTier(tier)}
                          style={{ border: `2px solid ${isSelected ? color : T.inputBorder}`, background: isSelected ? color + "18" : T.inputBg, borderRadius: 12, padding: "12px 16px", cursor: soldOut ? "not-allowed" : "pointer", opacity: soldOut ? 0.5 : 1, transition: "all 0.15s" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                              <div style={{ width: 16, height: 16, borderRadius: "50%", border: `2px solid ${soldOut ? T.textMuted : color}`, background: isSelected ? color : "transparent", flexShrink: 0 }} />
                              <div>
                                <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                                  <span style={{ fontWeight: 700, fontSize: 14, color: T.text }}>{tier.name}</span>
                                  <span style={{ background: color + "22", color, padding: "1px 8px", borderRadius: 20, fontSize: 10, fontWeight: 700 }}>{tier.tier_type.replace("_", " ").toUpperCase()}</span>
                                  {soldOut && <span style={{ background: "rgba(239,68,68,0.15)", color: "#EF4444", padding: "1px 8px", borderRadius: 20, fontSize: 10, fontWeight: 700 }}>SOLD OUT</span>}
                                </div>
                                {tier.description && <div style={{ fontSize: 11, color: T.textSub, marginTop: 2 }}>{tier.description}</div>}
                                {!soldOut && <div style={{ fontSize: 11, color: T.textMuted, marginTop: 1 }}>{tier.spots_left} spots left</div>}
                              </div>
                            </div>
                            <div style={{ fontWeight: 800, fontSize: 16, color: soldOut ? T.textMuted : color, flexShrink: 0 }}>
                              {Number(tier.price) === 0 ? "FREE" : `KES ${Number(tier.price).toLocaleString()}`}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Attendee details */}
                {[["Full Name", "name", "text", "John Doe"], ["Phone (M-Pesa)", "phone", "tel", "0712345678"], ["Email", "email", "email", "john@email.com"]].map(([label, field, type, ph]) => (
                  <div key={field} style={{ marginBottom: 14 }}>
                    <label style={{ display: "block", fontSize: 13, color: T.textSub, marginBottom: 6, fontWeight: 500 }}>{label}</label>
                    <input type={type} placeholder={ph} value={bookingForm[field]} onChange={e => setBookingForm(p => ({ ...p, [field]: e.target.value }))} style={inputStyle} />
                  </div>
                ))}

                <div style={{ marginBottom: 22 }}>
                  <label style={{ display: "block", fontSize: 13, color: T.textSub, marginBottom: 6, fontWeight: 500 }}>Number of Tickets</label>
                  <input type="number" min="1" max="10" value={bookingForm.tickets} onChange={e => setBookingForm(p => ({ ...p, tickets: parseInt(e.target.value) || 1 }))} style={inputStyle} />
                  {selectedTier && Number(selectedTier.price) > 0 && (
                    <p style={{ fontSize: 14, color: "#A5B4FC", marginTop: 8, fontWeight: 700 }}>
                      {selectedTier.name} x {bookingForm.tickets} = KES {(Number(selectedTier.price) * bookingForm.tickets).toLocaleString()}
                    </p>
                  )}
                </div>

                <button onClick={handleBook} style={{ width: "100%", background: "linear-gradient(135deg,#6366F1,#8B5CF6)", color: "#fff", border: "none", padding: "14px", borderRadius: 12, fontWeight: 700, cursor: "pointer", fontSize: 16 }}>
                  {selectedTier && Number(selectedTier.price) === 0 ? "Reserve Free Ticket" : "Proceed to M-Pesa Payment"}
                </button>
              </>
            )}

            {bookingStep === "payment" && (
              <>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
                  <h2 style={{ fontSize: 22, fontWeight: 800, color: T.text }}>M-Pesa Payment</h2>
                  <button onClick={closeBooking} style={{ background: "none", border: "none", color: T.textMuted, cursor: "pointer", fontSize: 22 }}>✕</button>
                </div>
                <div style={{ background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.25)", borderRadius: 12, padding: 20, marginBottom: 24 }}>
                  <div style={{ fontSize: 28, marginBottom: 8, textAlign: "center" }}>📱</div>
                  <p style={{ fontSize: 14, color: T.textSub, textAlign: "center", lineHeight: 1.8, margin: 0 }}>
                    <strong style={{ color: "#10B981" }}>Step 1:</strong> M-Pesa → Lipa na M-Pesa → Pay Bill<br />
                    <strong style={{ color: "#10B981" }}>Business No:</strong> 123456<br />
                    <strong style={{ color: "#10B981" }}>Account:</strong> {bookingEvent.id}-{bookingForm.phone}<br />
                    <strong style={{ color: "#10B981" }}>Ticket:</strong> {selectedTier ? selectedTier.name : "Standard"}<br />
                    <strong style={{ color: "#10B981" }}>Amount:</strong> KES {(() => { const unit = selectedTier ? Number(selectedTier.price) : Number(bookingEvent.price); return (unit * bookingForm.tickets).toLocaleString(); })()}
                  </p>
                </div>
                <div style={{ marginBottom: 24 }}>
                  <label style={{ display: "block", fontSize: 13, color: T.textSub, marginBottom: 6, fontWeight: 500 }}>Enter M-Pesa Confirmation Code</label>
                  <input placeholder="e.g. QKL4XY8Z99" value={mpesaCode} onChange={e => setMpesaCode(e.target.value.toUpperCase())} style={{ ...inputStyle, fontFamily: "monospace", letterSpacing: 2, fontSize: 15 }} />
                </div>
                <button onClick={handleMpesaPayment} disabled={loadingBooking} style={{ width: "100%", background: "linear-gradient(135deg,#10B981,#059669)", color: "#fff", border: "none", padding: "14px", borderRadius: 12, fontWeight: 700, cursor: "pointer", fontSize: 16, opacity: loadingBooking ? 0.7 : 1 }}>
                  {loadingBooking ? "Verifying..." : "Confirm Booking ✓"}
                </button>
              </>
            )}

            {bookingStep === "success" && (
              <div style={{ textAlign: "center", padding: "20px 0" }}>
                <div style={{ fontSize: 60, marginBottom: 12 }}>🎉</div>
                <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 8, color: T.text }}>Booking Confirmed!</h2>
                <p style={{ color: T.textSub, marginBottom: 4, lineHeight: 1.7, fontSize: 14 }}>
                  <strong style={{ color: "#A5B4FC" }}>{bookingEvent.title}</strong>
                </p>
                {selectedTier && (
                  <div style={{ display: "inline-block", background: "rgba(99,102,241,0.15)", border: "1px solid rgba(99,102,241,0.3)", color: "#A5B4FC", padding: "3px 14px", borderRadius: 20, fontSize: 12, fontWeight: 700, marginBottom: 8 }}>
                    {selectedTier.name} Ticket
                  </div>
                )}
                <p style={{ color: "#10B981", fontSize: 13, fontWeight: 600, marginBottom: 24 }}>
                  📱 SMS confirmation sent to {bookingForm.phone}
                </p>

                {/* Ticket preview mini card */}
                {generatedTicket && (
                  <div style={{ background: "linear-gradient(135deg,rgba(99,102,241,0.1),rgba(139,92,246,0.1))", border: "1px solid rgba(99,102,241,0.3)", borderRadius: 14, padding: "16px 20px", marginBottom: 20, textAlign: "left" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                      <div style={{ fontSize: 11, color: T.textMuted, fontWeight: 700, letterSpacing: 0.8 }}>YOUR BOOKING CODE</div>
                      <div style={{ fontSize: 11, color: T.textMuted }}>Show at entrance</div>
                    </div>
                    <div style={{ fontSize: 24, fontWeight: 900, letterSpacing: 3, fontFamily: "monospace", color: "#A5B4FC", marginBottom: 12 }}>
                      {generatedTicket.booking_code}
                    </div>
                    <div style={{ fontSize: 12, color: T.textSub }}>📅 {generatedTicket.event_date} · {generatedTicket.event_time}</div>
                    <div style={{ fontSize: 12, color: T.textSub }}>📍 {generatedTicket.event_venue}</div>
                  </div>
                )}

                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {generatedTicket && (
                    <button
                      onClick={() => { closeBooking(); setTimeout(() => setGeneratedTicket(generatedTicket), 50); }}
                      style={{ width: "100%", background: "linear-gradient(135deg,#6366F1,#8B5CF6)", color: "#fff", border: "none", padding: "13px", borderRadius: 12, fontWeight: 700, cursor: "pointer", fontSize: 15 }}>
                      🎫 View Full Digital Ticket
                    </button>
                  )}
                  <button onClick={closeBooking} style={{ width: "100%", background: T.inputBg, border: `1px solid ${T.inputBorder}`, color: T.textSub, padding: "11px", borderRadius: 12, fontWeight: 600, cursor: "pointer", fontSize: 14 }}>
                    Done
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      {/* DIGITAL TICKET OVERLAY */}
      {generatedTicket && !bookingEvent && (
        <DigitalTicket
          ticket={generatedTicket}
          onClose={() => setGeneratedTicket(null)}
        />
      )}
    </div>
  );
function EventCard({ event, typeColors, onBook, featured, T }) {
  const spotsLeft = event.capacity - (event.booked || 0);
  const pct = Math.round(((event.booked || 0) / event.capacity) * 100);
  const isSoldOut = spotsLeft <= 0;
  const isAlmostFull = pct >= 80 && !isSoldOut;

  return (
    <div
      style={{ background: T.surface, border: `1px solid ${T.surfaceBorder}`, borderRadius: 16, overflow: "hidden", transition: "transform 0.2s, box-shadow 0.2s", cursor: "pointer", display: "flex", flexDirection: "column" }}
      onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-4px)"; e.currentTarget.style.boxShadow = "0 16px 48px rgba(99,102,241,0.18)"; }}
      onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "none"; }}>

      <div style={{ height: 160, background: `linear-gradient(135deg, ${typeColors[event.type] || "#6366F1"}33, ${typeColors[event.type] || "#6366F1"}55)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 48, position: "relative", flexShrink: 0 }}>
        {event.image
          ? <img src={event.image} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          : <span>{event.type === "Concert" ? "🎵" : event.type === "Conference" ? "🎤" : event.type === "Workshop" ? "🛠" : event.type === "Festival" ? "🎪" : event.type === "Networking" ? "🤝" : "🏃"}</span>
        }
        <div style={{ position: "absolute", top: 12, left: 12, background: typeColors[event.type] || "#6366F1", color: "#fff", padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700 }}>
          {event.type}
        </div>
        <div style={{ position: "absolute", top: 12, right: 12, display: "flex", flexDirection: "column", gap: 4, alignItems: "flex-end" }}>
          {featured && <span style={{ background: "#F59E0B", color: "#000", padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 800 }}>FEATURED</span>}
          {isSoldOut && <span style={{ background: "#EF4444", color: "#fff", padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 800 }}>SOLD OUT</span>}
          {isAlmostFull && <span style={{ background: "rgba(239,68,68,0.85)", color: "#fff", padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700 }}>ALMOST FULL</span>}
        </div>
      </div>

      <div style={{ padding: "18px 20px", flex: 1, display: "flex", flexDirection: "column" }}>
        <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 6, lineHeight: 1.35, color: T.text }}>{event.title}</h3>
        <p style={{ fontSize: 12, color: T.textMuted, marginBottom: 10, lineHeight: 1.5, flex: 1 }}>{event.description?.substring(0, 75)}...</p>

        <div style={{ fontSize: 12, color: T.textSub, marginBottom: 3 }}>📅 {event.date} · {event.time}</div>
        <div style={{ fontSize: 12, color: T.textSub, marginBottom: 8 }}>📍 {event.venue}</div>

        <CountdownTimer date={event.date} />

        <div style={{ background: T.inputBg, borderRadius: 4, height: 4, marginTop: 12, marginBottom: 4 }}>
          <div style={{ background: pct > 80 ? "#EF4444" : pct > 50 ? "#F59E0B" : "#6366F1", width: `${pct}%`, height: "100%", borderRadius: 4, transition: "width 0.5s" }} />
        </div>
        <p style={{ fontSize: 11, color: T.textMuted, marginBottom: 14 }}>{spotsLeft > 0 ? `${spotsLeft} spots left (${pct}% full)` : "No spots available"}</p>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 18, fontWeight: 800, color: "#A5B4FC" }}>
            {event.price === 0 ? "FREE" : `KES ${event.price?.toLocaleString()}`}
          </span>
          <button onClick={onBook} disabled={isSoldOut} style={{
            background: isSoldOut ? T.inputBg : "linear-gradient(135deg,#6366F1,#8B5CF6)",
            color: isSoldOut ? T.textMuted : "#fff",
            border: "none", padding: "8px 18px", borderRadius: 8, fontWeight: 700,
            cursor: isSoldOut ? "not-allowed" : "pointer", fontSize: 13, transition: "opacity 0.2s"
          }}>
            {isSoldOut ? "Sold Out" : "Book Now"}
          </button>
        </div>
      </div>
    </div>
  );
}
}