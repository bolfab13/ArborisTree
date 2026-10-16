import React from 'react';
import { 
  X, 
  Calendar, 
  MapPin, 
  Briefcase, 
  Compass, 
  Edit3, 
  Trash2, 
  UserPlus, 
  ArrowUpRight,
  BookOpen,
  CheckCircle2,
  HelpCircle,
  AlertTriangle
} from 'lucide-react';
import { useGenealogy } from '../context/GenealogyContext';
import { Person } from '../types/genealogy';

export function PersonDetailDrawer() {
  const { 
    tree, 
    activePersonId, 
    setActivePersonId, 
    setFocusPersonId, 
    setViewMode, 
    setEditingPerson, 
    setIsAddModalOpen, 
    deletePerson,
    quickAddRelative
  } = useGenealogy();

  if (!activePersonId || !tree.persons[activePersonId]) return null;

  const person = tree.persons[activePersonId];

  // Relations
  const father = person.fatherId ? tree.persons[person.fatherId] : undefined;
  const mother = person.motherId ? tree.persons[person.motherId] : undefined;
  const spouses = (person.spouseIds || []).map((id) => tree.persons[id]).filter(Boolean);
  const children = (person.childIds || []).map((id) => tree.persons[id]).filter(Boolean);

  // Siblings
  const siblings: Person[] = [];
  if (father || mother) {
    Object.values(tree.persons).forEach((p) => {
      if (p.id !== person.id) {
        const sharesFather = father && p.fatherId === father.id;
        const sharesMother = mother && p.motherId === mother.id;
        if (sharesFather || sharesMother) {
          siblings.push(p);
        }
      }
    });
  }

  const handleFocusTree = () => {
    setFocusPersonId(person.id);
    setViewMode('tree');
    setActivePersonId(null);
  };

  const handleEdit = () => {
    setEditingPerson(person);
    setIsAddModalOpen(true);
  };

  const handleDelete = () => {
    if (window.confirm(`Supprimer définitivement ${person.firstName} ${person.lastName} de votre archipel ?`)) {
      deletePerson(person.id);
      setActivePersonId(null);
    }
  };

  const lifespan = person.birthDate
    ? `${person.birthDate} — ${person.isLiving ? 'En vie' : person.deathDate || 'Décédé(e)'}`
    : person.isLiving ? 'En vie' : 'Décédé(e)';

  const status = person.relationStatus || 'validated';

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/60 backdrop-blur-md flex justify-end animate-fade-in font-sans">
      <div 
        className="w-full max-w-lg bg-[#0c0e12] h-full shadow-2xl flex flex-col border-l border-white/10 overflow-hidden text-zinc-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drawer Header with Verve Styling */}
        <div className="relative p-6 bg-gradient-to-b from-white/[0.05] to-transparent border-b border-white/10">
          <button
            onClick={() => setActivePersonId(null)}
            className="absolute top-4 right-4 p-2 text-zinc-400 hover:text-white hover:bg-white/10 rounded-full transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-start gap-4 pr-8">
            <div className="relative w-16 h-16 rounded-xl overflow-hidden shrink-0 border border-white/15 bg-zinc-800 shadow-md flex items-center justify-center text-zinc-400 font-mono text-lg font-bold">
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
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] uppercase font-mono tracking-wider font-semibold text-emerald-400">
                  Fiche Personne
                </span>
                {status === 'contested' && (
                  <span className="flex items-center gap-1 text-[10px] font-mono text-rose-400 bg-rose-500/10 px-1.5 py-0.5 rounded border border-rose-500/20">
                    <AlertTriangle className="w-2.5 h-2.5" />
                    Contestée
                  </span>
                )}
                {status === 'to_confirm' && (
                  <span className="flex items-center gap-1 text-[10px] font-mono text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                    <HelpCircle className="w-2.5 h-2.5" />
                    À confirmer
                  </span>
                )}
              </div>

              <h2 className="text-xl font-bold text-white tracking-tight leading-tight">
                {person.firstName} {person.lastName}
              </h2>
              {person.maidenName && (
                <p className="text-xs font-mono text-zinc-500 mt-0.5">
                  née {person.maidenName}
                </p>
              )}
              {person.occupation && (
                <p className="text-xs text-zinc-300 flex items-center gap-1.5 mt-1.5">
                  <Briefcase className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>{person.occupation}</span>
                </p>
              )}
            </div>
          </div>

          {/* Quick Action Ribbon (Verve Buttons) */}
          <div className="flex items-center gap-2 mt-5">
            <button
              onClick={handleFocusTree}
              className="button-verve-primary flex-1 text-xs py-2 px-3 justify-center"
            >
              <Compass className="w-3.5 h-3.5" />
              <span>Centrer l'arbre</span>
            </button>
            <button
              onClick={handleEdit}
              className="button-verve-secondary text-xs py-2 px-3"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Modifier</span>
            </button>
            <button
              onClick={handleDelete}
              className="p-2 text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 border border-white/10 rounded-full transition-colors cursor-pointer"
              title="Supprimer la fiche"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Drawer Body Scroll */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* Section: Actes d'état civil */}
          <section className="bg-white/[0.03] p-4.5 rounded-xl border border-white/10">
            <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-emerald-400 mb-3">
              Actes & Repères Temporels
            </h3>
            <div className="space-y-2.5 text-xs">
              <div className="flex items-start gap-2.5">
                <Calendar className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-medium text-white block">Période de vie</span>
                  <span className="font-mono text-zinc-400">{lifespan}</span>
                </div>
              </div>

              {person.birthPlace && (
                <div className="flex items-start gap-2.5">
                  <MapPin className="w-4 h-4 text-zinc-500 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-medium text-white block">Lieu de naissance</span>
                    <span className="text-zinc-400">{person.birthPlace}</span>
                  </div>
                </div>
              )}

              {person.deathPlace && !person.isLiving && (
                <div className="flex items-start gap-2.5">
                  <MapPin className="w-4 h-4 text-zinc-500 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-medium text-white block">Lieu de sépulture / décès</span>
                    <span className="text-zinc-400">{person.deathPlace}</span>
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* Section: Biographie */}
          {person.biography && (
            <section className="bg-white/[0.03] p-4.5 rounded-xl border border-white/10">
              <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5 mb-2.5">
                <BookOpen className="w-3.5 h-3.5" />
                <span>Récit de Vie</span>
              </h3>
              <p className="text-xs text-zinc-300 leading-relaxed whitespace-pre-line italic">
                « {person.biography} »
              </p>
            </section>
          )}

          {/* Section: Lignage Familial (Interactive Links) */}
          <section className="space-y-4">
            <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-zinc-500">
              Filiations & Alliances
            </h3>

            {/* Parents */}
            <div className="bg-white/[0.02] p-3.5 rounded-xl border border-white/10">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-white">Parents</span>
                {(!father || !mother) && (
                  <button
                    onClick={() => quickAddRelative(!father ? 'father' : 'mother', person.id)}
                    className="text-[11px] font-mono text-emerald-400 hover:underline cursor-pointer flex items-center gap-1"
                  >
                    <UserPlus className="w-3 h-3" />
                    Ajouter parent
                  </button>
                )}
              </div>
              <div className="space-y-1.5">
                {father ? (
                  <RelationRow
                    person={father}
                    relation="Père"
                    onClick={() => setActivePersonId(father.id)}
                  />
                ) : (
                  <div className="text-xs italic text-zinc-600">Père non renseigné</div>
                )}
                {mother ? (
                  <RelationRow
                    person={mother}
                    relation="Mère"
                    onClick={() => setActivePersonId(mother.id)}
                  />
                ) : (
                  <div className="text-xs italic text-zinc-600">Mère non renseignée</div>
                )}
              </div>
            </div>

            {/* Spouses */}
            <div className="bg-white/[0.02] p-3.5 rounded-xl border border-white/10">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-white">
                  Conjoint(e)s & Unions ({spouses.length})
                </span>
                <button
                  onClick={() => quickAddRelative('spouse', person.id)}
                  className="text-[11px] font-mono text-emerald-400 hover:underline cursor-pointer flex items-center gap-1"
                >
                  <UserPlus className="w-3 h-3" />
                  Ajouter conjoint
                </button>
              </div>
              <div className="space-y-1.5">
                {spouses.length > 0 ? (
                  spouses.map((s) => (
                    <RelationRow
                      key={s.id}
                      person={s}
                      relation="Conjoint(e)"
                      onClick={() => setActivePersonId(s.id)}
                    />
                  ))
                ) : (
                  <div className="text-xs italic text-zinc-600">Aucun conjoint enregistré</div>
                )}
              </div>
            </div>

            {/* Siblings */}
            {siblings.length > 0 && (
              <div className="bg-white/[0.02] p-3.5 rounded-xl border border-white/10">
                <span className="text-xs font-medium text-white block mb-2">
                  Fratrie ({siblings.length})
                </span>
                <div className="space-y-1.5">
                  {siblings.map((sib) => (
                    <RelationRow
                      key={sib.id}
                      person={sib}
                      relation={sib.gender === 'M' ? 'Frère' : 'Sœur'}
                      onClick={() => setActivePersonId(sib.id)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Children */}
            <div className="bg-white/[0.02] p-3.5 rounded-xl border border-white/10">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-white">
                  Enfants ({children.length})
                </span>
                <button
                  onClick={() => quickAddRelative('child', person.id)}
                  className="text-[11px] font-mono text-emerald-400 hover:underline cursor-pointer flex items-center gap-1"
                >
                  <UserPlus className="w-3 h-3" />
                  Ajouter enfant
                </button>
              </div>
              <div className="space-y-1.5">
                {children.length > 0 ? (
                  children.map((c) => (
                    <RelationRow
                      key={c.id}
                      person={c}
                      relation={c.gender === 'M' ? 'Fils' : 'Fille'}
                      onClick={() => setActivePersonId(c.id)}
                    />
                  ))
                ) : (
                  <div className="text-xs italic text-zinc-600">Aucun enfant enregistré</div>
                )}
              </div>
            </div>

          </section>

        </div>
      </div>
    </div>
  );
}

function RelationRow({ person, relation, onClick }: { person: Person; relation: string; onClick: () => void }) {
  const dates = person.birthDate
    ? `(${person.birthDate.replace(/\D/g, '').slice(-4)} — ${person.isLiving ? 'auj.' : person.deathDate ? person.deathDate.replace(/\D/g, '').slice(-4) : '†'})`
    : '';

  return (
    <div
      onClick={onClick}
      className="flex items-center justify-between p-2 rounded-lg hover:bg-white/[0.06] border border-transparent hover:border-white/10 transition-all cursor-pointer group"
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="w-7 h-7 rounded-lg overflow-hidden shrink-0 border border-white/10 bg-zinc-800 flex items-center justify-center font-mono text-[10px] text-zinc-400">
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
        <div className="min-w-0">
          <span className="text-xs font-medium text-zinc-200 group-hover:text-emerald-400 transition-colors truncate block">
            {person.firstName} {person.lastName}
          </span>
          <span className="text-[10px] text-zinc-500 font-mono">
            {relation} {dates}
          </span>
        </div>
      </div>
      <ArrowUpRight className="w-3.5 h-3.5 text-zinc-600 group-hover:text-emerald-400 transition-colors shrink-0" />
    </div>
  );
}
