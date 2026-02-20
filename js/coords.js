/**
 * @fileoverview Coordinate system utilities.
 *
 * Terminology used throughout the app:
 *   world-px  — internal pixel space where vertices are stored
 *               (identity with canvas pixels at zoom=1, pan=(0,0))
 *   screen-px — physical on-screen pixels (after zoom/pan transform)
 *   user      — the coordinates shown to the user (CG or Math)
 */

import { state } from './state.js';
import { canvas } from './canvas.js';

// ── Origin ────────────────────────────────────────────────────────────────────

/**
 * World-px position of the active coordinate-system origin.
 *
 * @returns {{ x: number, y: number }}
 */
export function origin() {
  return state.coordSystem === 'cg'
    ? { x: 0, y: 0 }
    : { x: state.mathOx, y: state.mathOy };
}

// ── User ↔ World conversions ──────────────────────────────────────────────────

/**
 * Converts world-px coordinates to user-facing coordinates.
 *
 * @param {number} wx  World x
 * @param {number} wy  World y
 * @returns {{ x: number, y: number }}
 */
export function worldToUser(wx, wy) {
  if (state.coordSystem === 'cg') {
    return { x: Math.round(wx), y: Math.round(wy) };
  }
  const o = origin();
  return { x: Math.round(wx - o.x), y: Math.round(o.y - wy) };
}

/**
 * Converts user-facing coordinates to world-px coordinates.
 *
 * @param {number} ux  User x
 * @param {number} uy  User y
 * @returns {{ x: number, y: number }}
 */
export function userToWorld(ux, uy) {
  if (state.coordSystem === 'cg') {
    return { x: ux, y: uy };
  }
  const o = origin();
  return { x: o.x + ux, y: o.y - uy };
}

// ── Screen ↔ World conversions ────────────────────────────────────────────────

/**
 * Converts screen-px coordinates to world-px coordinates.
 *
 * @param {number} sx  Screen x
 * @param {number} sy  Screen y
 * @returns {{ x: number, y: number }}
 */
export function screenToWorld(sx, sy) {
  return {
    x: (sx - state.panX) / state.zoom,
    y: (sy - state.panY) / state.zoom,
  };
}

// ── View bounds ───────────────────────────────────────────────────────────────

/**
 * Returns the visible world-px bounding box for the current view transform.
 *
 * @returns {{ left: number, top: number, right: number, bottom: number }}
 */
export function visibleBounds() {
  const { zoom, panX, panY } = state;
  return {
    left:   -panX / zoom,
    top:    -panY / zoom,
    right:  (canvas.width  - panX) / zoom,
    bottom: (canvas.height - panY) / zoom,
  };
}
