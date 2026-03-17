# 🗳️ Nepal Federal Parliament Election 2082 — Results Platform

A real-time election results dashboard for Nepal's **2082 Federal Parliament (House of Representatives)** elections, tracking FPTP and Proportional Representation outcomes across 165 direct constituencies and 7 provinces.

**Live site:** [https://election.bhusallaxman.com.np](https://election.bhusallaxman.com.np)

---

## ✨ Features

- **Live results** — Automatically syncs from the official Nepal Election Commission (EC) API every 2 minutes
- **Party standings** — Real-time party seat tallies (won / leading / total) for both FPTP and PR seats
- **Constituency detail** — Per-constituency candidate rankings with votes, margin, and contest status
- **Province breakdown** — Province-wise party performance across all 7 provinces
- **Proportional representation** — PR seat allocation by party and province, with 2074/2079 comparisons
- **Interactive Nepal map** — Click on a province or district to drill down into local results
- **Candidate profiles** — Photos, party affiliation, vote share, and contest status for every candidate
- **Full-text search** — Find any candidate, party, district, or constituency instantly
- **Analytics dashboard** — Vote distribution charts, seat history, and trend analysis
- **Real-time updates** — Server-Sent Events (SSE) push new data to connected browsers without a page refresh
- **Visitor counter** — Global live visitor tracking
- **SEO optimised** — Dynamic `sitemap.xml`, `robots.txt`, and OpenGraph metadata

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Framework | [Next.js 15](https://nextjs.org) (App Router) with React 19 |
| Language | TypeScript 5 |
| Styling | Tailwind CSS 4 + Ant Design 6 |
| Charts | Recharts 3 |
| Maps | React Leaflet 5 / Leaflet 1.9 |
| Database | MariaDB / MySQL (`mysql2`) with connection pooling |
| Cache | Redis (IORedis 5) |
| Runtime | Node.js 20 (Alpine) |
| Container | Docker + Docker Compose |

---

## 📋 Prerequisites

- **Node.js 20+**
- **MariaDB / MySQL** instance
- **Redis** instance

---

## ⚙️ Environment Variables

Create a `.env.local` file in the project root:

```env
# ── Database ──────────────────────────────────────────────
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASS=yourpassword
DB_NAME=election_2082

# ── Redis ─────────────────────────────────────────────────
REDIS_HOST=127.0.0.1
REDIS_PORT=6379

# ── Public / Client-side ──────────────────────────────────
NEXT_PUBLIC_API_URL=http://localhost:3000
NEXT_PUBLIC_SITE_URL=https://election.bhusallaxman.com.np
NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION=   # optional

# ── Sync ──────────────────────────────────────────────────
SYNC_SECRET=election2082          # secret for POST /api/sync
ENABLE_EXTERNAL_SYNC=true         # set false to disable EC polling
SYNC_INTERVAL=120000              # ms between EC syncs (default 2 min)
```

---

## 🚀 Getting Started

### Development

```bash
# 1. Install dependencies
npm install

# 2. Set up environment variables (see above)
cp .env.example .env.local   # then edit with your values

# 3. Start the development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Production build

```bash
npm run build
npm start
```

### Import final results

After elections are finalised, import the official results directly from the EC:

```bash
npm run import:final-results
```

### Linting

```bash
npm run lint
```

---

## 🐳 Docker

A multi-stage Dockerfile and Compose file are included for containerised deployments.

```bash
# Build and start (exposed on port 3939)
docker compose up --build
```

The Compose file configures the Next.js application container. Point `DB_HOST` and `REDIS_HOST` to your external MariaDB and Redis instances (or extend the Compose file to add them as services).

---

## 📁 Project Structure

```
election-2082/
├── src/
│   ├── app/                      # Next.js App Router
│   │   ├── page.tsx              # Home — election summary
│   │   ├── results/              # All constituency results
│   │   ├── parties/              # Party comparison table
│   │   ├── provinces/            # Province list + [id] detail page
│   │   ├── candidate/[id]/       # Individual candidate profile
│   │   ├── analytics/            # Analytics dashboard
│   │   └── api/                  # API route handlers (see below)
│   ├── components/
│   │   ├── atoms/                # Avatar, Badge, VoteBar, StatNumber, …
│   │   ├── molecules/            # SearchBar, FilterDropdowns, CandidateRow, …
│   │   └── organisms/            # ElectionSummary, NepalMap, PartyTable, …
│   ├── context/
│   │   └── ElectionDataContext.tsx  # Global state + polling logic
│   ├── data/                     # Static fallback data (parties, candidates, provinces)
│   ├── lib/                      # Business logic
│   │   ├── db.ts                 # MariaDB connection pool
│   │   ├── redis.ts              # Redis client
│   │   ├── ec-api.ts             # Nepal EC API client (session/CSRF handling)
│   │   ├── sync.ts               # Background sync orchestration
│   │   ├── seat-results.ts       # FPTP results loader
│   │   ├── seat-repair.ts        # Data-consistency corrections
│   │   ├── party-seats.ts        # Seat calculation helpers
│   │   ├── results-mode.ts       # Feature flags (live vs. final)
│   │   ├── migrate.ts            # DB schema initialisation
│   │   └── boot.ts               # Startup tasks
│   └── instrumentation.ts        # Next.js instrumentation (background sync)
├── public/                       # Static assets
├── scripts/
│   └── import-final-results.mjs  # CLI: import final EC results
├── Dockerfile
├── compose.yml
├── next.config.ts
├── tailwind.config.mjs
└── tsconfig.json
```

---

## 🔌 API Reference

All routes are under `/api/`.

| Endpoint | Method | Description |
|---|---|---|
| `/api/election` | GET | Party results summary (wins + leads + seats) |
| `/api/candidates` | GET | Popular constituencies with live candidate data |
| `/api/results` | GET | Province-wise party win/lead breakdown |
| `/api/all-results` | GET | Complete FPTP seat results |
| `/api/parties` | GET | All parties with metadata |
| `/api/provinces` | GET | Province list |
| `/api/districts` | GET | District list |
| `/api/constituency` | GET | Single constituency results (`?id=`) |
| `/api/candidate/[id]` | GET | Individual candidate profile |
| `/api/candidate-image/[id]` | GET | Candidate photo proxy / redirect |
| `/api/search` | GET | Full-text search (`?q=`) |
| `/api/pr-results` | GET | PR seat results by party and province |
| `/api/analytics` | GET | Analytics data for charts |
| `/api/visitors` | GET | Live visitor count |
| `/api/sse` | GET | Server-Sent Events stream for real-time updates |
| `/api/sync` | POST | Trigger manual EC sync (requires `x-sync-secret` header) |

---

## 🗂️ Data Sources

| Source | Details |
|---|---|
| **Nepal Election Commission** | `https://result.election.gov.np` — live FPTP and PR results fetched via secure JSON endpoints with CSRF/session handling and automatic retry |
| **MariaDB** | Persistent store for synced results; used as fallback when EC is unreachable |
| **Redis** | Cache layer (300 s TTL, 1800 s stale-while-revalidate) to reduce DB and EC load |
| **Static data files** | `src/data/` — fallback party/candidate/province data for offline or pre-election display |

### EC API data paths

```
JSONFiles/Election2082/HOR/FPTP/HOR-{districtId}-{constNumber}.json
JSONFiles/Election2082/Local/Lookup/states.json
JSONFiles/Election2082/Local/Lookup/districts.json
JSONFiles/Election2082/HOR/Lookup/constituencies.json
JSONFiles/Election2082/Common/HoRPartyTop5.txt
JSONFiles/Election2082/Common/PRHoRPartyTop5.txt
```

---

## 🚩 Feature Flags

Controlled in `src/lib/results-mode.ts`:

| Flag | Effect |
|---|---|
| `FINAL_RESULTS_MODE = true` | Disables live polling, SSE, and background sync; switches HTTP cache to `"default"` |
| `ENABLE_BACKGROUND_SYNC` | Toggle background EC sync (auto-disabled in final-results mode) |
| `ENABLE_CLIENT_POLLING` | Toggle client-side 120 s polling (auto-disabled in final-results mode) |
| `ENABLE_SSE_UPDATES` | Toggle SSE push updates (auto-disabled in final-results mode) |

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Commit your changes: `git commit -m "feat: add your feature"`
4. Push to the branch: `git push origin feature/your-feature`
5. Open a Pull Request

Please follow the existing code style and run `npm run lint` before submitting.

---

## 📄 License

This project is open-source. See the [LICENSE](LICENSE) file for details (if present).
