import { useState, useEffect } from 'react';
import DigitalTicket from './components/DigitalTicket';

const API = 'http://localhost:8000/api';

// ── Tier visual config ────────────────────────────────────────────────────────
const TIER_CONFIG = {
  early_bird: {
    gradient: 'linear-gradient(135deg, #16a34a, #4ade80)',
    accent: '#16a34a',
    bg: '#f0fdf4',
    border: '#86efac',
    badge: 'BEST VALUE',
    badgeColor: '#15803d',
    badgeBg: '#dcfce7',
    icon: '🐦',
    glow: 'rgba(22,163,74,0.15)',
  },
  regular: {
    gradient: 'linear-gradient(135deg, #2563eb, #60a5fa)',
    accent: '#2563eb',
    bg: '#eff6ff',
    border: '#93c5fd',
    badge: null,
    icon: '🎟️',
    glow: 'rgba(37,99,235,0.12)',
  },
  vip: {
    gradient: 'linear-gradient(135deg, #b45309, #fbbf24)',
    accent: '#b45309',
    bg: '#fffbeb',
    border: '#fcd34d',
    badge: 'VIP ACCESS',
    badgeColor: '#92400e',
    badgeBg: '#fef3c7',
    icon: '⭐',
    glow: 'rgba(180,83,9,0.15)',
  },
  vvip: {
    gradient: 'linear-gradient(135deg, #7c3aed, #c084fc)',
    accent: '#7c3aed',
    bg: '#faf5ff',
    border: '#d8b4fe',
    badge: '✦ EXCLUSIVE',
    badgeColor: '#6d28d9',
    badgeBg: '#ede9fe',
    icon: '👑',
    glow: 'rgba(124,58,237,0.18)',
  },
};

const TIER_ORDER = { early_bird: 0, regular: 1, vip: 2, vvip: 3 };

function formatCurrency(amount) {
  if (!amount || amount == 0) return 'FREE';
  return `KES ${Number(amount).toLocaleString('en-KE', { minimumFractionDigits: 2 })}`;
}

function formatDate(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-KE', {
    weekday: 'short', month: 'long', day: 'numeric', year: 'numeric',
  });
}

// ── Step indicator ────────────────────────────────────────────────────────────
function StepBar({ step }) {
  const steps = ['Select Ticket', 'Payment', 'Your Ticket'];
  return (
    <div style={sb.bar}>
      {steps.map((label, i) => {
        const num = i + 1;
        const active = step === num;
        const done = step > num;
        return (
          <div key={i} style={sb.item}>
            <div style={{
              ...sb.circle,
              background: done ? '#22c55e' : active ? '#2563eb' : '#e5e7eb',
              color: (done || active) ? '#fff' : '#9ca3af',
              boxShadow: active ? '0 0 0 4px rgba(37,99,235,0.2)' : 'none',
            }}>
              {done ? '✓' : num}
            </div>
            <span style={{ ...sb.label, color: active ? '#2563eb' : done ? '#22c55e' : '#9ca3af' }}>
              {label}
            </span>
            {i < steps.length - 1 && (
              <div style={{ ...sb.line, background: done ? '#22c55e' : '#e5e7eb' }} />
            )}
          </div>
        );
      })}
    </div>
  );
}
const sb = {
  bar: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0, marginBottom: 32 },
  item: { display: 'flex', alignItems: 'center', gap: 8 },
  circle: {
    width: 32, height: 32, borderRadius: '50%',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontWeight: 700, fontSize: 14, transition: 'all 0.2s',
  },
  label: { fontSize: 13, fontWeight: 600, transition: 'color 0.2s' },
  line: { width: 48, height: 2, margin: '0 8px', borderRadius: 2, transition: 'background 0.2s' },
};

