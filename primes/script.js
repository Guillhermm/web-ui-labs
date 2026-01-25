/**
 * Constants
 */

const BOARD_SIZE = 4;
const CELL_COUNT = BOARD_SIZE * BOARD_SIZE;
const MOVE_DURATION = 150;
const SWIPE_THRESHOLD = 30;

const PRIMES = [
  2, 3, 5, 7, 11,
  13, 17, 19, 23, 29,
  31, 37, 41, 43, 47,
  53, 59, 61, 67, 71,
  73, 79, 83, 89, 97,
];

const getRandomBasePrime = () =>
  Math.random() < 0.7 ? 2 : 3;

/**
 * Tile colors (Material Dark inspired)
 */
const TILE_COLORS = {
  2: "#03DAC6",
  3: "#00BFA5",
  5: "#4DD0E1",
  7: "#26C6DA",
  11: "#64B5F6",
  13: "#42A5F5",
  17: "#7986CB",
  19: "#5C6BC0",
  23: "#9575CD",
  29: "#7E57C2",
  31: "#AB47BC",
  37: "#9C27B0",
  41: "#FFC107",
  43: "#FFB300",
  47: "#FB8C00",
  53: "#F4511E",
  59: "#E53935",
  61: "#D32F2F",
  67: "#C62828",
  71: "#B71C1C",
};

/**
 * DOM references
 */

const boardElement = document.querySelector(".game-board");
const cells = [...boardElement.querySelectorAll(".cell")];

const scoreValueEl = document.querySelector("[data-score]");
const scoreBestEl = document.querySelector("[data-score-best]");
const primeValueEl = document.querySelector("[data-prime]");
const primeBestEl = document.querySelector("[data-prime-best]");

const nextValueEl = document.querySelector("[data-next]");
const movesValueEl = document.querySelector("[data-moves]");

const newGameBtn = document.querySelector("[data-new-game]");
const infoBtn = document.querySelector("[data-info]");

const gameOverEl = document.querySelector("[data-game-over]");
const finalScoreEl = document.querySelector("[data-final-score]");
const finalMovesEl = document.querySelector("[data-final-moves]");
const finalPrimeEl = document.querySelector("[data-final-prime]");
const restartBtn = document.querySelector("[data-restart]");

const rulesModal = document.querySelector("[data-rules]");
const closeRulesBtn = document.querySelector("[data-close-rules]");

const hudMedalEl = document.querySelector(".hud-medal");

/**
 * Persistent stats
 */

let bestScore = Number(localStorage.getItem("bestScore") || 0);
let bestPrime = Number(localStorage.getItem("bestPrime") || 0);

/**
 * Game state
 */

let board = Array(CELL_COUNT).fill(null);
let moves = 0;
let score = 0;
let isAnimating = false;

let mergedIndexes = new Set();
let spawnedIndex = null;
let currentMedal = "none";

/**
 * Helpers
 */

const boardsEqual = (a, b) =>
  a.every((v, i) => v === b[i]);

const highestPrimeOnBoard = () =>
  Math.max(...board.filter(v => v !== null), 0);

const getNextTargetPrime = () => {
  const maxCurrent = highestPrimeOnBoard();
  const idx = PRIMES.indexOf(maxCurrent);
  return PRIMES[idx + 1] ?? PRIMES[0];
};

/**
 * Medal logic
 */

const medalFromPrime = prime => {
  const n = PRIMES.length;
  if (prime >= PRIMES[n - 1]) return "gold";
  if (prime >= PRIMES[Math.floor(n * 0.85)]) return "silver";
  if (prime >= PRIMES[Math.floor(n * 0.6)]) return "bronze";
  return "none";
};

const updateMedal = () => {
  const medal = medalFromPrime(highestPrimeOnBoard());
  if (medal !== currentMedal) {
    currentMedal = medal;
    hudMedalEl.dataset.medal = medal;
  }
};

/**
 * Tiles
 */

