export type Gender = 'M' | 'F' | 'O';
export type RelationStatus = 'validated' | 'to_confirm' | 'contested';

export interface Person {
  id: string;
  firstName: string;
  lastName: string;
  maidenName?: string;
  gender: Gender;
  birthDate?: string;
  birthPlace?: string;
  deathDate?: string;
  deathPlace?: string;
  isLiving: boolean;
  occupation?: string;
  biography?: string;
  photoUrl?: string;
  fatherId?: string;
  motherId?: string;
  spouseIds: string[];
  childIds: string[];
  relationStatus?: RelationStatus;
}

export interface FamilyTree {
  name: string;
  description?: string;
  persons: Record<string, Person>;
  rootPersonId: string;
  updatedAt: string;
}

export type ViewMode = 'tree' | 'directory' | 'timeline' | 'stats';

export interface SearchFilters {
  query: string;
  gender: 'all' | 'M' | 'F' | 'O';
  livingStatus: 'all' | 'living' | 'deceased';
  century: 'all' | 'XIX' | 'XX' | 'XXI';
  sortBy: 'name' | 'birthDate' | 'updated';
}

export type NodeRole = 'focus' | 'spouse' | 'child' | 'parent' | 'sibling' | 'grandchild' | 'placeholder_parent';

export interface ArchipelagoComponent {
  id: string;
  name: string;
  personIds: string[];
  personCount: number;
  familyCount: number;
  dateRange?: string;
  keySurnames: string[];
  rootPersonId: string;
}

export interface LayoutNode {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  person: Person;
  role: NodeRole;
  isFocused: boolean;
  placeholderType?: 'add_father' | 'add_mother';
  targetPersonId?: string;
}

export interface LayoutUnion {
  id: string;
  partner1Id: string;
  partner2Id: string;
  midX: number;
  midY: number;
  childrenIds: string[];
  status: RelationStatus;
}

export interface LayoutEdge {
  id: string;
  type: 'union_line' | 'union_stem' | 'distribution_bar' | 'child_drop' | 'parent_connector';
  path: string;
  status: RelationStatus;
  isIncoherent?: boolean;
}

export interface LayoutResult {
  nodes: LayoutNode[];
  edges: LayoutEdge[];
  unions: LayoutUnion[];
  bounds: {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
    width: number;
    height: number;
  };
}
