import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getAccessibleCollectionIds } from "@/lib/permissions";
import StatsCard from "@/components/StatsCard";
import EntryCard from "@/components/EntryCard";
import { Link } from "@/i18n/navigation";
import { getTranslations } from "next-intl/server";
import { setRequestLocale } from "next-intl/server";

export const dynamic = "force-dynamic";

async function canCreateEntries(userId: number, isAdmin: boolean): Promise<boolean> {
  if (isAdmin) return true;

  const groupIds = (
    await prisma.userGroup.findMany({
      where: { userId },
      select: { groupId: true },
    })
  ).map((g) => g.groupId);

  const everyoneGroup = await prisma.group.findUnique({
    where: { name: "Everyone" },
    select: { id: true },
  });
  if (everyoneGroup && !groupIds.includes(everyoneGroup.id)) {
    groupIds.push(everyoneGroup.id);
  }

  if (groupIds.length === 0) return false;

  const writableRoles = await prisma.groupCollectionRole.findMany({
    where: {
      groupId: { in: groupIds },
      role: { in: ["admin", "editor"] },
    },
    select: { collectionId: true },
    distinct: ["collectionId"],
  });

  return writableRoles.length > 0;
}

export default async function DashboardPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Dashboard");
  const tCommon = await getTranslations("Common");

  const session = await auth();
  if (!session) redirect("/login");

  // ACL: get accessible collection IDs for current user
  const userId = parseInt(session.user.id);
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { isAdmin: true } });
  const isAdmin = user?.isAdmin ?? false;
  const accessibleIds = await getAccessibleCollectionIds(userId, isAdmin);

  // Build ACL where clause for entries
  const aclWhere = accessibleIds !== null ? { collections: { some: { id: { in: accessibleIds } } } } : {};

  // Build collection query with ACL
  async function queryCollections() {
    if (accessibleIds === null) {
      // Admin: show all
      return prisma.$queryRaw<
        { id: number; name: string; color: string | null; icon: string | null; entry_count: bigint }[]
      >`
        SELECT c.id, c.name, c.color, c.icon, count(ec."B") as entry_count
        FROM collections c
        LEFT JOIN "_EntryCollections" ec ON ec."A" = c.id
        LEFT JOIN "Entry" e ON e.id = ec."B" AND e."deletedAt" IS NULL
        GROUP BY c.id, c.name, c.color, c.icon
        ORDER BY count(ec."B") DESC, c.id
      `;
    } else {
      // Non-admin: only accessible collections
      return prisma.$queryRaw<
        { id: number; name: string; color: string | null; icon: string | null; entry_count: bigint }[]
      >`
        SELECT c.id, c.name, c.color, c.icon, count(ec."B") as entry_count
        FROM collections c
        LEFT JOIN "_EntryCollections" ec ON ec."A" = c.id
        LEFT JOIN "Entry" e ON e.id = ec."B" AND e."deletedAt" IS NULL
        WHERE c.id = ANY(${accessibleIds}::int[])
        GROUP BY c.id, c.name, c.color, c.icon
        ORDER BY count(ec."B") DESC, c.id
      `;
    }
  }

  const [total, byStatus, bySource, byCollection, thisWeek, recent, userCanCreate] = await Promise.all([
    prisma.entry.count({ where: aclWhere }),
    prisma.entry.groupBy({ by: ["status"], _count: { id: true }, where: aclWhere }),
    prisma.entry.groupBy({
      by: ["source"],
      _count: { id: true },
      orderBy: { _count: { id: "desc" } },
      where: aclWhere,
    }),
    queryCollections(),
    prisma.entry.count({
      where: { ...aclWhere, createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } },
    }),
    prisma.entry.findMany({
      take: 10,
      orderBy: { createdAt: "desc" },
      where: aclWhere,
      include: { tags: true },
    }),
    canCreateEntries(userId, isAdmin),
  ]);

  const newCount = byStatus.find((s) => s.status === "new")?._count.id || 0;
  const interestedCount = byStatus.find((s) => s.status === "interested")?._count.id || 0;

  const allCollections = byCollection.map((c) => ({
    ...c,
    entry_count: Number(c.entry_count),
  }));
  const collections = allCollections.slice(0, 8);
  const topSources = bySource.slice(0, 10);
  const maxCollectionCount = Math.max(...collections.map((c) => c.entry_count), 1);
  const maxSourceCount = Math.max(...topSources.map((s) => s._count.id), 1);

  // Default palette for collections without a custom color
  const defaultPalette = [
    "#C9A96E",
    "#60A5FA",
    "#4ADE80",
    "#A78BFA",
    "#F97316",
    "#F472B6",
    "#FBBF24",
    "#34D399",
    "#818CF8",
    "#FB923C",
    "#E879F9",
    "#38BDF8",
    "#A3E635",
    "#FDA4AF",
    "#71717A",
  ];

  const sourceColors: Record<string, string> = {
    "pod-daily": "#C9A96E",
    moltbook: "#F472B6",
    "idea-backlog": "#4ADE80",
    "nightly-recon": "#A78BFA",
    "stock-daily": "#60A5FA",
    reddit: "#F97316",
    web: "#FBBF24",
    manual: "#71717A",
  };

  function collectionColor(c: { color: string | null }, idx: number): string {
    return c.color || defaultPalette[idx % defaultPalette.length];
  }

  return (
    <div>
      {/* Header */}
      <div className="dash-header animate-fade-in-up">
        <div>
          <p className="dash-label">{t("label")}</p>
          <h1 className="dash-title">{t("title")}</h1>
        </div>
        {userCanCreate && (
          <Link href="/entries/new" className="dash-new-btn">
            {t("newEntry")}
          </Link>
        )}
      </div>

      {/* Stats */}
      <div className="dash-stats-grid">
        <StatsCard
          title={t("totalEntries")}
          value={total}
          subtitle={t("allTime")}
          iconName="FileText"
          className="animate-fade-in-up stagger-1"
        />
        <StatsCard
          title={t("thisWeek")}
          value={thisWeek}
          subtitle={t("newEntries")}
          iconName="CalendarDays"
          className="animate-fade-in-up stagger-2"
        />
        <StatsCard
          title={t("awaitingReview")}
          value={newCount}
          subtitle={t("statusNew")}
          iconName="TrendingUp"
          className="animate-fade-in-up stagger-3"
        />
        <StatsCard
          title={t("interested")}
          value={interestedCount}
          subtitle={t("wantToPursue")}
          iconName="Sparkles"
          className="animate-fade-in-up stagger-4"
        />
      </div>

      {/* Charts Row */}
      <div className="dash-charts-row">
        {/* By Collection Chart */}
        <div className="dash-chart-card animate-fade-in-up stagger-2">
          <h3 className="dash-chart-title">{t("byCollection")}</h3>
          <div className="dash-bar-chart">
            {collections.map((c, i) => (
              <Link key={c.id} href={`/entries?collectionId=${c.id}`} className="dash-bar-row">
                <span className="dash-bar-label">
                  {c.icon ? `${c.icon} ` : ""}
                  {c.name}
                </span>
                <div className="dash-bar-track">
                  <div
                    className="dash-bar-fill"
                    style={{
                      width: `${(c.entry_count / maxCollectionCount) * 100}%`,
                      background: collectionColor(c, i),
                    }}
                  />
                </div>
                <span className="dash-bar-value">{c.entry_count}</span>
              </Link>
            ))}
          </div>
        </div>

        {/* By Source Chart */}
        <div className="dash-chart-card animate-fade-in-up stagger-3">
          <h3 className="dash-chart-title">{t("bySource")}</h3>
          <div className="dash-bar-chart">
            {topSources.map((s) => (
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

      {/* By Collection Cards */}
      {collections.length > 0 && (
        <div className="dash-type-grid">
          {collections.map((c, i) => (
            <Link
              key={c.id}
              href={`/entries?collectionId=${c.id}`}
              className={`dash-type-card card-hover animate-fade-in-up stagger-${Math.min(i + 1, 5)}`}
            >
              <div className="type-bar" style={{ top: 8, bottom: 8, background: collectionColor(c, i) }} />
              <div style={{ paddingLeft: 4 }}>
                <p className="dash-type-label">
                  {c.icon ? `${c.icon} ` : ""}
                  {c.name}
                </p>
                <p className="dash-type-value">{c.entry_count}</p>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Recent Entries */}
      <div>
        <div className="dash-section-header animate-fade-in-up">
          <h2 className="dash-section-title">{t("recentEntries")}</h2>
          <Link href="/entries" className="dash-view-all">
            {tCommon("viewAll")}
          </Link>
        </div>
        {recent.length === 0 ? (
          <div className="dash-empty animate-fade-in">
            <div className="dash-empty-icon">📭</div>
            <p className="dash-empty-title">{t("noEntriesYet")}</p>
            <p className="dash-empty-sub">{t("startBuilding")}</p>
            {userCanCreate && (
              <Link href="/entries/new" className="dash-empty-link">
                {t("createFirstEntry")}
              </Link>
            )}
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
          color: var(--accent-contrast);
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
          width: 110px;
          font-size: 0.75rem;
          color: var(--text-secondary);
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
        .type-bar {
          position: absolute;
          left: 0;
          top: 8px;
          bottom: 8px;
          width: 3px;
          border-radius: 2px;
        }
        .dash-type-label {
          font-size: 0.75rem;
          color: var(--text-muted);
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
