import React, { useEffect, useState } from 'react'
import api from '../api/api'

export default function AutoAgency() {
  const [dashboard, setDashboard] = useState(null)

  useEffect(() => {
    api.get('/biznes/agency-dashboard').then((response) => setDashboard(response.data)).catch(() => {})
  }, [])

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">🏢 Agencja</h1>
        <p className="mt-1 text-sm text-gray-500">Dashboard agencyjny dla projektów, revenue i branż.</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-2xl border bg-white p-6">
          <div className="text-sm text-gray-500">Total projects</div>
          <div className="mt-2 text-3xl font-bold text-blue-600">{dashboard?.total_projects || 0}</div>
        </div>
        <div className="rounded-2xl border bg-white p-6 md:col-span-2">
          <div className="text-sm text-gray-500">Top industries</div>
          <div className="mt-3 flex flex-wrap gap-2">
            {(dashboard?.top_industries || []).map((item) => (
              <span key={item.industry} className="rounded-full bg-blue-50 px-3 py-1 text-sm text-blue-700">{item.industry} · {item.count}</span>
            ))}
          </div>
        </div>
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="rounded-2xl border bg-white p-6">
          <h2 className="mb-4 text-lg font-semibold">Clients per project</h2>
          <div className="space-y-3">
            {Object.entries(dashboard?.clients_per_project || {}).map(([project, count]) => (
              <div key={project} className="flex items-center justify-between rounded-xl border p-4">
                <span className="font-medium">{project}</span>
                <span className="text-blue-600 font-bold">{count}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-2xl border bg-white p-6">
          <h2 className="mb-4 text-lg font-semibold">Revenue per project</h2>
          <div className="space-y-3">
            {Object.entries(dashboard?.revenue_per_project || {}).map(([project, value]) => (
              <div key={project} className="flex items-center justify-between rounded-xl border p-4">
                <span className="font-medium">{project}</span>
                <span className="text-emerald-600 font-bold">{Number(value).toLocaleString('pl-PL')} zł</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
