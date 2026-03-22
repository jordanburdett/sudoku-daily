import { useRef, useState, useEffect, useCallback, useMemo } from 'react'
import GameEngine, { Difficulty, GameStatus } from './game/GameEngine'
import { generatePuzzle } from './game/PuzzleGenerator'
import {
  getDailyPuzzle,
  getChallengeNumber,
  loadDailyState,
  saveDailyState,
  loadStreak,
  updateStreak,
  buildEmojiCard,
} from './game/DailyChallenge'
import type { StreakState } from './game/DailyChallenge'
import HUD from './components/HUD'
import SudokuBoard from './components/SudokuBoard'
import NumberPad from './components/NumberPad'
import ResultCard from './components/ResultCard'
import { AudioEngine } from './utils/AudioEngine'

function App() {
  const engineRef = useRef<GameEngine | null>(null)
  if (engineRef.current === null) engineRef.current = new GameEngine()
  const engine = engineRef.current
  const [state, setState] = useState(() => engine.getState())

  // AudioEngine stored in useState (not useRef) per task spec
  const [audio] = useState(() => new AudioEngine())

  const [mode, setMode] = useState<'daily' | 'freeplay'>('daily')
  const [difficulty, setDifficulty] = useState<Difficulty>(Difficulty.MEDIUM)
  const [showResult, setShowResult] = useState(false)
  const [streak, setStreak] = useState<StreakState>(() => loadStreak())

  // Win sequence animation state
  const [winCells, setWinCells] = useState<Set<number>>(new Set())

  // Undo animation state: cell index to animate, or null
  const [undoCell, setUndoCell] = useState<number | null>(null)

  // Daily puzzle ref — stored so we can use it for emojiCard and reveal
  const dailySolutionRef = useRef<number[]>([])
  const dailyGivensRef = useRef<boolean[]>([])

  const dispatch = useCallback((fn: () => void) => {
    fn()
    setState(engineRef.current!.getState())
  }, [])

  // Save daily board snapshot after dispatch in daily mode
  const dispatchDaily = useCallback((fn: () => void) => {
    fn()
    const newState = engineRef.current!.getState()
    setState(newState)
    // Save board snapshot
    const existing = loadDailyState()
    if (existing && existing.started && !existing.completed) {
      saveDailyState({
        ...existing,
        boardSnapshot: [...newState.board],
        notesSnapshot: newState.notes.map(s => Array.from(s)),
      })
    }
  }, [])

  // Initialize daily puzzle
  const initDaily = useCallback(() => {
    const { solution, givens } = getDailyPuzzle()
    dailySolutionRef.current = solution
    dailyGivensRef.current = givens

    const saved = loadDailyState()

    if (saved && saved.completed) {
      // Already completed today — load the puzzle and show result
      dispatch(() => engineRef.current!.loadPuzzle(solution, givens, Difficulty.MEDIUM))
      if (saved.boardSnapshot) {
        // Restore board state
        const eng = engineRef.current!
        const boardSnap = saved.boardSnapshot
        const notesSnap = saved.notesSnapshot ?? null
        // Load the puzzle first (already done above), then overwrite board
        dispatch(() => {
          eng.loadPuzzle(solution, givens, Difficulty.MEDIUM)
          // Manually restore via selectCell+enterDigit is too complex;
          // we use a restore method via the engine's internal state
          // Instead we'll just show the completed state
          const st = eng.getState()
          // Apply snapshot by entering digits on empty cells
          for (let i = 0; i < 81; i++) {
            if (!st.givens[i] && boardSnap[i] !== 0) {
              eng.selectCell(i)
              eng.enterDigit(boardSnap[i])
            }
          }
          if (notesSnap) {
            // Can't easily restore notes without direct access, skip for completed state
          }
        })
      }
      setShowResult(true)
    } else if (saved && saved.started && !saved.completed) {
      // In progress — restore board
      const boardSnap = saved.boardSnapshot
      const notesSnap = saved.notesSnapshot
      dispatch(() => {
        const eng = engineRef.current!
        eng.loadPuzzle(solution, givens, Difficulty.MEDIUM)
        if (boardSnap) {
          const st = eng.getState()
          for (let i = 0; i < 81; i++) {
            if (!st.givens[i] && boardSnap[i] !== 0) {
              eng.selectCell(i)
              eng.enterDigit(boardSnap[i])
            }
          }
        }
        if (notesSnap) {
          // Restore notes via notes mode
          const eng2 = engineRef.current!
          eng2.toggleNotesMode()
          for (let i = 0; i < 81; i++) {
            if (notesSnap[i] && notesSnap[i].length > 0) {
              eng2.selectCell(i)
              for (const n of notesSnap[i]) {
                eng2.enterDigit(n)
              }
            }
          }
          eng2.toggleNotesMode()
        }
      })
    } else {
      // Fresh start — load puzzle but don't mark started yet
      dispatch(() => engineRef.current!.loadPuzzle(solution, givens, Difficulty.MEDIUM))
    }
  }, [dispatch])

  // Initialize free play puzzle
  const initFreePlay = useCallback((diff: Difficulty) => {
    const { solution, givens } = generatePuzzle(diff, Math.random)
    dispatch(() => engineRef.current!.loadPuzzle(solution, givens, diff))
  }, [dispatch])

  // Mount: load daily by default
  useEffect(() => {
    initDaily()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Switch to daily
  const switchToDaily = useCallback(() => {
    setMode('daily')
    setShowResult(false)
    initDaily()
  }, [initDaily])

  // Switch to free play
  const switchToFreePlay = useCallback(() => {
    setMode('freeplay')
    setShowResult(false)
    initFreePlay(difficulty)
  }, [initFreePlay, difficulty])

  // Start free play with a specific difficulty
  const startFreePlay = useCallback((diff: Difficulty) => {
    setDifficulty(diff)
    setMode('freeplay')
    setShowResult(false)
    initFreePlay(diff)
  }, [initFreePlay])

  // Win detection for daily mode
  useEffect(() => {
    if (mode !== 'daily') return
    if (state.gameStatus !== GameStatus.WON) return

    const existingSaved = loadDailyState()
    if (existingSaved?.completed) return // already processed

    const emojiCard = buildEmojiCard(
      state.board,
      dailySolutionRef.current,
      dailyGivensRef.current,
    )
    const newStreak = updateStreak(false)
    setStreak(newStreak)

    saveDailyState({
      started: true,
      completed: true,
      won: true,
      usedReveal: false,
      timeMs: state.elapsedMs,
      emojiCard,
      challengeNumber: getChallengeNumber(),
      boardSnapshot: [...state.board],
      notesSnapshot: state.notes.map(s => Array.from(s)),
    })

    // Delay matches win animation duration: 81 cells × 8ms + 200ms buffer = 848ms
    const timer = setTimeout(() => setShowResult(true), 81 * 8 + 200)
    return () => clearTimeout(timer)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.gameStatus, mode])

  // Win sequence animation — fires when gameStatus transitions to WON
  useEffect(() => {
    if (state.gameStatus !== GameStatus.WON) return

    audio.playWinChime()
    const timeouts: ReturnType<typeof setTimeout>[] = []
    for (let i = 0; i < 81; i++) {
      const t = setTimeout(() => {
        setWinCells(prev => new Set([...prev, i]))
      }, i * 8)
      timeouts.push(t)
    }
    // Clear win cells after animation completes (result card will show)
    const finalT = setTimeout(() => {
      setWinCells(new Set())
    }, 81 * 8 + 200)
    timeouts.push(finalT)
    return () => timeouts.forEach(clearTimeout)
  // audio is stable (from useState), safe to omit
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.gameStatus])

  // Free play win detection — show result card after animation completes
  useEffect(() => {
    if (mode !== 'freeplay') return
    if (state.gameStatus !== GameStatus.WON) return

    const timer = setTimeout(() => setShowResult(true), 81 * 8 + 200)
    return () => clearTimeout(timer)
  }, [state.gameStatus, mode])

  // Keyboard handler
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      const engState = engineRef.current!.getState()
      if (e.key >= '1' && e.key <= '9') {
        e.preventDefault()
        if (mode === 'daily') {
          // One-attempt sentinel
          const existing = loadDailyState()
          if (!existing || !existing.started) {
            saveDailyState({
              started: true,
              completed: false,
              won: false,
              usedReveal: false,
              timeMs: null,
              emojiCard: null,
              challengeNumber: getChallengeNumber(),
              boardSnapshot: null,
              notesSnapshot: null,
            })
          }
          // Check conflicts before and after for buzz
          const beforeConflicts = engineRef.current!.getConflicts().size
          dispatchDaily(() => engineRef.current!.enterDigit(parseInt(e.key)))
          const afterConflicts = engineRef.current!.getConflicts().size
          if (engState.notesMode) {
            audio.playNotesBlip()
          } else {
            audio.playDigitTick()
            if (afterConflicts > beforeConflicts) audio.playConflictBuzz()
          }
        } else {
          const beforeConflicts = engineRef.current!.getConflicts().size
          dispatch(() => engineRef.current!.enterDigit(parseInt(e.key)))
          const afterConflicts = engineRef.current!.getConflicts().size
          if (engState.notesMode) {
            audio.playNotesBlip()
          } else {
            audio.playDigitTick()
            if (afterConflicts > beforeConflicts) audio.playConflictBuzz()
          }
        }
      } else if (e.key === 'n' || e.key === 'N') {
        dispatch(() => engineRef.current!.toggleNotesMode())
        audio.playNotesBlip()
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault()
        const sel = engState.selectedCell
        const hadContent = sel !== null && (engState.board[sel] !== 0 || engState.notes[sel].size > 0)
        if (mode === 'daily') {
          dispatchDaily(() => engineRef.current!.eraseCell())
        } else {
          dispatch(() => engineRef.current!.eraseCell())
        }
        if (hadContent) audio.playEraseSwipe()
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault()
        const sel = engState.selectedCell
        dispatch(() => engineRef.current!.undo())
        audio.playUndoPop()
        // Trigger undo animation on the selected cell
        if (sel !== null) {
          setUndoCell(sel)
          setTimeout(() => setUndoCell(null), 200)
        }
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        const cur = engState.selectedCell
        if (cur !== null && cur >= 9) dispatch(() => engineRef.current!.selectCell(cur - 9))
      } else if (e.key === 'ArrowDown') {
        e.preventDefault()
        const cur = engState.selectedCell
        if (cur !== null && cur <= 71) dispatch(() => engineRef.current!.selectCell(cur + 9))
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault()
        const cur = engState.selectedCell
        if (cur !== null && cur % 9 > 0) dispatch(() => engineRef.current!.selectCell(cur - 1))
      } else if (e.key === 'ArrowRight') {
        e.preventDefault()
        const cur = engState.selectedCell
        if (cur !== null && cur % 9 < 8) dispatch(() => engineRef.current!.selectCell(cur + 1))
      } else if (e.key === 'Escape') {
        dispatch(() => engineRef.current!.selectCell(-1))
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [dispatch, dispatchDaily, mode, audio])

  // Timer
  useEffect(() => {
    const interval = setInterval(() => {
      if (engineRef.current!.getState().gameStatus === 'PLAYING') {
        engineRef.current!.tick(1000)
        setState(engineRef.current!.getState())
      }
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  // Reveal handler (daily mode only)
  const handleReveal = useCallback(() => {
    const confirmed = window.confirm(
      'Are you sure you want to reveal the solution? This will end your daily challenge.'
    )
    if (!confirmed) return

    const solution = dailySolutionRef.current
    const givens = dailyGivensRef.current

    dispatch(() => engineRef.current!.reveal(solution))
    const newState = engineRef.current!.getState()

    const emojiCard = buildEmojiCard(newState.board, solution, givens)

    saveDailyState({
      started: true,
      completed: true,
      won: false,
      usedReveal: true,
      timeMs: newState.elapsedMs,
      emojiCard,
      challengeNumber: getChallengeNumber(),
      boardSnapshot: [...newState.board],
      notesSnapshot: newState.notes.map(s => Array.from(s)),
    })

    setShowResult(true)
  }, [dispatch])

  // Handle new game from result card
  const handleNewGameFromResult = useCallback(() => {
    setShowResult(false)
    setMode('freeplay')
    initFreePlay(Difficulty.MEDIUM)
    setDifficulty(Difficulty.MEDIUM)
  }, [initFreePlay])

  // Compute highlights
  const highlights = useMemo(
    () =>
      state.selectedCell !== null
        ? engine.getHighlights(state.selectedCell)
        : { region: new Set<number>(), sameDigit: new Set<number>() },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [state.selectedCell, state.board]
  )
  const conflicts = useMemo(
    () => engine.getConflicts(),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [state.board]
  )

  // Derive result card props from saved daily state
  const savedDaily = showResult ? loadDailyState() : null

  const buttonBase: React.CSSProperties = {
    padding: '8px 18px',
    borderRadius: '8px',
    fontSize: '0.9rem',
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: 'Inter, system-ui, sans-serif',
    border: 'none',
    transition: 'background 150ms, color 150ms',
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#F0F4FF',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '16px',
      }}
    >
      <h1
        style={{
          color: '#312E81',
          fontFamily: 'Inter, system-ui, sans-serif',
          marginBottom: '8px',
        }}
      >
        Sudoku
      </h1>

      {/* Mode selector tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
        <button
          onClick={switchToDaily}
          style={{
            ...buttonBase,
            background: mode === 'daily' ? '#4F46E5' : '#EEF2FF',
            color: mode === 'daily' ? 'white' : '#312E81',
          }}
        >
          {`Daily #${getChallengeNumber()}`}
        </button>
        <button
          onClick={switchToFreePlay}
          style={{
            ...buttonBase,
            background: mode === 'freeplay' ? '#4F46E5' : '#EEF2FF',
            color: mode === 'freeplay' ? 'white' : '#312E81',
          }}
        >
          Free Play
        </button>
      </div>

      {/* Free Play difficulty selector */}
      {mode === 'freeplay' && (
        <div style={{ display: 'flex', gap: '6px', marginBottom: '8px' }}>
          {(['EASY', 'MEDIUM', 'HARD', 'EXPERT'] as Difficulty[]).map(d => (
            <button
              key={d}
              onClick={() => startFreePlay(d)}
              style={{
                ...buttonBase,
                padding: '5px 12px',
                fontSize: '0.8rem',
                background: difficulty === d ? '#4F46E5' : '#EEF2FF',
                color: difficulty === d ? 'white' : '#312E81',
              }}
            >
              {d[0] + d.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
      )}

      <HUD
        state={state}
        onNewGame={() => {
          if (mode === 'daily') {
            switchToFreePlay()
          } else {
            const { solution, givens } = generatePuzzle(difficulty, Math.random)
            dispatch(() => engineRef.current!.loadPuzzle(solution, givens, difficulty))
          }
        }}
      />

      {/* Reveal button — daily only, only while playing */}
      {mode === 'daily' && state.gameStatus === GameStatus.PLAYING && (
        <div style={{ marginBottom: '6px' }}>
          <button
            onClick={handleReveal}
            style={{
              ...buttonBase,
              padding: '5px 14px',
              fontSize: '0.82rem',
              background: '#EEF2FF',
              color: '#6366F1',
              border: '1px solid #6366F1',
            }}
          >
            Reveal
          </button>
        </div>
      )}

      <SudokuBoard
        state={state}
        highlights={highlights}
        conflicts={conflicts}
        winCells={winCells}
        undoCell={undoCell}
        onSelectCell={idx => dispatch(() => engineRef.current!.selectCell(idx))}
      />
      <NumberPad
        notesMode={state.notesMode}
        onDigit={d => {
          if (mode === 'daily') {
            // One-attempt sentinel
            const existing = loadDailyState()
            if (!existing || !existing.started) {
              saveDailyState({
                started: true,
                completed: false,
                won: false,
                usedReveal: false,
                timeMs: null,
                emojiCard: null,
                challengeNumber: getChallengeNumber(),
                boardSnapshot: null,
                notesSnapshot: null,
              })
            }
            const engState = engineRef.current!.getState()
            const beforeConflicts = engineRef.current!.getConflicts().size
            dispatchDaily(() => engineRef.current!.enterDigit(d))
            const afterConflicts = engineRef.current!.getConflicts().size
            if (engState.notesMode) {
              audio.playNotesBlip()
            } else {
              audio.playDigitTick()
              if (afterConflicts > beforeConflicts) audio.playConflictBuzz()
            }
          } else {
            const engState = engineRef.current!.getState()
            const beforeConflicts = engineRef.current!.getConflicts().size
            dispatch(() => engineRef.current!.enterDigit(d))
            const afterConflicts = engineRef.current!.getConflicts().size
            if (engState.notesMode) {
              audio.playNotesBlip()
            } else {
              audio.playDigitTick()
              if (afterConflicts > beforeConflicts) audio.playConflictBuzz()
            }
          }
        }}
        onNotes={() => {
          dispatch(() => engineRef.current!.toggleNotesMode())
          audio.playNotesBlip()
        }}
        onErase={() => {
          const engState = engineRef.current!.getState()
          const sel = engState.selectedCell
          const hadContent = sel !== null && (engState.board[sel] !== 0 || engState.notes[sel].size > 0)
          if (mode === 'daily') {
            dispatchDaily(() => engineRef.current!.eraseCell())
          } else {
            dispatch(() => engineRef.current!.eraseCell())
          }
          if (hadContent) audio.playEraseSwipe()
        }}
        onUndo={() => {
          const engState = engineRef.current!.getState()
          const sel = engState.selectedCell
          dispatch(() => engineRef.current!.undo())
          audio.playUndoPop()
          if (sel !== null) {
            setUndoCell(sel)
            setTimeout(() => setUndoCell(null), 200)
          }
        }}
      />

      {/* Result card overlay */}
      {showResult && mode === 'daily' && savedDaily && (
        <ResultCard
          isDaily
          challengeNumber={savedDaily.challengeNumber}
          emojiCard={savedDaily.emojiCard ?? '⬛⬛⬛⬛⬛⬛⬛⬛⬛'}
          timeMs={savedDaily.timeMs}
          won={savedDaily.won}
          usedReveal={savedDaily.usedReveal}
          streak={streak}
          onNewGame={handleNewGameFromResult}
          onClose={() => setShowResult(false)}
        />
      )}
      {showResult && mode === 'freeplay' && (
        <ResultCard
          isDaily={false}
          timeMs={state.elapsedMs}
          won
          usedReveal={false}
          onNewGame={handleNewGameFromResult}
          onClose={() => setShowResult(false)}
        />
      )}
    </div>
  )
}

export default App
