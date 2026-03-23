"use client";

import { useCallback, useEffect, useRef, useState, useMemo } from "react";
import {
  forceSimulation,
  forceLink,
  forceManyBody,
  forceCenter,
  forceCollide,
  type SimulationNodeDatum,
  type SimulationLinkDatum,
} from "d3-force";
import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { X, SlidersHorizontal } from "lucide-react";

/* ═══ Types ═══ */

interface GraphNode extends SimulationNodeDatum {
  id: number;
  title: string;
  type: string;
  source: string;
  summary: string | null;
  degree: number;
}

interface GraphEdge extends SimulationLinkDatum<GraphNode> {
  source: GraphNode | number;
  target: GraphNode | number;
  similarity: number;
}

interface GraphData {
  nodes: Omit<GraphNode, "degree" | "x" | "y">[];
  edges: { source: number; target: number; similarity: number }[];
}

/* ═══ Constants ═══ */

const TYPE_COLORS: Record<string, string> = {
  opportunity: "#C9A96E",
  report: "#60A5FA",
  reference: "#A78BFA",
  project_note: "#4ADE80",
  design: "#C9A96E",
};

const TYPE_OPTIONS = ["opportunity", "report", "reference", "project_note"];

function getTypeColor(type: string): string {
  return TYPE_COLORS[type] || "#71717A";
}

function nodeRadius(degree: number): number {
  return Math.max(6, Math.min(20, 6 + degree * 2));
}

/* ═══ Component ═══ */

