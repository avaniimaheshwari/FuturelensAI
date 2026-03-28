import { useState, useEffect, useRef, useCallback } from "react";

/* ═══════════════════════════════════════════════════
   CONSTANTS
═══════════════════════════════════════════════════ */
const API_BASE = "http://localhost:8001";

const COUNTRIES = [
  { value: "india",  label: "🇮🇳 India" },
  { value: "us",     label: "🇺🇸 US"    },
  { value: "uk",     label: "🇬🇧 UK"    },
  { value: "japan",  label: "🇯🇵 Japan" },
];

const STRATEGIES = [
  { value: "sip",    label: "SIP – Systematic Investment" },
  { value: "fd",     label: "FD – Fixed Deposit"          },
  { value: "crypto", label: "Crypto – Digital Assets"     },
];

const SCENARIO_CFG = {
  recession: { label: "Recession", sub: "Economic downturn scenario", icon: "📉", color: "#ef4444", border: "rgba(239,68,68,0.3)",  bg: "rgba(239,68,68,0.07)"  },
  normal:    { label: "Normal",    sub: "Stable market conditions",   icon: "➖", color: "#22d3ee", border: "rgba(34,211,238,0.3)", bg: "rgba(34,211,238,0.06)" },
  boom:      { label: "Boom",      sub: "High growth period",         icon: "📈", color: "#22c55e", border: "rgba(34,197,94,0.3)",  bg: "rgba(34,197,94,0.06)"  },
};

/* ═══════════════════════════════════════════════════
   UTILITIES
═══════════════════════════════════════════════════ */
function usd(n) {
  if (n == null || isNaN(+n)) return "—";
  return "$" + Math.round(+n).toLocaleString("en-US");
}

function stratLabel(v) {
  const s = STRATEGIES.find(x => x.value === v);
  return s ? s.label.split("–")[0].trim() : v;
}

/* count-up hook */
function useCountUp(target, ms = 1300) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!target) { setVal(0); return; }
    const num = +target;
    let start = null;
    const step = (ts) => {
      if (!start) start = ts;
      const p = Math.min((ts - start) / ms, 1);
      const ease = 1 - Math.pow(1 - p, 3);
      setVal(Math.round(ease * num));
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [target, ms]);
  return val;
}

/* load Chart.js from CDN once */
let chartJsLoaded = false;
function loadChartJs() {
  return new Promise((resolve) => {
    if (chartJsLoaded || window.Chart) { chartJsLoaded = true; return resolve(); }
    const script = document.createElement("script");
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.min.js";
    script.onload = () => { chartJsLoaded = true; resolve(); };
    document.head.appendChild(script);
  });
}

/* shared chart defaults */
function baseChartOpts() {
  return {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: "index", intersect: false },
    plugins: {
      legend: {
        labels: {
          color: "#4a6280",
          font: { family: "'DM Mono', monospace", size: 12 },
          boxWidth: 10, padding: 20,
          usePointStyle: true, pointStyle: "circle",
        },
      },
      tooltip: {
        backgroundColor: "#07111e",
        borderColor: "rgba(34,211,238,0.18)", borderWidth: 1,
        titleColor: "#e2e8f0", bodyColor: "#94a3b8",
        padding: 12,
        callbacks: {
          label: ctx => ` ${ctx.dataset.label}: $${Math.round(ctx.raw).toLocaleString()}`,
        },
      },
    },
    scales: {
      x: {
        grid: { color: "rgba(255,255,255,0.03)" },
        ticks: { color: "#253650", font: { family: "'DM Mono', monospace", size: 11 } },
      },
      y: {
        grid: { color: "rgba(255,255,255,0.03)" },
        ticks: {
          color: "#253650",
          font: { family: "'DM Mono', monospace", size: 11 },
          callback: v => "$" + (Math.abs(v) >= 1000 ? (v / 1000).toFixed(0) + "k" : v),
        },
      },
    },
  };
}

/* ═══════════════════════════════════════════════════
   COMPONENTS
═══════════════════════════════════════════════════ */

