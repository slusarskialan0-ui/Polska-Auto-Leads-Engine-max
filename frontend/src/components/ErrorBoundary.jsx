import React from 'react'

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error) {
    console.error('Application error boundary caught an error', error)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-slate-950 px-6 text-white">
          <div className="max-w-md rounded-3xl border border-white/10 bg-white/5 p-8 text-center backdrop-blur">
            <div className="text-4xl">⚠️</div>
            <h1 className="mt-4 text-2xl font-bold">Aplikacja wymaga odświeżenia</h1>
            <p className="mt-3 text-sm text-slate-300">Wystąpił nieoczekiwany błąd interfejsu. Odśwież aplikację, aby wznowić pracę.</p>
            <button onClick={() => window.location.reload()} className="mt-6 rounded-2xl bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-500">
              Odśwież aplikację
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
