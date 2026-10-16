import React, { createContext, useContext, useState, useEffect } from 'react';
import { FamilyTree, Person, ViewMode, SearchFilters, Gender } from '../types/genealogy';

const LOCAL_STORAGE_KEY = 'archipel_genealogy_tree_v2';

const blankInitialTree: FamilyTree = {
  name: '',
  description: '',
  persons: {},
  rootPersonId: '',
  updatedAt: new Date().toISOString(),
};

interface GenealogyContextType {
  tree: FamilyTree;
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  activePersonId: string | null;
  setActivePersonId: (id: string | null) => void;
  focusPersonId: string;
  setFocusPersonId: (id: string) => void;
  filters: SearchFilters;
  setFilters: React.Dispatch<React.SetStateAction<SearchFilters>>;
  initializeArchipelago: (firstName: string, lastName: string, gender: Gender, birthDate?: string, birthPlace?: string, occupation?: string) => void;
  addPerson: (data: Partial<Person>) => Person;
  updatePerson: (id: string, data: Partial<Person>) => void;
  deletePerson: (id: string) => void;
  loadTree: (newTree: FamilyTree) => void;
  clearTree: () => void;
  quickAddRelative: (relation: 'father' | 'mother' | 'spouse' | 'child', targetPersonId: string) => void;
  modalAddRelativeTarget: { relation: 'father' | 'mother' | 'spouse' | 'child'; targetId: string } | null;
  setModalAddRelativeTarget: (target: { relation: 'father' | 'mother' | 'spouse' | 'child'; targetId: string } | null) => void;
  isAddModalOpen: boolean;
  setIsAddModalOpen: (open: boolean) => void;
  editingPerson: Person | null;
  setEditingPerson: (person: Person | null) => void;
}

const GenealogyContext = createContext<GenealogyContextType | undefined>(undefined);

