import type { IncomingMessage, ServerResponse } from 'node:http'
import { handleHealth } from '../server/chat'

export default function handler(req: IncomingMessage, res: ServerResponse) {
  return handleHealth(req, res)
}
