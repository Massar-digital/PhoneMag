# PhoneMAG — Full TODO List
> Generated from Software Audit Report · Stack: Django/DRF + React/Electron  
> Score at audit: **6.1 / 10** — Target: 8.5+

---

## Legend
- 🔴 Critical — fix before scaling or selling
- 🟡 Quick Win — high impact, low effort
- 🟢 Premium — roadmap features
- 🗑️ Remove — clean up

---

## 🔴 PHASE 1 — Critical Issues (0–60 days)

---

### 1. Backend Test Suite

**Why:** You have financial + inventory logic (sales, returns, trade-ins, repairs) with zero test coverage. One edge case in a return flow can silently corrupt profit data.

**What to do:**
- [X] Set up `pytest-django` and configure `conftest.py` with a test DB
- [X] Write unit tests for **sale creation** — verify stock decrements correctly
- [X] Write unit tests for **return flow** — verify stock increments and profit recalculation
- [X] Write unit tests for **trade-in / exchange** — verify both stock out + stock in atomic behavior
- [X] Write unit tests for **repair billing** — verify amounts, paid status, and linked sale if any
- [X] Write unit tests for **expense recording** — verify net profit impact
- [X] Write integration tests for the full sale → return → restock cycle
- [x] Add CI check (GitHub Actions or local pre-commit hook) that blocks merges if tests fail
  - Implemented via `.github/workflows/backend-tests.yml` (`pytest` on push/PR) and `.pre-commit-config.yaml` (`backend-pytest` local hook).  
  - To enforce merge blocking on GitHub, set branch protection to require the `pytest` status check before merging.
- [x] Target minimum **80% coverage** on all models in `sales`, `inventory`, `repairs` apps

**Files to target:** `models.py`, `serializers.py`, `views.py` in each Django app

---

### 2. POS Performance — Replace Bulk Loading

**Why:** POS currently fetches up to 1000 phone records into client memory. At real inventory size this causes slow load, UI lag, and potential browser crashes.

**What to do:**
- [x] Create a new DRF endpoint `GET /api/products/search/?q=<query>` with server-side filtering
- [x] Add `IMEI lookup` endpoint `GET /api/products/imei/<imei>/` returning a single product
- [x] Add `barcode scan` endpoint `GET /api/products/barcode/<code>/` returning a single product
- [x] Add DB indexes on: `imei`, `barcode`, `name`, `model`, `brand` fields in the Product model
- [x] Update POS React component to use search-as-you-type (debounced, min 2 chars) instead of loading all records on mount
- [x] Remove the bulk `GET /api/products/?limit=1000` call entirely from the POS view
- [x] Add pagination (page size 20–50) to all product list views used outside POS
- [x] Test search response time — target under 200ms for common queries

**Django model change:**
```python
class Meta:
    indexes = [
        models.Index(fields=['imei']),
        models.Index(fields=['barcode']),
        models.Index(fields=['name', 'brand']),
    ]
```

---

### 3. Security Hardening

**Why:** Three specific vulnerabilities found in the audit that are all fixable within days.

#### 3a. Fix ALLOWED_HOSTS
- [x] Remove `ALLOWED_HOSTS = ['*']` from `base/settings.py`
- [x] Set `ALLOWED_HOSTS = ['localhost', '127.0.0.1']` in `settings/development.py`
- [x] Set `ALLOWED_HOSTS = ['yourdomain.com', 'www.yourdomain.com']` in `settings/production.py`
- [x] Use `DJANGO_ALLOWED_HOSTS` env variable loaded via `python-decouple` or `django-environ`

#### 3b. Move JWT from localStorage to httpOnly Cookie
- [x] In Django, configure `SIMPLE_JWT` to return tokens via `Set-Cookie` response header with `httponly=True`, `samesite='Strict'`
- [x] Update `djangorestframework-simplejwt` cookie settings:
```python
SIMPLE_JWT = {
    'AUTH_COOKIE': 'access_token',
    'AUTH_COOKIE_HTTP_ONLY': True,
    'AUTH_COOKIE_SAMESITE': 'Strict',
    'AUTH_COOKIE_SECURE': True,  # True in production (HTTPS)
}
```
- [x] Remove all `localStorage.setItem('access_token', ...)` calls in React
- [x] Update Axios interceptors to send credentials via cookies (`withCredentials: true`)
- [x] Add `CSRF_COOKIE_HTTPONLY = False` and `CSRF_TRUSTED_ORIGINS` in Django settings

