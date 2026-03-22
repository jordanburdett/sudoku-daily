import type { GameState } from '../game/GameEngine'

interface HUDProps {
  state: GameState
  onNewGame: () => void
}

function formatTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}

const difficultyColors: Record<string, string> = {
  EASY: '#10B981',
  MEDIUM: '#F59E0B',
  HARD: '#EF4444',
  EXPERT: '#8B5CF6',
}

export default function HUD({ state, onNewGame }: HUDProps) {
  const diffColor = difficultyColors[state.difficulty] ?? '#6366F1'

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        marginBottom: '8px',
        fontFamily: 'Inter, system-ui, sans-serif',
        flexWrap: 'wrap',
        justifyContent: 'center',
      }}
    >
      {/* Timer */}
      <span
        style={{
          fontSize: '1.1rem',
          fontWeight: 600,
          color: '#4F46E5',
          minWidth: '52px',
        }}
        aria-live="polite"
        aria-label={`Elapsed time: ${formatTime(state.elapsedMs)}`}
      >
        {formatTime(state.elapsedMs)}
      </span>

      {/* Difficulty badge */}
      <span
        style={{
          fontSize: '0.78rem',
          fontWeight: 700,
          color: '#FFFFFF',
          background: diffColor,
          borderRadius: '12px',
          padding: '2px 10px',
          letterSpacing: '0.05em',
          textTransform: 'uppercase',
        }}
      >
        {state.difficulty}
      </span>

      {/* Win message */}
      {state.gameStatus === 'WON' && (
        <span
          style={{
            fontSize: '1rem',
            fontWeight: 700,
            color: '#10B981',
          }}
        >
          You solved it!
        </span>
      )}

      {/* New Game button */}
      <button
        onClick={onNewGame}
        style={{
          padding: '6px 16px',
          borderRadius: '8px',
          border: '1px solid #6366F1',
          background: '#6366F1',
          color: '#FFFFFF',
          fontSize: '0.9rem',
          fontWeight: 600,
          cursor: 'pointer',
          fontFamily: 'Inter, system-ui, sans-serif',
        }}
      >
        New Game
      </button>
    </div>
  )
}
