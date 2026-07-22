# PhoneMag — Comprehensive Technical Report

## 1. App Overview

**Purpose:** PhoneMag is a full-featured **Point-of-Sale (POS) and inventory management desktop application** tailored for mobile phone retailers and repair shops in Algeria. It manages phone/accessory inventory, sales (single-item and multi-item), trade-ins (exchanges), repairs, expenses, customer relationships, supplier accounts, and employee performance.

**Target Users:**
- Shop owners / managers (admin role)
- Sales staff (salesperson role)
- Repair technicians
- The application is sold under a **license-key model** (Keygen.sh), targeting independent phone shops

**Core Problem Solved:** Replaces paper-based or spreadsheet-driven inventory/sales tracking with an integrated offline-first desktop application that works entirely on a local network, with optional cloud sync.

---

## 2. Tech Stack

| Layer | Technology | Version | Rationale |
|---|---|---|---|
| **Frontend Framework** | React | 18.x | SPA with component model |
| **Build Tool** | Vite | 5.x | Fast HMR, optimized builds |
| **Routing** | react-router-dom (HashRouter) | 6.x | Hash-based for Electron `file://` compatibility |
| **Data Fetching** | @tanstack/react-query | — | Server-state sync, caching, refetch |
| **HTTP Client** | Axios | — | Token refresh interceptor, cookie support |
| **Styling** | Tailwind CSS | 3.x | Utility-first, dark mode support |
| **Charts** | Recharts | — | Dashboard graphs |
| **Forms** | react-hook-form + yup | — | Form state + validation |
| **PDF Generation** | jsPDF, pdf-lib | — | Invoice/warranty generation |
| **Barcode Scanning** | html5-qrcode | — | Camera-based IMEI/barcode scanning |
| **Printing** | Electron native print API | — | Receipt/label printing |
| **Desktop** | Electron | 39.x | Cross-platform desktop wrapper |
| **Auto-Update** | electron-updater | — | GitHub Releases-based |
| **Licensing** | Keygen.sh API | — | Per-machine license activation |
| **Backend** | Django + DRF | 5.2.8 / 3.16.1 | Admin, ORM, REST framework |
| **Auth** | djangorestframework-simplejwt | 5.5.1 | JWT via httpOnly cookies |
| **API Docs** | drf-spectacular | 0.27.2 | OpenAPI 3 / Swagger / Redoc |
| **Filtering** | django-filter | 25.2 | URL-based queryset filtering |
| **CORS** | django-cors-headers | 4.3.1 | Cross-origin for local dev |
| **Image Processing** | Pillow | 10.4 | ImageField support |
| **DB (dev/electron)** | SQLite | — | Zero-config, bundled |
| **DB (cloud)** | PostgreSQL | — | Via Render.com (config only) |
| **WSGI Server** | Waitress | 3.0 | Production-ready WSGI |

---

## 3. Architecture (Data Flow)

