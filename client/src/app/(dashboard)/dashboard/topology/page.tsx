'use client';

import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Network,
  Globe,
  Server,
  Shield,
  Loader2,
  ZoomIn,
  ZoomOut,
  Maximize2,
  List,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { assetsApi, targetsApi } from '@/services/api';

interface AssetNode {
  id: string;
  type: string;
  value: string;
  group: number;
  findings: number;
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
  fx?: number | null;
  fy?: number | null;
}

interface AssetLink {
  source: string | AssetNode;
  target: string | AssetNode;
  type: string;
}

const TYPE_COLORS: Record<string, string> = {
  TARGET: '#3b82f6',
  SUBDOMAIN: '#8b5cf6',
  IP_ADDRESS: '#f59e0b',
  PORT: '#ef4444',
  URL: '#10b981',
  ENDPOINT: '#10b981',
  TECHNOLOGY: '#6366f1',
  API_ENDPOINT: '#ec4899',
  JS_LIBRARY: '#14b8a6',
  GEO_IP: '#f97316',
  ASN: '#64748b',
  OTHER: '#6b7280',
};

const TYPE_SIZES: Record<string, number> = {
  TARGET: 24,
  SUBDOMAIN: 16,
  IP_ADDRESS: 14,
  PORT: 8,
  URL: 10,
  ENDPOINT: 10,
  TECHNOLOGY: 12,
  API_ENDPOINT: 10,
  OTHER: 8,
};

