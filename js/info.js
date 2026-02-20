/**
 * @fileoverview Info panel tab content and rendering.
 *
 * Each tab returns an HTML string with educational content.
 * Content is dynamic: the 'sys' tab reflects the active coordinate system
 * and the 'mode' tab reflects the active edit mode.
 */

import { state } from './state.js';

// ── Tab content definitions ───────────────────────────────────────────────────

const SYS_CONTENT = {
  cg: `
    <h4>Sistema CG / Screen Coordinates</h4>
    <ul>
      <li>Origem <span class="hl-o">(0, 0)</span> → <strong>canto superior esquerdo</strong></li>
      <li>Eixo <span class="hl-x">X</span> cresce para a <strong>direita</strong> →</li>
      <li>Eixo <span class="hl-y">Y</span> cresce para <strong>baixo</strong> ↓</li>
      <li>Pixel (100, 200) está 100px à direita e 200px abaixo da origem</li>
      <li>Usado em: HTML Canvas, CSS, OpenGL (window coords), SDL, WinAPI</li>
    </ul>
    <div class="note">
      💡 Pense na tela como uma folha de papel: você começa no canto superior esquerdo
      e a leitura avança para a direita e para baixo.
    </div>`,

  math: `
    <h4>Sistema Matemático — Plano Cartesiano</h4>
    <ul>
      <li>Origem <span class="hl-o">(0, 0)</span> → <strong>centro do plano</strong></li>
      <li>Eixo <span class="hl-x">X</span> cresce para a <strong>direita</strong> →</li>
      <li>Eixo <span class="hl-y">Y</span> cresce para <strong>cima</strong> ↑</li>
      <li>Quadrante I (x&gt;0, y&gt;0) → superior direito</li>
      <li>Quadrante II (x&lt;0, y&gt;0) → superior esquerdo</li>
      <li>Quadrante III (x&lt;0, y&lt;0) → inferior esquerdo</li>
      <li>Quadrante IV (x&gt;0, y&lt;0) → inferior direito</li>
    </ul>
    <div class="note">
      💡 Neste sistema, y=−100 fica <em>abaixo</em> da origem — o oposto do sistema CG!
    </div>`,
};

const DIFF_CONTENT = `
  <h4>CG vs. Matemático — Diferenças Principais</h4>
  <table style="width:100%;border-collapse:collapse;font-size:12px">
    <tr style="color:var(--text-muted);border-bottom:1px solid var(--border)">
      <th style="text-align:left;padding:3px 6px">Propriedade</th>
      <th style="padding:3px 6px;color:#f97316">CG / Screen</th>
      <th style="padding:3px 6px;color:#0891b2">Matemático</th>
    </tr>
    <tr style="border-bottom:1px solid var(--border)">
      <td style="padding:3px 6px">Origem</td>
      <td style="padding:3px 6px;text-align:center">Canto sup. esq.</td>
      <td style="padding:3px 6px;text-align:center">Centro</td>
    </tr>
    <tr style="border-bottom:1px solid var(--border)">
      <td style="padding:3px 6px">Y positivo</td>
      <td style="padding:3px 6px;text-align:center">↓ para baixo</td>
      <td style="padding:3px 6px;text-align:center">↑ para cima</td>
    </tr>
    <tr style="border-bottom:1px solid var(--border)">
      <td style="padding:3px 6px">Y negativo</td>
      <td style="padding:3px 6px;text-align:center">Acima da origem</td>
      <td style="padding:3px 6px;text-align:center">Abaixo da origem</td>
    </tr>
    <tr>
      <td style="padding:3px 6px">Conversão Y</td>
      <td colspan="2" style="padding:3px 6px;text-align:center">
        <span class="hl">y_cg = height − y_math</span>
      </td>
    </tr>
  </table>
  <div class="note">
    💡 Em shaders OpenGL, coordenadas de clip vão de −1 a +1 com Y↑ (similar ao matemático).
    O framebuffer final usa Y↓ (CG).
  </div>`;

const MODE_CONTENT = {
  select: `
    <h4>Modo: Selecionar / Mover</h4>
    <ul>
      <li>Clique em um <span class="hl">vértice</span> para selecioná-lo</li>
      <li><strong>Arraste</strong> um vértice para reposicioná-lo</li>
      <li>Clique no canvas vazio para deselecionar</li>
      <li>As coordenadas são exibidas em tempo real durante o arrasto</li>
    </ul>`,

  vertex: `
    <h4>Modo: Inserir Vértice</h4>
    <ul>
      <li>Clique em qualquer ponto do canvas para <span class="hl">adicionar um vértice</span></li>
      <li>Ou preencha os campos X e Y e clique em <strong>"+ Adicionar Vértice"</strong></li>
      <li>As coordenadas seguem o sistema de coordenadas selecionado</li>
      <li>Vértices podem ser deletados pela lista à esquerda (×)</li>
    </ul>`,

  edge: `
    <h4>Modo: Inserir Aresta</h4>
    <ul>
      <li>Clique no <span class="hl">primeiro vértice</span> — ele fica destacado</li>
      <li>Clique no <span class="hl">segundo vértice</span> para criar a aresta</li>
      <li>Clique no mesmo vértice novamente para <strong>cancelar</strong></li>
      <li>Arestas duplicadas são detectadas automaticamente</li>
      <li>Uma linha tracejada aparece do primeiro vértice ao cursor</li>
    </ul>`,
};

/** Maps tab keys to content factory functions. */
const TABS = {
  sys:  () => SYS_CONTENT[state.coordSystem] ?? '',
  diff: () => DIFF_CONTENT,
  mode: () => MODE_CONTENT[state.mode] ?? MODE_CONTENT.vertex,
};

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Switches to the specified tab and re-renders.
 *
 * @param {'sys'|'diff'|'mode'} t
 */
export function showTab(t) {
  state.activeTab = t;
  document.querySelectorAll('.info-tab').forEach(el => el.classList.remove('active'));
  document.getElementById(`tab-${t}`)?.classList.add('active');
  renderInfo();
}

/**
 * Re-renders the info panel body for the currently active tab.
 */
export function renderInfo() {
  const el = document.getElementById('info-body');
  if (el) el.innerHTML = TABS[state.activeTab]?.() ?? '';
}
