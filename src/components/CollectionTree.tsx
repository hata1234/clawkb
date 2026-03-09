"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import {
  ChevronRight,
  ChevronDown,
  FolderOpen,
  Folder,
  MoreHorizontal,
  Plus,
  Pencil,
  Trash2,
  FolderPlus,
} from "lucide-react";

interface Collection {
  id: number;
  name: string;
  icon: string | null;
  color: string | null;
  parentId: number | null;
  _count: { entries: number; children: number };
  children: Collection[];
}

function CollectionNode({
  node,
  depth,
  collapsed: sidebarCollapsed,
  activeCollectionId,
  onSelect,
  onAction,
}: {
  node: Collection;
  depth: number;
  collapsed: boolean;
  activeCollectionId: number | null;
  onSelect: (id: number) => void;
  onAction: (action: string, collection: Collection) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const hasChildren = node.children.length > 0;
  const isActive = activeCollectionId === node.id;

  return (
    <div>
      <div
        className={`collection-node ${isActive ? "active" : ""}`}
        style={{ paddingLeft: sidebarCollapsed ? 8 : 8 + depth * 16 }}
        onClick={() => onSelect(node.id)}
      >
        {hasChildren && !sidebarCollapsed ? (
          <button
            className="collection-expand-btn"
            onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
          >
            {expanded ? <ChevronDown style={{ width: 14, height: 14 }} /> : <ChevronRight style={{ width: 14, height: 14 }} />}
          </button>
        ) : (
          <span style={{ width: 14, flexShrink: 0 }} />
        )}
        <span className="collection-icon" style={node.color ? { color: node.color } : undefined}>
          {node.icon || (expanded && hasChildren ? <FolderOpen style={{ width: 15, height: 15 }} /> : <Folder style={{ width: 15, height: 15 }} />)}
        </span>
        {!sidebarCollapsed && (
          <>
            <span className="collection-name">{node.name}</span>
            <span className="collection-count">{node._count.entries}</span>
            <div style={{ position: "relative" }}>
              <button
                className="collection-menu-btn"
                onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu); }}
              >
                <MoreHorizontal style={{ width: 14, height: 14 }} />
              </button>
              {showMenu && (
                <>
                  <div style={{ position: "fixed", inset: 0, zIndex: 60 }} onClick={() => setShowMenu(false)} />
                  <div className="collection-menu">
                    <button onClick={(e) => { e.stopPropagation(); setShowMenu(false); onAction("rename", node); }}>
                      <Pencil style={{ width: 12, height: 12 }} /> Rename
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); setShowMenu(false); onAction("add-child", node); }}>
                      <FolderPlus style={{ width: 12, height: 12 }} /> Add Sub-collection
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); setShowMenu(false); onAction("delete", node); }} className="collection-menu-danger">
                      <Trash2 style={{ width: 12, height: 12 }} /> Delete
                    </button>
                  </div>
                </>
              )}
            </div>
          </>
        )}
      </div>
      {expanded && hasChildren && !sidebarCollapsed && (
        <div className="collection-children">
          {node.children.map((child) => (
            <CollectionNode
              key={child.id}
              node={child}
              depth={depth + 1}
              collapsed={sidebarCollapsed}
              activeCollectionId={activeCollectionId}
              onSelect={onSelect}
              onAction={onAction}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function CollectionTree({ collapsed }: { collapsed: boolean }) {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [createName, setCreateName] = useState("");
  const [createParentId, setCreateParentId] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const activeCollectionId = pathname === "/entries"
    ? parseInt(searchParams.get("collectionId") || "0") || null
    : null;

  const fetchCollections = () => {
    fetch("/api/collections")
      .then((r) => r.ok ? r.json() : { collections: [] })
      .then((data) => setCollections(data.collections || []))
      .catch(() => {});
  };

  useEffect(() => { fetchCollections(); }, []);

  const handleSelect = (id: number) => {
    if (activeCollectionId === id) {
      router.push("/entries");
    } else {
      router.push(`/entries?collectionId=${id}`);
    }
  };

  const handleCreate = async () => {
    if (!createName.trim()) return;
    const res = await fetch("/api/collections", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: createName.trim(), parentId: createParentId }),
    });
    if (res.ok) {
      setCreateName("");
      setCreateParentId(null);
      setShowCreate(false);
      fetchCollections();
    }
  };

  const handleAction = async (action: string, collection: Collection) => {
    if (action === "rename") {
      setEditingId(collection.id);
      setEditName(collection.name);
    } else if (action === "add-child") {
      setCreateParentId(collection.id);
      setCreateName("");
      setShowCreate(true);
    } else if (action === "delete") {
      if (confirm(`Delete collection "${collection.name}"?`)) {
        await fetch(`/api/collections/${collection.id}`, { method: "DELETE" });
        fetchCollections();
      }
    }
  };

  const handleRename = async () => {
    if (!editingId || !editName.trim()) return;
    await fetch(`/api/collections/${editingId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: editName.trim() }),
    });
    setEditingId(null);
    setEditName("");
    fetchCollections();
  };

  if (collapsed) {
    return (
      <div className="collection-tree-collapsed" title="Collections">
        <Folder style={{ width: 18, height: 18, color: "var(--text-secondary)" }} />
        <style>{collectionStyles}</style>
      </div>
    );
  }

  return (
    <div className="collection-tree">
      <div className="collection-tree-header">
        <span className="collection-tree-label">Collections</span>
        <button className="collection-tree-add" onClick={() => { setShowCreate(!showCreate); setCreateParentId(null); }} title="New collection">
          <Plus style={{ width: 14, height: 14 }} />
        </button>
      </div>

      {/* Rename modal */}
      {editingId !== null && (
        <div className="collection-inline-form">
          <input
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleRename(); if (e.key === "Escape") setEditingId(null); }}
            className="collection-inline-input"
            autoFocus
            placeholder="Collection name"
          />
          <button onClick={handleRename} className="collection-inline-btn">Save</button>
        </div>
      )}

      {/* Create form */}
      {showCreate && (
        <div className="collection-inline-form">
          <input
            value={createName}
            onChange={(e) => setCreateName(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleCreate(); if (e.key === "Escape") setShowCreate(false); }}
            className="collection-inline-input"
            autoFocus
            placeholder={createParentId ? "Sub-collection name" : "Collection name"}
          />
          <button onClick={handleCreate} className="collection-inline-btn">Add</button>
        </div>
      )}

      <div className="collection-tree-list">
        {collections.map((node) => (
          <CollectionNode
            key={node.id}
            node={node}
            depth={0}
            collapsed={collapsed}
            activeCollectionId={activeCollectionId}
            onSelect={handleSelect}
            onAction={handleAction}
          />
        ))}
        {collections.length === 0 && (
          <p className="collection-empty">No collections yet</p>
        )}
      </div>

      <style>{collectionStyles}</style>
    </div>
  );
}

const collectionStyles = `
  .collection-tree {
    padding: 0 8px 8px;
  }
  .collection-tree-collapsed {
    display: flex;
    justify-content: center;
    padding: 8px 0;
    border-top: 1px solid var(--border);
    margin-top: 4px;
  }
  .collection-tree-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 12px 4px;
    border-top: 1px solid var(--border);
    margin-top: 4px;
  }
  .collection-tree-label {
    font-size: 0.65rem;
    font-weight: 600;
    color: var(--text-dim);
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }
  .collection-tree-add {
    background: none;
    border: none;
    color: var(--text-dim);
    cursor: pointer;
    padding: 2px;
    border-radius: 4px;
    display: flex;
    align-items: center;
    transition: all 0.15s;
  }
  .collection-tree-add:hover {
    color: var(--accent);
    background: var(--surface-hover);
  }
  .collection-tree-list {
    display: flex;
    flex-direction: column;
    gap: 1px;
  }
  .collection-node {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 6px 8px;
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.12s;
    font-size: 0.82rem;
    color: var(--text-secondary);
    position: relative;
  }
  .collection-node:hover {
    background: var(--surface-hover);
    color: var(--text);
  }
  .collection-node.active {
    background: var(--accent-muted);
    color: var(--accent);
  }
  .collection-expand-btn {
    background: none;
    border: none;
    padding: 0;
    display: flex;
    align-items: center;
    color: inherit;
    cursor: pointer;
    flex-shrink: 0;
  }
  .collection-icon {
    display: flex;
    align-items: center;
    flex-shrink: 0;
    font-size: 0.85rem;
  }
  .collection-name {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-weight: 500;
  }
  .collection-count {
    font-size: 0.65rem;
    color: var(--text-dim);
    flex-shrink: 0;
  }
  .collection-menu-btn {
    background: none;
    border: none;
    color: var(--text-dim);
    cursor: pointer;
    padding: 2px;
    border-radius: 4px;
    display: none;
    align-items: center;
    transition: all 0.15s;
  }
  .collection-node:hover .collection-menu-btn {
    display: flex;
  }
  .collection-menu-btn:hover {
    color: var(--text);
    background: var(--surface-hover);
  }
  .collection-menu {
    position: absolute;
    right: 0;
    top: 100%;
    z-index: 61;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 8px;
    box-shadow: 0 4px 16px rgba(0,0,0,0.3);
    overflow: hidden;
    min-width: 160px;
  }
  .collection-menu button {
    display: flex;
    align-items: center;
    gap: 8px;
    width: 100%;
    padding: 8px 12px;
    font-size: 0.8rem;
    color: var(--text-secondary);
    background: none;
    border: none;
    cursor: pointer;
    text-align: left;
    transition: background 0.12s;
  }
  .collection-menu button:hover {
    background: var(--surface-hover);
  }
  .collection-menu-danger {
    color: var(--danger) !important;
  }
  .collection-children {
    transition: all 0.15s ease;
  }
  .collection-inline-form {
    display: flex;
    gap: 4px;
    padding: 4px 12px;
  }
  .collection-inline-input {
    flex: 1;
    background: var(--background);
    border: 1px solid var(--border);
    border-radius: 6px;
    padding: 4px 8px;
    font-size: 0.78rem;
    color: var(--text);
    outline: none;
  }
  .collection-inline-input:focus {
    border-color: var(--accent);
  }
  .collection-inline-btn {
    background: var(--accent);
    color: var(--accent-contrast);
    border: none;
    border-radius: 6px;
    padding: 4px 10px;
    font-size: 0.72rem;
    font-weight: 600;
    cursor: pointer;
  }
  .collection-empty {
    font-size: 0.75rem;
    color: var(--text-dim);
    padding: 8px 12px;
  }
`;
