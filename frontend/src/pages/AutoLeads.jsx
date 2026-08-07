import React, { useEffect, useRef, useState } from 'react'
import api, { readProjectId, saveProjectId } from '../api/api'

export default function AutoLeads() {
  const [voivodeships, setVoivodeships] = useState([])
  const [industries, setIndustries] = useState([])
  const [selectedVoiv, setSelectedVoiv] = useState('')
  const [selectedIndustries, setSelectedIndustries] = useState([])
  const [projectId, setProjectId] = useState(readProjectId())
  const [running, setRunning] = useState(false)
  const [status, setStatus] = useState(null)
  const [queue, setQueue] = useState(null)
  const [logs, setLogs] = useState([])
  const pollRef = useRef(null)

  useEffect(() => {
    api.get('/voivodeships').then(r => setVoivodeships(r.data))
    api.get('/industries').then(r => {
      setIndustries(r.data)
      setSelectedIndustries(r.data.map(i => i.name))
    })
  }, [])

  const toggleIndustry = (name) => {
    setSelectedIndustries(prev => prev.includes(name) ? prev.filter(i => i !== name) : [...prev, name])
  }


  const loadQueue = async () => {
    const response = await api.get('/pipeline/queue')
    setQueue(response.data)
  }

  const startPipeline = async () => {
    if (!selectedVoiv) return alert('Wybierz województwo')
    if (selectedIndustries.length === 0) return alert('Wybierz co najmniej jedną branżę')
    const normalizedProjectId = saveProjectId(projectId)
    setProjectId(normalizedProjectId)
    setRunning(true)
    setStatus(null)
    setLogs([])
    await api.post('/pipeline/run', { voivodeship: selectedVoiv, industries: selectedIndustries, project_id: projectId })
    await loadQueue()
    pollRef.current = setInterval(async () => {
      const response = await api.get(`/pipeline/status/${selectedVoiv}`)
      setStatus(response.data?.result || null)
      if (response.data.status === 'done' || response.data.status === 'error') {
        clearInterval(pollRef.current)
        setRunning(false)
        const logsResponse = await api.get('/pipeline/logs', { params: { voivodeship: selectedVoiv, limit: 10 } })
        setLogs(logsResponse.data)
        await loadQueue()
      }
    }, 1500)
  }

  useEffect(() => {
    loadQueue().catch(() => {})
    return () => clearInterval(pollRef.current)
  }, [])

  return (
    <div className="max-w-5xl p-4 md:p-8">
      <h1 className="mb-2 text-2xl font-bold">🚀 AUTO-LEADS</h1>
      <p className="mb-8 text-sm text-gray-500">Uruchom automatyczne pozyskiwanie klientów dla wybranego województwa i branż.</p>

      <div className="mb-6 rounded-2xl border bg-white p-6">
        <h2 className="mb-4 font-semibold">0. Ustaw projectId</h2>
        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <input value={projectId} onChange={(e) => setProjectId(e.target.value)} className="w-full rounded-xl border px-3 py-2 text-sm md:max-w-sm" placeholder="np. auto-agency-eu" />
          <button onClick={saveProjectId} className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800">Zapisz zakres danych</button>
          <div className="text-xs text-gray-500">Brak logowania — izolacja danych działa przez header <code>X-Project-Id</code>.</div>
        </div>
      </div>

      <div className="mb-6 rounded-2xl border bg-white p-6">
        <h2 className="mb-4 font-semibold">1. Wybierz województwo</h2>
        <select className="w-full max-w-sm rounded-xl border px-3 py-2 text-sm" value={selectedVoiv} onChange={e => setSelectedVoiv(e.target.value)}>
          <option value="">-- Wybierz województwo --</option>
          {voivodeships.map(v => <option key={v.voivodeship} value={v.voivodeship}>{v.voivodeship}</option>)}
        </select>
      </div>

      <div className="mb-6 rounded-2xl border bg-white p-6">
        <h2 className="mb-4 font-semibold">2. Wybierz branże</h2>
        <div className="flex flex-wrap gap-2">
          <button className="rounded-lg border bg-gray-50 px-3 py-1 text-xs hover:bg-gray-100" onClick={() => setSelectedIndustries(industries.map(i => i.name))}>Zaznacz wszystkie</button>
          <button className="rounded-lg border bg-gray-50 px-3 py-1 text-xs hover:bg-gray-100" onClick={() => setSelectedIndustries([])}>Odznacz wszystkie</button>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {industries.map(i => (
            <button key={i.name} onClick={() => toggleIndustry(i.name)} className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${selectedIndustries.includes(i.name) ? 'border-blue-600 bg-blue-600 text-white' : 'border-gray-300 bg-white text-gray-600 hover:bg-gray-50'}`}>
              {i.name}
            </button>
          ))}
        </div>
      </div>

      {queue && (
        <div className="mb-6 grid gap-4 md:grid-cols-4">
          <div className="rounded-2xl border bg-white p-4"><div className="text-xs text-gray-500">Worker capacity</div><div className="mt-2 text-2xl font-bold text-blue-600">{queue.worker_capacity}</div></div>
          <div className="rounded-2xl border bg-white p-4"><div className="text-xs text-gray-500">Aktywne</div><div className="mt-2 text-2xl font-bold text-amber-600">{queue.active}</div></div>
          <div className="rounded-2xl border bg-white p-4"><div className="text-xs text-gray-500">Zakończone</div><div className="mt-2 text-2xl font-bold text-emerald-600">{queue.completed}</div></div>
          <div className="rounded-2xl border bg-white p-4"><div className="text-xs text-gray-500">Błędy</div><div className="mt-2 text-2xl font-bold text-rose-600">{queue.failed}</div></div>
        </div>
      )}

      <div className="mb-6 rounded-2xl border bg-white p-6">
        <button onClick={startPipeline} disabled={running || !selectedVoiv || selectedIndustries.length === 0} className={`w-full rounded-2xl py-3 text-lg font-bold text-white transition-colors ${running ? 'cursor-not-allowed bg-gray-400' : 'bg-blue-600 hover:bg-blue-700'}`}>
          {running ? '⏳ Pozyskiwanie w trakcie...' : '▶ Uruchom pozyskiwanie'}
        </button>
      </div>

      {running && (
        <div className="mb-6 rounded-2xl border border-yellow-200 bg-yellow-50 p-6 text-yellow-700">
          <div className="flex items-center gap-3">
            <div className="text-2xl animate-spin">⏳</div>
            <div>
              <div className="font-semibold">Pipeline w trakcie działania...</div>
              <div className="text-sm">projectId: {projectId} · {selectedVoiv} · {selectedIndustries.length} branż · 5 źródeł</div>
            </div>
          </div>
        </div>
      )}

      {status && (
        <div className="mb-6 rounded-2xl border border-green-200 bg-green-50 p-6">
          <h2 className="mb-4 font-semibold text-green-700">✅ Pozyskiwanie zakończone!</h2>
          <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-4">
            <div className="rounded-lg border bg-white p-4 text-center"><div className="text-2xl font-bold text-slate-900">{status.project_id}</div><div className="text-xs text-gray-500">projectId</div></div>
            <div className="rounded-lg border bg-white p-4 text-center"><div className="text-2xl font-bold text-blue-600">{status.total_found}</div><div className="text-xs text-gray-500">Znalezionych firm</div></div>
            <div className="rounded-lg border bg-white p-4 text-center"><div className="text-2xl font-bold text-green-600">{status.accepted}</div><div className="text-xs text-gray-500">Dodanych klientów</div></div>
            <div className="rounded-lg border bg-white p-4 text-center"><div className="text-2xl font-bold text-red-500">{status.rejected}</div><div className="text-xs text-gray-500">Odrzuconych</div></div>
          </div>
          <div>
            <h3 className="mb-2 text-sm font-semibold text-gray-700">Wyniki wg źródła:</h3>
            <div className="space-y-1">
              {status.sources?.map(s => (
                <div key={s.source_type} className="flex justify-between rounded border bg-white px-3 py-2 text-sm">
                  <span className="font-medium">{s.source_type}</span>
                  <span className="text-gray-500">{s.found} firm</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {logs.length > 0 && (
        <div className="rounded-2xl border bg-white p-6">
          <h2 className="mb-4 font-semibold">Logi pozyskiwania</h2>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px] text-xs">
              <thead className="border-b bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left">projectId</th>
                  <th className="px-3 py-2 text-left">Źródło</th>
                  <th className="px-3 py-2 text-left">Znalezione</th>
                  <th className="px-3 py-2 text-left">Zaakceptowane</th>
                  <th className="px-3 py-2 text-left">Odrzucone</th>
                  <th className="px-3 py-2 text-left">Data</th>
                </tr>
              </thead>
              <tbody>
                {logs.map(l => (
                  <tr key={l.id} className="border-b">
                    <td className="px-3 py-2 font-medium">{l.project_id}</td>
                    <td className="px-3 py-2">{l.source_type}</td>
                    <td className="px-3 py-2">{l.found}</td>
                    <td className="px-3 py-2 text-green-600">{l.accepted}</td>
                    <td className="px-3 py-2 text-red-500">{l.rejected}</td>
                    <td className="px-3 py-2 text-gray-400">{l.created_at ? new Date(l.created_at).toLocaleString('pl-PL') : '–'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
