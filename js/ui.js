/**
 * @fileoverview UI management.
 *
 * Responsibilities:
 *   - Mode and coordinate-system switching (buttons + state)
 *   - Vertex and edge CRUD (add, delete, select)
 *   - Edge-creation click logic
 *   - Sidebar list rendering (vertex list, edge list)
 *   - Status bar helpers (zoom label, temporary messages)
 *   - View reset
 */

import { state, V_RADIUS }         from './state.js';
import { worldToUser, userToWorld } from './coords.js';
import { draw }                    from './draw.js';
import { renderInfo }              from './info.js';

// ── Mode ─────────────────────────────────────────────────────────────────────

const MODE_NAMES = {
  select: 'Selecionar / Mover',
  vertex: 'Inserir Vértice',
  edge:   'Inserir Aresta',
};

/**
 * Switches the active edit mode and updates the UI.
 *
 * @param {'select'|'vertex'|'edge'} m
 */
export function setMode(m) {
  state.mode        = m;
  state.edgePending = null;
  state.selVertex   = null;

  document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
  document.getElementById(`mode-${m}`)?.classList.add('active');
  document.getElementById('st-mode').textContent = `Modo: ${MODE_NAMES[m]}`;

  setMsg('');
  draw();
  refreshVertexList();
  renderInfo();
}

// ── Coordinate system ─────────────────────────────────────────────────────────

/**
 * Switches the coordinate system and updates the UI.
 *
 * @param {'cg'|'math'} sys
 */
export function setCoordSystem(sys) {
  state.coordSystem = sys;

  document.getElementById('btn-cg').className   = 'coord-btn' + (sys === 'cg'   ? ' active-cg'   : '');
  document.getElementById('btn-math').className = 'coord-btn' + (sys === 'math' ? ' active-math'  : '');

  const badge = document.getElementById('coord-badge');
  if (sys === 'cg') {
    badge.style.cssText = 'background:rgba(249,115,22,.12);border:1px solid #f97316;color:#ea6c00;';
    badge.textContent   = 'CG — Y cresce ↓';
  } else {
    badge.style.cssText = 'background:rgba(8,145,178,.1);border:1px solid #0891b2;color:#0891b2;';
    badge.textContent   = 'Matemático — Y cresce ↑';
  }

  draw();
  refreshAll();
  renderInfo();
}

// ── Vertex CRUD ───────────────────────────────────────────────────────────────

/**
 * Adds a vertex at the given world-px position.
 *
 * @param {number} wx
 * @param {number} wy
 */
export function addVertex(wx, wy) {
  state.vertices.push({ id: state.nextVid++, cx: wx, cy: wy });
  refreshVertexList();
  draw();
  renderInfo();
  setMsg(`Vértice V${state.nextVid - 1} adicionado`);
}

/**
 * Reads X/Y from the sidebar inputs and adds a vertex at those user coordinates.
 */
export function addVertexByCoords() {
  const ux = parseFloat(document.getElementById('inp-x').value) || 0;
  const uy = parseFloat(document.getElementById('inp-y').value) || 0;
  const p  = userToWorld(ux, uy);
  addVertex(p.x, p.y);
}

/**
 * Removes a vertex and all edges that reference it.
 *
 * @param {number} id
 */
export function deleteVertex(id) {
  state.vertices    = state.vertices.filter(v => v.id !== id);
  state.edges       = state.edges.filter(e => e.v1 !== id && e.v2 !== id);
  if (state.selVertex   === id) state.selVertex   = null;
  if (state.edgePending === id) state.edgePending = null;
  refreshAll();
}

/**
 * Selects a vertex from the sidebar list and scrolls the canvas info.
 *
 * @param {number} id
 */
export function selectFromList(id) {
  state.selVertex = id;
  const v = state.vertices.find(v => v.id === id);
  if (v) {
    const uc = worldToUser(v.cx, v.cy);
    setMsg(`V${id} selecionado — (${uc.x}, ${uc.y})`);
  }
  refreshVertexList();
  draw();
}

// ── Edge CRUD ─────────────────────────────────────────────────────────────────

/**
 * Handles a canvas click in edge mode.
 * First click selects the source vertex; second click creates the edge.
 *
 * @param {number} wx
 * @param {number} wy
 */
