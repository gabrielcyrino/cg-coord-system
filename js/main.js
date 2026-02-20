/**
 * @fileoverview Application entry point.
 *
 * Initialises all subsystems in the correct order and sets up the
 * window-resize handler.  All other modules are imported here so that
 * events.js side-effects (addEventListener calls) run at startup.
 */

import { state }                           from './state.js';
import { canvas, wrap }                    from './canvas.js';
import { applyTheme }                      from './theme.js';
import { draw }                            from './draw.js';
import { setCoordSystem, setMode,
         updateZoomLabel }                 from './ui.js';
import { renderInfo }                      from './info.js';
import './events.js';   // register all event listeners (side-effects only)

// ── Resize handler ────────────────────────────────────────────────────────────

function resize() {
  canvas.width  = wrap.clientWidth;
  canvas.height = wrap.clientHeight;

  // Fix the math-mode origin at the canvas centre on the first resize.
  // After that it stays constant so coordinate labels remain stable.
  if (state.mathOx === null) {
    state.mathOx = canvas.width  / 2;
    state.mathOy = canvas.height / 2;
  }

  draw();
}

window.addEventListener('resize', resize);

// ── Bootstrap ─────────────────────────────────────────────────────────────────

applyTheme('light');      // default: light mode
setCoordSystem('cg');     // default: CG coordinate system
setMode('vertex');        // default edit mode
updateZoomLabel();        // initialise "Zoom: 100%" in status bar
renderInfo();             // populate info panel
resize();                 // size canvas and draw first frame
