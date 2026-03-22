import { useState } from 'react'
import type { StreakState } from '../game/DailyChallenge'
import { formatTime } from '../game/DailyChallenge'

interface ResultCardProps {
  challengeNumber: number
  emojiCard: string  // 9-char string of emoji
  timeMs: number | null
  won: boolean
  usedReveal: boolean
  streak: StreakState
  onNewGame: () => void
  onClose: () => void
}

export default function ResultCard({
  challengeNumber,
  emojiCard,
  timeMs,
  won,
  usedReveal,
  streak,
  onNewGame,
  onClose,
}: ResultCardProps) {
  const [copied, setCopied] = useState(false)

  const title = `Sudoku Daily #${challengeNumber}`
  const emojiRow = [...emojiCard].join('')

  let timeLineShare = ''
  let timeLineDisplay = ''
  if (won) {
    const timeStr = timeMs !== null ? formatTime(timeMs) : '?:??'
    if (usedReveal) {
      timeLineShare = `Solved in ${timeStr} (with hint)`
      timeLineDisplay = `Solved in ${timeStr} (with hint)`
    } else {
      timeLineShare = `Solved in ${timeStr}`
      timeLineDisplay = `Solved in ${timeStr}`
    }
  } else {
    timeLineShare = `⏱ Gave up — better luck tomorrow`
    timeLineDisplay = `Better luck tomorrow!`
  }

  const shareText = `${title}\n${emojiRow}\n${timeLineShare}`

  function handleShare() {
    navigator.clipboard.writeText(shareText).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }).catch(() => {
      // Fallback: try execCommand
      const el = document.createElement('textarea')
      el.value = shareText
      document.body.appendChild(el)
      el.select()
      document.execCommand('copy')
      document.body.removeChild(el)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Daily challenge result"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(30,27,75,0.85)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '16px',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#F0F4FF',
          borderRadius: '16px',
          padding: '28px 24px',
          maxWidth: '360px',
          width: '100%',
          color: '#312E81',
          fontFamily: 'Inter, system-ui, sans-serif',
          boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
          animation: 'resultSlideUp 300ms ease-out',
          position: 'relative',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          aria-label="Close result card"
          style={{
            position: 'absolute',
            top: '12px',
            right: '14px',
            background: 'none',
            border: 'none',
            fontSize: '1.4rem',
            color: '#6366F1',
            cursor: 'pointer',
            lineHeight: 1,
            padding: '4px',
          }}
        >
          ×
        </button>

        {/* Title */}
        <h2
          style={{
            margin: '0 0 16px',
            fontSize: '1.25rem',
            fontWeight: 700,
            textAlign: 'center',
            color: '#312E81',
          }}
        >
          {title}
        </h2>

        {/* Emoji row */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            gap: '4px',
            marginBottom: '16px',
            flexWrap: 'nowrap',
          }}
          aria-label={`Result: ${emojiRow}`}
        >
          {[...emojiCard].map((emoji, i) => (
            <span
              key={i}
              style={{
                fontSize: '1.5rem',
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {emoji}
            </span>
          ))}
        </div>

        {/* Time / result line */}
        <p
          style={{
            textAlign: 'center',
            fontWeight: 600,
            fontSize: '1rem',
            margin: '0 0 12px',
            color: won ? '#10B981' : '#EF4444',
          }}
        >
          {timeLineDisplay}
        </p>

        {/* Streak */}
        {streak.current > 0 && (
          <p
            style={{
              textAlign: 'center',
              fontWeight: 600,
              fontSize: '0.95rem',
              margin: '0 0 16px',
              color: '#F59E0B',
            }}
          >
            {`🔥 Streak: ${streak.current} day${streak.current === 1 ? '' : 's'}`}
          </p>
        )}

        {/* Buttons */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}
        >
          <button
            onClick={handleShare}
            style={{
              padding: '10px 16px',
              borderRadius: '8px',
              border: 'none',
              background: copied ? '#10B981' : '#4F46E5',
              color: '#FFFFFF',
              fontSize: '0.95rem',
              fontWeight: 600,
              cursor: 'pointer',
              fontFamily: 'Inter, system-ui, sans-serif',
              transition: 'background 150ms',
            }}
          >
            {copied ? 'Copied!' : 'Share'}
          </button>

          <button
            onClick={onNewGame}
            style={{
              padding: '10px 16px',
              borderRadius: '8px',
              border: '1px solid #6366F1',
              background: '#EEF2FF',
              color: '#312E81',
              fontSize: '0.95rem',
              fontWeight: 600,
              cursor: 'pointer',
              fontFamily: 'Inter, system-ui, sans-serif',
            }}
          >
            New Game (Free Play)
          </button>
        </div>
      </div>

      <style>{`
        @keyframes resultSlideUp {
          from { transform: translateY(100%); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        @media (prefers-reduced-motion: reduce) {
          * {
            animation: none !important;
            transition: none !important;
          }
        }
      `}</style>
    </div>
  )
}
