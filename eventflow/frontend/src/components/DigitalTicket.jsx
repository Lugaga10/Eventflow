// src/components/DigitalTicket.jsx
import { useContext, useRef } from "react";
import { ThemeContext } from "../App";

const TIER_COLORS = {
  early_bird: { bg: "#10B981", label: "EARLY BIRD",  gradient: "linear-gradient(135deg,#10B981,#059669)" },
  standard:   { bg: "#6366F1", label: "REGULAR",     gradient: "linear-gradient(135deg,#6366F1,#4F46E5)" },
  vip:        { bg: "#F59E0B", label: "VIP",         gradient: "linear-gradient(135deg,#F59E0B,#D97706)" },
  vvip:       { bg: "#EC4899", label: "VVIP",        gradient: "linear-gradient(135deg,#EC4899,#BE185D)" },
  free:       { bg: "#64748B", label: "FREE",        gradient: "linear-gradient(135deg,#64748B,#475569)" },
};

const EVENT_EMOJIS = {
  Conference: "🎤", Concert: "🎵", Workshop: "🛠",
  Festival: "🎪", Networking: "🤝", Sports: "🏃", Other: "🎫",
};

function QRCode({ value, size = 120 }) {
  // Uses the free qrserver.com API — works in any browser with internet
  const url = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(value)}&bgcolor=ffffff&color=000000&margin=4`;
  return (
    <img
      src={url}
      alt="QR Code"
      width={size}
      height={size}
      style={{ display: "block", borderRadius: 8 }}
    />
  );
}

export default function DigitalTicket({ ticket, onClose }) {
  const { theme } = useContext(ThemeContext);
  const isDark = theme === "dark";
  const ticketRef = useRef(null);

  // ticket shape:
  // { booking_code, event_title, event_date, event_time, event_venue,
  //   event_type, ticket_tier, tier_type, attendee_name, attendee_email,
  //   tickets, total_amount }

  const tierKey   = ticket.tier_type || "standard";
  const tierStyle = TIER_COLORS[tierKey] || TIER_COLORS.standard;
  const emoji     = EVENT_EMOJIS[ticket.event_type] || "🎫";
  const qrValue   = `EVENTFLOW:${ticket.booking_code}:${ticket.event_title}:${ticket.attendee_name}`;

  const handlePrint = () => {
    const content = ticketRef.current?.innerHTML;
    if (!content) return;
    const w = window.open("", "_blank");
    w.document.write(`
      <!DOCTYPE html><html><head>
      <title>EventFlow Ticket — ${ticket.booking_code}</title>
      <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700;800;900&display=swap" rel="stylesheet">
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Outfit', sans-serif; background: #f8f9ff; display: flex; align-items: center; justify-content: center; min-height: 100vh; padding: 24px; }
        .ticket-wrap { width: 480px; }
        @media print { body { background: white; } }
      </style>
      </head><body><div class="ticket-wrap">${content}</div></body></html>
    `);
    w.document.close();
    setTimeout(() => { w.print(); }, 600);
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.9)", backdropFilter: "blur(12px)", zIndex: 2000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16, overflowY: "auto" }}>
      <div style={{ width: "100%", maxWidth: 480 }}>

        {/* Actions row */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div style={{ color: "#A5B4FC", fontWeight: 700, fontSize: 15 }}>⚡ Your Digital Ticket</div>
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={handlePrint} style={{ background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.2)", color: "#fff", padding: "8px 16px", borderRadius: 8, cursor: "pointer", fontWeight: 600, fontSize: 13 }}>
              🖨 Print / Save PDF
            </button>
            <button onClick={onClose} style={{ background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.2)", color: "#fff", width: 36, height: 36, borderRadius: 8, cursor: "pointer", fontSize: 18 }}>
              ✕
            </button>
          </div>
        </div>

        {/* The ticket itself */}
        <div ref={ticketRef}>
          <div style={{ background: "#fff", borderRadius: "20px 20px 0 0", overflow: "hidden", fontFamily: "'Outfit', sans-serif" }}>

            {/* Top banner */}
            <div style={{ background: tierStyle.gradient, padding: "28px 28px 20px", position: "relative" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                    <div style={{ background: "rgba(255,255,255,0.2)", padding: "3px 12px", borderRadius: 20, fontSize: 11, fontWeight: 800, color: "#fff", letterSpacing: 1 }}>
                      {tierStyle.label}
                    </div>
                    <div style={{ background: "rgba(255,255,255,0.15)", padding: "3px 12px", borderRadius: 20, fontSize: 11, fontWeight: 700, color: "#fff" }}>
                      {ticket.event_type || "EVENT"}
                    </div>
                  </div>
                  <div style={{ fontSize: 24, fontWeight: 900, color: "#fff", lineHeight: 1.15, maxWidth: 280 }}>
                    {ticket.event_title}
                  </div>
                </div>
                <div style={{ fontSize: 52, opacity: 0.8 }}>{emoji}</div>
              </div>
            </div>

            {/* Tear line */}
            <div style={{ background: "#f0f0f8", display: "flex", alignItems: "center", position: "relative", height: 24 }}>
              <div style={{ position: "absolute", left: -12, width: 24, height: 24, background: "#fff", borderRadius: "50%", boxShadow: "inset -4px 0 8px rgba(0,0,0,0.08)" }} />
              <div style={{ flex: 1, borderTop: "2px dashed #D1D5DB", margin: "0 16px" }} />
              <div style={{ position: "absolute", right: -12, width: 24, height: 24, background: "#fff", borderRadius: "50%", boxShadow: "inset 4px 0 8px rgba(0,0,0,0.08)" }} />
            </div>

            {/* Main body */}
            <div style={{ background: "#fff", padding: "20px 28px 28px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px 24px", marginBottom: 20 }}>
                {[
                  ["📅 Date",    ticket.event_date],
                  ["🕐 Time",   ticket.event_time],
                  ["📍 Venue",  ticket.event_venue],
                  ["🎟 Tickets", `${ticket.tickets} × ${tierStyle.label}`],
                  ["👤 Name",   ticket.attendee_name],
                  ["💳 Amount", ticket.total_amount > 0 ? `KES ${Number(ticket.total_amount).toLocaleString()}` : "FREE"],
                ].map(([label, value]) => (
                  <div key={label}>
                    <div style={{ fontSize: 10, color: "#94A3B8", fontWeight: 700, letterSpacing: 0.8, marginBottom: 3 }}>{label}</div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#0F172A" }}>{value}</div>
                  </div>
                ))}
              </div>

              {/* Divider */}
              <div style={{ borderTop: "1px solid #E2E8F0", margin: "16px 0" }} />

              {/* Bottom: QR + Code */}
              <div style={{ display: "flex", gap: 20, alignItems: "center" }}>
                <div style={{ background: "#fff", padding: 6, borderRadius: 12, border: "2px solid #E2E8F0", flexShrink: 0 }}>
                  <QRCode value={qrValue} size={110} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 10, color: "#94A3B8", fontWeight: 700, letterSpacing: 0.8, marginBottom: 6 }}>BOOKING CODE</div>
                  <div style={{ fontSize: 22, fontWeight: 900, color: "#0F172A", letterSpacing: 2, fontFamily: "monospace", background: "#F8F9FF", padding: "8px 14px", borderRadius: 8, border: "1px solid #E2E8F0", display: "inline-block" }}>
                    {ticket.booking_code}
                  </div>
                  <div style={{ fontSize: 11, color: "#64748B", marginTop: 8, lineHeight: 1.5 }}>
                    Present this code or scan the QR at the entrance. This is your valid entry pass.
                  </div>
                  <div style={{ fontSize: 10, color: "#94A3B8", marginTop: 10 }}>
                    Powered by ⚡ EventFlow · eventflow.co.ke
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom stub */}
          <div style={{ background: tierStyle.bg, padding: "10px 28px", borderRadius: "0 0 20px 20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ color: "rgba(255,255,255,0.8)", fontSize: 11, fontWeight: 600 }}>✅ VALID ENTRY PASS</div>
            <div style={{ color: "rgba(255,255,255,0.8)", fontSize: 11, fontWeight: 600 }}>{ticket.event_date}</div>
          </div>
        </div>

        <p style={{ textAlign: "center", color: "rgba(255,255,255,0.4)", fontSize: 12, marginTop: 16 }}>
          A copy has been sent to {ticket.attendee_email} via SMS
        </p>
      </div>
    </div>
  );
}
