# Tally → PostgreSQL Sync Architecture
## Full Understanding Document (No Code — Design Only)

---

## 1. The Two-Company Reality (Most Critical Point)

### What You Have
```
Tally Prime (running on AntraCloud VM, Port 9000)
  ├── Company A: "Wallnut Chemicals 25-26"   → FY 2024-25 data (historical)
  └── Company B: "Wallnut Chemicals 26-27"   → FY 2025-26 data (current/active)
```

### The KEY Tally Behaviour You Must Understand
Tally Prime's XML API accepts a `<SVCURRENTCOMPANY>` tag in every request.
**This means you can target EITHER company in the same request — without any UI switching.**

```
Request with <SVCURRENTCOMPANY>Company A Name</SVCURRENTCOMPANY>
  → Tally responds with Company A data

Request with <SVCURRENTCOMPANY>Company B Name</SVCURRENTCOMPANY>
  → Tally responds with Company B data
```

> ⚠️ CRITICAL: BOTH companies must be loaded/open in Tally Prime simultaneously.
> If only one is open, the other company's requests will fail.
> This is a human dependency — someone must keep both companies loaded.

### What This Means for Your Sync Service
- Your Node.js sync service does NOT need any "company switching" logic
- Just loop over a companies config array and send each request with its company name
- One Tally port (9000) serves both companies
- Sequential requests only (1 vCPU — never parallel)

---

## 2. VM Resource Reality Check

```
Hardware:          1 vCPU (AMD EPYC 2.8 GHz) | 4 GB RAM | C: 9.12 GB free
Processes running: TallyPrime + PostgreSQL + Node.js sync service
```

### Memory Budget Estimate
```
TallyPrime (with 2 companies loaded):  ~600-900 MB RAM
PostgreSQL (shared_buffers default):   ~128 MB + connections
Node.js sync service:                  ~80-150 MB
Windows Server OS baseline:            ~1.0-1.5 GB
                                       ─────────────────
Total estimate:                        ~2.0-2.8 GB used of 4 GB
Remaining headroom:                    ~1.2-2.0 GB
```

### Optimization Rules (Non-Negotiable)
1. **No parallel sync jobs** — sequential only
2. **Small XML response chunks** — process and discard, don't hold full XML in memory
3. **sync every 10 min, not 5** — 10 min is safe on this hardware
4. **Masters sync: once per day** — Ledgers/Stock items don't change every 5 min
5. **Vouchers only: every 10 min incremental** — Only fetch since last sync date
6. **No in-memory caching layer** — PostgreSQL IS your cache
7. **PM2 with max memory restart** — set `max_memory_restart: 200MB`

---

## 3. What Data To Fetch From Tally (Priority Order)

### 🔴 TIER 1 — Sync Every 10 Minutes (Incremental)
These change frequently and drive the dashboard.

| Data | Tally Report | XML Collection | Why Frequent |
|---|---|---|---|
| Sales Vouchers | Day Book | `VOUCHER` (type=Sales) | New invoices created daily |
| Credit Notes | Day Book | `VOUCHER` (type=Credit Note) | Returns happen anytime |
| Receipt Vouchers | Day Book | `VOUCHER` (type=Receipt) | Payments received |

**Incremental strategy**: Store `last_synced_date` per company. Each sync fetches from `last_synced_date` to today only.

---

### 🟡 TIER 2 — Sync Once Per Day (Full Refresh)
These change rarely but need to be accurate.

| Data | Tally Report | XML Collection | Notes |
|---|---|---|---|
| Ledger Masters | List of Accounts | `LEDGER` | New dealers added occasionally |
| Stock Item Masters | Stock Summary | `STOCKITEM` | Products rarely added |
| Outstanding Receivables | Outstanding Receivables | `LEDGER` with balance | Calculated field — changes daily |
| Closing Stock / Inventory | Stock Summary | `STOCKITEM` | Closing balances |

**Strategy**: Run at midnight (off-peak). Full replace for masters (UPSERT by name).

---

### 🟢 TIER 3 — Sync Once (Historical Backfill, Run Once)
Company A (25-26) is historical — it won't change anymore.

| Data | What to do |
|---|---|
| All Sales Vouchers FY 24-25 | One-time full fetch, store with `company_id = 1` |
| All Ledgers FY 24-25 | One-time fetch |
| All Stock Items FY 24-25 | One-time fetch |

