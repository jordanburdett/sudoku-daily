import { describe, it, expect } from 'vitest'
import { generatePuzzle, mulberry32 } from './PuzzleGenerator'
import { Difficulty } from './GameEngine'

function isValidSudoku(solution: number[]): boolean {
  // Check all 9 rows, 9 cols, 9 boxes have digits 1-9 exactly once
  const checkGroup = (cells: number[]): boolean => {
    const vals = cells.map(i => solution[i])
    const sorted = [...vals].sort((a, b) => a - b)
    return sorted.every((v, idx) => v === idx + 1)
  }

  for (let r = 0; r < 9; r++) {
    const cells = Array.from({ length: 9 }, (_, c) => r * 9 + c)
    if (!checkGroup(cells)) return false
  }
  for (let c = 0; c < 9; c++) {
    const cells = Array.from({ length: 9 }, (_, r) => r * 9 + c)
    if (!checkGroup(cells)) return false
  }
  for (let br = 0; br < 3; br++) {
    for (let bc = 0; bc < 3; bc++) {
      const cells: number[] = []
      for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 3; c++) {
          cells.push((br * 3 + r) * 9 + (bc * 3 + c))
        }
      }
      if (!checkGroup(cells)) return false
    }
  }
  return true
}

function countGivens(givens: boolean[]): number {
  return givens.filter(Boolean).length
}

describe('PuzzleGenerator', () => {
  it('generates EASY puzzle with 36-40 givens', () => {
    const rng = mulberry32(12345)
    const { givens } = generatePuzzle(Difficulty.EASY, rng)
    const count = countGivens(givens)
    expect(count).toBeGreaterThanOrEqual(36)
    expect(count).toBeLessThanOrEqual(40)
  })

  it('generates MEDIUM puzzle with 28-32 givens', () => {
    const rng = mulberry32(12345)
    const { givens } = generatePuzzle(Difficulty.MEDIUM, rng)
    const count = countGivens(givens)
    expect(count).toBeGreaterThanOrEqual(28)
    expect(count).toBeLessThanOrEqual(32)
  })

  it('generates HARD puzzle with 24-28 givens', () => {
    const rng = mulberry32(12345)
    const { givens } = generatePuzzle(Difficulty.HARD, rng)
    const count = countGivens(givens)
    expect(count).toBeGreaterThanOrEqual(24)
    expect(count).toBeLessThanOrEqual(28)
  })

  it('generates EXPERT puzzle with 20-26 givens', () => {
    const rng = mulberry32(12345)
    const { givens } = generatePuzzle(Difficulty.EXPERT, rng)
    const count = countGivens(givens)
    expect(count).toBeGreaterThanOrEqual(20)
    expect(count).toBeLessThanOrEqual(26)
  })

  it('solution is a valid complete Sudoku', () => {
    const rng = mulberry32(12345)
    const { solution } = generatePuzzle(Difficulty.MEDIUM, rng)
    expect(solution).toHaveLength(81)
    expect(isValidSudoku(solution)).toBe(true)
  })

  it('is deterministic — same seed produces same puzzle', () => {
    const rng1 = mulberry32(12345)
    const { solution: sol1, givens: givens1 } = generatePuzzle(Difficulty.MEDIUM, rng1)

    const rng2 = mulberry32(12345)
    const { solution: sol2, givens: givens2 } = generatePuzzle(Difficulty.MEDIUM, rng2)

    expect(sol1).toEqual(sol2)
    expect(givens1).toEqual(givens2)
  })

  it('all solution values are in range 1-9', () => {
    const rng = mulberry32(42)
    const { solution } = generatePuzzle(Difficulty.EASY, rng)
    for (const v of solution) {
      expect(v).toBeGreaterThanOrEqual(1)
      expect(v).toBeLessThanOrEqual(9)
    }
  })

  it('given cells match the solution values', () => {
    const rng = mulberry32(777)
    const { solution, givens } = generatePuzzle(Difficulty.MEDIUM, rng)
    // This requires us to rebuild the board
    const board = givens.map((isGiven, i) => (isGiven ? solution[i] : 0))
    for (let i = 0; i < 81; i++) {
      if (givens[i]) {
        expect(board[i]).toBe(solution[i])
      } else {
        expect(board[i]).toBe(0)
      }
    }
  })
})
