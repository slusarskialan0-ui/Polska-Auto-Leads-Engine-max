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
      <div className="mt-1 text-sm font-medium">{label}</div>
      {sub && <div className="mt-1 text-xs opacity-70">{sub}</div>}
    </div>
  )
}

export default function AutoStatus() {
  const [health, setHealth] = useState(null)
  const [metrics, setMetrics] = useState(null)
  const [ops, setOps] = useState(null)
  const [thresholds, setThresholds] = useState(null)
  const [voivodeships, setVoivodeships] = useState([])
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const intervalRef = useRef(null)

  const load = async () => {
    try {
      const [h, m, v, l, o, t] = await Promise.all([
        api.get('/health'),
        api.get('/metrics'),
        api.get('/voivodeships'),
        api.get('/pipeline/logs', { params: { limit: 20 } }),
        api.get('/system/ops-dashboard'),
        api.get('/system/thresholds'),
      ])
      setHealth(h.data)
      setMetrics(m.data)
      setVoivodeships(v.data)
      setLogs(l.data)
      setOps(o.data)
      setThresholds(t.data)
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
    <div className="max-w-6xl p-4 md:p-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">📡 AUTO-STATUS</h1>
          <p className="mt-1 text-sm text-gray-500">Live monitoring systemu — odświeżanie co 10 s</p>
        </div>
        <div className="flex items-center gap-2">
          <div className={`h-2.5 w-2.5 rounded-full ${health ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
          <span className="text-sm font-medium text-gray-600">{health ? 'System online' : 'Brak połączenia'}</span>
          {health && <span className="text-xs text-gray-400">v{health.version}</span>}
        </div>
      </div>

      {loading ? (
        <div className="py-12 text-center text-gray-400">Ładowanie...</div>
      ) : (
        <>
          {metrics && (
            <div className="mb-8 grid grid-cols-2 gap-4 md:grid-cols-4">
              <MetricCard label="Klientów w bazie" value={metrics.total_clients} color="blue" />
              <MetricCard label="Zleceń w bazie" value={metrics.total_orders} color="green" />
              <MetricCard label="Uruchomień pipeline" value={metrics.pipeline_runs} color="purple" />
              <MetricCard label="Skuteczność pipeline" value={`${metrics.acceptance_rate_pct}%`} sub={`${metrics.pipeline_accepted} / ${metrics.pipeline_found} firm`} color="yellow" />
            </div>
          )}

          {ops && (
            <div className="mb-8 grid gap-4 lg:grid-cols-4">
              <div className="rounded-2xl border bg-white p-5"><div className="text-sm text-gray-500">Env</div><div className="mt-2 text-2xl font-bold text-slate-900">{ops.environment}</div></div>
              <div className="rounded-2xl border bg-white p-5"><div className="text-sm text-gray-500">Active pipelines</div><div className="mt-2 text-2xl font-bold text-blue-600">{ops.active_pipelines}</div></div>
              <div className="rounded-2xl border bg-white p-5"><div className="text-sm text-gray-500">Worker capacity</div><div className="mt-2 text-2xl font-bold text-emerald-600">{ops.worker_capacity}</div></div>
              <div className="rounded-2xl border bg-white p-5"><div className="text-sm text-gray-500">Pipeline risk</div><div className="mt-2 text-2xl font-bold text-amber-600">{ops.forecast?.confidence_pct || 0}%</div><div className="text-xs text-gray-500">{ops.forecast?.next_pipeline_issue || 'none'}</div></div>
            </div>
          )}

          <div className="mb-8 grid gap-6 xl:grid-cols-3">
            <div className="rounded-2xl border bg-white p-6 xl:col-span-2">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                <h2 className="font-semibold">Statusy województw</h2>
                <div className="text-sm text-gray-500">✅ {scanned} zeskanowanych · 🔄 {inProgress} w trakcie · ⬜ {16 - scanned - inProgress} oczekuje</div>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {voivodeships.map(v => (
                  <div key={v.voivodeship} className="rounded-lg border p-3">
                    <div className="mb-1 text-sm font-medium capitalize">{v.voivodeship}</div>
                    <div className={`mb-2 inline-block rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[v.status] || 'bg-gray-100'}`}>{STATUS_LABELS[v.status] || v.status}</div>
                    <div className="space-y-0.5 text-xs text-gray-500">
                      <div>👥 {v.clients_count} klientów</div>
                      <div>📋 {v.orders_count} zleceń</div>
                      {v.last_scan && <div>🕐 {new Date(v.last_scan).toLocaleDateString('pl-PL')}</div>}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border bg-white p-6">
              <h2 className="mb-4 font-semibold">AUTO-thresholds</h2>
              <div className="space-y-3 text-sm text-gray-600">
                {thresholds && Object.entries(thresholds).map(([key, value]) => (
                  <div key={key} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
                    <span>{key}</span>
                    <span className="font-semibold text-slate-900">{value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="mb-8 grid gap-6 xl:grid-cols-2">
            <div className="rounded-2xl border bg-white p-6">
              <h2 className="mb-4 font-semibold">Recent system events</h2>
              <div className="space-y-3 text-sm">
                {(ops?.logs || []).map((log, index) => (
                  <div key={`${log.ts}-${index}`} className="rounded-xl border p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="font-semibold">{log.component}</div>
                      <div className="text-xs uppercase text-gray-500">{log.status}</div>
                    </div>
                    <div className="mt-1 text-gray-600">{log.message}</div>
                    <div className="mt-1 text-xs text-gray-400">{log.ts}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border bg-white p-6">
              <h2 className="mb-4 font-semibold">Ostatnie logi pipeline</h2>
              {logs.length === 0 ? (
                <div className="text-sm text-gray-400">Brak logów. Uruchom pipeline w zakładce AUTO-LEADS.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[500px] text-xs">
                    <thead className="border-b bg-gray-50">
                      <tr>
                        <th className="px-3 py-2 text-left">projectId</th>
                        <th className="px-3 py-2 text-left">Źródło</th>
                        <th className="px-3 py-2 text-right">Znalezione</th>
                        <th className="px-3 py-2 text-right">Zaakceptowane</th>
                        <th className="px-3 py-2 text-right">Odrzucone</th>
                      </tr>
                    </thead>
                    <tbody>
                      {logs.map(l => (
                        <tr key={l.id} className="border-b hover:bg-gray-50">
                          <td className="px-3 py-2">{l.project_id}</td>
                          <td className="px-3 py-2">{l.source_type}</td>
                          <td className="px-3 py-2 text-right">{l.found}</td>
                          <td className="px-3 py-2 text-right text-green-600">{l.accepted}</td>
                          <td className="px-3 py-2 text-right text-red-500">{l.rejected}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
