import { useState, useEffect } from "react";

// ── 색상 팔레트 ──────────────────────────────────────────────────────────────
const C = {
  bg:     "#080c14",
  panel:  "#0d1524",
  border: "#1a2e4a",
  accent: "#00d4ff",
  gold:   "#f5c842",
  red:    "#ff4655",
  green:  "#39d98a",
  muted:  "#4a6280",
  text:   "#c8dff5",
  bright: "#e8f4ff",
};

// ── 데이터 fetch ──────────────────────────────────────────────────────────────
// GitHub Pages에서는 /swgoh-meta/data/gac-5v5.json 경로로 접근
// Vite dev 서버에서는 /data/gac-5v5.json
function useGACData() {
  const [data5v5, setData5v5] = useState(null);
  const [data3v3, setData3v3] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState(null);
  const [lastFetch, setLastFetch] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [r5, r3] = await Promise.all([
        fetch("data/gac-5v5.json?t=" + Date.now()),
        fetch("data/gac-3v3.json?t=" + Date.now()),
      ]);
      if (!r5.ok || !r3.ok) throw new Error("데이터 파일을 찾을 수 없습니다");
      const [j5, j3] = await Promise.all([r5.json(), r3.json()]);
      setData5v5(j5);
      setData3v3(j3);
      setLastFetch(new Date().toLocaleString("ko-KR"));
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);
  return { data5v5, data3v3, loading, error, lastFetch, refetch: fetchData };
}

// ── 작은 컴포넌트들 ───────────────────────────────────────────────────────────
const StarField = () => {
  const stars = Array.from({ length: 60 }, (_, i) => ({
    x: (i * 137.508) % 100,
    y: (i * 97.3) % 100,
    s: (i % 3) * 0.5 + 0.5,
    d: (i % 4) + 1.5,
  }));
  return (
    <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0 }}>
      <style>{`@keyframes tw{from{opacity:.15}to{opacity:.75}}`}</style>
      {stars.map((s, i) => (
        <div key={i} style={{
          position: "absolute", left: `${s.x}%`, top: `${s.y}%`,
          width: s.s, height: s.s, borderRadius: "50%", background: "#fff",
          animation: `tw ${s.d}s ease-in-out infinite alternate`,
          animationDelay: `${(i % 10) * 0.3}s`,
        }} />
      ))}
    </div>
  );
};

const WinBar = ({ pct, color = C.accent }) => {
  const num = parseFloat(pct) || 0;
  return (
    <div style={{ height: 5, background: "#1a2e4a", borderRadius: 3, overflow: "hidden", marginTop: 6 }}>
      <div style={{
        height: "100%", width: `${Math.min(num, 100)}%`,
        background: `linear-gradient(90deg,${color}66,${color})`,
        borderRadius: 3, transition: "width 0.8s ease",
      }} />
    </div>
  );
};

const Badge = ({ label, color = C.muted }) => (
  <span style={{
    fontSize: 10, fontWeight: 700, letterSpacing: 1,
    padding: "2px 7px", borderRadius: 3,
    border: `1px solid ${color}44`, color, background: `${color}15`,
    textTransform: "uppercase", whiteSpace: "nowrap",
  }}>{label}</span>
);

