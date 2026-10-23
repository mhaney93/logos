import { useEffect, useRef, useState, type RefObject } from "react";
import type { Viewport } from "@xyflow/react";
import { autoscrollVelocity } from "@/lib/autoscroll";

type Point = { x: number; y: number };

// Middle click toggles a browser-style autoscroll: the map pans toward the
// pointer, faster the farther it strays from where the mode was turned on.
export function useMiddleClickAutoscroll(
  containerRef: RefObject<HTMLElement | null>,
  getViewport: () => Viewport,
  setViewport: (viewport: Viewport) => void,
) {
  // Anchor in client coordinates, plus where to draw it inside the container.
  const [anchor, setAnchor] = useState<{ client: Point; local: Point } | null>(null);
  const pointer = useRef<Point>({ x: 0, y: 0 });

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    // Capture phase, so React Flow's own middle-button drag never sees it.
    const onMouseDown = (e: MouseEvent) => {
      if (e.button !== 1) return;
      e.preventDefault();
      e.stopPropagation();
      const rect = container.getBoundingClientRect();
      pointer.current = { x: e.clientX, y: e.clientY };
      setAnchor((on) =>
        on
          ? null
          : { client: { x: e.clientX, y: e.clientY }, local: { x: e.clientX - rect.left, y: e.clientY - rect.top } },
      );
    };
    container.addEventListener("mousedown", onMouseDown, { capture: true });
    return () => container.removeEventListener("mousedown", onMouseDown, { capture: true });
  }, [containerRef]);

  useEffect(() => {
    if (!anchor) return;
    const stop = () => setAnchor(null);
    const onMouseMove = (e: MouseEvent) => {
      pointer.current = { x: e.clientX, y: e.clientY };
    };
    const onMouseOut = (e: MouseEvent) => {
      if (!e.relatedTarget) stop();
    };
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("blur", stop);
    document.addEventListener("mouseout", onMouseOut);

    let frame = requestAnimationFrame(function tick(now: number, last = now) {
      const dt = (now - last) / 1000;
      const v = autoscrollVelocity(pointer.current.x - anchor.client.x, pointer.current.y - anchor.client.y);
      if (dt > 0 && (v.x || v.y)) {
        const { x, y, zoom } = getViewport();
        setViewport({ x: x - v.x * dt, y: y - v.y * dt, zoom });
      }
      frame = requestAnimationFrame((next) => tick(next, now));
    });

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("blur", stop);
      document.removeEventListener("mouseout", onMouseOut);
    };
  }, [anchor, getViewport, setViewport]);

  return anchor?.local ?? null;
}
