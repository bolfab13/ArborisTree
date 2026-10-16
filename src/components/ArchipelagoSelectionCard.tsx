import { useState, useMemo } from 'react';
import { 
  CheckSquare, 
  Square, 
  CheckCircle2, 
  ArrowRight, 
  Search, 
  Crosshair, 
  Users, 
  Calendar,
  Layers,
  ChevronDown
} from 'lucide-react';
import { ArchipelagoComponent, FamilyTree, Person } from '../types/genealogy';
import { filterTreeByArchipelagos } from '../utils/gedcom';

interface ArchipelagoSelectionCardProps {
  fullTree: FamilyTree;
  archipelagos: ArchipelagoComponent[];
  fileName?: string;
  onConfirmImport: (filteredTree: FamilyTree) => void;
  onCancel?: () => void;
}

export function ArchipelagoSelectionCard({
  fullTree,
  archipelagos,
  fileName,
  onConfirmImport,
  onCancel,
}: ArchipelagoSelectionCardProps) {
  // Selected archipelago IDs (default: all selected)
  const [selectedIds, setSelectedIds] = useState<string[]>(() =>
    archipelagos.map((a) => a.id)
  );

  // Pivot person search & selection
  const [chosenPivotId, setChosenPivotId] = useState<string>(() => {
    return fullTree.rootPersonId || archipelagos[0]?.rootPersonId || '';
  });
  const [pivotSearchQuery, setPivotSearchQuery] = useState('');
  const [isPivotDropdownOpen, setIsPivotDropdownOpen] = useState(false);

  // Toggle single archipelago
  const handleToggle = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Select all / Deselect all
  const handleSelectAll = () => {
    setSelectedIds(archipelagos.map((a) => a.id));
  };

  const handleDeselectAll = () => {
    setSelectedIds([]);
  };

  // Pool of all persons in the currently selected archipelagos
  const availablePersons = useMemo(() => {
    const pids = new Set<string>();
    archipelagos.forEach((arch) => {
      if (selectedIds.includes(arch.id)) {
        arch.personIds.forEach((id) => pids.add(id));
      }
    });

    return Array.from(pids)
      .map((id) => fullTree.persons[id])
      .filter((p): p is Person => Boolean(p));
  }, [archipelagos, selectedIds, fullTree.persons]);

  // Update chosen pivot if it falls outside selected archipelagos
  const effectivePivotId = useMemo(() => {
    if (availablePersons.some((p) => p.id === chosenPivotId)) {
      return chosenPivotId;
    }
    return availablePersons[0]?.id || '';
  }, [availablePersons, chosenPivotId]);

  // Search filtered persons for pivot
  const filteredPivotCandidates = useMemo(() => {
    if (!pivotSearchQuery.trim()) {
      return availablePersons.slice(0, 20);
    }
    const q = pivotSearchQuery.toLowerCase().trim();
    return availablePersons
      .filter((p) => {
        const full = `${p.firstName} ${p.lastName} ${p.maidenName || ''}`.toLowerCase();
        return full.includes(q);
      })
      .slice(0, 20);
  }, [availablePersons, pivotSearchQuery]);

  const selectedTotalCount = availablePersons.length;
  const isMultiple = archipelagos.length > 1;

  const currentPivotPerson = fullTree.persons[effectivePivotId];

  const handleConfirm = () => {
    if (selectedTotalCount === 0) return;
    const filteredTree = filterTreeByArchipelagos(
      fullTree,
      selectedIds,
      archipelagos,
      effectivePivotId
    );
    onConfirmImport(filteredTree);
  };

  return (
    <div className="rounded-2xl bg-zinc-950/80 border border-emerald-500/30 p-5 space-y-5 text-zinc-100 shadow-2xl animate-fade-in font-sans">
      
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/10">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <h3 className="text-sm font-bold text-white tracking-tight">
              {isMultiple
                ? `${archipelagos.length} archipels séparés détectés`
                : 'Archipel généalogique détecté'}
            </h3>
          </div>
          <p className="text-xs text-zinc-400 mt-0.5">
            {isMultiple
              ? 'Choisissez les branches familiales indépendantes à charger et définissez le pivot central.'
              : 'Vérifiez le contenu et définissez la personne pivot pour recentrer la vue.'}
          </p>
        </div>

        {isMultiple && (
          <div className="flex items-center gap-1.5 font-mono text-[11px] shrink-0">
            <button
              type="button"
              onClick={handleSelectAll}
              className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white border border-white/10 transition-colors cursor-pointer flex items-center gap-1"
            >
              <CheckSquare className="w-3 h-3 text-emerald-400" />
              <span>Tout sélectionner</span>
            </button>
            <button
              type="button"
              onClick={handleDeselectAll}
              className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white border border-white/10 transition-colors cursor-pointer flex items-center gap-1"
            >
              <Square className="w-3 h-3" />
              <span>Tout désélectionner</span>
            </button>
          </div>
        )}
      </div>

      {/* Archipelagos Cards List (if multiple) */}
      {isMultiple && (
        <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
          {archipelagos.map((arch) => {
            const isSelected = selectedIds.includes(arch.id);
            const rootP = fullTree.persons[arch.rootPersonId];
            return (
              <div
                key={arch.id}
                onClick={() => handleToggle(arch.id)}
                className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                  isSelected
                    ? 'bg-emerald-500/[0.08] border-emerald-500/40 text-white'
                    : 'bg-white/[0.02] border-white/5 text-zinc-400 hover:bg-white/[0.04]'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => {}}
                    className="w-4 h-4 rounded text-emerald-400 focus:ring-emerald-400 cursor-pointer shrink-0"
                  />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-white truncate">
                        {arch.name}
                      </span>
                      {arch.dateRange && (
                        <span className="text-[10px] font-mono text-zinc-400 bg-white/5 px-1.5 py-0.5 rounded">
                          {arch.dateRange}
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-zinc-400 truncate mt-0.5">
                      Patronymes : <span className="text-zinc-300">{arch.keySurnames.join(', ') || '—'}</span>
                      {rootP && (
                        <span className="text-zinc-500 ml-1.5">
                          · Réf. : {rootP.firstName} {rootP.lastName}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="text-right shrink-0 font-mono text-[11px]">
                  <span className="font-bold text-emerald-400">{arch.personCount}</span>
                  <span className="text-zinc-500 text-[10px] block">individus</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pivot Person Search & Selector */}
      <div className="space-y-2 pt-1 border-t border-white/10">
        <label className="block text-xs font-mono text-zinc-300 uppercase tracking-wider flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <Crosshair className="w-3.5 h-3.5 text-emerald-400" />
            <span>Choisir la personne pivot de l'arbre</span>
          </span>
          {currentPivotPerson && (
            <span className="text-emerald-400 font-semibold lowercase tracking-normal">
              pivot actuel : {currentPivotPerson.firstName} {currentPivotPerson.lastName}
            </span>
          )}
        </label>

        {/* Search input for pivot */}
        <div className="relative">
          <div className="flex items-center bg-white/[0.04] border border-white/15 focus-within:border-emerald-400 rounded-xl px-3 py-2 transition-colors">
            <Search className="w-3.5 h-3.5 text-zinc-400 mr-2 shrink-0" />
            <input
              type="text"
              value={pivotSearchQuery}
              onChange={(e) => {
                setPivotSearchQuery(e.target.value);
                setIsPivotDropdownOpen(true);
              }}
              onFocus={() => setIsPivotDropdownOpen(true)}
              placeholder="Rechercher un nom pour choisir le pivot..."
              className="bg-transparent text-xs text-white placeholder-zinc-500 focus:outline-none w-full font-sans"
            />
            <ChevronDown 
              onClick={() => setIsPivotDropdownOpen(!isPivotDropdownOpen)}
              className="w-3.5 h-3.5 text-zinc-400 cursor-pointer ml-1" 
            />
          </div>

          {/* Pivot dropdown list */}
          {isPivotDropdownOpen && availablePersons.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1.5 bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl max-h-48 overflow-y-auto z-40 divide-y divide-zinc-800">
              {filteredPivotCandidates.map((p) => {
                const isSelected = p.id === effectivePivotId;
                const birthYear = p.birthDate ? p.birthDate.replace(/\D/g, '').slice(-4) : '';
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      setChosenPivotId(p.id);
                      setIsPivotDropdownOpen(false);
                      setPivotSearchQuery('');
                    }}
                    className={`w-full text-left px-3 py-2 flex items-center justify-between text-xs transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-emerald-500/20 text-emerald-300 font-bold'
                        : 'hover:bg-zinc-800 text-zinc-200'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-6 h-6 rounded bg-zinc-800 border border-zinc-700 flex items-center justify-center text-[10px] font-mono text-zinc-400 shrink-0">
                        {p.firstName[0]}{p.lastName[0]}
                      </div>
                      <div className="truncate">
                        <span>{p.firstName} {p.lastName}</span>
                        {birthYear && <span className="text-[10px] text-zinc-500 ml-1.5">({birthYear})</span>}
                      </div>
                    </div>
                    {isSelected && (
                      <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                        Pivot sélectionné
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Action Footer */}
      <div className="flex items-center justify-between pt-2 border-t border-white/10 gap-3">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="button-verve-secondary text-xs py-2 px-3.5 cursor-pointer"
          >
            Annuler
          </button>
        )}

        <button
          type="button"
          onClick={handleConfirm}
          disabled={selectedTotalCount === 0}
          className={`flex-1 py-2.5 px-4 rounded-full text-xs font-mono font-bold flex items-center justify-center gap-2 transition-all ${
            selectedTotalCount > 0
              ? 'button-verve-primary cursor-pointer shadow-lg shadow-emerald-950/50'
              : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
          }`}
        >
          <span>
            {selectedTotalCount === 0
              ? 'Sélectionnez au moins un archipel'
              : `Charger et recentrer (${selectedTotalCount} personnes)`}
          </span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

    </div>
  );
}
