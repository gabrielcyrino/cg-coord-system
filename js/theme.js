/**
 * @fileoverview Theme management.
 *
 * Provides colour palettes for light and dark modes and exposes
 * functions to read / switch the active theme.
 */

/**
 * @returns {boolean} True when the dark theme is active.
 */
export function isDark() {
  return document.documentElement.dataset.theme === 'dark';
}

/**
 * Returns the colour palette for the current theme.
 * Called before every draw() so colours always reflect the live theme.
 *
 * @returns {ThemeColors}
 */
export function themeColors() {
  const d = isDark();
  return {
    // Canvas background
    canvasBg:  d ? '#0d1117' : '#f8fafc',

    // Grid
    grid:      d ? '#1c2b3a' : '#dde3ef',
    gridLabel: d ? '#2d4a6a' : '#94a3b8',

    // Axes
    axisX:     d ? '#f87171' : '#ef4444',
    axisY:     d ? '#34d399' : '#10b981',
    origin:    d ? '#fbbf24' : '#f59e0b',

    // Vertices
    vFill:     '#6366f1',
    vStroke:   d ? '#1f2937' : '#ffffff',
    vSel:      '#f97316',
    vEdge:     d ? '#22d3ee' : '#0891b2',
    vLabel:    d ? '#ffffff' : '#1e293b',
    vCoord:    d ? '#9ca3af' : '#64748b',
    glowSel:   'rgba(249,115,22,.2)',
    glowEdge:  d ? 'rgba(34,211,238,.2)' : 'rgba(8,145,178,.15)',

    // Edges
    edgeClr:   d ? '#fbbf24' : '#d97706',
    edgeLbl:   d ? '#b45309' : '#92400e',

    // Edge preview line
    preview:   d ? 'rgba(34,211,238,.4)' : 'rgba(8,145,178,.4)',
  };
}

/**
 * Toggles between light and dark themes.
 */
export function toggleTheme() {
  applyTheme(isDark() ? 'light' : 'dark');
}

/**
 * Applies the given theme and updates the toggle icon.
 *
 * @param {'light'|'dark'} t
 */
export function applyTheme(t) {
  document.documentElement.dataset.theme = t;

  const icon = document.getElementById('theme-icon');
  if (icon) icon.textContent = t === 'dark' ? '⏾' : '☀︎';
}
