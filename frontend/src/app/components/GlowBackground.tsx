interface GlowBackgroundProps {
  bpm?: number;
}

export function GlowBackground({ bpm = 120 }: GlowBackgroundProps) {
  // Ensure BPM is valid and not zero
  const safeBpm = Math.max(bpm || 120, 40); 
  const pulseDuration = 60 / safeBpm;

  return (
    <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none" style={{ '--pulse-duration': `${pulseDuration}s` } as any}>
      {/* Primary Glow Orbs - CSS Animated for Performance */}
      <div 
        className="absolute top-[-20%] left-[-20%] w-[80%] h-[80%] rounded-full opacity-30 blur-[120px] animate-float"
        style={{ backgroundColor: 'var(--glow-1)' }}
      />

      <div 
        className="absolute bottom-[-20%] right-[-20%] w-[70%] h-[70%] rounded-full opacity-25 blur-[120px] animate-float"
        style={{ backgroundColor: 'var(--glow-2)', animationDelay: '-5s' }}
      />

      <div 
        className="absolute top-1/2 left-1/2 w-[60%] h-[60%] rounded-full blur-[100px] animate-pulse-glow"
        style={{ backgroundColor: 'var(--glow-3)' }}
      />

      {/* Grainy Texture Overlay - Data URI for zero-latency loading */}
      <div 
        className="absolute inset-0 opacity-[0.06] pointer-events-none brightness-100 contrast-150"
        style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }}
      />
    </div>
  );
}
