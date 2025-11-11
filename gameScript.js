const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d', { alpha: false });

// ====== Config ======
const COLS = 9, ROWS = 7;
const CELL_SIZE = 60, GAP_SIZE = 4;

// Layout adicionais
const PADDING = 16;
const SIDEBAR_WIDTH = 90;   // coluna de pipes à esquerda
const HUD_HEIGHT = 110;      // faixa reservada para HUD

// Enums
const CellState = Object.freeze({ FREE: 0, BLOCKED: 1 });
const PipeKind = Object.freeze({
    Starter: 0,
    H: 1,          // horizontal
    V: 2,          // vertical
    CROSS: 3,      // cruz
    CURVE_UR: 4,   // curva: up -> right (↑→)
    CURVE_RD: 5,   // curva: right -> down (→↓)
    CURVE_DL: 6,   // curva: down -> left (↓←)
    CURVE_LU: 7    // curva: left -> up (←↑)
});

function randomPipe() {
    const pipeCount = Object.keys(PipeKind).length;
    const randomIndex = Math.floor(Math.random() * (pipeCount - 1)) + 1;
    return Object.values(PipeKind)[randomIndex];
}

// ====== Direções (bitmask) ======
const Dir = Object.freeze({ N:1, E:2, S:4, W:8 });
const Opp = Object.freeze({ [Dir.N]:Dir.S, [Dir.E]:Dir.W, [Dir.S]:Dir.N, [Dir.W]:Dir.E });

// Mapa de conexões por cano (quais lados estão "abertos")
const PIPE_CONNECTIONS = {
  [PipeKind.Starter]: Dir.E,                    // center -> right
  [PipeKind.H]:       Dir.W | Dir.E,
  [PipeKind.V]:       Dir.N | Dir.S,
  [PipeKind.CROSS]:   Dir.N | Dir.E | Dir.S | Dir.W,
  [PipeKind.CURVE_UR]:Dir.N | Dir.E,           // ↑→ (top, right)
  [PipeKind.CURVE_RD]:Dir.E | Dir.S,           // →↓ (right, bottom)
  [PipeKind.CURVE_DL]:Dir.S | Dir.W,           // ↓← (bottom, left)
  [PipeKind.CURVE_LU]:Dir.W | Dir.N            // ←↑ (left, top)
};

function isOpen(kind, dir) {
    const mask = PIPE_CONNECTIONS[kind] ?? 0;
    return (mask & dir) !== 0;
}

// ====== Util ======
function totalSize(count, cell, gap) { return count * (cell + gap) - gap; }
const gridTotalW = totalSize(COLS, CELL_SIZE, GAP_SIZE);
const gridTotalH = totalSize(ROWS, CELL_SIZE, GAP_SIZE);

function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

function roundRect(x, y, w, h, r = 10) {
    const rr = Math.min(r, w / 2, h / 2);
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
let startX, startY;

const grid = Array.from({ length: ROWS }, () =>
    Array.from({ length: COLS }, () => ({ state: CellState.FREE, pipe: null }))
);

// “Estoque” da sidebar
let inventory;

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
    /*ctx.fillStyle = '#cbd5e1';
    ctx.font = '16px system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, "Helvetica Neue", Arial';
    ctx.fillText('Pipes', sidebar.x + 14, sidebar.y + 24);*/

    // Slots
    const slotSize = 56, slotGap = 14;
    const totalH = inventory.length * slotSize + (inventory.length - 1) * slotGap;
    const sx = sidebar.x + (sidebar.w - slotSize) / 2;
    let sy = sidebar.y + (sidebar.h - totalH) / 2;

    for (let i = 0; i < inventory.length; i++) {
        const isActive = i === inventory.length - 1;

        ctx.beginPath();
        roundRect(sx, sy, slotSize, slotSize, 10);
        ctx.fillStyle = isActive ? '#1e3a8a' : '#1e293b';
        ctx.fill();

        ctx.lineWidth = isActive ? 3 : 2;
        ctx.strokeStyle = isActive ? '#60a5fa' : '#334155';
        ctx.stroke();

        drawPipeIcon(inventory[i], sx, sy, slotSize);

        sy += slotSize + slotGap;
    }
}