export function handleEdgeClick(wx, wy) {
  const v = vertexAt(wx, wy);
  if (!v) { setMsg('Clique em um vértice existente'); return; }

  if (state.edgePending === null) {
    state.edgePending = v.id;
    setMsg(`V${v.id} selecionado — clique no segundo vértice`);

  } else if (state.edgePending === v.id) {
    state.edgePending = null;
    setMsg('Seleção cancelada');

  } else {
    const alreadyExists = state.edges.some(e =>
      (e.v1 === state.edgePending && e.v2 === v.id) ||
      (e.v1 === v.id && e.v2 === state.edgePending),
    );

    if (alreadyExists) {
      setMsg('Aresta já existe entre esses vértices!');
    } else {
      state.edges.push({ id: state.nextEid++, v1: state.edgePending, v2: v.id });
      setMsg(`Aresta e${state.nextEid - 1}: V${state.edgePending} ↔ V${v.id}`);
      refreshEdgeList();
      renderInfo();
    }
    state.edgePending = null;
  }

  draw();
  refreshVertexList();
}

/**
 * Removes an edge by id.
 *
 * @param {number} id
 */
export function deleteEdge(id) {
  state.edges = state.edges.filter(e => e.id !== id);
  refreshEdgeList();
  draw();
  renderInfo();
}

// ── Vertex lookup ─────────────────────────────────────────────────────────────

/**
 * Returns the first vertex whose hit area contains the given world-px point.
 * Hit radius is constant in screen pixels regardless of zoom.
 *
 * @param {number} wx
 * @param {number} wy
 * @returns {Object|null}
 */
export function vertexAt(wx, wy) {
  const hitR = (V_RADIUS + 4) / state.zoom;
  for (const v of state.vertices) {
    const dx = v.cx - wx;
    const dy = v.cy - wy;
    if (dx * dx + dy * dy <= hitR * hitR) return v;
  }
  return null;
}

// ── Clear all ─────────────────────────────────────────────────────────────────

/** Removes all vertices and edges and resets counters. */
export function clearAll() {
  state.vertices    = [];
  state.edges       = [];
  state.nextVid     = 0;
  state.nextEid     = 0;
  state.selVertex   = null;
  state.edgePending = null;
  state.dragVertex  = null;
  refreshAll();
  renderInfo();
  setMsg('Tudo limpo');
}

// ── View ─────────────────────────────────────────────────────────────────────

/** Resets zoom and pan to the initial view. */
export function resetView() {
  state.zoom = 1;
  state.panX = 20;
  state.panY = 20;
  updateZoomLabel();
  draw();
  setMsg('Zoom e pan resetados');
}

/** Updates the zoom percentage label in the status bar. */
export function updateZoomLabel() {
  const el = document.getElementById('st-zoom');
  if (el) el.textContent = `Zoom: ${Math.round(state.zoom * 100)}%`;
}

// ── Status message ────────────────────────────────────────────────────────────

let _msgTimer = null;

/**
 * Shows a temporary message in the status bar (auto-clears after 4 s).
 *
 * @param {string} msg
 */
export function setMsg(msg) {
  const el = document.getElementById('st-msg');
  if (!el) return;
  el.textContent = msg;
  clearTimeout(_msgTimer);
  if (msg) {
    _msgTimer = setTimeout(() => { el.textContent = ''; }, 4000);
  }
}

// ── List refresh ─────────────────────────────────────────────────────────────

/** Redraws both lists and the canvas. */
export function refreshAll() {
  refreshVertexList();
  refreshEdgeList();
  draw();
}

/** Re-renders the vertex list sidebar. */
export function refreshVertexList() {
  const el = document.getElementById('vertex-list');
  if (!el) return;

  document.getElementById('v-count').textContent = state.vertices.length;

  if (!state.vertices.length) {
    el.innerHTML = '<div class="empty-hint">Nenhum vértice ainda</div>';
    return;
  }

  el.innerHTML = state.vertices.map(v => {
    const uc  = worldToUser(v.cx, v.cy);
    const cls = v.id === state.edgePending ? 'edge-sel'
              : v.id === state.selVertex   ? 'selected'
              : '';
    return `
      <div class="v-item ${cls}" data-id="${v.id}">
        <span>V${v.id}&nbsp;&nbsp;(${uc.x}, ${uc.y})</span>
        <button class="v-del" data-id="${v.id}" title="Remover vértice">×</button>
      </div>`;
  }).join('');
}

/** Re-renders the edge list sidebar. */
export function refreshEdgeList() {
  const el = document.getElementById('edge-list');
  if (!el) return;

  document.getElementById('e-count').textContent = state.edges.length;

  if (!state.edges.length) {
    el.innerHTML = '<div class="empty-hint">Nenhuma aresta ainda</div>';
    return;
  }

  el.innerHTML = state.edges.map(e => `
    <div class="e-item" data-id="${e.id}">
      <span>e${e.id}: V${e.v1} ↔ V${e.v2}</span>
      <button class="e-del" data-id="${e.id}" title="Remover aresta">×</button>
    </div>`
  ).join('');
}
