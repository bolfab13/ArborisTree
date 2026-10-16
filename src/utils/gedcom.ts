import { Person, FamilyTree, Gender, RelationStatus, ArchipelagoComponent } from '../types/genealogy';

/**
 * Month translation map from English/French GEDCOM abbreviations to clean French
 */
const MONTH_MAP: Record<string, string> = {
  JAN: 'Janvier',
  JANV: 'Janvier',
  FEB: 'Février',
  FEV: 'Février',
  FEVR: 'Février',
  MAR: 'Mars',
  APR: 'Avril',
  AVR: 'Avril',
  MAY: 'Mai',
  MAI: 'Mai',
  JUN: 'Juin',
  JUIN: 'Juin',
  JUL: 'Juillet',
  JUIL: 'Juillet',
  AUG: 'Août',
  AOU: 'Août',
  AOUT: 'Août',
  SEP: 'Septembre',
  SEPT: 'Septembre',
  OCT: 'Octobre',
  NOV: 'Novembre',
  DEC: 'Décembre',
};

/**
 * Normalizes GEDCOM dates into readable French dates
 * Examples:
 * "12 MAY 1920" -> "12 Mai 1920"
 * "ABT 1850" -> "vers 1850"
 * "BEF 1900" -> "avant 1900"
 * "BET 1910 AND 1914" -> "entre 1910 et 1914"
 */
export function normalizeGedcomDate(dateStr: string): string {
  if (!dateStr) return '';
  let cleaned = dateStr.trim();

  // Strip calendar tags if present (e.g., @#DJULIAN@, @#DGREGORIAN@, @#DFRENCH R@)
  cleaned = cleaned.replace(/@#[^@]+@/g, '').trim();

  // Translate month abbreviations
  Object.entries(MONTH_MAP).forEach(([abbr, fr]) => {
    const reg = new RegExp(`\\b${abbr}\\b`, 'gi');
    cleaned = cleaned.replace(reg, fr);
  });

  // Translate GEDCOM date qualifiers
  cleaned = cleaned.replace(/\b(ABT|CIRCA|CAL|EST)\b/gi, 'vers');
  cleaned = cleaned.replace(/\b(BEF)\b/gi, 'avant');
  cleaned = cleaned.replace(/\b(AFT)\b/gi, 'après');
  cleaned = cleaned.replace(/\bBET\b/gi, 'entre');
  cleaned = cleaned.replace(/\bAND\b/gi, 'et');
  cleaned = cleaned.replace(/\bFROM\b/gi, 'de');
  cleaned = cleaned.replace(/\bTO\b/gi, 'à');

  return cleaned.trim();
}

interface ParsedGedcomLine {
  level: number;
  pointer: string; // clean pointer without @
  tag: string;
  value: string;
}

/**
 * Robust GEDCOM line parser adhering to 5.5 / 5.5.1 / 7.0 specs
 */
function parseGedcomLine(rawLine: string): ParsedGedcomLine | null {
  const line = rawLine.trim();
  if (!line) return null;

  const firstSpace = line.indexOf(' ');
  if (firstSpace === -1) {
    const level = parseInt(line, 10);
    return isNaN(level) ? null : { level, pointer: '', tag: '', value: '' };
  }

  const levelStr = line.substring(0, firstSpace);
  const level = parseInt(levelStr, 10);
  if (isNaN(level)) return null;

  const rest = line.substring(firstSpace + 1).trim();
  if (!rest) return { level, pointer: '', tag: '', value: '' };

  let pointer = '';
  let tag = '';
  let value = '';

  // Check if pointer is present: e.g. "@I123@" or "@F1@"
  if (rest.startsWith('@')) {
    const secondAt = rest.indexOf('@', 1);
    if (secondAt !== -1) {
      pointer = rest.substring(1, secondAt).trim();
      const afterPtr = rest.substring(secondAt + 1).trim();
      const nextSpace = afterPtr.indexOf(' ');
      if (nextSpace === -1) {
        tag = afterPtr.toUpperCase();
        value = '';
      } else {
        tag = afterPtr.substring(0, nextSpace).toUpperCase();
        value = afterPtr.substring(nextSpace + 1).trim();
      }
    } else {
      const nextSpace = rest.indexOf(' ');
      tag = (nextSpace === -1 ? rest : rest.substring(0, nextSpace)).toUpperCase();
      value = nextSpace === -1 ? '' : rest.substring(nextSpace + 1).trim();
    }
  } else {
    const nextSpace = rest.indexOf(' ');
    if (nextSpace === -1) {
      tag = rest.toUpperCase();
      value = '';
    } else {
      tag = rest.substring(0, nextSpace).toUpperCase();
      value = rest.substring(nextSpace + 1).trim();
    }
  }

  return { level, pointer, tag, value };
}

/**
 * Extracts first and last names from GEDCOM NAME string
 * Formats handled:
 * - "Jean /DUPONT/" -> "Jean", "DUPONT"
 * - "/DUPONT/ Jean" -> "Jean", "DUPONT"
 * - "Jean /DUPONT/ de La Tour" -> "Jean de La Tour", "DUPONT"
 * - "/DUPONT/" -> "", "DUPONT"
 * - "Jean DUPONT" -> "Jean", "DUPONT"
 * - "Jean" -> "Jean", ""
 */
function extractNames(nameValue: string): { firstName: string; lastName: string } {
  if (!nameValue) return { firstName: '', lastName: '' };

  const slashMatch = nameValue.match(/^(.*?)\/([^/]*)\/(.*)$/);
  if (slashMatch) {
    const before = slashMatch[1].trim();
    const surn = slashMatch[2].trim();
    const after = slashMatch[3].trim();
    const givn = [before, after].filter(Boolean).join(' ').trim();
    return {
      firstName: givn,
      lastName: surn,
    };
  }

  const parts = nameValue.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return { firstName: '', lastName: '' };
  }
  if (parts.length === 1) {
    return { firstName: parts[0], lastName: '' };
  }

  // Look for an ALL-CAPS word as the surname
  const upperIdx = parts.findIndex((p) => p.length > 1 && p === p.toUpperCase());
  if (upperIdx !== -1) {
    const surn = parts[upperIdx];
    const rest = parts.filter((_, idx) => idx !== upperIdx).join(' ');
    return { firstName: rest, lastName: surn };
  }

  // Fallback: last token is surname
  const lastName = parts.pop() || '';
  const firstName = parts.join(' ');
  return { firstName, lastName };
}

