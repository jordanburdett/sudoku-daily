export const GameStatus = {
  IDLE: 'IDLE',
  PLAYING: 'PLAYING',
  WON: 'WON',
  REVEALED: 'REVEALED',
} as const
export type GameStatus = typeof GameStatus[keyof typeof GameStatus]

export const Difficulty = {
  EASY: 'EASY',
  MEDIUM: 'MEDIUM',
  HARD: 'HARD',
  EXPERT: 'EXPERT',
} as const
export type Difficulty = typeof Difficulty[keyof typeof Difficulty]

export interface GameState {
  solution: number[]
  givens: boolean[]
  board: number[]
  notes: Set<number>[]
  selectedCell: number | null
  gameStatus: GameStatus
  elapsedMs: number
  notesMode: boolean
  difficulty: Difficulty
  undoStackSize: number
}

interface UndoSnapshot {
  board: number[]
  notes: number[][]
}

export default class GameEngine {
  private solution: number[] = new Array(81).fill(0)
  private givens: boolean[] = new Array(81).fill(false)
  private board: number[] = new Array(81).fill(0)
  private notes: Set<number>[] = Array.from({ length: 81 }, () => new Set<number>())
  private selectedCell: number | null = null
  private gameStatus: GameStatus = GameStatus.IDLE
  private undoStack: UndoSnapshot[] = []
  private elapsedMs: number = 0
  private notesMode: boolean = false
  private difficulty: Difficulty = Difficulty.MEDIUM

  private getRow(idx: number): number[] {
    const row = Math.floor(idx / 9)
    return Array.from({ length: 9 }, (_, c) => row * 9 + c)
  }

  private getCol(idx: number): number[] {
    const col = idx % 9
    return Array.from({ length: 9 }, (_, r) => r * 9 + col)
  }

  private getBox(idx: number): number[] {
    const boxRow = Math.floor(Math.floor(idx / 9) / 3) * 3
    const boxCol = Math.floor((idx % 9) / 3) * 3
    const cells: number[] = []
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        cells.push((boxRow + r) * 9 + (boxCol + c))
      }
    }
    return cells
  }

  private pushUndo(): void {
    if (this.undoStack.length >= 100) {
      this.undoStack.shift()
    }
    this.undoStack.push({
      board: [...this.board],
      notes: this.notes.map(s => Array.from(s)),
    })
  }

  loadPuzzle(solution: number[], givens: boolean[], difficulty: Difficulty): void {
    this.solution = [...solution]
    this.givens = [...givens]
    this.board = givens.map((isGiven, i) => (isGiven ? solution[i] : 0))
    this.notes = Array.from({ length: 81 }, () => new Set<number>())
    this.selectedCell = null
    this.gameStatus = GameStatus.PLAYING
    this.undoStack = []
    this.elapsedMs = 0
    this.notesMode = false
    this.difficulty = difficulty
  }

  selectCell(idx: number): void {
    this.selectedCell = idx
  }

  enterDigit(digit: number): void {
    const idx = this.selectedCell
    if (idx === null) return
    if (this.givens[idx]) return
    if (this.gameStatus !== GameStatus.PLAYING) return

    if (this.notesMode) {
      // Toggle digit in notes
      if (this.notes[idx].has(digit)) {
        this.notes[idx].delete(digit)
      } else {
        this.notes[idx].add(digit)
      }
      return
    }

    this.pushUndo()
    this.board[idx] = digit
    this.notes[idx].clear()

    // Check win
    if (this.board.every(v => v !== 0) && this.getConflicts().size === 0) {
      this.gameStatus = GameStatus.WON
    }
  }

  eraseCell(): void {
    const idx = this.selectedCell
    if (idx === null) return
    if (this.givens[idx]) return
    if (this.gameStatus !== GameStatus.PLAYING) return

    this.pushUndo()
    this.board[idx] = 0
    this.notes[idx].clear()
  }

  toggleNotesMode(): void {
    this.notesMode = !this.notesMode
  }

  undo(): void {
    const snapshot = this.undoStack.pop()
    if (!snapshot) return
    this.board = [...snapshot.board]
    this.notes = snapshot.notes.map(arr => new Set<number>(arr))
  }

  tick(deltaMs: number): void {
    if (this.gameStatus === GameStatus.PLAYING) {
      this.elapsedMs += deltaMs
    }
  }

  getState(): GameState {
    return {
      solution: [...this.solution],
      givens: [...this.givens],
      board: [...this.board],
      notes: this.notes.map(s => new Set<number>(s)),
      selectedCell: this.selectedCell,
      gameStatus: this.gameStatus,
      elapsedMs: this.elapsedMs,
      notesMode: this.notesMode,
      difficulty: this.difficulty,
      undoStackSize: this.undoStack.length,
    }
  }

  getConflicts(): Set<number> {
    const conflicts = new Set<number>()

    const checkGroup = (cells: number[]) => {
      const digitCells: Map<number, number[]> = new Map()
      for (const cell of cells) {
        const val = this.board[cell]
        if (val === 0) continue
        if (!digitCells.has(val)) {
          digitCells.set(val, [])
        }
        digitCells.get(val)!.push(cell)
      }
      for (const [, cellList] of digitCells) {
        if (cellList.length >= 2) {
          for (const c of cellList) {
            conflicts.add(c)
          }
        }
      }
    }

    // 9 rows
    for (let r = 0; r < 9; r++) {
      const cells = Array.from({ length: 9 }, (_, c) => r * 9 + c)
      checkGroup(cells)
    }
    // 9 cols
    for (let c = 0; c < 9; c++) {
      const cells = Array.from({ length: 9 }, (_, r) => r * 9 + c)
      checkGroup(cells)
    }
    // 9 boxes
    for (let br = 0; br < 3; br++) {
      for (let bc = 0; bc < 3; bc++) {
        const cells: number[] = []
        for (let r = 0; r < 3; r++) {
          for (let c = 0; c < 3; c++) {
            cells.push((br * 3 + r) * 9 + (bc * 3 + c))
          }
        }
        checkGroup(cells)
      }
    }

    return conflicts
  }

  reveal(solution: number[]): void {
    for (let i = 0; i < 81; i++) {
      if (!this.givens[i] && this.board[i] === 0) {
        this.board[i] = solution[i]
      }
    }
    this.gameStatus = GameStatus.REVEALED
  }

  getHighlights(idx: number): { region: Set<number>; sameDigit: Set<number> } {
    const region = new Set<number>()
    for (const c of this.getRow(idx)) region.add(c)
    for (const c of this.getCol(idx)) region.add(c)
    for (const c of this.getBox(idx)) region.add(c)
    region.delete(idx)

    const sameDigit = new Set<number>()
    const val = this.board[idx]
    if (val !== 0) {
      for (let c = 0; c < 81; c++) {
        if (this.board[c] !== 0 && this.board[c] === val && c !== idx) {
          sameDigit.add(c)
        }
      }
    }

    return { region, sameDigit }
  }
}
