const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d', { alpha: false });

// ====== Config ======
const COLS = 9, ROWS = 7;
const CELL_SIZE = 60, GAP_SIZE = 4;

// Layout adicionais
const PADDING = 16;
const SIDEBAR_WIDTH = 90;   // coluna de pipes à esquerda
const HUD_HEIGHT = 110;      // faixa reservada para HUD

// Estados da célula
const Cell = Object.freeze({ FREE: 0, BLOCKED: 1, OCCUPIED: 2 });

// ====== Util ======
function totalSize(count, cell, gap) {
  return count * (cell + gap) - gap;
}
const gridTotalW = totalSize(COLS, CELL_SIZE, GAP_SIZE);
const gridTotalH = totalSize(ROWS, CELL_SIZE, GAP_SIZE);

function clamp(v, a, b){ return Math.max(a, Math.min(b, v)); }

function roundRect(x, y, w, h, r = 10) {
  const rr = Math.min(r, w/2, h/2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

// ====== Grade / Estados ======
let selectedX = 0, selectedY = 0;

const grid = Array.from({ length: ROWS }, () =>
  Array.from({ length: COLS }, () => Cell.FREE)
);

function cycleState(x, y) {
  grid[y][x] = (grid[y][x] + 1) % 3; // FREE -> BLOCKED -> OCCUPIED -> FREE
}
function toggleBlocked(x, y) {
  grid[y][x] = grid[y][x] === Cell.BLOCKED ? Cell.FREE : Cell.BLOCKED;
}
function toggleOccupied(x, y) {
  grid[y][x] = grid[y][x] === Cell.OCCUPIED ? Cell.FREE : Cell.OCCUPIED;
}

// ====== Layout dinâmico ======
function computeLayout() {
  const W = canvas.clientWidth;
  const H = canvas.clientHeight;

  // Área principal
  const mainTop = PADDING;
  const mainLeft = PADDING;
  const mainWidth = W - PADDING * 2;
  const mainHeight = H - HUD_HEIGHT - PADDING * 2;

  // Sidebar
  const sidebar = {
    x: mainLeft,
    y: mainTop,
    w: SIDEBAR_WIDTH,
    h: mainHeight
  };

  // Área restante para o grid
  const rightX = sidebar.x + sidebar.w + PADDING;
  const rightW = mainWidth - sidebar.w - PADDING;

  // Centraliza o grid dentro da área à direita
  const gridX = rightX + Math.max(0, (rightW - gridTotalW) / 2);
  const gridY = mainTop + Math.max(0, (mainHeight - gridTotalH) / 2);

  // HUD
  const hud = {
    x: PADDING,
    y: H - HUD_HEIGHT + PADDING,
    w: W - PADDING * 2,
    h: HUD_HEIGHT - PADDING * 2
  };

  return { sidebar, gridArea: { x: gridX, y: gridY }, hud };
}

// ====== Desenho ======
function drawSidebar(sidebar) {
  // Container
  roundRect(sidebar.x, sidebar.y, sidebar.w, sidebar.h, 14);
  ctx.fillStyle = '#0f172a';
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = '#1f2a44';
  ctx.stroke();

  // Título
  ctx.fillStyle = '#cbd5e1';
  ctx.font = '16px system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, "Helvetica Neue", Arial';
  ctx.fillText('Pipes', sidebar.x + 14, sidebar.y + 24);

  // Slots visuais
  const slots = 6;
  const slotSize = 56;
  const slotGap = 12;
  let sx = sidebar.x + 14;
  let sy = sidebar.y + 42;

  for (let i = 0; i < slots; i++) {
    roundRect(sx, sy, slotSize, slotSize, 10);
    ctx.fillStyle = '#1e293b';
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#334155';
    ctx.stroke();

    // Ícone simples de pipe, variando para dar visual
    drawPipeIcon((i % 5), sx, sy, slotSize);

    sy += slotSize + slotGap;
  }
}

// Ícones simples
function drawPipeIcon(kind, x, y, size) {
  const cx = x + size / 2;
  const cy = y + size / 2;
  const th = Math.max(8, Math.floor(size * 0.18)); // espessura do pipe
  ctx.save();
  ctx.lineWidth = th;
  ctx.strokeStyle = '#93c5fd';
  ctx.lineCap = 'butt';

  switch (kind) {
    case 0: // reto horizontal
      ctx.beginPath();
      ctx.moveTo(x + size * 0.18, cy);
      ctx.lineTo(x + size * 0.82, cy);
      ctx.stroke();
      break;
    case 1: // reto vertical
      ctx.beginPath();
      ctx.moveTo(cx, y + size * 0.18);
      ctx.lineTo(cx, y + size * 0.82);
      ctx.stroke();
      break;
    case 2: // curva
      ctx.beginPath();
      ctx.moveTo(cx, y + size * 0.18);
      ctx.lineTo(cx, cy);
      ctx.lineTo(x + size * 0.82, cy);
      ctx.stroke();
      break;
    case 3: // T
      ctx.beginPath();
      ctx.moveTo(x + size * 0.2, cy);
      ctx.lineTo(x + size * 0.8, cy);
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx, y + size * 0.18);
      ctx.stroke();
      break;
    case 4: // cruz
      ctx.beginPath();
      ctx.moveTo(x + size * 0.2, cy);
      ctx.lineTo(x + size * 0.8, cy);
      ctx.moveTo(cx, y + size * 0.2);
      ctx.lineTo(cx, y + size * 0.8);
      ctx.stroke();
      break;
  }
  ctx.restore();
}

function drawHUD(hud) {
  roundRect(hud.x, hud.y, hud.w, hud.h, 14);
  ctx.fillStyle = '#0b1220';
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = '#1f2a44';
  ctx.stroke();

  // Elementos do HUD
  const pad = 14;
  ctx.fillStyle = '#94a3b8';
  ctx.font = '14px system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, "Helvetica Neue", Arial';
  ctx.fillText('HUD', hud.x + pad, hud.y + pad + 6);

  const cardW = 150, cardH = 44, gap = 12;
  let cx = hud.x + pad;
  const cy = hud.y + pad + 20;

  for (let i = 0; i < 3; i++) {
    roundRect(cx, cy, cardW, cardH, 10);
    ctx.fillStyle = '#111827';
    ctx.fill();
    ctx.strokeStyle = '#263147';
    ctx.stroke();
    ctx.fillStyle = '#cbd5e1';
    ctx.fillText(['Tempo', 'Pontuação', 'Nível'][i], cx + 12, cy + 26);
    cx += cardW + gap;
  }
}

function drawGrid(gridArea) {
  roundRect(gridArea.x - 10, gridArea.y - 10, gridTotalW + 20, gridTotalH + 20, 12);
  ctx.fillStyle = '#0b1020';
  ctx.fill();

  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      const cx = gridArea.x + x * (CELL_SIZE + GAP_SIZE);
      const cy = gridArea.y + y * (CELL_SIZE + GAP_SIZE);

      // Fundo por estado
      const state = grid[y][x];
      if (state === Cell.FREE) ctx.fillStyle = '#2a2a3a';
      else if (state === Cell.BLOCKED) ctx.fillStyle = '#475569';
      else ctx.fillStyle = '#334155';

      ctx.fillRect(cx, cy, CELL_SIZE, CELL_SIZE);

      // Ícone para "ocupado"
      if (state === Cell.OCCUPIED) {
        ctx.beginPath();
        ctx.arc(cx + CELL_SIZE / 2, cy + CELL_SIZE / 2, CELL_SIZE * 0.22, 0, Math.PI * 2);
        ctx.fillStyle = '#cbd5e1';
        ctx.fill();
      }

      // Borda da célula
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#3a3a4a';
      ctx.strokeRect(cx, cy, CELL_SIZE, CELL_SIZE);

      // Seleção
      if (x === selectedX && y === selectedY) {
        ctx.lineWidth = 3;
        ctx.strokeStyle = '#7dd3fc';
        ctx.strokeRect(cx + 1.5, cy + 1.5, CELL_SIZE - 3, CELL_SIZE - 3);
      }
    }
  }
}

