const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const COLS = 9, ROWS = 7;
const CELL_SIZE = 60, GAP_SIZE = 4;
const totalWidth = COLS * (CELL_SIZE + GAP_SIZE) - GAP_SIZE;
const totalHeight = ROWS * (CELL_SIZE + GAP_SIZE) - GAP_SIZE;

const startX = (canvas.width - totalWidth) / 2;
const startY = (canvas.height - totalHeight) / 2;

let selectedX = 0, selectedY = 0;


function drawGrid() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (let y = 0; y < ROWS; y++) {
        for (let x = 0; x < COLS; x++) {
            const cx = startX + x * (CELL_SIZE + GAP_SIZE);
            const cy = startY + y * (CELL_SIZE + GAP_SIZE);


            if (x === selectedX && y === selectedY) {
                ctx.fillStyle = '#7dd3fc';
            } else {
                ctx.fillStyle = '#2a2a3a';
            }


            ctx.fillRect(cx, cy, CELL_SIZE, CELL_SIZE);


            ctx.lineWidth = 2;
            ctx.strokeStyle = '#3a3a4a';
            ctx.strokeRect(cx, cy, CELL_SIZE, CELL_SIZE);
        }
    }
}


function moveSelection(dx, dy) {
    selectedX = Math.max(0, Math.min(COLS - 1, selectedX + dx));
    selectedY = Math.max(0, Math.min(ROWS - 1, selectedY + dy));
    drawGrid();
}


window.addEventListener('keydown', (e) => {
    switch (e.key) {
        case 'ArrowUp': moveSelection(0, -1); break;
        case 'ArrowDown': moveSelection(0, 1); break;
        case 'ArrowLeft': moveSelection(-1, 0); break;
        case 'ArrowRight': moveSelection(1, 0); break;
    }
});


drawGrid();