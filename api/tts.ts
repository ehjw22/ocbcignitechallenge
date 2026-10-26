import type { IncomingMessage, ServerResponse } from 'node:http'
import { handleTts } from '../server/tts.js'

export default function handler(req: IncomingMessage, res: ServerResponse) {
  return handleTts(req, res)
}
