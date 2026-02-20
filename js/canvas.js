/**
 * @fileoverview Canvas element and 2D rendering context references.
 *
 * Exported so every module can share the same canvas/ctx without
 * querying the DOM multiple times.
 */

/** @type {HTMLCanvasElement} */
export const canvas = document.getElementById('canvas');

/** @type {CanvasRenderingContext2D} */
export const ctx = canvas.getContext('2d');

/** @type {HTMLElement} The canvas wrapper div (used for resize). */
export const wrap = document.getElementById('canvas-wrap');
