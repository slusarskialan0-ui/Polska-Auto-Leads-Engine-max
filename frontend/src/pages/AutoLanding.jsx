import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../api/api'

const FEATURES = [
  'Automatyczne pozyskiwanie leadów B2B w całej Polsce',
  'Pipeline województw z monitoringiem statusów',
  'Analytics, churn i revenue dashboard dla SaaS',
  'Developer platform z API keys i sandboxem',
]

export default function AutoLanding() {
  const [pricing, setPricing] = useState([])

  useEffect(() => {
    document.title = 'Polska Auto Leads Engine — Landing'
    api.get('/biznes/pricing').then((response) => setPricing(response.data.tiers || [])).catch(() => {})
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 text-white">
      <div className="mx-auto max-w-6xl px-8 py-16">
        <section className="grid gap-10 lg:grid-cols-2 items-center">
          <div>
            <div className="mb-4 inline-flex rounded-full border border-blue-400/30 bg-blue-500/10 px-4 py-2 text-sm text-blue-200">Lead generation SaaS dla automotive & usług</div>
            <h1 className="text-4xl md:text-6xl font-black leading-tight">🚀 Polska Auto Leads Engine — Pozyskuj klientów automatycznie</h1>
            <p className="mt-6 max-w-2xl text-lg text-blue-100/90">Uruchamiaj pipeline leadów, monitoruj sprzedaż i zarządzaj całą machiną growth w jednym panelu.</p>
            <div className="mt-8 flex flex-wrap gap-4">
              <Link to="/auto-leads" className="rounded-2xl bg-blue-500 px-6 py-3 font-semibold text-white hover:bg-blue-400">Zacznij teraz →</Link>
              <Link to="/auto-analytics" className="rounded-2xl border border-white/20 px-6 py-3 font-semibold hover:bg-white/10">Zobacz analytics</Link>
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {FEATURES.map((feature) => (
              <div key={feature} className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur">
                <div className="text-2xl">✨</div>
                <div className="mt-3 text-lg font-semibold">{feature}</div>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-20">
          <h2 className="text-3xl font-bold">Pricing</h2>
          <div className="mt-8 grid gap-6 md:grid-cols-3">
            {pricing.map((tier) => (
              <div key={tier.name} className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur">
                <div className="text-xl font-bold">{tier.name}</div>
                <div className="mt-4 text-4xl font-black">{tier.price} zł</div>
                <div className="mt-2 text-blue-100">Leady: {tier.leads}</div>
                <ul className="mt-4 space-y-2 text-sm text-blue-100/90">
                  {(tier.features || []).map((feature) => <li key={feature}>• {feature}</li>)}
                </ul>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}
