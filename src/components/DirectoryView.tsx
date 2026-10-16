import React, { useState } from 'react';
import { 
  UserPlus, 
  Search, 
  MapPin, 
  Calendar, 
  Briefcase, 
  ChevronRight, 
  Compass, 
  Edit3, 
  Trash2,
  ArrowUpDown
} from 'lucide-react';
import { useGenealogy } from '../context/GenealogyContext';
import { Person } from '../types/genealogy';

export function DirectoryView() {
  const { 
    tree, 
    setActivePersonId, 
    setFocusPersonId, 
    setViewMode, 
    setIsAddModalOpen, 
    setEditingPerson,
    deletePerson
  } = useGenealogy();

  const [search, setSearch] = useState('');
  const [genderFilter, setGenderFilter] = useState<'all' | 'M' | 'F' | 'O'>('all');
  const [lifeFilter, setLifeFilter] = useState<'all' | 'living' | 'deceased'>('all');
  const [centuryFilter, setCenturyFilter] = useState<'all' | 'XIX' | 'XX' | 'XXI'>('all');
  const [sortBy, setSortBy] = useState<'name' | 'birthDate' | 'generation'>('birthDate');

  const persons = Object.values(tree.persons);

  const filteredPersons = persons.filter((p) => {
    // Gender filter
    if (genderFilter !== 'all' && p.gender !== genderFilter) return false;

    // Life filter
    if (lifeFilter === 'living' && !p.isLiving) return false;
    if (lifeFilter === 'deceased' && p.isLiving) return false;

    // Century filter based on birth year
    if (centuryFilter !== 'all') {
      const year = parseInt(p.birthDate?.replace(/\D/g, '') || '0', 10);
      if (centuryFilter === 'XIX' && (year < 1800 || year >= 1900)) return false;
      if (centuryFilter === 'XX' && (year < 1900 || year >= 2000)) return false;
      if (centuryFilter === 'XXI' && year < 2000) return false;
    }

    // Search query
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      const name = `${p.firstName} ${p.lastName}`.toLowerCase();
      const maiden = (p.maidenName || '').toLowerCase();
      const place = `${p.birthPlace || ''} ${p.deathPlace || ''}`.toLowerCase();
      const occu = (p.occupation || '').toLowerCase();
      return name.includes(q) || maiden.includes(q) || place.includes(q) || occu.includes(q);
    }

    return true;
  });

  // Sort
  const sortedPersons = [...filteredPersons].sort((a, b) => {
    if (sortBy === 'name') {
      return a.lastName.localeCompare(b.lastName) || a.firstName.localeCompare(b.firstName);
    }
    if (sortBy === 'birthDate') {
      const yearA = parseInt(a.birthDate?.replace(/\D/g, '') || '9999', 10);
      const yearB = parseInt(b.birthDate?.replace(/\D/g, '') || '9999', 10);
      return yearA - yearB;
    }
    return 0;
  });

  const handleEdit = (p: Person, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingPerson(p);
    setIsAddModalOpen(true);
  };

  const handleDelete = (p: Person, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm(`Êtes-vous sûr de vouloir supprimer ${p.firstName} ${p.lastName} de votre archipel ?`)) {
      deletePerson(p.id);
    }
  };

  const handleFocusTree = (p: Person, e: React.MouseEvent) => {
    e.stopPropagation();
    setFocusPersonId(p.id);
    setViewMode('tree');
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-10 font-sans text-zinc-100">
      
      {/* Top Banner (Verve Style) */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-white/10">
        <div>
          <div className="badge-verve mb-3 text-zinc-300">
            <span>ANNUAIRE · {tree.name || 'ARCHIPEL'}</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-white">
            <span className="title-linear">Répertoire des personnes</span>
          </h1>
          <p className="text-sm text-zinc-400 mt-1.5 font-sans">
            Consultez, modifiez et enrichissez les notices individuelles de vos ancêtres et descendants.
          </p>
        </div>

        <button
          onClick={() => {
            setEditingPerson(null);
            setIsAddModalOpen(true);
          }}
          className="button-verve-primary text-xs py-2 px-4 shrink-0"
        >
          <UserPlus className="w-3.5 h-3.5" />
          <span>Ajouter une personne</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="mt-6 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 bg-white/[0.02] p-3.5 rounded-2xl border border-white/10">
        
        {/* Search input */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filtrer par nom, prénom, commune, profession..."
            className="w-full pl-9 pr-4 py-2 text-xs bg-white/[0.03] border border-white/10 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-400"
          />
        </div>

        {/* Filter controls */}
        <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
          {/* Gender */}
          <div className="flex items-center gap-1 bg-white/[0.03] p-1 rounded-lg border border-white/10">
            {(['all', 'M', 'F'] as const).map((g) => (
              <button
                key={g}
                onClick={() => setGenderFilter(g)}
                className={`px-2.5 py-1 rounded text-xs transition-colors cursor-pointer ${
                  genderFilter === g
                    ? 'bg-white/10 text-emerald-400 font-semibold'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                {g === 'all' ? 'Tous' : g === 'M' ? 'Hommes' : 'Femmes'}
              </button>
            ))}
          </div>

          {/* Living / Deceased */}
          <div className="flex items-center gap-1 bg-white/[0.03] p-1 rounded-lg border border-white/10">
            {(['all', 'living', 'deceased'] as const).map((l) => (
              <button
                key={l}
                onClick={() => setLifeFilter(l)}
                className={`px-2.5 py-1 rounded text-xs transition-colors cursor-pointer ${
                  lifeFilter === l
                    ? 'bg-white/10 text-emerald-400 font-semibold'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                {l === 'all' ? 'Tous' : l === 'living' ? 'Vivants' : 'Décédés'}
              </button>
            ))}
          </div>

          {/* Century */}
          <div className="flex items-center gap-1 bg-white/[0.03] p-1 rounded-lg border border-white/10">
            {(['all', 'XIX', 'XX', 'XXI'] as const).map((c) => (
              <button
                key={c}
                onClick={() => setCenturyFilter(c)}
                className={`px-2 py-1 rounded text-xs transition-colors cursor-pointer ${
                  centuryFilter === c
                    ? 'bg-white/10 text-emerald-400 font-semibold'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                {c === 'all' ? 'Époque' : `${c}e`}
              </button>
            ))}
          </div>

          {/* Sort By */}
          <div className="flex items-center gap-1.5 ml-auto text-xs text-zinc-400">
            <ArrowUpDown className="w-3.5 h-3.5 text-zinc-500" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-zinc-900 border border-white/10 rounded-lg px-2 py-1 text-xs text-zinc-200 focus:outline-none cursor-pointer"
            >
              <option value="birthDate">Chronologique</option>
              <option value="name">Alphabétique</option>
            </select>
          </div>
        </div>
      </div>

      {/* Summary Count Bar */}
      <div className="flex items-center justify-between mt-4 text-xs font-mono text-zinc-400 px-1">
        <span>
          <strong className="text-white">{sortedPersons.length}</strong> personne{sortedPersons.length > 1 ? 's' : ''} sur un total de {persons.length}
        </span>
        {(search || genderFilter !== 'all' || lifeFilter !== 'all' || centuryFilter !== 'all') && (
          <button
            onClick={() => {
              setSearch('');
              setGenderFilter('all');
              setLifeFilter('all');
              setCenturyFilter('all');
            }}
            className="text-emerald-400 hover:underline cursor-pointer"
          >
            Réinitialiser les filtres
          </button>
        )}
      </div>

      {/* Directory Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
        {sortedPersons.map((person) => {
          const years = person.birthDate
            ? `${person.birthDate.replace(/\D/g, '').slice(-4)} — ${person.isLiving ? 'en vie' : person.deathDate ? person.deathDate.replace(/\D/g, '').slice(-4) : '†'}`
            : person.isLiving ? 'En vie' : 'Décédé(e)';

          const father = person.fatherId ? tree.persons[person.fatherId] : undefined;
          const mother = person.motherId ? tree.persons[person.motherId] : undefined;
          const spouses = (person.spouseIds || []).map(id => tree.persons[id]).filter(Boolean);

          return (
            <div
              key={person.id}
              onClick={() => setActivePersonId(person.id)}
              className="group bg-white/[0.03] hover:bg-white/[0.05] rounded-xl border border-white/10 hover:border-emerald-400/40 p-4 shadow-sm transition-all cursor-pointer flex flex-col justify-between"
            >
              <div>
                {/* Header row: Portrait + Identity */}
                <div className="flex items-start gap-3.5">
                  <div className="w-12 h-12 rounded-xl overflow-hidden shrink-0 border border-white/15 bg-zinc-800 flex items-center justify-center font-mono text-sm text-zinc-400">
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
                    <h3 className="text-base font-bold text-white group-hover:text-emerald-400 transition-colors truncate">
                      {person.firstName} {person.lastName}
                    </h3>
                    {person.maidenName && (
                      <p className="text-xs font-mono text-zinc-500 -mt-0.5">
                        née {person.maidenName}
                      </p>
                    )}
                    {person.occupation && (
                      <p className="text-xs text-zinc-400 flex items-center gap-1.5 mt-1 truncate">
                        <Briefcase className="w-3 h-3 text-emerald-400 shrink-0" />
                        <span className="truncate">{person.occupation}</span>
                      </p>
                    )}
                  </div>
                </div>

                {/* Details strip */}
                <div className="mt-3.5 pt-3 border-t border-white/5 space-y-1.5 text-xs text-zinc-400">
                  <div className="flex items-center gap-1.5 font-mono text-[11px]">
                    <Calendar className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span className="truncate">{years}</span>
                  </div>

                  {(person.birthPlace || person.deathPlace) && (
                    <div className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                      <span className="truncate">{person.birthPlace || person.deathPlace}</span>
                    </div>
                  )}

                  {/* Family summary */}
                  <div className="text-[11px] text-zinc-500 pt-1">
                    {father || mother ? (
                      <p className="truncate">
                        Filiation : {[father?.firstName, mother?.firstName].filter(Boolean).join(' & ')}
                      </p>
                    ) : (
                      <p className="italic text-zinc-600">Ascendance non renseignée</p>
                    )}
                    {spouses.length > 0 && (
                      <p className="truncate text-emerald-400/80">
                        Alliance : {spouses.map(s => `${s.firstName} ${s.lastName}`).join(', ')}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Action buttons footer */}
              <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between text-xs">
                <button
                  onClick={(e) => handleFocusTree(person, e)}
                  className="flex items-center gap-1 text-emerald-400 hover:text-emerald-300 font-mono text-xs cursor-pointer"
                  title="Voir dans la cartographie"
                >
                  <Compass className="w-3.5 h-3.5" />
                  <span>Centrer l'arbre</span>
                </button>

                <div className="flex items-center gap-1">
                  <button
                    onClick={(e) => handleEdit(person, e)}
                    className="p-1.5 text-zinc-500 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
                    title="Modifier"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={(e) => handleDelete(person, e)}
                    className="p-1.5 text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
                    title="Supprimer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                  <div className="p-1 text-zinc-600 group-hover:text-emerald-400 transition-colors">
                    <ChevronRight className="w-4 h-4" />
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {sortedPersons.length === 0 && (
        <div className="text-center py-16 bg-white/[0.02] rounded-2xl border border-dashed border-white/10 mt-4">
          <p className="text-sm font-medium text-white">Aucun membre ne correspond aux critères de filtre</p>
          <p className="text-xs text-zinc-500 mt-1">Modifiez vos critères ou ajoutez une nouvelle personne.</p>
        </div>
      )}

    </div>
  );
}
