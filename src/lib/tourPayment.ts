/** True when a real-mode guided tour is active (no practice) — payments must not execute. */
export function tourBlocksRealPayment(touring: boolean, practice: boolean) {
  return touring && !practice
}