```
┌─────────────────────────────────────────────────┐
│                  Electron Shell                  │
│  ┌──────────────────────────────────────────┐   │
│  │          Main Process (main.cjs)          │   │
│  │  ┌────────┐ ┌──────────┐ ┌────────────┐  │   │
│  │  │License │ │ Auto-    │ │ Backend    │  │   │
│  │  │Manager │ │ Updater  │ │ Spawner    │  │   │
│  │  └────────┘ └──────────┘ └─────┬──────┘  │   │
│  │  ┌────────┐ ┌──────────┐       │         │   │
│  │  │CPCL    │ │ DB       │       │         │   │
│  │  │Printer │ │Backup/Rest│      │         │   │
│  │  └────────┘ └──────────┘       │         │   │
│  └────────────────────────────────┼─────────┘   │
│                                   │              │
│  ┌────────────────────────────────┼──────────┐   │
│  │  Renderer (React SPA)         │          │   │
│  │  ┌──────────┐ ┌────────────┐  │          │   │
│  │  │  Pages   │ │ Components │  │          │   │
│  │  ├──────────┤ ├────────────┤  │          │   │
│  │  │  Context │ │  Hooks     │  │          │   │
│  │  └────┬─────┘ └────────────┘  │          │   │
│  │       │                       │          │   │
│  │  ┌────┴──────────────┐        │          │   │
│  │  │  Axios Client      │        │          │   │
│  │  │  (api.jsx)         │────────┼──────────┘   │
│  │  └───────────────────┘        │              │
│  └────────────────────────────────┘              │
└─────────────────────────────────────────────────┘
                     │ HTTP :8000
┌────────────────────┴────────────────────────────┐
│          Django Backend (DRF)                    │
│  ┌──────────┐ ┌──────────┐ ┌───────────────┐   │
│  │ auth app │ │phones app│ │  sales app    │   │
│  ├──────────┤ ├──────────┤ ├───────────────┤   │
│  │ inventory│ │  shop    │ │  core (sync)  │   │
│  │ app      │ │  app     │ │  app          │   │
│  └──────────┘ └──────────┘ └───────┬───────┘   │
│                                    │            │
│  ┌─────────────────────────────────┴───────┐   │
│  │           SQLite / PostgreSQL            │   │
│  └─────────────────────────────────────────┘   │
└─────────────────────────────────────────────────┘
```

**Flow Summary:**
1. Electron main process spawns Django backend as a subprocess on port 8000
2. Electron main process validates license (Keygen.sh) before allowing app to run
3. React SPA communicates with Django via Axios (httpOnly JWT cookies for auth)
4. Django handles all business logic, inventory deductions, profit calculations
5. Cloud sync (optional) replicates data to PostgreSQL for backup

---

## 4. Features List

### Core
- **Point of Sale (POS):** Multi-item sales, IMEI/barcode scanning, customer lookup, payment methods (Cash/Card/Split/Check/Mobile Wallet), trade-in processing
- **Inventory Management:** Stock tracking, reorder levels, multi-location, stock adjustment with audit history
- **Product Catalog:** Phones, laptops, cases, chargers, cables, screen protectors, headphones, power banks, memory cards, adapters, holders; with IMEI tracking, barcode (auto-generated `PM-XXXXXX`)

### Secondary
- **Repair Tickets:** Full lifecycle (intake → diagnosis → waiting parts → in repair → waiting approval → ready → closed), status logs, parts tracking, overdue detection
- **Customer Management:** Purchase history, loyalty points, balance
- **Supplier Management:** Contact info, payment terms, delivery time, accounts payable
- **Returns Processing:** Full refund flow with product re-creation from JSON snapshots, profit impact calculation
- **Expense Tracking:** Categorized (Rent, Electricity, Salaries, etc.), per-day reporting
- **Trade-in / Exchanges:** Old device → inventory conversion, client pays difference
- **Employee Performance:** Per-user sales count, revenue, profit, returns
- **Reporting:** Daily/Monthly sales reports, inventory reports, profit reports, employee performance

### Admin
- **User Management:** Create/update/delete users, role assignment (admin/manager/salesperson)
- **Shop Settings:** Company info, currency, tax rate, barcode printer config, logo upload
- **License Management:** Activation, validation, machine binding, auto-renewal checks
- **Database Backup/Restore** (via Electron IPC)

### Auth & Security
- JWT-based auth with httpOnly cookies (dual support: Bearer header + cookie)
- Role-based access (Admin, Manager, Salesperson) enforced at view level
- Login rate limiting, password reset with hardcoded developer PIN
- CSRF protection, secure headers (HSTS, X-Frame-Options, CSP, Referrer-Policy)
- Password change with old password verification
- Initial setup wizard (first admin + shop creation)

---

## 5. Data Models & Database Schema

### Django `auth.User` (extended)
- Relations: `user_role` (UserRole), `preferences` (UserPreferences), `profile` (UserProfile), `sales_made` (Sale), `expenses_recorded` (Expense)

