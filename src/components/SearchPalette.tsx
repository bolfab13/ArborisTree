import { useState, useEffect, useRef } from 'react';
import { Search, X, User, ArrowUpRight, Compass, Calendar, MapPin, Briefcase } from 'lucide-react';
import { useGenealogy } from '../context/GenealogyContext';
import { Person } from '../types/genealogy';

interface SearchPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SearchPalette({ isOpen, onClose }: SearchPaletteProps) {
  const { tree, setActivePersonId, setFocusPersonId, setViewMode } = useGenealogy();
  const [query, setQuery] = useState('');
  const [filterLiving, setFilterLiving] = useState<'all' | 'living' | 'deceased'>('all');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery('');
    }
  }, [isOpen]);

  // Handle ESC key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const persons = Object.values(tree.persons);
  const q = query.toLowerCase().trim();

  const results = persons.filter((p) => {
    if (filterLiving === 'living' && !p.isLiving) return false;
    if (filterLiving === 'deceased' && p.isLiving) return false;

    if (!q) return true;

    const fullName = `${p.firstName} ${p.lastName}`.toLowerCase();
    const maiden = (p.maidenName || '').toLowerCase();
    const bDate = (p.birthDate || '').toLowerCase();
    const bPlace = (p.birthPlace || '').toLowerCase();
    const dDate = (p.deathDate || '').toLowerCase();
    const dPlace = (p.deathPlace || '').toLowerCase();
    const occu = (p.occupation || '').toLowerCase();

    return (
      fullName.includes(q) ||
      maiden.includes(q) ||
      bDate.includes(q) ||
      bPlace.includes(q) ||
      dDate.includes(q) ||
      dPlace.includes(q) ||
      occu.includes(q)
    );
  }).slice(0, 15);

  const handleSelectPerson = (p: Person, action: 'drawer' | 'tree') => {
    if (action === 'drawer') {
      setActivePersonId(p.id);
    } else {
      setFocusPersonId(p.id);
      setViewMode('tree');
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 px-4 bg-black/75 backdrop-blur-md transition-opacity animate-fade-in font-sans">
      <div 
        className="w-full max-w-2xl bg-[#0c0e12] border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh] text-zinc-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Bar (Verve style) */}
        <div className="relative flex items-center px-4 py-3.5 border-b border-white/10 bg-white/[0.02]">
          <Search className="w-5 h-5 text-zinc-500 shrink-0 mr-3" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher par prénom, nom, lieu, métier, date..."
            className="w-full bg-transparent text-white placeholder-zinc-500 text-sm focus:outline-none"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="p-1 text-zinc-500 hover:text-white rounded cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={onClose}
            className="ml-2 text-xs font-mono text-zinc-500 hover:text-white px-1.5 py-1 rounded bg-white/10 cursor-pointer"
          >
            ESC
          </button>
        </div>

        {/* Quick Filter Bar */}
        <div className="flex items-center gap-2 px-4 py-2 border-b border-white/10 bg-white/[0.01] text-xs font-mono text-zinc-400">
          <span className="text-zinc-500">Filtre :</span>
          <div className="flex items-center gap-1 bg-white/[0.03] p-0.5 rounded-lg border border-white/5">
            <button
              onClick={() => setFilterLiving('all')}
              className={`px-2.5 py-1 rounded-md text-xs transition-colors cursor-pointer ${
                filterLiving === 'all' ? 'bg-white/10 text-white font-medium' : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              Tous ({persons.length})
            </button>
            <button
              onClick={() => setFilterLiving('living')}
              className={`px-2.5 py-1 rounded-md text-xs transition-colors cursor-pointer ${
                filterLiving === 'living' ? 'bg-white/10 text-white font-medium' : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              Vivants ({persons.filter(p => p.isLiving).length})
            </button>
            <button
              onClick={() => setFilterLiving('deceased')}
              className={`px-2.5 py-1 rounded-md text-xs transition-colors cursor-pointer ${
                filterLiving === 'deceased' ? 'bg-white/10 text-white font-medium' : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              Décédés ({persons.filter(p => !p.isLiving).length})
            </button>
          </div>
          <span className="ml-auto text-xs text-zinc-500">
            {results.length} résultat{results.length > 1 ? 's' : ''}
          </span>
        </div>

        {/* Results List */}
        <div className="overflow-y-auto divide-y divide-white/5 p-2">
          {results.length === 0 ? (
            <div className="text-center py-12 px-4">
              <User className="w-10 h-10 text-zinc-700 mx-auto mb-2 opacity-60" />
              <p className="text-sm font-medium text-zinc-300">Aucun résultat trouvé</p>
              <p className="text-xs text-zinc-500 mt-1">Vérifiez l'orthographe ou essayez un lieu ou une année.</p>
            </div>
          ) : (
            results.map((person) => {
              const dates = person.birthDate
                ? `${person.birthDate.replace(/\D/g, '').slice(-4)} — ${person.isLiving ? 'auj.' : person.deathDate ? person.deathDate.replace(/\D/g, '').slice(-4) : '†'}`
                : person.isLiving ? 'Vivant(e)' : 'Décédé(e)';

              return (
                <div
                  key={person.id}
                  className="group flex items-center justify-between p-3 rounded-xl hover:bg-white/[0.04] transition-all"
                >
                  <div 
                    onClick={() => handleSelectPerson(person, 'drawer')}
                    className="flex items-center gap-3.5 flex-1 min-w-0 cursor-pointer"
                  >
                    <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0 border border-white/10 bg-zinc-800 flex items-center justify-center font-mono text-xs text-zinc-400">
                      {person.photoUrl ? (
                        <img
                          src={person.photoUrl}
                          alt=""
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span>{person.firstName[0]}{person.lastName[0]}</span>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline gap-2">
                        <span className="text-sm font-semibold text-white group-hover:text-emerald-400 transition-colors truncate">
                          {person.firstName} {person.lastName}
                        </span>
                        {person.maidenName && (
                          <span className="text-xs font-mono text-zinc-500 truncate">
                            (née {person.maidenName})
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 text-xs text-zinc-400 mt-0.5 truncate">
                        <span className="flex items-center gap-1 font-mono text-[11px] text-zinc-400">
                          <Calendar className="w-3 h-3 text-emerald-400" />
                          {dates}
                        </span>
                        {person.birthPlace && (
                          <>
                            <span>·</span>
                            <span className="flex items-center gap-1 truncate text-zinc-500">
                              <MapPin className="w-3 h-3 text-zinc-500" />
                              {person.birthPlace}
                            </span>
                          </>
                        )}
                        {person.occupation && (
                          <>
                            <span>·</span>
                            <span className="flex items-center gap-1 truncate text-zinc-500">
                              <Briefcase className="w-3 h-3 text-zinc-500" />
                              {person.occupation}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 ml-3 shrink-0">
                    <button
                      onClick={() => handleSelectPerson(person, 'tree')}
                      className="button-verve-secondary text-xs py-1 px-2.5"
                      title="Centrer l'arbre sur cette personne"
                    >
                      <Compass className="w-3 h-3 text-emerald-400" />
                      <span className="hidden sm:inline">Centrer</span>
                    </button>
                    <button
                      onClick={() => handleSelectPerson(person, 'drawer')}
                      className="p-1.5 text-zinc-500 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
                      title="Ouvrir la fiche complète"
                    >
                      <ArrowUpRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2.5 bg-white/[0.02] border-t border-white/10 text-[11px] font-mono text-zinc-500 flex items-center justify-between">
          <span>Recherche instantanée dans l'archipel</span>
          <span>ARCHIPEL</span>
        </div>
      </div>
    </div>
  );
}