/* --- Canvas chart wrapper --- */
function LineChart({ id, config }) {
  const canvasRef = useRef(null);
  const instanceRef = useRef(null);
  useEffect(() => {
    if (!window.Chart || !config || !canvasRef.current) return;
    if (instanceRef.current) instanceRef.current.destroy();
    instanceRef.current = new window.Chart(canvasRef.current.getContext("2d"), config);
    return () => instanceRef.current?.destroy();
  }, [config]);
  return <canvas ref={canvasRef} id={id} style={{ width: "100%", height: "100%" }} />;
}

/* --- Metric Card --- */
function MetricCard({ label, value, sub, accent, iconBg, iconEl, up }) {
  const n = useCountUp(value);
  return (
    <div style={{
      flex: 1, minWidth: 195,
      background: "linear-gradient(155deg,#0c1e36 0%,#07111e 100%)",
      border: "1px solid rgba(255,255,255,0.07)",
      borderRadius: 16, padding: "24px 22px",
      boxShadow: "0 4px 24px rgba(0,0,0,0.45)",
      position: "relative", overflow: "hidden",
      transition: "border-color .2s",
    }}>
      {/* header row */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
        <div style={{
          width: 44, height: 44, borderRadius: 12,
          background: iconBg, display: "flex", alignItems: "center",
          justifyContent: "center", fontSize: 20,
        }}>{iconEl}</div>
        <span style={{ fontSize: 18, color: up ? accent : "#ef4444", fontWeight: 700 }}>
          {up ? "↗" : "↘"}
        </span>
      </div>
      {/* label */}
      <div style={{ fontSize: 11, color: "#253650", fontFamily: "'DM Mono',monospace", letterSpacing: "0.07em", textTransform: "uppercase", marginBottom: 6 }}>{label}</div>
      {/* value */}
      <div style={{ fontSize: 32, fontWeight: 800, color: accent, fontFamily: "'Syne',sans-serif", letterSpacing: "-0.02em", lineHeight: 1 }}>
        {value != null ? "$" + n.toLocaleString() : "—"}
      </div>
      {/* sub */}
      <div style={{ fontSize: 12, color: "#1a3050", fontFamily: "'DM Mono',monospace", marginTop: 8 }}>{sub}</div>
      {/* glow corner */}
      <div style={{
        position: "absolute", bottom: -28, right: -28, width: 88, height: 88,
        borderRadius: "50%", background: `radial-gradient(circle,${accent}22,transparent 70%)`,
        pointerEvents: "none",
      }} />
    </div>
  );
}

/* --- Section header --- */
function SH({ emoji, iconBg, title, sub }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 22 }}>
      <div style={{
        width: 42, height: 42, borderRadius: 11, background: iconBg,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 19, flexShrink: 0,
      }}>{emoji}</div>
      <div>
        <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: 18, color: "#e2e8f0" }}>{title}</div>
        {sub && <div style={{ fontSize: 12, color: "#1a3050", fontFamily: "'DM Mono',monospace", marginTop: 2 }}>{sub}</div>}
      </div>
    </div>
  );
}

/* --- Card --- */
function Card({ children, style = {} }) {
  return (
    <div style={{
      background: "linear-gradient(155deg,#0c1e36 0%,#07111e 100%)",
      border: "1px solid rgba(255,255,255,0.06)",
      borderRadius: 16, padding: "26px 30px",
      boxShadow: "0 4px 28px rgba(0,0,0,0.38)",
      marginBottom: 20, ...style,
    }}>{children}</div>
  );
}

