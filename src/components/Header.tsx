import React from 'react';
import { Network, Users, Clock, BarChart3, Plus, Download, Search, Trash2 } from 'lucide-react';
import { useGenealogy } from '../context/GenealogyContext';
import { ViewMode } from '../types/genealogy';

interface HeaderProps {
  onOpenImportExport: () => void;
  onOpenSearchPalette: () => void;
}

export function Header({ onOpenImportExport, onOpenSearchPalette }: HeaderProps) {
  const { viewMode, setViewMode, setIsAddModalOpen, setEditingPerson, setModalAddRelativeTarget, tree, clearTree } = useGenealogy();

  const hasPersons = Object.keys(tree.persons).length > 0;

  const handleAddNew = () => {
    setEditingPerson(null);
    setModalAddRelativeTarget(null);
    setIsAddModalOpen(true);
  };

  const navItems: { mode: ViewMode; label: string; icon: React.ReactNode }[] = [
    { mode: 'tree', label: 'Cartographie', icon: <Network className="w-3.5 h-3.5 mr-1.5" /> },
    { mode: 'directory', label: 'Annuaire', icon: <Users className="w-3.5 h-3.5 mr-1.5" /> },
    { mode: 'timeline', label: 'Ligne du temps', icon: <Clock className="w-3.5 h-3.5 mr-1.5" /> },
    { mode: 'stats', label: 'Démographie', icon: <BarChart3 className="w-3.5 h-3.5 mr-1.5" /> },
  ];

  const totalMembers = Object.keys(tree.persons).length;

  return (
    <header className="sticky top-0 z-40 bg-[#08090c]/90 backdrop-blur-xl border-b border-white/[0.08] px-6 py-3 transition-colors">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-6">
        
        {/* Zone 1: Brand Wordmark */}
        <div className="flex items-center gap-3 shrink-0">
          <button 
            onClick={() => hasPersons && setViewMode('tree')}
            className="flex items-center gap-2.5 text-left group cursor-pointer focus-visible:outline-none"
          >
            <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center font-mono text-xs font-bold shadow-xs">
              ARC
            </div>
            <span className="font-sans text-lg font-bold tracking-tight text-white group-hover:text-emerald-400 transition-colors whitespace-nowrap">
              ARCHIPEL
            </span>
          </button>
          
          {hasPersons && (
            <span className="hidden sm:inline-block text-[11px] font-mono text-zinc-500 border-l border-white/10 pl-3">
              {tree.name || 'Cartographie'} · {totalMembers} nœuds
            </span>
          )}
        </div>

        {/* Zone 2: Navigation Links (Verve style rounded pill links) */}
        {hasPersons ? (
          <nav className="hidden lg:flex items-center gap-1">
            {navItems.map((item) => {
              const isActive = viewMode === item.mode;
              return (
                <button
                  key={item.mode}
                  onClick={() => setViewMode(item.mode)}
                  className={`flex items-center px-3.5 py-1.5 rounded-full text-xs font-mono transition-all whitespace-nowrap shrink-0 cursor-pointer ${
                    isActive
                      ? 'bg-white/10 text-emerald-400 border border-white/15 font-medium'
                      : 'text-zinc-400 hover:text-white hover:bg-white/[0.04]'
                  }`}
                >
                  {item.icon}
                  {item.label}
                </button>
              );
            })}
          </nav>
        ) : (
          <div className="hidden lg:flex items-center gap-2 text-xs font-mono text-zinc-500">
            <span>Archipel vierge · Initialisation requise</span>
          </div>
        )}

        {/* Zone 3: Actions */}
        <div className="flex items-center gap-2.5 shrink-0">
          {hasPersons && (
            <button
              onClick={onOpenSearchPalette}
              className="flex items-center gap-2 px-2.5 py-1.5 text-xs text-zinc-400 bg-white/[0.03] hover:bg-white/[0.08] hover:text-white rounded-full transition-colors border border-white/10 cursor-pointer"
              title="Rechercher une personne (Ctrl+K)"
            >
              <Search className="w-3.5 h-3.5 text-zinc-500" />
              <span className="hidden sm:inline">Recherche</span>
              <kbd className="hidden md:inline-block text-[10px] font-mono bg-white/10 px-1 py-0.5 rounded text-zinc-400">
                ⌘K
              </kbd>
            </button>
          )}

          <button
            onClick={onOpenImportExport}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono text-zinc-300 bg-white/[0.03] hover:bg-white/[0.08] border border-white/10 rounded-full transition-all cursor-pointer whitespace-nowrap shrink-0"
            title="Importer ou exporter en GEDCOM ou JSON"
          >
            <Download className="w-3.5 h-3.5 text-emerald-400" />
            <span>GEDCOM / JSON</span>
          </button>

          {hasPersons ? (
            <>
              <button
                onClick={handleAddNew}
                className="button-verve-primary text-xs py-1.5 px-3.5 whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Ajouter</span>
              </button>

              <button
                onClick={() => {
                  if (window.confirm('Voulez-vous vraiment vider tout l\'archipel ? Toutes les personnes seront supprimées et vous repartirez d\'une page vierge.')) {
                    clearTree();
                  }
                }}
                className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-mono text-zinc-400 hover:text-rose-300 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/30 rounded-full transition-colors cursor-pointer"
                title="Vider complètement l'archipel actuel"
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-400/80" />
                <span className="hidden sm:inline">Vider tout</span>
              </button>
            </>
          ) : null}
        </div>
      </div>

      {/* Mobile nav strip */}
      {hasPersons && (
        <div className="flex lg:hidden overflow-x-auto gap-1 pt-2 pb-0.5 border-t border-white/10 mt-2">
          {navItems.map((item) => (
            <button
              key={item.mode}
              onClick={() => setViewMode(item.mode)}
              className={`flex items-center px-2.5 py-1 rounded-full text-xs font-mono whitespace-nowrap cursor-pointer ${
                viewMode === item.mode
                  ? 'bg-white/10 text-emerald-400 font-semibold'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </div>
      )}
    </header>
  );
}
