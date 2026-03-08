"use client";

import { FileText, CalendarDays, TrendingUp, Lightbulb, BookOpen, Database, Sparkles } from "lucide-react";

const ICONS: Record<string, typeof FileText> = {
  FileText, CalendarDays, TrendingUp, Lightbulb, BookOpen, Database, Sparkles,
};

interface StatsCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  iconName: string;
  className?: string;
}

export default function StatsCard({ title, value, subtitle, iconName, className = "" }: StatsCardProps) {
  const Icon = ICONS[iconName] || FileText;
  return (
    <div className={`card-hover group ${className}`} style={{
      position: "relative",
      background: "var(--surface)",
      border: "1px solid var(--border)",
      borderRadius: "var(--radius-lg)",
      padding: "16px 16px",
      overflow: "hidden",
    }}>
      <div style={{ position: "relative", display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
        <div style={{ minWidth: 0 }}>
          <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontWeight: 500 }}>{title}</p>
          <p style={{ fontSize: "1.75rem", fontWeight: 600, marginTop: 6, letterSpacing: "-0.02em", fontFamily: "var(--font-heading)" }}>
            {value}
          </p>
          {subtitle && <p style={{ fontSize: "0.7rem", color: "var(--text-dim)", marginTop: 4 }}>{subtitle}</p>}
        </div>
        <div style={{
          padding: 8,
          background: "var(--accent-muted)",
          borderRadius: "var(--radius-md)",
          flexShrink: 0,
        }}>
          <Icon style={{ width: 18, height: 18, color: "var(--accent)" }} />
        </div>
      </div>
    </div>
  );
}
