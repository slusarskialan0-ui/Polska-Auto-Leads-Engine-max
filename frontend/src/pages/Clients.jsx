import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../api/api'

const STATUS_COLORS = {
  nowy: 'bg-blue-100 text-blue-700',
  zweryfikowany: 'bg-green-100 text-green-700',
  odrzucony: 'bg-red-100 text-red-700',
}

export default function Clients() {
  const [clients, setClients] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [voivodeships, setVoivodeships] = useState([])
  const [industries, setIndustries] = useState([])
  const [filters, setFilters] = useState({ voivodeship: '', industry: '', source_type: '', status: '', skip: 0, limit: 50 })

  useEffect(() => {
    api.get('/voivodeships').then(r => setVoivodeships(r.data))
    api.get('/industries').then(r => setIndustries(r.data))
  }, [])

  useEffect(() => {
    setLoading(true)
    const params = Object.fromEntries(Object.entries(filters).filter(([, v]) => v !== ''))
    api.get('/clients', { params }).then(r => {
      setClients(r.data.items)
      setTotal(r.data.total)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [filters])

  const set = (k, v) => setFilters(f => ({ ...f, [k]: v, skip: 0 }))

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-6">👥 Klienci</h1>

      {/* Filters */}
      <div className="bg-white rounded-xl border p-4 mb-6 flex flex-wrap gap-3">
        <select className="border rounded px-3 py-1.5 text-sm" value={filters.voivodeship} onChange={e => set('voivodeship', e.target.value)}>
          <option value="">Wszystkie województwa</option>
          {voivodeships.map(v => <option key={v.voivodeship} value={v.voivodeship}>{v.voivodeship}</option>)}
        </select>
        <select className="border rounded px-3 py-1.5 text-sm" value={filters.industry} onChange={e => set('industry', e.target.value)}>
          <option value="">Wszystkie branże</option>
          {industries.map(i => <option key={i.id} value={i.name}>{i.name}</option>)}
        </select>
        <select className="border rounded px-3 py-1.5 text-sm" value={filters.source_type} onChange={e => set('source_type', e.target.value)}>
          <option value="">Wszystkie źródła</option>
          {['katalog','mapa','rejestr','social','ogloszenia'].map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select className="border rounded px-3 py-1.5 text-sm" value={filters.status} onChange={e => set('status', e.target.value)}>
          <option value="">Wszystkie statusy</option>
          {['nowy','zweryfikowany','odrzucony'].map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <span className="text-sm text-gray-500 self-center">Znaleziono: {total}</span>
      </div>

      {loading ? (
        <div className="text-gray-500">Ładowanie...</div>
      ) : clients.length === 0 ? (
        <div className="text-gray-400 bg-white rounded-xl border p-8 text-center">
          Brak klientów. Uruchom pipeline pozyskiwania w zakładce AUTO-LEADS.
        </div>
      ) : (
        <div className="bg-white rounded-xl border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left">Firma</th>
                <th className="px-4 py-3 text-left">Branża</th>
                <th className="px-4 py-3 text-left">Województwo</th>
                <th className="px-4 py-3 text-left">Miasto</th>
                <th className="px-4 py-3 text-left">Kontakt</th>
                <th className="px-4 py-3 text-left">Źródło</th>
                <th className="px-4 py-3 text-left">Status</th>
              </tr>
            </thead>
            <tbody>
              {clients.map(c => (
                <tr key={c.id} className="border-b hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <Link to={`/klienci/${c.id}`} className="text-blue-600 hover:underline font-medium">{c.company_name}</Link>
                  </td>
                  <td className="px-4 py-3">{c.industry}</td>
                  <td className="px-4 py-3">{c.voivodeship}</td>
                  <td className="px-4 py-3">{c.city}</td>
                  <td className="px-4 py-3 text-xs text-gray-500">
                    {c.email && <div>{c.email}</div>}
                    {c.phone && <div>{c.phone}</div>}
                  </td>
                  <td className="px-4 py-3">
                    <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded text-xs">{c.source_type}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[c.status] || 'bg-gray-100'}`}>{c.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
