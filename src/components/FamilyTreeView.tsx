import { useState, useRef, useMemo, useEffect, useCallback } from 'react';
import { 
  ZoomIn, 
  ZoomOut, 
  Maximize2, 
  RotateCcw, 
  UserPlus, 
  Users, 
  Layers, 
  Sparkles, 
  ChevronDown, 
  Info, 
  CheckCircle2, 
  HelpCircle, 
  AlertTriangle,
  Search,
  Crosshair,
  X
} from 'lucide-react';
import { useGenealogy } from '../context/GenealogyContext';
import { calculateFamilyTreeLayout, DEFAULT_LAYOUT_OPTIONS } from '../utils/familyTreeLayout';
import { FamilyTreeNode } from './FamilyTreeNode';

export function FamilyTreeView() {
  const { 
    tree, 
    loadTree, 
    focusPersonId, 
    setFocusPersonId, 
    setActivePersonId, 
    quickAddRelative 
  } = useGenealogy();

  // Search & Pivot State
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Canvas Viewport Transformation
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [showSiblings, setShowSiblings] = useState(true);
  
  const containerRef = useRef<HTMLDivElement>(null);

  // Compute pure layout
  const layout = useMemo(() => {
    return calculateFamilyTreeLayout(focusPersonId, tree.persons, {
      ...DEFAULT_LAYOUT_OPTIONS,
      showSiblings,
    });
  }, [focusPersonId, tree.persons, showSiblings]);

  // Center canvas on the focused node
  const centerOnFocus = useCallback(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    const focusedNode = layout.nodes.find((n) => n.isFocused) || layout.nodes[0];
    if (!focusedNode) return;

    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;

    const targetX = containerWidth / 2 - (focusedNode.x + focusedNode.width / 2) * zoom;
    const targetY = containerHeight / 2 - (focusedNode.y + focusedNode.height / 2) * zoom;

    setPan({ x: targetX, y: targetY });
  }, [layout.nodes, zoom]);

  // Fit the whole branch into view
  const fitToView = useCallback(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    const { bounds } = layout;
    if (bounds.width === 0 || bounds.height === 0) return;

    const padding = 100;
    const availWidth = container.clientWidth - padding * 2;
    const availHeight = container.clientHeight - padding * 2;

    const scaleX = availWidth / bounds.width;
    const scaleY = availHeight / bounds.height;
    const newZoom = Math.min(Math.max(Math.min(scaleX, scaleY), 0.35), 1.4);

    const boundsCenterX = bounds.minX + bounds.width / 2;
    const boundsCenterY = bounds.minY + bounds.height / 2;

    const targetX = container.clientWidth / 2 - boundsCenterX * newZoom;
    const targetY = container.clientHeight / 2 - boundsCenterY * newZoom;

    setZoom(newZoom);
    setPan({ x: targetX, y: targetY });
  }, [layout]);

  // Initial centering when tree loads or when pivot changes
  useEffect(() => {
    centerOnFocus();
  }, [focusPersonId]);

  // Instant person search for pivoting the tree
  const matchingPersons = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase().trim();
    return Object.values(tree.persons)
      .filter((p) => {
        const full = `${p.firstName} ${p.lastName} ${p.maidenName || ''}`.toLowerCase();
        return full.includes(q);
      })
      .slice(0, 8);
  }, [tree.persons, searchQuery]);

  const handleSelectPivot = (personId: string) => {
    setFocusPersonId(personId);
    setSearchQuery('');
    setIsSearchOpen(false);
  };

  // Mouse pan handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.group')) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPan({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => setIsDragging(false);

  // Wheel zoom
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.08 : 0.92;
    setZoom((prev) => Math.min(Math.max(prev * zoomFactor, 0.25), 2.5));
  };

  return (
    <div className="relative w-full h-[calc(100vh-65px)] overflow-hidden bg-[#090b0e] select-none flex flex-col text-zinc-100 font-sans">
      
      {/* Top Floating Control Toolbar */}
      <div className="absolute top-4 left-4 right-4 z-20 flex flex-wrap items-center justify-between gap-3 pointer-events-none">
        
        {/* Left: Focus Person selector & Fratrie toggle */}
        <div className="flex items-center gap-2 pointer-events-auto bg-zinc-900/90 backdrop-blur-md border border-zinc-800 rounded-lg shadow-xl p-1.5">
          <div className="relative">
            <select
              value={focusPersonId}
              onChange={(e) => setFocusPersonId(e.target.value)}
              className="appearance-none pl-3 pr-8 py-1.5 text-xs font-medium text-zinc-200 bg-transparent focus:outline-none cursor-pointer"
            >
              {Object.values(tree.persons).map((p) => (
                <option key={p.id} value={p.id} className="bg-zinc-900 text-zinc-200">
                  {p.firstName} {p.lastName} {p.birthDate ? `(${p.birthDate.replace(/\D/g, '').slice(-4)})` : ''}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-zinc-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          <div className="h-4 w-px bg-zinc-800" />

          {/* Toggle Fratrie */}
          <button
            onClick={() => setShowSiblings((v) => !v)}
            className={`px-2.5 py-1 text-xs font-mono rounded transition-colors cursor-pointer flex items-center gap-1.5 ${
              showSiblings
                ? 'bg-zinc-800 text-emerald-400 font-medium'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
            }`}
            title="Afficher ou masquer les frères et sœurs de la personne focalisée"
          >
            <Users className="w-3.5 h-3.5" />
            <span>Fratrie {showSiblings ? 'Active' : 'Masquée'}</span>
          </button>
        </div>

        {/* Center: Instant Name Search & Pivot Selector */}
        <div className="relative pointer-events-auto flex items-center">
          <div className="relative flex items-center bg-zinc-900/90 backdrop-blur-md border border-zinc-800 rounded-lg shadow-xl px-2.5 py-1">
            <Search className="w-3.5 h-3.5 text-zinc-400 mr-2 shrink-0" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setIsSearchOpen(true);
              }}
              onFocus={() => setIsSearchOpen(true)}
              placeholder="Rechercher un nom pour pivoter l'arbre..."
              className="bg-transparent text-xs text-white placeholder-zinc-500 focus:outline-none w-44 sm:w-64 font-sans"
            />
            {searchQuery && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setIsSearchOpen(false);
                }}
                className="p-0.5 text-zinc-400 hover:text-white cursor-pointer"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Instant Search Results Dropdown */}
          {isSearchOpen && matchingPersons.length > 0 && (
            <div className="absolute top-full left-0 mt-1.5 w-72 bg-zinc-900/95 border border-zinc-700/80 rounded-xl shadow-2xl overflow-hidden z-30 animate-fade-in divide-y divide-zinc-800/80">
              <div className="px-3 py-1.5 text-[10px] font-mono text-zinc-400 uppercase tracking-wider bg-zinc-950/60 flex items-center justify-between">
                <span>Pivoter l'arbre sur :</span>
                <span className="text-emerald-400 font-semibold">{matchingPersons.length} trouvé{matchingPersons.length > 1 ? 's' : ''}</span>
              </div>
              {matchingPersons.map((p) => {
                const isCurrent = p.id === focusPersonId;
                const birthYear = p.birthDate ? p.birthDate.replace(/\D/g, '').slice(-4) : '';
                return (
                  <button
                    key={p.id}
                    onClick={() => handleSelectPivot(p.id)}
                    className={`w-full text-left px-3 py-2 flex items-center justify-between text-xs transition-colors cursor-pointer ${
                      isCurrent
                        ? 'bg-emerald-500/15 text-emerald-300'
                        : 'hover:bg-zinc-800/80 text-zinc-200'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-6 h-6 rounded bg-zinc-800 border border-zinc-700 flex items-center justify-center text-[10px] font-mono font-bold text-zinc-400 shrink-0">
                        {p.firstName[0]}{p.lastName[0]}
                      </div>
                      <div className="truncate">
                        <span className="font-semibold block truncate">
                          {p.firstName} {p.lastName}
                        </span>
                        {birthYear && (
                          <span className="text-[10px] font-mono text-zinc-500">
                            née/né en {birthYear}
                          </span>
                        )}
                      </div>
                    </div>
                    <span className="text-[10px] font-mono text-emerald-400 px-1.5 py-0.5 rounded bg-emerald-500/10 shrink-0 ml-2 flex items-center gap-1">
                      <Crosshair className="w-2.5 h-2.5" />
                      Pivot
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Right: Zoom & Navigation Controls */}
        <div className="flex items-center gap-1.5 pointer-events-auto bg-zinc-900/90 backdrop-blur-md border border-zinc-800 rounded-lg shadow-xl p-1.5">
          <button
            onClick={() => setZoom((z) => Math.min(z + 0.15, 2.5))}
            className="p-1.5 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 rounded transition-colors cursor-pointer"
            title="Zoom avant (+)"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <span className="text-[11px] font-mono text-zinc-400 px-1 min-w-[42px] text-center tabular-nums">
            {Math.round(zoom * 100)}%
          </span>
          <button
            onClick={() => setZoom((z) => Math.max(z - 0.15, 0.25))}
            className="p-1.5 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 rounded transition-colors cursor-pointer"
            title="Zoom arrière (-)"
          >
            <ZoomOut className="w-4 h-4" />
          </button>

          <div className="h-4 w-px bg-zinc-800" />

          <button
            onClick={fitToView}
            className="flex items-center gap-1 px-2 py-1 text-xs text-zinc-300 hover:text-zinc-100 hover:bg-zinc-800 rounded transition-colors cursor-pointer"
            title="Ajuster la vue à l'ensemble de la branche"
          >
            <Maximize2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Ajuster</span>
          </button>

          <button
            onClick={centerOnFocus}
            className="flex items-center gap-1 px-2 py-1 text-xs text-emerald-400 hover:text-emerald-300 hover:bg-emerald-950/40 rounded transition-colors cursor-pointer"
            title="Recentrer sur la personne focalisée"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Recentrer</span>
          </button>
        </div>
      </div>

      {/* Main Interactive Canvas Area */}
      <div
        ref={containerRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onWheel={handleWheel}
        className={`w-full h-full relative cursor-grab active:cursor-grabbing overflow-hidden ${
          isDragging ? 'cursor-grabbing' : ''
        }`}
      >
        {/* Verve Technical Grid Background */}
        <div 
          className="absolute inset-0 opacity-15 pointer-events-none"
          style={{
            backgroundImage: `radial-gradient(#52525b 1px, transparent 1px)`,
            backgroundSize: `${28 * zoom}px ${28 * zoom}px`,
            backgroundPosition: `${pan.x}px ${pan.y}px`,
          }}
        />

        {/* Transformed Stage */}
        <div
          className="absolute inset-0 origin-top-left transition-transform duration-75 ease-out"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          }}
        >
          {/* SVG Connection Layer for Union lines, Stems, and Distribution bars */}
          <svg
            className="absolute top-0 left-0 overflow-visible pointer-events-none"
            style={{ width: '1px', height: '1px' }}
          >
            <defs>
              <filter id="glow-incoherent" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="0" dy="0" stdDeviation="2" floodColor="#f43f5e" />
              </filter>
            </defs>

            {layout.edges.map((edge) => {
              const isContested = edge.status === 'contested' || edge.isIncoherent;
              const isToConfirm = edge.status === 'to_confirm';

              let strokeColor = '#71717a'; // zinc-500
              let strokeDasharray = undefined;
              let strokeWidth = 2;

              if (isContested) {
                strokeColor = '#f43f5e'; // rose-500
                strokeWidth = 2.5;
              } else if (isToConfirm) {
                strokeColor = '#a1a1aa'; // zinc-400
                strokeDasharray = '4 4';
                strokeWidth = 1.5;
              } else {
                strokeColor = '#3f3f46'; // zinc-700
                strokeWidth = 2;
              }

              return (
                <path
                  key={edge.id}
                  d={edge.path}
                  fill="none"
                  stroke={strokeColor}
                  strokeWidth={strokeWidth}
                  strokeDasharray={strokeDasharray}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  filter={isContested ? 'url(#glow-incoherent)' : undefined}
                />
              );
            })}

            {/* Union connection hubs / rings */}
            {layout.unions.map((u) => {
              const isContested = u.status === 'contested';
              return (
                <g key={`hub_${u.id}`} transform={`translate(${u.midX}, ${u.midY})`}>
                  <circle
                    r={5}
                    fill={isContested ? '#f43f5e' : '#18181b'}
                    stroke={isContested ? '#f43f5e' : '#3f3f46'}
                    strokeWidth={2}
                  />
                  <circle
                    r={2}
                    fill={isContested ? '#ffffff' : '#10b981'}
                  />
                </g>
              );
            })}
          </svg>

          {/* Cards Layer */}
          {layout.nodes.map((node) => (
            <FamilyTreeNode
              key={node.id}
              node={node}
              onFocus={(id) => setFocusPersonId(id)}
              onOpenDetails={(id) => setActivePersonId(id)}
              onAddParent={(type, targetId) => quickAddRelative(type === 'add_father' ? 'father' : 'mother', targetId)}
            />
          ))}
        </div>
      </div>

      {/* Bottom Technical Status & Legend Strip */}
      <div className="absolute bottom-4 left-4 right-4 z-20 flex flex-wrap items-center justify-between gap-4 pointer-events-none">
        
        {/* Left: Relationship status legend */}
        <div className="pointer-events-auto bg-zinc-900/90 backdrop-blur-md border border-zinc-800 rounded-lg shadow-xl px-3.5 py-2 text-xs text-zinc-400 flex items-center gap-4">
          <div className="flex items-center gap-1.5 font-mono text-[11px]">
            <span className="w-3 h-0.5 bg-zinc-400 inline-block" />
            <span>Validée</span>
          </div>
          <div className="flex items-center gap-1.5 font-mono text-[11px]">
            <span className="w-3 h-0.5 border-b border-dashed border-zinc-400 inline-block" />
            <span>À confirmer</span>
          </div>
          <div className="flex items-center gap-1.5 font-mono text-[11px] text-rose-400">
            <span className="w-3 h-0.5 bg-rose-500 inline-block" />
            <span>Contestée / Incohérence</span>
          </div>
        </div>

        {/* Right: Quick shortcut tips */}
        <div className="hidden md:flex pointer-events-auto bg-zinc-900/90 backdrop-blur-md border border-zinc-800 rounded-lg shadow-xl px-3.5 py-2 text-[11px] font-mono text-zinc-500 items-center gap-3">
          <span>Clic : focaliser</span>
          <span>·</span>
          <span>Double-clic : fiche</span>
          <span>·</span>
          <span>Molette : zoom</span>
          <span>·</span>
          <span>Drag : naviguer</span>
        </div>
      </div>

    </div>
  );
}
