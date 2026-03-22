import PencilMarks from './PencilMarks'

interface CellTileProps {
  idx: number
  value: number
  isGiven: boolean
  isSelected: boolean
  isInRegion: boolean
  isSameDigit: boolean
  isConflict: boolean
  notes: Set<number>
  isWinPulse?: boolean
  isUndoFrame?: boolean
  onClick: () => void
}

export default function CellTile({
  idx,
  value,
  isGiven,
  isSelected,
  isInRegion,
  isSameDigit,
  isConflict,
  notes,
  isWinPulse,
  isUndoFrame,
  onClick,
}: CellTileProps) {

  let background = '#FFFFFF'
  if (isSelected) {
    background = '#E0E7FF'
  } else if (isInRegion) {
    background = '#EEF2FF'
  } else if (isSameDigit) {
    background = '#DBEAFE'
  }

  if (isConflict) {
    background = 'rgba(239,68,68,0.12)'
  }

  const digitColor = isConflict
    ? '#EF4444'
    : isGiven
    ? '#312E81'
    : '#4F46E5'

  const fontWeight = isGiven ? 700 : 500

  // Determine digit span class name
  let spanClassName = 'digit-pop'
  if (isWinPulse) spanClassName = 'win-pulse'
  else if (isUndoFrame) spanClassName = 'undo-reveal'

  const row = Math.floor(idx / 9)
  const col = idx % 9
  const digit = value !== 0 ? value : null

  return (
    <div
      role="gridcell"
      tabIndex={0}
      aria-label={`Row ${row + 1} Col ${col + 1}${digit ? `, digit ${digit}` : ''}`}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onClick()
        }
      }}
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background,
        cursor: 'pointer',
        userSelect: 'none',
        fontSize: '1.1rem',
        color: digitColor,
        fontWeight,
        fontFamily: 'Inter, system-ui, sans-serif',
        transition: 'background 0.1s',
        position: 'relative',
        boxSizing: 'border-box',
      }}
    >
      {value !== 0 ? (
        <span key={`${idx}-${value}-${isWinPulse ? 'w' : isUndoFrame ? 'u' : 'n'}`} className={spanClassName}>{value}</span>
      ) : notes.size > 0 ? (
        <PencilMarks notes={notes} />
      ) : null}
    </div>
  )
}
