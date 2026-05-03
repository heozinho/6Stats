import { motion } from 'motion/react';
import { Share2, X, Sparkles, Music, Mic2, Clock } from 'lucide-react';

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
      // Fallback: copy to clipboard
      const text = `🎵 My 6Stats today:\n⏱ ${minutesListened} minutes listened\n🔥 Top track: ${topTrack?.name ?? '—'}\n🎤 Top artist: ${topArtist?.name ?? '—'}`;
      await navigator.clipboard.writeText(text);
      alert('Stats copied to clipboard!');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/90 backdrop-blur-sm">
      <motion.div
        className="relative w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl"
        style={{ background: 'linear-gradient(135deg, #ff6b35 0%, #ffd23f 50%, #4ecdc4 100%)' }}
        initial={{ scale: 0.85, opacity: 0, y: 40 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.85, opacity: 0 }}
        transition={{ type: 'spring', duration: 0.5 }}
      >
        {/* Animated shimmer overlay */}
        <motion.div
          className="absolute inset-0 opacity-20 pointer-events-none"
          style={{ background: 'radial-gradient(circle at 50% 30%, white 0%, transparent 65%)' }}
          animate={{ scale: [1, 1.15, 1], opacity: [0.2, 0.4, 0.2] }}
          transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
        />

        {/* Floating sparkles */}
        <motion.div
          className="absolute top-8 left-8 pointer-events-none"
          animate={{ y: [0, -10, 0], rotate: [0, 8, 0] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
        >
          <Sparkles className="w-6 h-6 text-white/50" />
        </motion.div>
        <motion.div
          className="absolute top-16 right-10 pointer-events-none"
          animate={{ y: [0, 10, 0], rotate: [0, -8, 0] }}
          transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
        >
          <Sparkles className="w-5 h-5 text-white/30" />
        </motion.div>

        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 z-20 w-9 h-9 rounded-full bg-black/20 backdrop-blur-sm flex items-center justify-center hover:bg-black/30 transition-colors"
        >
          <X className="w-4 h-4 text-white" />
        </button>

        <div className="relative p-8 pb-6 flex flex-col gap-5">

          {/* Header */}
          <motion.div
            className="text-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
          >
            <div className="text-black/60 text-sm font-semibold uppercase tracking-widest mb-1">Today's Recap</div>
            <div className="text-black text-5xl font-black tabular-nums">{minutesListened.toLocaleString()}</div>
            <div className="text-black/70 text-sm font-medium mt-1 flex items-center justify-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              minutes listened · {totalPlays} plays
            </div>
          </motion.div>

          {/* Top Track */}
          {topTrack && (
            <motion.div
              className="bg-black/10 backdrop-blur-sm rounded-2xl p-4 flex items-center gap-4"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.25 }}
            >
              {topTrack.imageUrl ? (
                <img
                  src={topTrack.imageUrl}
                  alt={topTrack.name}
                  className="w-14 h-14 rounded-xl object-cover shadow-lg shrink-0"
                />
              ) : (
                <div className="w-14 h-14 rounded-xl bg-black/20 flex items-center justify-center shrink-0">
                  <Music className="w-6 h-6 text-black/40" />
                </div>
              )}
              <div className="min-w-0">
                <div className="text-black/60 text-xs font-bold uppercase tracking-wider mb-0.5">🔥 Top Track</div>
                <div className="text-black font-black text-base truncate">{topTrack.name}</div>
                <div className="text-black/60 text-xs">{topTrack.playCount} plays · {msToReadable(topTrack.msPlayed ?? 0)}</div>
              </div>
            </motion.div>
          )}

          {/* Top Artist */}
          {topArtist && (
            <motion.div
              className="bg-black/10 backdrop-blur-sm rounded-2xl p-4 flex items-center gap-4"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.35 }}
            >
              {topArtist.imageUrl ? (
                <img
                  src={topArtist.imageUrl}
                  alt={topArtist.name}
                  className="w-14 h-14 rounded-full object-cover shadow-lg shrink-0"
                />
              ) : (
                <div className="w-14 h-14 rounded-full bg-black/20 flex items-center justify-center shrink-0">
                  <Mic2 className="w-6 h-6 text-black/40" />
                </div>
              )}
              <div className="min-w-0">
                <div className="text-black/60 text-xs font-bold uppercase tracking-wider mb-0.5">🎤 Top Artist</div>
                <div className="text-black font-black text-base truncate">{topArtist.name}</div>
                <div className="text-black/60 text-xs">{topArtist.playCount} plays · {msToReadable(topArtist.msPlayed ?? 0)}</div>
              </div>
            </motion.div>
          )}

          {/* No data state */}
          {!topTrack && !topArtist && (
            <motion.div
              className="bg-black/10 rounded-2xl p-6 text-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.25 }}
            >
              <p className="text-black/60 text-sm">Sync some plays first to see your stats!</p>
            </motion.div>
          )}

          {/* Share Button */}
          <motion.button
            onClick={handleShare}
            className="w-full py-4 rounded-2xl bg-black text-white font-bold text-base shadow-xl hover:bg-black/80 transition-colors flex items-center justify-center gap-2"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45 }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
          >
            <Share2 className="w-5 h-5" />
            Share My Stats
          </motion.button>
        </div>
      </motion.div>
    </div>
  );
}
