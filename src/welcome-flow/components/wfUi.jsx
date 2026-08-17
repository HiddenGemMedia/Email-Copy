/**
 * Shared bits for the Welcome Flow screens.
 * Styling follows the existing app: theme-aware, accent #3b82f6 light /
 * #f59e0b dark, 14px radius cards, translucent surfaces.
 */

import { useTheme } from '../../context/ThemeContext'
import { WF_STATUS } from '../store/welcomeFlowStore'

export function useWfTheme() {
  const { theme } = useTheme()
  const dark = theme === 'dark'
  return {
    dark,
    accent:      dark ? '#f59e0b' : '#3b82f6',
    accentHover: dark ? '#d97706' : '#2563eb',
    onAccent:    dark ? '#111827' : '#ffffff',
    text:        dark ? 'rgba(255,255,255,0.88)' : '#111827',
    muted:       dark ? 'rgba(255,255,255,0.42)' : '#6b7280',
    faint:       dark ? 'rgba(255,255,255,0.28)' : '#9ca3af',
    cardBg:      dark ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.72)',
    border:      dark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)',
    borderHover: dark ? 'rgba(255,255,255,0.15)' : 'rgba(59,130,246,0.25)',
    inputBg:     dark ? 'rgba(255,255,255,0.04)' : '#ffffff',
    pageBg:      'transparent',
  }
}

export function WfCard({ children, hovered = false, style = {}, ...rest }) {
  const t = useWfTheme()
  return (
    <div
      {...rest}
      style={{
        background: t.cardBg,
        border: `1px solid ${hovered ? t.borderHover : t.border}`,
        borderRadius: 14,
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        transition: 'all .2s ease',
        transform: hovered ? 'translateY(-2px)' : 'none',
        boxShadow: hovered
          ? (t.dark ? '0 8px 32px rgba(0,0,0,0.4)' : '0 8px 32px rgba(59,130,246,0.1)')
          : 'none',
        ...style,
      }}
    >
      {children}
    </div>
  )
}

export function WfButton({ children, variant = 'primary', style = {}, ...rest }) {
  const t = useWfTheme()
  const base = {
    display: 'inline-flex', alignItems: 'center', gap: 7,
    padding: '9px 16px', borderRadius: 10, fontSize: 13, fontWeight: 600,
    fontFamily: 'Inter, sans-serif', cursor: rest.disabled ? 'not-allowed' : 'pointer',
    opacity: rest.disabled ? 0.5 : 1, transition: 'all .15s ease', letterSpacing: '-0.01em',
  }
  const skins = {
    primary: { background: t.accent, border: `1px solid ${t.accent}`, color: t.onAccent },
    ghost:   { background: 'transparent', border: `1px solid ${t.border}`, color: t.text },
    subtle:  { background: t.dark ? 'rgba(255,255,255,0.06)' : '#f3f4f6', border: '1px solid transparent', color: t.text },
  }
  return <button {...rest} style={{ ...base, ...skins[variant], ...style }}>{children}</button>
}

export function WfInput({ style = {}, ...rest }) {
  const t = useWfTheme()
  return (
    <input
      {...rest}
      style={{
        width: '100%', padding: '10px 12px', borderRadius: 10,
        border: `1px solid ${t.border}`, background: t.inputBg, color: t.text,
        fontSize: 13, fontFamily: 'Inter, sans-serif', outline: 'none',
        ...style,
      }}
    />
  )
}

export function WfStatusPill({ status }) {
  const t = useWfTheme()
  const meta = WF_STATUS[status] || WF_STATUS.draft
  const tones = {
    good:    { fg: '#16a34a', bg: t.dark ? 'rgba(22,163,74,0.16)'  : 'rgba(22,163,74,0.10)'  },
    warn:    { fg: '#b45309', bg: t.dark ? 'rgba(180,83,9,0.18)'   : 'rgba(245,158,11,0.14)' },
    info:    { fg: '#2563eb', bg: t.dark ? 'rgba(37,99,235,0.18)'  : 'rgba(59,130,246,0.12)' },
    neutral: { fg: t.muted,   bg: t.dark ? 'rgba(255,255,255,0.07)': 'rgba(0,0,0,0.05)'      },
  }
  const c = tones[meta.tone]
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      padding: '3px 10px', borderRadius: 999, background: c.bg, color: c.fg,
      fontSize: 11.5, fontWeight: 600, whiteSpace: 'nowrap',
    }}>
      <span style={{ width: 5, height: 5, borderRadius: 999, background: c.fg, display: 'inline-block' }} />
      {meta.label}
    </span>
  )
}

/**
 * Back / Next row pinned above the step content, same shape as the Weekly Email
 * Campaign's steps. Next is omitted when a step has nowhere to go yet.
 */
export function WfStepNav({ backLabel = 'Back', onBack, nextLabel, onNext, nextDisabled = false }) {
  const t = useWfTheme()
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      gap: 12, marginBottom: 18,
    }}>
      <WfButton variant="ghost" onClick={onBack}>&larr; {backLabel}</WfButton>
      {onNext
        ? <WfButton onClick={onNext} disabled={nextDisabled}>{nextLabel} &rarr;</WfButton>
        : <span />}
    </div>
  )
}

export function WfPageHeader({ title, subtitle, right }) {
  const t = useWfTheme()
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, marginBottom: 22, flexWrap: 'wrap' }}>
      <div>
        <h1 style={{ fontSize: 26, fontWeight: 700, color: t.text, letterSpacing: '-0.02em', margin: 0 }}>{title}</h1>
        {subtitle && <p style={{ fontSize: 13, color: t.muted, margin: '5px 0 0' }}>{subtitle}</p>}
      </div>
      {right && <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>{right}</div>}
    </div>
  )
}
