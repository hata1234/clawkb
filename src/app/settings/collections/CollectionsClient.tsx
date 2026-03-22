"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Folder, FolderOpen, Plus, Pencil, Trash2, ChevronRight, ChevronDown,
  GripVertical, Save, X, FolderPlus, Loader2,
} from "lucide-react";
import Link from "next/link";

interface Collection {
  id: number;
  name: string;
  description: string | null;
  icon: string | null;
  color: string | null;
  parentId: number | null;
  sortOrder: number;
  _count: { entries: number; children: number };
  children: Collection[];
}

const inputStyle: React.CSSProperties = {
  background: "var(--background)", border: "1px solid var(--border)",
  borderRadius: 8, padding: "8px 12px", fontSize: "0.875rem",
  color: "var(--text)", outline: "none", width: "100%", boxSizing: "border-box",
};

const btnBase: React.CSSProperties = {
  display: "inline-flex", alignItems: "center", gap: 6,
  padding: "8px 14px", borderRadius: 8, fontSize: "0.8rem",
  fontWeight: 500, cursor: "pointer", border: "none", transition: "all 0.15s ease",
};

function CollectionRow({
  node,
  depth,
  onEdit,
  onDelete,
  onAddChild,
  flatCollections,
}: {
  node: Collection;
  depth: number;
  onEdit: (c: Collection) => void;
  onDelete: (c: Collection) => void;
  onAddChild: (parentId: number) => void;
  flatCollections: Collection[];
}) {
  const [expanded, setExpanded] = useState(true);
  const hasChildren = node.children.length > 0;

  return (
    <>
      <div className="collection-row" style={{ paddingLeft: 16 + depth * 28 }}>
        <div className="collection-row-left">
          <GripVertical style={{ width: 14, height: 14, color: "var(--text-dim)", cursor: "grab", flexShrink: 0 }} />
          {hasChildren ? (
            <button onClick={() => setExpanded(!expanded)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-secondary)", padding: 0, display: "flex" }}>
              {expanded ? <ChevronDown style={{ width: 16, height: 16 }} /> : <ChevronRight style={{ width: 16, height: 16 }} />}
            </button>
          ) : (
            <span style={{ width: 16 }} />
          )}
          <span style={{ fontSize: "1rem", color: node.color || "var(--text-secondary)" }}>
            {node.icon || <Folder style={{ width: 16, height: 16 }} />}
          </span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <Link href={`/entries?collectionId=${node.id}`} style={{ color: "var(--text)", textDecoration: "none", fontWeight: 500, fontSize: "0.9rem" }}>
              {node.name}
            </Link>
            {node.description && (
              <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: 2 }}>{node.description}</p>
            )}
          </div>
          <span style={{ fontSize: "0.75rem", color: "var(--text-dim)", padding: "2px 8px", background: "var(--surface-hover)", borderRadius: 999, whiteSpace: "nowrap" }}>
            {node._count.entries} entries
          </span>
        </div>
        <div className="collection-row-actions">
          <button onClick={() => onAddChild(node.id)} title="Add sub-collection" style={{ ...btnBase, background: "none", padding: 6, color: "var(--text-dim)" }}>
            <FolderPlus style={{ width: 14, height: 14 }} />
          </button>
          <button onClick={() => onEdit(node)} title="Edit" style={{ ...btnBase, background: "none", padding: 6, color: "var(--text-dim)" }}>
            <Pencil style={{ width: 14, height: 14 }} />
          </button>
          <button onClick={() => onDelete(node)} title="Delete" style={{ ...btnBase, background: "none", padding: 6, color: "var(--danger)" }}>
            <Trash2 style={{ width: 14, height: 14 }} />
          </button>
        </div>
      </div>
      {expanded && hasChildren && node.children.map((child) => (
        <CollectionRow
          key={child.id}
          node={child}
          depth={depth + 1}
          onEdit={onEdit}
          onDelete={onDelete}
          onAddChild={onAddChild}
          flatCollections={flatCollections}
        />
      ))}
    </>
  );
}

