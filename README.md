# 🇵🇱 Polska Auto Leads Engine

**Finalny, kompletny, w pełni automatyczny produkt SaaS** — system pozyskiwania klientów dla całej Polski.  
Wersja mobilna + PWA + Developer Platform + Auto-skalowanie + Auto-wdrażanie. Bez logowania użytkowników.

---

## 🚀 Szybki start (lokalnie)

### Wymagania
- Python 3.9+
- Node.js 18+

### Uruchomienie jedną komendą

```bash
bash start_all.sh
```

- **Panel web:** http://localhost:3000
- **Backend API:** http://localhost:8000
- **Docs (Swagger):** http://localhost:8000/docs
- **Health check:** http://localhost:8000/health
- **Metryki:** http://localhost:8000/metrics

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
- Service worker — działa offline (app shell)
- `manifest.json` z ikonami i splash screen
- Meta tagi dla iOS i Android

Aby zainstalować na telefonie:
1. Otwórz aplikację w przeglądarce mobilnej
2. Kliknij "Dodaj do ekranu głównego" (iOS: Safari → Share → Add to Home Screen)

---

## 📊 Widoki aplikacji

| Widok | Ścieżka | Opis |
|-------|---------|------|
| Dashboard | `/` | Statystyki, wykresy wg województwa/branży/źródła |
| Mapa Województw | `/mapa` | Status skanowania 16 województw |
| Klienci | `/klienci` | Lista z filtrami (województwo, branża, źródło, status) |
| Szczegóły klienta | `/klienci/:id` | Profil firmy + zmiana statusu + zlecenia |
| Zlecenia | `/zlecenia` | Lista zleceń z filtrami i wartościami |
| Szczegóły zlecenia | `/zlecenia/:id` | Szczegóły + historia działań + notatki |
| AUTO-LEADS | `/auto-leads` | Uruchomienie pipeline pozyskiwania |
| AUTO-STATUS | `/auto-status` | Live monitoring systemu + metryki |
| AUTO-KONTAKT | `/auto-kontakt` | Generator wiadomości do klientów |

---

## 🏗️ Architektura

```
polska-auto-leads-engine/
├── backend/                    # FastAPI backend (Railway)
│   ├── main.py                 # App + /health + /metrics + /version
│   ├── config.py               # ENV-based config (Railway/local)
│   ├── database.py             # SQLAlchemy (SQLite / Postgres)
│   ├── requirements.txt
│   ├── start.sh
│   ├── .env.example
│   └── app/
│       ├── models/models.py    # Models + project_id (developer platform)
│       ├── routers/            # clients, orders, voivodeships, industries, pipeline, stats
│       ├── sources/            # 5 źródeł danych (katalog, mapa, rejestr, social, ogłoszenia)
│       ├── pipeline/           # Auto-pipeline + deduplikacja + auto-resume (3 retries)
│       └── data/geography.py   # 16 województw, branże, szablony zleceń
├── frontend/                   # React + Vite + Tailwind (Vercel)
│   ├── public/
│   │   ├── manifest.json       # PWA manifest
│   │   ├── sw.js               # Service Worker
│   │   └── icons/              # PWA icons (192px, 512px)
│   ├── src/
│   │   ├── App.jsx             # Mobile-first layout + hamburger menu
│   │   ├── api/api.js          # AUTO-CONNECT (VITE_API_URL)
│   │   └── pages/             # Dashboard, Mapa, Klienci, Zlecenia, AutoLeads, AutoStatus, AutoContact
│   ├── vercel.json
│   ├── .env.example
│   └── start.sh
├── .github/workflows/ci.yml    # GitHub Actions CI/CD
├── Procfile                    # Railway deploy
├── railway.json                # Railway config
├── API.md                      # Developer API documentation
├── SPEC.md                     # Specyfikacja produktu
└── start_all.sh                # Uruchomienie całości
```

---

## 🔌 API Endpoints

| Metoda | Endpoint | Opis |
|--------|----------|------|
| GET | `/` | Info o API |
| GET | `/health` | Health check |
| GET | `/version` | Wersja |
| GET | `/metrics` | Metryki pipeline |
| GET | `/stats` | Statystyki dashboard |
| GET | `/clients` | Lista klientów (filtry) |
| GET | `/clients/{id}` | Szczegóły klienta |
| PATCH | `/clients/{id}/status` | Zmiana statusu |
| GET | `/orders` | Lista zleceń (filtry) |
| GET | `/orders/{id}` | Szczegóły zlecenia |
| PATCH | `/orders/{id}/status` | Zmiana statusu |
| POST | `/orders/{id}/history` | Dodaj notatkę |
| GET | `/voivodeships` | Lista województw |
| PATCH | `/voivodeships/{name}/priority` | Priorytet |
| GET | `/industries` | Lista branż |
| POST | `/industries` | Nowa branża |
| POST | `/pipeline/run` | Uruchom pipeline |
| GET | `/pipeline/status/{voivodeship}` | Status pipeline |
| GET | `/pipeline/status` | Wszystkie statusy |
| GET | `/pipeline/logs` | Logi pozyskiwania |

Pełna dokumentacja: **[API.md](./API.md)** lub **/docs** (Swagger).

---

## ⚙️ Zmienne środowiskowe

### Backend (Railway)
| Zmienna | Domyślnie | Opis |
|---------|-----------|------|
| `PORT` | `8000` | Port serwera |
| `DATABASE_URL` | `sqlite:///./polska_leads.db` | URL bazy danych |
| `CORS_ORIGINS` | `http://localhost:3000` | Dozwolone originy frontendu |

### Frontend (Vercel)
| Zmienna | Domyślnie | Opis |
|---------|-----------|------|
| `VITE_API_URL` | `http://localhost:8000` | URL backendu |

---

## 🛠️ Komendy startowe

```bash
# Wszystko naraz
bash start_all.sh

# Backend osobno
cd backend && bash start.sh

# Frontend osobno
cd frontend && bash start.sh

# Produkcja (backend)
cd backend && pip install -r requirements.txt && python main.py

# Produkcja (frontend build)
cd frontend && npm install && npm run build
```

---

## 🏭 Developer Platform

Projekt jest zbudowany jako fundament developer platform:
- Każdy zasób (klient, zlecenie) ma pole `project_id` do izolacji danych per projekt
- API jest bezstanowe i nie wymaga logowania
- W przyszłości: API Key per `project_id`, webhooks, rate limiting
- Pełna dokumentacja: **[API.md](./API.md)**

---

## 🗺️ Województwa

dolnośląskie · kujawsko-pomorskie · lubelskie · lubuskie · łódzkie · małopolskie · mazowieckie · opolskie · podkarpackie · podlaskie · pomorskie · śląskie · świętokrzyskie · warmińsko-mazurskie · wielkopolskie · zachodniopomorskie

## 🏭 Branże (domyślne)

fryzjer · mechanik · restauracja · budowlanka · kosmetyczka · transport · sklep lokalny · nieruchomości · medyczna · edukacja · IT · usługi mobilne

