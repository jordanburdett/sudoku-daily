import { useEffect, useRef, useState } from 'react'
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
  onClick: () => void
}

export default function CellTile({
  value,
  isGiven,
  isSelected,
  isInRegion,
  isSameDigit,
  isConflict,
  notes,
  onClick,
}: CellTileProps) {
  const prevValue = useRef(value)
  const [popping, setPopping] = useState(false)

  useEffect(() => {
    if (value !== 0 && value !== prevValue.current) {
      setPopping(true)
      const t = setTimeout(() => setPopping(false), 150)
      prevValue.current = value
      return () => clearTimeout(t)
    }
    prevValue.current = value
  }, [value])

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

  return (
    <div
      onClick={onClick}
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
        <span className={popping ? 'digit-pop' : undefined}>{value}</span>
      ) : notes.size > 0 ? (
        <PencilMarks notes={notes} />
      ) : null}
    </div>
  )
}
