import React, { useEffect, useState } from 'react'
import api from '../api/api'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts'

const COLORS = ['#3b82f6','#10b981','#f59e0b','#ef4444','#8b5cf6','#06b6d4','#f97316','#84cc16']

function StatCard({ label, value, color = 'blue' }) {
  const colors = {
    blue: 'bg-blue-50 border-blue-200 text-blue-700',
    green: 'bg-green-50 border-green-200 text-green-700',
    yellow: 'bg-yellow-50 border-yellow-200 text-yellow-700',
    purple: 'bg-purple-50 border-purple-200 text-purple-700',
  }
  return (
    <div className={`rounded-xl border p-6 ${colors[color]}`}>
      <div className="text-3xl font-bold">{value}</div>
      <div className="text-sm mt-1">{label}</div>
    </div>
  )
}

export default function Dashboard() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/stats').then(r => { setStats(r.data); setLoading(false) }).catch(() => setLoading(false))
  }, [])

  if (loading) return <div className="p-8 text-gray-500">Ładowanie...</div>
  if (!stats) return <div className="p-8 text-red-500">Błąd połączenia z API. Upewnij się że backend działa na localhost:8000</div>

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-6">📊 Dashboard</h1>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard label="Łączna liczba klientów" value={stats.total_clients} color="blue" />
        <StatCard label="Łączna liczba zleceń" value={stats.total_orders} color="green" />
        <StatCard label="Województw aktywnych" value={stats.by_voivodeship?.length || 0} color="yellow" />
        <StatCard label="Branż aktywnych" value={stats.by_industry?.length || 0} color="purple" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
        <div className="bg-white rounded-xl border p-6">
          <h2 className="font-semibold mb-4">Klienci wg Województw</h2>
          {stats.by_voivodeship?.length ? (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={stats.by_voivodeship}>
                <XAxis dataKey="voivodeship" tick={{ fontSize: 10 }} angle={-30} textAnchor="end" height={60} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          ) : <div className="text-gray-400 text-sm">Brak danych. Uruchom pipeline pozyskiwania.</div>}
        </div>

        <div className="bg-white rounded-xl border p-6">
          <h2 className="font-semibold mb-4">Klienci wg Branż</h2>
          {stats.by_industry?.length ? (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={stats.by_industry} dataKey="count" nameKey="industry" cx="50%" cy="50%" outerRadius={90} label>
                  {stats.by_industry.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Legend />
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : <div className="text-gray-400 text-sm">Brak danych. Uruchom pipeline pozyskiwania.</div>}
        </div>
      </div>

      <div className="bg-white rounded-xl border p-6">
        <h2 className="font-semibold mb-4">Klienci wg Źródła Pozyskania</h2>
        {stats.by_source?.length ? (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={stats.by_source}>
              <XAxis dataKey="source_type" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="count" fill="#10b981" />
            </BarChart>
          </ResponsiveContainer>
        ) : <div className="text-gray-400 text-sm">Brak danych. Uruchom pipeline pozyskiwania.</div>}
      </div>
    </div>
  )
}
