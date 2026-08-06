import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../api/api'

const STATUS_COLORS = {
  nowe: 'bg-blue-100 text-blue-700',
  do_kontaktu: 'bg-yellow-100 text-yellow-700',
  w_trakcie: 'bg-orange-100 text-orange-700',
  zakonczone: 'bg-green-100 text-green-700',
}

export default function Orders() {
  const [orders, setOrders] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [voivodeships, setVoivodeships] = useState([])
  const [industries, setIndustries] = useState([])
  const [filters, setFilters] = useState({ voivodeship: '', industry: '', status: '', skip: 0, limit: 50 })

  useEffect(() => {
    api.get('/voivodeships').then(r => setVoivodeships(r.data))
    api.get('/industries').then(r => setIndustries(r.data))
  }, [])

  useEffect(() => {
    setLoading(true)
    const params = Object.fromEntries(Object.entries(filters).filter(([, v]) => v !== ''))
    api.get('/orders', { params }).then(r => {
      setOrders(r.data.items)
      setTotal(r.data.total)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [filters])

  const set = (k, v) => setFilters(f => ({ ...f, [k]: v, skip: 0 }))

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-6">📋 Zlecenia</h1>
      <div className="bg-white rounded-xl border p-4 mb-6 flex flex-wrap gap-3">
        <select className="border rounded px-3 py-1.5 text-sm" value={filters.voivodeship} onChange={e => set('voivodeship', e.target.value)}>
          <option value="">Wszystkie województwa</option>
          {voivodeships.map(v => <option key={v.voivodeship} value={v.voivodeship}>{v.voivodeship}</option>)}
        </select>
        <select className="border rounded px-3 py-1.5 text-sm" value={filters.industry} onChange={e => set('industry', e.target.value)}>
          <option value="">Wszystkie branże</option>
          {industries.map(i => <option key={i.id} value={i.name}>{i.name}</option>)}
        </select>
        <select className="border rounded px-3 py-1.5 text-sm" value={filters.status} onChange={e => set('status', e.target.value)}>
          <option value="">Wszystkie statusy</option>
          {['nowe','do_kontaktu','w_trakcie','zakonczone'].map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <span className="text-sm text-gray-500 self-center">Znaleziono: {total}</span>
      </div>

      {loading ? (
        <div className="text-gray-500">Ładowanie...</div>
      ) : orders.length === 0 ? (
        <div className="text-gray-400 bg-white rounded-xl border p-8 text-center">
          Brak zleceń. Uruchom pipeline pozyskiwania w zakładce AUTO-LEADS.
        </div>
      ) : (
        <div className="bg-white rounded-xl border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left">Tytuł</th>
                <th className="px-4 py-3 text-left">Klient</th>
                <th className="px-4 py-3 text-left">Branża</th>
                <th className="px-4 py-3 text-left">Województwo</th>
                <th className="px-4 py-3 text-left">Wartość</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Data</th>
              </tr>
            </thead>
            <tbody>
              {orders.map(o => (
                <tr key={o.id} className="border-b hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <Link to={`/zlecenia/${o.id}`} className="text-blue-600 hover:underline">{o.title}</Link>
                  </td>
                  <td className="px-4 py-3">{o.client_name}</td>
                  <td className="px-4 py-3">{o.industry}</td>
                  <td className="px-4 py-3">{o.voivodeship}</td>
                  <td className="px-4 py-3 font-medium">{o.value?.toLocaleString('pl-PL')} PLN</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[o.status] || 'bg-gray-100'}`}>{o.status}</span>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{o.created_at ? new Date(o.created_at).toLocaleDateString('pl-PL') : '–'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
