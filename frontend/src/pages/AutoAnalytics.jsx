import React, { useEffect, useState } from 'react'
import api from '../api/api'
import { BarChart, Bar, CartesianGrid, LineChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

export default function AutoAnalytics() {
  const [revenue, setRevenue] = useState(null)
  const [growth, setGrowth] = useState(null)
  const [churn, setChurn] = useState(null)
  const [heatmap, setHeatmap] = useState([])
  const growthSeries = React.useMemo(() => {
    const months = new Map()
    ;(growth?.clients_growth || []).forEach((item) => {
      const current = months.get(item.month) || { month: item.month, clients: 0, orders: 0 }
      months.set(item.month, { ...current, clients: item.count })
    })
    ;(growth?.orders_growth || []).forEach((item) => {
      const current = months.get(item.month) || { month: item.month, clients: 0, orders: 0 }
      months.set(item.month, { ...current, orders: item.count })
    })
    return Array.from(months.values()).sort((a, b) => a.month.localeCompare(b.month))
  }, [growth])

  useEffect(() => {
    const load = async () => {
      const [revenueRes, growthRes, churnRes, heatmapRes] = await Promise.all([
        api.get('/analytics/revenue'),
        api.get('/analytics/growth'),
        api.get('/analytics/churn'),
        api.get('/analytics/heatmap'),
      ])
      setRevenue(revenueRes.data)
      setGrowth(growthRes.data)
      setChurn(churnRes.data)
      setHeatmap(heatmapRes.data.by_voivodeship || [])
    }
    load().catch(() => {})
  }, [])

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">📊 AUTO-ANALYTICS</h1>
        <p className="mt-1 text-sm text-gray-500">Revenue, churn i growth dla SaaS lead generation.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-2xl border bg-white p-6">
          <div className="text-sm text-gray-500">Total revenue</div>
          <div className="mt-2 text-3xl font-bold text-emerald-600">{(revenue?.total_revenue || 0).toLocaleString('pl-PL')} zł</div>
        </div>
        <div className="rounded-2xl border bg-white p-6">
          <div className="text-sm text-gray-500">Avg order value</div>
          <div className="mt-2 text-3xl font-bold text-blue-600">{(revenue?.avg_order_value || 0).toLocaleString('pl-PL')} zł</div>
        </div>
        <div className="rounded-2xl border bg-white p-6">
          <div className="text-sm text-gray-500">Churn rate</div>
          <div className="mt-2 text-3xl font-bold text-rose-600">{churn?.churn_rate_pct || 0}%</div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="rounded-2xl border bg-white p-6">
          <h2 className="mb-4 text-lg font-semibold">Revenue by month</h2>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={revenue?.by_month || []}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="revenue" fill="#10b981" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-2xl border bg-white p-6">
          <h2 className="mb-4 text-lg font-semibold">Growth charts</h2>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={growthSeries}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="clients" stroke="#2563eb" strokeWidth={3} />
              <Line type="monotone" dataKey="orders" stroke="#f97316" strokeWidth={3} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="rounded-2xl border bg-white p-6 xl:col-span-1">
          <h2 className="mb-4 text-lg font-semibold">Churn metrics</h2>
          <div className="space-y-3 text-sm">
            <div className="rounded-xl bg-rose-50 p-4 text-rose-700">Churned clients: <span className="font-bold">{churn?.churned_clients || 0}</span></div>
            <div className="rounded-xl bg-emerald-50 p-4 text-emerald-700">Active clients: <span className="font-bold">{churn?.active_clients || 0}</span></div>
            <div className="rounded-xl bg-blue-50 p-4 text-blue-700">Trend: stabilny wzrost MRR i lead velocity.</div>
          </div>
        </div>

        <div className="rounded-2xl border bg-white p-6 xl:col-span-2 overflow-hidden">
          <h2 className="mb-4 text-lg font-semibold">Heatmap województw</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 text-gray-500">
                <tr>
                  <th className="px-4 py-3 text-left">Województwo</th>
                  <th className="px-4 py-3 text-left">Klienci</th>
                  <th className="px-4 py-3 text-left">Orders</th>
                  <th className="px-4 py-3 text-left">Revenue</th>
                </tr>
              </thead>
              <tbody>
                {heatmap.map((item) => (
                  <tr key={item.voivodeship} className="border-t">
                    <td className="px-4 py-3 font-medium">{item.voivodeship}</td>
                    <td className="px-4 py-3">{item.clients}</td>
                    <td className="px-4 py-3">{item.orders}</td>
                    <td className="px-4 py-3 text-emerald-600">{item.revenue.toLocaleString('pl-PL')} zł</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