interface RawFam {
  id: string;
  husb?: string;
  wife?: string;
  children: string[];
}

/**
 * Quick analysis of GEDCOM content for UI preview before import
 */
export function analyzeGedcomPreview(content: string): {
  personCount: number;
  familyCount: number;
  sampleNames: string[];
  suggestedName: string;
} {
  if (!content) {
    return { personCount: 0, familyCount: 0, sampleNames: [], suggestedName: 'Archipel' };
  }

  const cleanContent = content
    .replace(/^\uFEFF/, '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n');

  const lines = cleanContent.split('\n');
  let personCount = 0;
  let familyCount = 0;
  const sampleNames: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const parsed = parseGedcomLine(lines[i]);
    if (!parsed) continue;

    if (parsed.level === 0) {
      if (parsed.tag === 'INDI' || parsed.value === 'INDI' || parsed.tag === 'PERSON') {
        personCount++;
      } else if (parsed.tag === 'FAM' || parsed.value === 'FAM') {
        familyCount++;
      }
    } else if (parsed.level === 1 && parsed.tag === 'NAME' && sampleNames.length < 5) {
      const { firstName, lastName } = extractNames(parsed.value);
      const fullName = [firstName, lastName].filter(Boolean).join(' ');
      if (fullName) sampleNames.push(fullName);
    }
  }

  const suggestedName = sampleNames.length > 0
    ? `Archipel ${sampleNames[0]}`
    : 'Archipel généalogique';

  return {
    personCount,
    familyCount,
    sampleNames,
    suggestedName,
  };
}

