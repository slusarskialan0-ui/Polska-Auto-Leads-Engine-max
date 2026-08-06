import React, { useEffect, useState } from 'react'
import api from '../api/api'

export default function AutoBiznes() {
  const [pricing, setPricing] = useState(null)
  const [billing, setBilling] = useState(null)
  const [usage, setUsage] = useState(null)
  const [marketplace, setMarketplace] = useState([])

  useEffect(() => {
    const load = async () => {
      const [pricingRes, billingRes, usageRes, marketplaceRes] = await Promise.all([
        api.get('/biznes/pricing'),
        api.get('/biznes/billing'),
        api.get('/biznes/usage'),
        api.get('/biznes/marketplace'),
      ])
      setPricing(pricingRes.data)
      setBilling(billingRes.data)
      setUsage(usageRes.data)
      setMarketplace(marketplaceRes.data)
    }
    load().catch(() => {})
  }, [])

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">💰 AUTO-BIZNES</h1>
        <p className="mt-1 text-sm text-gray-500">Pricing, billing i marketplace leadów.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {(pricing?.tiers || []).map((tier) => (
          <div key={tier.name} className={`rounded-2xl border p-6 ${pricing?.recommended === tier.name ? 'border-blue-600 bg-blue-50' : 'bg-white'}`}>
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">{tier.name}</h2>
              {pricing?.recommended === tier.name && <span className="rounded-full bg-blue-600 px-3 py-1 text-xs font-semibold text-white">Recommended</span>}
            </div>
            <div className="mt-4 text-4xl font-bold">{tier.price} zł</div>
            <div className="mt-1 text-sm text-gray-500">Leady: {tier.leads}</div>
            <ul className="mt-4 space-y-2 text-sm text-gray-600">
              {(tier.features || []).map((feature) => <li key={feature}>✓ {feature}</li>)}
            </ul>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="rounded-2xl border bg-white p-6 xl:col-span-1">
          <h2 className="mb-4 text-lg font-semibold">Billing</h2>
          <div className="space-y-3 text-sm">
            {(billing?.invoices || []).map((invoice) => (
              <div key={invoice.id} className="rounded-xl border p-4">
                <div className="font-semibold">{invoice.id}</div>
                <div className="text-gray-500">{invoice.date} · {invoice.amount} zł · {invoice.status}</div>
              </div>
            ))}
            <div className="rounded-xl bg-gray-50 p-4">Next invoice: <span className="font-semibold">{billing?.next_invoice}</span></div>
          </div>
        </div>

        <div className="rounded-2xl border bg-white p-6 xl:col-span-1">
          <h2 className="mb-4 text-lg font-semibold">Usage stats</h2>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-xl bg-blue-50 p-4 text-blue-700">API today<br /><span className="text-2xl font-bold">{usage?.api_requests_today || 0}</span></div>
            <div className="rounded-xl bg-indigo-50 p-4 text-indigo-700">API month<br /><span className="text-2xl font-bold">{usage?.api_requests_month || 0}</span></div>
            <div className="rounded-xl bg-emerald-50 p-4 text-emerald-700">Leads<br /><span className="text-2xl font-bold">{usage?.leads_acquired || 0}</span></div>
            <div className="rounded-xl bg-amber-50 p-4 text-amber-700">Orders<br /><span className="text-2xl font-bold">{usage?.orders_created || 0}</span></div>
          </div>
          <div className="mt-4 rounded-xl bg-slate-50 p-4 text-sm text-slate-600">Demand factor: {pricing?.demand_factor || 1.0}</div>
        </div>

        <div className="rounded-2xl border bg-white p-6 xl:col-span-1">
          <h2 className="mb-4 text-lg font-semibold">Subscription</h2>
          <div className="rounded-xl bg-blue-600 p-5 text-white">
            <div className="text-sm opacity-80">Active plan</div>
            <div className="mt-1 text-3xl font-bold">{billing?.subscription || 'Pro'}</div>
          </div>
          <p className="mt-4 text-sm text-gray-500">Automatyczne skalowanie kampanii, billing i performance routing dla leadów B2B.</p>
        </div>
      </div>

      <div className="rounded-2xl border bg-white p-6 overflow-hidden">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Lead Marketplace</h2>
          <span className="text-sm text-gray-500">Top 20 leadów</span>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-gray-500">
              <tr>
                <th className="px-4 py-3 text-left">Firma</th>
                <th className="px-4 py-3 text-left">Branża</th>
                <th className="px-4 py-3 text-left">Miasto</th>
                <th className="px-4 py-3 text-left">Wartość</th>
              </tr>
            </thead>
            <tbody>
              {marketplace.map((lead) => (
                <tr key={lead.id} className="border-t">
                  <td className="px-4 py-3 font-medium">{lead.company_name}</td>
                  <td className="px-4 py-3">{lead.industry}</td>
                  <td className="px-4 py-3">{lead.city || lead.voivodeship}</td>
                  <td className="px-4 py-3 text-emerald-600">{lead.order_value.toLocaleString('pl-PL')} zł</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
