import React, { useEffect, useState } from 'react'
import api from '../api/api'

export default function AutoSecurity() {
  const [status, setStatus] = useState(null)
  const [blockedIps, setBlockedIps] = useState([])
  const [auditTrail, setAuditTrail] = useState([])
  const [threats, setThreats] = useState([])
  const [ip, setIp] = useState('')
  const [reason, setReason] = useState('Manualna blokada')
  const [backupResult, setBackupResult] = useState(null)

  const loadData = async () => {
    try {
      const [statusRes, blockedRes, auditRes, threatsRes] = await Promise.all([
        api.get('/security/status'),
        api.get('/security/blocked-ips'),
        api.get('/security/audit-trail', { params: { limit: 20 } }),
        api.get('/security/threats'),
      ])
      setStatus(statusRes.data)
      setBlockedIps(blockedRes.data)
      setAuditTrail(auditRes.data)
      setThreats(threatsRes.data)
    } catch {
      setStatus(null)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleBlockIp = async () => {
    if (!ip) return
    await api.post('/security/block-ip', { ip, reason })
    setIp('')
    await loadData()
  }

  const handleUnblock = async (targetIp) => {
    await api.delete(`/security/blocked-ips/${targetIp}`)
    await loadData()
  }

  const handleBackup = async () => {
    const response = await api.post('/security/backup')
    setBackupResult(response.data)
    await loadData()
  }

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">🛡️ AUTO-SECURITY</h1>
        <p className="mt-1 text-sm text-gray-500">Zarządzanie bezpieczeństwem, audytem i backupami.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="rounded-2xl border bg-white p-5">
          <div className="text-sm text-gray-500">Zablokowane IP</div>
          <div className="mt-2 text-3xl font-bold text-red-600">{status?.blocked_ips ?? 0}</div>
        </div>
        <div className="rounded-2xl border bg-white p-5">
          <div className="text-sm text-gray-500">Threats</div>
          <div className="mt-2 text-3xl font-bold text-amber-600">{status?.threats_detected ?? threats.length}</div>
        </div>
        <div className="rounded-2xl border bg-white p-5">
          <div className="text-sm text-gray-500">Backup schedule</div>
          <div className="mt-2 text-xl font-semibold text-blue-600">{status?.backup_schedule ?? '24h'}</div>
        </div>
        <div className="rounded-2xl border bg-white p-5">
          <div className="text-sm text-gray-500">Status</div>
          <div className="mt-2 text-xl font-semibold text-green-600">{status?.status ?? 'offline'}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="rounded-2xl border bg-white p-6 xl:col-span-1 space-y-4">
          <h2 className="text-lg font-semibold">Akcje bezpieczeństwa</h2>
          <div className="space-y-3">
            <input
              value={ip}
              onChange={(e) => setIp(e.target.value)}
              placeholder="Adres IP, np. 192.168.0.10"
              className="w-full rounded-xl border px-4 py-2 text-sm"
            />
            <input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Powód blokady"
              className="w-full rounded-xl border px-4 py-2 text-sm"
            />
            <button onClick={handleBlockIp} className="w-full rounded-xl bg-red-600 px-4 py-2 font-semibold text-white hover:bg-red-700">
              Zablokuj IP
            </button>
            <button onClick={handleBackup} className="w-full rounded-xl bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700">
              Backup teraz
            </button>
          </div>
          {backupResult && (
            <div className="rounded-xl bg-blue-50 p-4 text-sm text-blue-700">
              Backup: {new Date(backupResult.backup_ts).toLocaleString('pl-PL')} · klienci {backupResult.records.clients} · zlecenia {backupResult.records.orders}
            </div>
          )}
          <div className="rounded-xl bg-amber-50 p-4 text-sm text-amber-700">
            Ostatnie zagrożenia: <span className="font-semibold">{threats.length}</span>
          </div>
        </div>

        <div className="rounded-2xl border bg-white p-6 xl:col-span-2 overflow-hidden">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Blocked IPs</h2>
            <span className="text-sm text-gray-500">{blockedIps.length} rekordów</span>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 text-gray-500">
                <tr>
                  <th className="px-4 py-3 text-left">IP</th>
                  <th className="px-4 py-3 text-left">Powód</th>
                  <th className="px-4 py-3 text-left">Data</th>
                  <th className="px-4 py-3 text-right">Akcja</th>
                </tr>
              </thead>
              <tbody>
                {blockedIps.map((item) => (
                  <tr key={item.ip} className="border-t">
                    <td className="px-4 py-3 font-medium">{item.ip}</td>
                    <td className="px-4 py-3">{item.reason}</td>
                    <td className="px-4 py-3 text-gray-500">{new Date(item.ts).toLocaleString('pl-PL')}</td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => handleUnblock(item.ip)} className="rounded-lg border px-3 py-1 text-red-600 hover:bg-red-50">
                        Unblock
                      </button>
                    </td>
                  </tr>
                ))}
                {!blockedIps.length && (
                  <tr><td colSpan="4" className="px-4 py-8 text-center text-gray-400">Brak zablokowanych adresów.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="rounded-2xl border bg-white p-6 overflow-hidden">
          <h2 className="mb-4 text-lg font-semibold">Recent audit trail</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 text-gray-500">
                <tr>
                  <th className="px-4 py-3 text-left">Action</th>
                  <th className="px-4 py-3 text-left">IP</th>
                  <th className="px-4 py-3 text-left">Endpoint</th>
                  <th className="px-4 py-3 text-left">TS</th>
                </tr>
              </thead>
              <tbody>
                {auditTrail.map((entry) => (
                  <tr key={entry.id} className="border-t">
                    <td className="px-4 py-3 font-medium">{entry.action}</td>
                    <td className="px-4 py-3">{entry.ip}</td>
                    <td className="px-4 py-3">{entry.endpoint}</td>
                    <td className="px-4 py-3 text-gray-500">{entry.ts ? new Date(entry.ts).toLocaleString('pl-PL') : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-2xl border bg-white p-6 overflow-hidden">
          <h2 className="mb-4 text-lg font-semibold">Threat detections</h2>
          <div className="space-y-3">
            {threats.map((threat, index) => (
              <div key={`${threat.ip}-${index}`} className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                <div className="font-semibold text-amber-800">{threat.reason}</div>
                <div className="mt-1 text-sm text-amber-700">{threat.ip} · {threat.endpoint || 'system'} · {new Date(threat.ts).toLocaleString('pl-PL')}</div>
              </div>
            ))}
            {!threats.length && <div className="text-sm text-gray-400">Brak aktywnych zagrożeń.</div>}
          </div>
        </div>
      </div>
    </div>
  )
}