// ── Tier Card ─────────────────────────────────────────────────────────────────
function TierCard({ tier, selected, onSelect }) {
  const cfg = TIER_CONFIG[tier.category] || TIER_CONFIG.regular;
  const unavailable = !tier.is_available;

  return (
    <div
      onClick={() => !unavailable && onSelect(tier)}
      style={{
        ...tc.card,
        background: selected ? cfg.bg : '#fff',
        border: `2px solid ${selected ? cfg.accent : unavailable ? '#e5e7eb' : cfg.border}`,
        boxShadow: selected ? `0 0 0 4px ${cfg.glow}, 0 4px 20px ${cfg.glow}` : '0 2px 8px rgba(0,0,0,0.06)',
        opacity: unavailable ? 0.55 : 1,
        cursor: unavailable ? 'not-allowed' : 'pointer',
        transform: selected ? 'scale(1.01)' : 'scale(1)',
      }}
    >
      {/* Top gradient strip */}
      <div style={{ ...tc.strip, background: cfg.gradient }}>
        <span style={tc.stripIcon}>{cfg.icon}</span>
        <span style={tc.stripLabel}>{tier.get_category_display || tier.category.replace('_', ' ').toUpperCase()}</span>
        {unavailable && <span style={tc.stripSoldOut}>SOLD OUT</span>}
        {cfg.badge && !unavailable && (
          <span style={{ ...tc.badge, background: cfg.badgeBg, color: cfg.badgeColor }}>
            {cfg.badge}
          </span>
        )}
      </div>

      <div style={tc.body}>
        {/* Name + price */}
        <div style={tc.nameRow}>
          <div>
            <div style={tc.tierName}>{tier.name}</div>
            {tier.description && <div style={tc.tierDesc}>{tier.description}</div>}
          </div>
          <div style={{ ...tc.price, color: cfg.accent }}>
            {formatCurrency(tier.price)}
          </div>
        </div>

        {/* Perks */}
        {tier.perks && tier.perks.length > 0 && (
          <ul style={tc.perkList}>
            {tier.perks.map((p, i) => (
              <li key={i} style={tc.perkItem}>
                <span style={{ color: cfg.accent }}>✓</span> {p}
              </li>
            ))}
          </ul>
        )}

        {/* Availability bar */}
        <div style={tc.availRow}>
          <div style={tc.availBar}>
            <div style={{
              ...tc.availFill,
              width: `${tier.fill_percentage || 0}%`,
              background: cfg.gradient,
            }} />
          </div>
          <span style={tc.availText}>
            {unavailable ? 'Sold out' : `${tier.available} left`}
          </span>
        </div>

        {/* Select indicator */}
        {selected && (
          <div style={{ ...tc.selectedPill, background: cfg.accent }}>
            ✓ Selected
          </div>
        )}
      </div>
    </div>
  );
}
const tc = {
  card: {
    borderRadius: 16, overflow: 'hidden', transition: 'all 0.2s',
    flexShrink: 0,
  },
  strip: { padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 8 },
  stripIcon: { fontSize: 20 },
  stripLabel: { fontWeight: 800, color: '#fff', fontSize: 13, letterSpacing: '0.5px', flex: 1 },
  stripSoldOut: {
    fontSize: 11, fontWeight: 700, background: 'rgba(0,0,0,0.3)',
    color: '#fff', padding: '2px 8px', borderRadius: 20,
  },
  badge: {
    fontSize: 10, fontWeight: 800, padding: '2px 8px', borderRadius: 20,
    letterSpacing: '0.5px',
  },
  body: { padding: '14px 16px 16px' },
  nameRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 10 },
  tierName: { fontWeight: 700, fontSize: 15, color: '#111' },
  tierDesc: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  price: { fontWeight: 800, fontSize: 18, whiteSpace: 'nowrap' },
  perkList: { margin: '0 0 12px', padding: '0 0 0 4px', listStyle: 'none' },
  perkItem: { fontSize: 12, color: '#374151', marginBottom: 4, display: 'flex', gap: 6 },
  availRow: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 },
  availBar: { flex: 1, height: 5, background: '#f3f4f6', borderRadius: 10, overflow: 'hidden' },
  availFill: { height: '100%', borderRadius: 10, transition: 'width 0.4s' },
  availText: { fontSize: 11, color: '#9ca3af', fontWeight: 600, whiteSpace: 'nowrap' },
  selectedPill: {
    display: 'inline-block', color: '#fff', fontSize: 12, fontWeight: 700,
    padding: '4px 14px', borderRadius: 20, marginTop: 8,
  },
};

