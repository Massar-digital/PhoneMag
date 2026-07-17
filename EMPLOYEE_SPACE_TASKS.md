# Espace Employé — Tasks

Extracted from `EdenStore_Desktop_Pages_Checklist.md`.

---

## Status Overview

| # | Page | Status |
|---|------|--------|
| 1 | 🏠 Tableau de bord | **à construire** |
| 2 | 🛒 Nouvelle vente | ✅ déjà en place |
| 3 | 🌸 Catalogue (lecture seule) | **à construire** |
| 4 | 👥 Clients | **à construire** |
| 5 | 📋 Paniers suspendus | **à séparer** |
| 6 | 🧾 Historique des ventes | ✅ déjà en place |
| 7 | 💰 Mon salaire | ✅ déjà en place |
| 8 | 🚪 Déconnexion | **à déplacer dans NAV_ITEMS** |

---

## 1. 🏠 Tableau de bord — à construire

- **Code actuel** : `PlaceholderPage` inline dans `App.tsx:86-100`
- Affiche "Ce module sera disponible dans la prochaine phase"
- **Action** : Remplacer par un vrai tableau de bord employé

---

## 2. 🛒 Nouvelle vente — ✅ déjà en place

- **Code** : `POS.tsx` (1211 lignes)
- Écran de vente complet : panier, dosage, cocktails, fenêtre de grâce, progression fidélité
- Les imports `MOCK_EXTRACTS`/`MOCK_CUSTOMERS` ont été remplacés par des données IPC réelles

---

## 3. 🌸 Catalogue (lecture seule) — à construire

- **Code existant** : `AdminCatalog.tsx` (avec boutons d'ajout/modification/désactivation)
- **Action** : Dériver une version Employé sans les actions d'édition
- L'admin garde l'`AdminCatalog` complet ; l'employé voit une version read-only

---

## 4. 👥 Clients — à construire

- **Code actuel** : `PlaceholderPage`
- Pas de vraie page liste/fiche client
- La recherche client existe seulement dans `CartSidebar.tsx` (à l'intérieur du POS)
- **Action** : Créer une page liste + fiche client pour l'employé

---

## 5. 📋 Paniers suspendus — à séparer

- **Logique existante** dans `lib/api.ts` :
  - `listSuspendedCarts`
  - `suspendCart`
  - `resumeSuspendedCart`
  - `deleteSuspendedCart`
- La logique est complète mais mélangée dans le POS
- **Action** : Créer une page dédiée aux paniers suspendus

---

## 6. 🧾 Historique des ventes — ✅ déjà en place

- **Code** : `SalesHistoryPage.tsx`
- Page complète : liste paginée, badges de statut, clic pour détail complet
- **Note** : Pas dans `NAV_ITEMS` — bouton en dur dans `Sidebar.tsx:116-124`
- **Action** : Déplacer dans `NAV_ITEMS`

---

## 7. 💰 Mon salaire — ✅ déjà en place

- **Code** : `SalaryScreen.tsx` (212 lignes)
- Vue hebdomadaire read-only avec calcul basé sur les paliers de CA
- Navigateur de semaines, états chargement/erreur/vide

---

## 8. 🚪 Déconnexion — à déplacer dans NAV_ITEMS

- **Code** : Bouton existe `Sidebar.tsx:126-135`
- Rouge, avec `onClick` handler fonctionnel
- **Action** : Intégrer dans `NAV_ITEMS` pour une navigation cohérente

---

## Refactoring transverse

- Déplacer les boutons en dur (`sales-history`, `logout`) dans `NAV_ITEMS` (`Sidebar.tsx`)
- Supprimer le cast `as any` dans `App.tsx:161`
- Corriger le layout admin binaire (`App.tsx:120`) — remplacer le swap complet par un filtrage des `NAV_ITEMS` selon le rôle
