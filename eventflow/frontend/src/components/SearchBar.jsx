import { useState } from "react";
import { useTheme } from "../App";

const CITIES = ["All Cities", "Nairobi", "Nakuru", "Mombasa", "Kisumu", "Eldoret", "Thika", "Nyeri"];

export default function SearchBar({ onSearch }) {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const [query, setQuery] = useState("");
  const [city, setCity] = useState("All Cities");
  const [focused, setFocused] = useState(false);

  const T = {
    bg: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)",
    border: focused ? "rgba(99,102,241,0.6)" : isDark ? "rgba(255,255,255,0.09)" : "rgba(0,0,0,0.09)",
    text: isDark ? "#F0F0F5" : "#0F172A",
    divider: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)",
  };

  const handleSearch = () => onSearch({ query, city: city === "All Cities" ? "" : city });

  return (
    <div style={{ display: "flex", alignItems: "center", background: T.bg, border: `1.5px solid ${T.border}`, borderRadius: 14, overflow: "hidden", transition: "border-color 0.2s", maxWidth: 680, width: "100%" }}>
      <div style={{ display: "flex", alignItems: "center", flex: 1, padding: "0 16px", gap: 10 }}>
        <span style={{ fontSize: 16, opacity: 0.5 }}>🔍</span>
        <input
          type="text"
          placeholder="Search events, artists, venues..."
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => e.key === "Enter" && handleSearch()}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={{ flex: 1, background: "none", border: "none", outline: "none", color: T.text, fontSize: 15, padding: "14px 0", fontFamily: "inherit" }}
        />
      </div>
      <div style={{ width: 1, height: 28, background: T.divider }} />
      <select value={city} onChange={e => setCity(e.target.value)} style={{ background: "none", border: "none", outline: "none", color: T.text, fontSize: 14, padding: "14px 16px", fontFamily: "inherit", cursor: "pointer", minWidth: 120 }}>
        {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
      </select>
      <button onClick={handleSearch} style={{ background: "linear-gradient(135deg,#6366F1,#8B5CF6)", color: "#fff", border: "none", padding: "14px 24px", fontWeight: 700, fontSize: 14, cursor: "pointer", fontFamily: "inherit" }}
        onMouseEnter={e => e.target.style.opacity = "0.85"} onMouseLeave={e => e.target.style.opacity = "1"}>
        Search
      </button>
    </div>
  );
}