### `authentication.UserRole`
| Field | Type | Notes |
|---|---|---|
| user | OneToOne → User | |
| role | CharField(20) | admin / manager / salesperson |

### `authentication.PasswordResetToken`
| Field | Type | Notes |
|---|---|---|
| user | ForeignKey → User | |
| token | CharField(255) | UUID |
| expires_at | DateTime | 24h TTL |
| is_used | Boolean | Prevents reuse |

### `authentication.UserPreferences`
Theme, language, page_size, notification toggles.

### `authentication.UserProfile`
Profile picture (ImageField).

### `phones.Phone` (core product entity)
| Field | Type | Notes |
|---|---|---|
| product_type | CharField(50) | Phone/Laptop/Case/Charger/etc |
| brand | CharField(100) | Apple/Samsung/Xiaomi/... |
| model | CharField(100) | |
| price | Decimal(10,2) | Selling price |
| purchase_price | Decimal(10,2) | Cost for profit calc |
| storage | CharField(50) | Nullable (accessories) |
| ram | CharField(50) | Nullable |
| color | CharField(50) | |
| condition | CharField(20) | New/Refurbished/Used/Defective |
| image | ImageField | |
| image_url | URLField(500) | |
| IMEI | CharField(15) | Nullable |
| barcode | CharField(50) | Unique, auto-generated `PM-{id:06d}` |
| battery_percentage | Integer | Nullable (phones) |
| battery_cycle | Integer | Nullable (laptops) |
| screen_size | CharField(20) | Nullable |
| supplier | ForeignKey → Supplier | Nullable |

### `sales.Sale`
| Field | Type | Notes |
|---|---|---|
| user | ForeignKey → User | Salesperson |
| phone | ForeignKey → Phone | Deprecated single-item |
| customer | ForeignKey → Customer | |
| quantity | Integer | Deprecated single-item |
| total_price | Decimal(10,2) | |
| amount_paid | Decimal(10,2) | |
| payment_status | CharField | UNPAID/PARTIAL/PAID |
| discount_applied | Decimal(6,2) | |
| profit_margin | Decimal(10,2) | Calculated on save |
| invoice_number | CharField(20) | Unique, `INV-{year}-{seq:05d}` |
| payment_method | CharField | Cash/Card/Split/Check/Mobile Wallet |
| trade_in_value | Decimal(10,2) | |
| warranty_duration | CharField(100) | |
| sale_date | DateTime | auto_now_add |

### `sales.SaleItem` (line items)
| Field | Type | Notes |
|---|---|---|
| sale | ForeignKey → Sale | |
| phone | ForeignKey → Phone | Nullable (deleted products) |
| product_data_snapshot | JSONField | Stores product data before deletion |
| quantity | Integer | |
| unit_price | Decimal(10,2) | |
| total_price | Decimal(10,2) | Calculated |

### `sales.TradeIn`
| sale (OneToOne → Sale), brand, model, imei, color, storage, condition, trade_in_value, received_phone (OneToOne → Phone)

### `sales.Expense`
| category, amount, description, date, user

### `sales.RepairTicket`
| customer, device_model, imei, technician, status (8 states), estimated_cost, final_cost, customer_approved, due_date, notes

### `sales.RepairPart`
| ticket (FK → RepairTicket), part_name, quantity, unit_cost

### `sales.RepairStatusLog`
| ticket, previous_status, new_status, changed_by, note

### `sales.ProductReturn` + `ProductReturnItem` (returns)
Return_number auto-generated, tracks refund_amount, profit_impact, and re-creates deleted products from JSON snapshots.

### `sales.models_customer.Customer`
| name, phone, email, address, loyalty_points, balance

### `inventory.Supplier`
| name, contact_person, phone, email, address, payment_terms, delivery_time, balance

### `inventory.InventoryItem`
| phone (OneToOne → Phone), stock_quantity, reorder_level, location, supplier, last_restocked

### `inventory.StockHistory`
| inventory_item (FK → InventoryItem), adjustment_type (ADD/REMOVE), quantity, reason (SALE/RETURN/RESTOCK/etc.), previous_stock, new_stock, created_by