**Strategy**: Run once on initial setup. Mark `company.is_historical = true` to skip future syncs.

---

### 🔵 TIER 4 — NOT fetchable from Tally XML API (Skip)
These were mentioned in requirements but Tally XML doesn't cleanly expose them:

| Data | Reality |
|---|---|
| Visit Records | Not stored in Tally at all |
| Complaint Records | Not stored in Tally at all |
| GST Returns Filed | Tally has GST reports but format is complex |
| Purchase Invoices | Fetchable but you don't seem to need it currently |
| Payment Vouchers | Fetchable but lower priority |

---

## 4. PostgreSQL Schema (Conceptual — Normalized)

### Core Tables

```
companies
  id, name, tally_company_name, fiscal_year_from, fiscal_year_to,
  is_historical, is_active, created_at

sync_logs
  id, company_id, data_type, status, records_fetched,
  records_inserted, records_updated, error_message,
  started_at, completed_at
  → This is your "last sync" tracker per company per data type

ledgers (Dealer / Customer / Supplier Master)
  id, company_id, name, parent_group, opening_balance,
  closing_balance, state, gst_no, address, synced_at
  UNIQUE(company_id, name)

stock_items (Product Master)
  id, company_id, name, parent_group, base_unit,
  opening_qty, closing_qty, closing_value, synced_at
  UNIQUE(company_id, name)

vouchers (Sales + Credit Notes + Receipts)
  id, company_id, vch_no, date, vch_type,
  party_name, party_ledger_id (FK),
  narration, total_amount, synced_at
  UNIQUE(company_id, vch_no)
  INDEX on (company_id, date)
  INDEX on (company_id, party_name)

voucher_line_items (Each product in a voucher)
  id, voucher_id (FK), stock_item_id (FK),
  item_name, quantity, unit, rate, amount,
  sales_officer, area_city, state

outstanding
  id, company_id, ledger_id (FK), party_name,
  total_outstanding, total_billed, invoice_count,
  oldest_due_date, synced_at
  UNIQUE(company_id, party_name)
```

---

## 5. Sync Service — Optimal Flow Design

### Sync Cycle Logic (Every 10 Minutes)

```
SYNC CYCLE START
│
├── 1. Check Tally is alive (ping port 9000)
│       → If dead: log error, skip cycle, try next cycle
│
├── 2. Load companies from DB where is_active = true
│       → Company A (historical): SKIP if already fully synced
│       → Company B (current): PROCESS
│
├── 3. For each active company (SEQUENTIAL, never parallel):
│   │
│   ├── 3a. Fetch VOUCHERS (incremental)
│   │       → Read last_synced_date from sync_logs for (company, 'vouchers')
│   │       → Build XML: fromDate = last_synced_date, toDate = today
│   │       → POST to Tally, parse XML
│   │       → UPSERT into vouchers table (ON CONFLICT vch_no DO UPDATE)
│   │       → Update sync_logs with new timestamp + count
│   │       → Free XML from memory immediately
│   │
│   └── 3b. (if daily window: midnight ±30min)
│           → Fetch LEDGER MASTERS → UPSERT ledgers
│           → Fetch STOCK ITEMS   → UPSERT stock_items
│           → Fetch OUTSTANDING   → REPLACE outstanding (full refresh)
│           → Update sync_logs
│
└── SYNC CYCLE END → sleep 10 min → repeat
```

---

## 6. The Incremental Sync Mechanism (Key Design Decision)

### The Problem
Tally has no "changed since timestamp" or webhook. You can only ask:
> "Give me all vouchers from Date A to Date B"

### The Solution
```
last_sync = read from sync_logs table → e.g. "2026-07-20"
fromDate  = last_sync (include same day to catch late entries)
toDate    = today

→ Fetch vouchers in that window
→ UPSERT by vch_no (ON CONFLICT DO UPDATE)
→ If record exists: update amount/narration (in case Tally was edited)
→ If record is new: insert fresh
→ Store today as new last_sync in sync_logs
```

> ⚠️ Why include `fromDate = last_sync` (same day, not +1)?
> Because invoices can be entered in Tally with backdated dates.
> A voucher entered TODAY with date YESTERDAY would be missed if you skip yesterday.
> Safe approach: always go back 2-3 days in the from-date window.