/**
 * Robust GEDCOM 5.5 / 5.5.1 / 7.0 Parser
 * Handles exports from Geneanet, Ancestry, FamilySearch, Gramps, MyHeritage, Heredis, Filae, etc.
 */
export function importFromGedcom(content: string, treeName = 'Archipel importé'): FamilyTree {
  if (!content || !content.trim()) {
    throw new Error('Le fichier GEDCOM est vide ou illisible.');
  }

  // Remove UTF-8 BOM if present, normalize line breaks
  const cleanContent = content
    .replace(/^\uFEFF/, '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n');

  const lines = cleanContent.split('\n');
  const persons: Record<string, Person> = {};
  const families: Record<string, RawFam> = {};

  let currentEntity: 'INDI' | 'FAM' | null = null;
  let currentId = '';
  let currentSubTag = '';

  for (let i = 0; i < lines.length; i++) {
    const parsed = parseGedcomLine(lines[i]);
    if (!parsed) continue;

    const { level, pointer, tag, value } = parsed;

    // Level 0: Record boundary
    if (level === 0) {
      currentSubTag = '';

      const isIndi = tag === 'INDI' || value === 'INDI' || tag === 'PERSON';
      const isFam = tag === 'FAM' || value === 'FAM';

      if (isIndi) {
        currentEntity = 'INDI';
        let id = pointer;
        if (!id && value && value !== 'INDI') id = value.replace(/@/g, '').trim();
        if (!id) id = `I_${Object.keys(persons).length + 1}`;

        currentId = id;
        if (!persons[currentId]) {
          persons[currentId] = {
            id: currentId,
            firstName: '',
            lastName: '',
            gender: 'O',
            isLiving: true,
            spouseIds: [],
            childIds: [],
            relationStatus: 'validated',
          };
        }
      } else if (isFam) {
        currentEntity = 'FAM';
        let id = pointer;
        if (!id && value && value !== 'FAM') id = value.replace(/@/g, '').trim();
        if (!id) id = `F_${Object.keys(families).length + 1}`;

        currentId = id;
        // CRITICAL: Do NOT overwrite if already referenced by earlier INDI FAMS/FAMC
        if (!families[currentId]) {
          families[currentId] = {
            id: currentId,
            children: [],
          };
        }
      } else {
        currentEntity = null;
        currentId = '';
      }
      continue;
    }

    // Inside Individual Record
    if (currentEntity === 'INDI' && currentId && persons[currentId]) {
      const p = persons[currentId];

      if (level === 1) {
        currentSubTag = tag;

        if (tag === 'NAME') {
          const names = extractNames(value);
          if (names.firstName) p.firstName = names.firstName;
          if (names.lastName) p.lastName = names.lastName;
        } else if (tag === 'GIVN') {
          if (value) p.firstName = value;
        } else if (tag === 'SURN') {
          if (value) p.lastName = value;
        } else if (tag === '_MARNM' || tag === 'MAID') {
          if (value) p.maidenName = value;
        } else if (tag === 'SEX') {
          const s = value.toUpperCase().trim();
          p.gender = s === 'M' || s === 'MALE' ? 'M' : s === 'F' || s === 'FEMALE' ? 'F' : 'O';
        } else if (tag === 'OCCU') {
          p.occupation = value;
        } else if (tag === 'NOTE') {
          p.biography = (p.biography ? p.biography + '\n' : '') + value;
        } else if (tag === 'DEAT') {
          p.isLiving = false;
        } else if (tag === 'FAMC') {
          // Child in family
          const fId = value.replace(/@/g, '').trim();
          if (fId) {
            if (!families[fId]) families[fId] = { id: fId, children: [] };
            if (!families[fId].children.includes(currentId)) {
              families[fId].children.push(currentId);
            }
          }
        } else if (tag === 'FAMS') {
          // Spouse in family
          const fId = value.replace(/@/g, '').trim();
          if (fId) {
            if (!families[fId]) families[fId] = { id: fId, children: [] };
            if (p.gender === 'M' && !families[fId].husb) families[fId].husb = currentId;
            else if (p.gender === 'F' && !families[fId].wife) families[fId].wife = currentId;
            else if (!families[fId].husb) families[fId].husb = currentId;
            else if (!families[fId].wife && families[fId].husb !== currentId) families[fId].wife = currentId;
          }
        }
      } else if (level === 2) {
        if (currentSubTag === 'NAME') {
          if (tag === 'GIVN' && value) p.firstName = value;
          if (tag === 'SURN' && value) p.lastName = value;
          if ((tag === '_MARNM' || tag === 'MAID') && value) p.maidenName = value;
        } else if (currentSubTag === 'BIRT') {
          if (tag === 'DATE') p.birthDate = normalizeGedcomDate(value);
          if (tag === 'PLAC') p.birthPlace = value;
        } else if (currentSubTag === 'DEAT') {
          p.isLiving = false;
          if (tag === 'DATE') p.deathDate = normalizeGedcomDate(value);
          if (tag === 'PLAC') p.deathPlace = value;
        } else if (currentSubTag === 'NOTE' && (tag === 'CONT' || tag === 'CONC')) {
          p.biography = (p.biography || '') + (tag === 'CONT' ? '\n' : ' ') + value;
        }
      }
      continue;
    }

    // Inside Family Record
    if (currentEntity === 'FAM' && currentId && families[currentId]) {
      const fam = families[currentId];
      const cleanPtr = value.replace(/@/g, '').trim();

      if (level === 1) {
        if (tag === 'HUSB' && cleanPtr) fam.husb = cleanPtr;
        if (tag === 'WIFE' && cleanPtr) fam.wife = cleanPtr;
        if (tag === 'CHIL' && cleanPtr && !fam.children.includes(cleanPtr)) {
          fam.children.push(cleanPtr);
        }
      }
    }
  }

  // Cross-wire bidirectional relations from families
  Object.values(families).forEach((fam) => {
    const husb = fam.husb ? persons[fam.husb] : undefined;
    const wife = fam.wife ? persons[fam.wife] : undefined;

    // Link spouses
    if (husb && wife) {
      if (!husb.spouseIds.includes(wife.id)) husb.spouseIds.push(wife.id);
      if (!wife.spouseIds.includes(husb.id)) wife.spouseIds.push(husb.id);
    }

    // Link children to parents
    fam.children.forEach((cId) => {
      const child = persons[cId];
      if (!child) return;

      if (husb) {
        child.fatherId = husb.id;
        if (!husb.childIds.includes(child.id)) husb.childIds.push(child.id);
      }
      if (wife) {
        child.motherId = wife.id;
        if (!wife.childIds.includes(child.id)) wife.childIds.push(child.id);
      }
    });
  });

  const personIds = Object.keys(persons);
  if (personIds.length === 0) {
    throw new Error('Aucun individu valide (balise INDI) n\'a pu être extrait de ce fichier GEDCOM. Vérifiez que le fichier est bien un export généalogique standard.');
  }

  // Clean and assign fallbacks to unnamed individuals
  personIds.forEach((id) => {
    const p = persons[id];
    if (!p.firstName && !p.lastName) {
      p.firstName = 'Individu';
      p.lastName = id;
    } else if (!p.firstName) {
      p.firstName = '—';
    } else if (!p.lastName) {
      p.lastName = '—';
    }
    // Deduplicate relation lists
    p.spouseIds = Array.from(new Set(p.spouseIds));
    p.childIds = Array.from(new Set(p.childIds));
  });

  // Choose the best root person (person with most connections, prefer with children and spouses)
  let bestRootId = personIds[0];
  let maxRelations = -1;

  personIds.forEach((id) => {
    const p = persons[id];
    const score = p.childIds.length * 3 + p.spouseIds.length * 2 + (p.fatherId ? 1 : 0) + (p.motherId ? 1 : 0);
    if (score > maxRelations) {
      maxRelations = score;
      bestRootId = id;
    }
  });

  const rootPerson = persons[bestRootId];
  const derivedTreeName = treeName !== 'Archipel importé' 
    ? treeName 
    : rootPerson ? `Archipel ${rootPerson.lastName || rootPerson.firstName}` : 'Archipel importé';

  return {
    name: derivedTreeName,
    description: `Importé via GEDCOM standard avec ${personIds.length} personnes et ${Object.keys(families).length} alliances.`,
    persons,
    rootPersonId: bestRootId,
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Format standard GEDCOM 5.5.1 string from FamilyTree
 */
export function exportToGedcom(tree: FamilyTree): string {
  const lines: string[] = [];
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase();
  const timeStr = now.toTimeString().split(' ')[0];

  // 1. Header
  lines.push('0 HEAD');
  lines.push('1 SOUR ARCHIPEL');
  lines.push('2 VERS 2.0');
  lines.push('2 NAME ARCHIPEL Cartographie');
  lines.push('1 DEST ANY');
  lines.push(`1 DATE ${dateStr}`);
  lines.push(`2 TIME ${timeStr}`);
  lines.push('1 GEDC');
  lines.push('2 VERS 5.5.1');
  lines.push('2 FORM LINEAGE-LINKED');
  lines.push('1 CHAR UTF-8');
  lines.push('1 SUBM @SUBM1@');
  lines.push('0 @SUBM1@ SUBM');
  lines.push('1 NAME Archipel User');

  // Family units
  interface FamRecord {
    id: string;
    husb?: string;
    wife?: string;
    children: string[];
  }
  const families: Map<string, FamRecord> = new Map();
  let famCounter = 1;

  const personsList = Object.values(tree.persons || {});

  // Group into families
  personsList.forEach((person) => {
    if (person.fatherId || person.motherId) {
      const p1 = person.fatherId || '';
      const p2 = person.motherId || '';
      const key = [p1, p2].sort().join('_');
      if (!families.has(key)) {
        const famId = `@F${famCounter++}@`;
        const fPerson = p1 ? tree.persons[p1] : undefined;
        const mPerson = p2 ? tree.persons[p2] : undefined;
        families.set(key, {
          id: famId,
          husb: fPerson?.gender === 'M' ? fPerson.id : (mPerson?.gender === 'M' ? mPerson.id : (fPerson ? fPerson.id : undefined)),
          wife: mPerson?.gender === 'F' ? mPerson.id : (fPerson?.gender === 'F' ? fPerson.id : (mPerson ? mPerson.id : undefined)),
          children: [person.id],
        });
      } else {
        const existing = families.get(key)!;
        if (!existing.children.includes(person.id)) {
          existing.children.push(person.id);
        }
      }
    }

    person.spouseIds.forEach((spouseId) => {
      const key = [person.id, spouseId].sort().join('_');
      if (!families.has(key)) {
        const famId = `@F${famCounter++}@`;
        const spouse = tree.persons[spouseId];
        families.set(key, {
          id: famId,
          husb: person.gender === 'M' ? person.id : (spouse?.gender === 'M' ? spouse.id : person.id),
          wife: person.gender === 'F' ? person.id : (spouse?.gender === 'F' ? spouse.id : spouseId),
          children: [],
        });
      }
    });
  });

  const childOfFam: Record<string, string> = {};
  const spouseOfFam: Record<string, string[]> = {};

  families.forEach((fam) => {
    fam.children.forEach((cId) => {
      childOfFam[cId] = fam.id;
    });
    if (fam.husb) {
      spouseOfFam[fam.husb] = spouseOfFam[fam.husb] || [];
      if (!spouseOfFam[fam.husb].includes(fam.id)) spouseOfFam[fam.husb].push(fam.id);
    }
    if (fam.wife) {
      spouseOfFam[fam.wife] = spouseOfFam[fam.wife] || [];
      if (!spouseOfFam[fam.wife].includes(fam.id)) spouseOfFam[fam.wife].push(fam.id);
    }
  });

  // 2. Individuals
  personsList.forEach((person) => {
    const indiId = person.id.startsWith('@') ? person.id : `@${person.id}@`;
    lines.push(`0 ${indiId} INDI`);
    
    const maidenOrLast = person.maidenName || person.lastName;
    lines.push(`1 NAME ${person.firstName} /${maidenOrLast}/`);
    if (person.firstName) lines.push(`2 GIVN ${person.firstName}`);
    if (person.lastName) lines.push(`2 SURN ${person.lastName}`);
    if (person.maidenName) lines.push(`2 _MARNM ${person.lastName}`);

    lines.push(`1 SEX ${person.gender === 'M' ? 'M' : person.gender === 'F' ? 'F' : 'U'}`);

    if (person.birthDate || person.birthPlace) {
      lines.push('1 BIRT');
      if (person.birthDate) lines.push(`2 DATE ${person.birthDate}`);
      if (person.birthPlace) lines.push(`2 PLAC ${person.birthPlace}`);
    }

    if (!person.isLiving || person.deathDate || person.deathPlace) {
      lines.push('1 DEAT');
      if (person.deathDate) lines.push(`2 DATE ${person.deathDate}`);
      if (person.deathPlace) lines.push(`2 PLAC ${person.deathPlace}`);
    }

    if (person.occupation) {
      lines.push(`1 OCCU ${person.occupation}`);
    }

    if (person.biography) {
      const bioLines = person.biography.split('\n');
      lines.push(`1 NOTE ${bioLines[0] || ''}`);
      for (let i = 1; i < bioLines.length; i++) {
        lines.push(`2 CONT ${bioLines[i]}`);
      }
    }

    if (childOfFam[person.id]) {
      lines.push(`1 FAMC ${childOfFam[person.id]}`);
    }
    const mySpouseFams = spouseOfFam[person.id] || [];
    mySpouseFams.forEach((fId) => {
      lines.push(`1 FAMS ${fId}`);
    });
  });

  // 3. Families
  families.forEach((fam) => {
    lines.push(`0 ${fam.id} FAM`);
    if (fam.husb) {
      const hId = fam.husb.startsWith('@') ? fam.husb : `@${fam.husb}@`;
      lines.push(`1 HUSB ${hId}`);
    }
    if (fam.wife) {
      const wId = fam.wife.startsWith('@') ? fam.wife : `@${fam.wife}@`;
      lines.push(`1 WIFE ${wId}`);
    }
    fam.children.forEach((cId) => {
      const formattedCId = cId.startsWith('@') ? cId : `@${cId}@`;
      lines.push(`1 CHIL ${formattedCId}`);
    });
  });

  // 4. Trailer
  lines.push('0 TRLR');

  return lines.join('\n');
}

/**
 * Export and Import for JSON format
 */
export function exportToJson(tree: FamilyTree): string {
  return JSON.stringify(tree, null, 2);
}

export function importFromJson(jsonString: string): FamilyTree {
  try {
    const parsed = JSON.parse(jsonString);
    if (!parsed || typeof parsed.persons !== 'object') {
      throw new Error('Structure JSON invalide : objet persons manquant.');
    }
    return {
      name: parsed.name || 'Archipel importé',
      description: parsed.description || 'Importé depuis une sauvegarde JSON',
      persons: parsed.persons,
      rootPersonId: parsed.rootPersonId || Object.keys(parsed.persons)[0] || '',
      updatedAt: new Date().toISOString(),
    };
  } catch (err: any) {
    throw new Error(`Fichier JSON invalide : ${err.message}`);
  }
}

/**
 * Detects distinct connected components (disjoint archipelagos) in the family network.
 * A component represents an isolated cluster of individuals connected by parentage or marriage.
 */
export function detectArchipelagos(persons: Record<string, Person>): ArchipelagoComponent[] {
  const personIds = Object.keys(persons);
  if (personIds.length === 0) return [];

  // Build undirected adjacency graph
  const adj: Record<string, Set<string>> = {};
  personIds.forEach((id) => {
    adj[id] = new Set();
  });

  personIds.forEach((id) => {
    const p = persons[id];
    if (p.fatherId && persons[p.fatherId]) {
      adj[id].add(p.fatherId);
      adj[p.fatherId].add(id);
    }
    if (p.motherId && persons[p.motherId]) {
      adj[id].add(p.motherId);
      adj[p.motherId].add(id);
    }
    (p.spouseIds || []).forEach((sId) => {
      if (persons[sId]) {
        adj[id].add(sId);
        adj[sId].add(id);
      }
    });
    (p.childIds || []).forEach((cId) => {
      if (persons[cId]) {
        adj[id].add(cId);
        adj[cId].add(id);
      }
    });
  });

  const visited = new Set<string>();
  const components: ArchipelagoComponent[] = [];

  personIds.forEach((startId) => {
    if (visited.has(startId)) return;

    const componentIds: string[] = [];
    const queue: string[] = [startId];
    visited.add(startId);

    while (queue.length > 0) {
      const curr = queue.shift()!;
      componentIds.push(curr);

      adj[curr]?.forEach((neighbor) => {
        if (!visited.has(neighbor)) {
          visited.add(neighbor);
          queue.push(neighbor);
        }
      });
    }

    const compPersons = componentIds.map((id) => persons[id]);
    
    // Frequency of surnames in this component
    const surnameCount: Record<string, number> = {};
    let minYear = Infinity;
    let maxYear = -Infinity;

    let bestRootId = componentIds[0];
    let maxConnections = -1;

    compPersons.forEach((p) => {
      if (p.lastName && p.lastName !== '—' && p.lastName !== 'Individu') {
        surnameCount[p.lastName] = (surnameCount[p.lastName] || 0) + 1;
      }

      const y1 = parseInt(p.birthDate?.replace(/\D/g, '') || '0', 10);
      const y2 = parseInt(p.deathDate?.replace(/\D/g, '') || '0', 10);
      if (y1 > 1000 && y1 < 2100) {
        if (y1 < minYear) minYear = y1;
        if (y1 > maxYear) maxYear = y1;
      }
      if (y2 > 1000 && y2 < 2100) {
        if (y2 > maxYear) maxYear = y2;
      }

      const score = (p.childIds?.length || 0) * 3 + (p.spouseIds?.length || 0) * 2 + (p.fatherId ? 1 : 0) + (p.motherId ? 1 : 0);
      if (score > maxConnections) {
        maxConnections = score;
        bestRootId = p.id;
      }
    });

    const sortedSurnames = Object.entries(surnameCount)
      .sort((a, b) => b[1] - a[1])
      .map(([name]) => name);

    const primarySurname = sortedSurnames[0] || (persons[bestRootId]?.lastName !== '—' ? persons[bestRootId]?.lastName : persons[bestRootId]?.firstName) || 'Lignée';

    // Count distinct unions in this component
    const unionSet = new Set<string>();
    compPersons.forEach((p) => {
      (p.spouseIds || []).forEach((sId) => {
        const key = [p.id, sId].sort().join('_');
        unionSet.add(key);
      });
    });

    const dateRange = (minYear !== Infinity && maxYear !== -Infinity)
      ? `${minYear} – ${maxYear}`
      : minYear !== Infinity
      ? `depuis ${minYear}`
      : undefined;

    components.push({
      id: `archipel_${components.length + 1}`,
      name: `Archipel ${primarySurname}`,
      personIds: componentIds,
      personCount: componentIds.length,
      familyCount: unionSet.size,
      dateRange,
      keySurnames: sortedSurnames.slice(0, 3),
      rootPersonId: bestRootId,
    });
  });

  // Sort components by size descending (largest component first)
  components.sort((a, b) => b.personCount - a.personCount);

  return components;
}

export interface GedcomAnalysisResult {
  fullTree: FamilyTree;
  archipelagos: ArchipelagoComponent[];
  personCount: number;
  familyCount: number;
  sampleNames: string[];
  suggestedName: string;
}

/**
 * Parses and deeply analyzes GEDCOM content, identifying all separate archipelagos
 */
export function analyzeGedcomWithArchipelagos(content: string, fileName?: string): GedcomAnalysisResult {
  const treeName = fileName ? fileName.replace(/\.[^/.]+$/, '') : 'Archipel GEDCOM importé';
  const fullTree = importFromGedcom(content, treeName);
  const archipelagos = detectArchipelagos(fullTree.persons);
  
  const sampleNames = Object.values(fullTree.persons)
    .slice(0, 5)
    .map((p) => `${p.firstName} ${p.lastName}`.trim())
    .filter(Boolean);

  let totalFamilies = 0;
  archipelagos.forEach((a) => {
    totalFamilies += a.familyCount;
  });

  return {
    fullTree,
    archipelagos,
    personCount: Object.keys(fullTree.persons).length,
    familyCount: totalFamilies,
    sampleNames,
    suggestedName: fullTree.name || 'Archipel',
  };
}

/**
 * Filters a FamilyTree to keep only individuals belonging to the selected archipelagos
 * and sets the chosen person as root/pivot.
 */
export function filterTreeByArchipelagos(
  fullTree: FamilyTree,
  selectedArchipelagoIds: string[],
  allArchipelagos: ArchipelagoComponent[],
  chosenPivotId?: string
): FamilyTree {
  // If all are selected, or none selected (safety fallback to all)
  const effectiveIds = selectedArchipelagoIds.length > 0
    ? selectedArchipelagoIds
    : allArchipelagos.map((a) => a.id);

  const selectedPersonIds = new Set<string>();
  allArchipelagos.forEach((arch) => {
    if (effectiveIds.includes(arch.id)) {
      arch.personIds.forEach((pid) => selectedPersonIds.add(pid));
    }
  });

  const filteredPersons: Record<string, Person> = {};
  selectedPersonIds.forEach((pid) => {
    const orig = fullTree.persons[pid];
    if (orig) {
      filteredPersons[pid] = {
        ...orig,
        fatherId: orig.fatherId && selectedPersonIds.has(orig.fatherId) ? orig.fatherId : undefined,
        motherId: orig.motherId && selectedPersonIds.has(orig.motherId) ? orig.motherId : undefined,
        spouseIds: (orig.spouseIds || []).filter((id) => selectedPersonIds.has(id)),
        childIds: (orig.childIds || []).filter((id) => selectedPersonIds.has(id)),
      };
    }
  });

  // Determine root/pivot
  let rootId = chosenPivotId && filteredPersons[chosenPivotId]
    ? chosenPivotId
    : '';

  if (!rootId) {
    const firstSelectedArch = allArchipelagos.find((arch) => effectiveIds.includes(arch.id));
    if (firstSelectedArch && filteredPersons[firstSelectedArch.rootPersonId]) {
      rootId = firstSelectedArch.rootPersonId;
    } else {
      rootId = Object.keys(filteredPersons)[0] || '';
    }
  }

  const selectedArchNames = allArchipelagos
    .filter((a) => effectiveIds.includes(a.id))
    .map((a) => a.name);

  const derivedName = selectedArchNames.length === 1
    ? selectedArchNames[0]
    : selectedArchNames.length > 1
    ? `${selectedArchNames[0]} (+${selectedArchNames.length - 1} archipels)`
    : fullTree.name;

  return {
    name: derivedName,
    description: `Archipel généalogique (${selectedPersonIds.size} individus issus de ${effectiveIds.length} composante(s)).`,
    persons: filteredPersons,
    rootPersonId: rootId,
    updatedAt: new Date().toISOString(),
  };
}

