import React, { useEffect, useMemo, useState } from 'react'
import { Routes, Route, NavLink, useLocation } from 'react-router-dom'
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
  { to: '/', label: '📊 Dashboard', short: 'Home' },
  { to: '/mapa', label: '🗺️ Mapa Województw', short: 'Mapa' },
  { to: '/klienci', label: '👥 Klienci', short: 'Klienci' },
  { to: '/zlecenia', label: '📋 Zlecenia', short: 'Zlecenia' },
  { to: '/auto-leads', label: '🚀 AUTO-LEADS', short: 'Leads' },
  { to: '/auto-status', label: '📡 AUTO-STATUS', short: 'Status' },
  { to: '/auto-kontakt', label: '📧 AUTO-KONTAKT', short: 'Kontakt' },
  { to: '/auto-security', label: '🛡️ AUTO-SECURITY', short: 'Security' },
  { to: '/auto-analytics', label: '📊 AUTO-ANALYTICS', short: 'Analytics' },
  { to: '/auto-biznes', label: '💰 AUTO-BIZNES', short: 'Biznes' },
  { to: '/auto-dev', label: '🧩 DEV PLATFORM', short: 'Dev' },
  { to: '/marketplace', label: '🏪 Marketplace', short: 'Market' },
  { to: '/agencja', label: '🏢 Agencja', short: 'Agencja' },
  { to: '/landing', label: '🌐 Landing', short: 'Landing' },
  { to: '/auto-rozwoj', label: '🧠 AUTO-ROZWÓJ', short: 'Roadmap' },
]

const MOBILE_NAV = NAV.filter(({ to }) => ['/', '/auto-leads', '/auto-status', '/auto-analytics', '/auto-dev'].includes(to))

function Sidebar({ onClose, projectId }) {
  return (
    <aside className="flex h-full w-64 flex-col bg-blue-950 text-white">
      <div className="flex items-center justify-between border-b border-blue-800 p-4">
        <div>
          <div className="text-xl font-bold">🇵🇱 Auto Leads</div>
          <div className="mt-1 text-xs text-blue-300">System Pozyskiwania Klientów</div>
        </div>
        {onClose && (
          <button onClick={onClose} className="ml-2 text-2xl leading-none text-blue-300 hover:text-white md:hidden">✕</button>
        )}
      </div>
      <div className="border-b border-blue-900 px-4 py-3 text-xs text-blue-200">
        projectId: <span className="font-semibold text-white">{projectId}</span>
      </div>
      <nav className="flex-1 overflow-y-auto py-4">
        {NAV.map(({ to, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            onClick={onClose}
            className={({ isActive }) =>
              `block px-4 py-2.5 text-sm transition-colors ${isActive ? 'bg-blue-700 text-white font-semibold' : 'text-blue-200 hover:bg-blue-900'}`
            }
          >
            {label}
          </NavLink>
        ))}
      </nav>
      <div className="border-t border-blue-800 p-4 text-xs text-blue-400">Polska Auto Leads Engine v3.1</div>
    </aside>
  )
}

export default function App() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [projectId, setProjectId] = useState(() => window.localStorage.getItem('pale-project-id') || 'default')
  const location = useLocation()

  useEffect(() => {
    const syncProjectId = () => setProjectId(window.localStorage.getItem('pale-project-id') || 'default')
    window.addEventListener('storage', syncProjectId)
    window.addEventListener('pale:project-changed', syncProjectId)
    return () => {
      window.removeEventListener('storage', syncProjectId)
      window.removeEventListener('pale:project-changed', syncProjectId)
    }
  }, [])

  useEffect(() => {
    const themeMeta = document.querySelector('meta[name="theme-color"]')
    if (!themeMeta) return
    themeMeta.setAttribute('content', location.pathname === '/landing' ? '#020617' : '#1e3a8a')
  }, [location.pathname])

  const pageLabel = useMemo(() => NAV.find((item) => item.to === location.pathname)?.label || 'AUTO-APP', [location.pathname])

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-900">
      <div className="fixed left-0 top-0 hidden min-h-screen w-64 md:flex">
        <Sidebar projectId={projectId} />
      </div>

      {mobileOpen && (
        <div className="fixed inset-0 z-40 flex md:hidden">
          <div className="flex min-h-screen w-72 flex-col shadow-2xl">
            <Sidebar onClose={() => setMobileOpen(false)} projectId={projectId} />
          </div>
          <button className="flex-1 bg-black/50" onClick={() => setMobileOpen(false)} aria-label="Zamknij menu" />
        </div>
      )}

      <div className="flex min-h-screen flex-1 flex-col md:ml-64">
        <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur">
          <div className="flex items-center justify-between px-4 py-3 md:hidden">
            <button onClick={() => setMobileOpen(true)} className="text-2xl leading-none text-slate-700">☰</button>
            <div>
              <div className="text-sm font-bold">🇵🇱 Auto Leads</div>
              <div className="text-xs text-slate-500">{pageLabel}</div>
            </div>
            <div className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">{projectId}</div>
          </div>
          <div className="hidden items-center justify-between px-6 py-3 md:flex">
            <div>
              <div className="text-sm font-semibold text-slate-900">{pageLabel}</div>
              <div className="text-xs text-slate-500">Premium AUTO-SYSTEM · PWA · mobile-first</div>
            </div>
            <div className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">projectId: {projectId}</div>
          </div>
        </header>

        <main className="flex-1 overflow-auto pb-24 md:pb-0">
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

        <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-slate-200 bg-white/95 backdrop-blur md:hidden">
          <div className="grid grid-cols-5">
            {MOBILE_NAV.map(({ to, short }) => (
              <NavLink
                key={to}
                to={to}
                end={to === '/'}
                className={({ isActive }) => `px-2 py-3 text-center text-[11px] font-semibold ${isActive ? 'text-blue-700' : 'text-slate-500'}`}
              >
                {short}
              </NavLink>
            ))}
          </div>
        </nav>
      </div>
    </div>
  )
}
