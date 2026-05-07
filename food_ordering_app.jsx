import { useState, useEffect, useCallback } from "react";

const API = "http://localhost:5050/api";

const STATUS_COLORS = {
  pending:   { bg: "#FEF3C7", text: "#92400E", dot: "#F59E0B" },
  confirmed: { bg: "#DBEAFE", text: "#1E3A8A", dot: "#3B82F6" },
  preparing: { bg: "#EDE9FE", text: "#4C1D95", dot: "#8B5CF6" },
  ready:     { bg: "#D1FAE5", text: "#065F46", dot: "#10B981" },
  delivered: { bg: "#F0FDF4", text: "#14532D", dot: "#22C55E" },
  cancelled: { bg: "#FEE2E2", text: "#7F1D1D", dot: "#EF4444" },
};

const STATUS_FLOW = ["pending", "confirmed", "preparing", "ready", "delivered"];

function useApi(path, deps = []) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const refresh = useCallback(() => {
    setLoading(true);
    fetch(API + path)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [path]);
  useEffect(() => { refresh(); }, [refresh, ...deps]);
  return { data, loading, refresh };
}

// ─── Badge ───────────────────────────────────────────────────────────────────
function Badge({ status }) {
  const c = STATUS_COLORS[status] || STATUS_COLORS.pending;
  return (
    <span style={{
      background: c.bg, color: c.text,
      fontSize: 11, fontWeight: 600, letterSpacing: "0.05em",
      padding: "3px 10px", borderRadius: 20, display: "inline-flex",
      alignItems: "center", gap: 5, textTransform: "uppercase",
    }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: c.dot, display: "inline-block" }} />
      {status}
    </span>
  );
}

// ─── Cart Sidebar ────────────────────────────────────────────────────────────
function CartSidebar({ cart, onAdd, onRemove, onClear, onCheckout }) {
  const total = cart.reduce((s, i) => s + i.price * i.qty, 0);
  return (
    <div style={{
      width: 320, background: "#fff", borderLeft: "1px solid #F1F0F8",
      display: "flex", flexDirection: "column", height: "100%",
    }}>
      <div style={{ padding: "20px 24px 16px", borderBottom: "1px solid #F1F0F8" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "#1a1625" }}>
            🛒 Your Order
          </h2>
          {cart.length > 0 && (
            <button onClick={onClear} style={{
              background: "none", border: "none", color: "#9CA3AF", cursor: "pointer",
              fontSize: 12, fontWeight: 500,
            }}>Clear all</button>
          )}
        </div>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "12px 0" }}>
        {cart.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 24px", color: "#9CA3AF" }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🍽️</div>
            <p style={{ margin: 0, fontSize: 14 }}>Add items to get started</p>
          </div>
        ) : cart.map(item => (
          <div key={item.id} style={{
            display: "flex", alignItems: "center", gap: 12,
            padding: "10px 24px", borderBottom: "1px solid #F9F8FF",
          }}>
            <span style={{ fontSize: 28 }}>{item.emoji}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: "#1a1625", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{item.name}</p>
              <p style={{ margin: 0, fontSize: 12, color: "#7C3AED" }}>£{(item.price * item.qty).toFixed(2)}</p>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <button onClick={() => onRemove(item.id)} style={qtyBtn}> − </button>
              <span style={{ fontSize: 13, fontWeight: 700, minWidth: 16, textAlign: "center" }}>{item.qty}</span>
              <button onClick={() => onAdd(item)} style={qtyBtn}> + </button>
            </div>
          </div>
        ))}
      </div>

      {cart.length > 0 && (
        <div style={{ padding: "16px 24px", borderTop: "1px solid #F1F0F8" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
            <span style={{ fontSize: 15, color: "#6B7280" }}>Subtotal</span>
            <span style={{ fontSize: 15, fontWeight: 700, color: "#1a1625" }}>£{total.toFixed(2)}</span>
          </div>
          <button onClick={onCheckout} style={{
            width: "100%", background: "linear-gradient(135deg, #7C3AED, #5B21B6)",
            color: "#fff", border: "none", borderRadius: 12, padding: "14px",
            fontSize: 15, fontWeight: 700, cursor: "pointer", letterSpacing: "0.02em",
          }}>
            Checkout → £{total.toFixed(2)}
          </button>
        </div>
      )}
    </div>
  );
}

