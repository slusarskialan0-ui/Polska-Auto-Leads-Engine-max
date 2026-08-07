import React, { useEffect, useState } from 'react'
import api from '../api/api'

export default function AutoMarketplace() {
  const [leads, setLeads] = useState([])

  useEffect(() => {
    api.get('/biznes/marketplace').then((response) => setLeads(response.data)).catch(() => {})
  }, [])

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold">🏪 Marketplace</h1>
      <p className="mt-1 text-sm text-gray-500">Najbardziej wartościowe leady gotowe do aktywacji.</p>
      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
        {leads.map((lead) => (
          <div key={lead.id} className="rounded-2xl border bg-white p-6 shadow-sm">
            <div className="text-xs font-semibold uppercase tracking-wide text-blue-600">{lead.industry}</div>
            <h2 className="mt-2 text-lg font-bold">{lead.company_name}</h2>
            <div className="mt-2 text-sm text-gray-500">{lead.city || 'Polska'} · {lead.voivodeship}</div>
            <div className="mt-4 text-3xl font-bold text-emerald-600">{lead.order_value.toLocaleString('pl-PL')} zł</div>
            <div className="mt-1 text-sm text-gray-500">Orders: {lead.orders_count}</div>
            <div className="mt-4 rounded-xl bg-slate-50 p-3 text-sm text-slate-600">{lead.email || lead.phone || 'Kontakt dostępny po aktywacji.'}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
