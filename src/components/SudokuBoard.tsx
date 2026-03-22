import type { GameState } from '../game/GameEngine'
import CellTile from './CellTile'

interface SudokuBoardProps {
  state: GameState
  highlights: { region: Set<number>; sameDigit: Set<number> }
  conflicts: Set<number>
  winCells: Set<number>
  undoCell: number | null
  onSelectCell: (idx: number) => void
}

export default function SudokuBoard({
  state,
  highlights,
  conflicts,
  winCells,
  undoCell,
  onSelectCell,
}: SudokuBoardProps) {
  const cellSize = 'min(9.5vw, 52px)'

  return (
    <div
      role="grid"
      aria-label="Sudoku board"
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(9, ${cellSize})`,
        gridTemplateRows: `repeat(9, ${cellSize})`,
        border: '2px solid #6366F1',
        margin: '12px 0',
        width: 'min(calc(100vw - 32px), 400px)',
      }}
    >
      {Array.from({ length: 81 }, (_, idx) => {
        const row = Math.floor(idx / 9)
        const col = idx % 9

        const isSelected = state.selectedCell === idx
        const isInRegion = highlights.region.has(idx)
        const isSameDigit = highlights.sameDigit.has(idx)
        const isConflict = conflicts.has(idx)
        const isWinPulse = winCells.has(idx)
        const isUndoFrame = undoCell === idx

        // Build cell borders
        const borderTop = row % 3 === 0 && row !== 0 ? '2px solid #C7D2FE' : '1px solid #E2E8F0'
        const borderLeft = col % 3 === 0 && col !== 0 ? '2px solid #C7D2FE' : '1px solid #E2E8F0'
        const borderBottom = '1px solid #E2E8F0'
        const borderRight = '1px solid #E2E8F0'

        return (
          <div
            key={idx}
            style={{
              borderTop,
              borderLeft,
              borderBottom,
              borderRight,
              boxSizing: 'border-box',
            }}
          >
            <CellTile
              idx={idx}
              value={state.board[idx]}
              isGiven={state.givens[idx]}
              isSelected={isSelected}
              isInRegion={isInRegion && !isSelected}
              isSameDigit={isSameDigit && !isSelected && !isInRegion}
              isConflict={isConflict}
              notes={state.notes[idx]}
              isWinPulse={isWinPulse}
              isUndoFrame={isUndoFrame}
              onClick={() => onSelectCell(idx)}
            />
          </div>
        )
      })}
    </div>
  )
}
