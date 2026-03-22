import type { GameState } from '../game/GameEngine'
import CellTile from './CellTile'

interface SudokuBoardProps {
  state: GameState
  highlights: { region: Set<number>; sameDigit: Set<number> }
  conflicts: Set<number>
  onSelectCell: (idx: number) => void
}

export default function SudokuBoard({
  state,
  highlights,
  conflicts,
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
      }}
    >
      {Array.from({ length: 81 }, (_, idx) => {
        const row = Math.floor(idx / 9)
        const col = idx % 9

        const isSelected = state.selectedCell === idx
        const isInRegion = highlights.region.has(idx)
        const isSameDigit = highlights.sameDigit.has(idx)
        const isConflict = conflicts.has(idx)

        // Build cell borders
        const borderTop = row % 3 === 0 && row !== 0 ? '2px solid #C7D2FE' : '1px solid #E2E8F0'
        const borderLeft = col % 3 === 0 && col !== 0 ? '2px solid #C7D2FE' : '1px solid #E2E8F0'
        const borderBottom = '1px solid #E2E8F0'
        const borderRight = '1px solid #E2E8F0'

        return (
          <div
            key={idx}
            role="gridcell"
            aria-label={`Row ${row + 1}, column ${col + 1}${state.board[idx] ? `, value ${state.board[idx]}` : ', empty'}`}
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
              onClick={() => onSelectCell(idx)}
            />
          </div>
        )
      })}
    </div>
  )
}