#### 3c. Audit and Apply Throttling Consistently
- [x] List all DRF views and check which ones are missing `throttle_classes`
- [x] Apply `AnonRateThrottle` and `UserRateThrottle` globally in `REST_FRAMEWORK` settings
- [x] Add stricter throttle for sensitive endpoints: login, refund, void, password change
- [x] Test throttle behavior with a simple script before deploying

---

### 4. Repair Module — Full Redesign

**Why:** Current repair object is `amount + paid_flag` — that is a note, not a repair workflow. A phone repair shop needs ticket states, parts tracking, and technician assignment at minimum.

#### 4a. Redesign the Repair Django Model
- [x] Replace single `Repair` model with a proper domain model:

```python
class RepairTicket(models.Model):
    STATUS_CHOICES = [
        ('intake', 'Intake'),
        ('diagnosis', 'Diagnosis'),
        ('waiting_parts', 'Waiting for Parts'),
        ('in_repair', 'In Repair'),
        ('waiting_approval', 'Waiting Customer Approval'),
        ('ready', 'Ready for Pickup'),
        ('closed', 'Closed'),
        ('cancelled', 'Cancelled'),
    ]
    customer = models.ForeignKey(Customer, on_delete=models.PROTECT)
    device_model = models.CharField(max_length=200)
    imei = models.CharField(max_length=20, blank=True)
    issue_description = models.TextField()
    technician = models.ForeignKey(User, null=True, on_delete=models.SET_NULL)
    status = models.CharField(max_length=30, choices=STATUS_CHOICES, default='intake')
    estimated_cost = models.DecimalField(max_digits=10, decimal_places=2, null=True)
    final_cost = models.DecimalField(max_digits=10, decimal_places=2, null=True)
    customer_approved = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    due_date = models.DateField(null=True)
    notes = models.TextField(blank=True)

class RepairPart(models.Model):
    ticket = models.ForeignKey(RepairTicket, related_name='parts', on_delete=models.CASCADE)
    part_name = models.CharField(max_length=200)
    quantity = models.PositiveIntegerField(default=1)
    unit_cost = models.DecimalField(max_digits=10, decimal_places=2)

class RepairStatusLog(models.Model):
    ticket = models.ForeignKey(RepairTicket, related_name='logs', on_delete=models.CASCADE)
    previous_status = models.CharField(max_length=30)
    new_status = models.CharField(max_length=30)
    changed_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    changed_at = models.DateTimeField(auto_now_add=True)
    note = models.TextField(blank=True)
```

#### 4b. Build Repair API Endpoints
- [x] `POST /api/repairs/` — create new ticket on intake
- [x] `PATCH /api/repairs/<id>/status/` — transition status with validation (no skipping states)
- [x] `POST /api/repairs/<id>/parts/` — add parts consumed
- [x] `GET /api/repairs/<id>/` — full ticket detail with parts and status log
- [x] `GET /api/repairs/?status=in_repair` — filter by status

#### 4c. Build Repair UI in React
- [x] Repair intake form: customer lookup, device model, IMEI, issue description, estimated cost
- [x] Repair board view: Kanban-style columns by status (or table with status filter)
- [x] Ticket detail page: status history, parts list, cost breakdown, technician assignment
- [x] Manager approval flow: when status moves to `waiting_approval`, send notification and block progression until `customer_approved = true`
- [x] Overdue indicator: highlight tickets past `due_date` in red

---

## 🟡 PHASE 2 — Quick Wins (30–90 days)

---

### 5. Fast Checkout UX

**Why:** Too many clicks to complete a sale. Counter staff need speed — every extra click costs time and increases error rate.

- [X] Design a single-screen checkout flow: product search → add to cart → payment — all without page navigation
- [X] Implement keyboard shortcut map: `F2` = new sale, `F3` = hold sale, `F4` = apply discount, `F8` = encaisse (express) or confirm payment, `Escape` = cancel
- [X] Barcode/IMEI scan auto-fills product in cart (focus on scan field on page load)
- [X] Payment method quick-select: `1` = cash, `2` = card, `3` = split — no dropdown needed
- [X] Show running total, change due (for cash), and receipt preview in real time
- [X] Add "hold sale" feature — park a sale and start a new one, return to parked sales later
- [X] Reduce new sale flow to under 5 actions for a standard single-item cash sale

---

### 6. Customer Profiles at Checkout

**Why:** No customer history at POS means no upsell, no loyalty, no dispute resolution.

