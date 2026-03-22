import { useRef, useState, useEffect, useCallback, useMemo } from 'react'
import GameEngine, { Difficulty } from './game/GameEngine'
import { generatePuzzle } from './game/PuzzleGenerator'
import HUD from './components/HUD'
import SudokuBoard from './components/SudokuBoard'
import NumberPad from './components/NumberPad'

function App() {
  const engineRef = useRef<GameEngine | null>(null)
  if (engineRef.current === null) engineRef.current = new GameEngine()
  const engine = engineRef.current
  const [state, setState] = useState(() => engine.getState())

  const dispatch = useCallback((fn: () => void) => {
    fn()
    setState(engineRef.current!.getState())
  }, [])

  // Generate initial Free Play puzzle on mount
  useEffect(() => {
    const { solution, givens } = generatePuzzle(Difficulty.MEDIUM, Math.random)
    dispatch(() => engineRef.current!.loadPuzzle(solution, givens, Difficulty.MEDIUM))
  }, [dispatch])

  // Keyboard handler
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key >= '1' && e.key <= '9') {
        e.preventDefault()
        dispatch(() => engineRef.current!.enterDigit(parseInt(e.key)))
      } else if (e.key === 'n' || e.key === 'N') {
        dispatch(() => engineRef.current!.toggleNotesMode())
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault()
        dispatch(() => engineRef.current!.eraseCell())
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault()
        dispatch(() => engineRef.current!.undo())
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        const cur = engineRef.current!.getState().selectedCell
        if (cur !== null && cur >= 9) dispatch(() => engineRef.current!.selectCell(cur - 9))
      } else if (e.key === 'ArrowDown') {
        e.preventDefault()
        const cur = engineRef.current!.getState().selectedCell
        if (cur !== null && cur <= 71) dispatch(() => engineRef.current!.selectCell(cur + 9))
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault()
        const cur = engineRef.current!.getState().selectedCell
        if (cur !== null && cur % 9 > 0) dispatch(() => engineRef.current!.selectCell(cur - 1))
      } else if (e.key === 'ArrowRight') {
        e.preventDefault()
        const cur = engineRef.current!.getState().selectedCell
        if (cur !== null && cur % 9 < 8) dispatch(() => engineRef.current!.selectCell(cur + 1))
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [dispatch])

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
      <HUD
        state={state}
        onNewGame={() => {
          const { solution, givens } = generatePuzzle(Difficulty.MEDIUM, Math.random)
          dispatch(() => engineRef.current!.loadPuzzle(solution, givens, Difficulty.MEDIUM))
        }}
      />
      <SudokuBoard
        state={state}
        highlights={highlights}
        conflicts={conflicts}
        onSelectCell={idx => dispatch(() => engineRef.current!.selectCell(idx))}
      />
      <NumberPad
        notesMode={state.notesMode}
        onDigit={d => dispatch(() => engineRef.current!.enterDigit(d))}
        onNotes={() => dispatch(() => engineRef.current!.toggleNotesMode())}
        onErase={() => dispatch(() => engineRef.current!.eraseCell())}
        onUndo={() => dispatch(() => engineRef.current!.undo())}
      />
    </div>
  )
}

export default App
