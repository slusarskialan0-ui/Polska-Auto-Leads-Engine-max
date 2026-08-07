# SPEC.md — Polska Auto Leads Engine v3.1.0

## 1. Produkt
- Typ: single-region SaaS + PWA + mobile-first + developer platform
- Stack: FastAPI + SQLAlchemy + React/Vite + Tailwind
- Auth: brak logowania użytkowników
- Multi-project scope: `projectId` przez header `X-Project-Id`
- Deploy: Railway (backend), Vercel (frontend)

## 2. Backend
### Modele
- `Industry`
- `Location`
- `VoivodeshipStatus`
- `Client` (`project_id`)
- `Order` (`project_id`)
- `OrderHistory`
- `AcquisitionLog` (`project_id`)
- `AuditLog`

### Routery
- `/clients`
- `/orders`
- `/voivodeships`
- `/industries`
- `/pipeline`
- `/stats`
- `/analytics`
- `/biznes`
- `/security`
- `/dev`
- `/system`

### AUTO-SYSTEM runtime
- cache TTL z invalidacją per `project_id`
- runtime snapshot: env, uptime, cache entries, thresholds
- system event log in-memory
- self-healing metrics
- slow-query optimizer (`ANALYZE`, `VACUUM` dla SQLite)
- load forecast, resource optimizer, ops dashboard

### Pipeline
- źródła uruchamiane równolegle
- dedup po `company_name + voivodeship + industry`
- walidacja email/phone
- retry do 3 prób
- queue/status per `project_id + voivodeship`
- logi akwizycji per projekt

## 3. Frontend
### Widoki
- Dashboard `/`
- Mapa `/mapa`
- Klienci `/klienci`
- Szczegóły klienta `/klienci/:id`
- Zlecenia `/zlecenia`
- Szczegóły zlecenia `/zlecenia/:id`
- AUTO-LEADS `/auto-leads`
- AUTO-STATUS `/auto-status`
- AUTO-KONTAKT `/auto-kontakt`
- AUTO-SECURITY `/auto-security`
- AUTO-ANALYTICS `/auto-analytics`
- AUTO-BIZNES `/auto-biznes`
- DEV PLATFORM `/auto-dev`
- Marketplace `/marketplace`
- Agencja `/agencja`
- Landing `/landing`
- AUTO-ROZWÓJ `/auto-rozwoj`

### AUTO-APP / PWA
- install prompt
- service worker
- offline shell (`offline.html`)
- background sync request queue
- push notifications support
- manifest shortcuts
- dynamic `theme-color`
- error boundary
- mobile bottom nav + touch optimizations

## 4. AUTO-DEV PLATFORM
- project scope bez logowania
- analytics requestów per projekt
- limity wyliczane z usage
- rotacja kluczy per projekt
- sandbox metadata
- docs URL + API markdown

## 5. AUTO-SECURITY
- IP blocklist
- rate limiting per IP
- audit trail do DB
- threat log
- backup snapshot metadata
- recovery plan endpoint

## 6. AUTO-OPS / AUTO-RUN
- `start_all.sh`
- `scripts/healthcheck.sh`
- `scripts/auto_maintain.sh`
- `config/backend.env.example`
- `config/frontend.env.example`

## 7. Finalne komendy
```bash
bash start_all.sh
cd backend && pip install -r requirements.txt && python main.py
cd frontend && npm install && npm run dev
cd frontend && npm run build
bash scripts/healthcheck.sh
bash scripts/auto_maintain.sh
```

## 8. Finalne env do deploy
### Railway
```env
APP_ENV=production
DATABASE_URL=postgresql://...
CORS_ORIGINS=https://twoj-frontend.vercel.app
PORT=8000
DEFAULT_PROJECT_ID=default
CACHE_TTL_SECONDS=30
PIPELINE_WORKER_CAPACITY=3
THRESHOLD_PIPELINE_STALL_SECONDS=900
THRESHOLD_SLOW_QUERY_MS=750
THRESHOLD_RATE_LIMIT_PER_MIN=100
THRESHOLD_CACHE_TARGET_PCT=80
```

### Vercel
```env
VITE_API_URL=https://twoj-backend.railway.app
```
