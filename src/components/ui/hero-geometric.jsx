"use client"

import { motion } from "framer-motion"
import { IconDiamond, IconPlayerPlay, IconRoute } from "@tabler/icons-react"
import { useTheme } from "../../context/ThemeContext"

export default function HeroGeometric({ badge = "Hidden Gem Media", title1 = "Email Production", title2 = "Studio", onStart, onWelcomeFlow }) {
  const { theme } = useTheme()
  const dark = theme === 'dark'

  const fadeUpVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: (i) => ({
      opacity: 1,
      y: 0,
      transition: { duration: 1, delay: 0.5 + i * 0.2, ease: [0.25, 0.4, 0.25, 1] },
    }),
  }

  const accentColor    = dark ? '#f59e0b' : '#3b82f6'
  const title2Gradient = dark
    ? 'bg-gradient-to-r from-amber-300 via-orange-200 to-yellow-300'
    : 'bg-gradient-to-r from-blue-500 via-indigo-400 to-sky-400'
  const btnBg          = dark ? '#f59e0b' : '#3b82f6'
  const btnHover       = dark ? '#d97706' : '#2563eb'
  const btnText        = dark ? '#111827' : '#fff'

  return (
    <div
      className="relative w-full flex items-center justify-center"
      style={{ minHeight: '52vh' }}
    >
      {/* Content */}
      <div className="relative z-10 container mx-auto px-6 py-8 text-center">
        <div className="max-w-3xl mx-auto">

          {/* Badge */}
          <motion.div
            custom={0} variants={fadeUpVariants} initial="hidden" animate="visible"
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-4"
            style={{
              background: dark ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.72)',
              border: `1px solid ${dark ? 'rgba(255,255,255,0.1)' : 'rgba(59,130,246,0.15)'}`,
              backdropFilter: 'blur(8px)',
            }}
          >
            <IconDiamond size={14} color={accentColor} stroke={1.8} />
            <span style={{ fontSize: 11, color: dark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.4)', letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 500 }}>
              {badge}
            </span>
          </motion.div>

          {/* Headline */}
          <motion.div custom={1} variants={fadeUpVariants} initial="hidden" animate="visible">
            <h1 className="font-bold tracking-tight mb-4" style={{ fontSize: 'clamp(32px, 5.5vw, 64px)', lineHeight: 1.05 }}>
              <span className={`bg-clip-text text-transparent ${dark ? 'bg-gradient-to-b from-white to-white/75' : 'bg-gradient-to-b from-gray-900 to-gray-700'}`}>
                {title1}
              </span>
              <br />
              <span className={`bg-clip-text text-transparent ${title2Gradient}`}>
                {title2}
              </span>
            </h1>
          </motion.div>

          {/* Subtext */}
          <motion.div custom={2} variants={fadeUpVariants} initial="hidden" animate="visible">
            <p style={{ fontSize: 'clamp(12px, 1.4vw, 15px)', color: dark ? 'rgba(255,255,255,0.5)' : '#6b7280', fontWeight: 500, letterSpacing: '0.02em', lineHeight: 1.7, maxWidth: 420, margin: '0 auto 24px' }}>
              Generate on-brand copy and publish directly to GoHighLevel in 8 seamless steps.
            </p>
          </motion.div>

          {/* CTA */}
          <motion.div custom={3} variants={fadeUpVariants} initial="hidden" animate="visible">
            <button
              onClick={onStart}
              className="inline-flex items-center gap-2.5 px-7 py-3.5 rounded-xl font-semibold text-sm transition-all duration-200"
              style={{ background: btnBg, border: `1.5px solid ${btnBg}`, color: btnText, cursor: 'pointer' }}
              onMouseEnter={e => { e.currentTarget.style.background = btnHover; e.currentTarget.style.borderColor = btnHover }}
              onMouseLeave={e => { e.currentTarget.style.background = btnBg;   e.currentTarget.style.borderColor = btnBg   }}
            >
              <IconPlayerPlay size={13} fill={btnText} stroke={0} />
              Weekly Email Campaign
            </button>

            <button
              onClick={onWelcomeFlow}
              className="inline-flex items-center gap-2.5 px-7 py-3.5 rounded-xl font-semibold text-sm transition-all duration-200 ml-3"
              style={{
                background: 'transparent',
                border: `1.5px solid ${dark ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.12)'}`,
                color: dark ? 'rgba(255,255,255,0.85)' : '#111827',
                cursor: 'pointer',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = accentColor; e.currentTarget.style.color = accentColor }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = dark ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.12)'
                e.currentTarget.style.color = dark ? 'rgba(255,255,255,0.85)' : '#111827'
              }}
            >
              <IconRoute size={14} stroke={2} />
              Welcome Flow Campaign
            </button>
          </motion.div>

        </div>
      </div>
    </div>
  )
}
