import { Calendar, MapPin, Briefcase, Compass, ArrowUpRight } from 'lucide-react';
import { useGenealogy } from '../context/GenealogyContext';
import { Person } from '../types/genealogy';

export function TimelineView() {
  const { tree, setActivePersonId, setFocusPersonId, setViewMode } = useGenealogy();

  const persons = Object.values(tree.persons);

  // Parse birth year and sort chronologically
  const timelineEvents = persons
    .map((p) => {
      const year = parseInt(p.birthDate?.replace(/\D/g, '') || '0', 10);
      return {
        person: p,
        year: year > 0 ? year : 9999,
      };
    })
    .sort((a, b) => a.year - b.year);

  // Group by era
  const getEra = (year: number) => {
    if (year < 1850) return 'Première moitié du XIXe siècle (1800-1849)';
    if (year < 1900) return 'Seconde moitié du XIXe siècle (1850-1899)';
    if (year < 1945) return 'La Belle Époque & l\'Entre-deux-guerres (1900-1944)';
    if (year < 1980) return 'Seconde moitié du XXe siècle (1945-1979)';
    return 'Génération contemporaine (1980 - nos jours)';
  };

  const eras: { title: string; items: { person: Person; year: number }[] }[] = [];
  timelineEvents.forEach((item) => {
    const eraTitle = getEra(item.year);
    let eraObj = eras.find((e) => e.title === eraTitle);
    if (!eraObj) {
      eraObj = { title: eraTitle, items: [] };
      eras.push(eraObj);
    }
    eraObj.items.push(item);
  });

  return (
    <div className="max-w-4xl mx-auto px-6 py-10 font-sans text-zinc-100">
      
      {/* Header */}
      <div className="pb-6 border-b border-white/10 text-center sm:text-left">
        <div className="badge-verve mb-3 text-zinc-300">
          <span>CHRONOLOGIE · {tree.name || 'ARCHIPEL'}</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-white">
          <span className="title-linear">Ligne du Temps & Époques</span>
        </h1>
        <p className="text-sm text-zinc-400 mt-1.5 font-sans">
          Retracez la succession temporelle de vos ascendants à travers les époques.
        </p>
      </div>

      {/* Timeline Stream */}
      <div className="mt-8 space-y-12">
        {eras.map((era) => (
          <div key={era.title} className="relative">
            
            {/* Era Heading */}
            <div className="sticky top-16 z-10 py-2.5 bg-[#08090c]/90 backdrop-blur-md flex items-center gap-3">
              <span className="text-xs font-mono font-bold text-emerald-400 tracking-wide uppercase">
                {era.title}
              </span>
              <div className="flex-1 h-px bg-white/10" />
              <span className="text-xs text-zinc-500 font-mono">
                {era.items.length} individu{era.items.length > 1 ? 's' : ''}
              </span>
            </div>

            {/* Vertical timeline spine */}
            <div className="relative pl-6 sm:pl-8 border-l border-white/10 ml-3 sm:ml-4 space-y-5 mt-4">
              {era.items.map(({ person }) => {
                const dates = person.birthDate
                  ? `${person.birthDate.replace(/\D/g, '').slice(-4)} — ${person.isLiving ? 'en vie' : person.deathDate ? person.deathDate.replace(/\D/g, '').slice(-4) : '†'}`
                  : person.isLiving ? 'En vie' : '†';

                return (
                  <div
                    key={person.id}
                    className="group relative flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-white/[0.03] border border-white/10 hover:border-emerald-400/40 hover:bg-white/[0.05] transition-all cursor-pointer"
                    onClick={() => setActivePersonId(person.id)}
                  >
                    {/* Node Dot on spine */}
                    <div className="absolute -left-[30px] sm:-left-[38px] top-6 w-3 h-3 rounded-full bg-emerald-400 border-2 border-[#08090c] shadow-xs group-hover:scale-125 transition-transform" />

                    {/* Identity & Portrait */}
                    <div className="flex items-start sm:items-center gap-3.5 min-w-0">
                      <div className="w-10 h-10 rounded-xl overflow-hidden shrink-0 border border-white/15 bg-zinc-800 flex items-center justify-center font-mono text-xs text-zinc-400">
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
                        <div className="flex items-baseline gap-2">
                          <h3 className="text-sm font-bold text-white group-hover:text-emerald-400 transition-colors truncate">
                            {person.firstName} {person.lastName}
                          </h3>
                          {person.maidenName && (
                            <span className="text-xs font-mono text-zinc-500">
                              (née {person.maidenName})
                            </span>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-400 mt-1">
                          <span className="flex items-center gap-1 font-mono text-[11px] text-emerald-400">
                            <Calendar className="w-3 h-3" />
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

                    {/* Action buttons */}
                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setFocusPersonId(person.id);
                          setViewMode('tree');
                        }}
                        className="button-verve-secondary text-xs py-1 px-2.5"
                        title="Centrer l'arbre sur cette personne"
                      >
                        <Compass className="w-3 h-3 text-emerald-400" />
                        <span className="hidden sm:inline">Centrer</span>
                      </button>
                      <div className="p-1 text-zinc-500 group-hover:text-emerald-400 transition-colors">
                        <ArrowUpRight className="w-4 h-4" />
                      </div>
                    </div>

                  </div>
                );
              })}
            </div>

          </div>
        ))}
      </div>

    </div>
  );
}
