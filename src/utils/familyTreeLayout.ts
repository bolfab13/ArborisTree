import { 
  Person, 
  LayoutNode, 
  LayoutEdge, 
  LayoutUnion, 
  LayoutResult, 
  RelationStatus 
} from '../types/genealogy';

export interface LayoutOptions {
  cardWidth?: number;
  cardHeight?: number;
  siblingGap?: number;
  unionGap?: number;
  levelGap?: number;
  showSiblings?: boolean;
}

export const DEFAULT_LAYOUT_OPTIONS: Required<LayoutOptions> = {
  cardWidth: 220,
  cardHeight: 86,
  siblingGap: 32,
  unionGap: 48,
  levelGap: 110,
  showSiblings: true,
};

interface ChildSubtree {
  person: Person;
  width: number;
  grandchildren: { person: Person; width: number }[];
}

interface UnionGroup {
  id: string;
  spouse?: Person;
  childrenSubtrees: ChildSubtree[];
  totalWidth: number;
  status: RelationStatus;
  isIncoherent: boolean;
}

/**
 * Pure layout calculation for the ARCHIPEL genealogy tree.
 * Takes the raw persons dictionary and the focused person ID,
 * and computes exact (x, y) coordinates for all cards and orthogonal SVG connector lines.
 */
export function calculateFamilyTreeLayout(
  focusPersonId: string,
  persons: Record<string, Person>,
  options: LayoutOptions = {}
): LayoutResult {
  const opts = { ...DEFAULT_LAYOUT_OPTIONS, ...options };
  const { cardWidth, cardHeight, siblingGap, unionGap, levelGap, showSiblings } = opts;

  const nodes: LayoutNode[] = [];
  const edges: LayoutEdge[] = [];
  const unions: LayoutUnion[] = [];

  const focusPerson = persons[focusPersonId] || Object.values(persons)[0];
  if (!focusPerson) {
    return {
      nodes: [],
      edges: [],
      unions: [],
      bounds: { minX: 0, maxX: 0, minY: 0, maxY: 0, width: 0, height: 0 },
    };
  }

  // Detect basic chronological incoherencies
  const checkIncoherency = (p1?: Person, p2?: Person): boolean => {
    if (!p1 || !p2) return false;
    const y1 = parseInt(p1.birthDate?.replace(/\D/g, '') || '0', 10);
    const y2 = parseInt(p2.birthDate?.replace(/\D/g, '') || '0', 10);
    if (y1 > 0 && y2 > 0 && Math.abs(y1 - y2) > 90) return true;
    return false;
  };

  // 1. Identify Parents
  const father = focusPerson.fatherId ? persons[focusPerson.fatherId] : undefined;
  const mother = focusPerson.motherId ? persons[focusPerson.motherId] : undefined;

  // 2. Identify Siblings (sharing father or mother)
  const siblings: Person[] = [];
  if (showSiblings && (father || mother)) {
    Object.values(persons).forEach((p) => {
      if (p.id !== focusPerson.id) {
        const sharesFather = father && p.fatherId === father.id;
        const sharesMother = mother && p.motherId === mother.id;
        if (sharesFather || sharesMother) {
          siblings.push(p);
        }
      }
    });
  }

  // 3. Build Union Groups for focusPerson
  // Group children by their co-parent
  const spouses: Person[] = (focusPerson.spouseIds || [])
    .map((id) => persons[id])
    .filter((p): p is Person => Boolean(p));

  const allChildrenOfFocus: Person[] = (focusPerson.childIds || [])
    .map((id) => persons[id])
    .filter((p): p is Person => Boolean(p));

  const unionGroups: UnionGroup[] = [];

  if (spouses.length === 0) {
    // Single parent branch
    const childrenSubtrees = allChildrenOfFocus.map((child) => buildChildSubtree(child, persons, opts));
    const childrenTotalWidth = childrenSubtrees.length > 0
      ? childrenSubtrees.reduce((acc, c) => acc + c.width, 0) + (childrenSubtrees.length - 1) * siblingGap
      : 0;

    unionGroups.push({
      id: `union_${focusPerson.id}_solo`,
      spouse: undefined,
      childrenSubtrees,
      totalWidth: Math.max(cardWidth, childrenTotalWidth),
      status: focusPerson.relationStatus || 'validated',
      isIncoherent: false,
    });
  } else {
    // Collect children per spouse
    const assignedChildIds = new Set<string>();

    spouses.forEach((spouse) => {
      const spouseChildren = allChildrenOfFocus.filter((c) => {
        const isChildOfSpouse = c.fatherId === spouse.id || c.motherId === spouse.id;
        return isChildOfSpouse;
      });

      spouseChildren.forEach((c) => assignedChildIds.add(c.id));

      const childrenSubtrees = spouseChildren.map((child) => buildChildSubtree(child, persons, opts));
      const childrenTotalWidth = childrenSubtrees.length > 0
        ? childrenSubtrees.reduce((acc, c) => acc + c.width, 0) + (childrenSubtrees.length - 1) * siblingGap
        : 0;

      const coupleMinCardsWidth = cardWidth * 2 + unionGap;
      const totalWidth = Math.max(coupleMinCardsWidth, childrenTotalWidth);

      const isIncoherent = checkIncoherency(focusPerson, spouse);

      unionGroups.push({
        id: `union_${focusPerson.id}_${spouse.id}`,
        spouse,
        childrenSubtrees,
        totalWidth,
        status: (focusPerson.relationStatus === 'contested' || spouse.relationStatus === 'contested')
          ? 'contested'
          : (focusPerson.relationStatus || 'validated'),
        isIncoherent,
      });
    });

    // Any children without a specified co-parent are placed in an unassigned union or the first union
    const remainingChildren = allChildrenOfFocus.filter((c) => !assignedChildIds.has(c.id));
    if (remainingChildren.length > 0) {
      if (unionGroups.length > 0) {
        const extraSubtrees = remainingChildren.map((c) => buildChildSubtree(c, persons, opts));
        unionGroups[0].childrenSubtrees.push(...extraSubtrees);
        const newChildrenWidth = unionGroups[0].childrenSubtrees.reduce((acc, c) => acc + c.width, 0) 
          + (unionGroups[0].childrenSubtrees.length - 1) * siblingGap;
        unionGroups[0].totalWidth = Math.max(cardWidth * 2 + unionGap, newChildrenWidth);
      }
    }
  }

  // ==========================================
  // LEVEL 0: POSITION FOCUS PERSON & UNIONS
  // ==========================================
  const Y_FOCUS = 0;
  let currentX = 0;

  // Calculate width required for focus person and all their unions
  const primaryUnion = unionGroups[0];
  let focusX = 0;

  if (unionGroups.length === 1 && !primaryUnion.spouse) {
    // Focus person without spouse
    focusX = currentX + (primaryUnion.totalWidth - cardWidth) / 2;
    nodes.push({
      id: focusPerson.id,
      x: focusX,
      y: Y_FOCUS,
      width: cardWidth,
      height: cardHeight,
      person: focusPerson,
      role: 'focus',
      isFocused: true,
    });

    // Layout children directly under focus person
    layoutChildrenForUnion(
      primaryUnion,
      focusX + cardWidth / 2,
      Y_FOCUS,
      nodes,
      edges,
      unions,
      opts
    );

    currentX += primaryUnion.totalWidth + siblingGap;
  } else if (unionGroups.length === 1 && primaryUnion.spouse) {
    // 1 spouse: [Focus Person] —— [Spouse] centered over their children
    const spouse = primaryUnion.spouse;
    const blockWidth = primaryUnion.totalWidth;
    const coupleWidth = cardWidth * 2 + unionGap;

    // Center the couple horizontally within their allocated blockWidth
    const coupleStartX = currentX + (blockWidth - coupleWidth) / 2;
    focusX = coupleStartX;
    const spouseX = coupleStartX + cardWidth + unionGap;

    nodes.push({
      id: focusPerson.id,
      x: focusX,
      y: Y_FOCUS,
      width: cardWidth,
      height: cardHeight,
      person: focusPerson,
      role: 'focus',
      isFocused: true,
    });

    nodes.push({
      id: spouse.id,
      x: spouseX,
      y: Y_FOCUS,
      width: cardWidth,
      height: cardHeight,
      person: spouse,
      role: 'spouse',
      isFocused: false,
    });

    // Union midpoint
    const unionMidX = (focusX + cardWidth + spouseX) / 2;
    const unionMidY = Y_FOCUS + cardHeight / 2;

    // Horizontal union line between partners
    edges.push({
      id: `edge_${focusPerson.id}_${spouse.id}`,
      type: 'union_line',
      path: `M ${focusX + cardWidth} ${unionMidY} L ${spouseX} ${unionMidY}`,
      status: primaryUnion.status,
      isIncoherent: primaryUnion.isIncoherent,
    });

    unions.push({
      id: primaryUnion.id,
      partner1Id: focusPerson.id,
      partner2Id: spouse.id,
      midX: unionMidX,
      midY: unionMidY,
      childrenIds: primaryUnion.childrenSubtrees.map((c) => c.person.id),
      status: primaryUnion.status,
    });

    // Layout children under union
    layoutChildrenForUnion(
      primaryUnion,
      currentX,
      Y_FOCUS,
      nodes,
      edges,
      unions,
      opts,
      unionMidX,
      unionMidY
    );

    currentX += blockWidth + siblingGap;
  } else {
    // Multiple unions:
    // Place focus person once, and arrange spouses around or in sequence
    let unionOffset = currentX;

    unionGroups.forEach((ug, idx) => {
      const spouse = ug.spouse;
      const blockWidth = ug.totalWidth;
      const coupleWidth = cardWidth * 2 + unionGap;

      if (idx === 0) {
        // First union
        focusX = unionOffset + (blockWidth - coupleWidth) / 2;
        const spouseX = focusX + cardWidth + unionGap;

        nodes.push({
          id: focusPerson.id,
          x: focusX,
          y: Y_FOCUS,
          width: cardWidth,
          height: cardHeight,
          person: focusPerson,
          role: 'focus',
          isFocused: true,
        });

        if (spouse) {
          nodes.push({
            id: spouse.id,
            x: spouseX,
            y: Y_FOCUS,
            width: cardWidth,
            height: cardHeight,
            person: spouse,
            role: 'spouse',
            isFocused: false,
          });

          const midX = (focusX + cardWidth + spouseX) / 2;
          const midY = Y_FOCUS + cardHeight / 2;

          edges.push({
            id: `edge_${focusPerson.id}_${spouse.id}`,
            type: 'union_line',
            path: `M ${focusX + cardWidth} ${midY} L ${spouseX} ${midY}`,
            status: ug.status,
            isIncoherent: ug.isIncoherent,
          });

          unions.push({
            id: ug.id,
            partner1Id: focusPerson.id,
            partner2Id: spouse.id,
            midX,
            midY,
            childrenIds: ug.childrenSubtrees.map((c) => c.person.id),
            status: ug.status,
          });

          layoutChildrenForUnion(ug, unionOffset, Y_FOCUS, nodes, edges, unions, opts, midX, midY);
        }
      } else {
        // Subsequent union: place spouse to the right with union connector
        const spouseX = unionOffset + (blockWidth - cardWidth) / 2;
        if (spouse) {
          nodes.push({
            id: spouse.id,
            x: spouseX,
            y: Y_FOCUS,
            width: cardWidth,
            height: cardHeight,
            person: spouse,
            role: 'spouse',
            isFocused: false,
          });

          // Connect from focus person to this 2nd spouse
          const midX = spouseX - unionGap / 2;
          const midY = Y_FOCUS + cardHeight / 2;

          edges.push({
            id: `edge_${focusPerson.id}_${spouse.id}_ext`,
            type: 'union_line',
            path: `M ${focusX + cardWidth} ${midY} L ${spouseX} ${midY}`,
            status: ug.status,
            isIncoherent: ug.isIncoherent,
          });

          unions.push({
            id: ug.id,
            partner1Id: focusPerson.id,
            partner2Id: spouse.id,
            midX,
            midY,
            childrenIds: ug.childrenSubtrees.map((c) => c.person.id),
            status: ug.status,
          });

          layoutChildrenForUnion(ug, unionOffset, Y_FOCUS, nodes, edges, unions, opts, midX, midY);
        }
      }

      unionOffset += blockWidth + siblingGap;
    });

    currentX = unionOffset;
  }

  // ==========================================
  // SIBLINGS PLACEMENT (LEVEL 0)
  // ==========================================
  // Siblings are placed to the left of the focus person block
  let minSiblingX = focusX;
  if (siblings.length > 0) {
    let sibX = focusX - siblingGap - cardWidth;
    // Iterate in reverse so closest sibling is next to focus person
    for (let i = siblings.length - 1; i >= 0; i--) {
      const sib = siblings[i];
      nodes.push({
        id: sib.id,
        x: sibX,
        y: Y_FOCUS,
        width: cardWidth,
        height: cardHeight,
        person: sib,
        role: 'sibling',
        isFocused: false,
      });
      minSiblingX = Math.min(minSiblingX, sibX);
      sibX -= (cardWidth + siblingGap);
    }
  }

  // ==========================================
  // LEVEL -1: PARENTS (1 GENERATION ABOVE)
  // ==========================================
  if (father || mother) {
    const Y_PARENTS = Y_FOCUS - levelGap;
    const allSiblingsAndFocus = [focusPerson, ...siblings];
    
    // Calculate span of the sibling cluster
    const siblingClusterMinX = Math.min(...allSiblingsAndFocus.map((p) => {
      const n = nodes.find((node) => node.id === p.id);
      return n ? n.x : focusX;
    }));
    const siblingClusterMaxX = Math.max(...allSiblingsAndFocus.map((p) => {
      const n = nodes.find((node) => node.id === p.id);
      return n ? n.x + cardWidth : focusX + cardWidth;
    }));

    const siblingClusterCenterX = (siblingClusterMinX + siblingClusterMaxX) / 2;

    if (father && mother) {
      // Couple: [Father] —— [Mother] centered over siblingClusterCenterX
      const parentsCoupleWidth = cardWidth * 2 + unionGap;
      const fatherX = siblingClusterCenterX - parentsCoupleWidth / 2;
      const motherX = fatherX + cardWidth + unionGap;

      nodes.push({
        id: father.id,
        x: fatherX,
        y: Y_PARENTS,
        width: cardWidth,
        height: cardHeight,
        person: father,
        role: 'parent',
        isFocused: false,
      });

      nodes.push({
        id: mother.id,
        x: motherX,
        y: Y_PARENTS,
        width: cardWidth,
        height: cardHeight,
        person: mother,
        role: 'parent',
        isFocused: false,
      });

      // Union line between Father and Mother
      const parentMidX = (fatherX + cardWidth + motherX) / 2;
      const parentMidY = Y_PARENTS + cardHeight / 2;

      edges.push({
        id: `edge_parents_${father.id}_${mother.id}`,
        type: 'union_line',
        path: `M ${fatherX + cardWidth} ${parentMidY} L ${motherX} ${parentMidY}`,
        status: father.relationStatus || 'validated',
        isIncoherent: checkIncoherency(father, mother),
      });

      // Bus line descending to siblings & focus person
      const parentStemBottomY = Y_PARENTS + cardHeight + levelGap / 2;

      // Stem from union midpoint down to bus bar
      edges.push({
        id: `stem_parents`,
        type: 'union_stem',
        path: `M ${parentMidX} ${parentMidY} L ${parentMidX} ${parentStemBottomY}`,
        status: 'validated',
      });

      // Horizontal bus bar across all siblings & focus person
      const firstChildMidX = siblingClusterMinX + cardWidth / 2;
      const lastChildMidX = siblingClusterMaxX - cardWidth / 2;

      edges.push({
        id: `bus_parents`,
        type: 'distribution_bar',
        path: `M ${Math.min(firstChildMidX, parentMidX)} ${parentStemBottomY} L ${Math.max(lastChildMidX, parentMidX)} ${parentStemBottomY}`,
        status: 'validated',
      });

      // Drop lines down into each sibling and focus person
      allSiblingsAndFocus.forEach((p) => {
        const n = nodes.find((node) => node.id === p.id);
        if (n) {
          const dropX = n.x + cardWidth / 2;
          edges.push({
            id: `drop_parent_${p.id}`,
            type: 'child_drop',
            path: `M ${dropX} ${parentStemBottomY} L ${dropX} ${Y_FOCUS}`,
            status: p.relationStatus || 'validated',
          });
        }
      });
    } else {
      // One parent is known, the other is missing
      const isFatherKnown = Boolean(father);
      const knownParent = (father || mother)!;
      const parentsCoupleWidth = cardWidth * 2 + unionGap;
      const fatherX = siblingClusterCenterX - parentsCoupleWidth / 2;
      const motherX = fatherX + cardWidth + unionGap;

      if (isFatherKnown) {
        // Known father on left, missing mother placeholder on right
        nodes.push({
          id: knownParent.id,
          x: fatherX,
          y: Y_PARENTS,
          width: cardWidth,
          height: cardHeight,
          person: knownParent,
          role: 'parent',
          isFocused: false,
        });

        nodes.push({
          id: `placeholder_mother_${focusPerson.id}`,
          x: motherX,
          y: Y_PARENTS,
          width: cardWidth,
          height: cardHeight,
          person: {
            id: `placeholder_mother_${focusPerson.id}`,
            firstName: '+ Ajouter',
            lastName: 'Mère',
            gender: 'F',
            isLiving: true,
            spouseIds: [knownParent.id],
            childIds: [focusPerson.id],
          },
          role: 'placeholder_parent',
          isFocused: false,
          placeholderType: 'add_mother',
          targetPersonId: focusPerson.id,
        });
      } else {
        // Missing father placeholder on left, known mother on right
        nodes.push({
          id: `placeholder_father_${focusPerson.id}`,
          x: fatherX,
          y: Y_PARENTS,
          width: cardWidth,
          height: cardHeight,
          person: {
            id: `placeholder_father_${focusPerson.id}`,
            firstName: '+ Ajouter',
            lastName: 'Père',
            gender: 'M',
            isLiving: true,
            spouseIds: [knownParent.id],
            childIds: [focusPerson.id],
          },
          role: 'placeholder_parent',
          isFocused: false,
          placeholderType: 'add_father',
          targetPersonId: focusPerson.id,
        });

        nodes.push({
          id: knownParent.id,
          x: motherX,
          y: Y_PARENTS,
          width: cardWidth,
          height: cardHeight,
          person: knownParent,
          role: 'parent',
          isFocused: false,
        });
      }

      const parentMidX = (fatherX + cardWidth + motherX) / 2;
      const parentMidY = Y_PARENTS + cardHeight / 2;

      edges.push({
        id: `edge_parents_semi_${knownParent.id}`,
        type: 'union_line',
        path: `M ${fatherX + cardWidth} ${parentMidY} L ${motherX} ${parentMidY}`,
        status: 'to_confirm',
      });

      const parentStemBottomY = Y_PARENTS + cardHeight + levelGap / 2;
      edges.push({
        id: `stem_parents_semi`,
        type: 'union_stem',
        path: `M ${parentMidX} ${parentMidY} L ${parentMidX} ${parentStemBottomY}`,
        status: 'to_confirm',
      });

      const firstChildMidX = siblingClusterMinX + cardWidth / 2;
      const lastChildMidX = siblingClusterMaxX - cardWidth / 2;

      edges.push({
        id: `bus_parents_semi`,
        type: 'distribution_bar',
        path: `M ${Math.min(firstChildMidX, parentMidX)} ${parentStemBottomY} L ${Math.max(lastChildMidX, parentMidX)} ${parentStemBottomY}`,
        status: 'to_confirm',
      });

      allSiblingsAndFocus.forEach((p) => {
        const n = nodes.find((node) => node.id === p.id);
        if (n) {
          const dropX = n.x + cardWidth / 2;
          edges.push({
            id: `drop_parent_semi_${p.id}`,
            type: 'child_drop',
            path: `M ${dropX} ${parentStemBottomY} L ${dropX} ${Y_FOCUS}`,
            status: p.relationStatus || 'validated',
          });
        }
      });
    }
  } else {
    // NEITHER FATHER NOR MOTHER IS KNOWN:
    // Display two empty branches above the selected focus person: [ + Ajouter père ] and [ + Ajouter mère ]
    const Y_PARENTS = Y_FOCUS - levelGap;
    const parentsCoupleWidth = cardWidth * 2 + unionGap;
    const focusCenterX = focusX + cardWidth / 2;
    const fatherX = focusCenterX - parentsCoupleWidth / 2;
    const motherX = fatherX + cardWidth + unionGap;
    const midX = focusCenterX;
    const midY = Y_PARENTS + cardHeight / 2;

    nodes.push({
      id: `placeholder_father_${focusPerson.id}`,
      x: fatherX,
      y: Y_PARENTS,
      width: cardWidth,
      height: cardHeight,
      person: {
        id: `placeholder_father_${focusPerson.id}`,
        firstName: '+ Ajouter',
        lastName: 'Père',
        gender: 'M',
        isLiving: true,
        spouseIds: [],
        childIds: [focusPerson.id],
      },
      role: 'placeholder_parent',
      isFocused: false,
      placeholderType: 'add_father',
      targetPersonId: focusPerson.id,
    });

    nodes.push({
      id: `placeholder_mother_${focusPerson.id}`,
      x: motherX,
      y: Y_PARENTS,
      width: cardWidth,
      height: cardHeight,
      person: {
        id: `placeholder_mother_${focusPerson.id}`,
        firstName: '+ Ajouter',
        lastName: 'Mère',
        gender: 'F',
        isLiving: true,
        spouseIds: [],
        childIds: [focusPerson.id],
      },
      role: 'placeholder_parent',
      isFocused: false,
      placeholderType: 'add_mother',
      targetPersonId: focusPerson.id,
    });

    // Dashed union link between the empty branches
    edges.push({
      id: `edge_placeholder_parents_${focusPerson.id}`,
      type: 'union_line',
      path: `M ${fatherX + cardWidth} ${midY} L ${motherX} ${midY}`,
      status: 'to_confirm',
    });

    // Vertical line dropping from the center of empty branches directly to focusPerson
    edges.push({
      id: `stem_placeholder_parents_${focusPerson.id}`,
      type: 'union_stem',
      path: `M ${midX} ${midY} L ${midX} ${Y_FOCUS}`,
      status: 'to_confirm',
    });
  }

  // Calculate overall bounding box
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;

  nodes.forEach((n) => {
    minX = Math.min(minX, n.x);
    maxX = Math.max(maxX, n.x + n.width);
    minY = Math.min(minY, n.y);
    maxY = Math.max(maxY, n.y + n.height);
  });

  if (minX === Infinity) {
    minX = 0;
    maxX = cardWidth;
    minY = 0;
    maxY = cardHeight;
  }

  return {
    nodes,
    edges,
    unions,
    bounds: {
      minX,
      maxX,
      minY,
      maxY,
      width: maxX - minX,
      height: maxY - minY,
    },
  };
}

