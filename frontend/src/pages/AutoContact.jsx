import React from 'react'

export default function AutoContact() {
  return (
    <div className="p-8 max-w-3xl">
      <h1 className="text-2xl font-bold mb-4">📧 AUTO-KONTAKT</h1>
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 text-blue-700 mb-6">
        <div className="text-lg font-semibold mb-2">Moduł w przygotowaniu</div>
        <p className="text-sm">
          Ten moduł będzie służył do automatycznego generowania i wysyłania spersonalizowanych ofert oraz follow-upów do pozyskanych klientów.
        </p>
      </div>

      <div className="bg-white rounded-xl border p-6">
        <h2 className="font-semibold mb-4">Planowane funkcje:</h2>
        <ul className="space-y-3 text-sm text-gray-600">
          <li className="flex items-start gap-2">
            <span className="text-blue-500 mt-0.5">○</span>
            <span><strong>Generowanie ofert</strong> — automatyczne tworzenie spersonalizowanych ofert dla każdej branży i lokalizacji</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-500 mt-0.5">○</span>
            <span><strong>Email marketing</strong> — wysyłka ofert na adresy email pozyskanych klientów</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-500 mt-0.5">○</span>
            <span><strong>Follow-up sequences</strong> — automatyczne sekwencje wiadomości follow-up</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-500 mt-0.5">○</span>
            <span><strong>Szablony wiadomości</strong> — biblioteka szablonów per branża i województwo</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-500 mt-0.5">○</span>
            <span><strong>Historia kontaktów</strong> — śledzenie historii komunikacji z każdym klientem</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-500 mt-0.5">○</span>
            <span><strong>Statystyki kampanii</strong> — wskaźniki otwarć, kliknięć, odpowiedzi</span>
          </li>
        </ul>
      </div>
    </div>
  )
}