const createTile = (value, index) => {
  const tile = document.createElement("div");
  tile.className = "tile";
  tile.textContent = value;
  tile.dataset.value = value;
  tile.style.background = TILE_COLORS[value] ?? "#d0bcff";

  if (mergedIndexes.has(index)) tile.classList.add("tile--merge");
  if (index === spawnedIndex) tile.classList.add("tile--spawn");

  return tile;
};

const clearCells = () => {
  cells.forEach(cell => (cell.innerHTML = ""));
};

/**
 * Animation helpers
 */

const getCellPosition = index => {
  const rect = cells[index].getBoundingClientRect();
  return { x: rect.left, y: rect.top };
};

const animateMove = (tile, from, to) => {
  const a = getCellPosition(from);
  const b = getCellPosition(to);
  tile.style.transform = `translate(${b.x - a.x}px, ${b.y - a.y}px)`;
};

/**
 * Render
 */

const renderBoard = () => {
  clearCells();

  board.forEach((value, index) => {
    if (value !== null) {
      cells[index].appendChild(createTile(value, index));
    }
  });

  nextValueEl.textContent = getNextTargetPrime();
  movesValueEl.textContent = moves;

  scoreValueEl.textContent = score;
  scoreBestEl.textContent = bestScore;

  const highest = highestPrimeOnBoard();
  primeValueEl.textContent = highest;
  primeBestEl.textContent = bestPrime;

  mergedIndexes.clear();
  spawnedIndex = null;
};

/**
 * Spawning
 */

const getEmptyIndexes = () =>
  board.map((v, i) => (v === null ? i : null)).filter(i => i !== null);

const spawnTile = value => {
  const empty = getEmptyIndexes();
  if (!empty.length) return false;

  spawnedIndex = empty[Math.floor(Math.random() * empty.length)];
  board[spawnedIndex] = value;
  return true;
};

/**
 * Merge helpers
 */

const isValidPrime = sum =>
  PRIMES.includes(sum) && sum <= getNextTargetPrime();

const bestMerge = values => {
  const candidates = [];

  if (values.length >= 2) {
    const sum2 = values[0] + values[1];
    if (isValidPrime(sum2)) candidates.push({ size: 2, value: sum2 });
  }

  if (values.length >= 3) {
    const sum3 = values[0] + values[1] + values[2];
    if (isValidPrime(sum3)) candidates.push({ size: 3, value: sum3 });
  }

  return candidates.sort((a, b) => b.value - a.value)[0] ?? null;
};

/**
 * Movement
 */

const getLineIndexes = direction => {
  const lines = [];

  for (let i = 0; i < BOARD_SIZE; i++) {
    const line = [];
    for (let j = 0; j < BOARD_SIZE; j++) {
      if (direction === "left") line.push(i * BOARD_SIZE + j);
      if (direction === "right") line.push(i * BOARD_SIZE + (BOARD_SIZE - 1 - j));
      if (direction === "up") line.push(j * BOARD_SIZE + i);
      if (direction === "down") line.push((BOARD_SIZE - 1 - j) * BOARD_SIZE + i);
    }
    lines.push(line);
  }
  return lines;
};

const computeMove = direction => {
  const moveAnimations = [];
  const newBoard = [...board];

  getLineIndexes(direction).forEach(line => {
    const values = [];
    const sources = [];

    line.forEach(index => {
      if (board[index] !== null) {
        values.push(board[index]);
        sources.push(index);
      }
    });

    let read = 0;
    let write = 0;

    while (read < values.length) {
      const slice = values.slice(read);
      const merge = bestMerge(slice);
      const targetIndex = line[write];

      if (merge) {
        newBoard[targetIndex] = merge.value;
        mergedIndexes.add(targetIndex);
        score += merge.value;

        progressedThisMove = true;

        for (let i = 0; i < merge.size; i++) {
          moveAnimations.push({
            from: sources[read + i],
            to: targetIndex
          });
        }

        read += merge.size;
      } else {
        newBoard[targetIndex] = values[read];
        moveAnimations.push({
          from: sources[read],
          to: targetIndex
        });
        read += 1;
      }

      write += 1;
    }

    for (let i = write; i < BOARD_SIZE; i++) {
      newBoard[line[i]] = null;
    }
  });

  return { newBoard, moveAnimations };
};

