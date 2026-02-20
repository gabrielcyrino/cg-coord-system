/**
 * @fileoverview Canvas drawing functions.
 *
 * All drawing happens in world-px space.
 * draw() applies ctx.setTransform(zoom, …) so every helper function
 * receives world coordinates and the GPU handles zoom/pan.
 */

import { state, GRID, V_RADIUS }            from './state.js';
import { canvas, ctx }                      from './canvas.js';
import { themeColors }                      from './theme.js';
import { origin, worldToUser, visibleBounds } from './coords.js';

// ── Public ────────────────────────────────────────────────────────────────────

/**
 * Clears and fully redraws the canvas.
 */
export function draw() {
  const C = themeColors();

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = C.canvasBg;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.save();
  ctx.setTransform(state.zoom, 0, 0, state.zoom, state.panX, state.panY);
  _drawGrid(C);
  _drawAxes(C);
  _drawEdges(C);
  _drawVertices(C);
  ctx.restore();
}

// ── Grid ──────────────────────────────────────────────────────────────────────

function _drawGrid(C) {
  const b    = visibleBounds();
  const o    = origin();
  const { zoom } = state;

  // Adaptive step: keep grid lines 25–250 screen-px apart
  let step = GRID;
  while (step * zoom < 25)  step *= 5;
  while (step * zoom > 250) step /= 5;
  if (step < 1) step = 1;

  ctx.strokeStyle = C.grid;
  ctx.lineWidth   = 1 / zoom;

  const startX = Math.floor((b.left - o.x) / step) * step + o.x;
  const startY = Math.floor((b.top  - o.y) / step) * step + o.y;

  for (let x = startX; x <= b.right  + step; x += step) _line(x, b.top,  x, b.bottom);
  for (let y = startY; y <= b.bottom + step; y += step) _line(b.left, y, b.right, y);

  // Axis labels (constant screen size via / zoom)
  ctx.fillStyle = C.gridLabel;
  ctx.font      = `${10 / zoom}px monospace`;

  ctx.textAlign = 'center';
  for (let x = startX; x <= b.right + step; x += step) {
    const ux = worldToUser(x, o.y).x;
    if (ux === 0) continue;
    const ly = Math.min(Math.max(o.y + 14 / zoom, b.top + 14 / zoom), b.bottom - 2 / zoom);
    ctx.fillText(ux, x, ly);
  }

  ctx.textAlign = 'right';
  for (let y = startY; y <= b.bottom + step; y += step) {
    const uy = worldToUser(o.x, y).y;
    if (uy === 0) continue;
    const lx = Math.min(Math.max(o.x + 28 / zoom, b.left + 28 / zoom), b.right - 2 / zoom);
    ctx.fillText(uy, lx, y + 4 / zoom);
  }
}

// ── Axes ──────────────────────────────────────────────────────────────────────

function _drawAxes(C) {
  const b  = visibleBounds();
  const o  = origin();
  const { zoom, coordSystem } = state;
  const lw = 1.5 / zoom;
  const ah = 8   / zoom;   // arrowhead size in world-px

  // X axis (skip if origin is outside visible vertical range)
  if (o.y >= b.top && o.y <= b.bottom) {
    ctx.strokeStyle = C.axisX;
    ctx.lineWidth   = lw;
    _line(b.left, o.y, b.right, o.y);
    _arrowHead(b.right - ah, o.y, 0, C.axisX, ah);
    ctx.fillStyle = C.axisX;
    ctx.font      = `bold ${13 / zoom}px monospace`;
    ctx.textAlign = 'left';
    ctx.fillText('X', b.right - 18 / zoom, o.y - 6 / zoom);
  }

  // Y axis (skip if origin is outside visible horizontal range)
  if (o.x >= b.left && o.x <= b.right) {
    ctx.strokeStyle = C.axisY;
    ctx.lineWidth   = lw;
    _line(o.x, b.top, o.x, b.bottom);
    const yArrow = coordSystem === 'cg' ? b.bottom - ah : b.top + ah;
    const yAngle = coordSystem === 'cg' ? Math.PI / 2   : -Math.PI / 2;
    _arrowHead(o.x, yArrow, yAngle, C.axisY, ah);
    ctx.fillStyle = C.axisY;
    ctx.font      = `bold ${13 / zoom}px monospace`;
    ctx.textAlign = 'left';
    const yLabelY = coordSystem === 'cg' ? b.bottom - 18 / zoom : b.top + 18 / zoom;
    ctx.fillText('Y', o.x + 6 / zoom, yLabelY);
  }

  // Origin dot + label
  if (o.x >= b.left && o.x <= b.right && o.y >= b.top && o.y <= b.bottom) {
    ctx.beginPath();
    ctx.arc(o.x, o.y, 3 / zoom, 0, Math.PI * 2);
    ctx.fillStyle = C.origin;
    ctx.fill();
    ctx.fillStyle = C.origin;
    ctx.font      = `${11 / zoom}px monospace`;
    ctx.textAlign = 'left';
    ctx.fillText('(0,0)', o.x + 6 / zoom, o.y - 6 / zoom);
  }
}

