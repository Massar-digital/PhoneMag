# Implementation Plan: Add Refund Interdiction

## Overview

Prevent users from performing duplicate refunds or printing warranty/invoice documents on sales that have already been refunded. The interdiction applies at all entry points: sale details page, sales list table (individual and bulk), and document printing actions.

## Architecture Decisions

- Use `sale.returns.length > 0` as the single source of truth for "is refunded" — this already exists in the API response from `SaleSerializer`.
- All changes are **frontend-only** (no backend changes needed).
- Disabled buttons use `disabled` prop + `opacity-50 cursor-not-allowed` styling instead of hiding, to maintain layout stability.

## Files to Modify

1. **`frontend-vite/src/pages/SaleDetails.jsx`** — Disable Rembourser, Facture, Garantie buttons
2. **`frontend-vite/src/components/sales/SalesTable.jsx`** — Desktop view refund button (mobile is already handled)
3. **`frontend-vite/src/pages/SalesList.jsx`** — Filter already-refunded sales from bulk selection

## Task List

### Task 1: Disable buttons in SaleDetails.jsx

**Description:** Prevent all refund, warranty-print, and invoice-print actions when a sale has been refunded.

**Acceptance criteria:**
- [ ] Rembourser button is `disabled` when `sale.returns.length > 0`
- [ ] Facture button is `disabled` when `sale.returns.length > 0`
- [ ] Garantie button is `disabled` when `sale.returns.length > 0`
- [ ] Disabled buttons show a tooltip explaining why
- [ ] Disabled styling (opacity, cursor) applied consistently

### Task 2: Fix SalesTable desktop refund button

**Description:** The desktop view refund button in SalesTable doesn't check for refund status; the mobile view already does.

**Acceptance criteria:**
- [ ] Desktop refund button hidden when `isFullyReturned` (matching mobile behavior)
- [ ] Consistent check: `isFullyReturned` variable already exists

### Task 3: Filter refunded sales from bulk selection

**Description:** When performing bulk refund in SalesList, skip sales that already have returns.

**Acceptance criteria:**
- [ ] `executeBulkRefund` filters out refunded sales before processing
- [ ] Toast message shows how many were skipped

## Verification

- [ ] Open a refunded sale's details — all 3 action buttons disabled
- [ ] Sales table desktop — no refund icon on refunded rows
- [ ] Bulk refund — refunded sales silently skipped with user notification
