import axios from 'axios'

// AUTO-CONNECT: reads API URL from env (set by Vite) or falls back to localhost:8000
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'

const api = axios.create({
  baseURL: API_BASE,
  timeout: 30000,
})

export default api
export { API_BASE }
