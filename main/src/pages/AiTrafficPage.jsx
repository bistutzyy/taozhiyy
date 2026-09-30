import { useEffect, useMemo, useState } from "react";
import { fetchChatStats } from "../services/chatStatsApi";

const CHART_EMPTY =
  "还没有提问记录，等第一个人来问问博客吧 ✦";

const BAR_COLORS = [
  "linear-gradient(180deg, #A5D8FF 0%, #74C0FC 100%)",
  "linear-gradient(180deg, #FFE066 0%, #FFD43B 100%)",
  "linear-gradient(180deg, #FFC9C9 0%, #FF8FAB 100%)",
];

const maxBar = (rows, pick) => {
  let m = 1;
  for (const row of rows) {
    const v = pick(row);
    if (v > m) m = v;
  }
  return m;
};

const BarChart = ({ rows, pick, compact, emptyLabel = CHART_EMPTY }) => {
  const peak = maxBar(rows, pick);
  const hasData = rows.length > 0 && peak > 0;

  if (!hasData) {
    return (
      <div
        className={`flex items-center justify-center rounded-2xl border border-dashed border-[#F2E6C9] bg-[#FFFBF0]/80 px-4 text-center text-sm leading-relaxed text-[#6B7280] ${
          compact ? "min-h-[88px] py-4" : "min-h-[100px] py-5"
        }`}
      >
        {emptyLabel}
      </div>
    );
  }

  return (
    <div className={`flex items-end gap-1 sm:gap-2 ${compact ? "h-36" : "h-44"}`}>
      {rows.map((row, i) => {
        const v = pick(row);
        const barHeight = v > 0 ? Math.max(14, Math.round((v / peak) * 100)) : 4;
        return (
          <div
            key={row.key}
            className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1"
            title={`${row.label}: ${v}`}
          >
            <div
              className="flex min-h-0 w-full flex-1 flex-col items-center justify-end gap-1"
            >
              <span
                className="text-[9px] font-semibold text-[#6B7280] sm:text-[10px]"
                style={{ opacity: v > 0 ? 1 : 0.4 }}
              >
                {v}
              </span>
              <div
                className="w-full max-w-[28px] rounded-t-lg transition-all"
                style={{
                  height: `${barHeight}%`,
                  background: BAR_COLORS[i % BAR_COLORS.length],
                  boxShadow: "0 4px 12px rgba(116, 192, 252, 0.2)",
                  opacity: v > 0 ? 1 : 0.22,
                }}
              />
            </div>
            <span
              className="truncate text-[9px] text-[#6B7280] sm:text-[10px]"
              style={{
                minHeight: "14px",
              }}
            >
              {row.label}
            </span>
          </div>
        );
      })}
    </div>
  );
};

const StatCard = ({ label, value, hint, accent, children }) => (
  <div className="ai-stat-card relative overflow-hidden rounded-[20px] border border-[#F2E6C9] bg-white px-3 pb-3 pt-4 shadow-[0_12px_30px_rgba(255,143,171,0.12)] sm:px-4 sm:pb-4 sm:pt-5">
    <div
      className="absolute inset-x-0 top-0 h-1.5 rounded-t-[20px]"
      style={{ background: accent }}
      aria-hidden
    />
    <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#6B7280]">
      {label}
    </p>
    <div className="mt-2 min-h-[2rem] font-zentry text-2xl font-black text-[#2B2B2B] md:text-3xl">
      {children ?? value}
    </div>
    {hint ? <p className="mt-1.5 text-xs leading-snug text-[#6B7280]">{hint}</p> : null}
  </div>
);

