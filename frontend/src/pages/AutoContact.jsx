import React, { useEffect, useState } from 'react'
import api from '../api/api'

const TEMPLATES = {
  fryzjer: 'Szanowni Państwo,\n\nZwracamy się z propozycją współpracy w zakresie dostarczania wysokiej jakości produktów do pielęgnacji dla Państwa salonu fryzjerskiego. Chętnie umówimy się na rozmowę i przedstawimy naszą ofertę.\n\nZ poważaniem,\nZespół Auto Leads',
  mechanik: 'Szanowni Państwo,\n\nOferujemy Państwu kompleksowe wsparcie w zakresie zaopatrzenia warsztatu samochodowego. Nasza oferta obejmuje narzędzia, części i systemy diagnostyczne w konkurencyjnych cenach.\n\nZ poważaniem,\nZespół Auto Leads',
  restauracja: 'Szanowni Państwo,\n\nZapraszamy do zapoznania się z naszą ofertą dostaw produktów spożywczych i wyposażenia dla restauracji. Zapewniamy najwyższą jakość i terminowe dostawy.\n\nZ poważaniem,\nZespół Auto Leads',
  default: 'Szanowni Państwo,\n\nChcielibyśmy zaproponować Państwu współpracę, która pomoże rozwinąć Państwa działalność. Jesteśmy gotowi dostosować ofertę do Państwa potrzeb.\n\nZ poważaniem,\nZespół Auto Leads',
}