/* --- Input field wrapper --- */
function Field({ label, children }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <label style={{ fontSize: 11, color: "#1a3050", fontFamily: "'DM Mono',monospace", letterSpacing: "0.07em", textTransform: "uppercase" }}>{label}</label>
      {children}
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   GLOBAL STYLES (injected once)
═══════════════════════════════════════════════════ */
const GLOBAL_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Syne:wght@600;700;800&family=DM+Sans:wght@300;400;500;600&family=DM+Mono:wght@400;500&display=swap');

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
html { scroll-behavior: smooth; }
body { background: #050d18; }

::-webkit-scrollbar { width: 5px; }
::-webkit-scrollbar-track { background: #050d18; }
::-webkit-scrollbar-thumb { background: #0d2040; border-radius: 3px; }

.fl-input {
  width: 100%;
  background: rgba(255,255,255,0.03);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 10px;
  padding: 12px 14px;
  color: #e2e8f0;
  font-size: 15px;
  font-family: 'DM Mono', monospace;
  outline: none;
  transition: border-color .2s;
}
.fl-input:focus { border-color: rgba(34,211,238,0.45); }
.fl-input-prefix { padding-left: 28px; }

.fl-select {
  width: 100%;
  background: #050d18;
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 10px;
  padding: 12px 14px;
  color: #e2e8f0;
  font-size: 14px;
  font-family: 'DM Sans', sans-serif;
  outline: none;
  cursor: pointer;
  transition: border-color .2s;
}
.fl-select:focus { border-color: rgba(34,211,238,0.45); }

.fl-btn-primary {
  background: linear-gradient(135deg,#0b4a6e,#22d3ee);
  border: none; border-radius: 12px;
  padding: 14px 44px;
  color: #050d18; font-size: 15px; font-weight: 700;
  font-family: 'Syne', sans-serif; cursor: pointer;
  letter-spacing: 0.02em;
  box-shadow: 0 4px 22px rgba(34,211,238,0.2);
  display: inline-flex; align-items: center; gap: 8px;
  transition: transform .15s, box-shadow .15s;
}
.fl-btn-primary:hover { transform: translateY(-2px); box-shadow: 0 8px 32px rgba(34,211,238,0.38); }
.fl-btn-primary:active { transform: scale(.98); }
.fl-btn-primary:disabled { background: rgba(34,211,238,0.1); color: #22d3ee; cursor: not-allowed; transform: none; box-shadow: none; }

.fl-btn-secondary {
  background: transparent;
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 10px; padding: 11px 26px;
  color: #2a4060; font-size: 14px; cursor: pointer;
  font-family: 'DM Sans', sans-serif;
  display: inline-flex; align-items: center; gap: 8px;
  transition: all .2s;
}
.fl-btn-secondary:hover { background: rgba(34,211,238,0.06); border-color: rgba(34,211,238,0.3); color: #22d3ee; }

.fl-spin { display: inline-block; animation: spin 1s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

.fl-badge {
  display: inline-flex; align-items: center; gap: 8px;
  background: rgba(34,211,238,0.07);
  border: 1px solid rgba(34,211,238,0.18);
  border-radius: 100px; padding: 5px 18px;
  font-size: 11px; color: #22d3ee;
  font-family: 'DM Mono', monospace; letter-spacing: 0.1em;
}
.fl-live-dot {
  width: 6px; height: 6px; border-radius: 50%;
  background: #22d3ee; box-shadow: 0 0 8px #22d3ee;
  display: inline-block;
  animation: pulse 2s ease-in-out infinite;
}
@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.3} }

.fl-news-item {
  display: flex; align-items: flex-start; gap: 14px;
  background: rgba(255,255,255,0.02);
  border: 1px solid rgba(255,255,255,0.04);
  border-radius: 10px; padding: 13px 16px;
  transition: background .18s;
}
.fl-news-item:hover { background: rgba(255,255,255,0.046); }

.fl-scen-card {
  border-radius: 14px; padding: 20px;
  position: relative; overflow: hidden;
  transition: transform .18s;
  cursor: default;
}
.fl-scen-card:hover { transform: translateY(-3px); }

.fl-stat-block {
  background: rgba(255,255,255,0.025);
  border: 1px solid rgba(255,255,255,0.05);
  border-radius: 12px; padding: 18px 20px;
}

.fl-tag {
  border-radius: 100px; padding: 4px 16px;
  font-size: 12px; font-family: 'DM Mono', monospace; font-weight: 500;
  display: inline-block;
}
`;

/* ═══════════════════════════════════════════════════
   MAIN APP
═══════════════════════════════════════════════════ */
export default function FutureLensAI() {
  /* form state */
  const [monthly,  setMonthly]  = useState(1000);
  const [years,    setYears]    = useState(10);
  const [country,  setCountry]  = useState("india");
  const [strategy, setStrategy] = useState("sip");

  /* data state */
  const [loading,  setLoading]  = useState(false);
  const [calcData, setCalcData] = useState(null);
  const [cmpData,  setCmpData]  = useState(null);
  const [error,    setError]    = useState(null);

  /* inject global CSS once */
  useEffect(() => {
    const id = "fl-global-styles";
    if (!document.getElementById(id)) {
      const el = document.createElement("style");
      el.id = id; el.textContent = GLOBAL_CSS;
      document.head.appendChild(el);
    }
  }, []);

  /* ── SIMULATE ── */
  async function simulate() {
    setLoading(true); setError(null);
    try {
      await loadChartJs();
      const [calcRes, cmpRes] = await Promise.all([
        fetch(`${API_BASE}/calculate?monthly_investment=${monthly}&years=${years}&scenario=${strategy}&country=${country}`),
        fetch(`${API_BASE}/compare?monthly_investment=${monthly}&years=${years}&country=${country}`),
      ]);
      if (!calcRes.ok || !cmpRes.ok) throw new Error("Server returned error");
      const [calc, cmp] = await Promise.all([calcRes.json(), cmpRes.json()]);
      setCalcData(calc); setCmpData(cmp);
    } catch (e) {
      setError("Cannot reach backend at http://127.0.0.1:8001. Make sure the server is running.");
    }
    setLoading(false);
  }

  /* ── CHART CONFIGS ── */
  const growthConfig = useCallback(() => {
    if (!calcData?.yearly_data?.length) return null;
    const labels = calcData.yearly_data.map((_, i) => `Year ${i}`);
    const data   = calcData.yearly_data.map(d => (typeof d === "object" ? d.value ?? d : d));
    return {
      type: "line",
      data: {
        labels,
        datasets: [{
          label: "Portfolio Value", data,
          borderColor: "#22d3ee",
          backgroundColor: ctx => {
            const g = ctx.chart.ctx.createLinearGradient(0, 0, 0, 280);
            g.addColorStop(0, "rgba(34,211,238,.24)"); g.addColorStop(1, "rgba(34,211,238,0)");
            return g;
          },
          fill: true, tension: 0.45, borderWidth: 2.5,
          pointRadius: 5, pointBackgroundColor: "#22d3ee",
          pointBorderColor: "#07111e", pointBorderWidth: 2,
        }],
      },
      options: baseChartOpts(),
    };
  }, [calcData]);

  const compareConfig = useCallback(() => {
    if (!cmpData) return null;
    const sipArr    = Array.isArray(cmpData.sip)    ? cmpData.sip    : Object.values(cmpData.sip    || {});
    const fdArr     = Array.isArray(cmpData.fd)     ? cmpData.fd     : Object.values(cmpData.fd     || {});
    const cryptoArr = Array.isArray(cmpData.crypto) ? cmpData.crypto : Object.values(cmpData.crypto || {});
    const length    = Math.max(sipArr.length, fdArr.length, cryptoArr.length);
    const labels    = Array.from({ length }, (_, i) => `Year ${i}`);
    const mkDs = (label, data, color) => ({
      label, data,
      borderColor: color,
      backgroundColor: color.replace("rgb(", "rgba(").replace(")", ",0.05)"),
      fill: true, tension: 0.45, borderWidth: 2.5,
      pointRadius: 4, pointBackgroundColor: color,
      pointBorderColor: "#07111e", pointBorderWidth: 2,
    });
    return {
      type: "line",
      data: {
        labels,
        datasets: [
          mkDs("SIP",    sipArr,    "#22d3ee"),
          mkDs("FD",     fdArr,     "#22c55e"),
          mkDs("Crypto", cryptoArr, "#f59e0b"),
        ],
      },
      options: baseChartOpts(),
    };
  }, [cmpData]);

  /* ── WHY TEXT ── */
  const whyText = calcData ? (() => {
    const r = calcData.inflation_rate;
    if (strategy === "sip")    return `With inflation at ${r}%, SIP (Systematic Investment Plan) is recommended. High inflation erodes purchasing power, but equity-linked investments historically outpace inflation over the long term, making SIP more effective for wealth preservation.`;
    if (strategy === "fd")     return `At ${r}% inflation, Fixed Deposits offer capital stability and guaranteed returns — ideal for conservative investors who prioritise predictability over maximum growth.`;
    if (strategy === "crypto") return `With ${r}% inflation, Crypto's high-growth potential can significantly outpace inflation over a long horizon. However, this comes with elevated volatility and risk, making it best for long-term, risk-tolerant investors.`;
    return "";
  })() : null;

  /* ── DOWNLOAD REPORT ── */
  function downloadReport() {
    if (!calcData) return;
    const lines = [
      "==============================",
      "   FutureLens AI – Report",
      "==============================",
      "",
      `Country:        ${country.toUpperCase()}`,
      `Strategy:       ${stratLabel(strategy)}`,
      `Monthly Input:  $${monthly.toLocaleString()}`,
      `Period:         ${years} Years`,
      "",
      "── Projections ──",
      `Future Value:   ${usd(calcData.future_value)}`,
      `Real Value:     ${usd(calcData.real_value)}`,
      `Inflation Loss: ${usd(calcData.inflation_loss)}`,
      `Inflation Rate: ${calcData.inflation_rate}%`,
      "",
      "── AI Recommendation ──",
      calcData.recommendation || "—",
      "",
      `News Impact:    ${calcData.news_impact ?? "—"}/100`,
      `Sentiment Score:${calcData.sentiment_score ?? "—"}/100`,
      "",
      "── Generated by FutureLens AI ──",
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/plain" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href = url; a.download = "futurelens-report.txt"; a.click();
    URL.revokeObjectURL(url);
  }

  /* ══════════════════ RENDER ══════════════════ */
  return (
    <div style={{ minHeight: "100vh", background: "#050d18", fontFamily: "'DM Sans',sans-serif", color: "#e2e8f0", position: "relative" }}>

      {/* ── top chromatic line ── */}
      <div style={{ position: "fixed", top: 0, left: 0, right: 0, height: 1, background: "linear-gradient(90deg,transparent 0%,rgba(34,211,238,.4) 50%,transparent 100%)", zIndex: 100 }} />

      {/* ── ambient radial bg ── */}
      <div style={{ position: "fixed", top: 0, left: "50%", transform: "translateX(-50%)", width: "800px", height: "500px", background: "radial-gradient(ellipse at 50% 0%,rgba(12,75,120,.32) 0%,transparent 65%)", pointerEvents: "none", zIndex: 0 }} />

      {/* ═══════ HERO ═══════ */}
      <div style={{ textAlign: "center", padding: "80px 24px 54px", position: "relative", zIndex: 1 }}>
        <div className="fl-badge" style={{ marginBottom: 28 }}>
          <span className="fl-live-dot" />
          FUTURELENS AI · WEALTH INTELLIGENCE
        </div>

        <h1 style={{
          fontFamily: "'Syne',sans-serif", fontWeight: 800,
          fontSize: "clamp(52px,8vw,86px)", letterSpacing: "-0.04em", lineHeight: 1,
          background: "linear-gradient(140deg,#e2e8f0 30%,#22d3ee 100%)",
          WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
          marginBottom: 18,
        }}>
          FutureLens AI
        </h1>

        <p style={{ fontSize: 18, color: "#1e3a5f", fontWeight: 300, marginBottom: 30 }}>
          Don't just invest.{" "}
          <span style={{ color: "#22d3ee", fontWeight: 500 }}>Predict your future wealth.</span>
        </p>

        <div style={{ display: "flex", gap: 28, justifyContent: "center", flexWrap: "wrap" }}>
          {["Real-time Analysis", "AI-Powered Insights", "Global Markets"].map(t => (
            <span key={t} style={{ fontSize: 13, color: "#1a3050", display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#22d3ee", display: "inline-block" }} />
              {t}
            </span>
          ))}
        </div>
      </div>

      {/* ═══════ MAIN CONTENT ═══════ */}
      <div style={{ maxWidth: 1080, margin: "0 auto", padding: "0 24px 100px", position: "relative", zIndex: 1 }}>

        {/* ─── INPUT PANEL ─── */}
        <Card>
          <SH emoji="📊" iconBg="linear-gradient(135deg,#0b4a6e,#22d3ee)" title="Investment Parameters" sub="Configure your simulation inputs" />

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(195px,1fr))", gap: 20, marginBottom: 28 }}>

            {/* monthly */}
            <Field label="Monthly Investment">
              <div style={{ position: "relative" }}>
                <span style={{ position: "absolute", left: 13, top: "50%", transform: "translateY(-50%)", color: "#1a3050", fontFamily: "'DM Mono',monospace" }}>$</span>
                <input
                  className="fl-input fl-input-prefix"
                  type="number" min={1}
                  value={monthly}
                  onChange={e => setMonthly(+e.target.value)}
                />
              </div>
            </Field>

            {/* years */}
            <Field label="Investment Period (Years)">
              <input
                className="fl-input"
                type="number" min={1} max={50}
                value={years}
                onChange={e => setYears(+e.target.value)}
              />
            </Field>

            {/* country */}
            <Field label="Country">
              <select className="fl-select" value={country} onChange={e => setCountry(e.target.value)}>
                {COUNTRIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </Field>

            {/* strategy */}
            <Field label="Strategy">
              <select className="fl-select" value={strategy} onChange={e => setStrategy(e.target.value)}>
                {STRATEGIES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </Field>
          </div>

          <button className="fl-btn-primary" onClick={simulate} disabled={loading}>
            {loading
              ? <><span className="fl-spin">⟳</span> Analyzing market conditions…</>
              : "⚡  Simulate"}
          </button>
        </Card>

        {/* ─── ERROR ─── */}
        {error && (
          <div style={{
            background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.22)",
            borderRadius: 12, padding: "14px 20px", color: "#f87171", fontSize: 14, marginBottom: 20,
          }}>
            ⚠&nbsp; {error}
          </div>
        )}

        {/* ─── RESULTS ─── */}
        {calcData && (
          <>

            {/* ── METRICS ── */}
            <div style={{ display: "flex", gap: 18, marginBottom: 20, flexWrap: "wrap" }}>
              <MetricCard
                label="Future Value" value={calcData.future_value}
                sub="Projected portfolio value"
                accent="#22d3ee" iconBg="linear-gradient(135deg,#0b4a6e,#22d3ee)" iconEl="📈" up
              />
              <MetricCard
                label="Real Value" value={calcData.real_value}
                sub="After inflation adjustment"
                accent="#22c55e" iconBg="linear-gradient(135deg,#054e3b,#22c55e)" iconEl="💼" up
              />
              <MetricCard
                label="Inflation Loss" value={calcData.inflation_loss}
                sub="Purchasing power lost"
                accent="#ef4444" iconBg="linear-gradient(135deg,#450a0a,#ef4444)" iconEl="⚠" up={false}
              />
            </div>

            {/* ── GROWTH CHART ── */}
            {calcData.yearly_data?.length > 0 && (
              <Card>
                <SH emoji="📈" iconBg="linear-gradient(135deg,#0b4a6e,#22d3ee)" title="Growth Projection" sub="Yearly portfolio value over time" />
                <div style={{ height: 288 }}>
                  <LineChart id="fl-growth" config={growthConfig()} />
                </div>
              </Card>
            )}

            {/* ── COMPARE CHART ── */}
            {cmpData && (
              <Card>
                <SH emoji="📊" iconBg="linear-gradient(135deg,#1a3a5f,#3b82f6)" title="Strategy Comparison" sub="SIP vs FD vs Crypto performance" />
                <div style={{ height: 300 }}>
                  <LineChart id="fl-compare" config={compareConfig()} />
                </div>
              </Card>
            )}

            {/* ── AI INSIGHTS ── */}
            {calcData.recommendation && (
              <Card>
                {/* heading row */}
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
                  <span style={{ color: "#22d3ee", fontSize: 16 }}>✦</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: "#22d3ee", fontFamily: "'DM Mono',monospace", letterSpacing: "0.09em" }}>AI RECOMMENDATION</span>
                </div>

                {/* recommendation text */}
                <p style={{ fontSize: 16, fontWeight: 600, color: "#e2e8f0", lineHeight: 1.8, marginBottom: 28 }}>
                  {calcData.recommendation}
                </p>

                {/* news impact + sentiment */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>

                  {calcData.news_impact != null && (
                    <div className="fl-stat-block">
                      <div style={{ fontSize: 13, color: "#1a3050", fontFamily: "'DM Mono',monospace", marginBottom: 4 }}>📰 News Impact</div>
                      <div style={{ display: "flex", alignItems: "baseline", gap: 4, margin: "8px 0 10px" }}>
                        <span style={{ fontSize: 42, fontWeight: 800, color: "#22c55e", fontFamily: "'Syne',sans-serif" }}>{calcData.news_impact}</span>
                        <span style={{ fontSize: 13, color: "#1a3050", fontFamily: "'DM Mono',monospace" }}>/100</span>
                      </div>
                      <div style={{ height: 5, borderRadius: 3, background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
                        <div style={{ height: "100%", borderRadius: 3, background: "linear-gradient(90deg,#22c55e,#16a34a)", width: `${calcData.news_impact}%`, transition: "width 1.4s ease" }} />
                      </div>
                    </div>
                  )}

                  {(calcData.sentiment_score != null || calcData.market_sentiment != null) && (
                    <div className="fl-stat-block">
                      <div style={{ fontSize: 13, color: "#1a3050", fontFamily: "'DM Mono',monospace", marginBottom: 4 }}>📈 Market Sentiment</div>
                      <div style={{ display: "flex", alignItems: "baseline", gap: 4, margin: "8px 0 10px" }}>
                        <span style={{ fontSize: 42, fontWeight: 800, color: "#22c55e", fontFamily: "'Syne',sans-serif" }}>
                          {calcData.sentiment_score ?? calcData.market_sentiment}
                        </span>
                        <span style={{ fontSize: 13, color: "#1a3050", fontFamily: "'DM Mono',monospace" }}>/100</span>
                      </div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: "#22c55e", fontFamily: "'DM Mono',monospace" }}>
                        {(calcData.sentiment_score ?? calcData.market_sentiment) > 65 ? "Bullish" : (calcData.sentiment_score ?? calcData.market_sentiment) > 40 ? "Neutral" : "Bearish"}
                      </div>
                    </div>
                  )}
                </div>
              </Card>
            )}

            {/* ── SCENARIO ANALYSIS ── */}
            {cmpData?.scenario_analysis && (
              <Card>
                <SH emoji="🛡" iconBg="linear-gradient(135deg,#1e1b4b,#6366f1)" title="Scenario Analysis" sub="Best strategy by market condition" />
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(215px,1fr))", gap: 16 }}>
                  {Object.entries(cmpData.scenario_analysis).map(([key, val]) => {
                    const cfg = SCENARIO_CFG[key] || SCENARIO_CFG.normal;
                    const best = typeof val === "object" ? (val.best_strategy ?? JSON.stringify(val)) : String(val);
                    return (
                      <div key={key} className="fl-scen-card" style={{ background: cfg.bg, border: `1px solid ${cfg.border}` }}>
                        {/* top accent bar */}
                        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg,${cfg.color}90,transparent)`, borderRadius: "14px 14px 0 0" }} />

                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5 }}>
                          <span style={{ fontSize: 16 }}>{cfg.icon}</span>
                          <span style={{ fontFamily: "'Syne',sans-serif", fontWeight: 700, color: cfg.color, fontSize: 16 }}>{cfg.label}</span>
                        </div>
                        <div style={{ fontSize: 12, color: "#1a3050", fontFamily: "'DM Mono',monospace", marginBottom: 16 }}>{cfg.sub}</div>
                        <div style={{ fontSize: 11, color: "#1a3050", textTransform: "uppercase", letterSpacing: "0.08em", fontFamily: "'DM Mono',monospace", marginBottom: 8 }}>Best:</div>
                        <div style={{
                          background: `${cfg.color}18`, border: `1px solid ${cfg.color}30`,
                          borderRadius: 9, padding: "10px 14px",
                          fontSize: 13, fontWeight: 600, color: cfg.color, lineHeight: 1.5,
                        }}>{best}</div>
                      </div>
                    );
                  })}
                </div>
              </Card>
            )}

            {/* ── WHY THIS STRATEGY ── */}
            {whyText && (
              <Card>
                <SH emoji="💡" iconBg="linear-gradient(135deg,#78350f,#f59e0b)" title="Why This Strategy?" sub="AI-generated explanation" />
                <p style={{ fontSize: 15, color: "#cbd5e1", lineHeight: 1.85, fontWeight: 500, marginBottom: 20 }}>{whyText}</p>

                <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 20 }}>
                  <span className="fl-tag" style={{ background: "rgba(34,211,238,.1)", border: "1px solid rgba(34,211,238,.22)", color: "#22d3ee" }}>
                    Inflation: {calcData.inflation_rate}%
                  </span>
                  <span className="fl-tag" style={{ background: "rgba(34,197,94,.1)", border: "1px solid rgba(34,197,94,.22)", color: "#22c55e" }}>
                    Strategy: {stratLabel(strategy)}
                  </span>
                </div>

                {calcData.recommendation && (
                  <div style={{
                    background: "rgba(34,211,238,0.04)", border: "1px solid rgba(34,211,238,0.1)",
                    borderRadius: 10, padding: "12px 16px", fontSize: 13, color: "#1e3a5f", lineHeight: 1.7,
                  }}>
                    Recommended: {calcData.recommendation}
                  </div>
                )}
              </Card>
            )}

            {/* ── NEWS ── */}
            {Array.isArray(calcData.news) && calcData.news.length > 0 && (
              <Card>
                <SH emoji="📰" iconBg="linear-gradient(135deg,#1a3a5f,#3b82f6)" title="Market News" sub="Latest headlines affecting your strategy" />
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {calcData.news.slice(0, 5).map((item, i) => (
                    <div key={i} className="fl-news-item">
                      <span style={{ fontSize: 11, color: "#22d3ee", fontFamily: "'DM Mono',monospace", paddingTop: 2, minWidth: 22 }}>
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <span style={{ fontSize: 14, color: "#94a3b8", lineHeight: 1.6 }}>
                        {typeof item === "string" ? item : item.title ?? item.headline ?? JSON.stringify(item)}
                      </span>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* ── EXPORT ── */}
            <div style={{ display: "flex", justifyContent: "flex-end", paddingTop: 4 }}>
              <button className="fl-btn-secondary" onClick={downloadReport}>
                ⬇&nbsp; Download Report
              </button>
            </div>

          </>
        )}

        {/* ─── EMPTY STATE ─── */}
        {!calcData && !loading && (
          <div style={{ textAlign: "center", padding: "80px 0 120px", color: "#0d2040" }}>
            <div style={{ fontSize: 56, marginBottom: 18 }}>🔭</div>
            <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 22, marginBottom: 10, color: "#0d2040" }}>
              Enter your parameters above
            </div>
            <div style={{ fontSize: 14, color: "#0d2040" }}>
              Your personalised wealth projection will appear here.
            </div>
          </div>
        )}

      </div>{/* /content */}
    </div>
  );
}