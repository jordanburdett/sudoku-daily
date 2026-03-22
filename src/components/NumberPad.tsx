interface NumberPadProps {
  notesMode: boolean
  onDigit: (d: number) => void
  onNotes: () => void
  onErase: () => void
  onUndo: () => void
}

const btnBase: React.CSSProperties = {
  width: '44px',
  height: '44px',
  borderRadius: '8px',
  border: '1px solid #C7D2FE',
  background: '#FFFFFF',
  color: '#312E81',
  fontSize: '1.1rem',
  fontWeight: 600,
  cursor: 'pointer',
  fontFamily: 'Inter, system-ui, sans-serif',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  transition: 'background 0.15s',
}

export default function NumberPad({
  notesMode,
  onDigit,
  onNotes,
  onErase,
  onUndo,
}: NumberPadProps) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        alignItems: 'center',
        marginTop: '8px',
      }}
    >
      {/* Digit buttons */}
      <div style={{ display: 'flex', gap: '6px' }}>
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(d => (
          <button
            key={d}
            onClick={() => onDigit(d)}
            style={btnBase}
            aria-label={`Enter ${d}`}
          >
            {d}
          </button>
        ))}
      </div>
      {/* Action buttons */}
      <div style={{ display: 'flex', gap: '8px' }}>
        <button
          onClick={onNotes}
          aria-pressed={notesMode}
          style={{
            ...btnBase,
            width: 'auto',
            padding: '0 14px',
            background: notesMode ? '#6366F1' : '#FFFFFF',
            color: notesMode ? '#FFFFFF' : '#312E81',
          }}
        >
          Notes
        </button>
        <button
          onClick={onErase}
          style={{ ...btnBase, width: 'auto', padding: '0 14px' }}
          aria-label="Erase cell"
        >
          Erase
        </button>
        <button
          onClick={onUndo}
          style={{ ...btnBase, width: 'auto', padding: '0 14px' }}
          aria-label="Undo"
        >
          Undo
        </button>
      </div>
    </div>
  )
}
