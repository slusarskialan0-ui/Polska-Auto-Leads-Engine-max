# 📖 API.md — Dokumentacja API dla Developerów

**Polska Auto Leads Engine** udostępnia REST API dla developerów.  
Baza: `http://localhost:8000` (lokalnie) lub Twój URL na Railway.  
Pełna dokumentacja interaktywna: `/docs` (Swagger UI).

---

## 🔑 Autentykacja

Obecna wersja nie wymaga logowania ani API key.  
Developer platform foundation: każdy zasób może przyjmować opcjonalny `project_id` (string) do logicznego grupowania danych per projekt.

---

## 📡 System

| Metoda | Endpoint | Opis |
|--------|----------|------|
| GET | `/` | Info o API |
| GET | `/health` | Health check — `{"status":"ok","version":"2.0.0"}` |
| GET | `/version` | Wersja API |
| GET | `/metrics` | Metryki pipeline (skuteczność, liczniki) |
| GET | `/api-config` | Auto-detect URL API (używane przez frontend) |

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
