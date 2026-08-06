# 🇵🇱 Polska Auto Leads Engine

Kompletny, w pełni automatyczny system pozyskiwania klientów dla całej Polski, działający województwo po województwie.

---

## 🚀 Szybki start

### Wymagania
- Python 3.9+ (z pip)
- Node.js 18+ (z npm)

---

### ▶ Uruchomienie jedną komendą (backend + frontend)

```bash
bash start_all.sh
```

Po uruchomieniu system jest od razu gotowy do użycia:
- **Panel web:** http://localhost:3000
- **Backend API:** http://localhost:8000
- **Dokumentacja API (Swagger):** http://localhost:8000/docs

---

### ▶ Uruchomienie backendu (osobno)

```bash
cd backend
bash start.sh
```

Lub ręcznie:
```bash
cd backend
pip install -r requirements.txt
python main.py
```

Backend uruchamia się na **http://localhost:8000**.  
Przy pierwszym starcie automatycznie tworzy bazę danych SQLite i wypełnia ją domyślnymi danymi (16 województw, 12 branż).

---

### ▶ Uruchomienie frontendu (osobno)

```bash
cd frontend
bash start.sh
```

Lub ręcznie:
```bash
cd frontend
npm install
npm run dev
```

Panel web uruchamia się na **http://localhost:3000**.  
Frontend automatycznie łączy się z backendem na localhost:8000 (AUTO-CONNECT).

---

## 📋 Jak używać systemu

1. **Otwórz panel web** → http://localhost:3000
2. **Przejdź do AUTO-LEADS** (zakładka w menu)
3. **Wybierz województwo** z listy 16 województw
4. **Wybierz branże** (lub zostaw wszystkie zaznaczone)
5. **Kliknij "Uruchom pozyskiwanie"**
6. System automatycznie:
   - Uruchamia 5 modułów źródeł danych równolegle
   - Zbiera dane firm z katalogu, map, rejestrów, social media i ogłoszeń
   - Usuwa duplikaty i waliduje dane kontaktowe
   - Tworzy profile klientów w bazie danych
   - Generuje zlecenia dla każdego klienta

7. **Przeglądaj wyniki** w zakładkach:
   - 📊 **Dashboard** — statystyki ogólne
   - 🗺️ **Mapa Województw** — status skanowania każdego województwa
   - 👥 **Klienci** — lista klientów z filtrami
   - 📋 **Zlecenia** — lista zleceń z filtrami

---

## 🏗️ Architektura systemu

```
polska-auto-leads-engine/
├── backend/                    # FastAPI backend
│   ├── main.py                 # Aplikacja FastAPI + auto-init DB
│   ├── config.py               # Konfiguracja (port, DB URL)
│   ├── database.py             # SQLAlchemy engine + sesje
│   ├── requirements.txt        # Zależności Python
│   ├── start.sh                # Skrypt startowy backendu
│   └── app/
│       ├── models/models.py    # Modele danych (SQLAlchemy)
│       ├── routers/            # Endpointy API
│       │   ├── clients.py      # /clients
│       │   ├── orders.py       # /orders
│       │   ├── voivodeships.py # /voivodeships
│       │   ├── industries.py   # /industries
│       │   ├── pipeline.py     # /pipeline
│       │   └── stats.py        # /stats
│       ├── sources/            # Moduły źródeł danych
│       │   ├── base.py         # Klasa bazowa + walidacja
│       │   └── sources.py      # 5 źródeł (katalog, mapa, rejestr, social, ogłoszenia)
│       ├── pipeline/           # Auto-pipeline pozyskiwania
│       │   └── pipeline.py     # Orchestracja źródeł + deduplikacja + zapis do DB
│       └── data/
│           └── geography.py    # 16 województw, miasta, branże, szablony zleceń
├── frontend/                   # React frontend (Vite + Tailwind)
│   ├── src/
│   │   ├── App.jsx             # Routing + nawigacja
│   │   ├── api/api.js          # Axios client (AUTO-CONNECT)
│   │   └── pages/             # Widoki
│   │       ├── Dashboard.jsx
│   │       ├── VoivodeshipMap.jsx
│   │       ├── Clients.jsx
│   │       ├── ClientDetail.jsx
│   │       ├── Orders.jsx
│   │       ├── OrderDetail.jsx
│   │       ├── AutoLeads.jsx
│   │       └── AutoContact.jsx
│   ├── package.json
│   ├── vite.config.js
│   └── start.sh
└── start_all.sh                # Uruchomienie całości jedną komendą
```

---

## 🌐 API Endpoints

| Metoda | Endpoint | Opis |
|--------|----------|------|
| GET | `/` | Info o API |
| GET | `/health` | Health check |
| GET | `/stats` | Statystyki dashboard |
| GET | `/clients` | Lista klientów (filtry: voivodeship, industry, source_type, status) |
| GET | `/clients/{id}` | Szczegóły klienta |
| PATCH | `/clients/{id}/status` | Zmiana statusu klienta |
| GET | `/orders` | Lista zleceń (filtry) |
| GET | `/orders/{id}` | Szczegóły zlecenia |
| PATCH | `/orders/{id}/status` | Zmiana statusu zlecenia |
| POST | `/orders/{id}/history` | Dodanie notatki do zlecenia |
| GET | `/voivodeships` | Lista województw + statusy |
| PATCH | `/voivodeships/{name}/priority` | Ustawienie priorytetu województwa |
| GET | `/industries` | Lista branż |
| POST | `/industries` | Dodanie nowej branży |
| POST | `/pipeline/run` | Uruchomienie pipeline dla województwa+branż |
| GET | `/pipeline/status/{voivodeship}` | Status pipeline |
| GET | `/pipeline/logs` | Logi pozyskiwania |

Pełna dokumentacja interaktywna: **http://localhost:8000/docs**

---

## ⚙️ Konfiguracja

Plik `backend/config.py`:
```python
API_HOST = "0.0.0.0"
API_PORT = 8000                          # Port backendu
DATABASE_URL = "sqlite:///./polska_leads.db"  # Baza danych
```

Zmiana adresu API dla frontendu (opcjonalnie):
```bash
# frontend/.env
VITE_API_URL=http://localhost:8000
```

---

## 🌍 Uruchomienie w GitHub Codespaces / Replit

1. Otwórz terminal
2. Uruchom backend: `cd backend && pip install -r requirements.txt && python main.py`
3. W nowym terminalu: `cd frontend && npm install && npm run dev`
4. W Codespaces: kliknij "Open in Browser" dla portu 3000

---

## 📊 Dane testowe

System generuje realistyczne dane firm polskich per województwo + branża przy każdym uruchomieniu pipeline. Dane są generowane deterministycznie (ten sam seed = te same firmy), więc przy ponownym uruchomieniu pipeline nie tworzą się duplikaty (deduplikacja po nazwie + województwo + branża).

---

## 🗺️ Województwa

System obsługuje wszystkie 16 województw Polski:
dolnośląskie, kujawsko-pomorskie, lubelskie, lubuskie, łódzkie, małopolskie, mazowieckie, opolskie, podkarpackie, podlaskie, pomorskie, śląskie, świętokrzyskie, warmińsko-mazurskie, wielkopolskie, zachodniopomorskie

## 🏭 Branże

System obsługuje 12 domyślnych branż (możliwe dodawanie nowych przez API):
fryzjer, mechanik, restauracja, budowlanka, kosmetyczka, transport, sklep lokalny, nieruchomości, medyczna, edukacja, IT, usługi mobilne
