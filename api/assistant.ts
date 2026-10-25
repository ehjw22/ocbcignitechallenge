import type { IncomingMessage, ServerResponse } from 'node:http'
import { handleAssistant } from '../server/chat'

export default function handler(req: IncomingMessage, res: ServerResponse) {
  if (req.method !== 'GET') {
    res.statusCode = 405
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify({ error: 'method' }))
    return
  }
  return handleAssistant(req, res)
}