- [ ] Add customer search/autocomplete at checkout (search by name, phone, or ID)
- [ ] Customer model should include: name, phone, email, total_purchases, last_visit
- [ ] Show customer summary card when selected: last purchase, total spent, open repairs
- [ ] Allow creating a new customer inline during checkout (name + phone minimum)
- [ ] Link every completed sale to a customer record (optional but prompted)
- [ ] Add customer detail page: full purchase history, repair history, outstanding balance

---

### 7. Shift Management & Cash Reconciliation

**Why:** Without shift open/close and cash reconciliation, there is no way to detect theft, errors, or cash discrepancies at end of day.

- [ ] Add `Shift` model: `opened_by`, `opened_at`, `closed_by`, `closed_at`, `opening_float`, `closing_cash_counted`, `expected_cash`, `variance`, `notes`
- [ ] Enforce shift open before any sale can be processed
- [ ] Shift close screen: show expected cash (float + cash sales), input field for counted cash, auto-calculate variance
- [ ] Flag shifts with variance above configurable threshold (e.g. > 500 DZD) for manager review
- [ ] Add `GET /api/shifts/current/` endpoint so frontend knows if a shift is open
- [ ] Shift report: per-shift summary of sales, returns, cash in/out, variance

---

### 8. Refund & Void Approval Controls

**Why:** Any staff member can currently issue refunds/voids with no approval gate — major fraud risk.

- [ ] Add `refund_requires_approval_above` setting in store config (e.g. 5000 DZD)
- [ ] When refund amount exceeds threshold, set `status = 'pending_approval'` and block completion
- [ ] Manager approval endpoint: `POST /api/refunds/<id>/approve/` — requires manager role
- [ ] Add `void_reason` required field on all void actions (dropdown: duplicate, error, customer request, fraud)
- [ ] Log all refunds and voids with: amount, reason, approved_by, timestamp
- [ ] Show pending approvals count on manager dashboard

---

### 9. Dashboard Improvements

**Why:** Current dashboard shows vanity metrics. Managers need exception-based alerts.

- [ ] Add **overdue repairs** widget: count of tickets past due date, link to repair list filtered by overdue
- [ ] Add **stockout risk** widget: products with quantity ≤ reorder threshold
- [ ] Add **cash variance** widget: today's shift variance if shift is closed, or running cash total if open
- [ ] Add **pending approvals** widget: refunds/voids waiting for manager action
- [ ] Add **today's returns** metric: count and total value — spikes indicate potential abuse
- [ ] Remove or collapse widgets that show data available elsewhere without adding decision value

---

## 🟡 PHASE 2 — UI/UX Cleanup (30–90 days)

---

### 10. Remove Decorative Visual Effects

**Why:** Background blobs, gradient orbs, and heavy framing slow rendering and distract in a fast-paced counter environment.

- [ ] Search all React components for: `background: radial-gradient`, `background: linear-gradient` used decoratively, blob/orb CSS classes
- [ ] Remove all decorative background gradients — replace with flat `var(--color-background-secondary)` surfaces
- [ ] Keep only functional gradients if any (e.g. a subtle header separator)
- [ ] Remove CSS animations not tied to user interaction (floating elements, pulse effects)
- [ ] Audit CSS bundle size before and after — target measurable reduction

---

### 11. Standardize Table / Filter / Action Layout

**Why:** Mixed UI patterns across screens force users to re-learn the interface on every page.

- [ ] Define a single `<DataTable>` component used across all list views (products, sales, repairs, customers)
- [ ] Standardize filter bar: search input left, filter dropdowns center, action buttons right — same on every screen
- [ ] Standardize row actions: edit icon, delete icon, view icon — same position, same behavior everywhere
- [ ] Standardize empty state: icon + message + primary action button
- [ ] Standardize pagination controls: previous / page indicator / next — bottom right of every table

---

### 12. Consolidate Legacy + Modern Sale Flows

**Why:** Two coexisting sale flows doubles the bug surface and confuses the codebase.

- [ ] Map both flows and document the differences
- [ ] Identify which flow is the target state
- [ ] Write migration plan: redirect legacy flow endpoints to new flow with backward-compatible responses
- [ ] Remove legacy flow code after a 2-week parallel-run verification period
- [ ] Add a single integration test covering the consolidated flow end-to-end

---

### 13. Mobile UX Improvements

**Why:** Mobile is currently just responsive rendering — not optimized for real use by staff on the floor.

- [ ] Audit all touch targets — minimum 44×44px for all buttons and interactive elements
- [ ] Move primary actions (checkout, save, confirm) to bottom of screen (thumb zone)
- [ ] Implement scan-first interaction on mobile: open camera/scanner immediately on product lookup
- [ ] Add offline feedback: show a clear banner when the app is operating offline
- [ ] Test full sale flow on a real Android device (not just browser DevTools)

