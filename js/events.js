/**
 * @fileoverview Event listeners.
 *
 * Wires all user interactions — canvas mouse/wheel, keyboard shortcuts,
 * and sidebar buttons — to application logic.
 * Uses event delegation for dynamically generated lists.
 *
 * This module is imported for its side-effects only (no exports).
 */

import { state }                         from './state.js';
import { canvas }                        from './canvas.js';
import { screenToWorld, worldToUser }    from './coords.js';
import { draw }                          from './draw.js';
import { toggleTheme }                   from './theme.js';
import { showTab }                       from './info.js';
import {
  setMode, setCoordSystem,
  addVertex, addVertexByCoords,
  deleteVertex, deleteEdge,
  selectFromList, handleEdgeClick,
  vertexAt, clearAll,
  resetView, updateZoomLabel,
  refreshVertexList, setMsg,
} from './ui.js';

// ── Canvas: mouse move ────────────────────────────────────────────────────────

canvas.addEventListener('mousemove', e => {
  const { x: sx, y: sy } = _screenPos(e);

  // Middle-button pan
  if (state.isPanning) {
    state.panX = state.panStartPanX + (sx - state.panStartX);
    state.panY = state.panStartPanY + (sy - state.panStartY);
    draw();
    return;
  }

  const { x: wx, y: wy } = screenToWorld(sx, sy);
  state.lastMouse = { x: wx, y: wy };

  const uc = worldToUser(wx, wy);
  document.getElementById('st-pos').textContent = `Pos: (${uc.x}, ${uc.y})`;

  // Drag vertex
  if (state.dragVertex) {
    state.dragVertex.cx = wx;
    state.dragVertex.cy = wy;
    refreshVertexList();
    draw();
    return;
  }

  // Update cursor
  const hov = vertexAt(wx, wy);
  canvas.style.cursor = _cursor(hov !== null);

  // Redraw edge preview line
  if (state.mode === 'edge' && state.edgePending !== null) draw();
});

// ── Canvas: mouse down ────────────────────────────────────────────────────────

canvas.addEventListener('mousedown', e => {
  const { x: sx, y: sy } = _screenPos(e);

  // Middle button → start pan
  if (e.button === 1) {
    state.isPanning    = true;
    state.panStartX    = sx;
    state.panStartY    = sy;
    state.panStartPanX = state.panX;
    state.panStartPanY = state.panY;
    canvas.style.cursor = 'grabbing';
    e.preventDefault();
    return;
  }

  if (e.button !== 0) return;

  const { x: wx, y: wy } = screenToWorld(sx, sy);

  if (state.mode === 'select') {
    const v = vertexAt(wx, wy);
    if (v) {
      state.dragVertex = v;
      state.selVertex  = v.id;
      canvas.style.cursor = 'grabbing';
      draw();
    } else {
      state.selVertex = null;
      draw();
    }
  }
});

// ── Canvas: mouse up ──────────────────────────────────────────────────────────

canvas.addEventListener('mouseup', e => {
  if (e.button === 1) {
    state.isPanning = false;
    canvas.style.cursor = _cursor(false);
    return;
  }

  if (state.dragVertex) {
    state.dragVertex = null;
    canvas.style.cursor = _cursor(false);
    refreshVertexList();
  }
});

// ── Canvas: click ─────────────────────────────────────────────────────────────

canvas.addEventListener('click', e => {
  // Ignore if a drag or pan just ended
  if (state.dragVertex || state.isPanning) return;

  const { x: sx, y: sy } = _screenPos(e);
  const { x: wx, y: wy } = screenToWorld(sx, sy);

  switch (state.mode) {
    case 'vertex':
      addVertex(wx, wy);
      break;

    case 'edge':
      handleEdgeClick(wx, wy);
      break;

    case 'select': {
      const v = vertexAt(wx, wy);
      state.selVertex = v ? v.id : null;
      if (v) {
        const uc = worldToUser(v.cx, v.cy);
        setMsg(`V${v.id} — coords: (${uc.x}, ${uc.y})`);
      }
      draw();
      refreshVertexList();
      break;
    }
  }
});

