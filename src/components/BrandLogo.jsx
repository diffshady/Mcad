import { useId } from 'react';

export default function BrandLogo({ size = 76, className = '', variant = 'light' }) {
  const id = useId().replace(/:/g, '');
  const isLight = variant === 'light';

  const shell = isLight
    ? { outer: '#ead08a', inner: '#0f3d27', stroke: 'rgba(255,255,255,0.22)', icon: '#fdfaf1', detail: '#d7b45f' }
    : { outer: '#1a5c3a', inner: '#f7f3e9', stroke: 'rgba(26,92,58,0.18)', icon: '#1a5c3a', detail: '#c9a84c' };

  return (
    <div className={`brand-logo ${className}`.trim()} style={{ width: size, height: size }} aria-hidden="true">
      <svg viewBox="0 0 120 120" width="100%" height="100%" role="img" aria-label="MCAD logo">
        <defs>
          <radialGradient id={`core-${id}`} cx="35%" cy="30%" r="75%">
            <stop offset="0%" stopColor={shell.inner} />
            <stop offset="100%" stopColor={isLight ? '#0a2b1c' : '#eee7d8'} />
          </radialGradient>
          <linearGradient id={`ring-${id}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={shell.outer} />
            <stop offset="100%" stopColor={shell.detail} />
          </linearGradient>
        </defs>

        <circle cx="60" cy="60" r="56" fill={`url(#ring-${id})`} />
        <circle cx="60" cy="60" r="46" fill={`url(#core-${id})`} stroke={shell.stroke} strokeWidth="2" />

        <path
          d="M71 36a18 18 0 1 0 0 36 16 16 0 1 1 0-36Z"
          fill={shell.outer}
          opacity="0.95"
        />

        <path
          d="M35 78h50v4H35zM42 74h36v4H42zM49 50h22v24H49zM60 38l9 12H51z"
          fill={shell.icon}
          opacity="0.96"
        />

        <rect x="58" y="53" width="4" height="12" rx="1" fill={shell.detail} />
      </svg>
    </div>
  );
}
