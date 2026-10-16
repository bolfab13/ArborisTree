import { memo } from 'react';
import { 
  Calendar, 
  MapPin, 
  ExternalLink, 
  AlertTriangle, 
  CheckCircle2, 
  HelpCircle,
  User,
  Plus
} from 'lucide-react';
import { LayoutNode } from '../types/genealogy';

interface FamilyTreeNodeProps {
  node: LayoutNode;
  onFocus: (id: string) => void;
  onOpenDetails: (id: string) => void;
  onAddParent?: (type: 'add_father' | 'add_mother', targetId: string) => void;
}

export const FamilyTreeNode = memo(function FamilyTreeNode({
  node,
  onFocus,
  onOpenDetails,
  onAddParent,
}: FamilyTreeNodeProps) {
  const { person, isFocused, role } = node;

  if (role === 'placeholder_parent') {
    const isFather = node.placeholderType === 'add_father';
    const label = isFather ? 'Ajouter père' : 'Ajouter mère';
    const desc = isFather ? 'Branche paternelle' : 'Branche maternelle';

    return (
      <div
        onClick={(e) => {
          e.stopPropagation();
          if (onAddParent && node.placeholderType && node.targetPersonId) {
            onAddParent(node.placeholderType, node.targetPersonId);
          }
        }}
        style={{
          width: `${node.width}px`,
          height: `${node.height}px`,
          left: `${node.x}px`,
          top: `${node.y}px`,
        }}
        className="absolute select-none cursor-pointer rounded-lg p-2.5 transition-all group flex flex-col justify-between border-2 border-dashed border-zinc-700/80 hover:border-emerald-400 bg-zinc-950/60 hover:bg-emerald-950/20 backdrop-blur-xs text-zinc-400 hover:text-white"
        title={`Cliquer pour ajouter ${isFather ? 'le père' : 'la mère'}`}
      >
        <div className="flex items-center justify-between">
          <span className="text-[9px] font-mono uppercase tracking-wider text-zinc-500 group-hover:text-emerald-400 font-semibold">
            {desc}
          </span>
          <span className="w-2 h-2 rounded-full border border-zinc-600 group-hover:border-emerald-400 group-hover:bg-emerald-400 transition-colors" />
        </div>

        <div className="flex items-center gap-2.5 my-0.5">
          <div className="w-7 h-7 rounded-full bg-zinc-800/80 group-hover:bg-emerald-500/20 border border-zinc-700 group-hover:border-emerald-400/50 flex items-center justify-center text-zinc-400 group-hover:text-emerald-300 transition-colors shrink-0">
            <Plus className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="text-xs font-semibold text-zinc-200 group-hover:text-emerald-300 transition-colors">
              {label}
            </div>
            <div className="text-[10px] font-mono text-zinc-500">
              Cliquer pour créer
            </div>
          </div>
        </div>

        <div className="text-[9px] font-mono text-zinc-500 group-hover:text-zinc-400 pt-0.5 border-t border-zinc-800/60">
          + Nouvelle fiche parent
        </div>
      </div>
    );
  }

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onFocus(person.id);
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onOpenDetails(person.id);
  };

  const handleOpenDetailsBtn = (e: React.MouseEvent) => {
    e.stopPropagation();
    onOpenDetails(person.id);
  };

  const birthYear = person.birthDate ? person.birthDate.replace(/\D/g, '').slice(-4) : '';
  const deathYear = person.isLiving
    ? 'auj.'
    : person.deathDate
    ? person.deathDate.replace(/\D/g, '').slice(-4)
    : '†';

  const yearsStr = birthYear ? `${birthYear} — ${deathYear}` : person.isLiving ? 'En vie' : 'Décédé(e)';

  const roleLabelMap: Record<string, string> = {
    focus: 'Focalisé',
    spouse: 'Union',
    child: 'Enfant',
    parent: 'Parent',
    sibling: 'Fratrie',
    grandchild: 'Petit-enfant',
  };

  const status = person.relationStatus || 'validated';
  const isContested = status === 'contested';
  const isToConfirm = status === 'to_confirm';

  return (
    <div
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      style={{
        width: `${node.width}px`,
        height: `${node.height}px`,
        left: `${node.x}px`,
        top: `${node.y}px`,
      }}
      className={`absolute select-none cursor-pointer rounded-lg p-2.5 transition-all group flex flex-col justify-between border ${
        isFocused
          ? 'bg-zinc-900 border-emerald-500 shadow-lg shadow-emerald-950/40 ring-1 ring-emerald-500/50'
          : isContested
          ? 'bg-zinc-950 border-rose-500/80 shadow-sm shadow-rose-950/30'
          : 'bg-zinc-900/90 hover:bg-zinc-900 border-zinc-800 hover:border-zinc-700 shadow-sm'
      }`}
      title={`${person.firstName} ${person.lastName} — Clic : focaliser, Double-clic : ouvrir la fiche`}
    >
      {/* Top Header Row: Role Tag & Quick Action */}
      <div className="flex items-center justify-between gap-1 leading-none">
        <div className="flex items-center gap-1.5 min-w-0">
          <span
            className={`text-[9px] font-mono uppercase tracking-wider font-semibold truncate ${
              isFocused
                ? 'text-emerald-400'
                : isContested
                ? 'text-rose-400'
                : 'text-zinc-500'
            }`}
          >
            {roleLabelMap[role] || 'Membre'}
          </span>

          {isContested && (
            <span title="Relation contestée / incohérence" className="inline-flex">
              <AlertTriangle className="w-2.5 h-2.5 text-rose-500 shrink-0" />
            </span>
          )}
          {isToConfirm && (
            <span title="Relation à confirmer" className="inline-flex">
              <HelpCircle className="w-2.5 h-2.5 text-amber-500/80 shrink-0" />
            </span>
          )}
        </div>

        <button
          onClick={handleOpenDetailsBtn}
          className="opacity-0 group-hover:opacity-100 p-0.5 text-zinc-400 hover:text-zinc-100 rounded hover:bg-zinc-800 transition-opacity cursor-pointer shrink-0"
          title="Consulter la fiche"
        >
          <ExternalLink className="w-3 h-3" />
        </button>
      </div>

      {/* Main Identity Row: Avatar + Name */}
      <div className="flex items-center gap-2 min-w-0 my-0.5">
        <div className="w-7 h-7 rounded bg-zinc-800 border border-zinc-700/80 overflow-hidden shrink-0 flex items-center justify-center text-[10px] font-mono text-zinc-400">
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
          <div className="text-xs font-semibold text-zinc-100 truncate group-hover:text-emerald-400 transition-colors">
            {person.firstName} {person.lastName}
          </div>
          {person.maidenName && (
            <div className="text-[10px] font-mono text-zinc-500 truncate -mt-0.5">
              née {person.maidenName}
            </div>
          )}
        </div>
      </div>

      {/* Bottom Row: Years & Location */}
      <div className="flex items-center justify-between text-[10px] font-mono text-zinc-400 border-t border-zinc-800/80 pt-1 leading-none">
        <span className="truncate">{yearsStr}</span>
        {person.birthPlace && (
          <span className="text-zinc-500 truncate max-w-[80px]" title={person.birthPlace}>
            {person.birthPlace.split('(')[0].trim()}
          </span>
        )}
      </div>
    </div>
  );
});
