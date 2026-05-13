// ===== MINESWEEPER CORE ENGINE =====
export class MinesweeperEngine {
  constructor(rows, cols, mines, seed = null) {
    this.rows = rows;
    this.cols = cols;
    this.totalMines = mines;
    this.seed = seed;
    this.board = [];
    this.revealed = [];
    this.flagged = [];
    this.gameOver = false;
    this.gameWon = false;
    this.firstClick = true;
    this.startTime = null;
    this.minesLeft = mines;
    this.cellsRevealed = 0;
    this.totalSafe = rows * cols - mines;
    this.combo = 0;
    this.lastRevealTime = 0;
    this.score = 0;
    this.moves = 0;
    this.wrongFlags = 0;
    this.init();
  }

  init() {
    this.board = Array.from({ length: this.rows }, () => Array(this.cols).fill(0));
    this.revealed = Array.from({ length: this.rows }, () => Array(this.cols).fill(false));
    this.flagged = Array.from({ length: this.rows }, () => Array(this.cols).fill(false));
  }

  // Seeded random for daily challenge
  seededRandom(seed) {
    let s = seed;
    return () => {
      s = (s * 16807 + 0) % 2147483647;
      return (s - 1) / 2147483646;
    };
  }

  placeMines(safeR, safeC) {
    const rng = this.seed !== null ? this.seededRandom(this.seed) : Math.random;
    let placed = 0;
    const safeZone = new Set();
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        safeZone.add(`${safeR + dr},${safeC + dc}`);
      }
    }
    while (placed < this.totalMines) {
      const r = Math.floor((typeof rng === 'function' ? rng() : rng) * this.rows);
      const c = Math.floor((typeof rng === 'function' ? rng() : rng) * this.cols);
      if (this.board[r][c] !== -1 && !safeZone.has(`${r},${c}`)) {
        this.board[r][c] = -1;
        placed++;
      }
    }
    // Calculate numbers
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        if (this.board[r][c] === -1) continue;
        let count = 0;
        this.forNeighbors(r, c, (nr, nc) => {
          if (this.board[nr][nc] === -1) count++;
        });
        this.board[r][c] = count;
      }
    }
  }

  forNeighbors(r, c, fn) {
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue;
        const nr = r + dr, nc = c + dc;
        if (nr >= 0 && nr < this.rows && nc >= 0 && nc < this.cols) {
          fn(nr, nc);
        }
      }
    }
  }

  reveal(r, c) {
    if (this.gameOver || this.revealed[r][c] || this.flagged[r][c]) return { cells: [], exploded: false };

    if (this.firstClick) {
      this.firstClick = false;
      this.startTime = Date.now();
      this.placeMines(r, c);
    }

    this.moves++;
    const now = Date.now();
    if (now - this.lastRevealTime < 1500) {
      this.combo = Math.min(this.combo + 1, 10);
    } else {
      this.combo = 1;
    }
    this.lastRevealTime = now;

    if (this.board[r][c] === -1) {
      this.gameOver = true;
      this.revealed[r][c] = true;
      return { cells: [{ r, c, value: -1 }], exploded: true };
    }

    const revealedCells = [];
    this._floodReveal(r, c, revealedCells);

    // Score calculation
    const basePoints = revealedCells.length * 10;
    const comboMultiplier = this.combo;
    this.score += basePoints * comboMultiplier;

    // Check win
    if (this.cellsRevealed >= this.totalSafe) {
      this.gameWon = true;
      this.gameOver = true;
    }

    return { cells: revealedCells, exploded: false, combo: this.combo, points: basePoints * comboMultiplier };
  }

  _floodReveal(r, c, cells) {
    if (r < 0 || r >= this.rows || c < 0 || c >= this.cols) return;
    if (this.revealed[r][c] || this.flagged[r][c]) return;
    this.revealed[r][c] = true;
    this.cellsRevealed++;
    cells.push({ r, c, value: this.board[r][c] });
    if (this.board[r][c] === 0) {
      this.forNeighbors(r, c, (nr, nc) => this._floodReveal(nr, nc, cells));
    }
  }

  toggleFlag(r, c) {
    if (this.gameOver || this.revealed[r][c]) return null;
    this.flagged[r][c] = !this.flagged[r][c];
    if (this.flagged[r][c]) {
      this.minesLeft--;
      if (this.board[r][c] !== -1) this.wrongFlags++;
    } else {
      this.minesLeft++;
      if (this.board[r][c] !== -1) this.wrongFlags--;
    }
    return this.flagged[r][c];
  }

  chordReveal(r, c) {
    if (!this.revealed[r][c] || this.board[r][c] <= 0) return { cells: [], exploded: false };
    let flagCount = 0;
    this.forNeighbors(r, c, (nr, nc) => {
      if (this.flagged[nr][nc]) flagCount++;
    });
    if (flagCount !== this.board[r][c]) return { cells: [], exploded: false };

    let allCells = [];
    let exploded = false;
    this.forNeighbors(r, c, (nr, nc) => {
      if (!this.revealed[nr][nc] && !this.flagged[nr][nc]) {
        const result = this.reveal(nr, nc);
        allCells = allCells.concat(result.cells);
        if (result.exploded) exploded = true;
      }
    });
    return { cells: allCells, exploded };
  }

  getElapsedTime() {
    if (!this.startTime) return 0;
    return Math.floor((Date.now() - this.startTime) / 1000);
  }

  getAllMines() {
    const mines = [];
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        if (this.board[r][c] === -1) mines.push({ r, c });
      }
    }
    return mines;
  }

  // Calculate probability of mine for unrevealed cells
  calculateProbabilities() {
    const probs = Array.from({ length: this.rows }, () => Array(this.cols).fill(-1));
    const unrevealed = [];
    let remainingMines = this.totalMines;

    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        if (this.flagged[r][c]) {
          remainingMines--;
          probs[r][c] = 1;
        } else if (this.revealed[r][c]) {
          probs[r][c] = 0;
        } else {
          unrevealed.push({ r, c });
        }
      }
    }

    // Constraint-based probability estimation
    const constraints = [];
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        if (!this.revealed[r][c] || this.board[r][c] <= 0) continue;
        const neighbors = [];
        let flaggedCount = 0;
        this.forNeighbors(r, c, (nr, nc) => {
          if (this.flagged[nr][nc]) flaggedCount++;
          else if (!this.revealed[nr][nc]) neighbors.push({ r: nr, c: nc });
        });
        if (neighbors.length > 0) {
          constraints.push({ cells: neighbors, mines: this.board[r][c] - flaggedCount });
        }
      }
    }

    // Simple probability: for each unrevealed cell, count how many constraints it appears in
    const cellScore = {};
    for (const u of unrevealed) {
      const key = `${u.r},${u.c}`;
      cellScore[key] = { total: 0, mineWeight: 0 };
    }

    for (const con of constraints) {
      const prob = con.mines / con.cells.length;
      for (const cell of con.cells) {
        const key = `${cell.r},${cell.c}`;
        if (cellScore[key]) {
          cellScore[key].total++;
          cellScore[key].mineWeight += prob;
        }
      }
    }

    for (const u of unrevealed) {
      const key = `${u.r},${u.c}`;
      const score = cellScore[key];
      if (score.total > 0) {
        probs[u.r][u.c] = Math.min(1, score.mineWeight / score.total);
      } else {
        // Unknown cells - base probability
        probs[u.r][u.c] = remainingMines / unrevealed.length;
      }
    }
    return probs;
  }

  // Find the safest cell to reveal
  findSafestCell() {
    const probs = this.calculateProbabilities();
    let safest = null;
    let minProb = 2;
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        if (!this.revealed[r][c] && !this.flagged[r][c] && probs[r][c] >= 0 && probs[r][c] < minProb) {
          minProb = probs[r][c];
          safest = { r, c, prob: probs[r][c] };
        }
      }
    }
    return safest;
  }

  // Find cells that are definitely mines
  findDefiniteMines() {
    const mines = [];
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        if (!this.revealed[r][c] || this.board[r][c] <= 0) continue;
        const unrevealed = [];
        let flaggedCount = 0;
        this.forNeighbors(r, c, (nr, nc) => {
          if (this.flagged[nr][nc]) flaggedCount++;
          else if (!this.revealed[nr][nc]) unrevealed.push({ r: nr, c: nc });
        });
        if (unrevealed.length === this.board[r][c] - flaggedCount && unrevealed.length > 0) {
          for (const u of unrevealed) {
            if (!mines.find(m => m.r === u.r && m.c === u.c)) {
              mines.push(u);
            }
          }
        }
      }
    }
    return mines;
  }
}