---

## 🟢 PHASE 3 — Premium Features (90–240 days)

---

### 14. Loyalty & Retention System

- [ ] Add `LoyaltyAccount` model linked to `Customer`: points balance, tier, history
- [ ] Award points on every completed sale (configurable rate, e.g. 1 point per 100 DZD)
- [ ] Redeem points at checkout as discount
- [ ] Add campaign model: target segment (all, inactive > 30 days, high-value), message, discount code
- [ ] Basic segmentation: new customers, repeat buyers, churned (no purchase in 60+ days)
- [ ] Send campaigns via WhatsApp Business API or email

---

### 15. Advanced Inventory Controls

- [ ] Serial-level tracking: each unit has its own serial record with status (in_stock, sold, returned, in_repair)
- [ ] Transfer orders: move stock between warehouses/locations with approval and audit log
- [ ] Purchase receiving workflow: create PO → receive shipment → auto-update stock → match invoice
- [ ] Supplier model with lead time, reliability score, last PO history
- [ ] Low-stock alerts with auto-draft PO suggestion

---

### 16. AI Features

- [ ] **Demand forecasting:** train a simple time-series model (ARIMA or Prophet) on sales history by SKU — output reorder suggestions with confidence scores
- [ ] **Repair triage assistant:** given device model + issue description, suggest likely parts needed and estimated cost range (use your existing Mistral/LangChain stack)
- [ ] **Upsell script generator:** at checkout, suggest accessories or protection plans based on device purchased
- [ ] **Anomaly detection:** flag unusual refund patterns, late-shift voids, or staff-level outliers for manager review

---

### 17. Multi-Store Support

- [ ] Add `Store` model — all existing data gets a `store_id` foreign key
- [ ] Add `StoreAdmin` role: can see only their store's data
- [ ] Add `SuperAdmin` role: cross-store view, transfer approvals, consolidated reporting
- [ ] Stock transfer between stores: request → approval → dispatch → receive flow
- [ ] Central dashboard: compare stores by revenue, margin, stockout rate, repair SLA

---

## 🗑️ CLEANUP — Remove / Deprecate

---

### 18. Remove Low-Value Duplicated Report Exports

- [ ] Audit all export buttons — identify which generate identical or near-identical files
- [ ] Keep one canonical export per report type (CSV or PDF, not both unless both are used)
- [ ] Remove unused export buttons from UI
- [ ] If scheduled exports are needed in future, implement as a background job (Celery) — not manual button clicks

---

### 19. Phase Out Legacy Compatibility Paths

- [ ] List all code paths, endpoints, or model fields marked as legacy or kept for backward compatibility
- [ ] For each: assess if any active flow still depends on it
- [ ] Write a migration for any data that needs to move to the new model
- [ ] Remove the legacy path after migration is confirmed
- [ ] Document the removal in `CHANGELOG.md`

---

## Summary Checklist by Priority

| # | Task | Phase | Effort |
|---|------|-------|--------|
| 1 | Backend test suite | 🔴 Critical | High |
| 2 | POS search performance | 🔴 Critical | Medium |
| 3a | Fix ALLOWED_HOSTS | 🔴 Critical | Low |
| 3b | JWT → httpOnly cookie | 🔴 Critical | Medium |
| 3c | Throttling audit | 🔴 Critical | Low |
| 4 | Repair module redesign | 🔴 Critical | High |
| 5 | Fast checkout UX | 🟡 Quick Win | Medium |
| 6 | Customer profiles at POS | 🟡 Quick Win | Medium |
| 7 | Shift management | 🟡 Quick Win | Medium |
| 8 | Refund/void approvals | 🟡 Quick Win | Low |
| 9 | Dashboard improvements | 🟡 Quick Win | Low |
| 10 | Remove decorative effects | 🟡 Quick Win | Low |
| 11 | Standardize table/filter UI | 🟡 Quick Win | Medium |
| 12 | Consolidate sale flows | 🟡 Quick Win | Medium |
| 13 | Mobile UX | 🟡 Quick Win | Medium |
| 14 | Loyalty system | 🟢 Premium | High |
| 15 | Advanced inventory | 🟢 Premium | High |
| 16 | AI features | 🟢 Premium | High |
| 17 | Multi-store | 🟢 Premium | Very High |
| 18 | Remove duplicate exports | 🗑️ Cleanup | Low |
| 19 | Phase out legacy paths | 🗑️ Cleanup | Medium |

---

*Last updated: May 2026 · Based on audit of Django/DRF + React/Electron codebase*
