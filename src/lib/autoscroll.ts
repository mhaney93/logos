export const AUTOSCROLL_DEAD_ZONE = 12;
const AUTOSCROLL_GAIN = 0.05;
const AUTOSCROLL_MAX_SPEED = 6000;

// Pixels per second along each axis for a pointer offset from the anchor.
// Speed grows with the square of distance past the dead zone, so small nudges
// creep and long reaches race.
export function autoscrollVelocity(dx: number, dy: number) {
  const distance = Math.hypot(dx, dy);
  if (distance <= AUTOSCROLL_DEAD_ZONE) return { x: 0, y: 0 };
  const reach = distance - AUTOSCROLL_DEAD_ZONE;
  const speed = Math.min(AUTOSCROLL_GAIN * reach * reach, AUTOSCROLL_MAX_SPEED);
  return { x: (dx / distance) * speed, y: (dy / distance) * speed };
}
