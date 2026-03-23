"use client";

import { useState, useEffect } from "react";
import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { SOURCE_OPTIONS, STATUS_OPTIONS } from "@/lib/utils";
import { useSettings } from "@/lib/useSettings";
import MarkdownRenderer from "./MarkdownRenderer";
import MentionTextarea from "./MentionTextarea";
import { Save, Eye, EyeOff, LayoutTemplate } from "lucide-react";
import ImageUpload from "./ImageUpload";

interface UploadedImage {
  url: string;
  key: string;
  filename: string;
  mimeType: string;
  size: number;
  caption?: string;
}

interface EntryTemplate {
  id: string;
  name: string;
  type?: string;
  source?: string;
  status?: string;
  tags?: string;
  summary?: string;
  content?: string;
}

interface CollectionOption {
  id: number;
  name: string;
  icon?: string | null;
}

interface EntryFormData {
  id?: number;
  type: string;
  source: string;
  title: string;
  summary: string;
  content: string;
  status: string;
  url: string;
  tags: string;
  images?: UploadedImage[];
  collectionIds?: number[];
}

interface EntryFormProps {
  initialData?: EntryFormData;
  mode: "create" | "edit";
}

const selectStyle: React.CSSProperties = {
  width: "100%",
  background: "var(--background)",
  border: "1px solid var(--border)",
  borderRadius: "var(--radius-md)",
  padding: "10px 12px",
  fontSize: "0.875rem",
  color: "var(--text)",
  outline: "none",
  appearance: "none" as const,
  WebkitAppearance: "none" as const,
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  background: "var(--background)",
  border: "1px solid var(--border)",
  borderRadius: "var(--radius-md)",
  padding: "10px 12px",
  fontSize: "0.875rem",
  color: "var(--text)",
  outline: "none",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: "0.85rem",
  color: "var(--text-secondary)",
  fontWeight: 500,
  marginBottom: 6,
};