function drawAll() {
  // Limpa todo o canvas
  ctx.clearRect(0, 0, canvas.clientWidth, canvas.clientHeight);

  const { sidebar, gridArea, hud } = computeLayout();
  drawSidebar(sidebar);
  drawGrid(gridArea);
  drawHUD(hud);
}

// ====== Navegação no grid ======
function moveSelection(dx, dy) {
  selectedX = clamp(selectedX + dx, 0, COLS - 1);
  selectedY = clamp(selectedY + dy, 0, ROWS - 1);
  drawAll();
}

// ====== Input ======
canvas.tabIndex = 0;
canvas.style.outline = 'none';
canvas.addEventListener('keydown', (e) => {
  const key = e.key;
  if (key.startsWith('Arrow')) e.preventDefault();

  switch (key) {
    case 'ArrowUp':    moveSelection(0, -1); break;
    case 'ArrowDown':  moveSelection(0, 1);  break;
    case 'ArrowLeft':  moveSelection(-1, 0); break;
    case 'ArrowRight': moveSelection(1, 0);  break;

    case ' ': // espaço: ciclo visual
      e.preventDefault();
      cycleState(selectedX, selectedY);
      drawAll();
      break;

    case 'b':
    case 'B':
      toggleBlocked(selectedX, selectedY);
      drawAll();
      break;

    case 'o':
    case 'O':
      toggleOccupied(selectedX, selectedY);
      drawAll();
      break;
  }
});
canvas.addEventListener('pointerdown', () => canvas.focus());

// Primeiro desenho
drawAll();
