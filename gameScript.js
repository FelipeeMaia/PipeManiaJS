const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d', { alpha: false });

// ====== Config ======
const COLS = 9, ROWS = 7;
const CELL_SIZE = 60, GAP_SIZE = 4;

// Estados da célula
const Cell = Object.freeze({ FREE: 0, BLOCKED: 1, OCCUPIED: 2 });

// ====== HiDPI / Pixel Ratio ======
function setupHiDPI(cnv) {
  const dpr = window.devicePixelRatio || 1;
  // Use o tamanho CSS atual do canvas como base
  const cssWidth = cnv.clientWidth || cnv.width;
  const cssHeight = cnv.clientHeight || cnv.height;

  cnv.width = Math.round(cssWidth * dpr);
  cnv.height = Math.round(cssHeight * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
setupHiDPI(canvas);
window.addEventListener('resize', () => setupHiDPI(canvas));

// ====== Layout ======
function totalSize(count, cell, gap) {
  return count * (cell + gap) - gap;
}
const totalWidth = totalSize(COLS, CELL_SIZE, GAP_SIZE);
const totalHeight = totalSize(ROWS, CELL_SIZE, GAP_SIZE);

function getStartX() {
  return (canvas.clientWidth - totalWidth) / 2;
}
function getStartY() {
  return (canvas.clientHeight - totalHeight) / 2;
}

let selectedX = 0, selectedY = 0;

// ====== Grade / Estados ======
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

// ====== Desenho ======
function drawGrid() {
  // Limpa todo o canvas no espaço lógico (pós-HiDPI)
  ctx.clearRect(0, 0, canvas.clientWidth, canvas.clientHeight);

  const startX = getStartX();
  const startY = getStartY();

  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      const cx = startX + x * (CELL_SIZE + GAP_SIZE);
      const cy = startY + y * (CELL_SIZE + GAP_SIZE);

      // Fundo por estado
      const state = grid[y][x];
      if (state === Cell.FREE) ctx.fillStyle = '#2a2a3a';
      else if (state === Cell.BLOCKED) ctx.fillStyle = '#475569'; // cinza-azulado
      else ctx.fillStyle = '#334155'; // ocupado

      ctx.fillRect(cx, cy, CELL_SIZE, CELL_SIZE);

      // Ícone para "ocupado"
      if (state === Cell.OCCUPIED) {
        ctx.beginPath();
        ctx.arc(
          cx + CELL_SIZE / 2,
          cy + CELL_SIZE / 2,
          CELL_SIZE * 0.22,
          0,
          Math.PI * 2
        );
        ctx.fillStyle = '#cbd5e1';
        ctx.fill();
      }

      // Borda da célula
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#3a3a4a';
      ctx.strokeRect(cx, cy, CELL_SIZE, CELL_SIZE);

      // Destaque da seleção
      if (x === selectedX && y === selectedY) {
        ctx.lineWidth = 3;
        ctx.strokeStyle = '#7dd3fc';
        ctx.strokeRect(
          cx + 1.5, // pequena compensação pra ficar visível
          cy + 1.5,
          CELL_SIZE - 3,
          CELL_SIZE - 3
        );
      }
    }
  }
}

function moveSelection(dx, dy) {
  selectedX = Math.max(0, Math.min(COLS - 1, selectedX + dx));
  selectedY = Math.max(0, Math.min(ROWS - 1, selectedY + dy));
  drawGrid();
}

// ====== Input ======
// Evita scroll da página com setas quando o canvas estiver focado
canvas.tabIndex = 0; // permite foco via teclado
canvas.style.outline = 'none';
canvas.addEventListener('keydown', (e) => {
  const key = e.key;
  if (key.startsWith('Arrow')) e.preventDefault();

  switch (key) {
    case 'ArrowUp':    moveSelection(0, -1); break;
    case 'ArrowDown':  moveSelection(0, 1);  break;
    case 'ArrowLeft':  moveSelection(-1, 0); break;
    case 'ArrowRight': moveSelection(1, 0);  break;

    case ' ': // espaço: ciclo de estado
      e.preventDefault();
      cycleState(selectedX, selectedY);
      drawGrid();
      break;

    case 'b':
    case 'B':
      toggleBlocked(selectedX, selectedY);
      drawGrid();
      break;

    case 'o':
    case 'O':
      toggleOccupied(selectedX, selectedY);
      drawGrid();
      break;
  }
});

// Foco automático para já capturar teclas
canvas.addEventListener('pointerdown', () => canvas.focus());

// Primeiro desenho
drawGrid();
