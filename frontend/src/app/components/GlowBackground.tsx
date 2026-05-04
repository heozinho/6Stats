import { motion } from 'motion/react';

interface GlowBackgroundProps {
  bpm?: number;
}

export function GlowBackground({ bpm = 120 }: GlowBackgroundProps) {
  // Ensure BPM is valid and not zero
  const safeBpm = Math.max(bpm || 120, 40); 
  const pulseDuration = 60 / safeBpm;

  return (
    <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
      {/* Primary Glow Orbs */}
      <motion.div
        className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] rounded-full opacity-20 blur-[120px]"
        style={{ backgroundColor: 'var(--glow-1)' }}
        animate={{
          x: [0, 50, 0],
          y: [0, 30, 0],
          scale: [1, 1.1, 1],
        }}
        transition={{
          duration: 15,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      />

      <motion.div
        className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full opacity-15 blur-[120px]"
        style={{ backgroundColor: 'var(--glow-2)' }}
        animate={{
          x: [0, -40, 0],
          y: [0, -60, 0],
          scale: [1, 1.2, 1],
        }}
        transition={{
          duration: 18,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      />

      <motion.div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[40%] h-[40%] rounded-full opacity-10 blur-[120px]"
        style={{ backgroundColor: 'var(--glow-3)' }}
        animate={{
          scale: [1, 1.3, 1],
          opacity: [0.05, 0.15, 0.05],
        }}
        transition={{
          duration: pulseDuration * 4, // Pulse linked to BPM
          repeat: Infinity,
          ease: "easeInOut"
        }}
      />

      {/* Grainy Texture Overlay */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[url('https://grainy-gradients.vercel.app/noise.svg')] brightness-100 contrast-150" />
    </div>
  );
}