export default function KnowledgeGraph() {
  const t = useTranslations("Graph");
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const simRef = useRef<ReturnType<typeof forceSimulation<GraphNode>> | null>(null);
  const rafRef = useRef<number>(0);
  const searchParams = useSearchParams();
  const focusId = useMemo(() => {
    const raw = searchParams.get("focus");
    return raw ? parseInt(raw, 10) : null;
  }, [searchParams]);
  const focusAppliedRef = useRef(false);

  // Data
  const [nodes, setNodes] = useState<GraphNode[]>([]);
  const [edges, setEdges] = useState<GraphEdge[]>([]);
  const [loading, setLoading] = useState(true);

  // Interaction state
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [hoveredNode, setHoveredNode] = useState<GraphNode | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  // Filter state
  const [threshold, setThreshold] = useState(0.75);
  const [activeTypes, setActiveTypes] = useState<Set<string>>(new Set(TYPE_OPTIONS));
  const [filtersOpen, setFiltersOpen] = useState(false);

  // Touch state
  const touchRef = useRef<{
    lastPinchDist: number | null;
    startX: number;
    startY: number;
  }>({ lastPinchDist: null, startX: 0, startY: 0 });

  // Transform (zoom/pan)
  const transformRef = useRef({ x: 0, y: 0, k: 1 });
  const dragRef = useRef<{
    node: GraphNode | null;
    panning: boolean;
    startX: number;
    startY: number;
    startTx: number;
    startTy: number;
  }>({ node: null, panning: false, startX: 0, startY: 0, startTx: 0, startTy: 0 });

  /* ═══ Fetch Data ═══ */

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("threshold", threshold.toString());
      if (activeTypes.size < TYPE_OPTIONS.length) {
        params.set("types", Array.from(activeTypes).join(","));
      }
      const res = await fetch(`/api/graph?${params}`);
      if (!res.ok) throw new Error(t("fetchError"));
      const data: GraphData = await res.json();

      // Compute degree
      const degreeMap = new Map<number, number>();
      data.edges.forEach((e) => {
        degreeMap.set(e.source, (degreeMap.get(e.source) || 0) + 1);
        degreeMap.set(e.target, (degreeMap.get(e.target) || 0) + 1);
      });

      const graphNodes: GraphNode[] = data.nodes.map((n) => ({
        ...n,
        degree: degreeMap.get(n.id) || 0,
      }));

      const nodeMap = new Map(graphNodes.map((n) => [n.id, n]));
      const graphEdges: GraphEdge[] = data.edges
        .filter((e) => nodeMap.has(e.source) && nodeMap.has(e.target))
        .map((e) => ({
          source: nodeMap.get(e.source)!,
          target: nodeMap.get(e.target)!,
          similarity: e.similarity,
        }));

      setNodes(graphNodes);
      setEdges(graphEdges);
      if (!focusId) setSelectedNode(null);
    } catch (err) {
      console.error("Graph fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, [threshold, activeTypes]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  /* ═══ Simulation ═══ */

  useEffect(() => {
    if (nodes.length === 0) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const width = canvas.width;
    const height = canvas.height;

    // Center transform initially
    transformRef.current = { x: width / 2, y: height / 2, k: 1 };

    const sim = forceSimulation<GraphNode>(nodes)
      .force(
        "link",
        forceLink<GraphNode, GraphEdge>(edges)
          .id((d) => d.id)
          .distance(100)
          .strength((d) => (d as GraphEdge).similarity * 0.5),
      )
      .force("charge", forceManyBody().strength(-120))
      .force("center", forceCenter(0, 0))
      .force(
        "collide",
        forceCollide<GraphNode>().radius((d) => nodeRadius(d.degree) + 4),
      )
      .alphaDecay(0.02);

    simRef.current = sim;

    sim.on("tick", () => {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => drawCanvasRef.current());
    });

    return () => {
      sim.stop();
      cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodes, edges]);

  /* ═══ Focus Node from URL ═══ */

  useEffect(() => {
    if (!focusId || nodes.length === 0 || focusAppliedRef.current) return;
    const target = nodes.find((n) => n.id === focusId);
    if (!target) return;

    // Wait for simulation to settle a bit before focusing
    const timer = setTimeout(() => {
      if (target.x == null || target.y == null) return;
      focusAppliedRef.current = true;
      setSelectedNode(target);

      // Animate zoom to node
      const canvas = canvasRef.current;
      if (!canvas) return;
      const dpr = window.devicePixelRatio || 1;
      const w = canvas.width / dpr;
      const h = canvas.height / dpr;
      const targetK = 1.5;

      const startT = { ...transformRef.current };
      const endT = {
        x: w / 2 - target.x! * targetK,
        y: h / 2 - target.y! * targetK,
        k: targetK,
      };
      const duration = 600;
      const startTime = performance.now();

      const animate = (now: number) => {
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / duration, 1);
        // ease-out cubic
        const t = 1 - Math.pow(1 - progress, 3);

        transformRef.current = {
          x: startT.x + (endT.x - startT.x) * t,
          y: startT.y + (endT.y - startT.y) * t,
          k: startT.k + (endT.k - startT.k) * t,
        };
        drawCanvasRef.current();

        if (progress < 1) {
          requestAnimationFrame(animate);
        }
      };
      requestAnimationFrame(animate);
    }, 800);

    return () => clearTimeout(timer);
  }, [focusId, nodes]);

  /* ═══ Canvas Resize ═══ */

  useEffect(() => {
    const resize = () => {
      const canvas = canvasRef.current;
      const wrapper = wrapperRef.current;
      if (!canvas || !wrapper) return;
      const dpr = window.devicePixelRatio || 1;
      const rect = wrapper.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
      const ctx = canvas.getContext("2d");
      if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      drawCanvasRef.current();
    };
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ═══ Canvas Draw ═══ */

  const drawCanvasRef = useRef<() => void>(() => {});

  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    const w = canvas.width / dpr;
    const h = canvas.height / dpr;
    const t = transformRef.current;

    ctx.clearRect(0, 0, w, h);
    ctx.save();
    ctx.translate(t.x, t.y);
    ctx.scale(t.k, t.k);

    const sel = selectedNode;
    const connectedIds = new Set<number>();
    if (sel) {
      edges.forEach((e) => {
        const s = e.source as GraphNode;
        const tgt = e.target as GraphNode;
        if (s.id === sel.id) connectedIds.add(tgt.id);
        if (tgt.id === sel.id) connectedIds.add(s.id);
      });
    }

    // Draw edges
    edges.forEach((e) => {
      const s = e.source as GraphNode;
      const tgt = e.target as GraphNode;
      if (s.x == null || s.y == null || tgt.x == null || tgt.y == null) return;

      let lineWidth = 0.5 + e.similarity * 2;
      let color = "rgba(113, 113, 122, 0.25)";

      if (sel) {
        const isConnected = s.id === sel.id || tgt.id === sel.id;
        if (isConnected) {
          color = "rgba(201, 169, 110, 0.8)";
          lineWidth = 1 + e.similarity * 3;
        } else {
          color = "rgba(113, 113, 122, 0.06)";
        }
      }

      ctx.beginPath();
      ctx.moveTo(s.x, s.y);
      ctx.lineTo(tgt.x, tgt.y);
      ctx.strokeStyle = color;
      ctx.globalAlpha = 1;
      ctx.lineWidth = lineWidth / t.k;
      ctx.stroke();
    });

    ctx.globalAlpha = 1;

    // Draw nodes
    nodes.forEach((node) => {
      if (node.x == null || node.y == null) return;
      const r = nodeRadius(node.degree) / t.k;
      const baseColor = getTypeColor(node.type);

      let alpha = 1;
      let strokeColor = "transparent";
      let strokeWidth = 0;

      if (sel) {
        if (node.id === sel.id) {
          strokeColor = "#fff";
          strokeWidth = 2.5 / t.k;
        } else if (connectedIds.has(node.id)) {
          alpha = 0.8;
        } else {
          alpha = 0.15;
        }
      }

      if (hoveredNode && node.id === hoveredNode.id && !sel) {
        strokeColor = "#fff";
        strokeWidth = 2 / t.k;
      }

      ctx.beginPath();
      ctx.arc(node.x, node.y, r, 0, Math.PI * 2);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = baseColor;
      ctx.fill();
      if (strokeWidth > 0) {
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = strokeWidth;
        ctx.stroke();
      }
    });

    ctx.globalAlpha = 1;
    ctx.restore();
  }, [nodes, edges, selectedNode, hoveredNode]);

  // Keep ref in sync so simulation tick always uses latest drawCanvas
  drawCanvasRef.current = drawCanvas;

  // Redraw when selection or hover changes
  useEffect(() => {
    drawCanvas();
  }, [drawCanvas]);

  /* ═══ Hit Detection ═══ */

  const screenToWorld = useCallback((sx: number, sy: number) => {
    const t = transformRef.current;
    return {
      x: (sx - t.x) / t.k,
      y: (sy - t.y) / t.k,
    };
  }, []);

  const findNodeAt = useCallback(
    (sx: number, sy: number, touch = false): GraphNode | null => {
      const { x, y } = screenToWorld(sx, sy);
      const t = transformRef.current;
      const hitScale = touch ? 2.5 : 1.5;
      for (let i = nodes.length - 1; i >= 0; i--) {
        const n = nodes[i];
        if (n.x == null || n.y == null) continue;
        const r = nodeRadius(n.degree) / t.k;
        const dx = n.x - x;
        const dy = n.y - y;
        if (dx * dx + dy * dy <= r * r * hitScale) return n;
      }
      return null;
    },
    [nodes, screenToWorld],
  );

  /* ═══ Mouse Events ═══ */

  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;
      const sx = e.clientX - rect.left;
      const sy = e.clientY - rect.top;
      const node = findNodeAt(sx, sy);

      if (node) {
        dragRef.current = { node, panning: false, startX: sx, startY: sy, startTx: 0, startTy: 0 };
        node.fx = node.x;
        node.fy = node.y;
        simRef.current?.alphaTarget(0.3).restart();
      } else {
        const t = transformRef.current;
        dragRef.current = {
          node: null,
          panning: true,
          startX: e.clientX,
          startY: e.clientY,
          startTx: t.x,
          startTy: t.y,
        };
      }
    },
    [findNodeAt],
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;
      const sx = e.clientX - rect.left;
      const sy = e.clientY - rect.top;

      setMousePos({ x: e.clientX, y: e.clientY });

      const drag = dragRef.current;
      if (drag.node) {
        const { x, y } = screenToWorld(sx, sy);
        drag.node.fx = x;
        drag.node.fy = y;
        return;
      }

      if (drag.panning) {
        const dx = e.clientX - drag.startX;
        const dy = e.clientY - drag.startY;
        transformRef.current.x = drag.startTx + dx;
        transformRef.current.y = drag.startTy + dy;
        drawCanvas();
        return;
      }

      // Hover detection
      const node = findNodeAt(sx, sy);
      setHoveredNode(node);
      if (canvasRef.current) {
        canvasRef.current.style.cursor = node ? "pointer" : "grab";
      }
    },
    [findNodeAt, screenToWorld, drawCanvas],
  );

  const handleMouseUp = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const drag = dragRef.current;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;

    if (drag.node) {
      // Check if it was a click (not a drag)
      const dx = sx - drag.startX;
      const dy = sy - drag.startY;
      if (dx * dx + dy * dy < 25) {
        setSelectedNode((prev) => (prev?.id === drag.node!.id ? null : drag.node));
      }
      drag.node.fx = null;
      drag.node.fy = null;
      simRef.current?.alphaTarget(0);
    } else if (drag.panning) {
      // Click on empty space — deselect
      const dx = e.clientX - drag.startX;
      const dy = e.clientY - drag.startY;
      if (dx * dx + dy * dy < 25) {
        setSelectedNode(null);
      }
    }

    dragRef.current = { node: null, panning: false, startX: 0, startY: 0, startTx: 0, startTy: 0 };
  }, []);

  const handleWheel = useCallback(
    (e: React.WheelEvent<HTMLCanvasElement>) => {
      e.preventDefault();
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;
      const t = transformRef.current;
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;

      const factor = e.deltaY < 0 ? 1.08 : 1 / 1.08;
      const newK = Math.max(0.1, Math.min(5, t.k * factor));

      // Zoom toward mouse position
      t.x = mx - ((mx - t.x) / t.k) * newK;
      t.y = my - ((my - t.y) / t.k) * newK;
      t.k = newK;

      drawCanvas();
    },
    [drawCanvas],
  );

  /* ═══ Touch Events ═══ */

  const handleTouchStart = useCallback(
    (e: React.TouchEvent<HTMLCanvasElement>) => {
      e.preventDefault();
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;

      if (e.touches.length === 1) {
        const touch = e.touches[0];
        const sx = touch.clientX - rect.left;
        const sy = touch.clientY - rect.top;
        touchRef.current.startX = sx;
        touchRef.current.startY = sy;
        touchRef.current.lastPinchDist = null;

        const node = findNodeAt(sx, sy, true);
        if (node) {
          dragRef.current = { node, panning: false, startX: sx, startY: sy, startTx: 0, startTy: 0 };
          node.fx = node.x;
          node.fy = node.y;
          simRef.current?.alphaTarget(0.3).restart();
        } else {
          const t = transformRef.current;
          dragRef.current = {
            node: null,
            panning: true,
            startX: touch.clientX,
            startY: touch.clientY,
            startTx: t.x,
            startTy: t.y,
          };
        }
      } else if (e.touches.length === 2) {
        // Start pinch
        dragRef.current = { node: null, panning: false, startX: 0, startY: 0, startTx: 0, startTy: 0 };
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        touchRef.current.lastPinchDist = Math.sqrt(dx * dx + dy * dy);
      }
    },
    [findNodeAt],
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent<HTMLCanvasElement>) => {
      e.preventDefault();
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;

      if (e.touches.length === 1) {
        const touch = e.touches[0];
        const sx = touch.clientX - rect.left;
        const sy = touch.clientY - rect.top;
        const drag = dragRef.current;

        if (drag.node) {
          const { x, y } = screenToWorld(sx, sy);
          drag.node.fx = x;
          drag.node.fy = y;
        } else if (drag.panning) {
          const dx = touch.clientX - drag.startX;
          const dy = touch.clientY - drag.startY;
          transformRef.current.x = drag.startTx + dx;
          transformRef.current.y = drag.startTy + dy;
          drawCanvas();
        }
      } else if (e.touches.length === 2) {
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const last = touchRef.current.lastPinchDist;

        if (last != null) {
          const t = transformRef.current;
          const midX = (e.touches[0].clientX + e.touches[1].clientX) / 2 - rect.left;
          const midY = (e.touches[0].clientY + e.touches[1].clientY) / 2 - rect.top;
          const factor = dist / last;
          const newK = Math.max(0.1, Math.min(5, t.k * factor));

          t.x = midX - ((midX - t.x) / t.k) * newK;
          t.y = midY - ((midY - t.y) / t.k) * newK;
          t.k = newK;
          drawCanvas();
        }
        touchRef.current.lastPinchDist = dist;
      }
    },
    [screenToWorld, drawCanvas],
  );

  const handleTouchEnd = useCallback((e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const drag = dragRef.current;

    if (e.touches.length === 0) {
      if (drag.node) {
        const dx =
          (e.changedTouches[0]?.clientX ?? 0) - (canvasRef.current?.getBoundingClientRect().left ?? 0) - drag.startX;
        const dy =
          (e.changedTouches[0]?.clientY ?? 0) - (canvasRef.current?.getBoundingClientRect().top ?? 0) - drag.startY;
        if (dx * dx + dy * dy < 100) {
          // Tap on node
          setSelectedNode((prev) => (prev?.id === drag.node!.id ? null : drag.node));
        }
        drag.node.fx = null;
        drag.node.fy = null;
        simRef.current?.alphaTarget(0);
      } else if (drag.panning) {
        const touch = e.changedTouches[0];
        if (touch) {
          const dx = touch.clientX - drag.startX;
          const dy = touch.clientY - drag.startY;
          if (dx * dx + dy * dy < 100) {
            setSelectedNode(null);
          }
        }
      }
      dragRef.current = { node: null, panning: false, startX: 0, startY: 0, startTx: 0, startTy: 0 };
      touchRef.current.lastPinchDist = null;
    }
  }, []);

  /* ═══ Filter Handlers ═══ */

  const toggleType = (type: string) => {
    setActiveTypes((prev) => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });
  };

  /* ═══ Render ═══ */

  return (
    <div ref={wrapperRef} className="kg-wrapper">
      <canvas
        ref={canvasRef}
        className="kg-canvas"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={() => {
          setHoveredNode(null);
          const drag = dragRef.current;
          if (drag.node) {
            drag.node.fx = null;
            drag.node.fy = null;
            simRef.current?.alphaTarget(0);
          }
          dragRef.current = { node: null, panning: false, startX: 0, startY: 0, startTx: 0, startTy: 0 };
        }}
        onWheel={handleWheel}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      />

      {/* Loading */}
      {loading && (
        <div className="kg-loading">
          <div className="kg-loading-spinner" />
          <span>{t("loading")}</span>
        </div>
      )}

      {/* Empty state */}
      {!loading && nodes.length === 0 && (
        <div className="kg-empty">
          <p>{t("emptyTitle")}</p>
          <p className="kg-empty-sub">{t("emptyHint")}</p>
        </div>
      )}

      {/* Tooltip */}
      {hoveredNode && !selectedNode && (
        <div
          className="kg-tooltip"
          style={{
            left: mousePos.x + 12,
            top: mousePos.y - 8,
          }}
        >
          <div className="kg-tooltip-title">{hoveredNode.title}</div>
          <div className="kg-tooltip-meta">
            <span className="kg-tooltip-type" style={{ color: getTypeColor(hoveredNode.type) }}>
              {hoveredNode.type.replace("_", " ")}
            </span>
            <span className="kg-tooltip-sep">·</span>
            <span>{hoveredNode.source}</span>
          </div>
        </div>
      )}

      {/* Filter Controls */}
      <button className="kg-filter-btn" onClick={() => setFiltersOpen(!filtersOpen)} title="Filter controls">
        <SlidersHorizontal style={{ width: 18, height: 18 }} />
      </button>

      {filtersOpen && (
        <div className="kg-filters">
          <div className="kg-filters-header">
            <span className="kg-filters-title">{t("filters")}</span>
            <button className="kg-filters-close" onClick={() => setFiltersOpen(false)}>
              <X style={{ width: 16, height: 16 }} />
            </button>
          </div>

          <div className="kg-filters-section">
            <label className="kg-filters-label">{t("type")}</label>
            <div className="kg-filters-checks">
              {TYPE_OPTIONS.map((type) => (
                <label key={type} className="kg-check">
                  <input type="checkbox" checked={activeTypes.has(type)} onChange={() => toggleType(type)} />
                  <span className="kg-check-dot" style={{ background: getTypeColor(type) }} />
                  <span>{type.replace("_", " ")}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="kg-filters-section">
            <label className="kg-filters-label">
              {t("similarityThreshold")} <strong>{threshold.toFixed(2)}</strong>
            </label>
            <input
              type="range"
              min="0.5"
              max="1"
              step="0.05"
              value={threshold}
              onChange={(e) => setThreshold(parseFloat(e.target.value))}
              className="kg-slider"
            />
            <div className="kg-slider-labels">
              <span>0.50</span>
              <span>1.00</span>
            </div>
          </div>

          <div className="kg-filters-legend">
            <span className="kg-filters-label">{t("legend")}</span>
            <div className="kg-legend-items">
              {TYPE_OPTIONS.map((type) => (
                <div key={type} className="kg-legend-item">
                  <span className="kg-legend-dot" style={{ background: getTypeColor(type) }} />
                  <span>{type.replace("_", " ")}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Info Panel (desktop) */}
      {selectedNode && (
        <div className="kg-panel">
          <button className="kg-panel-close" onClick={() => setSelectedNode(null)}>
            <X style={{ width: 18, height: 18 }} />
          </button>
          <h3 className="kg-panel-title">{selectedNode.title}</h3>
          <div className="kg-panel-meta">
            <span
              className="kg-panel-badge"
              style={{
                background: getTypeColor(selectedNode.type) + "22",
                color: getTypeColor(selectedNode.type),
                borderColor: getTypeColor(selectedNode.type) + "44",
              }}
            >
              {selectedNode.type.replace("_", " ")}
            </span>
            <span className="kg-panel-source">{selectedNode.source}</span>
          </div>
          {selectedNode.summary && <p className="kg-panel-summary">{selectedNode.summary}</p>}
          <div className="kg-panel-connections">
            <span className="kg-panel-conn-label">{t("connections", { count: selectedNode.degree })}</span>
          </div>
          <Link href={`/entries/${selectedNode.id}`} className="kg-panel-link">
            {t("viewEntry")}
          </Link>
        </div>
      )}

      {/* Mobile Bottom Sheet */}
      {selectedNode && (
        <div className="kg-sheet">
          <div className="kg-sheet-handle" />
          <div className="kg-sheet-content">
            <h3 className="kg-panel-title">{selectedNode.title}</h3>
            <div className="kg-panel-meta">
              <span
                className="kg-panel-badge"
                style={{
                  background: getTypeColor(selectedNode.type) + "22",
                  color: getTypeColor(selectedNode.type),
                  borderColor: getTypeColor(selectedNode.type) + "44",
                }}
              >
                {selectedNode.type.replace("_", " ")}
              </span>
              <span className="kg-panel-source">{selectedNode.source}</span>
            </div>
            {selectedNode.summary && <p className="kg-panel-summary">{selectedNode.summary}</p>}
            <Link href={`/entries/${selectedNode.id}`} className="kg-panel-link">
              {t("viewEntry")}
            </Link>
          </div>
        </div>
      )}

      <style>{`
        /* ═══ Wrapper ═══ */
        .kg-wrapper {
          position: relative;
          width: 100%;
          height: 100vh;
          overflow: hidden;
          background: var(--background);
        }
        .kg-canvas {
          display: block;
          width: 100%;
          height: 100%;
          cursor: grab;
          touch-action: none;
        }
        .kg-canvas:active {
          cursor: grabbing;
        }

        /* ═══ Loading ═══ */
        .kg-loading {
          position: absolute;
          inset: 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 12px;
          color: var(--text-secondary);
          font-size: 0.875rem;
        }
        .kg-loading-spinner {
          width: 32px;
          height: 32px;
          border: 3px solid var(--border);
          border-top-color: var(--accent);
          border-radius: 50%;
          animation: kg-spin 0.8s linear infinite;
        }
        @keyframes kg-spin {
          to { transform: rotate(360deg); }
        }

        /* ═══ Empty ═══ */
        .kg-empty {
          position: absolute;
          inset: 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 4px;
          color: var(--text-secondary);
          font-size: 0.9rem;
        }
        .kg-empty-sub {
          font-size: 0.8rem;
          color: var(--text-dim);
        }

        /* ═══ Tooltip ═══ */
        .kg-tooltip {
          position: fixed;
          z-index: 60;
          pointer-events: none;
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: var(--radius-sm);
          padding: 8px 12px;
          max-width: 260px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        }
        .kg-tooltip-title {
          font-size: 0.8125rem;
          font-weight: 600;
          color: var(--text);
          line-height: 1.3;
          margin-bottom: 4px;
        }
        .kg-tooltip-meta {
          font-size: 0.75rem;
          color: var(--text-secondary);
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .kg-tooltip-type {
          font-weight: 600;
          text-transform: capitalize;
        }
        .kg-tooltip-sep {
          color: var(--text-dim);
        }

        /* ═══ Filter Button ═══ */
        .kg-filter-btn {
          position: absolute;
          top: 16px;
          right: 16px;
          z-index: 20;
          width: 40px;
          height: 40px;
          border-radius: var(--radius-sm);
          background: var(--surface);
          border: 1px solid var(--border);
          color: var(--text-secondary);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.15s;
        }
        .kg-filter-btn:hover {
          color: var(--text);
          border-color: var(--border-hover);
        }

        /* ═══ Filters Panel ═══ */
        .kg-filters {
          position: absolute;
          top: 64px;
          right: 16px;
          z-index: 20;
          width: 240px;
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: var(--radius-md);
          padding: 16px;
          box-shadow: 0 4px 16px rgba(0,0,0,0.3);
        }
        .kg-filters-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 14px;
        }
        .kg-filters-title {
          font-size: 0.875rem;
          font-weight: 600;
          color: var(--text);
        }
        .kg-filters-close {
          background: none;
          border: none;
          color: var(--text-dim);
          cursor: pointer;
          padding: 4px;
          border-radius: 4px;
        }
        .kg-filters-close:hover {
          color: var(--text);
        }
        .kg-filters-section {
          margin-bottom: 16px;
        }
        .kg-filters-label {
          font-size: 0.75rem;
          font-weight: 500;
          color: var(--text-secondary);
          text-transform: uppercase;
          letter-spacing: 0.05em;
          display: block;
          margin-bottom: 8px;
        }
        .kg-filters-checks {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .kg-check {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 0.8125rem;
          color: var(--text);
          cursor: pointer;
          text-transform: capitalize;
        }
        .kg-check input {
          display: none;
        }
        .kg-check-dot {
          width: 12px;
          height: 12px;
          border-radius: 3px;
          flex-shrink: 0;
          opacity: 0.4;
          transition: opacity 0.15s;
        }
        .kg-check input:checked + .kg-check-dot {
          opacity: 1;
        }
        .kg-slider {
          width: 100%;
          accent-color: var(--accent);
          cursor: pointer;
        }
        .kg-slider-labels {
          display: flex;
          justify-content: space-between;
          font-size: 0.6875rem;
          color: var(--text-dim);
          margin-top: 2px;
        }

        /* ═══ Legend ═══ */
        .kg-filters-legend {
          border-top: 1px solid var(--border);
          padding-top: 12px;
        }
        .kg-legend-items {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .kg-legend-item {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 0.8125rem;
          color: var(--text-secondary);
          text-transform: capitalize;
        }
        .kg-legend-dot {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          flex-shrink: 0;
        }

        /* ═══ Info Panel (desktop) ═══ */
        .kg-panel {
          display: none;
          position: absolute;
          top: 16px;
          left: 16px;
          z-index: 20;
          width: 300px;
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: var(--radius-md);
          padding: 20px;
          box-shadow: 0 4px 16px rgba(0,0,0,0.3);
          animation: kg-slide-in 0.2s ease;
        }
        @keyframes kg-slide-in {
          from { opacity: 0; transform: translateX(-8px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @media (min-width: 768px) {
          .kg-panel { display: block; }
        }
        .kg-panel-close {
          position: absolute;
          top: 12px;
          right: 12px;
          background: none;
          border: none;
          color: var(--text-dim);
          cursor: pointer;
          padding: 4px;
          border-radius: 4px;
        }
        .kg-panel-close:hover {
          color: var(--text);
        }
        .kg-panel-title {
          font-family: "Instrument Serif", serif;
          font-size: 1.25rem;
          font-weight: 400;
          color: var(--text);
          margin: 0 0 10px;
          line-height: 1.3;
          padding-right: 24px;
        }
        .kg-panel-meta {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 12px;
        }
        .kg-panel-badge {
          font-size: 0.75rem;
          font-weight: 600;
          padding: 2px 8px;
          border-radius: 999px;
          border: 1px solid;
          text-transform: capitalize;
        }
        .kg-panel-source {
          font-size: 0.75rem;
          color: var(--text-dim);
        }
        .kg-panel-summary {
          font-size: 0.8125rem;
          color: var(--text-secondary);
          line-height: 1.5;
          margin: 0 0 12px;
          display: -webkit-box;
          -webkit-line-clamp: 5;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        .kg-panel-connections {
          margin-bottom: 14px;
        }
        .kg-panel-conn-label {
          font-size: 0.75rem;
          color: var(--text-dim);
        }
        .kg-panel-link {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          font-size: 0.8125rem;
          font-weight: 600;
          color: var(--accent);
          text-decoration: none;
          transition: opacity 0.15s;
        }
        .kg-panel-link:hover {
          opacity: 0.8;
        }

        /* ═══ Mobile Bottom Sheet ═══ */
        .kg-sheet {
          display: block;
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          z-index: 50;
          background: var(--surface);
          border-top: 1px solid var(--border);
          border-radius: var(--radius-lg) var(--radius-lg) 0 0;
          padding: 12px 20px 24px;
          animation: kg-sheet-up 0.25s ease;
          max-height: 50vh;
          overflow-y: auto;
        }
        @keyframes kg-sheet-up {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
        @media (min-width: 768px) {
          .kg-sheet { display: none; }
        }
        .kg-sheet-handle {
          width: 36px;
          height: 4px;
          border-radius: 2px;
          background: var(--border);
          margin: 0 auto 12px;
        }
        .kg-sheet-content {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
      `}</style>
    </div>
  );
}
