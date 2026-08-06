# 📖 API.md — Dokumentacja API dla Developerów

**Polska Auto Leads Engine** udostępnia REST API dla developerów.  
Wersja: **3.0.0** | Baza: `http://localhost:8000` (lokalnie) lub Twój URL na Railway.  
Pełna dokumentacja interaktywna: `/docs` (Swagger UI) | ReDoc: `/redoc`

---

## 🔑 Autentykacja

Obecna wersja nie wymaga logowania ani API key.  
Developer platform foundation: każdy zasób może przyjmować opcjonalny `project_id` (string) do logicznego grupowania danych per projekt.  
API Key rotation dostępna przez `/dev/keys/rotate`.

---

## 📡 System

| Metoda | Endpoint | Opis |
|--------|----------|------|
| GET | `/` | Info o API |
| GET | `/health` | Health check — `{"status":"ok","version":"3.0.0"}` |
| GET | `/version` | Wersja API |
| GET | `/metrics` | Metryki pipeline (skuteczność, liczniki) |
| GET | `/api-config` | Auto-detect URL API (używane przez frontend) |
| GET | `/system/self-healing` | Status auto-naprawiania błędów |
| GET | `/system/load-forecast` | Prognoza obciążenia systemu |
| GET | `/system/resource-optimizer` | Optymalizacja CPU/RAM + zalecenia |
| GET | `/system/forecast` | Predykcja problemów pipeline |
| POST | `/system/fix-pipeline-stall` | Napraw zatrzymane pipeline'y |
| POST | `/system/fix-slow-queries` | Optymalizuj zapytania bazy danych |

---

## 👥 Klienci — `/clients`

| Metoda | Endpoint | Parametry | Opis |
|--------|----------|-----------|------|
| GET | `/clients` | `voivodeship`, `industry`, `source_type`, `status`, `skip`, `limit` | Lista klientów z filtrami i paginacją |
| GET | `/clients/{id}` | — | Szczegóły klienta + lista jego zleceń |
| PATCH | `/clients/{id}/status` | `status` (query) | Zmiana statusu: `nowy`, `zweryfikowany`, `odrzucony` |

### Przykład odpowiedzi GET /clients
```json
{
  "total": 1234,
  "items": [
    {
      "id": 1,
      "project_id": "default",
      "company_name": "Firma XYZ sp. z o.o.",
      "industry": "mechanik",
      "voivodeship": "mazowieckie",
      "county": "powiat warszawa",
      "city": "Warszawa",
      "email": "kontakt@firma.pl",
      "phone": "+48 123 456 789",
      "website": "https://www.firma.pl",
      "source_type": "katalog",
      "source_detail": "Katalog Firm Polska",
      "acquired_at": "2024-01-15T10:30:00",
      "status": "nowy"
    }
  ]
}
```

---

## 📋 Zlecenia — `/orders`

| Metoda | Endpoint | Parametry | Opis |
|--------|----------|-----------|------|
| GET | `/orders` | `voivodeship`, `industry`, `status`, `min_value`, `max_value`, `skip`, `limit` | Lista zleceń z filtrami |
| GET | `/orders/{id}` | — | Szczegóły zlecenia + historia |
| PATCH | `/orders/{id}/status` | `status` (query) | Zmiana statusu: `nowe`, `do_kontaktu`, `w_trakcie`, `zakonczone` |
| POST | `/orders/{id}/history` | `{"note": "...", "status_change": "..."}` | Dodanie notatki/wpisu historii |

---

## 🗺️ Województwa — `/voivodeships`

| Metoda | Endpoint | Opis |
|--------|----------|------|
| GET | `/voivodeships` | Lista 16 województw z statusami skanowania |
| PATCH | `/voivodeships/{name}/priority` | Ustawienie priorytetu skanowania |

---

## 🏭 Branże — `/industries`

| Metoda | Endpoint | Opis |
|--------|----------|------|
| GET | `/industries` | Lista branż |
| POST | `/industries` | Dodanie nowej branży `{"name":"...","description":"..."}` |

---

## 🚀 Pipeline — `/pipeline`

