interface IconProps {
  size: number
  color: string
}

const VIEWBOX = '0 0 80 80'

export function DatabaseIcon({ size, color }: IconProps) {
  return (
    <svg width={size} height={size} viewBox={VIEWBOX} fill="none">
      <g stroke={color} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
        <ellipse cx="40" cy="55" rx="20" ry="7" />
        <ellipse cx="40" cy="22" rx="20" ry="7" />
        <line x1="20" y1="22" x2="20" y2="55" />
        <line x1="60" y1="22" x2="60" y2="55" />
        <line x1="20" y1="36" x2="60" y2="36" />
        <line x1="20" y1="46" x2="60" y2="46" />
      </g>
    </svg>
  )
}

export function ServerIcon({ size, color }: IconProps) {
  return (
    <svg width={size} height={size} viewBox={VIEWBOX} fill="none">
      <g stroke={color} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
        <rect x="15" y="15" width="50" height="50" rx="3" />
        <line x1="15" y1="30" x2="65" y2="30" />
        <line x1="15" y1="45" x2="65" y2="45" />
        <line x1="15" y1="60" x2="65" y2="60" />
        <circle cx="22" cy="22" r="2" />
        <circle cx="29" cy="22" r="2" />
        <circle cx="36" cy="22" r="2" />
      </g>
    </svg>
  )
}

export function DiskIcon({ size, color }: IconProps) {
  return (
    <svg width={size} height={size} viewBox={VIEWBOX} fill="none">
      <g stroke={color} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
        <rect x="22" y="12" width="36" height="56" rx="3" />
        <circle cx="40" cy="40" r="12" />
        <circle cx="40" cy="40" r="4" />
      </g>
    </svg>
  )
}

export function CloudIcon({ size, color }: IconProps) {
  return (
    <svg width={size} height={size} viewBox={VIEWBOX} fill="none">
      <path
        d="M 25 47 A 9 9 0 0 1 35 38 A 14 14 0 0 1 55 38 A 9 9 0 0 1 65 47 A 9 9 0 0 1 60 60 H 30 A 9 9 0 0 1 25 47 Z"
        stroke={color}
        strokeWidth={3}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function InternetIcon({ size, color }: IconProps) {
  return (
    <svg width={size} height={size} viewBox={VIEWBOX} fill="none">
      <g stroke={color} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
        <circle cx="40" cy="40" r="22" />
        <line x1="40" y1="18" x2="40" y2="62" />
        <line x1="18" y1="40" x2="62" y2="40" />
        <path d="M 40 18 A 20 20 0 0 1 40 62" />
        <path d="M 40 18 A 20 20 0 0 0 40 62" />
      </g>
    </svg>
  )
}

export function DefaultIcon({ size, color }: IconProps) {
  const teeth = 8
  const outer = 24
  const inner = 18
  const cx = 40
  const cy = 40
  let d = ''
  for (let i = 0; i < teeth * 2; i++) {
    const angle = (i * Math.PI) / teeth
    const r = i % 2 === 0 ? outer : inner
    const x = cx + r * Math.cos(angle)
    const y = cy + r * Math.sin(angle)
    d += `${i === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`
  }
  d += ' Z'
  return (
    <svg width={size} height={size} viewBox={VIEWBOX} fill="none">
      <g stroke={color} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
        <path d={d} />
        <circle cx="40" cy="40" r="8" />
      </g>
    </svg>
  )
}


