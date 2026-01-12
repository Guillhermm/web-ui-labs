const SQUARE = 28;
const board = document.getElementById('board');
const verticalCoordinates = document.querySelectorAll('.coordinates.vertical');
const horizontalCoordinates = document.querySelectorAll('.coordinates.horizontal');

// Build board dynamically.
for (let r = 0; r < 8; r++) {
  for (let c = 0; c < 8; c++) {
    const sq = document.createElement('div');
    sq.className = 'square ' + ((r + c) % 2 ? 'black' : 'white');
    sq.dataset.row = r;
    sq.dataset.col = c;
    board.appendChild(sq);
  }
}

// Add vertical coordinates marks.
verticalCoordinates.forEach(el => {
  for (let i = 8; i > 0; i--) {
    const coord = document.createElement('div');
    coord.textContent = i;
    el.appendChild(coord);
  }
});

// Add horizontal coordinates marks.
horizontalCoordinates.forEach(el => {
  for (let i = 'a'.charCodeAt(0); i <= 'h'.charCodeAt(0); i++) {
    const char = String.fromCharCode(i);
    const coord = document.createElement('div');
    coord.textContent = char;
    el.appendChild(coord);
  }
});

// Utility functions
const removePiece = (piece) => {
  piece.style.transition = 'opacity 0.3s';
  piece.style.opacity = '0';

  setTimeout(() => {
    piece.remove();
  }, 300);
};

const movePiece = (el, r, c) => {
  el.style.top = `${r * SQUARE}px`;
  el.style.left = `${c * SQUARE}px`;
};

const highlight = (from, to) => {
  document
    .querySelectorAll('.square')
    .forEach((s) => s.classList.remove('highlight-from', 'highlight-to'));
  from.classList.add('highlight-from');
  to.classList.add('highlight-to');
};

// Move all pieces to initial position.
const setInitialPositions = () => {
  movePiece(document.getElementById('black-rook-1'), 0, 0);
  movePiece(document.getElementById('black-knight-1'), 0, 1);
  movePiece(document.getElementById('black-bishop-1'), 0, 2);
  movePiece(document.getElementById('black-queen'), 0, 3);
  movePiece(document.getElementById('black-king'), 0, 4);
  movePiece(document.getElementById('black-bishop-2'), 0, 5);
  movePiece(document.getElementById('black-knight-2'), 0, 6);
  movePiece(document.getElementById('black-rook-2'), 0, 7);
  movePiece(document.getElementById('black-pawn-1'), 1, 0);
  movePiece(document.getElementById('black-pawn-2'), 1, 1);
  movePiece(document.getElementById('black-pawn-3'), 1, 2);
  movePiece(document.getElementById('black-pawn-4'), 1, 3);
  movePiece(document.getElementById('black-pawn-5'), 1, 4);
  movePiece(document.getElementById('black-pawn-6'), 1, 5);
  movePiece(document.getElementById('black-pawn-7'), 1, 6);
  movePiece(document.getElementById('black-pawn-8'), 1, 7);
  movePiece(document.getElementById('white-pawn-1'), 6, 0);
  movePiece(document.getElementById('white-pawn-2'), 6, 1);
  movePiece(document.getElementById('white-pawn-3'), 6, 2);
  movePiece(document.getElementById('white-pawn-4'), 6, 3);
  movePiece(document.getElementById('white-pawn-5'), 6, 4);
  movePiece(document.getElementById('white-pawn-6'), 6, 5);
  movePiece(document.getElementById('white-pawn-7'), 6, 6);
  movePiece(document.getElementById('white-pawn-8'), 6, 7);
  movePiece(document.getElementById('white-rook-1'), 7, 0);
  movePiece(document.getElementById('white-knight-1'), 7, 1);
  movePiece(document.getElementById('white-bishop-1'), 7, 2);
  movePiece(document.getElementById('white-queen'), 7, 3);
  movePiece(document.getElementById('white-king'), 7, 4);
  movePiece(document.getElementById('white-bishop-2'), 7, 5);
  movePiece(document.getElementById('white-knight-2'), 7, 6);
  movePiece(document.getElementById('white-rook-2'), 7, 7);
};

