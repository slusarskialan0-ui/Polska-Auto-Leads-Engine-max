import axios from 'axios'

const FALLBACK_API = 'http://localhost:8000'

const readProjectId = () => window.localStorage.getItem('pale-project-id') || 'default'
const saveProjectId = (value) => {
  const normalized = (value || '').trim() || 'default'
  window.localStorage.setItem('pale-project-id', normalized)
  window.dispatchEvent(new Event('pale:project-changed'))
  return normalized
}
const readStoredApi = () => window.localStorage.getItem('pale-api-url')

const resolveInitialBase = () => {
  if (import.meta.env.VITE_API_URL) return import.meta.env.VITE_API_URL
  if (typeof window === 'undefined') return FALLBACK_API
  return readStoredApi() || FALLBACK_API
}

const api = axios.create({
  baseURL: resolveInitialBase(),
  timeout: 30000,
})

export async function bootstrapApiConfig() {
  if (import.meta.env.VITE_API_URL || typeof window === 'undefined') return api.defaults.baseURL
  try {
    const response = await fetch('/api-config')
    if (!response.ok) throw new Error('api-config unavailable')
    const data = await response.json()
    if (data?.api_url) {
      api.defaults.baseURL = data.api_url
      window.localStorage.setItem('pale-api-url', data.api_url)
      return data.api_url
    }
  } catch {
    api.defaults.baseURL = readStoredApi() || FALLBACK_API
  }
  return api.defaults.baseURL
}

api.interceptors.request.use((config) => {
  const projectId = readProjectId()
  config.headers = config.headers || {}
  config.headers['X-Project-Id'] = projectId
  return config
})

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (!error.response && typeof navigator !== 'undefined' && !navigator.onLine) {
      return Promise.reject(new Error('offline'))
    }
    return Promise.reject(error)
  }
)

export default api
export const getApiBase = () => api.defaults.baseURL
export { readProjectId, saveProjectId }
