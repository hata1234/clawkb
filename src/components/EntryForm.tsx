"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { TYPE_OPTIONS, SOURCE_OPTIONS, STATUS_OPTIONS } from "@/lib/utils";
import { useSettings } from "@/lib/useSettings";
import MarkdownRenderer from "./MarkdownRenderer";
import { Save, Eye, EyeOff } from "lucide-react";
import ImageUpload from "./ImageUpload";

interface UploadedImage {
  url: string;
  key: string;
  filename: string;
  mimeType: string;
  size: number;
  caption?: string;
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
  const settings = useSettings();
  const [showPreview, setShowPreview] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [images, setImages] = useState<UploadedImage[]>(initialData?.images || []);

  // Dynamic options from DB settings, with hardcoded fallback
  const typeOptions = settings?.entry_types?.map(t => t.id) ?? [...TYPE_OPTIONS];
  const typeLabels: Record<string, string> = {};
  if (settings?.entry_types) {
    for (const t of settings.entry_types) typeLabels[t.id] = t.label;
  }
  const sourceOptions = settings?.source_options ?? [...SOURCE_OPTIONS];
  const statusOptions = settings?.status_options?.map(s => s.id) ?? [...STATUS_OPTIONS];
  const statusLabels: Record<string, string> = {};
  if (settings?.status_options) {
    for (const s of settings.status_options) statusLabels[s.id] = s.label;
  }

  const [form, setForm] = useState<EntryFormData>({
    type: initialData?.type || typeOptions[0] || "opportunity",
    source: initialData?.source || sourceOptions[0] || "manual",
    title: initialData?.title || "",
    summary: initialData?.summary || "",
    content: initialData?.content || "",
    status: initialData?.status || statusOptions[0] || "new",
    url: initialData?.url || "",
    tags: initialData?.tags || "",
  });

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
      type: form.type,
      source: form.source,
      title: form.title,
      summary: form.summary || undefined,
      content: form.content || undefined,
      status: form.status,
      url: form.url || undefined,
      tags: tagList.length > 0 ? tagList : undefined,
      images: images.length > 0 ? images : undefined,
    };

    try {
      const url = mode === "edit" ? `/api/entries/${initialData?.id}` : "/api/entries";
      const method = mode === "edit" ? "PATCH" : "POST";
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save entry");
      }

      const data = await res.json();
      router.push(`/entries/${data.id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
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

      <div className="form-row-2col">
        <div>
          <label style={labelStyle}>Type</label>
          <select name="type" value={form.type} onChange={handleChange} style={selectStyle}>
            {typeOptions.map((t) => (
              <option key={t} value={t}>{typeLabels[t] || t.replace(/_/g, " ")}</option>
            ))}
          </select>
        </div>
        <div>
          <label style={labelStyle}>Source</label>
          <select name="source" value={form.source} onChange={handleChange} style={selectStyle}>
            {sourceOptions.map((s) => (<option key={s} value={s}>{s}</option>))}
          </select>
        </div>
      </div>

      <div>
        <label style={labelStyle}>Title</label>
        <input type="text" name="title" value={form.title} onChange={handleChange} required placeholder="Entry title" style={inputStyle} />
      </div>

      <div>
        <label style={labelStyle}>Summary</label>
        <input type="text" name="summary" value={form.summary} onChange={handleChange} placeholder="Brief summary (optional)" style={inputStyle} />
      </div>

      <div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
          <label style={{ ...labelStyle, marginBottom: 0 }}>Content (Markdown)</label>
          <button type="button" onClick={() => setShowPreview(!showPreview)}
            style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.75rem", color: "var(--text-muted)", background: "none", border: "none", cursor: "pointer" }}>
            {showPreview ? <EyeOff style={{ width: 14, height: 14 }} /> : <Eye style={{ width: 14, height: 14 }} />}
            {showPreview ? "Edit" : "Preview"}
          </button>
        </div>
        {showPreview ? (
          <div style={{ minHeight: 200, background: "var(--background)", border: "1px solid var(--border)", borderRadius: "var(--radius-md)", padding: 16 }}>
            {form.content ? <MarkdownRenderer content={form.content} /> : <p style={{ color: "var(--text-dim)", fontSize: "0.875rem" }}>Nothing to preview</p>}
          </div>
        ) : (
          <textarea name="content" value={form.content} onChange={handleChange} rows={10} placeholder="Full content in Markdown (optional)"
            style={{ ...inputStyle, resize: "vertical", fontFamily: "var(--font-mono)", fontSize: "0.8rem", minHeight: 200 }} />
        )}
      </div>

      <div className="form-row-2col">
        <div>
          <label style={labelStyle}>URL</label>
          <input type="url" name="url" value={form.url} onChange={handleChange} placeholder="https://..." style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>Status</label>
          <select name="status" value={form.status} onChange={handleChange} style={selectStyle}>
            {statusOptions.map((s) => (
              <option key={s} value={s}>{statusLabels[s] || s.replace(/_/g, " ")}</option>
            ))}
          </select>
        </div>
      </div>

      <ImageUpload images={images} onChange={setImages} />

      <div>
        <label style={labelStyle}>Tags</label>
        <input type="text" name="tags" value={form.tags} onChange={handleChange} placeholder="Comma-separated tags, e.g. ai, finance, crypto" style={inputStyle} />
      </div>

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
          {saving ? "Saving..." : mode === "create" ? "Create Entry" : "Save Changes"}
        </button>
        <button type="button" onClick={() => router.back()} style={{
          padding: "10px 20px",
          fontSize: "0.875rem", color: "var(--text-secondary)",
          background: "none",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-md)", cursor: "pointer",
        }}>
          Cancel
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