// List of the opera game moves.
const moves = [
  { id: 'white-pawn-5', row: 4, col: 4, notation: 'e4' },
  { id: 'black-pawn-5', row: 3, col: 4, notation: 'e5' },
  { id: 'white-knight-2', row: 5, col: 5, notation: 'Nf3' },
  { id: 'black-pawn-4', row: 2, col: 3, notation: 'd6' },
  { id: 'white-pawn-4', row: 4, col: 3, notation: 'd4' },
  { id: 'black-bishop-1', row: 4, col: 6, notation: 'Bg4' },
  {
    id: 'white-pawn-4',
    row: 3,
    col: 4,
    capture: 'black-pawn-5',
    notation: 'dxe5',
  },
  {
    id: 'black-bishop-1',
    row: 5,
    col: 5,
    capture: 'white-knight-2',
    notation: 'Bf3',
  },
  {
    id: 'white-queen',
    row: 5,
    col: 5,
    capture: 'black-bishop-1',
    notation: 'Qxf3',
  },
  {
    id: 'black-pawn-4',
    row: 3,
    col: 4,
    capture: 'white-pawn-4',
    notation: 'dxe5',
  },
  { id: 'white-bishop-2', row: 4, col: 2, notation: 'Bc4' },
  { id: 'black-knight-2', row: 2, col: 5, notation: 'Nf6' },
  { id: 'white-queen', row: 5, col: 1, notation: 'Qb3' },
  { id: 'black-queen', row: 1, col: 4, notation: 'Qe7' },
  { id: 'white-knight-1', row: 5, col: 2, notation: 'Nc3' },
  { id: 'black-pawn-3', row: 2, col: 2, notation: 'c6' },
  { id: 'white-bishop-1', row: 3, col: 6, notation: 'Bg5' },
  { id: 'black-pawn-2', row: 3, col: 1, notation: 'b5' },
  {
    id: 'white-knight-1',
    row: 3,
    col: 1,
    capture: 'black-pawn-2',
    notation: 'Nxb5',
  },
  {
    id: 'black-pawn-3',
    row: 3,
    col: 1,
    capture: 'white-knight-1',
    notation: 'cxb5',
  },
  {
    id: 'white-bishop-2',
    row: 3,
    col: 1,
    capture: 'black-pawn-3',
    notation: 'Bxb5+',
  },
  { id: 'black-knight-1', row: 1, col: 3, notation: 'Nbd7' },
  {
    id: 'white-king',
    row: 7,
    col: 2,
    castling: {
      id: 'white-rook-1',
      row: 7,
      col: 3,
    },
    notation: '0-0-0',
  },
  { id: 'black-rook-1', row: 0, col: 3, notation: 'Rd8' },
  {
    id: 'white-rook-1',
    row: 1,
    col: 3,
    capture: 'black-knight-1',
    notation: 'Rxd7',
  },
  {
    id: 'black-rook-1',
    row: 1,
    col: 3,
    capture: 'white-rook-1',
    notation: 'Rxd7',
  },
  { id: 'white-rook-2', row: 7, col: 3, notation: 'Rd1' },
  { id: 'black-queen', row: 2, col: 4, notation: 'Qe6' },
  {
    id: 'white-bishop-2',
    row: 1,
    col: 3,
    capture: 'black-rook-1',
    notation: 'Bxd7+',
  },
  {
    id: 'black-knight-2',
    row: 1,
    col: 3,
    capture: 'white-bishop-2',
    notation: 'Nxd7'
  },
  { id: 'white-queen', row: 0, col: 1, notation: 'Qb8+' },
  {
    id: 'black-knight-2',
    row: 0,
    col: 1,
    capture: 'white-queen',
    notation: 'Nxb8',
  },
  { id: 'white-rook-2', row: 0, col: 3, notation: 'Rd8#' },
];

const playGame = async () => {
  setInitialPositions();
  await new Promise((r) => setTimeout(r, 1000));

  for (const m of moves) {
    const piece = document.getElementById(m.id);
    const from = document.querySelector(
      `.square[data-row='${
        piece.style.top.replace('px', '') / SQUARE
      }'][data-col='${piece.style.left.replace('px', '') / SQUARE}']`
    );
    const to = document.querySelector(
      `.square[data-row='${m.row}'][data-col='${m.col}']`
    );

    // Capture if needed
    if (m.capture) {
      const captured = document.getElementById(m.capture);
      if (captured) {
        removePiece(captured);
      }
    }

    highlight(from, to);
    movePiece(piece, m.row, m.col);

    // Clasting move (king special)
    if (m.castling) {
      const rook = document.getElementById(m.castling.id);
      movePiece(rook, m.castling.row, m.castling.col);
    }

    await new Promise((r) => setTimeout(r, 900));
  }
};

// Start when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', playGame);
} else {
  playGame();
}