import React from 'react';

interface LogoProps {
  size?: number;
  className?: string;
  variant?: 'gold' | 'white' | 'muted';
}

export const Logo: React.FC<LogoProps> = ({ size = 24, className = "", variant = 'gold' }) => {
  const colors = {
    gold: '#D4AF37',
    white: '#FFFFFF',
    muted: '#5A5A72'
  };

  const color = colors[variant];

  return (
    <svg 
      viewBox="0 0 100 100" 
      width={size} 
      height={size} 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Minimalist Pawn - Line Art Style */}
      <g stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
        {/* Head */}
        <circle cx="50" cy="30" r="12" />
        
        {/* Neck/Collar */}
        <path d="M40 45H60" />
        <path d="M42 42H58" />
        
        {/* Body */}
        <path d="M42 45C42 45 38 65 35 72" />
        <path d="M58 45C58 45 62 65 65 72" />
        
        {/* Base Layers */}
        <path d="M32 72H68" />
        <path d="M30 78H70" />
        
        {/* Bottom Curve */}
        <path d="M30 78C30 78 30 88 50 88C70 88 70 78 70 78" />
      </g>
      
      {/* Subtle Glow (Optional, kept for brand consistency) */}
      <circle cx="50" cy="50" r="45" stroke={color} strokeWidth="0.5" strokeDasharray="2 6" opacity="0.2" />
    </svg>
  );
};