// Ícones simples
function drawPipeIcon(kind, x, y, size) {
    const cx = x + size / 2;
    const cy = y + size / 2;
    const th = Math.max(8, Math.floor(size * 0.3)); // espessura
    const r = size / 2;

    ctx.save();
    ctx.lineWidth = th;
    ctx.strokeStyle = kind === PipeKind.Starter ? '#facc15' : '#93c5fd';
    ctx.lineCap = 'butt';
    ctx.lineJoin = 'round';

    switch (kind) {
        case PipeKind.Starter: // cano inicial
            ctx.beginPath();
            ctx.moveTo(cx, cy);
            ctx.lineTo(x + size, cy);
            ctx.stroke();

            ctx.beginPath();
            ctx.arc(cx, cy, th * 0.8, 0, Math.PI * 2);
            ctx.fillStyle = '#facc15';
            ctx.fill();
            break;

        case PipeKind.H: // horizontal
            ctx.beginPath();
            ctx.moveTo(x, cy);
            ctx.lineTo(x + size, cy);
            ctx.stroke();
            break;

        case PipeKind.V: // vertical
            ctx.beginPath();
            ctx.moveTo(cx, y);
            ctx.lineTo(cx, y + size);
            ctx.stroke();
            break;

        case PipeKind.CROSS: // cruz (4 vias)
            ctx.beginPath();
            ctx.moveTo(x, cy);
            ctx.lineTo(x + size, cy);
            ctx.moveTo(cx, y);
            ctx.lineTo(cx, y + size);
            ctx.stroke();
            break;

        case PipeKind.CURVE_UR: // ↑→
            ctx.beginPath();
            ctx.moveTo(cx, y);
            ctx.lineTo(cx, cy);
            ctx.lineTo(x + size, cy);
            ctx.stroke();
            break;

        case PipeKind.CURVE_RD: // →↓
            ctx.beginPath();
            ctx.moveTo(x + size, cy);
            ctx.lineTo(cx, cy);
            ctx.lineTo(cx, y + size);
            ctx.stroke();
            break;

        case PipeKind.CURVE_DL: // ↓←
            ctx.beginPath();
            ctx.moveTo(cx, y + size);
            ctx.lineTo(cx, cy);
            ctx.lineTo(x, cy);
            ctx.stroke();
            break;

        case PipeKind.CURVE_LU: // ←↑
            ctx.beginPath();
            ctx.moveTo(x, cy);
            ctx.lineTo(cx, cy);
            ctx.lineTo(cx, y);
            ctx.stroke();
            break;
    }

    ctx.restore();
}

