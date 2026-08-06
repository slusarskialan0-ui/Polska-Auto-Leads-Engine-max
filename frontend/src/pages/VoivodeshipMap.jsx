import React, { useEffect, useState } from 'react'
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

export default function VoivodeshipMap() {
  const [voivodeships, setVoivodeships] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/voivodeships').then(r => { setVoivodeships(r.data); setLoading(false) }).catch(() => setLoading(false))
  }, [])

  if (loading) return <div className="p-8 text-gray-500">Ładowanie...</div>

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-6">🗺️ Mapa Województw</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {voivodeships.map((v) => (
          <div key={v.voivodeship} className="bg-white rounded-xl border p-5 shadow-sm">
            <div className="font-semibold capitalize text-base mb-2">{v.voivodeship}</div>
            <div className={`inline-block text-xs px-2 py-1 rounded-full font-medium mb-3 ${STATUS_COLORS[v.status] || 'bg-gray-100'}`}>
              {STATUS_LABELS[v.status] || v.status}
            </div>
            <div className="text-sm text-gray-500 space-y-1">
              <div>👥 Klientów: <span className="font-semibold text-gray-700">{v.clients_count}</span></div>
              <div>📋 Zleceń: <span className="font-semibold text-gray-700">{v.orders_count}</span></div>
              {v.last_scan && (
                <div className="text-xs text-gray-400">Ostatni skan: {new Date(v.last_scan).toLocaleDateString('pl-PL')}</div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
