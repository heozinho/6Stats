import { motion } from 'motion/react';
import { useMemo } from 'react';

interface AudioDNAProps {
  history: any[];
}

export function AudioDNA({ history }: AudioDNAProps) {
  // Generate colors deterministically from track/artist ID
  const getColor = (id: string) => {
    let hash = 0;
    for (let i = 0; i < id.length; i++) {
      hash = id.charCodeAt(i) + ((hash << 5) - hash);
    }
    const h = Math.abs(hash) % 360;
    const s = 60 + (Math.abs(hash) % 30); // 60-90% saturation
    const l = 50 + (Math.abs(hash) % 20); // 50-70% lightness
    return `hsl(${h}, ${s}%, ${l}%)`;
  };

  const dnaSegments = useMemo(() => {
    if (!history || !Array.isArray(history)) return [];
    
    // Reverse history to show oldest to newest (left to right)
    const sorted = [...history].reverse();
    return sorted.map((event) => ({
      id: event.id,
      color: getColor(event.spotifyTrackId || 'unknown'),
      // Random width variations for that "DNA/Barcode" look
      width: 4 + (Math.abs((event.id || '0').charCodeAt(0)) % 12), 
    }));
  }, [history]);

  if (!dnaSegments || dnaSegments.length === 0) return null;

  return (
    <div className="w-full">
      <div className="flex justify-between items-end mb-4">
        <h3 className="text-xl font-bold">Your Audio DNA</h3>
        <span className="text-xs text-gray-500 uppercase tracking-widest">Last {history.length} tracks</span>
      </div>
      
      <div className="relative h-32 w-full flex items-stretch gap-[1px] overflow-hidden rounded-2xl glass bg-white/5 p-1">
        {dnaSegments.map((segment, i) => (
          <motion.div
            key={segment.id}
            className="h-full shrink-0"
            style={{ 
              backgroundColor: segment.color,
              width: `${segment.width}px`,
              boxShadow: `0 0 15px ${segment.color}44`
            }}
            initial={{ scaleY: 0, opacity: 0 }}
            animate={{ scaleY: 1, opacity: 1 }}
            transition={{ delay: i * 0.02, duration: 0.4 }}
          />
        ))}
        
        {/* Dynamic scanning line effect */}
        <motion.div 
          className="absolute inset-y-0 w-1 bg-white/50 blur-sm shadow-[0_0_15px_white]"
          animate={{ x: ['-10%', '110%'] }}
          transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
        />
      </div>
      <p className="mt-2 text-[10px] text-gray-500 italic text-center uppercase tracking-tighter opacity-50">
        Each stripe represents a unique listening moment • Generative Visual 01
      </p>
    </div>
  );
}