### `shop.Shop`
| name, email, phone, address (multi-line), city, country, currency_symbol, tax_rate, logo, invoice_footer, website, instagram_handle, barcode_printer_name, barcode_label_width/height/orientation

---

## 6. API Surface

All endpoints are under `/api/`. Auth via JWT (httpOnly cookie or Bearer header). Pagination via `?page=N` and `?page_size=N` (default 20, max 1000).

### Authentication (`/api/auth/`)
| Method | Endpoint | Description |
|---|---|---|
| GET | `setup/status/` | Check if system is initialized |
| POST | `setup/admin/` | Create initial admin + shop |
| POST | `token/` | Login (JWT pair) |
| POST | `token/refresh/` | Refresh access token |
| POST | `register/` | Register new user |
| POST | `logout/` | Clear auth cookies |
| POST | `password/reset/` | Request reset (PIN-based) |
| POST | `password/reset/confirm/` | Confirm reset |
| GET | `users/current/` | Current user profile |
| PUT/PATCH | `users/current/` | Update profile |
| POST | `users/current/upload-picture/` | Upload avatar |
| POST | `users/change-password/` | Change password |
| GET/POST | `users/` | List/Create users (admin) |
| GET/PUT/PATCH/DELETE | `users/{id}/` | User CRUD (admin) |
| GET/POST/PUT/PATCH | `preferences/` | User preferences |

### Phones/Products (`/api/`)
| Method | Endpoint | Description |
|---|---|---|
| GET | `products/search/?q=` | Multi-field search |
| GET | `products/imei/{imei}/` | IMEI lookup |
| GET | `products/barcode/{code}/` | Barcode lookup |
| GET | `phones/` | List phones (filterable) |
| POST | `phones/` | Create phone |
| GET | `phones/{id}/` | Phone detail + inventory |
| PUT/PATCH | `phones/{id}/` | Update phone |
| DELETE | `phones/{id}/` | Delete phone (admin) |
| GET | `phones/low_stock/` | Low stock items |

### Sales (`/api/`)
| Method | Endpoint | Description |
|---|---|---|
| GET/POST | `sales/` | List/Create sales |
| GET/PUT/PATCH/DELETE | `sales/{id}/` | Sale CRUD |
| GET | `sales/daily_report/` | Daily report |
| GET | `sales/stats/` | Period statistics |
| GET | `sales/employee_performance/` | Per-employee |

### Customers (`/api/`)
| GET/POST | `customers/` | List/Create |
| GET/PUT/PATCH/DELETE | `customers/{id}/` | CRUD |

### Expenses (`/api/`)
| GET/POST | `expenses/` | List/Create |
| GET/PUT/PATCH/DELETE | `expenses/{id}/` | CRUD |
| GET | `expenses/stats/` | By-category aggregation |

### Repairs (`/api/`)
| GET/POST | `repairs/` | List/Create |
| GET/PUT/PATCH/DELETE | `repairs/{id}/` | CRUD |
| PATCH | `repairs/{id}/status/` | Status transition |
| POST | `repairs/{id}/add_part/` | Add repair part |

### Returns (`/api/`)
| GET/POST | `returns/` | List (with nested items) / Create |
| DELETE | `returns/{id}/` | Delete |

### Exchanges (`/api/`)
| GET/POST | `exchanges/` | List/Create (Sale + TradeIn) |
| GET | `exchanges/stats/` | Aggregate stats |

### Inventory (`/api/`)
| GET/POST | `inventory/` | List/Create |
| PUT/PATCH/DELETE | `inventory/{id}/` | CRUD |
| POST | `inventory/{id}/adjust_stock/` | Adjust + history log |
| GET | `inventory/{id}/history/` | Stock history |
| GET | `stock-history/` | Global stock history |
| GET | `stock-history/stats/` | Movement stats |

### Suppliers (`/api/`)
| Full CRUD | `suppliers/` | |

