import { useState, useEffect } from "react";
import { API_BASE, useTheme } from "../App";

const EVENT_TYPES = ["Conference", "Concert", "Workshop", "Festival", "Networking", "Sports", "Other"];
const CITIES = ["Nairobi", "Mombasa", "Kisumu", "Nakuru", "Eldoret", "Thika", "Nyeri", "Other"];
const TIER_TYPES = ["free", "early_bird", "standard", "vip", "vvip"];
const TIER_LABELS = { free: "Free", early_bird: "Early Bird", standard: "Standard", vip: "VIP", vvip: "VVIP" };
const EMPTY_TIER = { name: "", tier_type: "standard", price: 0, capacity: 50, description: "", is_active: true };
const EMPTY_FORM = { title: "", type: "Conference", date: "", time: "", venue: "", city: "Nairobi", price: 0, capacity: 100, description: "", is_featured: false };

export default function OrganizerEventForm({ token, editingEvent, onClose, onSaved }) {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const [form, setForm] = useState(EMPTY_FORM);
  const [tiers, setTiers] = useState([]);
  const [useTiers, setUseTiers] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("details");

  const T = {
    modal: isDark ? "#12121A" : "#FFFFFF",
    surface: isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)",
    border: isDark ? "rgba(255,255,255,0.09)" : "rgba(0,0,0,0.09)",
    text: isDark ? "#F0F0F5" : "#0F172A",
    textSub: isDark ? "#94A3B8" : "#64748B",
    textMuted: isDark ? "#64748B" : "#94A3B8",
    inputBg: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)",
    inputBorder: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)",
  };

  const inputStyle = { width: "100%", background: T.inputBg, border: `1px solid ${T.inputBorder}`, color: T.text, padding: "12px 16px", borderRadius: 10, fontSize: 14, outline: "none", boxSizing: "border-box", fontFamily: "inherit" };
  const labelStyle = { display: "block", fontSize: 13, color: T.textSub, marginBottom: 6, fontWeight: 500 };

  useEffect(() => {
    if (editingEvent) {
      setForm({ title: editingEvent.title || "", type: editingEvent.type || "Conference", date: editingEvent.date || "", time: editingEvent.time || "", venue: editingEvent.venue || "", city: editingEvent.city || "Nairobi", price: editingEvent.price || 0, capacity: editingEvent.capacity || 100, description: editingEvent.description || "", is_featured: editingEvent.is_featured || false });
      if (editingEvent.ticket_tiers?.length > 0) { setTiers(editingEvent.ticket_tiers); setUseTiers(true); }
    }
  }, [editingEvent]);

  const addTier = () => setTiers(prev => [...prev, { ...EMPTY_TIER, name: `Tier ${prev.length + 1}` }]);
  const removeTier = (i) => setTiers(prev => prev.filter((_, idx) => idx !== i));
  const updateTier = (i, key, val) => setTiers(prev => prev.map((t, idx) => idx === i ? { ...t, [key]: val } : t));

  const handleSave = async () => {
    setError("");
    if (!form.title || !form.date || !form.time || !form.venue) { setError("Please fill all required fields."); return; }
    setLoading(true);
    try {
      const headers = { Authorization: `Token ${token}`, "Content-Type": "application/json" };
      const payload = { ...form, ...(useTiers && { ticket_tiers: tiers }) };
      const method = editingEvent ? "PUT" : "POST";
      const url = editingEvent ? `${API_BASE}/events/${editingEvent.id}/` : `${API_BASE}/events/create/`;
      const res = await fetch(url, { method, headers, body: JSON.stringify(payload) });
      if (res.ok) { const data = await res.json(); onSaved(data, !!editingEvent); }
      else { const err = await res.json(); setError(err.detail || Object.values(err)[0]?.[0] || "Save failed."); }
    } catch {
      onSaved({ id: Date.now(), ...form, ticket_tiers: useTiers ? tiers : [], booked: 0 }, !!editingEvent);
    }
    setLoading(false);
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.88)", backdropFilter: "blur(10px)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div style={{ background: T.modal, border: `1px solid ${T.border}`, borderRadius: 24, width: "100%", maxWidth: 600, maxHeight: "92vh", overflowY: "auto", fontFamily: "'DM Sans', sans-serif" }}>
        <div style={{ padding: "28px 32px 0", display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: T.text, margin: 0 }}>{editingEvent ? "Edit Event" : "Create New Event"}</h2>
            <p style={{ fontSize: 13, color: T.textSub, margin: "4px 0 0" }}>{editingEvent ? "Update your event details" : "Fill in the details to publish your event"}</p>
          </div>
          <button onClick={onClose} style={{ background: T.inputBg, border: `1px solid ${T.inputBorder}`, color: T.textSub, cursor: "pointer", fontSize: 16, width: 34, height: 34, borderRadius: 8 }}>✕</button>
        </div>

        <div style={{ padding: "0 32px", marginBottom: 24 }}>
          <div style={{ display: "flex", gap: 4, background: T.inputBg, borderRadius: 12, padding: 4, width: "fit-content" }}>
            {[["details", "📋 Event Details"], ["tickets", "🎟 Ticket Setup"]].map(([key, label]) => (
              <button key={key} onClick={() => setActiveTab(key)} style={{ background: activeTab === key ? "linear-gradient(135deg,#6366F1,#8B5CF6)" : "none", color: activeTab === key ? "#fff" : T.textSub, border: "none", borderRadius: 9, padding: "9px 20px", fontWeight: 600, fontSize: 14, cursor: "pointer", fontFamily: "inherit" }}>{label}</button>
            ))}
          </div>
        </div>

        <div style={{ padding: "0 32px 32px" }}>
          {activeTab === "details" && (
            <>
              <div style={{ marginBottom: 16 }}>
                <label style={labelStyle}>Event Title *</label>
                <input style={inputStyle} placeholder="e.g. Nairobi Tech Summit 2025" value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
                <div>
                  <label style={labelStyle}>Event Type *</label>
                  <select style={{ ...inputStyle, appearance: "none" }} value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value }))}>
                    {EVENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>City *</label>
                  <select style={{ ...inputStyle, appearance: "none" }} value={form.city} onChange={e => setForm(p => ({ ...p, city: e.target.value }))}>
                    {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
                <div><label style={labelStyle}>Date *</label><input type="date" style={inputStyle} value={form.date} onChange={e => setForm(p => ({ ...p, date: e.target.value }))} /></div>
                <div><label style={labelStyle}>Time *</label><input type="time" style={inputStyle} value={form.time} onChange={e => setForm(p => ({ ...p, time: e.target.value }))} /></div>
              </div>
              <div style={{ marginBottom: 16 }}>
                <label style={labelStyle}>Venue *</label>
                <input style={inputStyle} placeholder="e.g. KICC, Nairobi" value={form.venue} onChange={e => setForm(p => ({ ...p, venue: e.target.value }))} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
                <div>
                  <label style={labelStyle}>Base Price (KES)</label>
                  <input type="number" style={inputStyle} placeholder="0 for free" value={form.price} onChange={e => setForm(p => ({ ...p, price: Number(e.target.value) }))} />
                  <div style={{ fontSize: 11, color: T.textMuted, marginTop: 4 }}>Used if no ticket tiers set</div>
                </div>
                <div><label style={labelStyle}>Total Capacity</label><input type="number" style={inputStyle} value={form.capacity} onChange={e => setForm(p => ({ ...p, capacity: Number(e.target.value) }))} /></div>
              </div>
              <div style={{ marginBottom: 16 }}>
                <label style={labelStyle}>Description</label>
                <textarea style={{ ...inputStyle, height: 100, resize: "vertical" }} placeholder="Tell people about your event..." value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} />
              </div>
              <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", marginBottom: 8 }}>
                <input type="checkbox" checked={form.is_featured} onChange={e => setForm(p => ({ ...p, is_featured: e.target.checked }))} />
                <span style={{ fontSize: 13, color: T.textSub }}>⭐ Mark as featured event</span>
              </label>
            </>
          )}

          {activeTab === "tickets" && (
            <>
              <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 14, padding: "16px 18px", marginBottom: 20 }}>
                <label style={{ display: "flex", alignItems: "center", gap: 12, cursor: "pointer" }}>
                  <div onClick={() => setUseTiers(p => !p)} style={{ width: 44, height: 24, borderRadius: 12, background: useTiers ? "linear-gradient(135deg,#6366F1,#8B5CF6)" : T.inputBg, border: `1px solid ${useTiers ? "transparent" : T.inputBorder}`, position: "relative", cursor: "pointer", transition: "background 0.2s", flexShrink: 0 }}>
                    <div style={{ position: "absolute", top: 2, left: useTiers ? 22 : 2, width: 18, height: 18, borderRadius: "50%", background: "#fff", transition: "left 0.2s" }} />
                  </div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: T.text }}>Enable Ticket Tiers</div>
                    <div style={{ fontSize: 12, color: T.textMuted }}>Set different prices for Early Bird, VIP, VVIP etc.</div>
                  </div>
                </label>
              </div>

              {useTiers && (
                <>
                  {tiers.length === 0 && <div style={{ textAlign: "center", padding: "32px 0", color: T.textMuted, fontSize: 14 }}>No tiers yet. Add one below.</div>}
                  {tiers.map((tier, i) => (
                    <div key={i} style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 14, padding: "18px 20px", marginBottom: 12 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                        <span style={{ fontWeight: 700, fontSize: 14, color: T.text }}>Tier {i + 1}</span>
                        <button onClick={() => removeTier(i)} style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", color: "#FCA5A5", padding: "4px 12px", borderRadius: 8, cursor: "pointer", fontSize: 12, fontFamily: "inherit" }}>Remove</button>
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
                        <div><label style={labelStyle}>Tier Name</label><input style={inputStyle} placeholder="e.g. VIP Access" value={tier.name} onChange={e => updateTier(i, "name", e.target.value)} /></div>
                        <div>
                          <label style={labelStyle}>Tier Type</label>
                          <select style={{ ...inputStyle, appearance: "none" }} value={tier.tier_type} onChange={e => updateTier(i, "tier_type", e.target.value)}>
                            {TIER_TYPES.map(t => <option key={t} value={t}>{TIER_LABELS[t]}</option>)}
                          </select>
                        </div>
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
                        <div><label style={labelStyle}>Price (KES)</label><input type="number" style={inputStyle} placeholder="0 for free" value={tier.price} onChange={e => updateTier(i, "price", Number(e.target.value))} /></div>
                        <div><label style={labelStyle}>Capacity</label><input type="number" style={inputStyle} value={tier.capacity} onChange={e => updateTier(i, "capacity", Number(e.target.value))} /></div>
                      </div>
                      <div style={{ marginBottom: 10 }}><label style={labelStyle}>Description (optional)</label><input style={inputStyle} placeholder="e.g. Front row seats + meet & greet" value={tier.description} onChange={e => updateTier(i, "description", e.target.value)} /></div>
                      <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                        <input type="checkbox" checked={tier.is_active} onChange={e => updateTier(i, "is_active", e.target.checked)} />
                        <span style={{ fontSize: 13, color: T.textSub }}>Active (visible to attendees)</span>
                      </label>
                    </div>
                  ))}
                  <button onClick={addTier} style={{ width: "100%", background: "none", border: `2px dashed ${T.inputBorder}`, color: T.textSub, padding: "14px", borderRadius: 12, cursor: "pointer", fontFamily: "inherit", fontSize: 14, fontWeight: 600, marginBottom: 4 }}>+ Add Ticket Tier</button>
                </>
              )}

              {!useTiers && (
                <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 14, padding: "20px", textAlign: "center" }}>
                  <div style={{ fontSize: 32, marginBottom: 8 }}>🎟</div>
                  <div style={{ fontSize: 14, color: T.textSub }}>Ticket tiers disabled. Using base price from Event Details.</div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: T.text, marginTop: 8 }}>{form.price === 0 ? "FREE" : `KES ${Number(form.price).toLocaleString()}`}</div>
                </div>
              )}
            </>
          )}

          {error && <div style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", color: "#FCA5A5", padding: "10px 14px", borderRadius: 10, fontSize: 13, margin: "16px 0" }}>⚠ {error}</div>}

          <div style={{ display: "flex", gap: 10, marginTop: 24 }}>
            <button onClick={onClose} style={{ flex: 1, background: T.inputBg, border: `1px solid ${T.inputBorder}`, color: T.textSub, padding: "13px", borderRadius: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>Cancel</button>
            <button onClick={handleSave} disabled={loading} style={{ flex: 2, background: "linear-gradient(135deg,#6366F1,#8B5CF6)", color: "#fff", border: "none", padding: "13px", borderRadius: 12, fontWeight: 700, cursor: "pointer", fontSize: 15, fontFamily: "inherit", opacity: loading ? 0.7 : 1 }}>
              {loading ? "Saving..." : editingEvent ? "Update Event" : "Publish Event"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
