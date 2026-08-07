# API.md — Polska Auto Leads Engine v3.1.0

## project scope
Brak logowania użytkowników. Izolacja danych działa przez:
- nagłówek `X-Project-Id`
- opcjonalne `project_id` w body/query dla wybranych endpointów
- domyślną wartość `default`

## System
| Metoda | Endpoint | Opis |
|---|---|---|
| GET | `/health` | healthcheck + env + DB state |
| GET | `/version` | wersja API |
| GET | `/metrics` | metryki pipeline dla projektu |
| GET | `/api-config` | auto-config dla frontendu |
| GET | `/system/status` | runtime snapshot |
| GET | `/system/thresholds` | aktualne progi auto-systemu |
| GET | `/system/logs` | logi zdarzeń systemowych |
| GET | `/system/load-forecast` | obciążenie i rekomendacja skali |
| GET | `/system/resource-optimizer` | status optymalizacji |
| GET | `/system/forecast` | predykcja ryzyk pipeline |
| GET | `/system/ops-dashboard` | zbiorczy widok ops |
| POST | `/system/fix-pipeline-stall` | reset zaciętych statusów |
| POST | `/system/fix-slow-queries` | optymalizacja DB |

## Pipeline / CRM
| Metoda | Endpoint | Opis |
|---|---|---|
| GET | `/clients` | lista klientów dla projektu |
| GET | `/clients/{id}` | szczegóły klienta |
| PATCH | `/clients/{id}/status` | zmiana statusu klienta |
| GET | `/orders` | lista zleceń dla projektu |
| GET | `/orders/{id}` | szczegóły zlecenia |
| PATCH | `/orders/{id}/status` | zmiana statusu zlecenia |
| POST | `/orders/{id}/history` | wpis historii |
| GET | `/voivodeships` | lista województw |
| PATCH | `/voivodeships/{name}/priority` | priorytet skanu |
| GET | `/industries` | lista branż |
| POST | `/industries` | dodanie branży |
| POST | `/pipeline/run` | start pipeline |
| GET | `/pipeline/status/{voivodeship}` | status pipeline dla województwa |
| GET | `/pipeline/status` | wszystkie statusy projektu |
| GET | `/pipeline/queue` | queue summary |
| GET | `/pipeline/logs` | logi pipeline |
| GET | `/stats` | statystyki projektu |

### Przykład uruchomienia pipeline
```bash
curl -X POST http://localhost:8000/pipeline/run \
  -H "Content-Type: application/json" \
  -H "X-Project-Id: fleet-premium" \
  -d '{"voivodeship":"mazowieckie","industries":["mechanik"],"project_id":"fleet-premium"}'
```

## Analytics / Biznes
| Metoda | Endpoint | Opis |
|---|---|---|
| GET | `/analytics/revenue` | revenue summary |
| GET | `/analytics/growth` | growth monthly |
| GET | `/analytics/churn` | churn summary |
| GET | `/analytics/heatmap` | mapa województw |
| GET | `/analytics/saas-dashboard` | pełny dashboard |
| GET | `/biznes/pricing` | pricing AI |
| GET | `/biznes/billing` | billing snapshot |
| GET | `/biznes/marketplace` | top leady |
| GET | `/biznes/agency-dashboard` | dashboard agency |
| GET | `/biznes/subscriptions` | subskrypcja i limity |
| GET | `/biznes/usage` | usage tracking |

## Security
| Metoda | Endpoint | Opis |
|---|---|---|
| GET | `/security/status` | status security |
| POST | `/security/block-ip` | blokada IP |
| GET | `/security/blocked-ips` | blocklista |
| DELETE | `/security/blocked-ips/{ip}` | odblokowanie |
| GET | `/security/audit-trail` | audit trail |
| GET | `/security/threats` | ostatnie zagrożenia |
| POST | `/security/backup` | backup metadata |
| GET | `/security/recovery` | recovery checklist |

## Dev Platform
| Metoda | Endpoint | Opis |
|---|---|---|
| GET | `/dev/analytics` | request analytics per projekt |
| GET | `/dev/limits` | limity aktywnego tieru |
| GET | `/dev/sandbox` | sandbox metadata |
| POST | `/dev/keys/rotate` | rotacja klucza |
| GET | `/dev/keys` | aktywne klucze |
| GET | `/dev/docs-url` | linki docs |
| GET | `/dev/project` | config aktualnego projektu |

## Frontend / PWA
- frontend zapisuje `projectId` w `localStorage`
- każdy request API automatycznie wysyła `X-Project-Id`
- `sw.js` kolejkowuje zapisy offline i synchronizuje je po powrocie sieci
- `manifest.json` zawiera shortcuty do `AUTO-LEADS`, `AUTO-STATUS`, `DEV PLATFORM`

## Finalne komendy
```bash
bash start_all.sh
bash scripts/healthcheck.sh
bash scripts/auto_maintain.sh
```
