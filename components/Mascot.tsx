export default function Mascot({ className = 'w-12 h-12' }: { className?: string }) {
  return (
    <div className={`relative flex items-center justify-center ${className}`}>
      <div className="absolute inset-0 bg-gradient-to-br from-red-400/50 to-orange-400/50 blur-xl rounded-full" />
      <svg
        viewBox="0 0 100 100"
        className="relative z-10 w-full h-full"
        style={{ filter: 'drop-shadow(0 0 8px rgba(239, 68, 68, 0.9)) drop-shadow(0 0 20px rgba(249, 115, 22, 0.6))' }}
      >
        <defs>
          <linearGradient id="foxGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%"   stopColor="#FF4444" />
            <stop offset="50%"  stopColor="#FF6B35" />
            <stop offset="100%" stopColor="#FFB347" />
          </linearGradient>
          <linearGradient id="foxDark" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%"   stopColor="#FF3333" />
            <stop offset="100%" stopColor="#FF5555" />
          </linearGradient>
        </defs>
        <polygon points="25,45 15,15 45,35"  fill="url(#foxDark)" />
        <polygon points="75,45 85,15 55,35"  fill="url(#foxDark)" />
        <polygon points="50,85 25,45 50,35"  fill="url(#foxGrad)" />
        <polygon points="50,85 75,45 50,35"  fill="url(#foxGrad)" />
        <polygon points="50,85 25,45 10,55"  fill="#ffffff" opacity="0.98" />
        <polygon points="50,85 75,45 90,55"  fill="#ffffff" opacity="0.98" />
        <polygon points="46,78 54,78 50,85"  fill="#1C1E22" />
        <polygon points="35,52 45,56 40,48"  fill="#1C1E22" />
        <polygon points="65,52 55,56 60,48"  fill="#1C1E22" />
      </svg>
    </div>
  );
}