function drawWaterOverlay(kind, x, y, size) {
    if (kind == null) return;

    const cx = x + size / 2;
    const cy = y + size / 2;
    const th = Math.max(6, Math.floor(size * 0.18)); // um pouco mais fino que o cano
    const r = size / 2;

    ctx.save();
    ctx.lineWidth = th;
    ctx.strokeStyle = '#22d3ee'; // ciano "água"
    ctx.lineCap = 'butt';
    ctx.lineJoin = 'round';
    ctx.globalAlpha = 0.9;

    switch (kind) {
        case PipeKind.Starter:
            ctx.beginPath();
            ctx.moveTo(cx, cy);
            ctx.lineTo(x + size, cy);
            ctx.stroke();
            break;

        case PipeKind.H:
            ctx.beginPath();
            ctx.moveTo(x, cy);
            ctx.lineTo(x + size, cy);
            ctx.stroke();
            break;

        case PipeKind.V:
            ctx.beginPath();
            ctx.moveTo(cx, y);
            ctx.lineTo(cx, y + size);
            ctx.stroke();
            break;

        case PipeKind.CROSS:
            ctx.beginPath();
            ctx.moveTo(x, cy);
            ctx.lineTo(x + size, cy);
            ctx.moveTo(cx, y);
            ctx.lineTo(cx, y + size);
            ctx.stroke();
            break;

        case PipeKind.CURVE_UR: // ↑→
            ctx.beginPath();
            ctx.moveTo(cx, y);
            ctx.lineTo(cx, cy);
            ctx.lineTo(x + size, cy);
            ctx.stroke();
            break;

        case PipeKind.CURVE_RD: // →↓
            ctx.beginPath();
            ctx.moveTo(x + size, cy);
            ctx.lineTo(cx, cy);
            ctx.lineTo(cx, y + size);
            ctx.stroke();
            break;

        case PipeKind.CURVE_DL: // ↓←
            ctx.beginPath();
            ctx.moveTo(cx, y + size);
            ctx.lineTo(cx, cy);
            ctx.lineTo(x, cy);
            ctx.stroke();
            break;

        case PipeKind.CURVE_LU: // ←↑
            ctx.beginPath();
            ctx.moveTo(x, cy);
            ctx.lineTo(cx, cy);
            ctx.lineTo(cx, y);
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
            const cell = grid[y][x];
            ctx.fillStyle = (cell.state === CellState.FREE) ? '#2a2a3a' : '#475569';
            ctx.fillRect(cx, cy, CELL_SIZE, CELL_SIZE);

            // desenha pipe se houver
            if (cell.pipe != null) {
                drawPipeIcon(cell.pipe, cx, cy, CELL_SIZE);

                // desenha água se o cano esta conectada ao starter
                if (waterFlow[y][x]) {
                    drawWaterOverlay(cell.pipe, cx, cy, CELL_SIZE);
                }
            }

            // borda
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

// ====== Ações ======
// Navegação no grid
function moveSelection(dx, dy) {
    selectedX = clamp(selectedX + dx, 0, COLS - 1);
    selectedY = clamp(selectedY + dy, 0, ROWS - 1);
    drawAll();
}

// Coloca o proximo cano na célula selecionada
function placeFromSidebar() {
    if (inventory.length === 0) return;

    const cell = grid[selectedY][selectedX];
    if (cell.state === CellState.BLOCKED) return;

    const pipe = inventory.pop();
    cell.pipe = pipe;

    inventory.unshift(randomPipe());
    computeFlow();
}

// ====== Estado de fluxo (água) ======
let waterFlow = Array.from({ length: ROWS }, () => Array(COLS).fill(false));

// Recalcula todo o fluxo de água a partir do Starter
function computeFlow() {
    // limpa
    for (let y = 0; y < ROWS; y++) waterFlow[y].fill(false);

    if (startX == null || startY == null) return;
    const startCell = grid[startY][startX];
    if (startCell.pipe !== PipeKind.Starter) return;

    // BFS
    const q = [];
    waterFlow[startY][startX] = true;
    q.push({ x: startX, y: startY });

    while (q.length) {
        const { x, y } = q.shift();
        const cell = grid[y][x];
        const kind = cell.pipe;

        if (kind == null) continue;

        // Para cada direção aberta deste cano, tenta ir ao vizinho
        const tryGo = (dir, nx, ny) => {
            // limites
            if (nx < 0 || nx >= COLS || ny < 0 || ny >= ROWS) return;
            const neighbor = grid[ny][nx];
            // precisa ter cano aberto e recíproco
            if (neighbor.pipe == null) return;
            if (!isOpen(kind, dir)) return;
            if (neighbor.state == CellState.BLOCKED) return;
            if (!isOpen(neighbor.pipe, Opp[dir])) return;
            if (!waterFlow[ny][nx]) {
                waterFlow[ny][nx] = true;
                q.push({ x: nx, y: ny });
            }
        };

        // tenta em todas as direções que este cano permite
        if (isOpen(kind, Dir.N)) tryGo(Dir.N, x, y - 1);
        if (isOpen(kind, Dir.E)) tryGo(Dir.E, x + 1, y);
        if (isOpen(kind, Dir.S)) tryGo(Dir.S, x, y + 1);
        if (isOpen(kind, Dir.W)) tryGo(Dir.W, x - 1, y);
    }
}

// ====== Input ======
canvas.tabIndex = 0;
canvas.style.outline = 'none';
canvas.addEventListener('keydown', (e) => {
    const key = e.key;
    if (key.startsWith('Arrow')) e.preventDefault();

    switch (key) {
        case 'ArrowUp': moveSelection(0, -1); break;
        case 'ArrowDown': moveSelection(0, 1); break;
        case 'ArrowLeft': moveSelection(-1, 0); break;
        case 'ArrowRight': moveSelection(1, 0); break;

        case ' ': // espaço: ciclo visual
            e.preventDefault();
            placeFromSidebar();
            drawAll();
            break;

        case 'Enter':
            computeFlow();
            drawAll();
            break;
    }
});
canvas.addEventListener('pointerdown', () => canvas.focus());

function startGame() {
    //Limpa variaveis

    //Limpa o grid
    for (let y = 0; y < ROWS; y++) {
        for (let x = 0; x < COLS; x++) {
            let cell = grid[y][x];
            cell.pipe = null;
            cell.state = CellState.FREE;
        }
    }

    //Determina celulas bloqueadas
    let cellsToBlock = 0;
    const minBlockedCells = 1;
    const maxBlockedCells = 4;
    if (maxBlockedCells > minBlockedCells) {
        const difference = maxBlockedCells - minBlockedCells;
        const randomAmmount = Math.floor(Math.random() * (difference + 1));
        cellsToBlock = minBlockedCells + randomAmmount;
    }

    while (cellsToBlock > 0) {
        const randomY = Math.floor(Math.random() * ROWS);
        const randomX = Math.floor(Math.random() * COLS);
        const randomCell = grid[randomY][randomX];

        if (randomCell.state === CellState.FREE) {
            randomCell.state = CellState.BLOCKED;
            cellsToBlock--;
        }
    }

    //Determina posição inicial
    startX = -1, startY = -1;
    while (startX === -1 || startY === -1) {
        const randomY = Math.floor(Math.random() * (ROWS - 1));
        const randomX = Math.floor(Math.random() * (COLS - 1));

        const randomCell = grid[randomY][randomX];
        const cellBellow = grid[randomY + 1][randomX];
        const cellRight = grid[randomY][randomX + 1];

        if (randomCell.state != CellState.BLOCKED &&
            cellBellow.state != CellState.BLOCKED &&
            cellRight.state != CellState.BLOCKED
        ) {
            randomCell.pipe = PipeKind.Starter;
            randomCell.state = CellState.BLOCKED;
            startX = randomX;
            startY = randomY;
        }
    }

    // Preenche o inventario
    inventory = Array.from({ length: 6 }, () => randomPipe());

    computeFlow();

    //Desenha o grid
    drawAll();

    //Inicia os Timers
}

startGame();

