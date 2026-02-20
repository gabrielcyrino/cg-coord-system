/**
 * @fileoverview Shared mutable application state.
 *
 * All modules import this object and mutate its properties directly.
 * Keeping state centralised makes data flow easy to trace.
 */

/** @type {AppState} */
export const state = {
  // ── Coordinate system ────────────────────────────────────────────────────
  /** @type {'cg'|'math'} */
  coordSystem: 'cg',

  /** World-px position of the mathematical origin (set once on first resize). */
  mathOx: null,
  mathOy: null,

  // ── Edit mode ─────────────────────────────────────────────────────────────
  /** @type {'select'|'vertex'|'edge'} */
  mode: 'vertex',

  // ── Graph data ────────────────────────────────────────────────────────────
  /** @type {Array<{id:number, cx:number, cy:number}>} */
  vertices: [],

  /** @type {Array<{id:number, v1:number, v2:number}>} */
  edges: [],

  nextVid: 0,
  nextEid: 0,

  // ── Interaction ───────────────────────────────────────────────────────────
  /** ID of the first vertex selected during edge creation (null = none). */
  edgePending: null,

  /** ID of the currently selected vertex in select-mode (null = none). */
  selVertex: null,

  /** Reference to the vertex object being dragged (null = none). */
  dragVertex: null,

  /** Last known mouse position in world-px coords ({x, y} | null). */
  lastMouse: null,

  // ── View transform ────────────────────────────────────────────────────────
  zoom: 1,
  panX: 20,
  panY: 20,

  isPanning: false,
  panStartX: 0,
  panStartY: 0,
  panStartPanX: 0,
  panStartPanY: 0,

  // ── Info panel ────────────────────────────────────────────────────────────
  /** @type {'sys'|'diff'|'mode'} */
  activeTab: 'sys',
};

/** Grid spacing in world pixels at zoom = 1. */
export const GRID = 50;

/** Vertex visual radius in screen pixels. */
export const V_RADIUS = 8;