export default function TopologyPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [selectedNode, setSelectedNode] = useState<AssetNode | null>(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const nodesRef = useRef<AssetNode[]>([]);
  const linksRef = useRef<AssetLink[]>([]);
  const animRef = useRef<number>(0);

  const { data: targets } = useQuery({
    queryKey: ['targets-topology'],
    queryFn: async () => {
      const res = await targetsApi.list({ limit: 100 });
      return (res.data as any)?.data?.targets || [];
    },
  });

  const { data: assets, isLoading } = useQuery({
    queryKey: ['assets-topology'],
    queryFn: async () => {
      const res = await assetsApi.list({ limit: 500 });
      return (res.data as any)?.data?.assets || [];
    },
  });

  // Build graph when data loads
  useEffect(() => {
    if (!targets?.length && !assets?.length) return;

    const nodes: AssetNode[] = [];
    const links: AssetLink[] = [];
    const nodeMap = new Map<string, AssetNode>();

    // Add target nodes as root
    for (const t of targets || []) {
      const node: AssetNode = {
        id: `target-${t.id}`,
        type: 'TARGET',
        value: t.value,
        group: 0,
        findings: 0,
      };
      nodes.push(node);
      nodeMap.set(t.id, node);
    }

    // Add asset nodes
    for (const a of assets || []) {
      const node: AssetNode = {
        id: `asset-${a.id}`,
        type: a.type,
        value: a.value,
        group: ['SUBDOMAIN', 'IP_ADDRESS'].includes(a.type) ? 1 : 2,
        findings: a._count?.findings || a.findingsCount || 0,
      };
      nodes.push(node);

      // Link to target
      if (a.targetId && nodeMap.has(a.targetId)) {
        links.push({
          source: `target-${a.targetId}`,
          target: node.id,
          type: 'belongs_to',
        });
      }

      // Link subdomains to IPs if IP info is available
      if (a.type === 'SUBDOMAIN' && a.ip) {
        const ipNode = nodes.find(
          (n) => n.type === 'IP_ADDRESS' && n.value === a.ip,
        );
        if (ipNode) {
          links.push({
            source: node.id,
            target: ipNode.id,
            type: 'resolves_to',
          });
        }
      }
    }

    // Simple force-directed layout
    const cx = 400;
    const cy = 300;
    for (let i = 0; i < nodes.length; i++) {
      const angle = (2 * Math.PI * i) / nodes.length;
      const radius = 100 + nodes[i].group * 120;
      nodes[i].x = cx + Math.cos(angle) * radius + (Math.random() - 0.5) * 60;
      nodes[i].y = cy + Math.sin(angle) * radius + (Math.random() - 0.5) * 60;
      nodes[i].vx = 0;
      nodes[i].vy = 0;
    }

    nodesRef.current = nodes;
    linksRef.current = links;

    // Run simple simulation
    const simulate = () => {
      const ns = nodesRef.current;
      const ls = linksRef.current;
      const alpha = 0.1;

      // Repulsion
      for (let i = 0; i < ns.length; i++) {
        for (let j = i + 1; j < ns.length; j++) {
          const dx = (ns[j].x || 0) - (ns[i].x || 0);
          const dy = (ns[j].y || 0) - (ns[i].y || 0);
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const force = 500 / (dist * dist);
          const fx = (dx / dist) * force;
          const fy = (dy / dist) * force;
          ns[i].vx! -= fx * alpha;
          ns[i].vy! -= fy * alpha;
          ns[j].vx! += fx * alpha;
          ns[j].vy! += fy * alpha;
        }
      }

      // Attraction along links
      for (const link of ls) {
        const src = ns.find(
          (n) =>
            n.id === (typeof link.source === 'string' ? link.source : link.source.id),
        );
        const tgt = ns.find(
          (n) =>
            n.id === (typeof link.target === 'string' ? link.target : link.target.id),
        );
        if (!src || !tgt) continue;
        const dx = (tgt.x || 0) - (src.x || 0);
        const dy = (tgt.y || 0) - (src.y || 0);
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const force = (dist - 120) * 0.01;
        src.vx! += (dx / dist) * force * alpha;
        src.vy! += (dy / dist) * force * alpha;
        tgt.vx! -= (dx / dist) * force * alpha;
        tgt.vy! -= (dy / dist) * force * alpha;
      }

      // Center gravity
      for (const n of ns) {
        if (n.fx != null) {
          n.x = n.fx;
          n.y = n.fy!;
          continue;
        }
        n.vx! *= 0.9;
        n.vy! *= 0.9;
        n.vx! += (cx - (n.x || 0)) * 0.001;
        n.vy! += (cy - (n.y || 0)) * 0.001;
        n.x = (n.x || 0) + n.vx!;
        n.y = (n.y || 0) + n.vy!;
      }
    };

    // Run a few iterations to settle
    for (let i = 0; i < 100; i++) simulate();

    // Draw loop
    const draw = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);
      ctx.save();
      ctx.translate(offset.x, offset.y);
      ctx.scale(zoom, zoom);

      // Draw links
      ctx.strokeStyle = '#e5e7eb';
      ctx.lineWidth = 1;
      for (const link of linksRef.current) {
        const src = nodesRef.current.find(
          (n) =>
            n.id === (typeof link.source === 'string' ? link.source : link.source.id),
        );
        const tgt = nodesRef.current.find(
          (n) =>
            n.id === (typeof link.target === 'string' ? link.target : link.target.id),
        );
        if (!src || !tgt) continue;
        ctx.beginPath();
        ctx.moveTo(src.x || 0, src.y || 0);
        ctx.lineTo(tgt.x || 0, tgt.y || 0);
        ctx.stroke();
      }

      // Draw nodes
      for (const node of nodesRef.current) {
        const r = TYPE_SIZES[node.type] || 8;
        const color = TYPE_COLORS[node.type] || '#6b7280';

        ctx.beginPath();
        ctx.arc(node.x || 0, node.y || 0, r, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();

        if (selectedNode?.id === node.id) {
          ctx.strokeStyle = '#fff';
          ctx.lineWidth = 3;
          ctx.stroke();
          ctx.strokeStyle = color;
          ctx.lineWidth = 2;
          ctx.stroke();
        }

        // Label
        ctx.fillStyle = '#374151';
        ctx.font = '10px sans-serif';
        ctx.textAlign = 'center';
        const label =
          node.value.length > 20
            ? node.value.substring(0, 20) + '...'
            : node.value;
        ctx.fillText(label, node.x || 0, (node.y || 0) + r + 12);

        // Findings badge
        if (node.findings > 0) {
          ctx.fillStyle = '#ef4444';
          ctx.beginPath();
          ctx.arc((node.x || 0) + r - 2, (node.y || 0) - r + 2, 6, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#fff';
          ctx.font = 'bold 8px sans-serif';
          ctx.fillText(String(node.findings), (node.x || 0) + r - 2, (node.y || 0) - r + 5);
        }
      }

      ctx.restore();
      animRef.current = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [targets, assets, zoom, offset, selectedNode]);

  // Handle canvas resize
  useEffect(() => {
    const resize = () => {
      const canvas = canvasRef.current;
      const container = containerRef.current;
      if (!canvas || !container) return;
      canvas.width = container.clientWidth;
      canvas.height = container.clientHeight;
    };
    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);

  // Canvas click handler
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mx = (e.clientX - rect.left - offset.x) / zoom;
    const my = (e.clientY - rect.top - offset.y) / zoom;

    let found: AssetNode | null = null;
    for (const node of nodesRef.current) {
      const r = TYPE_SIZES[node.type] || 8;
      const dx = (node.x || 0) - mx;
      const dy = (node.y || 0) - my;
      if (dx * dx + dy * dy <= (r + 4) * (r + 4)) {
        found = node;
        break;
      }
    }
    setSelectedNode(found);
  };

  // Pan
  const handleMouseDown = (e: React.MouseEvent) => {
    setDragging(true);
    setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!dragging) return;
    setOffset({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
  };

  const handleMouseUp = () => setDragging(false);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Network className="h-6 w-6" />
            Asset Topology
          </h1>
          <p className="text-muted-foreground text-sm">
            Interactive network map of discovered assets and their relationships
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setZoom((z) => Math.min(3, z + 0.2))}
          >
            <ZoomIn className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setZoom((z) => Math.max(0.3, z - 0.2))}
          >
            <ZoomOut className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => {
              setZoom(1);
              setOffset({ x: 0, y: 0 });
            }}
          >
            <Maximize2 className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" asChild>
            <a href="/dashboard/assets">
              <List className="h-4 w-4 mr-1" /> List View
            </a>
          </Button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 text-xs">
        {Object.entries(TYPE_COLORS).slice(0, 8).map(([type, color]) => (
          <div key={type} className="flex items-center gap-1.5">
            <div
              className="w-3 h-3 rounded-full"
              style={{ background: color }}
            />
            <span className="text-muted-foreground">{type.replace('_', ' ')}</span>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Canvas */}
        <div
          ref={containerRef}
          className="lg:col-span-3 bg-card border rounded-lg overflow-hidden"
          style={{ height: '600px', cursor: dragging ? 'grabbing' : 'grab' }}
        >
          <canvas
            ref={canvasRef}
            onClick={handleCanvasClick}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          />
        </div>

        {/* Detail Panel */}
        <Card className="lg:col-span-1 h-fit">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">
              {selectedNode ? 'Asset Details' : 'Select an Asset'}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-3">
            {selectedNode ? (
              <>
                <div>
                  <span className="text-muted-foreground">Type</span>
                  <div className="flex items-center gap-2 mt-1">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{
                        background: TYPE_COLORS[selectedNode.type] || '#6b7280',
                      }}
                    />
                    <Badge variant="outline">{selectedNode.type}</Badge>
                  </div>
                </div>
                <div>
                  <span className="text-muted-foreground">Value</span>
                  <p className="font-mono text-xs break-all mt-1">
                    {selectedNode.value}
                  </p>
                </div>
                {selectedNode.findings > 0 && (
                  <div>
                    <span className="text-muted-foreground">Findings</span>
                    <p className="text-red-500 font-medium mt-1">
                      {selectedNode.findings} vulnerabilities
                    </p>
                  </div>
                )}
                <div className="pt-2">
                  <span className="text-muted-foreground">Connected to</span>
                  <div className="mt-1 space-y-1">
                    {linksRef.current
                      .filter(
                        (l) =>
                          (typeof l.source === 'string'
                            ? l.source
                            : l.source.id) === selectedNode.id ||
                          (typeof l.target === 'string'
                            ? l.target
                            : l.target.id) === selectedNode.id,
                      )
                      .slice(0, 10)
                      .map((l, i) => {
                        const otherId =
                          (typeof l.source === 'string'
                            ? l.source
                            : l.source.id) === selectedNode.id
                            ? typeof l.target === 'string'
                              ? l.target
                              : l.target.id
                            : typeof l.source === 'string'
                              ? l.source
                              : l.source.id;
                        const other = nodesRef.current.find(
                          (n) => n.id === otherId,
                        );
                        return (
                          <div key={i} className="text-xs text-muted-foreground truncate">
                            → {other?.value || otherId}
                          </div>
                        );
                      })}
                  </div>
                </div>
              </>
            ) : (
              <div className="text-muted-foreground text-center py-8">
                <Network className="h-8 w-8 mx-auto mb-2 opacity-30" />
                Click on a node to view details
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
