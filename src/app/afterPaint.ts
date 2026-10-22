// A rAF callback runs just before the next paint, so work started there would
// still block that paint. Deferring once more lets the frame land first.
export function afterPaint(work: () => void) {
  requestAnimationFrame(() => setTimeout(work, 0));
}
