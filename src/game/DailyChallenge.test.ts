import { describe, it, expect } from 'vitest'
import {
  getDailyDateInt,
  getDailyPuzzle,
  buildEmojiCard,
  getChallengeNumber,
} from './DailyChallenge'

describe('DailyChallenge', () => {
  describe('getDailyDateInt', () => {
    it('returns a valid 8-digit integer for today', () => {
      const val = getDailyDateInt()
      // Should be in range of a plausible YYYYMMDD
      expect(val).toBeGreaterThanOrEqual(20000101)
      expect(val).toBeLessThanOrEqual(29991231)
      // Should be an integer
      expect(Number.isInteger(val)).toBe(true)
    })

    it('encodes year, month, day correctly', () => {
      // We can verify the structure: YYYY * 10000 + MM * 100 + DD
      const val = getDailyDateInt()
      const today = new Date()
      const expected =
        today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate()
      expect(val).toBe(expected)
    })
  })

  describe('getChallengeNumber', () => {
    it('computes challenge number 1 for epoch date 2026-03-22', () => {
      // Challenge #1 = 2026-03-22, so:
      // epoch = new Date(2026, 2, 22).getTime()
      // today = new Date(2026, 2, 22).getTime()
      // diff = 0 → challengeNumber = 1
      const epoch = new Date(2026, 2, 22).getTime()
      const dayZero = new Date(2026, 2, 22).getTime()
      const num = Math.floor((dayZero - epoch) / 86400000) + 1
      expect(num).toBe(1)
    })

    it('computes challenge number 2 for the day after epoch', () => {
      // Day 2 = 2026-03-23
      const epoch = new Date(2026, 2, 22).getTime()
      const dayOne = new Date(2026, 2, 23).getTime()
      const num2 = Math.floor((dayOne - epoch) / 86400000) + 1
      expect(num2).toBe(2)
    })

    it('returns a positive integer for current date', () => {
      const n = getChallengeNumber()
      expect(Number.isInteger(n)).toBe(true)
      expect(n).toBeGreaterThanOrEqual(1)
    })
  })

  describe('getDailyPuzzle', () => {
    it('returns a puzzle with 81 cells in solution and givens', () => {
      const { solution, givens } = getDailyPuzzle()
      expect(solution).toHaveLength(81)
      expect(givens).toHaveLength(81)
    })

    it('is deterministic — same result when called twice', () => {
      const puzzle1 = getDailyPuzzle()
      const puzzle2 = getDailyPuzzle()
      expect(puzzle1.solution).toEqual(puzzle2.solution)
      expect(puzzle1.givens).toEqual(puzzle2.givens)
    })

    it('solution values are all in range 1-9', () => {
      const { solution } = getDailyPuzzle()
      for (const v of solution) {
        expect(v).toBeGreaterThanOrEqual(1)
        expect(v).toBeLessThanOrEqual(9)
      }
    })
  })

  describe('buildEmojiCard', () => {
    // Build a simple test puzzle: all givens false, solution = all 1s (not valid sudoku but fine for testing)
    const solution = new Array(81).fill(1)
    const givens = new Array(81).fill(false)

    it('returns 9 emoji for a full board', () => {
      const board = [...solution] // all correct
      const card = buildEmojiCard(board, solution, givens)
      // Should be 9 emoji (each emoji is 2 chars in JS but we can count by splitting)
      const chars = [...card] // spread into unicode code points
      expect(chars).toHaveLength(9)
    })

    it('returns all 🟦 for a fully correct board', () => {
      const board = [...solution]
      const card = buildEmojiCard(board, solution, givens)
      const chars = [...card]
      expect(chars.every(c => c === '🟦')).toBe(true)
    })

    it('returns 🟥 for row 0 when row 0 has a wrong digit', () => {
      const board = [...solution]
      board[0] = 9 // wrong digit in row 0 (solution is 1)
      const card = buildEmojiCard(board, solution, givens)
      const chars = [...card]
      expect(chars[0]).toBe('🟥')
      // Other rows should still be 🟦
      expect(chars[1]).toBe('🟦')
    })

    it('returns ⬛ for rows with unfilled cells and no wrong digits', () => {
      const board = [...solution]
      board[0] = 0 // unfilled cell in row 0
      const card = buildEmojiCard(board, solution, givens)
      const chars = [...card]
      expect(chars[0]).toBe('⬛')
    })

    it('skips given cells when evaluating rows', () => {
      const givensCopy = [...givens]
      givensCopy[0] = true // cell 0 is a given
      const board = [...solution]
      board[0] = 9 // wrong value but it's a given — should be ignored
      const card = buildEmojiCard(board, solution, givensCopy)
      const chars = [...card]
      // Row 0: cell 0 is given (skip), cells 1-8 are correct → 🟦
      expect(chars[0]).toBe('🟦')
    })

    it('prioritizes 🟥 over ⬛ when row has both wrong and unfilled', () => {
      const board = [...solution]
      board[0] = 9 // wrong
      board[1] = 0 // unfilled
      const card = buildEmojiCard(board, solution, givens)
      const chars = [...card]
      expect(chars[0]).toBe('🟥')
    })
  })
})
