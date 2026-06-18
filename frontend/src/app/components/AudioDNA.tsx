import { motion } from 'motion/react';
import { useState, useMemo, useRef, useEffect } from 'react';
import { Play, Pause } from 'lucide-react';

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
      trackName: event.trackName || 'Unknown Track',
      artistName: event.artistName || 'Unknown Artist',
      previewUrl: event.previewUrl,
      color: getColor(event.spotifyTrackId || 'unknown'),
      // Random width variations for that "DNA/Barcode" look
      width: 4 + (Math.abs((event.id || '0').charCodeAt(0)) % 12), 
    }));
  }, [history]);

  const [hovered, setHovered] = useState<any>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio();
      audioRef.current.volume = 0.4;
      audioRef.current.onended = () => setPlayingId(null);
    }
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const handlePlay = (segment: any) => {
    if (!segment.previewUrl || !audioRef.current) return;
    
    if (playingId === segment.id) {
      audioRef.current.pause();
      setPlayingId(null);
    } else {
      audioRef.current.src = segment.previewUrl;
      audioRef.current.play().catch(console.error);
      setPlayingId(segment.id);
    }
  };

  if (!dnaSegments || dnaSegments.length === 0) return null;

  return (
    <div className="w-full relative">
      <div className="flex justify-between items-end mb-4">
        <h3 className="text-xl font-bold">Your Audio DNA</h3>
        <span className="text-xs text-gray-500 uppercase tracking-widest">Last {history.length} tracks</span>
      </div>

      {/* Hover Tooltip */}
      {hovered && (
        <div className="absolute top-10 left-0 right-0 z-20 flex justify-center pointer-events-none">
          <div className="bg-black/90 dark:bg-white/90 glass px-3 py-1.5 rounded-full text-[10px] border border-white/10 dark:border-black/10 animate-fadeIn flex items-center gap-2">
            {!hovered.previewUrl && (
              <span className="text-red-400 text-[9px] uppercase tracking-widest font-bold">No Audio</span>
            )}
            {hovered.previewUrl && playingId !== hovered.id && (
              <Play className="w-3 h-3 text-white dark:text-black" />
            )}
            {hovered.previewUrl && playingId === hovered.id && (
              <Pause className="w-3 h-3 text-white dark:text-black" />
            )}
            <span className="font-bold text-white dark:text-black">{hovered.trackName}</span>
            <span className="text-gray-500 dark:text-gray-400">•</span>
            <span className="text-gray-400">{hovered.artistName}</span>
          </div>
        </div>
      )}
      
      <div className="relative h-32 w-full flex items-stretch gap-[1px] overflow-hidden rounded-2xl glass bg-white/5 p-1 isolate">
        {dnaSegments.map((segment) => {
          const isPlaying = playingId === segment.id;
          const isPlayable = !!segment.previewUrl;
          return (
            <div
              key={segment.id}
              onMouseEnter={() => setHovered(segment)}
              onMouseLeave={() => setHovered(null)}
              onClick={() => handlePlay(segment)}
              className={`h-full shrink-0 stagger-fade-in transition-all duration-300 ${isPlayable ? 'cursor-pointer hover:scale-x-150' : 'cursor-not-allowed opacity-40'} ${isPlaying ? 'scale-x-150 brightness-150' : ''}`}
              style={{ 
                backgroundColor: segment.color,
                width: `${segment.width}px`,
                boxShadow: isPlaying ? `0 0 25px ${segment.color}` : `0 0 15px ${segment.color}44`,
                animationDuration: '0.6s',
                opacity: hovered && !isPlaying ? (hovered.id === segment.id ? 1 : 0.2) : (isPlaying ? 1 : (isPlayable ? 0.8 : 0.3))
              }}
            />
          );
        })}
        
        {/* Dynamic scanning line effect - use x for translate3d performance */}
        <motion.div 
          className="absolute inset-y-0 w-1 bg-white/50 blur-sm shadow-[0_0_15px_white] isolate"
          animate={{ x: ['-100%', '1500%'] }}
          transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
        />
      </div>
      <p className="mt-2 text-[10px] text-gray-500 italic text-center uppercase tracking-tighter opacity-50">
        Each stripe represents a unique listening moment • Generative Visual 01
      </p>
    </div>
  );
}
