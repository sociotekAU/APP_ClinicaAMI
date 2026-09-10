export const LONG_PRESS_DURATION_MS = 800;
export const LONG_PRESS_MOVE_TOLERANCE_PX = 12;

type PointerPosition = {
  x: number;
  y: number;
};

export function movedBeyondLongPressTolerance(
  start: PointerPosition,
  current: PointerPosition,
  tolerance = LONG_PRESS_MOVE_TOLERANCE_PX,
) {
  return Math.hypot(current.x - start.x, current.y - start.y) > tolerance;
}
