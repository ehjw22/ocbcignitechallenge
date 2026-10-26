import { defineConfig, loadEnv, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { handleAssistant, handleChat, handleHealth } from './server/chat'
import { handleTts } from './server/tts'

const root = path.dirname(fileURLToPath(import.meta.url))

const LOCAL_KEYS = [
  'LLM_API_KEY',
  'LLM_BASE_URL',
  'LLM_MODEL',
  'LLM_FALLBACK_MODEL',
  'OPENAI_API_KEY',
  'AZURE_SPEECH_KEY',
  'AZURE_SPEECH_REGION',
  'GOOGLE_TTS_API_KEY',
]

function applyLocalEnv() {
  const fileEnv = loadEnv(process.env.NODE_ENV === 'production' ? 'production' : 'development', root, '')
  for (const key of LOCAL_KEYS) {
    if (!process.env[key] && fileEnv[key]) process.env[key] = fileEnv[key]
  }
}

function apiPlugin(): Plugin {
  const handler = async (req: IncomingMessage, res: ServerResponse) => {
    const url = req.url?.split('?')[0] ?? ''
    if (!url.startsWith('/api/')) return false
    applyLocalEnv()
    try {
      if (url === '/api/assistant' && req.method === 'GET') {
        await handleAssistant(req, res)
        return true
      }
      if (url === '/api/health' && req.method === 'GET') {
        handleHealth(req, res)
        return true
      }
      if (url === '/api/chat' && req.method === 'POST') {
        await handleChat(req, res)
        return true
      }
      if (url === '/api/tts' && req.method === 'POST') {
        await handleTts(req, res)
        return true
      }
      res.statusCode = 404
      res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify({ error: 'not found' }))
      return true
    } catch {
      if (!res.headersSent) {
        res.statusCode = 500
        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify({ error: 'error' }))
      }
      return true
    }
  }

  const attach = (middlewares: { use: (fn: (req: IncomingMessage, res: ServerResponse, next: () => void) => void) => void }) => {
    middlewares.use((req, res, next) => {
      void handler(req, res).then((handled) => {
        if (!handled) next()
      })
    })
  }

  return {
    name: 'ocbc-api',
    configureServer(server) {
      attach(server.middlewares)
    },
    configurePreviewServer(server) {
      attach(server.middlewares)
    },
  }
}

export default defineConfig({
  plugins: [react(), apiPlugin()],
  resolve: {
    alias: { '@': path.join(root, 'src') },
  },
  server: { port: 5173, host: '127.0.0.1', allowedHosts: true },
  preview: { port: 5173, host: '127.0.0.1', allowedHosts: true },
})