export function GenealogyProvider({ children }: { children: React.ReactNode }) {
  const [tree, setTreeState] = useState<FamilyTree>(() => {
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && typeof parsed.persons === 'object') {
          return parsed;
        }
      }
    } catch {
      // Fallback to blank initial tree
    }
    // Default to an empty base as requested: "L'application ne doit pas avoir une base déjà remplie."
    return blankInitialTree;
  });

  const [viewMode, setViewMode] = useState<ViewMode>('tree');
  const [activePersonId, setActivePersonId] = useState<string | null>(null);
  const [focusPersonId, setFocusPersonId] = useState<string>(() => {
    return tree.rootPersonId || Object.keys(tree.persons)[0] || '';
  });

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingPerson, setEditingPerson] = useState<Person | null>(null);
  const [modalAddRelativeTarget, setModalAddRelativeTarget] = useState<{
    relation: 'father' | 'mother' | 'spouse' | 'child';
    targetId: string;
  } | null>(null);

  const [filters, setFilters] = useState<SearchFilters>({
    query: '',
    gender: 'all',
    livingStatus: 'all',
    century: 'all',
    sortBy: 'name',
  });

  // Save to localStorage on change
  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(tree));
    } catch (e) {
      console.warn('Storage limit reached or localStorage disabled', e);
    }
  }, [tree]);

  // Keep focusPersonId valid if tree changes
  useEffect(() => {
    if (!tree.persons[focusPersonId]) {
      const nextId = tree.rootPersonId && tree.persons[tree.rootPersonId]
        ? tree.rootPersonId
        : Object.keys(tree.persons)[0] || '';
      setFocusPersonId(nextId);
    }
  }, [tree, focusPersonId]);

  // Initialisation d'un archipel vide à partir du nom et prénom du fondateur
  const initializeArchipelago = (
    firstName: string,
    lastName: string,
    gender: Gender,
    birthDate?: string,
    birthPlace?: string,
    occupation?: string
  ) => {
    const rootId = 'FOUNDER_' + Date.now().toString(36);
    const rootPerson: Person = {
      id: rootId,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      gender,
      birthDate: birthDate?.trim() || undefined,
      birthPlace: birthPlace?.trim() || undefined,
      occupation: occupation?.trim() || undefined,
      isLiving: true,
      spouseIds: [],
      childIds: [],
      relationStatus: 'validated',
    };

    const newTree: FamilyTree = {
      name: `Archipel ${lastName.trim()}`,
      description: `Cartographie familiale fondée par ${firstName.trim()} ${lastName.trim()}`,
      persons: {
        [rootId]: rootPerson,
      },
      rootPersonId: rootId,
      updatedAt: new Date().toISOString(),
    };

    setTreeState(newTree);
    setFocusPersonId(rootId);
    setActivePersonId(null);
    setViewMode('tree');
  };

  const addPerson = (data: Partial<Person>): Person => {
    const newId = 'I_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 5);
    const newPerson: Person = {
      id: newId,
      firstName: data.firstName?.trim() || 'Prénom',
      lastName: data.lastName?.trim() || tree.name?.replace('Archipel ', '') || 'Nom',
      maidenName: data.maidenName?.trim() || undefined,
      gender: data.gender || 'O',
      birthDate: data.birthDate || '',
      birthPlace: data.birthPlace || '',
      deathDate: data.deathDate || '',
      deathPlace: data.deathPlace || '',
      isLiving: data.isLiving !== undefined ? data.isLiving : true,
      occupation: data.occupation || '',
      biography: data.biography || '',
      photoUrl: data.photoUrl || '',
      fatherId: data.fatherId || undefined,
      motherId: data.motherId || undefined,
      spouseIds: data.spouseIds || [],
      childIds: data.childIds || [],
      relationStatus: data.relationStatus || 'validated',
    };

    setTreeState((prev) => {
      const nextPersons = { ...prev.persons, [newId]: newPerson };

      // Establish father link
      if (newPerson.fatherId && nextPersons[newPerson.fatherId]) {
        const father = nextPersons[newPerson.fatherId];
        if (!father.childIds.includes(newId)) {
          nextPersons[newPerson.fatherId] = {
            ...father,
            childIds: [...father.childIds, newId],
          };
        }
      }

      // Establish mother link
      if (newPerson.motherId && nextPersons[newPerson.motherId]) {
        const mother = nextPersons[newPerson.motherId];
        if (!mother.childIds.includes(newId)) {
          nextPersons[newPerson.motherId] = {
            ...mother,
            childIds: [...mother.childIds, newId],
          };
        }
      }

      // Establish spouses links
      newPerson.spouseIds.forEach((sId) => {
        if (nextPersons[sId]) {
          const spouse = nextPersons[sId];
          if (!spouse.spouseIds.includes(newId)) {
            nextPersons[sId] = {
              ...spouse,
              spouseIds: [...spouse.spouseIds, newId],
            };
          }
        }
      });

      // Establish children links
      newPerson.childIds.forEach((cId) => {
        if (nextPersons[cId]) {
          const child = nextPersons[cId];
          if (newPerson.gender === 'M' && child.fatherId !== newId) {
            nextPersons[cId] = { ...child, fatherId: newId };
          } else if (newPerson.gender === 'F' && child.motherId !== newId) {
            nextPersons[cId] = { ...child, motherId: newId };
          }
        }
      });

      return {
        ...prev,
        persons: nextPersons,
        rootPersonId: prev.rootPersonId || newId,
        updatedAt: new Date().toISOString(),
      };
    });

    return newPerson;
  };

  const updatePerson = (id: string, updates: Partial<Person>) => {
    setTreeState((prev) => {
      const current = prev.persons[id];
      if (!current) return prev;

      const updated: Person = { ...current, ...updates };
      const nextPersons = { ...prev.persons, [id]: updated };

      // Handle father changes
      if (current.fatherId !== updated.fatherId) {
        if (current.fatherId && nextPersons[current.fatherId]) {
          nextPersons[current.fatherId] = {
            ...nextPersons[current.fatherId],
            childIds: nextPersons[current.fatherId].childIds.filter((cid) => cid !== id),
          };
        }
        if (updated.fatherId && nextPersons[updated.fatherId]) {
          const f = nextPersons[updated.fatherId];
          if (!f.childIds.includes(id)) {
            nextPersons[updated.fatherId] = { ...f, childIds: [...f.childIds, id] };
          }
        }
      }

      // Handle mother changes
      if (current.motherId !== updated.motherId) {
        if (current.motherId && nextPersons[current.motherId]) {
          nextPersons[current.motherId] = {
            ...nextPersons[current.motherId],
            childIds: nextPersons[current.motherId].childIds.filter((cid) => cid !== id),
          };
        }
        if (updated.motherId && nextPersons[updated.motherId]) {
          const m = nextPersons[updated.motherId];
          if (!m.childIds.includes(id)) {
            nextPersons[updated.motherId] = { ...m, childIds: [...m.childIds, id] };
          }
        }
      }

      // Handle spouses
      const addedSpouses = (updated.spouseIds || []).filter((sid) => !current.spouseIds.includes(sid));
      const removedSpouses = current.spouseIds.filter((sid) => !(updated.spouseIds || []).includes(sid));

      addedSpouses.forEach((sid) => {
        if (nextPersons[sid] && !nextPersons[sid].spouseIds.includes(id)) {
          nextPersons[sid] = {
            ...nextPersons[sid],
            spouseIds: [...nextPersons[sid].spouseIds, id],
          };
        }
      });

      removedSpouses.forEach((sid) => {
        if (nextPersons[sid]) {
          nextPersons[sid] = {
            ...nextPersons[sid],
            spouseIds: nextPersons[sid].spouseIds.filter((x) => x !== id),
          };
        }
      });

      return {
        ...prev,
        persons: nextPersons,
        updatedAt: new Date().toISOString(),
      };
    });
  };

  const deletePerson = (id: string) => {
    setTreeState((prev) => {
      const nextPersons = { ...prev.persons };
      delete nextPersons[id];

      // Remove from all parent/child/spouse lists
      Object.keys(nextPersons).forEach((pid) => {
        const p = nextPersons[pid];
        let changed = false;
        let newP = { ...p };

        if (newP.fatherId === id) {
          newP.fatherId = undefined;
          changed = true;
        }
        if (newP.motherId === id) {
          newP.motherId = undefined;
          changed = true;
        }
        if (newP.spouseIds.includes(id)) {
          newP.spouseIds = newP.spouseIds.filter((sid) => sid !== id);
          changed = true;
        }
        if (newP.childIds.includes(id)) {
          newP.childIds = newP.childIds.filter((cid) => cid !== id);
          changed = true;
        }

        if (changed) {
          nextPersons[pid] = newP;
        }
      });

      const nextRoot = prev.rootPersonId === id ? (Object.keys(nextPersons)[0] || '') : prev.rootPersonId;

      return {
        ...prev,
        persons: nextPersons,
        rootPersonId: nextRoot,
        updatedAt: new Date().toISOString(),
      };
    });

    if (activePersonId === id) setActivePersonId(null);
  };

  const loadTree = (newTree: FamilyTree) => {
    setTreeState(newTree);
    const validRoot = newTree.rootPersonId && newTree.persons[newTree.rootPersonId]
      ? newTree.rootPersonId
      : Object.keys(newTree.persons)[0] || '';
    setFocusPersonId(validRoot);
    setActivePersonId(null);
  };

  const clearTree = () => {
    try {
      localStorage.removeItem(LOCAL_STORAGE_KEY);
    } catch (e) {
      console.warn('Could not remove localStorage key', e);
    }
    setTreeState(blankInitialTree);
    setFocusPersonId('');
    setActivePersonId(null);
    setEditingPerson(null);
    setModalAddRelativeTarget(null);
  };

  const quickAddRelative = (relation: 'father' | 'mother' | 'spouse' | 'child', targetPersonId: string) => {
    setModalAddRelativeTarget({ relation, targetId: targetPersonId });
    setEditingPerson(null);
    setIsAddModalOpen(true);
  };

  return (
    <GenealogyContext.Provider
      value={{
        tree,
        viewMode,
        setViewMode,
        activePersonId,
        setActivePersonId,
        focusPersonId,
        setFocusPersonId,
        filters,
        setFilters,
        initializeArchipelago,
        addPerson,
        updatePerson,
        deletePerson,
        loadTree,
        clearTree,
        quickAddRelative,
        modalAddRelativeTarget,
        setModalAddRelativeTarget,
        isAddModalOpen,
        setIsAddModalOpen,
        editingPerson,
        setEditingPerson,
      }}
    >
      {children}
    </GenealogyContext.Provider>
  );
}

export function useGenealogy() {
  const context = useContext(GenealogyContext);
  if (!context) {
    throw new Error('useGenealogy must be used within a GenealogyProvider');
  }
  return context;
}