const qtyBtn = {
  width: 26, height: 26, border: "1.5px solid #E5E7EB", borderRadius: 8,
  background: "#F9FAFB", cursor: "pointer", fontSize: 14, fontWeight: 700,
  display: "flex", alignItems: "center", justifyContent: "center",
  color: "#374151", lineHeight: 1,
};

// ─── Checkout Modal ──────────────────────────────────────────────────────────
function CheckoutModal({ cart, onClose, onSuccess }) {
  const [form, setForm] = useState({ name: "", email: "", phone: "", address: "", notes: "" });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const total = cart.reduce((s, i) => s + i.price * i.qty, 0);

  const submit = async () => {
    if (!form.name || !form.email) { setError("Name and email are required"); return; }
    setSubmitting(true); setError("");
    try {
      const res = await fetch(API + "/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer_name: form.name,
          customer_email: form.email,
          customer_phone: form.phone,
          customer_address: form.address,
          notes: form.notes,
          items: cart.map(i => ({ menu_item_id: i.id, quantity: i.qty })),
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Failed to place order"); setSubmitting(false); return; }
      onSuccess(data.id, total);
    } catch { setError("Network error"); setSubmitting(false); }
  };

  const inp = { width: "100%", boxSizing: "border-box", padding: "10px 14px", border: "1.5px solid #E5E7EB", borderRadius: 10, fontSize: 14, outline: "none", fontFamily: "inherit" };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ background: "#fff", borderRadius: 20, width: 480, maxWidth: "95vw", maxHeight: "90vh", overflowY: "auto", boxShadow: "0 24px 64px rgba(0,0,0,0.2)" }}>
        <div style={{ padding: "24px 28px", borderBottom: "1px solid #F1F0F8", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: "#1a1625" }}>Complete Order</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "#9CA3AF" }}>×</button>
        </div>
        <div style={{ padding: "24px 28px" }}>
          <h3 style={{ margin: "0 0 12px", fontSize: 14, fontWeight: 600, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.08em" }}>Your details</h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
            <input style={inp} placeholder="Full name *" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
            <input style={inp} placeholder="Email *" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
            <input style={inp} placeholder="Phone" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
            <input style={inp} placeholder="Delivery address" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} />
          </div>
          <textarea style={{ ...inp, resize: "none", height: 72 }} placeholder="Order notes / allergies" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />

          <div style={{ margin: "20px 0 8px", background: "#F9F8FF", borderRadius: 12, padding: "14px 16px" }}>
            {cart.map(i => (
              <div key={i.id} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 6 }}>
                <span style={{ color: "#374151" }}>{i.emoji} {i.name} × {i.qty}</span>
                <span style={{ fontWeight: 600 }}>£{(i.price * i.qty).toFixed(2)}</span>
              </div>
            ))}
            <div style={{ borderTop: "1px solid #E5E7EB", marginTop: 10, paddingTop: 10, display: "flex", justifyContent: "space-between", fontWeight: 700, fontSize: 15 }}>
              <span>Total</span><span style={{ color: "#7C3AED" }}>£{total.toFixed(2)}</span>
            </div>
          </div>

          {error && <p style={{ color: "#EF4444", fontSize: 13, margin: "8px 0 0" }}>{error}</p>}
          <button onClick={submit} disabled={submitting} style={{
            width: "100%", marginTop: 16, background: submitting ? "#C4B5FD" : "linear-gradient(135deg, #7C3AED, #5B21B6)",
            color: "#fff", border: "none", borderRadius: 12, padding: "14px",
            fontSize: 15, fontWeight: 700, cursor: submitting ? "not-allowed" : "pointer",
          }}>
            {submitting ? "Placing order…" : `Place Order · £${total.toFixed(2)}`}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Menu Tab ────────────────────────────────────────────────────────────────
