import { mulberry32 } from '../utils/prng'
import { generatePuzzle } from './PuzzleGenerator'
import { Difficulty } from './GameEngine'

// Date seed: local date integer YYYYMMDD
export function getDailyDateInt(): number {
  const today = new Date()
  return today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate()
}

// Challenge number: Day 1 = 2026-03-22
export function getChallengeNumber(): number {
  const today = new Date()
  const epoch = new Date(2026, 2, 22) // local date — NOT new Date('2026-03-22') UTC
  const diffMs = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime() - epoch.getTime()
  return Math.floor(diffMs / 86400000) + 1
}

// YYYY-MM-DD string for localStorage key
export function getLocalDateString(): string {
  const today = new Date()
  const y = today.getFullYear()
  const m = String(today.getMonth() + 1).padStart(2, '0')
  const d = String(today.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

// Daily localStorage key
export function getDailyStorageKey(): string {
  return `sdk-daily-${getLocalDateString()}`
}

// Daily state shape
export interface DailyState {
  started: boolean
  completed: boolean
  won: boolean
  usedReveal: boolean
  timeMs: number | null
  emojiCard: string | null
  challengeNumber: number
  boardSnapshot: number[] | null
  notesSnapshot: number[][] | null
}

// Streak shape
export interface StreakState {
  current: number
  best: number
  lastWonDate: string | null
}

export function loadDailyState(): DailyState | null {
  try {
    const raw = localStorage.getItem(getDailyStorageKey())
    if (!raw) return null
    return JSON.parse(raw) as DailyState
  } catch { return null }
}

export function saveDailyState(state: DailyState): void {
  try {
    localStorage.setItem(getDailyStorageKey(), JSON.stringify(state))
  } catch { /* ignore */ }
}

export function loadStreak(): StreakState {
  try {
    const raw = localStorage.getItem('sdk-streak')
    if (!raw) return { current: 0, best: 0, lastWonDate: null }
    return JSON.parse(raw) as StreakState
  } catch { return { current: 0, best: 0, lastWonDate: null } }
}

export function saveStreak(streak: StreakState): void {
  try {
    localStorage.setItem('sdk-streak', JSON.stringify(streak))
  } catch { /* ignore */ }
}

// Get yesterday's date string
function getYesterdayString(): string {
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  const y = yesterday.getFullYear()
  const m = String(yesterday.getMonth() + 1).padStart(2, '0')
  const d = String(yesterday.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

// Update streak after a win
export function updateStreak(usedReveal: boolean): StreakState {
  const streak = loadStreak()
  const today = getLocalDateString()
  if (streak.lastWonDate === today) return streak // already counted today
  if (!usedReveal) {
    // Only increment on clean wins
    const yesterday = getYesterdayString()
    const newCurrent = streak.lastWonDate === yesterday ? streak.current + 1 : 1
    const newBest = Math.max(newCurrent, streak.best)
    const updated = { current: newCurrent, best: newBest, lastWonDate: today }
    saveStreak(updated)
    return updated
  }
  return streak
}

// Generate today's daily puzzle
export function getDailyPuzzle(): { solution: number[], givens: boolean[] } {
  const dateInt = getDailyDateInt()
  const rng = mulberry32(dateInt)
  return generatePuzzle(Difficulty.MEDIUM, rng)
}

// Compute emoji result card
// 9 rows: for each row of the 9x9 grid:
// 🟦 = all non-given cells in this row match the solution (and are filled)
// 🟥 = any non-given cell has a wrong filled digit (board !== 0 && board !== solution)
// ⬛ = row has any unfilled non-given cell (no wrong digits)
export function buildEmojiCard(board: number[], solution: number[], givens: boolean[]): string {
  const rows: string[] = []
  for (let row = 0; row < 9; row++) {
    let hasWrong = false
    let hasUnfilled = false
    for (let col = 0; col < 9; col++) {
      const idx = row * 9 + col
      if (givens[idx]) continue // skip givens
      const b = board[idx]
      const s = solution[idx]
      if (b === 0) {
        hasUnfilled = true
      } else if (b !== s) {
        hasWrong = true
      }
    }
    if (hasWrong) rows.push('🟥')
    else if (hasUnfilled) rows.push('⬛')
    else rows.push('🟦')
  }
  return rows.join('')
}

// Format time M:SS
export function formatTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000)
  const m = Math.floor(totalSeconds / 60)
  const s = totalSeconds % 60
  return `${m}:${String(s).padStart(2, '0')}`
}
