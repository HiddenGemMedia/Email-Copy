import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCampaignStore } from '../store/campaignStore'
import {
  IconBuildingStore, IconFileDescription, IconSparkles, IconPhoto,
  IconDeviceDesktop, IconCircleCheck, IconSend, IconBell,
  IconCircle,
} from '@tabler/icons-react'
import HeroGeometric from '../components/ui/hero-geometric'
import { useTheme } from '../context/ThemeContext'

const STEPS = [
  { n:'01', label:'Select Client',     desc:'Choose the brand',          Icon: IconBuildingStore   },
  { n:'02', label:'Write Brief',       desc:'Define the campaign',       Icon: IconFileDescription },
  { n:'03', label:'AI Generates Copy', desc:'Claude writes 3 versions',  Icon: IconSparkles        },
  { n:'04', label:'Pick Images',       desc:'Pull from media library',   Icon: IconPhoto           },
  { n:'05', label:'Live Preview',      desc:'Review the email',          Icon: IconDeviceDesktop   },
  { n:'06', label:'Team Approval',     desc:'Sign off before sending',   Icon: IconCircleCheck     },
  { n:'07', label:'Push to GHL',       desc:'Publish to GoHighLevel',    Icon: IconSend            },
  { n:'08', label:'Notify Team',       desc:'Alert via chat',            Icon: IconBell            },
]

function StepCard({ n, label, desc, Icon, dark }) {
  const [hovered, setHovered] = useState(false)
  const accentColor  = dark ? '#f59e0b' : '#3b82f6'
  const dotColor     = dark ? 'rgba(255,255,255,0.2)' : '#d1d5db'
  const numColor     = dark ? 'rgba(255,255,255,0.2)' : '#d1d5db'
  const iconColor    = hovered ? accentColor : (dark ? 'rgba(255,255,255,0.3)' : '#9ca3af')
  const labelColor   = dark ? 'rgba(255,255,255,0.85)' : '#111827'
  const descColor    = dark ? 'rgba(255,255,255,0.3)' : '#9ca3af'
  const cardBg       = dark ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.72)'
  const borderColor  = hovered
    ? (dark ? 'rgba(255,255,255,0.15)' : 'rgba(59,130,246,0.25)')
    : (dark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)')

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: cardBg,
        border: `1px solid ${borderColor}`,
        borderRadius: 14,
        padding: '14px 14px 16px',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        transform: hovered ? 'translateY(-2px)' : 'none',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        boxShadow: hovered ? (dark ? '0 8px 32px rgba(0,0,0,0.4)' : '0 8px 32px rgba(59,130,246,0.1)') : 'none',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <IconCircle size={10} color={dotColor} fill={dotColor} stroke={0} />
        <span style={{ fontSize: 13, fontWeight: 500, color: numColor, letterSpacing: '-0.01em' }}>{n}</span>
      </div>
      <div style={{ marginBottom: 14 }}>
        <Icon size={22} color={iconColor} stroke={1.5} />
      </div>
      <div style={{ fontSize: 13, fontWeight: 700, color: labelColor, marginBottom: 4, letterSpacing: '-0.01em' }}>{label}</div>
      <div style={{ fontSize: 11.5, color: descColor, lineHeight: 1.5 }}>{desc}</div>
    </div>
  )
}

export default function Dashboard() {
  const navigate      = useNavigate()
  const resetCampaign = useCampaignStore((s) => s.resetCampaign)
  const { theme }     = useTheme()
  const dark          = theme === 'dark'

  function startNew() {
    resetCampaign()
    navigate('/campaign/new')
  }

  return (
    <div>

      {/* Hero */}
      <HeroGeometric onStart={startNew} onWelcomeFlow={() => navigate('/welcome-flow')} />

      {/* Cards section */}
      <div style={{
        background: 'transparent',
        borderTop: `1px solid ${dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'}`,
        padding: '16px 0 32px',
      }}>
        <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 28px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10 }}>
            {STEPS.map(s => <StepCard key={s.n} {...s} dark={dark} />)}
          </div>
        </div>
      </div>

    </div>
  )
}