// ── Edges ─────────────────────────────────────────────────────────────────────

function _drawEdges(C) {
  const { edges, vertices, zoom } = state;

  for (const e of edges) {
    const v1 = vertices.find(v => v.id === e.v1);
    const v2 = vertices.find(v => v.id === e.v2);
    if (!v1 || !v2) continue;

    ctx.strokeStyle = C.edgeClr;
    ctx.lineWidth   = 2 / zoom;
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.moveTo(v1.cx, v1.cy);
    ctx.lineTo(v2.cx, v2.cy);
    ctx.stroke();

    // Edge label at midpoint
    const mx = (v1.cx + v2.cx) / 2;
    const my = (v1.cy + v2.cy) / 2;
    ctx.fillStyle = C.edgeLbl;
    ctx.font      = `${10 / zoom}px monospace`;
    ctx.textAlign = 'center';
    ctx.fillText(`e${e.id}`, mx, my - 8 / zoom);
  }
}

// ── Vertices ──────────────────────────────────────────────────────────────────

function _drawVertices(C) {
  const { vertices, mode, edgePending, selVertex, lastMouse, zoom } = state;
  const vr = V_RADIUS / zoom;   // constant screen-px visual radius

  // Dashed preview line while selecting the second vertex
  if (mode === 'edge' && edgePending !== null && lastMouse) {
    const v1 = vertices.find(v => v.id === edgePending);
    if (v1) {
      ctx.strokeStyle = C.preview;
      ctx.lineWidth   = 1.5 / zoom;
      ctx.setLineDash([6 / zoom, 4 / zoom]);
      ctx.beginPath();
      ctx.moveTo(v1.cx, v1.cy);
      ctx.lineTo(lastMouse.x, lastMouse.y);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }

  for (const v of vertices) {
    const isEdgeSel = edgePending === v.id;
    const isSel     = selVertex   === v.id;

    // Selection glow ring
    if (isEdgeSel || isSel) {
      ctx.beginPath();
      ctx.arc(v.cx, v.cy, vr + 5 / zoom, 0, Math.PI * 2);
      ctx.fillStyle = isEdgeSel ? C.glowEdge : C.glowSel;
      ctx.fill();
    }

    // Vertex circle
    ctx.beginPath();
    ctx.arc(v.cx, v.cy, vr, 0, Math.PI * 2);
    ctx.fillStyle   = isEdgeSel ? C.vEdge : (isSel ? C.vSel : C.vFill);
    ctx.strokeStyle = C.vStroke;
    ctx.lineWidth   = 2 / zoom;
    ctx.fill();
    ctx.stroke();

    // Vertex ID label (above)
    ctx.fillStyle = C.vLabel;
    ctx.font      = `bold ${10 / zoom}px monospace`;
    ctx.textAlign = 'center';
    ctx.fillText(`V${v.id}`, v.cx, v.cy - vr - 5 / zoom);

    // Coordinate label (below)
    const uc = worldToUser(v.cx, v.cy);
    ctx.fillStyle = C.vCoord;
    ctx.font      = `${10 / zoom}px monospace`;
    ctx.fillText(`(${uc.x},${uc.y})`, v.cx, v.cy + vr + 12 / zoom);
  }
}

// ── Primitives ────────────────────────────────────────────────────────────────

function _line(x1, y1, x2, y2) {
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
}

function _arrowHead(x, y, angle, color, size = 8) {
  ctx.fillStyle = color;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(-size, -size / 2);
  ctx.lineTo(-size,  size / 2);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}