// ── 카운터 카드 ───────────────────────────────────────────────────────────────
const CounterCard = ({ item, index }) => {
  const [open, setOpen] = useState(false);
  const winNum = parseFloat(item.winRate) || 0;
  const barColor = winNum >= 70 ? C.green : winNum >= 50 ? C.gold : C.red;

  return (
    <div
      onClick={() => setOpen(!open)}
      style={{
        background: open ? `${C.accent}08` : C.panel,
        border: `1px solid ${open ? C.accent + "44" : C.border}`,
        borderRadius: 10, padding: "13px 15px", cursor: "pointer",
        transition: "all 0.2s",
      }}
    >
      {/* 헤더 행 */}
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        {/* 순위 */}
        <div style={{
          width: 30, height: 30, borderRadius: "50%", flexShrink: 0,
          background: index < 3
            ? [`linear-gradient(135deg,${C.gold},#b8860b)`,
               `linear-gradient(135deg,#c0c0c0,#888)`,
               `linear-gradient(135deg,#cd7f32,#8b4513)`][index]
            : C.border,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 12, fontWeight: 800,
          color: index < 3 ? "#000" : C.muted,
          fontFamily: "'Orbitron',sans-serif",
        }}>{index + 1}</div>

        {/* 방어 이름 + 바 */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span style={{ fontWeight: 700, color: C.bright, fontSize: 14 }}>
              {item.defense || item["Defense Leader"] || Object.values(item)[0] || "—"}
            </span>
            {item.battleCount && (
              <span style={{ fontSize: 11, color: C.muted }}>
                {item.battleCount} 전
              </span>
            )}
          </div>
          {item.winRate
            ? <WinBar pct={winNum} color={barColor} />
            : <div style={{ height: 5, marginTop: 6 }} />
          }
        </div>

        {/* 승률 / Hold% */}
        <div style={{ textAlign: "right", flexShrink: 0 }}>
          {item.winRate ? (
            <>
              <div style={{ fontSize: 17, fontWeight: 800, color: barColor, fontFamily: "'Orbitron',sans-serif" }}>
                {item.winRate}
              </div>
              <div style={{ fontSize: 10, color: C.muted }}>Hold%</div>
            </>
          ) : (
            <span style={{ color: C.muted, fontSize: 20 }}>{open ? "▲" : "▼"}</span>
          )}
        </div>
      </div>

      {/* 펼침: 카운터 목록 */}
      {open && (
        <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${C.border}` }}>
          {item.counters && item.counters.length > 0 ? (
            <>
              <div style={{ fontSize: 11, color: C.muted, letterSpacing: 1, marginBottom: 8 }}>카운터 팀</div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {item.counters.map((c, i) => (
                  <span key={i} style={{
                    fontSize: 12, padding: "4px 10px", borderRadius: 16,
                    background: C.border, color: C.text, fontWeight: 500,
                  }}>{c}</span>
                ))}
              </div>
            </>
          ) : (
            // 테이블 형태로 수집된 경우 모든 필드 표시
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {Object.entries(item)
                .filter(([k]) => k !== "defense")
                .map(([k, v]) => (
                  <div key={k} style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                    <span style={{ color: C.muted }}>{k}</span>
                    <span style={{ color: C.text }}>{String(v)}</span>
                  </div>
                ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ── 탭 패널 ───────────────────────────────────────────────────────────────────
const GACPanel = ({ data, type }) => {
  if (!data) return (
    <div style={{ textAlign: "center", padding: 40, color: C.muted }}>
      데이터 없음
    </div>
  );

  const counters = data.counters || [];
  const crawledAt = data.crawledAt
    ? new Date(data.crawledAt).toLocaleString("ko-KR")
    : "—";

  return (
    <div>
      {/* 시즌 정보 헤더 */}
      <div style={{
        background: C.panel, border: `1px solid ${C.border}`,
        borderRadius: 10, padding: "14px 16px", marginBottom: 16,
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
          <div>
            <div style={{ fontSize: 11, color: C.muted, letterSpacing: 1 }}>시즌</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: C.bright, marginTop: 2 }}>
              {data.season || `GAC ${type}`}
            </div>
          </div>
          {data.totalBattles && (
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 11, color: C.muted, letterSpacing: 1 }}>분석 배틀 수</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: C.accent, marginTop: 2 }}>
                {data.totalBattles}
              </div>
            </div>
          )}
        </div>
        <div style={{ marginTop: 10, fontSize: 11, color: C.muted }}>
          🕐 마지막 크롤링: {crawledAt}
        </div>
        {data.error && (
          <div style={{
            marginTop: 10, fontSize: 12, color: C.red,
            background: `${C.red}11`, borderRadius: 6, padding: "8px 10px",
          }}>
            ⚠️ 크롤링 오류: {data.error}
          </div>
        )}
      </div>

      {/* 카운터 목록 */}
      {counters.length > 0 ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {counters.map((item, i) => (
            <CounterCard key={i} item={item} index={i} />
          ))}
        </div>
      ) : (
        <div style={{
          textAlign: "center", padding: "48px 20px",
          color: C.muted, background: C.panel,
          border: `1px dashed ${C.border}`, borderRadius: 10,
        }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>🤖</div>
          <div style={{ fontSize: 15, fontWeight: 600, color: C.text, marginBottom: 8 }}>
            아직 크롤링된 데이터가 없어요
          </div>
          <div style={{ fontSize: 13, lineHeight: 1.7 }}>
            GitHub Actions 워크플로우를 수동으로 한 번 실행하거나<br />
            매일 오전 9시 자동 크롤링을 기다려 주세요.
          </div>
        </div>
      )}
    </div>
  );
};

// ── 루트 App ──────────────────────────────────────────────────────────────────
const TABS = [
  { id: "5v5", label: "5v5", icon: "⚔" },
  { id: "3v3", label: "3v3", icon: "🛡" },
];

export default function App() {
  const [tab, setTab] = useState("5v5");
  const { data5v5, data3v3, loading, error, lastFetch, refetch } = useGACData();

  return (
    <div style={{
      minHeight: "100vh", background: C.bg, color: C.text,
      fontFamily: "'Rajdhani','Segoe UI',sans-serif",
      position: "relative",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@700;800;900&family=Rajdhani:wght@400;500;600;700&display=swap');
        *{box-sizing:border-box;}
        ::-webkit-scrollbar{width:4px}
        ::-webkit-scrollbar-thumb{background:#1a2e4a;border-radius:2px}
        @keyframes spin{to{transform:rotate(360deg)}}
      `}</style>

      <StarField />

      <div style={{ position: "relative", zIndex: 1, maxWidth: 680, margin: "0 auto" }}>

        {/* 헤더 */}
        <div style={{
          padding: "40px 16px 24px", textAlign: "center",
          borderBottom: `1px solid ${C.border}`,
          background: "linear-gradient(180deg,#0a1628 0%,transparent 100%)",
        }}>
          <div style={{ fontSize: 10, letterSpacing: 6, color: C.accent, marginBottom: 10, fontFamily: "'Orbitron',sans-serif" }}>
            STAR WARS: GALAXY OF HEROES
          </div>
          <h1 style={{
            fontSize: "clamp(24px,6vw,42px)", fontWeight: 900, margin: "0 0 8px",
            fontFamily: "'Orbitron',sans-serif", letterSpacing: 2,
            background: `linear-gradient(135deg,${C.bright} 0%,${C.accent} 55%,${C.gold} 100%)`,
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
          }}>SWGOH META HUB</h1>
          <p style={{ fontSize: 13, color: C.muted, margin: "0 0 16px" }}>
            GAC 메타 분석 · 실시간 카운터 데이터
          </p>

          {/* 새로고침 버튼 */}
          <button
            onClick={refetch}
            disabled={loading}
            style={{
              background: "transparent", border: `1px solid ${C.accent}55`,
              color: C.accent, borderRadius: 20, padding: "7px 18px",
              fontSize: 12, cursor: loading ? "not-allowed" : "pointer",
              fontFamily: "'Orbitron',sans-serif", letterSpacing: 1,
              opacity: loading ? 0.5 : 1, transition: "all 0.2s",
            }}
          >
            {loading ? "로딩 중..." : "🔄 새로고침"}
          </button>

          {lastFetch && (
            <div style={{ fontSize: 11, color: C.muted, marginTop: 8 }}>
              앱 로드: {lastFetch}
            </div>
          )}
        </div>

        {/* 탭 */}
        <div style={{
          display: "flex", gap: 4, padding: "10px 16px",
          position: "sticky", top: 0, zIndex: 10,
          background: `${C.bg}ee`, backdropFilter: "blur(12px)",
          borderBottom: `1px solid ${C.border}`,
        }}>
          {TABS.map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              flex: 1, padding: "10px 0", border: "none", cursor: "pointer",
              borderRadius: 8, fontFamily: "'Orbitron',sans-serif",
              fontSize: 13, fontWeight: 700, letterSpacing: 1,
              background: tab === t.id ? `${C.accent}15` : "transparent",
              color: tab === t.id ? C.accent : C.muted,
              borderBottom: `2px solid ${tab === t.id ? C.accent : "transparent"}`,
              transition: "all 0.2s",
            }}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        {/* 컨텐츠 */}
        <div style={{ padding: "16px 16px 60px" }}>
          {/* 로딩 */}
          {loading && (
            <div style={{ textAlign: "center", padding: 60, color: C.muted }}>
              <div style={{
                width: 40, height: 40, border: `3px solid ${C.border}`,
                borderTop: `3px solid ${C.accent}`, borderRadius: "50%",
                animation: "spin 0.8s linear infinite", margin: "0 auto 16px",
              }} />
              데이터 불러오는 중...
            </div>
          )}

          {/* 에러 */}
          {!loading && error && (
            <div style={{
              background: `${C.red}11`, border: `1px solid ${C.red}44`,
              borderRadius: 10, padding: "20px 16px", textAlign: "center",
            }}>
              <div style={{ fontSize: 24, marginBottom: 8 }}>⚠️</div>
              <div style={{ color: C.red, fontWeight: 600, marginBottom: 6 }}>데이터 로드 실패</div>
              <div style={{ color: C.muted, fontSize: 13, marginBottom: 12 }}>{error}</div>
              <div style={{ color: C.text, fontSize: 12, lineHeight: 1.8 }}>
                GitHub Actions를 먼저 실행해서<br />
                <code style={{ color: C.accent }}>data/gac-5v5.json</code>,&nbsp;
                <code style={{ color: C.accent }}>data/gac-3v3.json</code><br />
                파일을 생성해 주세요.
              </div>
            </div>
          )}

          {/* 정상 데이터 */}
          {!loading && !error && (
            tab === "5v5"
              ? <GACPanel data={data5v5} type="5v5" />
              : <GACPanel data={data3v3} type="3v3" />
          )}
        </div>

        {/* 푸터 */}
        <div style={{
          textAlign: "center", padding: "16px",
          borderTop: `1px solid ${C.border}`,
          fontSize: 11, color: C.muted, letterSpacing: 1,
        }}>
          SWGOH META HUB · 데이터 제공: swgoh.gg · May the Force be with you
        </div>
      </div>
    </div>
  );
}