/**
 * Helper to build child subtree with grandchildren widths
 */
function buildChildSubtree(
  child: Person,
  persons: Record<string, Person>,
  opts: Required<LayoutOptions>
): ChildSubtree {
  const { cardWidth, siblingGap } = opts;
  const grandchildren: { person: Person; width: number }[] = [];

  (child.childIds || []).forEach((gcId) => {
    const gc = persons[gcId];
    if (gc) {
      grandchildren.push({ person: gc, width: cardWidth });
    }
  });

  const gcTotalWidth = grandchildren.length > 0
    ? grandchildren.length * cardWidth + (grandchildren.length - 1) * siblingGap
    : 0;

  const width = Math.max(cardWidth, gcTotalWidth);

  return {
    person: child,
    width,
    grandchildren,
  };
}

/**
 * Layout children and grandchildren under a specific union
 */
function layoutChildrenForUnion(
  unionGroup: UnionGroup,
  startX: number,
  yLevel: number,
  nodes: LayoutNode[],
  edges: LayoutEdge[],
  unions: LayoutUnion[],
  opts: Required<LayoutOptions>,
  unionMidX?: number,
  unionMidY?: number
) {
  const { cardWidth, cardHeight, siblingGap, levelGap } = opts;
  const children = unionGroup.childrenSubtrees;

  if (children.length === 0) return;

  const Y_CHILDREN = yLevel + levelGap;
  const Y_BUS = yLevel + cardHeight + levelGap / 2;

  // Total width of all children subtrees
  const childrenSpan = children.reduce((acc, c) => acc + c.width, 0) + (children.length - 1) * siblingGap;

  // Center children beneath union midpoint or startX
  let currentChildX = unionMidX !== undefined
    ? unionMidX - childrenSpan / 2
    : startX + (unionGroup.totalWidth - childrenSpan) / 2;

  const childDropXCoords: number[] = [];

  // Union stem descending to the children distribution bar
  if (unionMidX !== undefined && unionMidY !== undefined) {
    edges.push({
      id: `stem_${unionGroup.id}`,
      type: 'union_stem',
      path: `M ${unionMidX} ${unionMidY} L ${unionMidX} ${Y_BUS}`,
      status: unionGroup.status,
      isIncoherent: unionGroup.isIncoherent,
    });
  }

  children.forEach((childSubtree) => {
    const child = childSubtree.person;
    const subWidth = childSubtree.width;

    // Center child card within its subtree width
    const childCardX = currentChildX + (subWidth - cardWidth) / 2;
    const childCenterX = childCardX + cardWidth / 2;
    childDropXCoords.push(childCenterX);

    nodes.push({
      id: child.id,
      x: childCardX,
      y: Y_CHILDREN,
      width: cardWidth,
      height: cardHeight,
      person: child,
      role: 'child',
      isFocused: false,
    });

    // Vertical line dropping into child card
    edges.push({
      id: `drop_${unionGroup.id}_${child.id}`,
      type: 'child_drop',
      path: `M ${childCenterX} ${Y_BUS} L ${childCenterX} ${Y_CHILDREN}`,
      status: child.relationStatus || unionGroup.status,
    });

    // Handle Grandchildren
    if (childSubtree.grandchildren.length > 0) {
      const Y_GC = Y_CHILDREN + levelGap;
      const Y_GC_BUS = Y_CHILDREN + cardHeight + levelGap / 2;

      let gcX = currentChildX;
      const gcDropXs: number[] = [];

      childSubtree.grandchildren.forEach((gcItem) => {
        const gc = gcItem.person;
        nodes.push({
          id: gc.id,
          x: gcX,
          y: Y_GC,
          width: cardWidth,
          height: cardHeight,
          person: gc,
          role: 'grandchild',
          isFocused: false,
        });

        const gcMidX = gcX + cardWidth / 2;
        gcDropXs.push(gcMidX);

        edges.push({
          id: `drop_gc_${gc.id}`,
          type: 'child_drop',
          path: `M ${gcMidX} ${Y_GC_BUS} L ${gcMidX} ${Y_GC}`,
          status: gc.relationStatus || 'validated',
        });

        gcX += cardWidth + siblingGap;
      });

      // Stem from child to grandchild bus
      edges.push({
        id: `stem_child_${child.id}`,
        type: 'union_stem',
        path: `M ${childCenterX} ${Y_CHILDREN + cardHeight} L ${childCenterX} ${Y_GC_BUS}`,
        status: 'validated',
      });

      // Grandchild distribution bar
      const firstGcX = gcDropXs[0];
      const lastGcX = gcDropXs[gcDropXs.length - 1];

      edges.push({
        id: `bus_gc_${child.id}`,
        type: 'distribution_bar',
        path: `M ${Math.min(firstGcX, childCenterX)} ${Y_GC_BUS} L ${Math.max(lastGcX, childCenterX)} ${Y_GC_BUS}`,
        status: 'validated',
      });
    }

    currentChildX += subWidth + siblingGap;
  });

  // Horizontal distribution bar for this union
  const firstDropX = childDropXCoords[0];
  const lastDropX = childDropXCoords[childDropXCoords.length - 1];
  const barAnchorX = unionMidX !== undefined ? unionMidX : firstDropX;

  const barStartX = Math.min(firstDropX, barAnchorX);
  const barEndX = Math.max(lastDropX, barAnchorX);

  edges.push({
    id: `bus_${unionGroup.id}`,
    type: 'distribution_bar',
    path: `M ${barStartX} ${Y_BUS} L ${barEndX} ${Y_BUS}`,
    status: unionGroup.status,
    isIncoherent: unionGroup.isIncoherent,
  });
}
