interface PencilMarksProps {
  notes: Set<number>
}

export default function PencilMarks({ notes }: PencilMarksProps) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gridTemplateRows: 'repeat(3, 1fr)',
        width: '100%',
        height: '100%',
        padding: '1px',
        boxSizing: 'border-box',
      }}
    >
      {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => (
        <span
          key={n}
          style={{
            fontSize: '0.42rem',
            lineHeight: 1,
            color: '#94A3B8',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            visibility: notes.has(n) ? 'visible' : 'hidden',
          }}
        >
          {n}
        </span>
      ))}
    </div>
  )
}
