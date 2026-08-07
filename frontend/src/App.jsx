import React, { useState } from 'react'
import { Routes, Route, NavLink } from 'react-router-dom'
import Dashboard from './pages/Dashboard'
import Clients from './pages/Clients'
import ClientDetail from './pages/ClientDetail'
import Orders from './pages/Orders'
import OrderDetail from './pages/OrderDetail'
import VoivodeshipMap from './pages/VoivodeshipMap'
import AutoLeads from './pages/AutoLeads'
import AutoContact from './pages/AutoContact'
import AutoStatus from './pages/AutoStatus'
import AutoSecurity from './pages/AutoSecurity'
import AutoAnalytics from './pages/AutoAnalytics'
import AutoBiznes from './pages/AutoBiznes'
import AutoDevPlatform from './pages/AutoDevPlatform'
import AutoMarketplace from './pages/AutoMarketplace'
import AutoAgency from './pages/AutoAgency'
import AutoLanding from './pages/AutoLanding'
import AutoRozwoj from './pages/AutoRozwoj'

const NAV = [
  { to: '/', label: '📊 Dashboard' },
  { to: '/mapa', label: '🗺️ Mapa Województw' },
  { to: '/klienci', label: '👥 Klienci' },
  { to: '/zlecenia', label: '📋 Zlecenia' },
  { to: '/auto-leads', label: '🚀 AUTO-LEADS' },
  { to: '/auto-status', label: '📡 AUTO-STATUS' },
  { to: '/auto-kontakt', label: '📧 AUTO-KONTAKT' },
  { to: '/auto-security', label: '🛡️ AUTO-SECURITY' },
  { to: '/auto-analytics', label: '📊 AUTO-ANALYTICS' },
  { to: '/auto-biznes', label: '💰 AUTO-BIZNES' },
  { to: '/auto-dev', label: '🧩 DEV PLATFORM' },
  { to: '/marketplace', label: '🏪 Marketplace' },
  { to: '/agencja', label: '🏢 Agencja' },
  { to: '/landing', label: '🌐 Landing' },
  { to: '/auto-rozwoj', label: '🧠 AUTO-ROZWÓJ' },
]

function Sidebar({ onClose }) {
  return (
    <aside className="w-64 bg-blue-900 text-white flex flex-col h-full">
      <div className="p-4 border-b border-blue-700 flex items-center justify-between">
        <div>
          <div className="text-xl font-bold">🇵🇱 Auto Leads</div>
          <div className="text-xs text-blue-300 mt-1">System Pozyskiwania Klientów</div>
        </div>
        {onClose && (
          <button onClick={onClose} className="text-blue-300 hover:text-white text-2xl leading-none md:hidden ml-2">✕</button>
        )}
      </div>
      <nav className="flex-1 py-4 overflow-y-auto">
        {NAV.map(({ to, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            onClick={onClose}
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
        Polska Auto Leads Engine v2.0
      </div>
    </aside>
  )
}

export default function App() {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Desktop sidebar */}
      <div className="hidden md:flex flex-col w-64 min-h-screen fixed top-0 left-0 z-20">
        <Sidebar />
      </div>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-30 flex md:hidden">
          <div className="flex flex-col w-72 min-h-screen shadow-2xl">
            <Sidebar onClose={() => setMobileOpen(false)} />
          </div>
          <div className="flex-1 bg-black bg-opacity-50" onClick={() => setMobileOpen(false)} />
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col md:ml-64 min-h-screen">
        {/* Mobile top bar */}
        <header className="md:hidden bg-blue-900 text-white flex items-center px-4 py-3 sticky top-0 z-10">
          <button onClick={() => setMobileOpen(true)} className="text-white text-2xl mr-3 leading-none">☰</button>
          <span className="font-bold text-lg">🇵🇱 Auto Leads</span>
        </header>

        <main className="flex-1 overflow-auto">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/mapa" element={<VoivodeshipMap />} />
            <Route path="/klienci" element={<Clients />} />
            <Route path="/klienci/:id" element={<ClientDetail />} />
            <Route path="/zlecenia" element={<Orders />} />
            <Route path="/zlecenia/:id" element={<OrderDetail />} />
            <Route path="/auto-leads" element={<AutoLeads />} />
            <Route path="/auto-status" element={<AutoStatus />} />
            <Route path="/auto-kontakt" element={<AutoContact />} />
            <Route path="/auto-security" element={<AutoSecurity />} />
            <Route path="/auto-analytics" element={<AutoAnalytics />} />
            <Route path="/auto-biznes" element={<AutoBiznes />} />
            <Route path="/auto-dev" element={<AutoDevPlatform />} />
            <Route path="/marketplace" element={<AutoMarketplace />} />
            <Route path="/agencja" element={<AutoAgency />} />
            <Route path="/landing" element={<AutoLanding />} />
            <Route path="/auto-rozwoj" element={<AutoRozwoj />} />
          </Routes>
        </main>
      </div>
    </div>
  )
}