| Metoda | Endpoint | Parametry | Opis |
|--------|----------|-----------|------|
| POST | `/pipeline/run` | `{"voivodeship":"mazowieckie","industries":["mechanik","fryzjer"],"project_id":"default"}` | Uruchomienie pipeline pozyskiwania w tle |
| GET | `/pipeline/status/{voivodeship}` | — | Status bieżącego pipeline dla województwa |
| GET | `/pipeline/status` | — | Status wszystkich województw |
| GET | `/pipeline/logs` | `voivodeship`, `limit` | Logi pozyskiwania |

### Przykład uruchomienia pipeline
```bash
curl -X POST http://localhost:8000/pipeline/run \
  -H "Content-Type: application/json" \
  -d '{"voivodeship":"mazowieckie","industries":["mechanik","fryzjer"]}'
```

### Przykład odpowiedzi po zakończeniu
```json
{
  "status": "done",
  "result": {
    "voivodeship": "mazowieckie",
    "industries": ["mechanik", "fryzjer"],
    "total_found": 150,
    "accepted": 142,
    "rejected": 8,
    "sources": [
      {"source_type": "katalog", "found": 48},
      {"source_type": "mapa", "found": 42},
      {"source_type": "rejestr", "found": 36},
      {"source_type": "social", "found": 24},
      {"source_type": "ogloszenia", "found": 30}
    ]
  }
}
```

---

## 📊 Statystyki — `/stats`

| Metoda | Endpoint | Opis |
|--------|----------|------|
| GET | `/stats` | Statystyki ogólne: klienci wg województwa, branży, źródła |

---

## 🔧 Przykłady integracji

### Python
```python
import requests

BASE = "http://localhost:8000"

# Uruchom pipeline
resp = requests.post(f"{BASE}/pipeline/run", json={
    "voivodeship": "mazowieckie",
    "industries": ["mechanik", "fryzjer"]
})
print(resp.json())

# Pobierz klientów
clients = requests.get(f"{BASE}/clients", params={
    "voivodeship": "mazowieckie",
    "industry": "mechanik",
    "limit": 100
}).json()
print(clients["total"], "klientów")
```

### JavaScript / Node.js
```js
const BASE = 'http://localhost:8000';

// Pobierz statystyki
const stats = await fetch(`${BASE}/stats`).then(r => r.json());
console.log(stats.total_clients, 'klientów');
```

---

## 📌 Kody błędów

| Kod | Znaczenie |
|-----|-----------|
| 200 | OK |
| 400 | Błędne parametry (np. nieznane województwo) |
| 404 | Zasób nie znaleziony |
| 422 | Błąd walidacji danych wejściowych |
| 500 | Błąd serwera |

---

## 🏗️ Roadmap — Developer Platform

- [ ] API Key per `project_id` (bez logowania użytkowników)
- [ ] Webhooks po zakończeniu pipeline
- [ ] Export CSV/XLSX klientów
- [ ] Rate limiting per project_id
- [ ] OpenAPI client SDK generator

---

## 👥 Klienci — `/clients`

| Metoda | Endpoint | Parametry | Opis |
|--------|----------|-----------|------|
| GET | `/clients` | `voivodeship`, `industry`, `source_type`, `status`, `skip`, `limit` | Lista klientów z filtrami i paginacją |
| GET | `/clients/{id}` | — | Szczegóły klienta + lista jego zleceń |
| PATCH | `/clients/{id}/status` | `status` | Zmiana statusu: `nowy`, `zweryfikowany`, `odrzucony` |

---

## 📋 Zlecenia — `/orders`

| Metoda | Endpoint | Parametry | Opis |
|--------|----------|-----------|------|
| GET | `/orders` | `client_id`, `status`, `skip`, `limit` | Lista zleceń z filtrami |
| GET | `/orders/{id}` | — | Szczegóły zlecenia + historia |
| PATCH | `/orders/{id}/status` | `status` | Zmiana statusu: `nowe`, `do_kontaktu`, `w_trakcie`, `zakonczone` |
| POST | `/orders/{id}/notes` | `note` (body) | Dodanie notatki do historii |

---

## 🗺️ Województwa — `/voivodeships`

