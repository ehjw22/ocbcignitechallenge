/** Demo-only PIN for voice/chat transfers — never sent to Ollie or logged. */
export const DEMO_VOICE_TRANSFER_PIN = '123456'
export const VOICE_TRANSFER_PIN_LENGTH = 6
export const VOICE_TRANSFER_PIN_MAX_ATTEMPTS = 3

export type VoiceTransferPinAttempt =
  | { ok: true }
  | { ok: false; reason: 'wrong'; attemptsLeft: number }
  | { ok: false; reason: 'locked' }

/** Evaluates one PIN attempt after `attemptsUsed` failed tries (0–2). */
export function attemptVoiceTransferPin(entered: string, attemptsUsed: number, expected = DEMO_VOICE_TRANSFER_PIN): VoiceTransferPinAttempt {
  if (attemptsUsed >= VOICE_TRANSFER_PIN_MAX_ATTEMPTS) return { ok: false, reason: 'locked' }
  if (entered.length === VOICE_TRANSFER_PIN_LENGTH && entered === expected) return { ok: true }
  const failed = attemptsUsed + 1
  if (failed >= VOICE_TRANSFER_PIN_MAX_ATTEMPTS) return { ok: false, reason: 'locked' }
  return { ok: false, reason: 'wrong', attemptsLeft: VOICE_TRANSFER_PIN_MAX_ATTEMPTS - failed }
}