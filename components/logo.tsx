import React from 'react'

interface LogoProps {
  className?: string
  size?: number
}

export function Logo({ className = "", size = 24 }: LogoProps) {
  return (
    <div className={`relative ${className}`} style={{ width: size, height: size }}>
      {/* Основной круг с градиентом */}
      <div className="absolute inset-0 rounded-full bg-gradient-to-br from-purple-500 via-violet-500 to-fuchsia-500 shadow-lg">
        {/* Внутренний круг */}
        <div className="absolute inset-1 rounded-full bg-gradient-to-br from-purple-400 via-violet-400 to-fuchsia-400">
          {/* Центральная иконка - стилизованная буква "Ε" (греческая E) */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="relative">
              {/* Вертикальная линия */}
              <div className="absolute left-1/2 top-1 w-0.5 h-3 bg-white rounded-full transform -translate-x-1/2"></div>
              {/* Горизонтальные линии */}
              <div className="absolute top-1 left-1 w-2 h-0.5 bg-white rounded-full"></div>
              <div className="absolute top-2 left-1 w-1.5 h-0.5 bg-white rounded-full"></div>
              <div className="absolute top-3 left-1 w-2 h-0.5 bg-white rounded-full"></div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Блестящий эффект */}
      <div className="absolute top-0.5 left-0.5 w-2 h-2 rounded-full bg-white/30 blur-sm"></div>
    </div>
  )
}
