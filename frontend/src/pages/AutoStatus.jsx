import React, { useEffect, useState, useRef } from 'react'
import api from '../api/api'

const STATUS_COLORS = {
  nie_rozpoczete: 'bg-gray-100 text-gray-600',
  w_trakcie: 'bg-yellow-100 text-yellow-700',
  zakonczone: 'bg-green-100 text-green-700',
  ponowny_skan: 'bg-blue-100 text-blue-700',
}

const STATUS_LABELS = {
  nie_rozpoczete: '⬜ Nie rozpoczęte',
  w_trakcie: '🔄 W trakcie',
  zakonczone: '✅ Zakończone',
  ponowny_skan: '🔁 Ponowny skan',
}

function MetricCard({ label, value, sub, color = 'blue' }) {
  const colorMap = {
    blue: 'bg-blue-50 border-blue-200 text-blue-700',
    green: 'bg-green-50 border-green-200 text-green-700',
    yellow: 'bg-yellow-50 border-yellow-200 text-yellow-700',
    red: 'bg-red-50 border-red-200 text-red-700',
    purple: 'bg-purple-50 border-purple-200 text-purple-700',
  }
  return (
    <div className={`rounded-xl border p-5 ${colorMap[color]}`}>
      <div className="text-2xl font-bold">{value ?? '–'}</div>
      <div className="text-sm font-medium mt-1">{label}</div>
      {sub && <div className="text-xs mt-1 opacity-70">{sub}</div>}
    </div>
  )
}

export default function AutoStatus() {
  const [health, setHealth] = useState(null)
  const [metrics, setMetrics] = useState(null)
  const [voivodeships, setVoivodeships] = useState([])
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const intervalRef = useRef(null)

  const load = async () => {
    try {
      const [h, m, v, l] = await Promise.all([
        api.get('/health'),
        api.get('/metrics'),
        api.get('/voivodeships'),
        api.get('/pipeline/logs', { params: { limit: 20 } }),
      ])
      setHealth(h.data)
      setMetrics(m.data)
      setVoivodeships(v.data)
      setLogs(l.data)
    } catch {
      setHealth(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    intervalRef.current = setInterval(load, 10000)
    return () => clearInterval(intervalRef.current)
  }, [])

  const scanned = voivodeships.filter(v => v.status === 'zakonczone').length
  const inProgress = voivodeships.filter(v => v.status === 'w_trakcie').length

  return (
    <div className="p-4 md:p-8 max-w-5xl">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">📡 AUTO-STATUS</h1>
          <p className="text-gray-500 text-sm mt-1">Live monitoring systemu — odświeżanie co 10 s</p>
        </div>
        <div className="flex items-center gap-2">
          <div className={`w-2.5 h-2.5 rounded-full ${health ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
          <span className="text-sm font-medium text-gray-600">{health ? 'System online' : 'Brak połączenia'}</span>
          {health && <span className="text-xs text-gray-400">v{health.version}</span>}
        </div>
      </div>

      {loading ? (
        <div className="text-gray-400 py-12 text-center">Ładowanie...</div>
      ) : (
        <>
          {/* Metrics */}
          {metrics && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <MetricCard label="Klientów w bazie" value={metrics.total_clients} color="blue" />
              <MetricCard label="Zleceń w bazie" value={metrics.total_orders} color="green" />
              <MetricCard label="Uruchomień pipeline" value={metrics.pipeline_runs} color="purple" />
              <MetricCard label="Skuteczność pipeline" value={`${metrics.acceptance_rate_pct}%`} sub={`${metrics.pipeline_accepted} / ${metrics.pipeline_found} firm`} color="yellow" />
            </div>
          )}

          {/* Voivodeship statuses */}
          <div className="bg-white rounded-xl border p-6 mb-8">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
              <h2 className="font-semibold">Statusy województw</h2>
              <div className="text-sm text-gray-500">
                ✅ {scanned} zeskanowanych · 🔄 {inProgress} w trakcie · ⬜ {16 - scanned - inProgress} oczekuje
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {voivodeships.map(v => (
                <div key={v.voivodeship} className="border rounded-lg p-3">
                  <div className="font-medium text-sm capitalize mb-1">{v.voivodeship}</div>
                  <div className={`inline-block text-xs px-2 py-0.5 rounded-full font-medium mb-2 ${STATUS_COLORS[v.status] || 'bg-gray-100'}`}>
                    {STATUS_LABELS[v.status] || v.status}
                  </div>
                  <div className="text-xs text-gray-500 space-y-0.5">
                    <div>👥 {v.clients_count} klientów</div>
                    <div>📋 {v.orders_count} zleceń</div>
                    {v.last_scan && <div>🕐 {new Date(v.last_scan).toLocaleDateString('pl-PL')}</div>}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent logs */}
          <div className="bg-white rounded-xl border p-6">
            <h2 className="font-semibold mb-4">Ostatnie logi pipeline</h2>
            {logs.length === 0 ? (
              <div className="text-gray-400 text-sm">Brak logów. Uruchom pipeline w zakładce AUTO-LEADS.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs min-w-[500px]">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-3 py-2 text-left">Województwo</th>
                      <th className="px-3 py-2 text-left">Źródło</th>
                      <th className="px-3 py-2 text-right">Znalezione</th>
                      <th className="px-3 py-2 text-right">Zaakceptowane</th>
                      <th className="px-3 py-2 text-right">Odrzucone</th>
                      <th className="px-3 py-2 text-left">Data</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.map(l => (
                      <tr key={l.id} className="border-b hover:bg-gray-50">
                        <td className="px-3 py-2 capitalize">{l.voivodeship}</td>
                        <td className="px-3 py-2">{l.source_type}</td>
                        <td className="px-3 py-2 text-right">{l.found}</td>
                        <td className="px-3 py-2 text-right text-green-600">{l.accepted}</td>
                        <td className="px-3 py-2 text-right text-red-500">{l.rejected}</td>
                        <td className="px-3 py-2 text-gray-400">{l.created_at ? new Date(l.created_at).toLocaleString('pl-PL') : '–'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
