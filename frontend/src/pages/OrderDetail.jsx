import React, { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import api from '../api/api'

const STATUS_OPTIONS = ['nowe', 'do_kontaktu', 'w_trakcie', 'zakonczone']

export default function OrderDetail() {
  const { id } = useParams()
  const [order, setOrder] = useState(null)
  const [loading, setLoading] = useState(true)
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)

  const load = () => api.get(`/orders/${id}`).then(r => { setOrder(r.data); setLoading(false) }).catch(() => setLoading(false))
  useEffect(() => { load() }, [id])

  const changeStatus = async (status) => {
    await api.patch(`/orders/${id}/status`, null, { params: { status } })
    load()
  }

  const addNote = async () => {
    if (!note.trim()) return
    setSaving(true)
    await api.post(`/orders/${id}/history`, { note })
    setNote('')
    setSaving(false)
    load()
  }

  if (loading) return <div className="p-8 text-gray-500">Ładowanie...</div>
  if (!order) return <div className="p-8 text-red-500">Zlecenie nie znalezione</div>

  return (
    <div className="p-8 max-w-4xl">
      <Link to="/zlecenia" className="text-blue-600 hover:underline text-sm mb-4 inline-block">← Powrót do listy</Link>
      <h1 className="text-2xl font-bold mb-6">{order.title}</h1>

      <div className="grid grid-cols-2 gap-6 mb-8">
        <div className="bg-white rounded-xl border p-6">
          <h2 className="font-semibold mb-3">Szczegóły zlecenia</h2>
          <dl className="space-y-2 text-sm">
            <div className="flex gap-2"><dt className="text-gray-500 w-28">Klient:</dt><dd><Link to={`/klienci/${order.client_id}`} className="text-blue-600 hover:underline">{order.client_name}</Link></dd></div>
            <div className="flex gap-2"><dt className="text-gray-500 w-28">Wartość:</dt><dd className="font-semibold">{order.value?.toLocaleString('pl-PL')} PLN</dd></div>
            <div className="flex gap-2"><dt className="text-gray-500 w-28">Data:</dt><dd>{order.created_at ? new Date(order.created_at).toLocaleDateString('pl-PL') : '–'}</dd></div>
          </dl>
          <div className="mt-4 text-sm text-gray-600">{order.description}</div>
        </div>

        <div className="bg-white rounded-xl border p-6">
          <h2 className="font-semibold mb-3">Status</h2>
          <div className="flex flex-wrap gap-2">
            {STATUS_OPTIONS.map(s => (
              <button key={s} onClick={() => changeStatus(s)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${order.status === s ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'}`}>
                {s}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border p-6">
        <h2 className="font-semibold mb-4">Historia działań</h2>
        <div className="space-y-2 mb-4">
          {order.history?.length === 0 && <div className="text-gray-400 text-sm">Brak historii</div>}
          {order.history?.map(h => (
            <div key={h.id} className="text-sm border-l-2 border-blue-200 pl-3 py-1">
              <div className="text-gray-700">{h.note}</div>
              {h.status_change && <div className="text-xs text-gray-400">{h.status_change}</div>}
              <div className="text-xs text-gray-400">{new Date(h.created_at).toLocaleString('pl-PL')}</div>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <input value={note} onChange={e => setNote(e.target.value)} placeholder="Dodaj notatkę..."
            className="flex-1 border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
          <button onClick={addNote} disabled={saving} className="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700 disabled:opacity-50">
            Dodaj
          </button>
        </div>
      </div>
    </div>
  )
}
