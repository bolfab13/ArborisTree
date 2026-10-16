import { useMemo } from 'react';
import { Users, Heart, Award, MapPin, Briefcase, Calendar, Network } from 'lucide-react';
import { useGenealogy } from '../context/GenealogyContext';

export function StatsView() {
  const { tree, setActivePersonId } = useGenealogy();

  const persons = Object.values(tree.persons);

  const stats = useMemo(() => {
    const total = persons.length;
    const males = persons.filter((p) => p.gender === 'M').length;
    const females = persons.filter((p) => p.gender === 'F').length;
    const living = persons.filter((p) => p.isLiving).length;
    const deceased = total - living;

    // Count marriages / unions
    const unionPairs = new Set<string>();
    persons.forEach((p) => {
      (p.spouseIds || []).forEach((sId) => {
        const pair = [p.id, sId].sort().join('_');
        unionPairs.add(pair);
      });
    });

    // Oldest born ancestor
    let earliestPerson = persons[0];
    let earliestYear = 9999;

    persons.forEach((p) => {
      const year = parseInt(p.birthDate?.replace(/\D/g, '') || '9999', 10);
      if (year > 1000 && year < earliestYear) {
        earliestYear = year;
        earliestPerson = p;
      }
    });

    // Top places
    const placesMap: Record<string, number> = {};
    persons.forEach((p) => {
      if (p.birthPlace) {
        const city = p.birthPlace.split('(')[0].trim();
        if (city) placesMap[city] = (placesMap[city] || 0) + 1;
      }
    });
    const topPlaces = Object.entries(placesMap)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5);

    // Occupations
    const occuMap: Record<string, number> = {};
    persons.forEach((p) => {
      if (p.occupation) {
        occuMap[p.occupation] = (occuMap[p.occupation] || 0) + 1;
      }
    });
    const topOccupations = Object.entries(occuMap)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5);

    return {
      total,
      males,
      females,
      living,
      deceased,
      unionsCount: unionPairs.size,
      earliestPerson,
      earliestYear: earliestYear === 9999 ? 'N/A' : earliestYear,
      topPlaces,
      topOccupations,
    };
  }, [persons]);

  return (
    <div className="max-w-6xl mx-auto px-6 py-10 font-sans text-zinc-100">
      
      {/* Hero Strip */}
      <div className="flex flex-col md:flex-row items-start md:items-end justify-between gap-6 pb-6 border-b border-white/10">
        <div>
          <div className="badge-verve mb-3 text-zinc-300">
            <span>DÉMOGRAPHIE · {tree.name || 'ARCHIPEL'}</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-white">
            <span className="title-linear">Statistiques de l'archipel</span>
          </h1>
          <p className="text-sm text-zinc-400 mt-1.5 font-sans">
            Synthèse globale de la lignée, longévités, berceaux géographiques et corps de métiers.
          </p>
        </div>
      </div>

      {/* Primary KPI Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
        <div className="card-verve p-5">
          <div className="flex items-center justify-between text-xs font-mono text-zinc-400 mb-2">
            <span>Individus</span>
            <Users className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="font-mono text-3xl font-bold text-white tabular-nums">
            {stats.total}
          </div>
          <div className="text-[11px] font-mono text-zinc-500 mt-1.5">
            {stats.males} hommes · {stats.females} femmes
          </div>
        </div>

        <div className="card-verve p-5">
          <div className="flex items-center justify-between text-xs font-mono text-zinc-400 mb-2">
            <span>Unions & Alliances</span>
            <Heart className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="font-mono text-3xl font-bold text-white tabular-nums">
            {stats.unionsCount}
          </div>
          <div className="text-[11px] font-mono text-zinc-500 mt-1.5">
            Paires d'alliances
          </div>
        </div>

        <div className="card-verve p-5">
          <div className="flex items-center justify-between text-xs font-mono text-zinc-400 mb-2">
            <span>Personnes en vie</span>
            <Network className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="font-mono text-3xl font-bold text-white tabular-nums">
            {stats.living}
          </div>
          <div className="text-[11px] font-mono text-zinc-500 mt-1.5">
            {stats.deceased} disparus
          </div>
        </div>

        <div className="card-verve p-5">
          <div className="flex items-center justify-between text-xs font-mono text-zinc-400 mb-2">
            <span>Racine documentée</span>
            <Calendar className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="font-mono text-3xl font-bold text-white tabular-nums">
            {stats.earliestYear}
          </div>
          <div className="text-[11px] font-mono text-zinc-500 mt-1.5 truncate">
            {stats.earliestPerson ? `${stats.earliestPerson.firstName} ${stats.earliestPerson.lastName}` : '—'}
          </div>
        </div>
      </div>

      {/* Two Column Detailed Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
        
        {/* Geographic origins */}
        <div className="card-verve p-6">
          <h3 className="text-sm font-bold text-white tracking-tight flex items-center gap-2 mb-4">
            <MapPin className="w-4 h-4 text-emerald-400" />
            <span>Berceaux Géographiques</span>
          </h3>
          
          <div className="space-y-3">
            {stats.topPlaces.length > 0 ? (
              stats.topPlaces.map(([city, count]) => {
                const pct = Math.round((count / (stats.total || 1)) * 100);
                return (
                  <div key={city}>
                    <div className="flex justify-between text-xs font-mono text-zinc-300 mb-1">
                      <span>{city}</span>
                      <span className="text-zinc-500">{count} ({pct}%)</span>
                    </div>
                    <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-400 rounded-full transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-xs text-zinc-500 italic">Aucun lieu renseigné</p>
            )}
          </div>
        </div>

        {/* Occupations */}
        <div className="card-verve p-6">
          <h3 className="text-sm font-bold text-white tracking-tight flex items-center gap-2 mb-4">
            <Briefcase className="w-4 h-4 text-emerald-400" />
            <span>Métiers & Activités</span>
          </h3>

          <div className="space-y-2">
            {stats.topOccupations.length > 0 ? (
              stats.topOccupations.map(([job, count]) => (
                <div
                  key={job}
                  className="flex items-center justify-between p-2.5 rounded-lg bg-white/[0.02] border border-white/5 text-xs text-zinc-300"
                >
                  <span className="font-medium">{job}</span>
                  <span className="font-mono text-emerald-400 font-semibold">{count}</span>
                </div>
              ))
            ) : (
              <p className="text-xs text-zinc-500 italic">Aucune profession renseignée</p>
            )}
          </div>
        </div>

      </div>

      {/* Featured Patriarch highlight */}
      {stats.earliestPerson && (
        <div 
          onClick={() => setActivePersonId(stats.earliestPerson.id)}
          className="mt-6 p-5 card-verve flex items-center justify-between gap-4 cursor-pointer hover:border-emerald-400/40 transition-colors group"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl overflow-hidden border border-white/10 bg-zinc-800 flex items-center justify-center shrink-0 font-mono text-xs text-zinc-400">
              {stats.earliestPerson.photoUrl ? (
                <img
                  src={stats.earliestPerson.photoUrl}
                  alt=""
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
              ) : (
                <Award className="w-5 h-5 text-emerald-400" />
              )}
            </div>

            <div>
              <span className="text-[10px] uppercase font-mono font-semibold tracking-wider text-emerald-400">
                Premier ancêtre répertorié
              </span>
              <h4 className="text-sm font-bold text-white group-hover:text-emerald-400 transition-colors">
                {stats.earliestPerson.firstName} {stats.earliestPerson.lastName}
              </h4>
              <p className="text-xs text-zinc-400">
                Né(e) vers {stats.earliestYear} {stats.earliestPerson.birthPlace ? `à ${stats.earliestPerson.birthPlace}` : ''}
              </p>
            </div>
          </div>

          <span className="text-xs font-mono text-emerald-400 group-hover:underline">
            Voir la fiche →
          </span>
        </div>
      )}

    </div>
  );
}
