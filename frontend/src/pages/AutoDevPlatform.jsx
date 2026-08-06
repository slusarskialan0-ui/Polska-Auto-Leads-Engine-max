import React, { useEffect, useState } from 'react'
import api from '../api/api'

export default function AutoDevPlatform() {
  const [analytics, setAnalytics] = useState(null)
  const [limits, setLimits] = useState(null)
  const [keys, setKeys] = useState([])
  const [sandbox, setSandbox] = useState(null)
  const [docs, setDocs] = useState(null)

  const load = async () => {
    const [analyticsRes, limitsRes, keysRes, sandboxRes, docsRes] = await Promise.all([
      api.get('/dev/analytics'),
      api.get('/dev/limits'),
      api.get('/dev/keys'),
      api.get('/dev/sandbox'),
      api.get('/dev/docs-url'),
    ])
    setAnalytics(analyticsRes.data)
    setLimits(limitsRes.data)
    setKeys(keysRes.data.keys || [])
    setSandbox(sandboxRes.data)
    setDocs(docsRes.data)
  }

  useEffect(() => {
    load().catch(() => {})
  }, [])

  const rotateKey = async () => {
    await api.post('/dev/keys/rotate')
    await load()
  }

  const usagePct = Math.min(100, Math.round(((limits?.current_usage || 0) / (limits?.requests_per_day || 1)) * 100))

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">🧩 DEV PLATFORM</h1>
        <p className="mt-1 text-sm text-gray-500">API analytics, limity i zarządzanie kluczami.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-2xl border bg-white p-6">
          <div className="text-sm text-gray-500">Total requests</div>
          <div className="mt-2 text-3xl font-bold text-blue-600">{analytics?.total_requests || 0}</div>
        </div>
        <div className="rounded-2xl border bg-white p-6">
          <div className="text-sm text-gray-500">Requests today</div>
          <div className="mt-2 text-3xl font-bold text-emerald-600">{analytics?.requests_today || 0}</div>
        </div>
        <div className="rounded-2xl border bg-white p-6">
          <div className="text-sm text-gray-500">Avg response</div>
          <div className="mt-2 text-3xl font-bold text-amber-600">{analytics?.avg_response_ms || 0} ms</div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="rounded-2xl border bg-white p-6 xl:col-span-1">
          <h2 className="mb-4 text-lg font-semibold">API limits</h2>
          <div className="space-y-3 text-sm">
            <div>Tier: <span className="font-semibold">{limits?.tier || 'Pro'}</span></div>
            <div>Requests / min: <span className="font-semibold">{limits?.requests_per_min || 0}</span></div>
            <div>Requests / day: <span className="font-semibold">{limits?.requests_per_day || 0}</span></div>
            <div>
              <div className="mb-2 flex justify-between"><span>Usage</span><span>{usagePct}%</span></div>
              <div className="h-3 rounded-full bg-gray-100">
                <div className="h-3 rounded-full bg-blue-600" style={{ width: `${usagePct}%` }} />
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border bg-white p-6 xl:col-span-1">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold">API keys</h2>
            <button onClick={rotateKey} className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700">Rotate</button>
          </div>
          <div className="space-y-3">
            {keys.map((item) => (
              <div key={item.key} className="rounded-xl border p-4 text-sm">
                <div className="font-mono font-semibold">{item.key}</div>
                <div className="text-gray-500">{item.status} · {item.created_at}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border bg-white p-6 xl:col-span-1">
          <h2 className="mb-4 text-lg font-semibold">Sandbox</h2>
          <div className="rounded-xl bg-emerald-50 p-4 text-emerald-700">
            <div className="font-semibold">{sandbox?.status || 'inactive'}</div>
            <div className="mt-1 text-sm">{sandbox?.note}</div>
            <div className="mt-2 font-mono text-xs">{sandbox?.base_url}</div>
          </div>
          <div className="mt-4 space-y-2 text-sm">
            <a href={docs?.swagger || '/docs'} target="_blank" rel="noreferrer" className="block text-blue-600 hover:underline">Swagger UI</a>
            <a href={docs?.redoc || '/redoc'} target="_blank" rel="noreferrer" className="block text-blue-600 hover:underline">ReDoc</a>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border bg-white p-6">
        <h2 className="mb-4 text-lg font-semibold">Top endpoints</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-3 text-sm">
          {(analytics?.top_endpoints || []).map((item) => (
            <div key={item.endpoint} className="rounded-xl bg-slate-50 p-4">
              <div className="font-semibold">{item.endpoint}</div>
              <div className="text-gray-500">{item.count} req</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