export default function AutoContact() {
  const [clients, setClients] = useState([])
  const [selected, setSelected] = useState(null)
  const [message, setMessage] = useState('')
  const [sent, setSent] = useState([])
  const [filters, setFilters] = useState({ voivodeship: '', industry: '', status: 'nowy' })
  const [voivodeships, setVoivodeships] = useState([])
  const [industries, setIndustries] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/voivodeships').then(r => setVoivodeships(r.data))
    api.get('/industries').then(r => setIndustries(r.data))
  }, [])

  useEffect(() => {
    setLoading(true)
    const params = Object.fromEntries(Object.entries(filters).filter(([, v]) => v !== ''))
    api.get('/clients', { params: { ...params, limit: 50 } })
      .then(r => { setClients(r.data.items); setLoading(false) })
      .catch(() => setLoading(false))
  }, [filters])

  const selectClient = (c) => {
    setSelected(c)
    const tmpl = TEMPLATES[c.industry.toLowerCase()] || TEMPLATES.default
    setMessage(tmpl)
  }

  const sendContact = async () => {
    if (!selected) return
    // Mark client as "do_kontaktu" in the first order
    // (In production, this would send an actual email)
    setSent(prev => [...prev, selected.id])
    await api.patch(`/clients/${selected.id}/status`, null, { params: { status: 'zweryfikowany' } })
    setClients(prev => prev.map(c => c.id === selected.id ? { ...c, status: 'zweryfikowany' } : c))
    setSelected(null)
    setMessage('')
  }

  const set = (k, v) => setFilters(f => ({ ...f, [k]: v }))

  return (
    <div className="p-4 md:p-8 max-w-6xl">
      <h1 className="text-2xl font-bold mb-2">📧 AUTO-KONTAKT</h1>
      <p className="text-gray-500 text-sm mb-6">Przeglądaj klientów i generuj spersonalizowane wiadomości kontaktowe.</p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Client list */}
        <div>
          <div className="bg-white rounded-xl border p-4 mb-4">
            <h2 className="font-semibold mb-3 text-sm">Filtry klientów</h2>
            <div className="flex flex-wrap gap-2">
              <select className="border rounded px-2 py-1.5 text-sm flex-1 min-w-[120px]" value={filters.voivodeship} onChange={e => set('voivodeship', e.target.value)}>
                <option value="">Wszystkie województwa</option>
                {voivodeships.map(v => <option key={v.voivodeship} value={v.voivodeship}>{v.voivodeship}</option>)}
              </select>
              <select className="border rounded px-2 py-1.5 text-sm flex-1 min-w-[120px]" value={filters.industry} onChange={e => set('industry', e.target.value)}>
                <option value="">Wszystkie branże</option>
                {industries.map(i => <option key={i.id} value={i.name}>{i.name}</option>)}
              </select>
              <select className="border rounded px-2 py-1.5 text-sm" value={filters.status} onChange={e => set('status', e.target.value)}>
                <option value="">Wszystkie statusy</option>
                <option value="nowy">nowy</option>
                <option value="zweryfikowany">zweryfikowany</option>
                <option value="odrzucony">odrzucony</option>
              </select>
            </div>
          </div>

          <div className="bg-white rounded-xl border overflow-hidden max-h-[480px] overflow-y-auto">
            {loading ? (
              <div className="p-6 text-gray-400 text-sm text-center">Ładowanie...</div>
            ) : clients.length === 0 ? (
              <div className="p-6 text-gray-400 text-sm text-center">Brak klientów. Uruchom pipeline w AUTO-LEADS.</div>
            ) : (
              clients.map(c => (
                <div
                  key={c.id}
                  onClick={() => selectClient(c)}
                  className={`px-4 py-3 border-b cursor-pointer transition-colors hover:bg-blue-50 ${selected?.id === c.id ? 'bg-blue-50 border-l-2 border-l-blue-500' : ''}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-medium text-sm truncate">{c.company_name}</div>
                      <div className="text-xs text-gray-500">{c.industry} · {c.city}</div>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${c.status === 'nowy' ? 'bg-blue-100 text-blue-700' : c.status === 'zweryfikowany' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                        {c.status}
                      </span>
                      {sent.includes(c.id) && <span className="text-xs text-green-600">✓ Wysłano</span>}
                    </div>
                  </div>
                  {c.email && <div className="text-xs text-gray-400 mt-1 truncate">{c.email}</div>}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Message composer */}
        <div>
          <div className="bg-white rounded-xl border p-5">
            <h2 className="font-semibold mb-4">Wiadomość kontaktowa</h2>
            {!selected ? (
              <div className="text-gray-400 text-sm py-8 text-center">← Wybierz klienta z listy, aby wygenerować wiadomość</div>
            ) : (
              <>
                <div className="mb-4 p-3 bg-gray-50 rounded-lg text-sm">
                  <div className="font-medium">{selected.company_name}</div>
                  <div className="text-gray-500 text-xs mt-1">{selected.email || 'Brak emaila'} · {selected.phone || 'Brak telefonu'}</div>
                  <div className="text-gray-500 text-xs">{selected.city}, {selected.voivodeship}</div>
                </div>

                <div className="mb-3">
                  <label className="block text-xs font-medium text-gray-600 mb-1">Do: {selected.email || '(brak adresu email)'}</label>
                  <label className="block text-xs font-medium text-gray-600 mb-2">Temat: Propozycja współpracy — {selected.industry}</label>
                  <textarea
                    value={message}
                    onChange={e => setMessage(e.target.value)}
                    rows={10}
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
                  />
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={sendContact}
                    disabled={!selected.email}
                    className={`flex-1 py-2.5 rounded-lg text-white font-semibold text-sm transition-colors ${selected.email ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-300 cursor-not-allowed'}`}
                  >
                    {selected.email ? '📧 Oznacz jako skontaktowany' : '⚠ Brak adresu email'}
                  </button>
                  <button
                    onClick={() => { setSelected(null); setMessage('') }}
                    className="px-4 py-2.5 rounded-lg border text-sm text-gray-600 hover:bg-gray-50"
                  >
                    Anuluj
                  </button>
                </div>

                {!selected.email && (
                  <p className="text-xs text-gray-400 mt-2">Klient nie posiada adresu email. W wersji produkcyjnej można skontaktować się telefonicznie: {selected.phone || '–'}</p>
                )}
              </>
            )}
          </div>

          {sent.length > 0 && (
            <div className="mt-4 bg-green-50 border border-green-200 rounded-xl p-4">
              <div className="text-green-700 font-semibold text-sm">✅ Skontaktowano z {sent.length} klientem/-ami</div>
              <div className="text-xs text-green-600 mt-1">Status klientów zmieniony na "zweryfikowany"</div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
