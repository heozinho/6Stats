import { motion } from 'motion/react';
import { Share2, X, Music, Mic2, Clock, Play, BarChart2 } from 'lucide-react';

interface StatCardProps {
  onClose: () => void;
  todayStats: any;
  topTracks: any[];
  topArtists: any[];
}

function msToReadable(ms: number) {
  const mins = Math.round(ms / 60000);
  if (mins < 60) return `${mins} mins`;
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
}

export function StatCard({ onClose, todayStats, topTracks, topArtists }: StatCardProps) {
  const topTrack = topTracks[0] ?? null;
  const topArtist = topArtists[0] ?? null;
  const minutesListened = todayStats?.totalMs ? Math.round(todayStats.totalMs / 60000) : 0;
  const totalPlays = todayStats?.totalPlays ?? 0;

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: '6Stats — My Music Today',
          text: `I listened to ${minutesListened} minutes of music today! My top track: ${topTrack?.name ?? 'Unknown'}`,
          url: window.location.href,
        });
      } catch {
        // User cancelled or not supported
      }
    } else {
      const text = `My 6Stats today:\n${minutesListened} minutes listened\nTop track: ${topTrack?.name ?? '—'}\nTop artist: ${topArtist?.name ?? '—'}`;
      await navigator.clipboard.writeText(text);
      alert('Stats copied to clipboard!');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/80 backdrop-blur-md">
      <motion.div
        className="fixed left-1/2 -translate-x-1/2 bottom-20 md:bottom-auto md:top-1/2 md:-translate-y-1/2 w-[90%] max-w-md z-50 rounded-3xl overflow-hidden glass border border-foreground/10 shadow-2xl"
        style={{
          background: 'var(--background)',
        }}
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
      >
        {/* Subtle top accent line */}
        <div
          className="absolute top-0 left-0 right-0 h-px"
          style={{ background: 'linear-gradient(90deg, transparent, rgba(255,107,53,0.6), rgba(255,210,63,0.6), transparent)' }}
        />

        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-20 w-8 h-8 rounded-full flex items-center justify-center transition-colors bg-foreground/10 hover:bg-foreground/20"
        >
          <X className="w-4 h-4 text-foreground/60" />
        </button>

        <div className="relative p-7 pb-6 flex flex-col gap-5">

          {/* Header */}
          <motion.div
            className="flex flex-col gap-1"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <div className="text-xs font-semibold uppercase tracking-widest text-foreground/40">Today's Recap</div>
            <div className="flex items-end gap-3 mt-1">
              <div className="text-6xl font-black tabular-nums text-foreground leading-none">{minutesListened.toLocaleString()}</div>
              <div className="pb-1 flex flex-col gap-0.5">
                <span className="text-sm font-semibold text-foreground/50">mins</span>
              </div>
            </div>
            <div className="flex items-center gap-4 mt-2">
              <div className="flex items-center gap-1.5 text-foreground/40">
                <Clock className="w-3.5 h-3.5" />
                <span className="text-xs">{msToReadable(todayStats?.totalMs ?? 0)}</span>
              </div>
              <div className="flex items-center gap-1.5 text-foreground/40">
                <Play className="w-3.5 h-3.5" />
                <span className="text-xs">{totalPlays} plays</span>
              </div>
            </div>
          </motion.div>

          {/* Divider */}
          <div className="h-px bg-foreground/10" />

          {/* Top Track */}
          {topTrack && (
            <motion.div
              className="flex items-center gap-4"
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
            >
              {topTrack.imageUrl ? (
                <img
                  src={topTrack.imageUrl}
                  alt={topTrack.name}
                  className="w-14 h-14 rounded-xl object-cover shadow-lg shrink-0"
                />
              ) : (
                <div className="w-14 h-14 rounded-xl flex items-center justify-center shrink-0 bg-foreground/10">
                  <Music className="w-6 h-6 text-foreground/30" />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 mb-1">
                  <BarChart2 className="w-3 h-3 shrink-0" style={{ color: '#ff6b35' }} />
                  <span className="text-xs font-bold uppercase tracking-wider" style={{ color: '#ff6b35' }}>Top Track</span>
                </div>
                <div className="text-foreground font-bold text-sm truncate">{topTrack.name}</div>
                <div className="text-xs mt-0.5 text-foreground/40">
                  {topTrack.playCount} plays · {msToReadable(topTrack.msPlayed ?? 0)}
                </div>
              </div>
            </motion.div>
          )}

          {/* Top Artist */}
          {topArtist && (
            <motion.div
              className="flex items-center gap-4"
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
            >
              {topArtist.imageUrl ? (
                <img
                  src={topArtist.imageUrl}
                  alt={topArtist.name}
                  className="w-14 h-14 rounded-full object-cover shadow-lg shrink-0"
                />
              ) : (
                <div className="w-14 h-14 rounded-full flex items-center justify-center shrink-0 bg-foreground/10">
                  <Mic2 className="w-6 h-6 text-foreground/30" />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 mb-1">
                  <Mic2 className="w-3 h-3 shrink-0" style={{ color: '#4ecdc4' }} />
                  <span className="text-xs font-bold uppercase tracking-wider" style={{ color: '#4ecdc4' }}>Top Artist</span>
                </div>
                <div className="text-foreground font-bold text-sm truncate">{topArtist.name}</div>
                <div className="text-xs mt-0.5 text-foreground/40">
                  {topArtist.playCount} plays · {msToReadable(topArtist.msPlayed ?? 0)}
                </div>
              </div>
            </motion.div>
          )}

          {/* No data state */}
          {!topTrack && !topArtist && (
            <motion.div
              className="flex flex-col items-center justify-center py-6 text-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              <div className="w-12 h-12 rounded-full flex items-center justify-center mb-3 bg-foreground/5">
                <Music className="w-6 h-6 text-foreground/20" />
              </div>
              <p className="text-sm text-foreground/40">Sync some plays first to see your stats.</p>
            </motion.div>
          )}

          {/* Bottom Divider & Action */}
          <div className="h-px bg-foreground/10" />

          {/* Share Button */}
          <motion.button
            onClick={handleShare}
            className="w-full py-3.5 rounded-2xl font-semibold text-sm flex items-center justify-center gap-2 transition-opacity hover:opacity-90"
            style={{ background: 'linear-gradient(135deg, #ff6b35, #ffd23f)', color: '#000' }}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
          >
            <Share2 className="w-4 h-4" />
            Share Stats
          </motion.button>
        </div>
      </motion.div>
    </div>
  );
}