// ── Canvas: mouse leave ───────────────────────────────────────────────────────

canvas.addEventListener('mouseleave', () => {
  state.lastMouse = null;
  state.isPanning = false;
  if (state.mode === 'edge' && state.edgePending !== null) draw();
});

// ── Canvas: scroll wheel (zoom) ───────────────────────────────────────────────

canvas.addEventListener('wheel', e => {
  e.preventDefault();
  const { x: sx, y: sy } = _screenPos(e);
  const factor = e.deltaY < 0 ? 1.15 : 1 / 1.15;
  const newZ   = Math.max(0.05, Math.min(30, state.zoom * factor));

  // Keep the world-point under the cursor fixed on screen
  state.panX = sx - (sx - state.panX) * (newZ / state.zoom);
  state.panY = sy - (sy - state.panY) * (newZ / state.zoom);
  state.zoom = newZ;

  updateZoomLabel();
  draw();
}, { passive: false });

// ── Keyboard shortcuts ────────────────────────────────────────────────────────

document.addEventListener('keydown', e => {
  if (e.ctrlKey && (e.key === '0' || e.key === 'Numpad0')) {
    e.preventDefault();
    resetView();
  }
});

// ── Sidebar: static buttons ───────────────────────────────────────────────────

document.getElementById('btn-cg')        .addEventListener('click', () => setCoordSystem('cg'));
document.getElementById('btn-math')      .addEventListener('click', () => setCoordSystem('math'));
document.getElementById('mode-select')   .addEventListener('click', () => setMode('select'));
document.getElementById('mode-vertex')   .addEventListener('click', () => setMode('vertex'));
document.getElementById('mode-edge')     .addEventListener('click', () => setMode('edge'));
document.getElementById('add-vertex-btn').addEventListener('click', addVertexByCoords);
document.getElementById('clear-btn')     .addEventListener('click', clearAll);
document.getElementById('reset-view-btn').addEventListener('click', resetView);
document.getElementById('theme-btn')     .addEventListener('click', () => { toggleTheme(); draw(); });

// Info tabs
document.getElementById('tab-sys') .addEventListener('click', () => showTab('sys'));
document.getElementById('tab-diff').addEventListener('click', () => showTab('diff'));
document.getElementById('tab-mode').addEventListener('click', () => showTab('mode'));

// ── Sidebar: vertex list (event delegation) ───────────────────────────────────

document.getElementById('vertex-list').addEventListener('click', e => {
  const delBtn = e.target.closest('.v-del');
  if (delBtn) {
    deleteVertex(parseInt(delBtn.dataset.id, 10));
    return;
  }
  const item = e.target.closest('.v-item');
  if (item) selectFromList(parseInt(item.dataset.id, 10));
});

// ── Sidebar: edge list (event delegation) ─────────────────────────────────────

document.getElementById('edge-list').addEventListener('click', e => {
  const delBtn = e.target.closest('.e-del');
  if (delBtn) deleteEdge(parseInt(delBtn.dataset.id, 10));
});

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Returns the mouse position relative to the canvas element.
 *
 * @param {MouseEvent|WheelEvent} e
 * @returns {{ x: number, y: number }}
 */
function _screenPos(e) {
  const r = canvas.getBoundingClientRect();
  return { x: e.clientX - r.left, y: e.clientY - r.top };
}

/**
 * Returns the appropriate CSS cursor string for the current mode.
 *
 * @param {boolean} onVertex  Whether the pointer is over a vertex.
 * @returns {string}
 */
function _cursor(onVertex) {
  if (state.mode === 'select') return onVertex ? 'grab' : 'default';
  if (state.mode === 'vertex') return 'crosshair';
  return onVertex ? 'pointer' : 'crosshair';
}