### Shop (`/api/shop/`)
| GET | `shop/` | Get settings |
| PUT/PATCH | `shop/` | Update settings |
| POST | `shop/upload_logo/` | Upload logo |
| DELETE | `shop/delete_logo/` | Remove logo |

### System (`/api/system/`)
| GET | `sync/status/` | Cloud sync status |
| POST | `sync/trigger/` | Force sync |

### Dashboard (`/api/dashboard/`)
| GET | `stats/?period=today` | Aggregated sales/inventory stats |

### Docs
| GET | `api/schema/swagger-ui/` | Swagger UI |
| GET | `api/schema/redoc/` | Redoc docs |

---

## 7. Frontend Structure

### Pages (39 total under `src/pages/`)

**Auth:** Login, Register, ForgotPassword, ResetPassword, LicenseActivation, Welcome (first-time setup)
**Dashboard:** Dashboard, MobileDashboard
**Products:** PhonesList, AddPhone, EditPhone, PhoneDetails, POS, NewSale
**Sales:** SalesList, SaleDetails, EditSale, ReturnSaleModal
**Inventory:** InventoryList, StockHistory
**Customers:** CustomersList, CustomerDetails, AddEditCustomerModal
**Suppliers:** SuppliersList, AddEditSupplierModal
**Repairs:** Repairs, RepairDetail
**Expenses:** Expenses
**Exchanges:** Exchange
**Reports:** Reports, SalesReport, InventoryReport, ProfitReport, EmployeePerformance
**Settings:** Settings, Profile
**Dev:** CPCLTestPage, ResponsiveTestPage

### Routing Strategy
- `HashRouter` for `file://` Electron compatibility
- `ProtectedRoute` wrapper checks auth state + optional `requiredRole` prop
- `AppLayout` provides sidebar navigation (only on protected pages)
- `PageTransition` wraps page content for animations

### State Management
| Concern | Mechanism |
|---|---|
| Auth state | `AuthContext` (React Context) — stores user, tokens, login/logout actions |
| Theme | `ThemeContext` — light/dark/system, applies Tailwind `dark` class |
| Notifications | `ToastContext` — global toast via `react-hot-toast` |
| Server data | `@tanstack/react-query` — 12 custom hooks in `src/hooks/` |
| Form state | `react-hook-form` + `yup` schemas |

### Component Structure (`src/components/`)
```
common/         → ErrorBoundary, PageTransition, ProtectedRoute, LoadingSpinner, Modal, SearchInput, DataTable, StatCard, Pagination, StatusBadge, ConfirmDialog, etc.
layout/         → AppLayout, Sidebar, Header, TitleBar
dashboard/      → StatCard, RevenueChart, TopProducts, RecentSales, etc.
forms/          → FormField, SelectField, PhoneForm, SaleForm
phones/         → PhoneCard, PhoneGrid, PhoneSearch
sales/          → SaleCard, SaleSummary
inventory/      → StockAdjustModal
accessibility/  → FocusTrap, SkipLink, ScreenReaderOnly
dev/            → CPCLTestPage
```

### Key Frontend Dependencies
- `recharts` — dashboard charts
- `jspdf` — PDF invoice/receipt generation
- `pdf-lib` — warranty PDF manipulation
- `html2canvas` — screenshot capture for printing
- `html5-qrcode` — camera barcode/IMEI scanning
- `react-hot-toast` — toast notifications

---

## 8. Backend Structure

### Apps

| App | Responsibility |
|---|---|
| `apps.core` | Shared validators, pagination, dashboard views, cloud sync manager, signals |
| `apps.authentication` | JWT auth, cookie auth class, role-based permissions, throttling, user CRUD |
| `apps.phones` | Phone model, product search, IMEI/barcode lookup, filters |
| `apps.sales` | Sales, SaleItems, TradeIn, Expense, RepairTicket, RepairParts, ProductReturn, Customer |
| `apps.inventory` | InventoryItem, StockHistory, Supplier |
| `apps.shop` | Shop configuration singleton |

