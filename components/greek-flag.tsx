import React from 'react'

interface GreekFlagProps {
  className?: string
  size?: number
}

export function GreekFlag({ className = "", size = 24 }: GreekFlagProps) {
  return (
    <svg
      width={size}
      height={size * 0.67} // Соотношение сторон флага Греции 3:2
      viewBox="0 0 30 20"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Синие полосы */}
      <rect width="30" height="2.22" fill="#0D5EAF" />
      <rect y="4.44" width="30" height="2.22" fill="#0D5EAF" />
      <rect y="8.89" width="30" height="2.22" fill="#0D5EAF" />
      <rect y="13.33" width="30" height="2.22" fill="#0D5EAF" />
      <rect y="17.78" width="30" height="2.22" fill="#0D5EAF" />
      
      {/* Белые полосы */}
      <rect y="2.22" width="30" height="2.22" fill="#FFFFFF" />
      <rect y="6.67" width="30" height="2.22" fill="#FFFFFF" />
      <rect y="11.11" width="30" height="2.22" fill="#FFFFFF" />
      <rect y="15.56" width="30" height="2.22" fill="#FFFFFF" />
      
      {/* Синий квадрат в левом верхнем углу */}
      <rect width="10" height="6.67" fill="#0D5EAF" />
      
      {/* Белый крест в синем квадрате */}
      <rect x="4.5" y="1.5" width="1" height="3.67" fill="#FFFFFF" />
      <rect x="2.5" y="2.5" width="5" height="1" fill="#FFFFFF" />
    </svg>
  )
}
