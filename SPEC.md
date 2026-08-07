# SPEC.md — Polska Auto Leads Engine v3.0.0

**Specyfikacja techniczna** finalnego produktu SaaS.

---

## 1. Przegląd systemu

| Parametr | Wartość |
|----------|---------|
| Wersja | 3.0.0 |
| Architektura | Backend FastAPI + Frontend React/Vite |
| Baza danych | SQLite (dev) / PostgreSQL (prod) |
| Deploy backend | Railway |
| Deploy frontend | Vercel |
| Typ aplikacji | SaaS + PWA + Mobile-first |
| Autentykacja | Brak (brak logowania) |
| Regiony | Jeden region (Railway EU) |

---

## 2. Backend — FastAPI

### Modele DB (SQLAlchemy)
- **Industry** — branże (name, description, service_type)
- **Location** — lokalizacje (voivodeship, county, city)
- **VoivodeshipStatus** — status skanowania 16 województw
- **Client** — klienci (project_id, company_name, industry, location, email, phone, website, source_type, status)
- **Order** — zlecenia (project_id, client_id, title, description, value, status)
- **OrderHistory** — historia zleceń (note, status_change)
- **AcquisitionLog** — logi pipeline (voivodeship, industries, source_type, found, accepted, rejected)
- **AuditLog** — audit trail (action, ip, user_agent, endpoint, ts)

### Routery
| Router | Prefix | Opis |
|--------|--------|------|
| clients | `/clients` | CRUD klientów |
| orders | `/orders` | CRUD zleceń + historia |
| voivodeships | `/voivodeships` | Status województw |
| industries | `/industries` | Lista branż |
| pipeline | `/pipeline` | Uruchamianie + status + logi |
| stats | `/stats` | Statystyki ogólne |
| analytics | `/analytics` | Revenue, growth, churn, heatmap |
| biznes | `/biznes` | Pricing AI, billing, marketplace |
| security | `/security` | IP blocking, audit trail, backup |
| devplatform | `/dev` | API analytics, limits, key rotation |
| system | `/system` | Self-healing, load forecast, optimizer |

### Middleware (main.py)
1. **CORS** — allow_origins="*" (prod: CORS_ORIGINS z env)
2. **SecurityMiddleware** — IP block check + rate limiting (100 req/min/IP) + audit logging

### Auto-cache (hot cache)
- In-process TTL cache (`_cache` dict) — 30s TTL
- Używany przy /stats, /metrics dla redukcji zapytań DB

### Pipeline (auto-pipeline)
- 5 źródeł danych uruchamianych równolegle (ThreadPoolExecutor)
- Deduplication (company_name + voivodeship + industry)
- Walidacja (email regex, phone regex)
- Auto-resume po błędach (3 próby + sleep 2s)
- Zapis klientów + zleceń + logów do DB

### Źródła danych
| Źródło | source_type | Firm/branżę |
|--------|-------------|-------------|
| Katalog Firm Polska | katalog | 8 |
| Lokalne Wyszukiwarki | mapa | 7 |
| CEIDG/KRS | rejestr | 6 |
| Social Media | social | 4 |
| Ogłoszenia | ogloszenia | 5 |
| **RAZEM** | | **~30/branżę** |

---

## 3. Frontend — React + Vite + Tailwind

### Strony
| Strona | Ścieżka | Komponent |
|--------|---------|-----------|
| Dashboard | `/` | Dashboard.jsx |
| Mapa Województw | `/mapa` | VoivodeshipMap.jsx |
| Klienci | `/klienci` | Clients.jsx |
| Szczegóły klienta | `/klienci/:id` | ClientDetail.jsx |
| Zlecenia | `/zlecenia` | Orders.jsx |
| Szczegóły zlecenia | `/zlecenia/:id` | OrderDetail.jsx |
| AUTO-LEADS | `/auto-leads` | AutoLeads.jsx |
| AUTO-STATUS | `/auto-status` | AutoStatus.jsx |
| AUTO-KONTAKT | `/auto-kontakt` | AutoContact.jsx |
| AUTO-SECURITY | `/auto-security` | AutoSecurity.jsx |
| AUTO-ANALYTICS | `/auto-analytics` | AutoAnalytics.jsx |
| AUTO-BIZNES | `/auto-biznes` | AutoBiznes.jsx |
| DEV PLATFORM | `/auto-dev` | AutoDevPlatform.jsx |
| Marketplace | `/marketplace` | AutoMarketplace.jsx |
| Agencja | `/agencja` | AutoAgency.jsx |
| Landing | `/landing` | AutoLanding.jsx |
| AUTO-ROZWÓJ | `/auto-rozwoj` | AutoRozwoj.jsx |