export default function EntryForm({ initialData, mode }: EntryFormProps) {
  const router = useRouter();
  const t = useTranslations('EntryForm');
  const tc = useTranslations('Common');
  const settings = useSettings();
  const [showPreview, setShowPreview] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [images, setImages] = useState<UploadedImage[]>(initialData?.images || []);
  const [templates, setTemplates] = useState<EntryTemplate[]>([]);

  const [allCollections, setAllCollections] = useState<CollectionOption[]>([]);
  const [selectedCollectionIds, setSelectedCollectionIds] = useState<number[]>(initialData?.collectionIds || []);

  // Load templates for create mode
  useEffect(() => {
    if (mode !== "create") return;
    fetch("/api/plugins/entry-templates/templates")
      .then(r => r.ok ? r.json() : { templates: [] })
      .then(data => setTemplates(data.templates || []))
      .catch(() => {});
  }, [mode]);

  // Load collections for selector
  useEffect(() => {
    fetch("/api/collections")
      .then((r) => r.json())
      .then((data) => setAllCollections(data.flat || []))
      .catch(() => {});
  }, []);

  // Dynamic options from DB settings, with hardcoded fallback
  const sourceOptions = settings?.source_options ?? [...SOURCE_OPTIONS];
  const statusOptions = settings?.status_options?.map(s => s.id) ?? [...STATUS_OPTIONS];
  const statusLabels: Record<string, string> = {};
  if (settings?.status_options) {
    for (const s of settings.status_options) statusLabels[s.id] = s.label;
  }

  const [form, setForm] = useState<EntryFormData>({
    type: initialData?.type || "entry",
    source: initialData?.source || sourceOptions[0] || "manual",
    title: initialData?.title || "",
    summary: initialData?.summary || "",
    content: initialData?.content || "",
    status: initialData?.status || statusOptions[0] || "new",
    url: initialData?.url || "",
    tags: initialData?.tags || "",
  });

  const applyTemplate = (templateId: string) => {
    const tpl = templates.find(t => t.id === templateId);
    if (!tpl) return;
    setForm(prev => ({
      ...prev,
      source: tpl.source || prev.source,
      status: tpl.status || prev.status,
      tags: tpl.tags || prev.tags,
      summary: tpl.summary || prev.summary,
      content: tpl.content || prev.content,
    }));
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");

    const tagList = form.tags.split(",").map((t) => t.trim()).filter(Boolean);

    const body = {
      type: "entry",
      source: form.source,
      title: form.title,
      summary: form.summary || undefined,
      content: form.content || undefined,
      status: form.status,
      url: form.url || undefined,
      tags: tagList.length > 0 ? tagList : undefined,
      images: images.length > 0 ? images : undefined,
      collectionIds: selectedCollectionIds.length > 0 ? selectedCollectionIds : undefined,
    };

    try {
      const url = mode === "edit" ? `/api/entries/${initialData?.id}` : "/api/entries";
      const method = mode === "edit" ? "PATCH" : "POST";
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || t('failedToSave'));
      }

      const data = await res.json();
      router.push(`/entries/${data.id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('somethingWrong'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {error && (
        <div style={{
          background: "rgba(248,113,113,0.08)",
          border: "1px solid rgba(248,113,113,0.2)",
          borderRadius: "var(--radius-md)",
          padding: "12px 16px",
          fontSize: "0.875rem",
          color: "var(--danger)",
        }}>
          {error}
        </div>
      )}

      {/* Template selector — only in create mode and when templates exist */}
      {mode === "create" && templates.length > 0 && (
        <div style={{
          display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap",
          padding: "12px 14px",
          background: "var(--accent-muted)",
          border: "1px solid rgba(201,169,110,0.2)",
          borderRadius: "var(--radius-md)",
        }}>
          <LayoutTemplate style={{ width: 14, height: 14, color: "var(--accent)", flexShrink: 0 }} />
          <span style={{ fontSize: "0.8rem", color: "var(--accent)", fontWeight: 500, flexShrink: 0 }}>{t('template')}</span>
          {templates.map(tpl => (
            <button
              key={tpl.id}
              type="button"
              onClick={() => applyTemplate(tpl.id)}
              style={{
                padding: "5px 12px",
                borderRadius: "var(--radius-md)",
                border: "1px solid var(--border)",
                background: "var(--surface)",
                color: "var(--text-secondary)",
                fontSize: "0.8rem",
                fontWeight: 500,
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
            >
              {tpl.name}
            </button>
          ))}
        </div>
      )}

      <div className="form-row-2col">
        <div>
          <label style={labelStyle}>{t('collections')}</label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, minHeight: 38, background: "var(--background)", border: "1px solid var(--border)", borderRadius: "var(--radius-md)", padding: "6px 10px", alignItems: "center" }}>
            {selectedCollectionIds.map((cid) => {
              const col = allCollections.find((c) => c.id === cid);
              return col ? (
                <span key={cid} style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: "0.75rem", background: "var(--surface-hover)", color: "var(--text-secondary)", padding: "2px 8px", borderRadius: 999 }}>
                  {col.icon || "📁"} {col.name}
                  <button type="button" onClick={() => setSelectedCollectionIds((prev) => prev.filter((id) => id !== cid))} style={{ background: "none", border: "none", cursor: "pointer", padding: 0, display: "flex", color: "var(--text-dim)" }}>&times;</button>
                </span>
              ) : null;
            })}
            <select
              value=""
              onChange={(e) => {
                const id = parseInt(e.target.value);
                if (id && !selectedCollectionIds.includes(id)) setSelectedCollectionIds((prev) => [...prev, id]);
              }}
              style={{ ...selectStyle, width: "auto", minWidth: 120, padding: "4px 8px", fontSize: "0.75rem", border: "none", background: "transparent" }}
            >
              <option value="">{t('addCollection')}</option>
              {allCollections.filter((c) => !selectedCollectionIds.includes(c.id)).map((c) => (
                <option key={c.id} value={c.id}>{c.icon || "📁"} {c.name}</option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <label style={labelStyle}>{t('source')}</label>
          <select name="source" value={form.source} onChange={handleChange} style={selectStyle}>
            {sourceOptions.map((s) => (<option key={s} value={s}>{s}</option>))}
          </select>
        </div>
      </div>

      <div>
        <label style={labelStyle}>{t('title')}</label>
        <input type="text" name="title" value={form.title} onChange={handleChange} required placeholder={t('titlePlaceholder')} style={inputStyle} />
      </div>

      <div>
        <label style={labelStyle}>{t('summary')}</label>
        <input type="text" name="summary" value={form.summary} onChange={handleChange} placeholder={t('summaryPlaceholder')} style={inputStyle} />
      </div>

      <div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
          <label style={{ ...labelStyle, marginBottom: 0 }}>{t('contentMarkdown')}</label>
          <button type="button" onClick={() => setShowPreview(!showPreview)}
            style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.75rem", color: "var(--text-muted)", background: "none", border: "none", cursor: "pointer" }}>
            {showPreview ? <EyeOff style={{ width: 14, height: 14 }} /> : <Eye style={{ width: 14, height: 14 }} />}
            {showPreview ? t('editToggle') : t('previewToggle')}
          </button>
        </div>
        {showPreview ? (
          <div style={{ minHeight: 200, background: "var(--background)", border: "1px solid var(--border)", borderRadius: "var(--radius-md)", padding: 16 }}>
            {form.content ? <MarkdownRenderer content={form.content} /> : <p style={{ color: "var(--text-dim)", fontSize: "0.875rem" }}>{t('nothingToPreview')}</p>}
          </div>
        ) : (
          <MentionTextarea name="content" value={form.content} onChange={handleChange} rows={10} placeholder={t('contentPlaceholder')}
            style={{ ...inputStyle, resize: "vertical", fontFamily: "var(--font-mono)", fontSize: "0.8rem", minHeight: 200 }} />
        )}
      </div>

      <div className="form-row-2col">
        <div>
          <label style={labelStyle}>{t('url')}</label>
          <input type="url" name="url" value={form.url} onChange={handleChange} placeholder={t('urlPlaceholder')} style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>{t('status')}</label>
          <select name="status" value={form.status} onChange={handleChange} style={selectStyle}>
            {statusOptions.map((s) => (
              <option key={s} value={s}>{statusLabels[s] || s.replace(/_/g, " ")}</option>
            ))}
          </select>
        </div>
      </div>

      <ImageUpload images={images} onChange={setImages} />

      <div>
        <label style={labelStyle}>{t('tagsLabel')}</label>
        <input type="text" name="tags" value={form.tags} onChange={handleChange} placeholder={t('tagsPlaceholder')} style={inputStyle} />
      </div>

      {mode === "create" && (
        <div style={{ fontSize: "0.8rem", color: "var(--text-dim)", padding: "8px 12px", background: "var(--surface-hover)", borderRadius: "var(--radius-md)", display: "flex", alignItems: "center", gap: 8 }}>
          <span>📋</span>
          <span>{t('bpmnNoteCreate')}</span>
        </div>
      )}

      <div style={{ display: "flex", alignItems: "center", gap: 12, paddingTop: 8 }}>
        <button type="submit" disabled={saving} style={{
          display: "flex", alignItems: "center", gap: 8,
          padding: "10px 20px",
          background: "var(--accent)", color: "var(--accent-contrast)",
          fontSize: "0.875rem", fontWeight: 600,
          borderRadius: "var(--radius-md)", border: "none", cursor: "pointer",
          opacity: saving ? 0.5 : 1,
        }}>
          <Save style={{ width: 16, height: 16 }} />
          {saving ? t('saving') : mode === "create" ? t('createEntry') : t('saveChanges')}
        </button>
        <button type="button" onClick={() => router.back()} style={{
          padding: "10px 20px",
          fontSize: "0.875rem", color: "var(--text-secondary)",
          background: "none",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-md)", cursor: "pointer",
        }}>
          {tc('cancel')}
        </button>
      </div>

      <style>{`
        .form-row-2col {
          display: grid;
          grid-template-columns: 1fr;
          gap: 16px;
        }
        @media (min-width: 768px) {
          .form-row-2col {
            grid-template-columns: 1fr 1fr;
          }
        }
        form select, form input, form textarea {
          color-scheme: dark;
        }
        form select:focus, form input:focus, form textarea:focus {
          border-color: var(--accent) !important;
          box-shadow: 0 0 0 2px rgba(201,169,110,0.15);
        }
        form input::placeholder, form textarea::placeholder {
          color: var(--text-dim);
        }
      `}</style>
    </form>
  );
}