| Metoda | Endpoint | Opis |
|--------|----------|------|
| GET | `/voivodeships` | Lista 16 województw ze statusami |
| PATCH | `/voivodeships/{name}/status` | Zmiana statusu województwa |

---

## 🏭 Branże — `/industries`

| Metoda | Endpoint | Opis |
|--------|----------|------|
| GET | `/industries` | Lista branż obsługiwanych przez pipeline |

---

## 🚀 Pipeline — `/pipeline`

| Metoda | Endpoint | Opis |
|--------|----------|------|
| POST | `/pipeline/run` | Uruchom pipeline dla województwa i branż |
| GET | `/pipeline/status/{voivodeship}` | Status pipeline dla województwa |
| GET | `/pipeline/status` | Status wszystkich pipeline'ów |
| GET | `/pipeline/logs` | Historia logów (parametry: `voivodeship`, `limit`) |

### Body POST /pipeline/run
```json
{
  "voivodeship": "mazowieckie",
  "industries": ["mechanik", "lakiernik"],
  "project_id": "my-project"
}
```

---

## 📊 Statystyki — `/stats`

| Metoda | Endpoint | Opis |
|--------|----------|------|
| GET | `/stats` | Statystyki: total clients/orders, podział wg województwa/branży/źródła |

---

## 📈 Analytics — `/analytics`

| Metoda | Endpoint | Opis |
|--------|----------|------|
| GET | `/analytics/revenue` | Przychody: total, wg miesiąca, avg |
| GET | `/analytics/growth` | Wzrost klientów i zleceń wg miesiąca |
| GET | `/analytics/churn` | Wskaźnik churn, klienci aktywni vs utraceni |
| GET | `/analytics/heatmap` | Mapa ciepła wg województwa (klienci, zlecenia, przychody) |
| GET | `/analytics/saas-dashboard` | Pełny dashboard SaaS — wszystkie metryki w jednym |

---

## 💰 Biznes — `/biznes`

| Metoda | Endpoint | Opis |
|--------|----------|------|
| GET | `/biznes/pricing` | Dynamiczne ceny wg poziomu popytu |
| GET | `/biznes/billing` | Faktury + abonament |
| GET | `/biznes/marketplace` | Marketplace top leadów |
| GET | `/biznes/agency-dashboard` | Panel dla agencji |
| GET | `/biznes/subscriptions` | Plany subskrypcji i aktywny plan |
| GET | `/biznes/usage` | Użycie API i limitów |

---

## 🛡️ Security — `/security`

| Metoda | Endpoint | Opis |
|--------|----------|------|
| GET | `/security/status` | Status systemu bezpieczeństwa |
| POST | `/security/block-ip` | Zablokuj IP (body: `{ip, reason}`) |
| GET | `/security/blocked-ips` | Lista zablokowanych IP |
| DELETE | `/security/blocked-ips/{ip}` | Odblokuj IP |
| GET | `/security/audit-trail` | Historia działań (param: `limit`) |
| GET | `/security/threats` | Ostatnie wykryte zagrożenia |
| POST | `/security/backup` | Uruchom backup bazy danych |

---

## 🧩 Developer Platform — `/dev`

| Metoda | Endpoint | Opis |
|--------|----------|------|
| GET | `/dev/analytics` | Statystyki API (requesty, response time) |
| GET | `/dev/limits` | Limity API dla aktywnego planu |
| GET | `/dev/sandbox` | Info o środowisku testowym |
| POST | `/dev/keys/rotate` | Rotacja klucza API |
| GET | `/dev/keys` | Lista aktywnych kluczy API |
| GET | `/dev/docs-url` | Linki do dokumentacji |

---

## 🔧 Zmienne środowiskowe — Railway (backend)

```env
DATABASE_URL=******host:5432/db  # Railway Postgres
CORS_ORIGINS=https://twoj-frontend.vercel.app
PORT=8000
```

## 🔧 Zmienne środowiskowe — Vercel (frontend)

```env
VITE_API_URL=https://twoj-backend.railway.app
```

---

## 🚀 Szybki start lokalnie

```bash
bash start_all.sh
# Backend: http://localhost:8000
# Frontend: http://localhost:3000
# Docs: http://localhost:8000/docs
```