### PWA
- `manifest.json` — name, icons, display:standalone, theme_color
- `sw.js` — install, activate, fetch (stale-while-revalidate), background sync, push notifications
- `main.jsx` — PWA install prompt (beforeinstallprompt), SW registration, auto-update

---

## 4. AUTO-SYSTEM — specyfikacja modułów

### AUTO-SELF-HEALING
- Pipeline retries: 3 próby z exponential backoff
- `/system/fix-pipeline-stall` — reset zawieszonych pipeline'ów
- `/system/fix-slow-queries` — ANALYZE na tabelach DB
- Error tracking in-memory

### AUTO-PREDICTIVE-PIPELINE
- `/system/forecast` — confidence_pct + next_issue prediction
- `/system/load-forecast` — clients/orders per hour + scaling recommendation

### AUTO-RESOURCE-OPTIMIZER
- `/system/resource-optimizer` — cache_hit_rate, slow_queries_fixed, recommendations

### AUTO-HOT-CACHE
- `cache_get/cache_set` w main.py — 30s TTL
- Endpoints: /stats, /metrics używają cache

### AUTO-COLD-STORAGE
- `/analytics/heatmap` — archiwalne dane wg województwa

### AUTO-SECURITY
- BLOCKED_IPS dict (in-memory + REST)
- RATE_LIMIT_STORE — 100 req/min per IP (sliding window)
- THREAT_LOG — ostatnie 50 zagrożeń
- AuditLog — każdy request zapisywany do DB
- `/security/backup` — snapshot counts z DB

### AUTO-DEV-PLATFORM
- API_KEYS store (in-memory) z rotacją przez UUID
- API_REQUEST_LOG — czas odpowiedzi + endpoint
- Dynamiczne limity wg tier
- Sandbox endpoint

### AUTO-BIZNES
- Pricing AI — demand_factor wg total_clients (wyższy gdy >1000)
- Billing mock — faktury + abonament
- Lead Marketplace — top 20 wg wartości
- Agency Dashboard — podział wg project_id

### AUTO-ANALYTICS
- Revenue — suma Order.value
- Growth — klienci/zlecenia wg miesiąca (func.strftime)
- Churn — klienci 'odrzucony' jako churn
- Heatmap — wg województwa: klienci, zlecenia, przychody

### AUTO-ROADMAP
- Hardcoded 6 roadmap items z priorytetami AI
- 5 feature suggestions z confidence score

---

## 5. CI/CD — GitHub Actions

```yaml
# .github/workflows/ci.yml
jobs:
  backend-test  # lint + import check Python
  frontend-build  # npm build + PWA artifacts verify
  docker-build  # Procfile verify + deploy echo
```

---

## 6. Zmienne środowiskowe

### Railway (backend)
```
DATABASE_URL=******host:5432/db
CORS_ORIGINS=https://twoj-frontend.vercel.app
PORT=8000
```

### Vercel (frontend)
```
VITE_API_URL=https://twoj-backend.railway.app
```

---

## 7. Komendy startowe

```bash
bash start_all.sh          # wszystko lokalnie
python main.py             # backend tylko
npm run dev                # frontend tylko (dev)
npm run build              # frontend build (prod)
```

---

*SPEC.md — Polska Auto Leads Engine v3.0.0 — Final AUTO-SYSTEM Product*