export default function CollectionsClient() {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [flatCollections, setFlatCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingCollection, setEditingCollection] = useState<Collection | null>(null);
  const [formName, setFormName] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formIcon, setFormIcon] = useState("");
  const [formColor, setFormColor] = useState("");
  const [formParentId, setFormParentId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  const fetchCollections = useCallback(async () => {
    const res = await fetch("/api/collections");
    const data = await res.json();
    setCollections(data.collections || []);
    setFlatCollections(data.flat || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchCollections(); }, [fetchCollections]);

  const resetForm = () => {
    setFormName(""); setFormDescription(""); setFormIcon(""); setFormColor(""); setFormParentId(null);
    setEditingCollection(null); setShowForm(false);
  };

  const handleEdit = (c: Collection) => {
    setEditingCollection(c);
    setFormName(c.name);
    setFormDescription(c.description || "");
    setFormIcon(c.icon || "");
    setFormColor(c.color || "");
    setFormParentId(c.parentId);
    setShowForm(true);
  };

  const handleAddChild = (parentId: number) => {
    resetForm();
    setFormParentId(parentId);
    setShowForm(true);
  };

  const handleDelete = async (c: Collection) => {
    if (!confirm(`Delete "${c.name}"? Children will be moved up.`)) return;
    await fetch(`/api/collections/${c.id}`, { method: "DELETE" });
    fetchCollections();
  };

  const handleSubmit = async () => {
    if (!formName.trim()) return;
    setSaving(true);
    const body = {
      name: formName.trim(),
      description: formDescription || null,
      icon: formIcon || null,
      color: formColor || null,
      parentId: formParentId,
    };

    if (editingCollection) {
      await fetch(`/api/collections/${editingCollection.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    } else {
      await fetch("/api/collections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    }

    setSaving(false);
    resetForm();
    fetchCollections();
  };

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, gap: 12 }}>
        <p style={{ fontSize: "0.875rem", color: "var(--text-muted)" }}>{flatCollections.length} collections</p>
        <button onClick={() => { resetForm(); setShowForm(true); }} style={{ ...btnBase, background: "var(--accent)", color: "var(--accent-contrast)" }}>
          <Plus style={{ width: 14, height: 14 }} /> New Collection
        </button>
      </div>

      {/* Create/Edit form */}
      {showForm && (
        <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", padding: 20, marginBottom: 20 }}>
          <h3 style={{ fontSize: "0.9rem", fontWeight: 600, color: "var(--text)", marginBottom: 12 }}>
            {editingCollection ? "Edit Collection" : "New Collection"}
          </h3>
          <div style={{ display: "grid", gap: 10, gridTemplateColumns: "1fr 1fr" }}>
            <div style={{ gridColumn: "1 / -1" }}>
              <input value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="Collection name *" style={inputStyle}
                onKeyDown={(e) => { if (e.key === "Enter") handleSubmit(); }} autoFocus />
            </div>
            <div style={{ gridColumn: "1 / -1" }}>
              <input value={formDescription} onChange={(e) => setFormDescription(e.target.value)} placeholder="Description (optional)" style={inputStyle} />
            </div>
            <input value={formIcon} onChange={(e) => setFormIcon(e.target.value)} placeholder="Icon (emoji)" style={inputStyle} />
            <input value={formColor} onChange={(e) => setFormColor(e.target.value)} placeholder="Color (#hex)" style={inputStyle} />
            <select value={formParentId ?? ""} onChange={(e) => setFormParentId(e.target.value ? parseInt(e.target.value) : null)}
              style={{ ...inputStyle, colorScheme: "dark" }}>
              <option value="">No parent (root)</option>
              {flatCollections.filter((c) => c.id !== editingCollection?.id).map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
            <button onClick={handleSubmit} disabled={saving} style={{ ...btnBase, background: "var(--accent)", color: "var(--accent-contrast)", opacity: saving ? 0.6 : 1 }}>
              {saving ? <Loader2 style={{ width: 14, height: 14 }} /> : <Save style={{ width: 14, height: 14 }} />}
              {editingCollection ? "Save" : "Create"}
            </button>
            <button onClick={resetForm} style={{ ...btnBase, background: "var(--surface-hover)", color: "var(--text-secondary)", border: "1px solid var(--border)" }}>
              <X style={{ width: 14, height: 14 }} /> Cancel
            </button>
          </div>
        </div>
      )}

      {/* Collection list */}
      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: 40 }}>
          <Loader2 style={{ width: 24, height: 24, color: "var(--text-muted)", animation: "spin 1s linear infinite" }} />
        </div>
      ) : collections.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 20px", color: "var(--text-muted)" }}>
          <FolderOpen style={{ width: 40, height: 40, margin: "0 auto 12px", opacity: 0.3 }} />
          <p style={{ fontSize: "0.875rem" }}>No collections yet.</p>
          <button onClick={() => { resetForm(); setShowForm(true); }} style={{ color: "var(--accent)", fontSize: "0.875rem", marginTop: 8, background: "none", border: "none", cursor: "pointer" }}>
            Create your first collection
          </button>
        </div>
      ) : (
        <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", overflow: "hidden" }}>
          {collections.map((node) => (
            <CollectionRow
              key={node.id}
              node={node}
              depth={0}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onAddChild={handleAddChild}
              flatCollections={flatCollections}
            />
          ))}
        </div>
      )}

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .collection-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 16px;
          border-bottom: 1px solid var(--border);
          transition: background 0.12s;
        }
        .collection-row:last-child { border-bottom: none; }
        .collection-row:hover { background: var(--surface-hover); }
        .collection-row-left {
          display: flex;
          align-items: center;
          gap: 10px;
          flex: 1;
          min-width: 0;
        }
        .collection-row-actions {
          display: flex;
          gap: 2px;
          opacity: 0;
          transition: opacity 0.12s;
        }
        .collection-row:hover .collection-row-actions { opacity: 1; }
        select { color-scheme: dark; }
        input:focus, select:focus { border-color: var(--accent) !important; }
      `}</style>
    </div>
  );
}
