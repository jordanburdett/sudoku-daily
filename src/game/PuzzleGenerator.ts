import { mulberry32 } from '../utils/prng'
import { Difficulty } from './GameEngine'

function shuffleArray<T>(arr: T[], rng: () => number): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function isValidPlacement(grid: number[], idx: number, digit: number): boolean {
  const row = Math.floor(idx / 9)
  const col = idx % 9
  const boxRow = Math.floor(row / 3) * 3
  const boxCol = Math.floor(col / 3) * 3

  // Check row
  for (let c = 0; c < 9; c++) {
    if (grid[row * 9 + c] === digit) return false
  }
  // Check col
  for (let r = 0; r < 9; r++) {
    if (grid[r * 9 + col] === digit) return false
  }
  // Check box
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      if (grid[(boxRow + r) * 9 + (boxCol + c)] === digit) return false
    }
  }
  return true
}

function fillBox(grid: number[], startRow: number, startCol: number, rng: () => number): void {
  const digits = shuffleArray([1, 2, 3, 4, 5, 6, 7, 8, 9], rng)
  let di = 0
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      grid[(startRow + r) * 9 + (startCol + c)] = digits[di++]
    }
  }
}

function solveFill(grid: number[], rng: () => number): boolean {
  // Find first empty cell
  const empty = grid.indexOf(0)
  if (empty === -1) return true

  const digits = shuffleArray([1, 2, 3, 4, 5, 6, 7, 8, 9], rng)
  for (const d of digits) {
    if (isValidPlacement(grid, empty, d)) {
      grid[empty] = d
      if (solveFill(grid, rng)) return true
      grid[empty] = 0
    }
  }
  return false
}

function countSolutions(grid: number[], limit: number): number {
  const empty = grid.indexOf(0)
  if (empty === -1) return 1
  let count = 0
  for (let d = 1; d <= 9; d++) {
    if (isValidPlacement(grid, empty, d)) {
      grid[empty] = d
      count += countSolutions(grid, limit)
      grid[empty] = 0
      if (count >= limit) return count
    }
  }
  return count
}

export function generatePuzzle(
  difficulty: Difficulty,
  rng: () => number
): { solution: number[]; givens: boolean[] } {
  // Phase 1: Generate a valid complete solution
  const grid = new Array(81).fill(0)

  // Fill 3 diagonal boxes
  fillBox(grid, 0, 0, rng)
  fillBox(grid, 3, 3, rng)
  fillBox(grid, 6, 6, rng)

  // Solve the rest with backtracking
  solveFill(grid, rng)

  const solution = [...grid]

  // Phase 2: Remove cells
  // Note: achieving fewer than ~22 givens while maintaining uniqueness is very
  // constrained for the greedy backtracking approach; EXPERT targets ~20-24.
  const givenRanges: Record<Difficulty, [number, number]> = {
    EASY: [36, 40],
    MEDIUM: [28, 32],
    HARD: [24, 28],
    EXPERT: [20, 24],
  }

  const [rangeMin, rangeMax] = givenRanges[difficulty]
  const targetGivens = Math.floor(rangeMin + rng() * (rangeMax - rangeMin + 1))
  const cellsToRemove = 81 - targetGivens

  const shuffledIndices = shuffleArray(
    Array.from({ length: 81 }, (_, i) => i),
    rng
  )

  const board = [...grid]
  let removed = 0

  for (const cellIdx of shuffledIndices) {
    if (removed >= cellsToRemove) break

    const savedValue = board[cellIdx]
    board[cellIdx] = 0

    // Check uniqueness
    const testGrid = [...board]
    const solutions = countSolutions(testGrid, 2)

    if (solutions !== 1) {
      // Not unique — restore
      board[cellIdx] = savedValue
    } else {
      removed++
    }
  }

  const givens = board.map(v => v !== 0)

  return { solution, givens }
}

// Export for deterministic test use
export { mulberry32 }