### Key Backend Patterns

**Authentication Flow:**
1. `CustomTokenObtainPairView` → validates credentials, returns JWT pair, sets httpOnly cookies
2. `CookieJWTAuthentication` checks cookies first, falls back to Bearer header
3. `CustomTokenRefreshView` reads refresh token from cookie if missing in body
4. Role hierarchy enforced by 7 permission classes in `apps/authentication/permissions.py`

**Sale Processing (most complex flow):**
- `SaleSerializer.create()` handles: single-item (legacy), multi-item (SaleItem), trade-in (TradeIn + Phone creation)
- `Sale.save()` auto-generates invoice number, updates inventory via `InventoryItem`
- `SaleItem.save()` records product JSON snapshot before potential deletion, calculates total_price, manages inventory deduction
- `ProductReturnItem.save()` can **re-create deleted Phone records** from JSON snapshots (complete with InventoryItem)

**Profit Calculation:**
- Per-item: `(unit_price * quantity) - (purchase_price * quantity)`
- Sale-level: sum of items profit - global_discount - trade_in_value
- Returns: `profit_impact = (purchase_cost * qty) - refund_amount` (usually negative)

**Cloud Sync:**
- Signal-based (`post_save`, `post_delete`) on Phone, Sale, SaleItem, InventoryItem, Customer, UserRole, Shop, User
- `CloudSyncManager` serializes instance → queues HTTP POST to cloud endpoint
- `DatabaseSyncManager` provides sync status, manual trigger, connectivity check
- Dual database router (SQLite local + optional cloud PostgreSQL)

---

## 9. Authentication & Authorization

**Strategy:** JWT (simplejwt) with dual transport — httpOnly cookies (primary) + Bearer header (fallback).

**Token Lifetimes:** Access token = 60 minutes, Refresh token = 1 day (no rotation).

**Password Reset:** PIN-based (hardcoded `131106` in `views.py:627`) — **flagged as risk below**.

**Roles (3-tier):**

| Role | Permissions |
|---|---|
| **Admin** | Full access — user management, destructive operations (DELETE), all CRUD |
| **Manager** | CRUD on phones, sales, inventory, expenses, repairs, customers — no user management |
| **Salesperson** | Create/update sales, view inventory (read-only), view customers — cannot manage phones or users |

**Permission Classes (7):**
`IsAdmin`, `IsManager` (admin+manager), `IsSalesperson` (all authenticated), `IsSalespersonCanCreateSales`, `IsManagerOrAdmin`, `IsAdminForDestructive`, `CanManageUsers` (admin-only)

**Throttling:**
Custom rate throttles for login, register, password reset, password change, token refresh, sensitive actions (refunds/voids) — all defined in `apps/authentication/throttles.py`.

---

## 10. Third-Party Integrations

| Integration | Purpose | How |
|---|---|---|
| **Keygen.sh** | License activation & validation | REST API calls from Electron main process; offline fallback with hardware-bound SHA-256 signature |
| **electron-updater** | Auto-updates | GitHub Releases; checks on startup, downloads in background, prompts restart |
| **CUPS / PowerShell** | CPCL thermal label printing | `lp` command on Linux/macOS, P/Invoke `winspool.drv` on Windows |
| **GitHub** (via electron-builder) | Release distribution | Publishing artifacts to GitHub Releases |
| **Netlify** | Frontend hosting (web mode) | `netlify.toml` for SPA routing |
| **Render.com** | Cloud PostgreSQL | Config only, not actively deployed |
| **IMEI Validation API** | External IMEI check | Config via env vars, **disabled by default** |
| **Gmail SMTP** | Email (password reset) | `EMAIL_BACKEND`, config via env |

---

## 11. DevOps & Deployment

**Current State:** The project has **no CI/CD configuration** (no `.github/` workflows, no Docker). Builds are manual.

