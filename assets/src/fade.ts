/** Timeline-relative, seek-safe envelope. First/last faded frames are fully silent/black. */
export function fadeLevel(frame: number, duration: number, fadeIn = 0, fadeOut = 0): number {
  const incoming = fadeIn > 0 ? frame / fadeIn : 1;
  const outgoing = fadeOut > 0 ? (duration - 1 - frame) / fadeOut : 1;
  return Math.max(0, Math.min(1, incoming, outgoing));
}
