# 🇵🇱 Polska Auto Leads Engine — v3.1.0

Finalny, lokalnie skalowany produkt SaaS/PWA do automatycznego pozyskiwania leadów, pracy operacyjnej i developer access — **bez logowania użytkowników**, z izolacją danych przez `projectId` (`X-Project-Id`).

## Co jest gotowe
- FastAPI backend z modułami: pipeline, analytics, biznes, security, dev platform, system ops
- React/Vite frontend mobile-first + PWA + offline shell + install flow + background sync
- AUTO-SYSTEM: self-healing, load forecast, resource optimizer, thresholds, logs, pipeline queue
- AUTO-DEV PLATFORM: project scope, analytics API, limity, rotacja kluczy, sandbox, API docs
- AUTO-RUN / AUTO-OPS: `start_all.sh`, `scripts/healthcheck.sh`, `scripts/auto_maintain.sh`
- AUTO-CONFIG: `config/backend.env.example`, `config/frontend.env.example`
- Deploy readiness: Railway (backend) + Vercel (frontend)

## Architektura
- **Backend:** `/backend` — FastAPI + SQLAlchemy, SQLite dev / PostgreSQL prod
- **Frontend:** `/frontend` — React + Vite + Tailwind + Recharts
- **Config:** `/config` — przykładowe env dla deploy
- **Scripts:** `/scripts` — healthcheck i maintenance
- **Deploy:** `Procfile`, `railway.json`, `frontend/vercel.json`, `.github/workflows/ci.yml`

## Finalne endpointy backendu
### System / Ops
- `GET /`
- `GET /health`
- `GET /version`
- `GET /metrics`
- `GET /api-config`
- `GET /system/self-healing`
- `GET /system/status`
- `GET /system/thresholds`
- `GET /system/logs`
- `GET /system/load-forecast`
- `GET /system/resource-optimizer`
- `GET /system/forecast`
- `GET /system/ops-dashboard`
- `POST /system/fix-pipeline-stall`
- `POST /system/fix-slow-queries`

### CRM / Pipeline
- `GET /clients`
- `GET /clients/{id}`
- `PATCH /clients/{id}/status`
- `GET /orders`
- `GET /orders/{id}`
- `PATCH /orders/{id}/status`
- `POST /orders/{id}/history`
- `GET /voivodeships`
- `PATCH /voivodeships/{name}/priority`
- `GET /industries`
- `POST /industries`
- `POST /pipeline/run`
- `GET /pipeline/status/{voivodeship}`
- `GET /pipeline/status`
- `GET /pipeline/queue`
- `GET /pipeline/logs`
- `GET /stats`

### Analytics / Biznes
- `GET /analytics/revenue`
- `GET /analytics/growth`
- `GET /analytics/churn`
- `GET /analytics/heatmap`
- `GET /analytics/saas-dashboard`
- `GET /biznes/pricing`
- `GET /biznes/billing`
- `GET /biznes/marketplace`
- `GET /biznes/agency-dashboard`
- `GET /biznes/subscriptions`
- `GET /biznes/usage`

### Security / Dev Platform
- `GET /security/status`
- `POST /security/block-ip`
- `GET /security/blocked-ips`
- `DELETE /security/blocked-ips/{ip}`
- `GET /security/audit-trail`
- `GET /security/threats`
- `POST /security/backup`
- `GET /security/recovery`
- `GET /dev/analytics`
- `GET /dev/limits`
- `GET /dev/sandbox`
- `POST /dev/keys/rotate`
- `GET /dev/keys`
- `GET /dev/docs-url`
- `GET /dev/project`

## Finalne widoki frontendu
- `/` — Dashboard
- `/mapa` — mapa województw
- `/klienci`
- `/klienci/:id`
- `/zlecenia`
- `/zlecenia/:id`
- `/auto-leads`
- `/auto-status`
- `/auto-kontakt`
- `/auto-security`
- `/auto-analytics`
- `/auto-biznes`
- `/auto-dev`
- `/marketplace`
- `/agencja`
- `/landing`
- `/auto-rozwoj`

## Finalne komendy startowe
```bash
bash start_all.sh

cd backend && pip install -r requirements.txt && python main.py
cd frontend && npm install && npm run dev
cd frontend && npm run build

bash scripts/healthcheck.sh
bash scripts/auto_maintain.sh
```

## projectId / brak logowania
- Domyślny projekt: `default`
- Izolacja danych działa przez nagłówek `X-Project-Id`
- Frontend zapisuje aktualny `projectId` w `localStorage`
- Większość endpointów backendu respektuje aktualny zakres projektu

## PWA / mobile
- `manifest.json` z shortcutami
- `sw.js` z offline shell, request queue i background sync
- przycisk instalacji aplikacji
- automatyczne odświeżenie po aktualizacji service workera
- mobile bottom nav + responsive shell + safe-area/touch optimizations

## Zmienne środowiskowe do deploy
### Railway + backend
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

### Vercel + frontend
```env
VITE_API_URL=https://twoj-backend.railway.app
```

## Szybki deploy
- **Backend / Railway:** root `backend`, start `python main.py`, health `/health`
- **Frontend / Vercel:** root `frontend`, build `npm run build`, output `dist`

## Dokumentacja
- `SPEC.md` — techniczna specyfikacja produktu
- `API.md` — opis endpointów i project scope
- `/docs` i `/redoc` — interaktywne OpenAPI