// ── Main BookingPage ──────────────────────────────────────────────────────────
export default function BookingPage({ event, onClose, user, token }) {
  const [step, setStep] = useState(1);
  const [tiers, setTiers] = useState([]);
  const [selectedTier, setSelectedTier] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [paymentMethod, setPaymentMethod] = useState('mpesa');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [tiersLoading, setTiersLoading] = useState(true);
  const [error, setError] = useState('');
  const [booking, setBooking] = useState(null);
  const [digitalTicket, setDigitalTicket] = useState(null);
  const [mpesaPushed, setMpesaPushed] = useState(false);
  const [mpesaPolling, setMpesaPolling] = useState(false);

  // Fetch tiers
  useEffect(() => {
    if (!event?.id) return;
    setTiersLoading(true);
    fetch(`${API}/bookings/tiers/${event.id}/`)
      .then(r => r.json())
      .then(data => {
        const sorted = [...data].sort((a, b) =>
          (TIER_ORDER[a.category] ?? 99) - (TIER_ORDER[b.category] ?? 99)
        );
        setTiers(sorted);
        // Auto-select first available tier
        const first = sorted.find(t => t.is_available);
        if (first) setSelectedTier(first);
      })
      .catch(() => setError('Could not load ticket options.'))
      .finally(() => setTiersLoading(false));
  }, [event?.id]);

  const totalPrice = selectedTier ? selectedTier.price * quantity : 0;

  // ── Step 1 → 2 ──
  const handleContinueToPayment = () => {
    if (!selectedTier) { setError('Please select a ticket tier.'); return; }
    setError('');
    setStep(2);
  };

  // ── Create booking on the backend ──
  const createBooking = async () => {
    const res = await fetch(`${API}/bookings/create/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        event_id: event.id,
        tier_id: selectedTier.id,
        quantity,
        payment_method: paymentMethod,
        phone_number: phone,
      }),
    });
    if (!res.ok) {
      const d = await res.json();
      throw new Error(d.error || 'Failed to create booking.');
    }
    return res.json();
  };

  // ── Confirm booking (issue digital ticket) ──
  const confirmBooking = async (bookingId, paypalOrderId = '') => {
    const res = await fetch(`${API}/bookings/${bookingId}/confirm/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ paypal_order_id: paypalOrderId }),
    });
    if (!res.ok) throw new Error('Failed to confirm booking.');
    return res.json();
  };

  // ── M-Pesa flow ──
  const handleMpesaPayment = async () => {
    if (!phone) { setError('Please enter your M-Pesa phone number.'); return; }
    setError('');
    setLoading(true);
    try {
      const b = await createBooking();
      setBooking(b);

      // Trigger STK Push
      const stkRes = await fetch(`${API}/mpesa/stk-push/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          booking_id: b.id,
          phone_number: phone,
          amount: Math.ceil(totalPrice),
        }),
      });
      if (!stkRes.ok) throw new Error('STK Push failed. Check your phone number.');

      setMpesaPushed(true);
      // Poll for payment status
      pollMpesaStatus(b.id);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const pollMpesaStatus = (bookingId) => {
    setMpesaPolling(true);
    let attempts = 0;
    const interval = setInterval(async () => {
      attempts++;
      try {
        const res = await fetch(`${API}/bookings/${bookingId}/ticket/`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const ticket = await res.json();
          clearInterval(interval);
          setMpesaPolling(false);
          setDigitalTicket(ticket);
          setStep(3);
        }
      } catch {}
      if (attempts >= 24) { // 2 minutes
        clearInterval(interval);
        setMpesaPolling(false);
        setError('Payment timeout. If M-Pesa was deducted, check My Bookings for your ticket.');
      }
    }, 5000);
  };

  // Manual confirm (user presses "I've paid" after M-Pesa prompt)
  const handleManualConfirm = async () => {
    if (!booking) return;
    setLoading(true);
    try {
      const ticket = await confirmBooking(booking.id);
      setDigitalTicket(ticket);
      setStep(3);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  // ── PayPal flow ──
  const handlePayPalSuccess = async (paypalOrderId) => {
    setLoading(true);
    try {
      let b = booking;
      if (!b) b = await createBooking();
      setBooking(b);
      const ticket = await confirmBooking(b.id, paypalOrderId);
      setDigitalTicket(ticket);
      setStep(3);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div style={s.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={s.modal}>

        {/* Modal header */}
        <div style={s.header}>
          <div>
            <h2 style={s.headerTitle}>Book Tickets</h2>
            <p style={s.headerSub}>{event?.title}</p>
          </div>
          <button onClick={onClose} style={s.closeBtn}>✕</button>
        </div>

        <div style={s.body}>
          <StepBar step={step} />

          {/* ── STEP 1: Choose Tier ── */}
          {step === 1 && (
            <div>
              <h3 style={s.sectionTitle}>Choose Your Ticket Type</h3>

              {tiersLoading ? (
                <div style={s.loadingBox}>
                  <div style={s.spinner} />
                  <p>Loading available tickets…</p>
                </div>
              ) : tiers.length === 0 ? (
                <div style={s.emptyBox}>
                  No ticket tiers available yet. Please check back later.
                </div>
              ) : (
                <div style={s.tierGrid}>
                  {tiers.map(tier => (
                    <TierCard
                      key={tier.id}
                      tier={tier}
                      selected={selectedTier?.id === tier.id}
                      onSelect={setSelectedTier}
                    />
                  ))}
                </div>
              )}

              {/* Quantity */}
              {selectedTier && (
                <div style={s.quantityRow}>
                  <label style={s.qtyLabel}>Number of Tickets</label>
                  <div style={s.qtyStepper}>
                    <button
                      style={s.qtyBtn}
                      onClick={() => setQuantity(q => Math.max(1, q - 1))}
                    >−</button>
                    <span style={s.qtyNum}>{quantity}</span>
                    <button
                      style={s.qtyBtn}
                      onClick={() => setQuantity(q => Math.min(selectedTier.available, q + 1))}
                    >+</button>
                  </div>
                  <div style={s.totalBadge}>
                    Total: <strong>{formatCurrency(totalPrice)}</strong>
                  </div>
                </div>
              )}

              {error && <div style={s.error}>{error}</div>}

              <button
                onClick={handleContinueToPayment}
                disabled={!selectedTier || tiersLoading}
                style={{ ...s.primaryBtn, opacity: !selectedTier ? 0.5 : 1 }}
              >
                Continue to Payment →
              </button>
            </div>
          )}

          {/* ── STEP 2: Payment ── */}
          {step === 2 && (
            <div>
              {/* Summary card */}
              <div style={s.summaryCard}>
                <div style={s.summaryRow}>
                  <span style={s.summaryLabel}>Event</span>
                  <span style={s.summaryValue}>{event?.title}</span>
                </div>
                <div style={s.summaryRow}>
                  <span style={s.summaryLabel}>Ticket Type</span>
                  <span style={s.summaryValue}>
                    {TIER_CONFIG[selectedTier?.category]?.icon} {selectedTier?.name}
                  </span>
                </div>
                <div style={s.summaryRow}>
                  <span style={s.summaryLabel}>Quantity</span>
                  <span style={s.summaryValue}>{quantity} ticket{quantity > 1 ? 's' : ''}</span>
                </div>
                <div style={{ ...s.summaryRow, borderTop: '1px dashed #e5e7eb', paddingTop: 10, marginTop: 4 }}>
                  <span style={{ ...s.summaryLabel, fontWeight: 700, color: '#111' }}>Total</span>
                  <span style={{ ...s.summaryValue, fontWeight: 800, fontSize: 18, color: '#111' }}>
                    {formatCurrency(totalPrice)}
                  </span>
                </div>
              </div>

              {/* Payment method tabs */}
              <h3 style={s.sectionTitle}>Payment Method</h3>
              <div style={s.payTabs}>
                {['mpesa', 'paypal'].map(method => (
                  <button
                    key={method}
                    onClick={() => setPaymentMethod(method)}
                    style={{
                      ...s.payTab,
                      background: paymentMethod === method ? '#2563eb' : '#f9fafb',
                      color: paymentMethod === method ? '#fff' : '#374151',
                      border: paymentMethod === method ? '2px solid #2563eb' : '2px solid #e5e7eb',
                    }}
                  >
                    {method === 'mpesa' ? '📱 M-Pesa' : '💳 PayPal'}
                  </button>
                ))}
              </div>

              {/* M-Pesa form */}
              {paymentMethod === 'mpesa' && !mpesaPushed && (
                <div style={s.payForm}>
                  <label style={s.fieldLabel}>M-Pesa Phone Number</label>
                  <input
                    type="tel"
                    placeholder="07XXXXXXXX or 2547XXXXXXXX"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    style={s.input}
                  />
                  <p style={s.hint}>
                    You will receive an STK Push prompt on your phone. Enter your M-Pesa PIN to complete payment.
                  </p>
                </div>
              )}

              {/* M-Pesa awaiting */}
              {paymentMethod === 'mpesa' && mpesaPushed && (
                <div style={s.mpesaWaiting}>
                  <div style={{ fontSize: 40, marginBottom: 8 }}>📱</div>
                  <p style={{ fontWeight: 700, color: '#111', margin: '0 0 6px' }}>
                    Check your phone!
                  </p>
                  <p style={{ color: '#6b7280', fontSize: 13, margin: '0 0 16px' }}>
                    An M-Pesa prompt has been sent to <strong>{phone}</strong>. Enter your PIN to confirm.
                  </p>
                  {mpesaPolling && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center', color: '#6b7280', fontSize: 13 }}>
                      <div style={s.spinnerSm} /> Waiting for payment confirmation…
                    </div>
                  )}
                  <button onClick={handleManualConfirm} disabled={loading} style={s.secondaryBtn}>
                    {loading ? 'Confirming…' : 'I have paid — show my ticket'}
                  </button>
                </div>
              )}

              {/* PayPal placeholder */}
              {paymentMethod === 'paypal' && (
                <div style={s.payForm}>
                  <p style={s.hint}>
                    You will be redirected to PayPal to complete your payment of{' '}
                    <strong>{formatCurrency(totalPrice)}</strong>.
                  </p>
                  {/* Integrate @paypal/react-paypal-js here.
                      Call handlePayPalSuccess(orderId) on approval. */}
                  <button
                    onClick={() => handlePayPalSuccess('DEMO-PAYPAL-' + Date.now())}
                    style={{ ...s.primaryBtn, background: '#0070ba' }}
                    disabled={loading}
                  >
                    {loading ? 'Processing…' : '💳 Pay with PayPal'}
                  </button>
                </div>
              )}

              {error && <div style={s.error}>{error}</div>}

              {/* M-Pesa pay button */}
              {paymentMethod === 'mpesa' && !mpesaPushed && (
                <button
                  onClick={handleMpesaPayment}
                  disabled={loading}
                  style={{ ...s.primaryBtn, background: '#16a34a' }}
                >
                  {loading ? 'Sending STK Push…' : '📱 Pay KES ' + Math.ceil(totalPrice).toLocaleString() + ' via M-Pesa'}
                </button>
              )}

              <button onClick={() => setStep(1)} style={s.backBtn}>← Back</button>
            </div>
          )}

          {/* ── STEP 3: Digital Ticket ── */}
          {step === 3 && digitalTicket && (
            <div style={{ textAlign: 'center' }}>
              <div style={s.successIcon}>🎉</div>
              <h3 style={{ fontSize: 22, fontWeight: 800, color: '#111', margin: '0 0 6px' }}>
                Booking Confirmed!
              </h3>
              <p style={{ color: '#6b7280', marginBottom: 24 }}>
                Your digital ticket is ready. Show it at the venue entrance.
              </p>
              <DigitalTicket booking={digitalTicket} onClose={onClose} embedded />
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes fadeIn { from { opacity:0; transform:translateY(20px); } to { opacity:1; transform:none; } }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const s = {
  overlay: {
    position: 'fixed', inset: 0, zIndex: 1000,
    background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
    overflowY: 'auto',
  },
  modal: {
    background: '#fff', borderRadius: 20, width: '100%', maxWidth: 680,
    boxShadow: '0 24px 80px rgba(0,0,0,0.3)',
    animation: 'fadeIn 0.3s ease', maxHeight: '92vh', overflowY: 'auto',
  },
  header: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
    padding: '24px 28px 20px', borderBottom: '1px solid #f0f0f0',
    position: 'sticky', top: 0, background: '#fff', zIndex: 10,
  },
  headerTitle: { margin: 0, fontSize: 20, fontWeight: 800, color: '#111' },
  headerSub: { margin: '4px 0 0', fontSize: 13, color: '#6b7280' },
  closeBtn: {
    width: 34, height: 34, borderRadius: '50%', border: 'none',
    background: '#f3f4f6', cursor: 'pointer', fontSize: 16, color: '#6b7280',
  },
  body: { padding: '28px' },
  sectionTitle: { fontSize: 15, fontWeight: 700, color: '#111', margin: '0 0 16px' },
  tierGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 14, marginBottom: 24 },
  loadingBox: { textAlign: 'center', padding: 40, color: '#6b7280' },
  emptyBox: {
    textAlign: 'center', padding: 32, color: '#6b7280',
    background: '#f9fafb', borderRadius: 12, border: '1px dashed #d1d5db',
  },
  spinner: {
    width: 32, height: 32, border: '3px solid #e5e7eb',
    borderTopColor: '#2563eb', borderRadius: '50%',
    animation: 'spin 0.7s linear infinite', margin: '0 auto 12px',
  },
  spinnerSm: {
    width: 16, height: 16, border: '2px solid #e5e7eb',
    borderTopColor: '#2563eb', borderRadius: '50%',
    animation: 'spin 0.7s linear infinite',
  },
  quantityRow: {
    display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20,
    padding: '14px 18px', background: '#f9fafb', borderRadius: 12,
    border: '1px solid #e5e7eb', flexWrap: 'wrap',
  },
  qtyLabel: { fontWeight: 600, fontSize: 14, color: '#374151', flex: 1 },
  qtyStepper: { display: 'flex', alignItems: 'center', gap: 12 },
  qtyBtn: {
    width: 32, height: 32, borderRadius: 8, border: '1.5px solid #d1d5db',
    background: '#fff', fontSize: 18, cursor: 'pointer', fontWeight: 700,
    display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#374151',
  },
  qtyNum: { fontWeight: 800, fontSize: 18, minWidth: 24, textAlign: 'center' },
  totalBadge: { fontSize: 14, color: '#374151', background: '#eff6ff', padding: '6px 14px', borderRadius: 20 },
  primaryBtn: {
    width: '100%', padding: '14px', borderRadius: 12, border: 'none',
    background: '#2563eb', color: '#fff', fontWeight: 700, fontSize: 16,
    cursor: 'pointer', marginTop: 8, transition: 'opacity 0.2s',
  },
  secondaryBtn: {
    padding: '10px 24px', borderRadius: 10, border: '1.5px solid #d1d5db',
    background: '#fff', color: '#374151', fontWeight: 600, fontSize: 14,
    cursor: 'pointer', marginTop: 12,
  },
  backBtn: {
    width: '100%', padding: '12px', borderRadius: 12, border: '1.5px solid #e5e7eb',
    background: 'transparent', color: '#6b7280', fontWeight: 600, fontSize: 14,
    cursor: 'pointer', marginTop: 8,
  },
  error: {
    background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10,
    padding: '10px 14px', color: '#dc2626', fontSize: 13, marginTop: 8, marginBottom: 8,
  },
  summaryCard: {
    background: '#f9fafb', borderRadius: 14, padding: '16px 18px',
    border: '1px solid #e5e7eb', marginBottom: 24,
  },
  summaryRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0' },
  summaryLabel: { fontSize: 13, color: '#6b7280', fontWeight: 500 },
  summaryValue: { fontSize: 14, color: '#374151', fontWeight: 600 },
  payTabs: { display: 'flex', gap: 10, marginBottom: 20 },
  payTab: {
    flex: 1, padding: '12px', borderRadius: 10, fontWeight: 700,
    fontSize: 14, cursor: 'pointer', transition: 'all 0.2s',
  },
  payForm: { marginBottom: 16 },
  fieldLabel: { display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 },
  input: {
    width: '100%', padding: '12px 14px', borderRadius: 10,
    border: '1.5px solid #d1d5db', fontSize: 14, color: '#111',
    outline: 'none', boxSizing: 'border-box',
  },
  hint: { fontSize: 12, color: '#9ca3af', marginTop: 8, lineHeight: 1.5 },
  mpesaWaiting: {
    textAlign: 'center', padding: '24px 16px',
    background: '#f0fdf4', borderRadius: 14, border: '1px solid #86efac', marginBottom: 16,
  },
  successIcon: { fontSize: 56, marginBottom: 8 },
};
