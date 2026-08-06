import React, { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import api from '../api/api'

const STATUS_OPTIONS = ['nowy', 'zweryfikowany', 'odrzucony']

export default function ClientDetail() {
  const { id } = useParams()
  const [client, setClient] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get(`/clients/${id}`).then(r => { setClient(r.data); setLoading(false) }).catch(() => setLoading(false))
  }, [id])

  const changeStatus = async (status) => {
    await api.patch(`/clients/${id}/status`, null, { params: { status } })
    setClient(c => ({ ...c, status }))
  }

  if (loading) return <div className="p-8 text-gray-500">Ładowanie...</div>
  if (!client) return <div className="p-8 text-red-500">Klient nie znaleziony</div>

  return (
    <div className="p-8 max-w-4xl">
      <Link to="/klienci" className="text-blue-600 hover:underline text-sm mb-4 inline-block">← Powrót do listy</Link>
      <h1 className="text-2xl font-bold mb-6">{client.company_name}</h1>

      <div className="grid grid-cols-2 gap-6 mb-8">
        <div className="bg-white rounded-xl border p-6">
          <h2 className="font-semibold mb-3">Profil firmy</h2>
          <dl className="space-y-2 text-sm">
            <div className="flex gap-2"><dt className="text-gray-500 w-32">Branża:</dt><dd>{client.industry}</dd></div>
            <div className="flex gap-2"><dt className="text-gray-500 w-32">Województwo:</dt><dd>{client.voivodeship}</dd></div>
            <div className="flex gap-2"><dt className="text-gray-500 w-32">Miasto:</dt><dd>{client.city}</dd></div>
            <div className="flex gap-2"><dt className="text-gray-500 w-32">Email:</dt><dd>{client.email || '–'}</dd></div>
            <div className="flex gap-2"><dt className="text-gray-500 w-32">Telefon:</dt><dd>{client.phone || '–'}</dd></div>
            <div className="flex gap-2"><dt className="text-gray-500 w-32">Strona www:</dt><dd>{client.website ? <a href={client.website} className="text-blue-600 hover:underline" target="_blank" rel="noreferrer">{client.website}</a> : '–'}</dd></div>
            <div className="flex gap-2"><dt className="text-gray-500 w-32">Źródło:</dt><dd>{client.source_type} — {client.source_detail}</dd></div>
            <div className="flex gap-2"><dt className="text-gray-500 w-32">Pozyskano:</dt><dd>{client.acquired_at ? new Date(client.acquired_at).toLocaleDateString('pl-PL') : '–'}</dd></div>
          </dl>
        </div>

        <div className="bg-white rounded-xl border p-6">
          <h2 className="font-semibold mb-3">Status</h2>
          <div className="flex flex-wrap gap-2">
            {STATUS_OPTIONS.map(s => (
              <button key={s} onClick={() => changeStatus(s)}
                className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${client.status === s ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'}`}>
                {s}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border p-6">
        <h2 className="font-semibold mb-4">Zlecenia ({client.orders?.length || 0})</h2>
        {client.orders?.length === 0 ? (
          <div className="text-gray-400 text-sm">Brak zleceń</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-3 py-2 text-left">Tytuł</th>
                <th className="px-3 py-2 text-left">Wartość</th>
                <th className="px-3 py-2 text-left">Status</th>
                <th className="px-3 py-2 text-left">Data</th>
              </tr>
            </thead>
            <tbody>
              {client.orders.map(o => (
                <tr key={o.id} className="border-b hover:bg-gray-50">
                  <td className="px-3 py-2">
                    <Link to={`/zlecenia/${o.id}`} className="text-blue-600 hover:underline">{o.title}</Link>
                  </td>
                  <td className="px-3 py-2">{o.value?.toLocaleString('pl-PL')} PLN</td>
                  <td className="px-3 py-2">{o.status}</td>
                  <td className="px-3 py-2">{o.created_at ? new Date(o.created_at).toLocaleDateString('pl-PL') : '–'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
