import React from 'react'
import { Routes, Route, NavLink } from 'react-router-dom'
import Dashboard from './pages/Dashboard'
import Clients from './pages/Clients'
import ClientDetail from './pages/ClientDetail'
import Orders from './pages/Orders'
import OrderDetail from './pages/OrderDetail'
import VoivodeshipMap from './pages/VoivodeshipMap'
import AutoLeads from './pages/AutoLeads'
import AutoContact from './pages/AutoContact'

const NAV = [
  { to: '/', label: '📊 Dashboard' },
  { to: '/mapa', label: '🗺️ Mapa Województw' },
  { to: '/klienci', label: '👥 Klienci' },
  { to: '/zlecenia', label: '📋 Zlecenia' },
  { to: '/auto-leads', label: '🚀 AUTO-LEADS' },
  { to: '/auto-kontakt', label: '📧 AUTO-KONTAKT' },
]

export default function App() {
  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="w-64 bg-blue-900 text-white flex flex-col">
        <div className="p-4 border-b border-blue-700">
          <div className="text-xl font-bold">🇵🇱 Auto Leads</div>
          <div className="text-xs text-blue-300 mt-1">System Pozyskiwania Klientów</div>
        </div>
        <nav className="flex-1 py-4">
          {NAV.map(({ to, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `block px-4 py-2.5 text-sm transition-colors ${
                  isActive ? 'bg-blue-700 text-white font-semibold' : 'text-blue-200 hover:bg-blue-800'
                }`
              }
            >
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="p-4 text-xs text-blue-400 border-t border-blue-700">
          Polska Auto Leads Engine v1.0
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/mapa" element={<VoivodeshipMap />} />
          <Route path="/klienci" element={<Clients />} />
          <Route path="/klienci/:id" element={<ClientDetail />} />
          <Route path="/zlecenia" element={<Orders />} />
          <Route path="/zlecenia/:id" element={<OrderDetail />} />
          <Route path="/auto-leads" element={<AutoLeads />} />
          <Route path="/auto-kontakt" element={<AutoContact />} />
        </Routes>
      </main>
    </div>
  )
}
