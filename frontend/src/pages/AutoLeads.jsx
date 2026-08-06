import React, { useEffect, useState, useRef } from 'react'
import api from '../api/api'

export default function AutoLeads() {
  const [voivodeships, setVoivodeships] = useState([])
  const [industries, setIndustries] = useState([])
  const [selectedVoiv, setSelectedVoiv] = useState('')
  const [selectedIndustries, setSelectedIndustries] = useState([])
  const [running, setRunning] = useState(false)
  const [status, setStatus] = useState(null)
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
    setSelectedIndustries(prev =>
      prev.includes(name) ? prev.filter(i => i !== name) : [...prev, name]
    )
  }

  const startPipeline = async () => {
    if (!selectedVoiv) return alert('Wybierz województwo')
    if (selectedIndustries.length === 0) return alert('Wybierz co najmniej jedną branżę')
    setRunning(true)
    setStatus(null)
    setLogs([])
    await api.post('/pipeline/run', { voivodeship: selectedVoiv, industries: selectedIndustries })
    // Poll for status
    pollRef.current = setInterval(async () => {
      const r = await api.get(`/pipeline/status/${selectedVoiv}`)
      if (r.data.status === 'done') {
        clearInterval(pollRef.current)
        setRunning(false)
        setStatus(r.data.result)
        // Fetch logs
        const lr = await api.get('/pipeline/logs', { params: { voivodeship: selectedVoiv } })
        setLogs(lr.data.slice(0, 10))
      }
    }, 1500)
  }

  useEffect(() => () => clearInterval(pollRef.current), [])

  return (
    <div className="p-8 max-w-4xl">
      <h1 className="text-2xl font-bold mb-2">🚀 AUTO-LEADS</h1>
      <p className="text-gray-500 mb-8 text-sm">Uruchom automatyczne pozyskiwanie klientów dla wybranego województwa i branż.</p>

      <div className="bg-white rounded-xl border p-6 mb-6">
        <h2 className="font-semibold mb-4">1. Wybierz województwo</h2>
        <select
          className="border rounded px-3 py-2 text-sm w-full max-w-sm"
          value={selectedVoiv}
          onChange={e => setSelectedVoiv(e.target.value)}
        >
          <option value="">-- Wybierz województwo --</option>
          {voivodeships.map(v => (
            <option key={v.voivodeship} value={v.voivodeship}>{v.voivodeship}</option>
          ))}
        </select>
      </div>

      <div className="bg-white rounded-xl border p-6 mb-6">
        <h2 className="font-semibold mb-4">2. Wybierz branże</h2>
        <div className="flex flex-wrap gap-2">
          <button
            className="px-3 py-1 text-xs border rounded bg-gray-50 hover:bg-gray-100"
            onClick={() => setSelectedIndustries(industries.map(i => i.name))}
          >Zaznacz wszystkie</button>
          <button
            className="px-3 py-1 text-xs border rounded bg-gray-50 hover:bg-gray-100"
            onClick={() => setSelectedIndustries([])}
          >Odznacz wszystkie</button>
        </div>
        <div className="flex flex-wrap gap-2 mt-3">
          {industries.map(i => (
            <button key={i.name} onClick={() => toggleIndustry(i.name)}
              className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${selectedIndustries.includes(i.name) ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'}`}>
              {i.name}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-xl border p-6 mb-6">
        <button
          onClick={startPipeline}
          disabled={running || !selectedVoiv || selectedIndustries.length === 0}
          className={`w-full py-3 rounded-xl text-white font-bold text-lg transition-colors ${running ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}
        >
          {running ? '⏳ Pozyskiwanie w trakcie...' : '▶ Uruchom pozyskiwanie'}
        </button>
      </div>

      {running && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6 mb-6 text-yellow-700">
          <div className="flex items-center gap-3">
            <div className="animate-spin text-2xl">⏳</div>
            <div>
              <div className="font-semibold">Pipeline w trakcie działania...</div>
              <div className="text-sm">Skanowanie: {selectedVoiv} | Branże: {selectedIndustries.length} | Źródła: 5</div>
            </div>
          </div>
        </div>
      )}

      {status && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-6 mb-6">
          <h2 className="font-semibold text-green-700 mb-4">✅ Pozyskiwanie zakończone!</h2>
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="bg-white rounded-lg p-4 text-center border">
              <div className="text-2xl font-bold text-blue-600">{status.total_found}</div>
              <div className="text-xs text-gray-500">Znalezionych firm</div>
            </div>
            <div className="bg-white rounded-lg p-4 text-center border">
              <div className="text-2xl font-bold text-green-600">{status.accepted}</div>
              <div className="text-xs text-gray-500">Dodanych klientów</div>
            </div>
            <div className="bg-white rounded-lg p-4 text-center border">
              <div className="text-2xl font-bold text-red-500">{status.rejected}</div>
              <div className="text-xs text-gray-500">Odrzuconych</div>
            </div>
          </div>
          <div>
            <h3 className="text-sm font-semibold mb-2 text-gray-700">Wyniki wg źródła:</h3>
            <div className="space-y-1">
              {status.sources?.map(s => (
                <div key={s.source_type} className="flex justify-between text-sm bg-white rounded px-3 py-2 border">
                  <span className="font-medium">{s.source_type}</span>
                  <span className="text-gray-500">{s.found} firm</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {logs.length > 0 && (
        <div className="bg-white rounded-xl border p-6">
          <h2 className="font-semibold mb-4">Logi pozyskiwania</h2>
          <table className="w-full text-xs">
            <thead className="bg-gray-50 border-b">
              <tr>
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
      )}
    </div>
  )
}