/**
 * Game over
 */

const canMergeLine = values =>
  values.some((_, i) => bestMerge(values.slice(i)));

const isGameOver = () => {
  if (board.includes(null)) return false;

  return !["left", "right", "up", "down"].some(dir =>
    getLineIndexes(dir).some(line =>
      canMergeLine(line.map(i => board[i]).filter(v => v !== null))
    )
  );
};

const showGameOver = () => {
  finalScoreEl.textContent = score;
  finalMovesEl.textContent = moves;
  finalPrimeEl.textContent = highestPrimeOnBoard();
  gameOverEl.classList.remove("hidden");
};

/**
 * Perform move
 */

const move = async direction => {
  if (isAnimating || !gameOverEl.classList.contains("hidden")) return;

  progressedThisMove = false;

  const { newBoard, moveAnimations } = computeMove(direction);
  if (boardsEqual(board, newBoard)) return;

  isAnimating = true;
  moves += 1;

  moveAnimations.forEach(({ from, to }) => {
    const tile = cells[from].querySelector(".tile");
    if (tile) animateMove(tile, from, to);
  });

  setTimeout(() => {
    board = newBoard;
    spawnTile(getRandomBasePrime());

    bestScore = Math.max(bestScore, score);
    bestPrime = Math.max(bestPrime, highestPrimeOnBoard());

    localStorage.setItem("bestScore", bestScore);
    localStorage.setItem("bestPrime", bestPrime);

    isAnimating = false;
    renderBoard();
    updateMedal();

    if (isGameOver()) showGameOver();
  }, MOVE_DURATION);
};

/**
 * Input
 */

window.addEventListener("keydown", e => {
  const map = {
    ArrowLeft: "left",
    ArrowRight: "right",
    ArrowUp: "up",
    ArrowDown: "down",
  };
  if (map[e.key]) {
    e.preventDefault();
    move(map[e.key]);
  }
});

/**
 * Swipe input
 */

let touchStartX = 0;
let touchStartY = 0;

boardElement.addEventListener("touchstart", e => {
  if (e.touches.length !== 1) return;
  const t = e.touches[0];
  touchStartX = t.clientX;
  touchStartY = t.clientY;
}, { passive: true });

boardElement.addEventListener("touchend", e => {
  const t = e.changedTouches[0];
  const dx = t.clientX - touchStartX;
  const dy = t.clientY - touchStartY;

  if (Math.abs(dx) < SWIPE_THRESHOLD && Math.abs(dy) < SWIPE_THRESHOLD) return;

  move(Math.abs(dx) > Math.abs(dy)
    ? (dx > 0 ? "right" : "left")
    : (dy > 0 ? "down" : "up"));
});

/**
 * Rules modal
 */

infoBtn.addEventListener("click", () =>
  rulesModal.classList.remove("hidden")
);

closeRulesBtn.addEventListener("click", () =>
  rulesModal.classList.add("hidden")
);

/**
 * Lifecycle
 */

const animateNewButton = () => {
  newGameBtn.classList.add("animate");

  setTimeout(() => {
    newGameBtn.classList.remove("animate");
  }, [1000]);
}

const startGame = () => {
  board.fill(null);
  moves = 0;
  score = 0;
  currentMedal = "none";

  hudMedalEl.dataset.medal = "none";
  gameOverEl.classList.add("hidden");

  spawnTile(getRandomBasePrime());
  spawnTile(getRandomBasePrime());
  renderBoard();
};

newGameBtn.addEventListener("click", animateNewButton);
newGameBtn.addEventListener("click", startGame);
restartBtn.addEventListener("click", startGame);

startGame();