const AiTrafficPage = () => {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await fetchChatStats(14);
        if (!cancelled) setStats(data);
      } catch (e) {
        if (!cancelled) setError(e.message || "加载失败");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const dailyBars = useMemo(() => {
    if (!stats?.daily?.length) return [];
    return stats.daily.map((d) => ({
      key: d.date,
      label: d.date.slice(5),
      total: d.total,
      success: d.success,
    }));
  }, [stats]);

  const hourlyBars = useMemo(() => {
    if (!stats?.hourlyToday?.length) return [];
    return stats.hourlyToday.map((h) => ({
      key: h.hour,
      label: h.hour,
      total: h.total,
      success: h.success,
    }));
  }, [stats]);

  const summary = stats?.summary;
  const configured = stats?.configured;

  return (
    <section
      className="ai-traffic-page relative min-h-screen overflow-x-hidden pb-16 pt-16 md:pb-20 md:pt-20"
      style={{
        background:
          "linear-gradient(135deg, #FFF8E7 0%, #FFFDF5 45%, #EAF6FF 100%)",
      }}
    >
      <div
        className="pointer-events-none absolute -left-16 top-24 h-56 w-56 rounded-full bg-[#FFD43B]/20 blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -right-10 bottom-32 h-64 w-64 rounded-full bg-[#FF8FAB]/15 blur-3xl"
        aria-hidden
      />

      <div className="ai-traffic-shell relative mx-auto w-full max-w-[1100px] px-3 sm:px-4 md:px-6">
        <p className="text-[10px] font-semibold uppercase tracking-[0.35em] text-[#FF8FAB]">
          博客小精灵面板
        </p>
        <h1 className="mt-2 text-3xl font-black tracking-tight text-[#2B2B2B] md:text-5xl">
          <span className="text-[#FF8FAB]">✦</span> 数据中心
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-[#6B7280]">
          实时呈现 AI 调用流量，让每一次访问都留下可被回看的痕迹。
        </p>

        {loading && (
          <p className="mt-8 text-sm text-[#6B7280]">加载统计中…</p>
        )}
        {error && (
          <p className="mt-8 rounded-[20px] border border-[#FFC9C9] bg-white px-4 py-3 text-sm text-[#C92A2A] shadow-[0_8px_24px_rgba(255,143,171,0.1)]">
            {error}
          </p>
        )}

        {stats && !error && (
          <>
            <div className="ai-stat-grid mt-8 grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4 lg:gap-6">
              <StatCard
                label="今日提问"
                value={summary?.todaySuccess ?? 0}
                hint={`今日请求 ${summary?.todayTotal ?? 0} 次`}
                accent="#FFD43B"
              />
              <StatCard
                label="近 14 日"
                value={summary?.periodSuccess ?? 0}
                hint={`合计 ${summary?.periodTotal ?? 0} 次`}
                accent="#74C0FC"
              />
              <StatCard
                label="成功率"
                accent="#FF8FAB"
              >
                <span className="text-[#FF8FAB]">{summary?.successRateText ?? "0%"}</span>
              </StatCard>
              <StatCard
                label="服务状态"
                accent="#51CF66"
                hint={
                  configured
                    ? "Key 已在服务器就绪"
                    : "等待 DEEPSEEK_API_KEY"
                }
              >
                {configured ? (
                  <span className="inline-flex items-center rounded-full border border-[#B2F2BB] bg-[#E6FCF5] px-3 py-1 text-sm font-bold text-[#2B8A3E]">
                    已配置
                  </span>
                ) : (
                  <span className="inline-flex items-center rounded-full border border-[#FFE8CC] bg-[#FFF4E6] px-3 py-1 text-sm font-bold text-[#E67700]">
                    未配置
                  </span>
                )}
              </StatCard>
            </div>

            <div className="mt-10 mb-3 flex items-center gap-3">
              <span className="h-px flex-1 bg-gradient-to-r from-transparent via-[#F2E6C9] to-transparent" />
              <span className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[#FF8FAB]">
                ✦ AI 调用流量
              </span>
              <span className="h-px flex-1 bg-gradient-to-r from-transparent via-[#F2E6C9] to-transparent" />
            </div>

            <div className="mt-6 space-y-6">
              <div className="rounded-[20px] border border-[#F2E6C9] bg-white p-5 shadow-[0_12px_30px_rgba(255,143,171,0.12)] md:p-7">
                <h2 className="text-lg font-bold text-[#2B2B2B]">
                  <span className="mr-1 text-[#74C0FC]">◆</span>
                  近 14 日每日流量
                </h2>
                <p className="mt-1 text-xs text-[#6B7280]">
                  柱高 = 当日总请求（成功 + 失败 + 限流）
                </p>
                <div className="mt-5">
                  <BarChart rows={dailyBars} pick={(r) => r.total} />
                </div>
              </div>

              <div className="rounded-[20px] border border-[#F2E6C9] bg-white p-5 shadow-[0_12px_30px_rgba(255,143,171,0.12)] md:p-7">
                <h2 className="text-lg font-bold text-[#2B2B2B]">
                  <span className="mr-1 text-[#FFD43B]">◆</span>
                  今日按小时（UTC）
                </h2>
                <p className="mt-1 text-xs text-[#6B7280]">
                  浅蓝 / 浅黄 / 浅粉柱表示各时段调用
                </p>
                <div className="mt-5">
                  <BarChart
                    rows={hourlyBars}
                    pick={(r) => r.success || r.total}
                    compact
                  />
                </div>
              </div>

              {stats.daily?.length > 0 && (
                <div className="overflow-x-auto rounded-[20px] border border-[#F2E6C9] bg-white shadow-[0_12px_30px_rgba(255,143,171,0.12)]">
                  <table className="min-w-full text-left text-xs text-[#2B2B2B]">
                    <thead className="bg-[#FFF8E7] uppercase tracking-wider text-[#6B7280]">
                      <tr>
                        <th className="px-4 py-3">日期</th>
                        <th className="px-4 py-3">成功</th>
                        <th className="px-4 py-3">上游失败</th>
                        <th className="px-4 py-3">额度拒绝</th>
                        <th className="px-4 py-3">限流</th>
                      <th className="px-4 py-3">游客</th>
                      <th className="px-4 py-3">登录</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[...stats.daily].reverse().map((d) => (
                        <tr
                          key={d.date}
                          className="border-t border-[#F2E6C9]/80 even:bg-[#FFFBF5]/60"
                        >
                          <td className="px-4 py-2.5 font-medium">{d.date}</td>
                          <td className="px-4 py-2.5 font-semibold text-[#339AF0]">
                            {d.success}
                          </td>
                          <td className="px-4 py-2.5">{d.upstreamError}</td>
                          <td className="px-4 py-2.5">{d.quotaDenied}</td>
                          <td className="px-4 py-2.5">{d.rateDenied}</td>
                        <td className="px-4 py-2.5">{d.guestCalls}</td>
                        <td className="px-4 py-2.5">{d.userCalls}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </section>
  );
};

export default AiTrafficPage;
