# Task List: Add Refund Interdiction

## Phase 1: Core Interdiction

### Task 1: Disable buttons in SaleDetails.jsx
- [ ] Compute `isRefunded = sale.returns?.length > 0`
- [ ] Disable Rembourser, Facture, Garantie buttons when refunded
- [ ] Add tooltips explaining why disabled
- [ ] Apply disabled visual styling

### Task 2: Fix SalesTable desktop refund button
- [ ] Hide desktop refund button when `isFullyReturned`

### Task 3: Bulk refund filter in SalesList.jsx
- [ ] Filter refunded sales out of `salesToRefund` in `executeBulkRefund`

## Checkpoint: All Tasks Complete
- [ ] All acceptance criteria met
- [ ] `npm run build` passes

## Risks and Mitigations
| Risk | Impact | Mitigation |
|------|--------|------------|
| Partial refund (not full) edge case | Low | Use `returns.length > 0` for all checks — if any return exists, buttons disabled |
| User needs to re-print invoice for a refunded sale | Low | Invoice is already printable via the preview component; the print button is just a convenience |
