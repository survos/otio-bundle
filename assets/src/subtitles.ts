/**
 * Narration as subtitles: short chunks (sentences, split at clause breaks when long), each shown
 * for its share of the clip by word count, so a paragraph never fills the frame at once.
 */
export function subtitleChunks(text: string, maxWords = 14): string[] {
  const chunks: string[] = [];
  for (const sentence of text.trim().split(/(?<=[.!?…])\s+/u).filter(Boolean)) {
    let current: string[] = [];
    for (const piece of sentence.split(/(?<=[,;:—])\s+/u)) {
      const words = piece.split(/\s+/u).filter(Boolean);
      if (current.length && current.length + words.length > maxWords) {
        chunks.push(current.join(' '));
        current = [];
      }
      current.push(...words);
      while (current.length > maxWords) chunks.push(current.splice(0, maxWords).join(' '));
    }
    if (current.length) chunks.push(current.join(' '));
  }
  return chunks;
}

/** The chunk showing at `progress` (0–1 through the clip), weighted by each chunk's length. */
export function subtitleAt(chunks: string[], progress: number): string {
  const total = chunks.reduce((sum, c) => sum + c.length, 0);
  let edge = 0;
  for (const chunk of chunks) {
    edge += chunk.length / total;
    if (progress < edge) return chunk;
  }
  return chunks[chunks.length - 1] ?? '';
}