function MenuTab({ cart, onAdd, onRemove }) {
  const { data: categories } = useApi("/categories");
  const [activeCat, setActiveCat] = useState(null);
  const { data: items } = useApi(activeCat ? `/menu?category_id=${activeCat}` : "/menu", [activeCat]);
  const [checkout, setCheckout] = useState(false);
  const [confirmed, setConfirmed] = useState(null);

  const cartMap = Object.fromEntries(cart.map(i => [i.id, i.qty]));

  if (confirmed) return (
    <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 72, marginBottom: 16 }}>🎉</div>
        <h2 style={{ fontSize: 24, fontWeight: 800, color: "#1a1625", margin: "0 0 8px" }}>Order #{confirmed.id} placed!</h2>
        <p style={{ color: "#6B7280", marginBottom: 24 }}>Total: <strong style={{ color: "#7C3AED" }}>£{confirmed.total.toFixed(2)}</strong></p>
        <button onClick={() => setConfirmed(null)} style={{
          background: "linear-gradient(135deg,#7C3AED,#5B21B6)", color: "#fff", border: "none",
          borderRadius: 12, padding: "12px 28px", fontSize: 15, fontWeight: 700, cursor: "pointer"
        }}>Order again</button>
      </div>
    </div>
  );

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      {/* Category Filter */}
      <div style={{ padding: "16px 28px 0", background: "#fff", borderBottom: "1px solid #F1F0F8" }}>
        <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 16 }}>
          <button
            onClick={() => setActiveCat(null)}
            style={catPill(!activeCat)}
          >All</button>
          {(categories || []).map(c => (
            <button key={c.id} onClick={() => setActiveCat(c.id)} style={catPill(activeCat === c.id)}>
              {c.icon} {c.name}
            </button>
          ))}
        </div>
      </div>

      {/* Items Grid */}
      <div style={{ flex: 1, overflowY: "auto", padding: "24px 28px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 18 }}>
          {(items || []).map(item => {
            const qty = cartMap[item.id] || 0;
            return (
              <div key={item.id} style={{
                background: "#fff", borderRadius: 16,
                border: qty > 0 ? "2px solid #7C3AED" : "1.5px solid #F1F0F8",
                overflow: "hidden", transition: "transform 0.15s, box-shadow 0.15s",
              }}>
                <div style={{
                  background: "linear-gradient(135deg, #F5F3FF, #EDE9FE)",
                  fontSize: 56, textAlign: "center", padding: "22px 0 16px", lineHeight: 1,
                }}>{item.image_emoji}</div>
                <div style={{ padding: "14px 16px" }}>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 6 }}>
                    {item.tags.map(t => (
                      <span key={t} style={{
                        fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 20, textTransform: "uppercase", letterSpacing: "0.06em",
                        background: t === "bestseller" ? "#FEF3C7" : t === "spicy" ? "#FEE2E2" : "#D1FAE5",
                        color: t === "bestseller" ? "#92400E" : t === "spicy" ? "#7F1D1D" : "#065F46",
                      }}>{t}</span>
                    ))}
                  </div>
                  <p style={{ margin: "0 0 4px", fontWeight: 700, fontSize: 14, color: "#1a1625" }}>{item.name}</p>
                  <p style={{ margin: "0 0 12px", fontSize: 12, color: "#9CA3AF", lineHeight: 1.5 }}>{item.description}</p>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <span style={{ fontSize: 16, fontWeight: 800, color: "#7C3AED" }}>£{item.price.toFixed(2)}</span>
                    {qty === 0 ? (
                      <button onClick={() => onAdd(item)} style={{
                        background: "#7C3AED", color: "#fff", border: "none", borderRadius: 8,
                        padding: "7px 16px", fontSize: 13, fontWeight: 700, cursor: "pointer",
                      }}>Add</button>
                    ) : (
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <button onClick={() => onRemove(item.id)} style={qtyBtn}>−</button>
                        <span style={{ fontWeight: 700, fontSize: 14, minWidth: 16, textAlign: "center" }}>{qty}</span>
                        <button onClick={() => onAdd(item)} style={qtyBtn}>+</button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {checkout && (
        <CheckoutModal
          cart={cart}
          onClose={() => setCheckout(false)}
          onSuccess={(id, total) => {
            setCheckout(false);
            onAdd({ clearCart: true });
            setConfirmed({ id, total });
          }}
        />
      )}
    </div>
  );
}

const catPill = active => ({
  background: active ? "#7C3AED" : "#F9F8FF",
  color: active ? "#fff" : "#6B7280",
  border: active ? "none" : "1.5px solid #F1F0F8",
  borderRadius: 20, padding: "7px 16px", fontSize: 13, fontWeight: 600,
  cursor: "pointer", whiteSpace: "nowrap", transition: "all 0.15s",
});

// ─── Orders Tab ──────────────────────────────────────────────────────────────
function OrdersTab() {
  const { data: orders, loading, refresh } = useApi("/orders");
  const [selected, setSelected] = useState(null);
  const [detail, setDetail] = useState(null);
  const [updating, setUpdating] = useState(false);

  const loadDetail = async (id) => {
    const r = await fetch(API + "/orders/" + id);
    const d = await r.json();
    setDetail(d);
    setSelected(id);
  };

  const advanceStatus = async (order) => {
    const idx = STATUS_FLOW.indexOf(order.status);
    if (idx < 0 || idx >= STATUS_FLOW.length - 1) return;
    setUpdating(true);
    await fetch(API + "/orders/" + order.id + "/status", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: STATUS_FLOW[idx + 1] }),
    });
    await loadDetail(order.id);
    refresh();
    setUpdating(false);
  };

  const cancelOrder = async (id) => {
    await fetch(API + "/orders/" + id + "/status", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "cancelled" }),
    });
    await loadDetail(id);
    refresh();
  };

  return (
    <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
      {/* List */}
      <div style={{ width: 380, borderRight: "1px solid #F1F0F8", overflowY: "auto", padding: "20px 0" }}>
        <div style={{ padding: "0 20px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>All Orders</h3>
          <button onClick={refresh} style={{ background: "none", border: "1.5px solid #E5E7EB", borderRadius: 8, padding: "5px 12px", cursor: "pointer", fontSize: 12, color: "#6B7280", fontWeight: 600 }}>
            ↻ Refresh
          </button>
        </div>
        {loading ? <p style={{ padding: "0 20px", color: "#9CA3AF" }}>Loading…</p> :
          (orders || []).length === 0 ? <p style={{ padding: "0 20px", color: "#9CA3AF" }}>No orders yet</p> :
          (orders || []).map(o => (
            <div key={o.id} onClick={() => loadDetail(o.id)} style={{
              padding: "14px 20px", cursor: "pointer", borderBottom: "1px solid #F9F8FF",
              background: selected === o.id ? "#F5F3FF" : "transparent",
              borderLeft: selected === o.id ? "3px solid #7C3AED" : "3px solid transparent",
              transition: "background 0.1s",
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <p style={{ margin: "0 0 4px", fontWeight: 700, fontSize: 14, color: "#1a1625" }}>Order #{o.id}</p>
                  <p style={{ margin: "0 0 6px", fontSize: 12, color: "#9CA3AF" }}>{o.customer_name || "Guest"}</p>
                  <Badge status={o.status} />
                </div>
                <div style={{ textAlign: "right" }}>
                  <p style={{ margin: "0 0 4px", fontWeight: 700, color: "#7C3AED" }}>£{Number(o.total).toFixed(2)}</p>
                  <p style={{ margin: 0, fontSize: 11, color: "#9CA3AF" }}>{new Date(o.created_at).toLocaleString()}</p>
                </div>
              </div>
            </div>
          ))
        }
      </div>

      {/* Detail */}
      <div style={{ flex: 1, overflowY: "auto", padding: "28px 32px" }}>
        {!detail ? (
          <div style={{ textAlign: "center", paddingTop: 80, color: "#9CA3AF" }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>📋</div>
            <p>Select an order to view details</p>
          </div>
        ) : (
          <>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
              <div>
                <h2 style={{ margin: "0 0 6px", fontSize: 22, fontWeight: 800, color: "#1a1625" }}>Order #{detail.id}</h2>
                <p style={{ margin: 0, fontSize: 13, color: "#9CA3AF" }}>
                  {new Date(detail.created_at).toLocaleString()}
                </p>
              </div>
              <Badge status={detail.status} />
            </div>

            {/* Status Progress */}
            <div style={{ background: "#F9F8FF", borderRadius: 14, padding: "16px 20px", marginBottom: 24 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 0 }}>
                {STATUS_FLOW.map((s, i) => {
                  const idx = STATUS_FLOW.indexOf(detail.status);
                  const done = i <= idx && detail.status !== "cancelled";
                  const active = i === idx && detail.status !== "cancelled";
                  return (
                    <div key={s} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", position: "relative" }}>
                      {i > 0 && <div style={{
                        position: "absolute", top: 11, right: "50%", left: "-50%", height: 2,
                        background: done && !active ? "#7C3AED" : "#E5E7EB", zIndex: 0,
                      }} />}
                      <div style={{
                        width: 24, height: 24, borderRadius: "50%", zIndex: 1,
                        background: active ? "#7C3AED" : done ? "#7C3AED" : "#E5E7EB",
                        border: active ? "3px solid #C4B5FD" : "none",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 10, color: "#fff", fontWeight: 700,
                      }}>
                        {done && !active ? "✓" : ""}
                      </div>
                      <span style={{ fontSize: 10, marginTop: 4, color: active ? "#7C3AED" : "#9CA3AF", fontWeight: active ? 700 : 400, textTransform: "capitalize" }}>{s}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Customer */}
            <div style={{ background: "#fff", border: "1.5px solid #F1F0F8", borderRadius: 14, padding: "16px 20px", marginBottom: 18 }}>
              <h3 style={{ margin: "0 0 12px", fontSize: 13, fontWeight: 700, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.08em" }}>Customer</h3>
              <p style={{ margin: "0 0 4px", fontWeight: 600, color: "#1a1625" }}>{detail.customer_name || "Guest"}</p>
              {detail.customer_email && <p style={{ margin: "0 0 4px", fontSize: 13, color: "#6B7280" }}>{detail.customer_email}</p>}
              {detail.customer_address && <p style={{ margin: 0, fontSize: 13, color: "#6B7280" }}>📍 {detail.customer_address}</p>}
            </div>

            {/* Items */}
            <div style={{ background: "#fff", border: "1.5px solid #F1F0F8", borderRadius: 14, padding: "16px 20px", marginBottom: 18 }}>
              <h3 style={{ margin: "0 0 12px", fontSize: 13, fontWeight: 700, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.08em" }}>Items</h3>
              {detail.items.map((item, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: 10, marginBottom: 10, borderBottom: i < detail.items.length - 1 ? "1px solid #F9F8FF" : "none" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ fontSize: 22 }}>{item.image_emoji}</span>
                    <div>
                      <p style={{ margin: 0, fontWeight: 600, fontSize: 14 }}>{item.item_name}</p>
                      <p style={{ margin: 0, fontSize: 12, color: "#9CA3AF" }}>× {item.quantity} @ £{Number(item.unit_price).toFixed(2)}</p>
                    </div>
                  </div>
                  <span style={{ fontWeight: 700, color: "#374151" }}>£{Number(item.subtotal).toFixed(2)}</span>
                </div>
              ))}
              <div style={{ display: "flex", justifyContent: "space-between", paddingTop: 12, borderTop: "2px solid #F1F0F8" }}>
                <span style={{ fontWeight: 700, fontSize: 15 }}>Total</span>
                <span style={{ fontWeight: 800, fontSize: 16, color: "#7C3AED" }}>£{Number(detail.total).toFixed(2)}</span>
              </div>
            </div>

            {detail.notes && (
              <div style={{ background: "#FEF3C7", borderRadius: 12, padding: "12px 16px", marginBottom: 18, fontSize: 13, color: "#92400E" }}>
                📝 {detail.notes}
              </div>
            )}

            {/* Actions */}
            {detail.status !== "delivered" && detail.status !== "cancelled" && (
              <div style={{ display: "flex", gap: 10 }}>
                <button onClick={() => advanceStatus(detail)} disabled={updating} style={{
                  flex: 1, background: "linear-gradient(135deg, #7C3AED, #5B21B6)", color: "#fff",
                  border: "none", borderRadius: 10, padding: "12px", fontWeight: 700, fontSize: 14, cursor: "pointer",
                }}>
                  {updating ? "…" : `Mark as ${STATUS_FLOW[STATUS_FLOW.indexOf(detail.status) + 1] || "done"} →`}
                </button>
                <button onClick={() => cancelOrder(detail.id)} style={{
                  padding: "12px 18px", background: "#fff", border: "1.5px solid #FCA5A5", color: "#EF4444",
                  borderRadius: 10, fontWeight: 700, fontSize: 14, cursor: "pointer",
                }}>Cancel</button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ─── Dashboard Tab ───────────────────────────────────────────────────────────
function DashboardTab() {
  const { data: stats } = useApi("/stats");
  const { data: orders } = useApi("/orders");

  const metrics = stats ? [
    { label: "Today's Orders", value: stats.today_orders, icon: "📦" },
    { label: "Total Orders", value: stats.total_orders, icon: "📊" },
    { label: "Total Revenue", value: `£${Number(stats.total_revenue).toFixed(2)}`, icon: "💰" },
    { label: "Pending Now", value: stats.pending_orders, icon: "⏳" },
  ] : [];

  const statusCount = {};
  (orders || []).forEach(o => { statusCount[o.status] = (statusCount[o.status] || 0) + 1; });

  return (
    <div style={{ flex: 1, overflowY: "auto", padding: "28px 32px" }}>
      <h2 style={{ margin: "0 0 24px", fontSize: 22, fontWeight: 800, color: "#1a1625" }}>Dashboard</h2>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 28 }}>
        {metrics.map(m => (
          <div key={m.label} style={{ background: "#fff", border: "1.5px solid #F1F0F8", borderRadius: 16, padding: "20px 22px" }}>
            <div style={{ fontSize: 26, marginBottom: 8 }}>{m.icon}</div>
            <p style={{ margin: "0 0 4px", fontSize: 26, fontWeight: 800, color: "#1a1625" }}>{m.value}</p>
            <p style={{ margin: 0, fontSize: 13, color: "#9CA3AF", fontWeight: 500 }}>{m.label}</p>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        {/* Status breakdown */}
        <div style={{ background: "#fff", border: "1.5px solid #F1F0F8", borderRadius: 16, padding: "20px 24px" }}>
          <h3 style={{ margin: "0 0 18px", fontSize: 15, fontWeight: 700, color: "#1a1625" }}>Orders by Status</h3>
          {Object.entries(statusCount).length === 0 ? (
            <p style={{ color: "#9CA3AF", fontSize: 13 }}>No orders yet</p>
          ) : Object.entries(statusCount).map(([s, n]) => {
            const maxN = Math.max(...Object.values(statusCount));
            const c = STATUS_COLORS[s] || STATUS_COLORS.pending;
            return (
              <div key={s} style={{ marginBottom: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 5 }}>
                  <span style={{ textTransform: "capitalize", fontWeight: 600, color: "#374151" }}>{s}</span>
                  <span style={{ fontWeight: 700, color: c.text }}>{n}</span>
                </div>
                <div style={{ background: "#F3F4F6", borderRadius: 8, height: 8, overflow: "hidden" }}>
                  <div style={{ width: `${(n / maxN) * 100}%`, height: "100%", background: c.dot, borderRadius: 8, transition: "width 0.5s" }} />
                </div>
              </div>
            );
          })}
        </div>

        {/* Popular items */}
        <div style={{ background: "#fff", border: "1.5px solid #F1F0F8", borderRadius: 16, padding: "20px 24px" }}>
          <h3 style={{ margin: "0 0 18px", fontSize: 15, fontWeight: 700, color: "#1a1625" }}>Most Ordered</h3>
          {(stats?.popular_items || []).length === 0 ? (
            <p style={{ color: "#9CA3AF", fontSize: 13 }}>No data yet</p>
          ) : (stats?.popular_items || []).map((item, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 14 }}>
              <span style={{ fontSize: 32 }}>{item.image_emoji}</span>
              <div style={{ flex: 1 }}>
                <p style={{ margin: "0 0 3px", fontWeight: 600, fontSize: 14, color: "#1a1625" }}>{item.name}</p>
                <p style={{ margin: 0, fontSize: 12, color: "#9CA3AF" }}>{item.qty} orders</p>
              </div>
              <span style={{
                background: i === 0 ? "#FEF3C7" : "#F9F8FF",
                color: i === 0 ? "#92400E" : "#9CA3AF",
                fontSize: 12, fontWeight: 700, padding: "4px 10px", borderRadius: 20
              }}>#{i + 1}</span>
            </div>
          ))}
        </div>

        {/* Recent orders */}
        <div style={{ gridColumn: "1 / -1", background: "#fff", border: "1.5px solid #F1F0F8", borderRadius: 16, padding: "20px 24px" }}>
          <h3 style={{ margin: "0 0 16px", fontSize: 15, fontWeight: 700, color: "#1a1625" }}>Recent Orders</h3>
          {(orders || []).length === 0 ? <p style={{ color: "#9CA3AF", fontSize: 13 }}>No orders yet</p> : (
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: "1.5px solid #F1F0F8" }}>
                  {["Order", "Customer", "Total", "Status", "Time"].map(h => (
                    <th key={h} style={{ textAlign: "left", padding: "6px 12px 10px 0", fontWeight: 700, color: "#9CA3AF", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.07em" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(orders || []).slice(0, 8).map(o => (
                  <tr key={o.id} style={{ borderBottom: "1px solid #F9F8FF" }}>
                    <td style={{ padding: "10px 12px 10px 0", fontWeight: 700, color: "#7C3AED" }}>#{o.id}</td>
                    <td style={{ padding: "10px 12px 10px 0", color: "#374151" }}>{o.customer_name || "Guest"}</td>
                    <td style={{ padding: "10px 12px 10px 0", fontWeight: 700 }}>£{Number(o.total).toFixed(2)}</td>
                    <td style={{ padding: "10px 12px 10px 0" }}><Badge status={o.status} /></td>
                    <td style={{ padding: "10px 0", color: "#9CA3AF" }}>{new Date(o.created_at).toLocaleTimeString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Root App ────────────────────────────────────────────────────────────────
export default function App() {
  const [tab, setTab] = useState("menu");
  const [cart, setCart] = useState([]);
  const [showCart, setShowCart] = useState(true);
  const [checkout, setCheckout] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(null);

  const addToCart = (item) => {
    if (item?.clearCart) { setCart([]); return; }
    setCart(prev => {
      const ex = prev.find(i => i.id === item.id);
      if (ex) return prev.map(i => i.id === item.id ? { ...i, qty: i.qty + 1 } : i);
      return [...prev, { id: item.id, name: item.name, price: item.price, emoji: item.image_emoji, qty: 1 }];
    });
  };

  const removeFromCart = (id) => {
    setCart(prev => {
      const ex = prev.find(i => i.id === id);
      if (!ex) return prev;
      if (ex.qty <= 1) return prev.filter(i => i.id !== id);
      return prev.map(i => i.id === id ? { ...i, qty: i.qty - 1 } : i);
    });
  };

  const cartCount = cart.reduce((s, i) => s + i.qty, 0);

  const tabs = [
    { id: "menu", label: "Menu", icon: "🍽️" },
    { id: "orders", label: "Orders", icon: "📋" },
    { id: "dashboard", label: "Dashboard", icon: "📊" },
  ];

  return (
    <div style={{ display: "flex", height: "100vh", fontFamily: "'Segoe UI', system-ui, sans-serif", background: "#FAFAFA", overflow: "hidden" }}>
      {/* Sidebar Nav */}
      <div style={{ width: 220, background: "#1a1625", display: "flex", flexDirection: "column", padding: "0 0 20px" }}>
        <div style={{ padding: "24px 20px 20px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 28 }}>🍜</span>
            <div>
              <p style={{ margin: 0, fontSize: 16, fontWeight: 800, color: "#fff", letterSpacing: "-0.02em" }}>FoodOrder</p>
              <p style={{ margin: 0, fontSize: 11, color: "#7C3AED", fontWeight: 600 }}>Management System</p>
            </div>
          </div>
        </div>

        <div style={{ flex: 1, padding: "8px 12px" }}>
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              display: "flex", alignItems: "center", gap: 10, width: "100%",
              padding: "11px 14px", borderRadius: 10, border: "none", cursor: "pointer",
              background: tab === t.id ? "#7C3AED" : "transparent",
              color: tab === t.id ? "#fff" : "#9CA3AF",
              fontSize: 14, fontWeight: tab === t.id ? 700 : 500, textAlign: "left",
              marginBottom: 4, transition: "all 0.15s",
            }}>
              <span style={{ fontSize: 16 }}>{t.icon}</span>
              {t.label}
            </button>
          ))}
        </div>

        {/* Cart toggle */}
        {tab === "menu" && (
          <div style={{ padding: "0 12px" }}>
            <button onClick={() => setShowCart(!showCart)} style={{
              display: "flex", alignItems: "center", gap: 10, width: "100%",
              padding: "11px 14px", borderRadius: 10, border: "1.5px solid #2D2540",
              background: "transparent", color: "#9CA3AF", fontSize: 14, fontWeight: 500,
              cursor: "pointer", textAlign: "left",
            }}>
              <span>🛒</span>
              Cart
              {cartCount > 0 && (
                <span style={{ marginLeft: "auto", background: "#7C3AED", color: "#fff", borderRadius: 20, fontSize: 11, fontWeight: 700, padding: "2px 8px" }}>{cartCount}</span>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Main content */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        {/* Header */}
        <div style={{ display: "flex", flexDirection: "column", flex: 1, overflow: "hidden" }}>
          <div style={{ background: "#fff", borderBottom: "1px solid #F1F0F8", padding: "16px 28px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: "#1a1625" }}>
              {tabs.find(t => t.id === tab)?.icon} {tabs.find(t => t.id === tab)?.label}
            </h1>
            {tab === "menu" && cartCount > 0 && (
              <button onClick={() => setCheckout(true)} style={{
                background: "linear-gradient(135deg, #7C3AED, #5B21B6)", color: "#fff", border: "none",
                borderRadius: 10, padding: "10px 20px", fontSize: 14, fontWeight: 700, cursor: "pointer",
              }}>
                Checkout ({cartCount}) · £{cart.reduce((s, i) => s + i.price * i.qty, 0).toFixed(2)}
              </button>
            )}
          </div>

          <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
            {tab === "menu" && <MenuTab cart={cart} onAdd={addToCart} onRemove={removeFromCart} />}
            {tab === "orders" && <OrdersTab />}
            {tab === "dashboard" && <DashboardTab />}
          </div>
        </div>

        {/* Cart sidebar */}
        {tab === "menu" && showCart && (
          <CartSidebar
            cart={cart}
            onAdd={addToCart}
            onRemove={removeFromCart}
            onClear={() => setCart([])}
            onCheckout={() => setCheckout(true)}
          />
        )}
      </div>

      {checkout && (
        <CheckoutModal
          cart={cart}
          onClose={() => setCheckout(false)}
          onSuccess={(id, total) => {
            setCheckout(false);
            setCart([]);
            setTab("orders");
          }}
        />
      )}
    </div>
  );
}
