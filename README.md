# 🇵🇱 Polska Auto Leads Engine — v3.0.0

**FINALNY, kompletny, w pełni automatyczny produkt SaaS** — system pozyskiwania klientów dla całej Polski.  
AUTO-SYSTEM + AUTO-SKALOWANIE + AUTO-DEPLOY + AUTO-SECURITY + AUTO-ANALYTICS + AUTO-BIZNES + AUTO-MOBILE + PWA + Developer Platform.  
**Bez logowania użytkowników. Gotowy do wdrożenia.**

---

## 🚀 Szybki start (lokalnie)

### Wymagania
- Python 3.9+
- Node.js 18+

### Uruchomienie jedną komendą

```bash
bash start_all.sh
```

| Usługa | URL |
|--------|-----|
| 📊 Panel web | http://localhost:3000 |
| 🔌 Backend API | http://localhost:8000 |
| 📖 API Docs (Swagger) | http://localhost:8000/docs |
| 📖 API Docs (ReDoc) | http://localhost:8000/redoc |
| ❤️ Health check | http://localhost:8000/health |
| 📈 Metryki | http://localhost:8000/metrics |

---

## 🌐 Deploy — Railway (backend)

1. Utwórz nowy projekt na [Railway](https://railway.app)
2. Podłącz to repo (folder `backend/`)
3. Railway auto-wykryje `Procfile` i uruchomi backend
4. Ustaw zmienne środowiskowe:
   ```
   DATABASE_URL=postgresql://...   # Railway Postgres plugin
   CORS_ORIGINS=https://twoj-frontend.vercel.app
   PORT=8000
   ```
5. Skopiuj URL backendu (np. `https://api.railway.app`)

---

## 🌐 Deploy — Vercel (frontend)

1. Utwórz nowy projekt na [Vercel](https://vercel.com)
2. Podłącz to repo, ustaw **Root Directory = `frontend`**
3. Ustaw zmienne środowiskowe w Vercel:
   ```
   VITE_API_URL=https://twoj-backend.railway.app
   ```
4. Build command: `npm run build` | Output: `dist`
5. Vercel automatycznie doda SPA rewriting (vercel.json już skonfigurowany)

---

## 📱 Wersja mobilna + PWA

Aplikacja jest w pełni **mobile-first** i działa jako **Progressive Web App (PWA)**:
- Responsywny layout z hamburger menu na mobile
- Instalowalna na telefonie (Add to Home Screen)
- Service worker — działa offline (app shell) + background sync
- `manifest.json` z ikonami i splash screen
- Meta tagi dla iOS i Android
- Auto-update PWA bez pytania użytkownika

Aby zainstalować na telefonie:
1. Otwórz aplikację w przeglądarce mobilnej
2. Kliknij "Dodaj do ekranu głównego"

---

## 📊 Widoki aplikacji

| Widok | Ścieżka | Opis |
|-------|---------|------|
| Dashboard | `/` | Statystyki, wykresy wg województwa/branży/źródła |
| Mapa Województw | `/mapa` | Status skanowania 16 województw |
| Klienci | `/klienci` | Lista z filtrami |
| Szczegóły klienta | `/klienci/:id` | Profil firmy + zlecenia |
| Zlecenia | `/zlecenia` | Lista zleceń z wartościami |
| Szczegóły zlecenia | `/zlecenia/:id` | Szczegóły + historia |
| AUTO-LEADS | `/auto-leads` | Uruchomienie pipeline pozyskiwania |
| AUTO-STATUS | `/auto-status` | Live monitoring systemu + metryki |
| AUTO-KONTAKT | `/auto-kontakt` | Generator wiadomości do klientów |
| AUTO-SECURITY | `/auto-security` | Bezpieczeństwo: IP blocking, audit trail, backup |
| AUTO-ANALYTICS | `/auto-analytics` | Revenue, growth, churn, heatmaps |
| AUTO-BIZNES | `/auto-biznes` | Pricing AI, billing, marketplace, usage |
| DEV PLATFORM | `/auto-dev` | API analytics, limits, key rotation, sandbox |
| Marketplace | `/marketplace` | Lead marketplace — top 20 leadów |
| Agencja | `/agencja` | Panel dla agencji |
| Landing | `/landing` | Landing page + cennik + CTA |
| AUTO-ROZWÓJ | `/auto-rozwoj` | Roadmap AI, feature suggestions, priority AI |

---

## 🏗️ Architektura

```
polska-auto-leads-engine/
├── backend/                    # FastAPI backend (Railway)
│   ├── main.py                 # App + middleware + health + metrics + version
│   ├── config.py               # ENV-based config
│   ├── database.py             # SQLAlchemy (SQLite / Postgres)
│   ├── requirements.txt
│   ├── start.sh
│   └── app/
│       ├── models/models.py    # All DB models
│       ├── routers/
│       │   ├── clients.py      # /clients
│       │   ├── orders.py       # /orders
│       │   ├── voivodeships.py # /voivodeships
│       │   ├── industries.py   # /industries
│       │   ├── pipeline.py     # /pipeline (auto-resume, retries)
│       │   ├── stats.py        # /stats
│       │   ├── analytics.py    # /analytics (revenue, growth, churn, heatmap)
│       │   ├── biznes.py       # /biznes (pricing AI, billing, marketplace)
│       │   ├── security.py     # /security (IP blocking, audit trail, backup)
│       │   ├── devplatform.py  # /dev (API analytics, limits, key rotation)
│       │   └── system.py       # /system (self-healing, load forecast, optimizer)
│       ├── pipeline/pipeline.py # Auto-pipeline (concurrent sources, dedup)
│       ├── sources/            # Data sources (katalog, mapa, rejestr, social, ogloszenia)
│       └── data/geography.py   # 16 voivodeships + cities + order templates
├── frontend/                   # React + Vite + Tailwind (Vercel)
│   ├── src/
│   │   ├── App.jsx             # Router + Sidebar + mobile menu
│   │   ├── api/api.js          # Axios (AUTO-CONNECT via VITE_API_URL)
│   │   ├── main.jsx            # PWA install prompt + SW registration
│   │   └── pages/             # 17 pages
│   └── public/
│       ├── manifest.json       # PWA manifest
│       └── sw.js               # Service worker (offline + background sync)
├── .github/workflows/ci.yml    # CI/CD: lint + build + deploy check
├── start_all.sh                # Auto-start script (backend + frontend)
├── Procfile                    # Railway entry point
├── railway.json                # Railway config
├── API.md                      # Full API documentation
└── README.md                   # This file
```

---

## 🧩 AUTO-SYSTEM — moduły

### 🔄 AUTO-SELF-HEALING
- Pipeline auto-restartuje się przy błędach (3 próby)
- `/system/self-healing` — status naprawiania
- `/system/fix-pipeline-stall` — naprawia zawieszone pipeline'y
- `/system/fix-slow-queries` — optymalizuje bazę danych

### 📈 AUTO-PREDICTIVE
- `/system/forecast` — predykcja problemów
- `/system/load-forecast` — prognoza obciążenia
- `/analytics/growth` — trend wzrostu

### ⚡ AUTO-HOT-CACHE
- In-process TTL cache (30s) dla statystyk i metryk
- Redukcja zapytań DB przy wysokim ruchu

### 🛡️ AUTO-SECURITY
- IP blocklist (in-memory + REST API)
- Rate limiting: 100 req/min per IP
- Audit trail w DB (każdy request)
- Threat detection (automatyczne)
- Backup on-demand

### 📊 AUTO-ANALYTICS
- Revenue tracking (wg miesiąca)
- Growth tracking (klienci + zlecenia)
- Churn tracking (aktywni vs utraceni)
- Usage heatmap (wg województwa)
- SaaS dashboard — wszystko w jednym

### 💰 AUTO-BIZNES
- Pricing AI — ceny dynamiczne wg popytu
- Billing — faktury + abonament
- Lead Marketplace — top 20 leadów
- Agency Dashboard — panel dla agencji
- Usage tracking — requesty API

### 🧩 AUTO-DEV PLATFORM
- API analytics w czasie rzeczywistym
- Dynamiczne limity wg planu
- Sandbox environment
- API key rotation
- Dokumentacja auto-generowana (/docs, /redoc)

### 🧠 AUTO-ROZWÓJ
- Roadmap generowana automatycznie
- Feature suggestions
- Priority AI — priorytety wg wartości biznesowej

---

## 📋 Zmienne środowiskowe

### Backend (Railway)
| Zmienna | Opis | Domyślnie |
|---------|------|-----------|
| `DATABASE_URL` | PostgreSQL URL | `sqlite:///./polska_leads.db` |
| `CORS_ORIGINS` | Frontend URL (Vercel) | `http://localhost:3000` |
| `PORT` | Port backendu | `8000` |

### Frontend (Vercel)
| Zmienna | Opis | Domyślnie |
|---------|------|-----------|
| `VITE_API_URL` | Backend URL (Railway) | `http://localhost:8000` |

---

## 🔌 Kluczowe endpointy

```
GET  /health              → {"status":"ok","version":"3.0.0"}
GET  /metrics             → metryki pipeline
GET  /stats               → statystyki klientów/zleceń
GET  /analytics/saas-dashboard → pełny SaaS dashboard
GET  /biznes/pricing      → dynamiczne ceny
GET  /security/status     → status bezpieczeństwa
GET  /dev/analytics       → statystyki API
GET  /system/self-healing → status auto-naprawiania
POST /pipeline/run        → uruchom pipeline
```

---

## 🔧 Komendy startowe

```bash
# Lokalnie (wszystko)
bash start_all.sh

# Tylko backend
cd backend && pip install -r requirements.txt && python main.py

# Tylko frontend
cd frontend && npm install && npm run dev

# Build frontendu (produkcja)
cd frontend && npm run build

# Testy importów backendu
cd backend && python -c "import main; print('OK')"
```

---

*Polska Auto Leads Engine v3.0.0 — Finalny produkt premium AUTO-SYSTEM*
