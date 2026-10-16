# ARCHIPEL — Plan de Correction du Moteur de Layout et Arbre Généalogique

Ce document présente l'analyse technique, le plan de correction et les fichiers ciblés pour fiabiliser le système de positionnement de l'arbre généalogique dans l'application ARCHIPEL, conformément aux règles de placement des unions, enfants et fratries.

---

## 1. Diagnostic de l'Implémentation Actuelle

### Problèmes identifiés :
1. **Absence de layout récursif ascendant/descendant (`bottom-up width calculation`)** :
   - Les enfants et conjoints étaient disposés avec des espacements fixes ou relatifs basiques, ce qui entraîne des chevauchements dès que le nombre d'enfants dépasse 3 ou 4.
2. **Liaisons directes au lieu de liens d'unions hiérarchiques** :
   - Dans le rendu visuel, les enfants n'étaient pas reliés à un point d'union central `[Parent A] —— [Parent B]`, mais directement ou de manière imprécise.
3. **Multi-unions et demi-frères/sœurs** :
   - Les enfants de conjoints distincts n'étaient pas regroupés par bloc d'union étanche, causant un mélange des lignes de descendance.
4. **Comportement au zoom/pan et réactivité** :
   - Le layout doit s'adapter dynamiquement avec calcul de bounding boxes sans jamais compresser la largeur unitaire des cartes ni tronquer le texte.

---

## 2. Architecture & Règle de Calcul du Layout (`familyTreeLayout.ts`)

Un module pur `src/utils/familyTreeLayout.ts` sera implémenté. Ce module ne dépend d'aucun composant React ; il prend en entrée les entités et relations, et renvoie les coordonnées $(x, y)$ de chaque carte, bloc d'union et arêtes de connexion SVG/Canvas.

```
                  ┌──────────────────────┐   ┌──────────────────────┐
                  │       Père           │───│       Mère           │  (Parents centrés)
                  └──────────────────────┘ ┬ └──────────────────────┘
                                           │
         ┌─────────────────────────────────┴─────────────────────────────────┐
         │ (Fratrie sous les mêmes parents)                                  │
┌─────────────────┐             ┌─────────────────┐ ─── ┌─────────────────┐
│  Frère / Sœur   │             │ Personne Focus  │  ♥  │    Conjoint     │ (Union 1)
└─────────────────┘             └─────────────────┘  ┬  └─────────────────┘
                                                     │ (Ligne d'union)
                       ┌─────────────────────────────┴─────────────────────────────┐
                       │                                                           │
              ┌─────────────────┐                                         ┌─────────────────┐
              │    Enfant 1     │                                         │    Enfant 2     │
              └─────────────────┘                                         └─────────────────┘
```

### Algorithme de calcul de largeur récursive :
1. **Dimensions fixes des cartes** :
   - Largeur standard d'une carte personne : $W_{\text{card}} = 240\text{ px}$.
   - Hauteur standard d'une carte personne : $H_{\text{card}} = 88\text{ px}$.
   - Espacement horizontal minimal : $G_x = 36\text{ px}$.
   - Espacement vertical entre générations : $G_y = 110\text{ px}$.
2. **Calcul de largeur de sous-branche (Bottom-Up)** :
   - Pour une personne feuille (sans enfant) : $\text{Width} = W_{\text{card}}$.
   - Pour une union avec $K$ enfants :
     $$\text{Width}_{\text{union}} = \max\left(2 \cdot W_{\text{card}} + \text{gap}_{\text{union}}, \; \sum_{i=1}^K \text{Width}(\text{Enfant}_i) + (K - 1) \cdot G_x\right)$$
   - L'union est centrée horizontalement au-dessus de la ligne d'espacement de ses enfants.
3. **Positionnement des arêtes (Connecteurs)** :
   - Segment horizontal entre les deux partenaires de l'union : $(x_1 + W_{\text{card}}, y) \rightarrow (x_2, y)$.
   - Point d'ancrage central de l'union : $M = \left(\frac{x_1 + x_2 + W_{\text{card}}}{2}, y + \frac{H_{\text{card}}}{2}\right)$.
   - Tronc vertical descendant depuis $M$ jusqu'au niveau intermédiaire $Y_{\text{bus}} = y + H_{\text{card}} + \frac{G_y}{2}$.
   - Barre de distribution horizontale allant de $X_{\min(\text{enfants})}$ à $X_{\max(\text{enfants})}$.
   - Branches verticales individuelles descendant vers le haut de chaque carte enfant.
4. **Styles de relations typées** :
   - Validée : Ligne pleine `stroke-zinc-800` (ou `stroke-zinc-300` en sombre), opacité 100%.
   - À confirmer : Ligne pointillée `stroke-dasharray="4 4"`, opacité 60%.
   - Incohérente / Contradictoire : Ligne rouge d'alerte `stroke-red-500` avec marqueur de signalement.

---

## 3. Fichiers Concernés et Modifications

| Fichier | Nature de la modification | Rôle |
| :--- | :--- | :--- |
| `src/utils/familyTreeLayout.ts` | **Création (Nouveau module pur)** | Calcul exact des bounding boxes, largeurs récursives, coordonnées $(x, y)$ des personnes, unions et arêtes orthogonales. |
| `src/types/genealogy.ts` | **Ajustement** | Définition des types d'unions (`UnionGroup`), statut de relation (`validated`, `to_confirm`, `contested`), et interfaces de retour du layout (`LayoutResult`, `LayoutNode`, `LayoutEdge`). |
| `src/components/FamilyTreeView.tsx` | **Refonte ciblée du rendu** | Intégration du moteur de layout pur, canvas interactif (zoom, pan, centrage, fit view), gestion du clic (focus) et double-clic (fiche). |
| `src/components/FamilyTreeNode.tsx` | **Création/Mise à jour** | Carte node au style ARCHIPEL (thème Verve, Space Grotesk, typographie nette, badge de statut, sans décorations superflues). |
| `src/data/sampleFamily.ts` | **Enrichissement des cas de test** | Intégration directe des jeux de données d'essai demandés : 0 enfant, 1 enfant, 5 enfants, 2 unions distinctes, fratrie de 6, et boutons de banc d'essai rapide (1, 3, 8 et 15 enfants). |
| `index.html` & `src/index.css` | **Ajustement de thème** | Typographie *Space Grotesk*, palette Verve (ardoise technique, contrastes francs, typographie nette). |

---

## 4. Protocole de Test et de Validation

Le composant intégrera une barre d'outils de test permettant de basculer instantanément entre les cas d'usage exigés :
- **Test 1 : Personne seule sans enfant** (vérification de la réservation de largeur minimale).
- **Test 2 : Couple avec 1 enfant** (alignement vertical parfait sous le milieu de l'union).
- **Test 3 : Couple avec 3 enfants** (largeur d'union ajustée, arête en T inversé).
- **Test 4 : Couple avec 5 enfants** (élargissement automatique, absence de chevauchement).
- **Test 5 : Stress-test 8 et 15 enfants** (vérification que la largeur de branche grandit sans tronquer les cartes, navigation au pan/zoom).
- **Test 6 : Personne à 2 unions** (séparation des blocs d'unions et distribution correcte des enfants sous leur union respective).
- **Test 7 : Fratrie de 6 personnes** (répartition propre sous les parents communs).

---

> [!NOTE]
> Merci de confirmer ce plan pour que je puisse procéder à l'implémentation complète des fichiers ciblés.
