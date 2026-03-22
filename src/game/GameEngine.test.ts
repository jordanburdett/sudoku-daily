import { describe, it, expect } from 'vitest'
import GameEngine, { GameStatus, Difficulty } from './GameEngine'
import { generatePuzzle, mulberry32 } from './PuzzleGenerator'

function makeEngine(): GameEngine {
  const engine = new GameEngine()
  const rng = mulberry32(12345)
  const { solution, givens } = generatePuzzle(Difficulty.MEDIUM, rng)
  engine.loadPuzzle(solution, givens, Difficulty.MEDIUM)
  return engine
}

// Find a non-given cell in the engine state
function findEmptyCell(engine: GameEngine): number {
  const state = engine.getState()
  for (let i = 0; i < 81; i++) {
    if (!state.givens[i]) return i
  }
  throw new Error('No empty cell found')
}

describe('GameEngine', () => {
  describe('enterDigit', () => {
    it('sets board value for non-given cell', () => {
      const engine = makeEngine()
      const idx = findEmptyCell(engine)
      engine.selectCell(idx)
      engine.enterDigit(5)
      const state = engine.getState()
      expect(state.board[idx]).toBe(5)
    })

    it('does not overwrite a given cell', () => {
      const engine = makeEngine()
      const state = engine.getState()
      const givenIdx = state.givens.findIndex(g => g)
      const originalValue = state.board[givenIdx]
      engine.selectCell(givenIdx)
      engine.enterDigit(originalValue === 9 ? 1 : 9)
      expect(engine.getState().board[givenIdx]).toBe(originalValue)
    })

    it('clears notes when entering a digit', () => {
      const engine = makeEngine()
      const idx = findEmptyCell(engine)
      engine.selectCell(idx)
      // Add a note first
      engine.toggleNotesMode()
      engine.enterDigit(3)
      // Switch back and enter digit
      engine.toggleNotesMode()
      engine.enterDigit(5)
      const state = engine.getState()
      expect(state.notes[idx].size).toBe(0)
    })
  })

  describe('eraseCell', () => {
    it('clears board value for non-given cell', () => {
      const engine = makeEngine()
      const idx = findEmptyCell(engine)
      engine.selectCell(idx)
      engine.enterDigit(5)
      engine.eraseCell()
      expect(engine.getState().board[idx]).toBe(0)
    })

    it('does not erase a given cell', () => {
      const engine = makeEngine()
      const state = engine.getState()
      const givenIdx = state.givens.findIndex(g => g)
      const originalValue = state.board[givenIdx]
      engine.selectCell(givenIdx)
      engine.eraseCell()
      expect(engine.getState().board[givenIdx]).toBe(originalValue)
    })
  })

  describe('undo', () => {
    it('reverts enterDigit', () => {
      const engine = makeEngine()
      const idx = findEmptyCell(engine)
      engine.selectCell(idx)
      engine.enterDigit(5)
      expect(engine.getState().board[idx]).toBe(5)
      engine.undo()
      expect(engine.getState().board[idx]).toBe(0)
    })

    it('reverts eraseCell', () => {
      const engine = makeEngine()
      const idx = findEmptyCell(engine)
      engine.selectCell(idx)
      engine.enterDigit(5)
      engine.eraseCell()
      expect(engine.getState().board[idx]).toBe(0)
      engine.undo()
      expect(engine.getState().board[idx]).toBe(5)
    })

    it('does nothing when stack is empty', () => {
      const engine = makeEngine()
      const stateBefore = engine.getState()
      engine.undo()
      const stateAfter = engine.getState()
      expect(stateAfter.board).toEqual(stateBefore.board)
    })
  })

  describe('win detection', () => {
    it('fires WON when board is complete and conflict-free', () => {
      const engine = new GameEngine()
      const rng = mulberry32(99999)
      const { solution, givens } = generatePuzzle(Difficulty.EASY, rng)
      engine.loadPuzzle(solution, givens, Difficulty.EASY)

      // Fill all empty cells with their solution values
      const state = engine.getState()
      for (let i = 0; i < 81; i++) {
        if (!state.givens[i]) {
          engine.selectCell(i)
          engine.enterDigit(state.solution[i])
        }
      }

      expect(engine.getState().gameStatus).toBe(GameStatus.WON)
    })
  })

  describe('getConflicts', () => {
    it('returns empty set for a clean board', () => {
      const engine = makeEngine()
      expect(engine.getConflicts().size).toBe(0)
    })

    it('detects duplicate in same row', () => {
      // Build a minimal conflict scenario directly
      const engine = new GameEngine()
      // Use a puzzle where we know position of empty cells
      const solution = Array.from({ length: 81 }, (_, i) => {
        // Trivial valid solution: rotate digits per row
        const row = Math.floor(i / 9)
        const col = i % 9
        return ((row * 3 + Math.floor(row / 3) + col) % 9) + 1
      })
      const givens = new Array(81).fill(false)
      engine.loadPuzzle(solution, givens, Difficulty.EASY)

      // Manually place same digit in two cells of row 0
      engine.selectCell(0)
      engine.enterDigit(7)
      engine.selectCell(1)
      engine.enterDigit(7)

      const conflicts = engine.getConflicts()
      expect(conflicts.has(0)).toBe(true)
      expect(conflicts.has(1)).toBe(true)
    })

    it('detects duplicate in same column', () => {
      const engine = new GameEngine()
      const solution = new Array(81).fill(0).map((_, i) => (i % 9) + 1)
      const givens = new Array(81).fill(false)
      engine.loadPuzzle(solution, givens, Difficulty.EASY)

      // Place digit 5 in column 0 at rows 0 and 1
      engine.selectCell(0)
      engine.enterDigit(5)
      engine.selectCell(9)
      engine.enterDigit(5)

      const conflicts = engine.getConflicts()
      expect(conflicts.has(0)).toBe(true)
      expect(conflicts.has(9)).toBe(true)
    })
  })

  describe('notes mode', () => {
    it('enterDigit in notes mode adds candidate', () => {
      const engine = makeEngine()
      const idx = findEmptyCell(engine)
      engine.selectCell(idx)
      engine.toggleNotesMode()
      engine.enterDigit(4)
      expect(engine.getState().notes[idx].has(4)).toBe(true)
    })

    it('enterDigit same digit twice removes it (toggle)', () => {
      const engine = makeEngine()
      const idx = findEmptyCell(engine)
      engine.selectCell(idx)
      engine.toggleNotesMode()
      engine.enterDigit(4)
      engine.enterDigit(4)
      expect(engine.getState().notes[idx].has(4)).toBe(false)
    })

    it('can add multiple candidates', () => {
      const engine = makeEngine()
      const idx = findEmptyCell(engine)
      engine.selectCell(idx)
      engine.toggleNotesMode()
      engine.enterDigit(1)
      engine.enterDigit(3)
      engine.enterDigit(7)
      const notes = engine.getState().notes[idx]
      expect(notes.has(1)).toBe(true)
      expect(notes.has(3)).toBe(true)
      expect(notes.has(7)).toBe(true)
    })
  })
})