---

## 7. The `company_id` Column — Why It's Everything

Since you have TWO companies feeding one PostgreSQL DB:

```
Every table MUST have company_id (FK → companies.id)

Query examples:
  "Show sales for FY 25-26 only"
  → WHERE company_id = 2 AND date BETWEEN '2025-04-01' AND '2026-03-31'

  "Compare dealer outstanding across both years"
  → JOIN companies ON company_id GROUP BY company_id, party_name

  "All-time revenue for Dealer X"
  → WHERE party_name = 'X' (across both company_ids)
```

---

## 8. Architecture Summary (The Full Picture)

```
┌─────────────────────────── AntraCloud VM ────────────────────────────────┐
│                                                                           │
│  TallyPrime (Port 9000)                                                   │
│   ├── Company A: "Wallnut 25-26" (historical, loaded)                     │
│   └── Company B: "Wallnut 26-27" (current, loaded)                       │
│                 │                                                         │
│                 │ XML API (HTTP POST, localhost:9000)                     │
│                 ▼                                                         │
│  Node.js Sync Service (PM2, ~100MB RAM)                                  │
│   ├── node-cron: every 10 min                                            │
│   ├── Reads sync_logs → decides what to fetch                           │
│   ├── Fetches Company A (historical, once)                               │
│   ├── Fetches Company B (live, incremental)                              │
│   ├── Parses XML → clean JS objects                                      │
│   └── UPSERTs into PostgreSQL                                            │
│                 │                                                         │
│                 │ pg driver (localhost:5432)                              │
│                 ▼                                                         │
│  PostgreSQL 16 (Port 5432)                                                │
│   ├── companies, sync_logs                                               │
│   ├── ledgers, stock_items                                               │
│   └── vouchers, voucher_line_items, outstanding                         │
│                 │                                                         │
└─────────────────│─────────────────────────────────────────────────────────┘
                  │ TCP Port 5432 (Firewall: AWS IP only)
                  ▼
┌──────────── AWS EC2 / Backend ──────────────────────────────────────────┐
│  Express.js API Server                                                    │
│   ├── /api/sales         → queries vouchers table                       │
│   ├── /api/outstanding   → queries outstanding table                    │
│   ├── /api/dealers       → queries ledgers table                        │
│   └── /api/inventory     → queries stock_items table                    │
└──────────────────────────────────────────────────────────────────────────┘
                  │ REST API (HTTPS)
                  ▼
┌──────────── Vercel (React Dashboard) ───────────────────────────────────┐
│  Never touches PostgreSQL directly                                        │
│  Reads only from AWS Express APIs                                        │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## 9. Risk & Edge Cases to Handle

| Risk | Mitigation |
|---|---|
| Tally goes offline mid-sync | Check ping before sync; on error: log + skip cycle, don't mark sync_logs as success |
| Both companies not loaded in Tally | Detect via 404/empty response on company-specific request; alert in logs |
| Tally returns malformed XML | try/catch in parser; log raw XML snippet for debugging |
| Duplicate voucher numbers | UNIQUE(company_id, vch_no) + ON CONFLICT DO UPDATE |
| VM runs out of RAM | PM2 max_memory_restart=200MB; process XML in chunks, null out after parse |
| Disk fills up (C: only 9GB free) | PostgreSQL data on D: drive; logs rotated daily; no XML stored to disk |
| Historical data changes in Company A | UPSERT handles it; or lock Company A after initial backfill |
| Narration format varies | Parser must handle both structured (Item: X \| Qty: N) and plain formats |

---

## 10. What Does NOT Need to Change in Your Existing Code

Your existing `tallyFetchService.js` already has:
- ✅ `tallyRequest()` — works fine, just needs `companyName` as parameter
- ✅ `parseXml()` — works fine
- ✅ `parseLiveSalesFromTally()` — handles both narration formats
- ✅ `safeGet()`, `num()`, `ensureArray()` — perfect utilities

What needs to be BUILT NEW:
- PostgreSQL connection + schema migration
- Multi-company config (companies array in DB)
- `syncVouchers(company)` function with UPSERT logic
- `sync_logs` read/write logic
- `node-cron` scheduler
- Health ping before sync
- PM2 ecosystem config with memory limit