**Desktop App Build (electron-builder):**
- Targets: Windows (NSIS), macOS (DMG + ZIP), Linux (AppImage + deb)
- `extraResources`: bundles compiled backend executable, warranty template PDF
- Release publishing configured for GitHub

**Netlify:**
- Frontend-only deployment for web mode (`netlify.toml`)
- Build command: `npm run build`, publish dir: `dist`

**Local Development:**
```bash
# Backend
cd backend && pip install -r requirements.txt && python manage.py runserver

# Frontend
cd frontend-vite && npm install && npm run dev

# Desktop
cd frontend-vite && npm run electron:dev
```

**Environment Configuration:**
- `backend/.env` — Django settings via `python-decouple`
- `frontend-vite/.env.example` — Vite env vars template
- `ELECTRON_DB_PATH` env var overrides SQLite path for Electron packaging
- Production settings in `settings_production.py` (DEBUG=False, HSTS, secure cookies, structured logging, WhiteNoise)

**Dual Database:**
- Dev: SQLite (`db.sqlite3`)
- Electron: SQLite at `userData/db.sqlite3`
- Cloud: PostgreSQL (via RENDER_DATABASE_URL when available)
- **Database router is commented out** in settings.py — dual DB not actively wired

---

## 12. Known Gaps, Risks & Recommendations

### 🔴 Security Risks

| Risk | Location | Severity |
|---|---|---|
| **Hardcoded PIN** for password reset | `apps/authentication/views.py:627` — `pin != "131106"` | **CRITICAL** — Any user who inspects network traffic or source can reset any account's password. Replace with email-based OTP. |
| **License secret exposed** | `main.cjs:13` — `KEYGEN_ACCOUNT_ID` and `PRODUCT_ID` hardcoded | **MEDIUM** — Makes revocation/key management inflexible; should use env vars. |
| **Hardcoded Django SECRET_KEY fallback** | `main.cjs:1052` — fallback `'django-insecure-prod-key-for-electron-app-2024'` | **CRITICAL** — JWT tokens signed with this key are forgeable. Must be generated per-install. |
| **`backend/.env` tracked in git** | Root `.gitignore` lists `.env` but `backend/.env` exists in the repo | **HIGH** — Credential leak risk. |

### 🟡 Code Quality / Tech Debt

| Issue | Details |
|---|---|
| **Monolithic Sales model** | 944-line `models.py` with legacy single-item and modern multi-item paths interleaved — high bug surface. |
| **Duplicate code in sale flows** | Inventory deduction logic repeated in `Sale.save()`, `SaleItem.save()`, `ProductReturnItem.save()` — violates DRY. |
| **Commented-out database router** | `# DATABASE_ROUTERS = ['apps.core.db_router.DualDatabaseRouter']` — dual DB feature exists but is disconnected. |
| **French mixed with English** | Error messages, UI text, and code comments mix French/English inconsistently. |
| **No CI/CD** | No automated test running, linting, or build pipelines — increases regression risk. |
| **No Docker** | Not containerized — makes reproducible deployments harder. |
| **Test coverage is thin** | Only phones and sales apps have tests; no frontend tests beyond `App.test.jsx`. |
| **Multiple `add_part` actions** | Duplicate `@action` methods in `RepairTicketViewSet` (lines 681, 711) — dead code. |

### 🟢 Recommendations

1. **Replace hardcoded PIN** with email-based OTP or TOTP
2. **Generate SECRET_KEY per-install** in Electron main process (or derive from machine ID + salt)
3. **Add `backend/.env` to `.gitignore`** and remove from git history
4. **Set up CI/CD** (at minimum GitHub Actions for pytest + lint + build)
5. **Extract inventory deduction** into a shared service/transaction helper
6. **Add Docker** for consistent development environments
7. **Increase test coverage** — especially for Sale, Return, and Repair flows
8. **Implement proper dual-database sync** if cloud feature is intended for production use — current signal-based sync is fragile for offline-first
9. **Remove duplicated `add_part` actions** from RepairTicketViewSet
10. **Add proper error boundary + retry** for Electron backend spawn failures
