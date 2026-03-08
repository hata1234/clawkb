import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import StatsCard from "@/components/StatsCard";
import EntryCard from "@/components/EntryCard";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const [total, byType, byStatus, bySource, thisWeek, recent] = await Promise.all([
    prisma.entry.count(),
    prisma.entry.groupBy({ by: ["type"], _count: { id: true }, orderBy: { _count: { id: "desc" } } }),
    prisma.entry.groupBy({ by: ["status"], _count: { id: true } }),
    prisma.entry.groupBy({ by: ["source"], _count: { id: true }, orderBy: { _count: { id: "desc" } } }),
    prisma.entry.count({
      where: { createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } },
    }),
    prisma.entry.findMany({
      take: 10,
      orderBy: { createdAt: "desc" },
      include: { tags: true },
    }),
  ]);

  const newCount = byStatus.find((s) => s.status === "new")?._count.id || 0;
  const interestedCount = byStatus.find((s) => s.status === "interested")?._count.id || 0;
  const maxTypeCount = Math.max(...byType.map(t => t._count.id), 1);
  const maxSourceCount = Math.max(...bySource.map(s => s._count.id), 1);

  const typeColors: Record<string, string> = {
    design: "#C9A96E",
    reference: "#60A5FA",
    project_note: "#4ADE80",
    report: "#A78BFA",
    opportunity: "#F97316",
  };

  const sourceColors: Record<string, string> = {
    "pod-daily": "#C9A96E",
    "moltbook": "#F472B6",
    "idea-backlog": "#4ADE80",
    "nightly-recon": "#A78BFA",
    "stock-daily": "#60A5FA",
    "reddit": "#F97316",
    "web": "#FBBF24",
    "manual": "#71717A",
  };

  return (
    <div>
      {/* Header */}
      <div className="dash-header animate-fade-in-up">
        <div>
          <p className="dash-label">DASHBOARD</p>
          <h1 className="dash-title">Overview</h1>
        </div>
        <Link href="/entries/new" className="dash-new-btn">
          + New Entry
        </Link>
      </div>

      {/* Stats */}
      <div className="dash-stats-grid">
        <StatsCard title="Total Entries" value={total} subtitle="All time" iconName="FileText" className="animate-fade-in-up stagger-1" />
        <StatsCard title="This Week" value={thisWeek} subtitle="New entries" iconName="CalendarDays" className="animate-fade-in-up stagger-2" />
        <StatsCard title="Awaiting Review" value={newCount} subtitle="Status: new" iconName="TrendingUp" className="animate-fade-in-up stagger-3" />
        <StatsCard title="Interested" value={interestedCount} subtitle="Want to pursue" iconName="Sparkles" className="animate-fade-in-up stagger-4" />
      </div>

      {/* Charts Row */}
      <div className="dash-charts-row">
        {/* By Type Chart */}
        <div className="dash-chart-card animate-fade-in-up stagger-2">
          <h3 className="dash-chart-title">By Type</h3>
          <div className="dash-bar-chart">
            {byType.map((t) => (
              <Link key={t.type} href={`/entries?type=${t.type}`} className="dash-bar-row">
                <span className="dash-bar-label">{t.type.replace("_", " ")}</span>
                <div className="dash-bar-track">
                  <div
                    className="dash-bar-fill"
                    style={{
                      width: `${(t._count.id / maxTypeCount) * 100}%`,
                      background: typeColors[t.type] || "var(--accent)",
                    }}
                  />
                </div>
                <span className="dash-bar-value">{t._count.id}</span>
              </Link>
            ))}
          </div>
        </div>

        {/* By Source Chart */}
        <div className="dash-chart-card animate-fade-in-up stagger-3">
          <h3 className="dash-chart-title">By Source</h3>
          <div className="dash-bar-chart">
            {bySource.map((s) => (
              <Link key={s.source} href={`/entries?source=${s.source}`} className="dash-bar-row">
                <span className="dash-bar-label">{s.source}</span>
                <div className="dash-bar-track">
                  <div
                    className="dash-bar-fill"
                    style={{
                      width: `${(s._count.id / maxSourceCount) * 100}%`,
                      background: sourceColors[s.source] || "var(--text-dim)",
                    }}
                  />
                </div>
                <span className="dash-bar-value">{s._count.id}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* By Type Cards (original) */}
      {byType.length > 0 && (
        <div className="dash-type-grid">
          {byType.map((t, i) => (
            <Link
              key={t.type}
              href={`/entries?type=${t.type}`}
              className={`dash-type-card card-hover animate-fade-in-up stagger-${Math.min(i + 1, 5)}`}
            >
              <div className={`type-bar type-bar-${t.type}`} style={{ top: 8, bottom: 8 }} />
              <div style={{ paddingLeft: 4 }}>
                <p className="dash-type-label">{t.type.replace("_", " ")}</p>
                <p className="dash-type-value">{t._count.id}</p>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Recent Entries */}
      <div>
        <div className="dash-section-header animate-fade-in-up">
          <h2 className="dash-section-title">Recent Entries</h2>
          <Link href="/entries" className="dash-view-all">View all →</Link>
        </div>
        {recent.length === 0 ? (
          <div className="dash-empty animate-fade-in">
            <div className="dash-empty-icon">📭</div>
            <p className="dash-empty-title">No entries yet</p>
            <p className="dash-empty-sub">Start building your knowledge base</p>
            <Link href="/entries/new" className="dash-empty-link">Create your first entry →</Link>
          </div>
        ) : (
          <div className="dash-entries-list">
            {recent.map((entry, i) => (
              <div key={entry.id} className={`animate-fade-in-up stagger-${Math.min(i + 1, 5)}`}>
                <EntryCard entry={{ ...entry, createdAt: entry.createdAt.toISOString(), tags: entry.tags }} />
              </div>
            ))}
          </div>
        )}
      </div>

      <style>{`
        .dash-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          margin-bottom: 24px;
          gap: 12px;
          flex-wrap: wrap;
        }
        .dash-label {
          font-size: 0.7rem;
          color: var(--text-dim);
          font-weight: 600;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          margin-bottom: 4px;
        }
        .dash-title {
          font-family: var(--font-heading);
          font-size: 1.75rem;
          font-weight: 400;
          color: var(--text);
        }
        .dash-new-btn {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: var(--accent);
          color: #0C0C0E;
          border-radius: var(--radius-md);
          padding: 10px 16px;
          font-size: 0.875rem;
          font-weight: 600;
          text-decoration: none;
          transition: background 0.15s ease;
          white-space: nowrap;
        }
        .dash-new-btn:hover { background: var(--accent-hover); }

        .dash-stats-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 12px;
          margin-bottom: 24px;
        }
        @media (min-width: 1024px) {
          .dash-stats-grid { grid-template-columns: repeat(4, 1fr); gap: 16px; }
          .dash-title { font-size: 2rem; }
        }

        /* ═══ Charts ═══ */
        .dash-charts-row {
          display: grid;
          grid-template-columns: 1fr;
          gap: 16px;
          margin-bottom: 24px;
        }
        @media (min-width: 768px) {
          .dash-charts-row { grid-template-columns: 1fr 1fr; }
        }
        .dash-chart-card {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: var(--radius-lg);
          padding: 20px;
        }
        .dash-chart-title {
          font-family: var(--font-heading);
          font-size: 1rem;
          font-weight: 400;
          color: var(--text);
          margin-bottom: 16px;
        }
        .dash-bar-chart {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .dash-bar-row {
          display: flex;
          align-items: center;
          gap: 10px;
          text-decoration: none;
          transition: opacity 0.15s ease;
        }
        .dash-bar-row:hover { opacity: 0.8; }
        .dash-bar-label {
          width: 90px;
          font-size: 0.75rem;
          color: var(--text-secondary);
          text-transform: capitalize;
          flex-shrink: 0;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .dash-bar-track {
          flex: 1;
          height: 20px;
          background: var(--surface-hover);
          border-radius: 4px;
          overflow: hidden;
        }
        .dash-bar-fill {
          height: 100%;
          border-radius: 4px;
          transition: width 0.6s ease;
          min-width: 4px;
        }
        .dash-bar-value {
          width: 30px;
          text-align: right;
          font-size: 0.8rem;
          font-weight: 600;
          color: var(--text);
          flex-shrink: 0;
        }

        .dash-type-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 10px;
          margin-bottom: 24px;
        }
        @media (min-width: 1024px) {
          .dash-type-grid { grid-template-columns: repeat(4, 1fr); gap: 12px; }
        }
        .dash-type-card {
          position: relative;
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: var(--radius-md);
          padding: 14px 14px 14px 18px;
          text-decoration: none;
          overflow: hidden;
          transition: border-color 0.15s ease;
        }
        .dash-type-card:hover { border-color: var(--border-hover); }
        .dash-type-label {
          font-size: 0.75rem;
          color: var(--text-muted);
          text-transform: capitalize;
          font-weight: 500;
        }
        .dash-type-value {
          font-family: var(--font-heading);
          font-size: 1.25rem;
          font-weight: 400;
          color: var(--text);
          margin-top: 2px;
        }

        .dash-section-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 16px;
        }
        .dash-section-title {
          font-family: var(--font-heading);
          font-size: 1.125rem;
          font-weight: 400;
          color: var(--text);
        }
        .dash-view-all {
          font-size: 0.875rem;
          color: var(--accent);
          text-decoration: none;
          font-weight: 500;
          white-space: nowrap;
        }
        .dash-view-all:hover { color: var(--accent-hover); }

        .dash-entries-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .dash-empty {
          text-align: center;
          padding: 60px 20px;
          color: var(--text-muted);
        }
        .dash-empty-icon {
          width: 56px;
          height: 56px;
          margin: 0 auto 16px;
          border-radius: 16px;
          background: var(--surface);
          border: 1px solid var(--border);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.5rem;
        }
        .dash-empty-title { font-size: 0.875rem; font-weight: 500; margin-bottom: 4px; }
        .dash-empty-sub { font-size: 0.75rem; color: var(--text-dim); margin-bottom: 12px; }
        .dash-empty-link { font-size: 0.875rem; color: var(--accent); text-decoration: none; font-weight: 500; }
      `}</style>
    </div>
  );
}
