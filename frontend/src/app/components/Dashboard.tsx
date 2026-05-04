import { motion } from 'motion/react';
import { Clock, TrendingUp, Share2, ChevronRight, RefreshCw, Music, Mic2 } from 'lucide-react';
import { useState, useEffect } from 'react';

interface DashboardProps {
  backendUrl: string;
  getHeaders: () => Record<string, string>;
  lastSynced: number;
  syncing: boolean;
  onSync: () => void;
  onViewStatCard: (stats: { todayStats: any; topTracks: any[]; topArtists: any[] }) => void;
}

const colors = ['#ff6b35', '#ffd23f', '#4ecdc4', '#f4a261', '#95e1d3'];
const getColor = (index: number) => colors[index % colors.length];

function msToReadable(ms: number) {
  const mins = Math.round(ms / 60000);
  if (mins < 60) return `${mins}m`;
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
}

export function Dashboard({ backendUrl, getHeaders, lastSynced, syncing, onSync, onViewStatCard }: DashboardProps) {
  const [activeTab, setActiveTab] = useState<'today' | 'week'>('today');
  const [loading, setLoading] = useState(true);
  const [todayStats, setTodayStats] = useState<any>(null);
  const [topTracks, setTopTracks] = useState<any[]>([]);
  const [topArtists, setTopArtists] = useState<any[]>([]);

  const fetchStats = async () => {
    try {
      const [todayRes, tracksRes, artistsRes] = await Promise.all([
        fetch(`${backendUrl}/stats/today`, { headers: getHeaders() }),
        fetch(`${backendUrl}/stats/top-tracks`, { headers: getHeaders() }),
        fetch(`${backendUrl}/stats/top-artists`, { headers: getHeaders() }),
      ]);
      const [todayData, tracksData, artistsData] = await Promise.all([
        todayRes.json(),
        tracksRes.json(),
        artistsRes.json(),
      ]);
      setTodayStats(todayData);
      setTopTracks(tracksData.topTracks || []);
      setTopArtists(artistsData.topArtists || []);
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    }
  };

  // Re-fetch stats whenever the app-level sync completes (lastSynced changes)
  useEffect(() => {
    (async () => {
      setLoading(true);
      await fetchStats();
      setLoading(false);
    })();
  }, [lastSynced]);

  if (loading) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center gap-4">
        <div className="animate-spin w-16 h-16 border-4 border-orange-500 border-t-transparent rounded-full" />
        <p className="text-xl font-bold bg-gradient-to-r from-orange-400 to-yellow-400 bg-clip-text text-transparent">
          Syncing with Spotify...
        </p>
      </div>
    );
  }

  const minutesListened = todayStats?.totalMs ? Math.round(todayStats.totalMs / 60000) : 0;
  const totalPlays = todayStats?.totalPlays || 0;

  return (
    <div className="min-h-screen w-full p-6 pb-24 overflow-y-auto">

      {/* Header */}
      <motion.div
        className="mb-8 flex justify-between items-center"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div>
          <h2 className="text-4xl font-extrabold mb-1">Your Stats</h2>
          <p className="text-gray-400 text-sm">Celebrate your music journey</p>
        </div>
        <button
          onClick={onSync}
          disabled={syncing}
          title="Sync latest plays"
          className="p-3 rounded-full bg-white/5 hover:bg-white/10 transition-colors disabled:opacity-40"
        >
          <RefreshCw className={`w-5 h-5 text-gray-300 ${syncing ? 'animate-spin' : ''}`} />
        </button>
      </motion.div>

      {/* Tab Switcher */}
      <motion.div
        className="flex gap-3 mb-8"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        {(['today', 'week'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-3 px-6 rounded-full font-bold capitalize transition-all ${
              activeTab === tab
                ? 'bg-gradient-to-r from-orange-500 to-yellow-400 text-black shadow-lg'
                : 'bg-white/5 text-gray-400 hover:bg-white/10'
            }`}
          >
            {tab === 'today' ? 'Today' : 'This Week'}
          </button>
        ))}
      </motion.div>

      {/* Minutes Listened Hero Card */}
      <motion.div
        className="relative mb-6 p-8 rounded-3xl overflow-hidden cursor-pointer"
        style={{ background: 'linear-gradient(135deg, #ff6b35 0%, #ffd23f 100%)' }}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.2 }}
        whileHover={{ scale: 1.02 }}
        onClick={() => onViewStatCard({ todayStats, topTracks, topArtists })}
      >
        <div className="absolute top-4 right-4 opacity-70">
          <Share2 className="w-5 h-5 text-black" />
        </div>
        <div className="flex items-center gap-3 mb-3">
          <Clock className="w-6 h-6 text-black/80" />
          <span className="text-black/80 font-semibold">Minutes Listened</span>
        </div>
        <motion.div
          className="text-7xl font-black text-black mb-2 tabular-nums"
          key={minutesListened}
          initial={{ scale: 1.1, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
        >
          {minutesListened.toLocaleString()}
        </motion.div>
        <div className="flex items-center gap-2 text-black/70">
          <TrendingUp className="w-4 h-4" />
          <span className="text-sm">{totalPlays} plays today</span>
        </div>
      </motion.div>

      {/* Top Tracks */}
      <motion.section
        className="mb-8"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <h3 className="text-2xl font-extrabold mb-4">
          <span className="bg-gradient-to-r from-orange-400 to-yellow-400 bg-clip-text text-transparent">
            Top Tracks
          </span>
        </h3>

        {topTracks.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-10 text-gray-500">
            <Music className="w-10 h-10 opacity-30" />
            <p className="italic text-sm">Play some tracks on Spotify then sync!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {topTracks.map((track, index) => {
              const accent = getColor(index);
              return (
                <motion.div
                  key={track.trackId}
                  className="bg-white/5 rounded-2xl flex items-center gap-4 p-3 pr-5 hover:bg-white/10 transition-all group cursor-pointer"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 + index * 0.06 }}
                  whileHover={{ scale: 1.01 }}
                >
                  {/* Rank */}
                  <div
                    className="w-8 text-center text-sm font-black shrink-0"
                    style={{ color: accent }}
                  >
                    {index + 1}
                  </div>

                  {/* Album Art */}
                  {track.imageUrl ? (
                    <img
                      src={track.imageUrl}
                      alt={track.name}
                      className="w-14 h-14 rounded-xl object-cover shrink-0 shadow-lg"
                    />
                  ) : (
                    <div
                      className="w-14 h-14 rounded-xl flex items-center justify-center shrink-0 shadow-lg"
                      style={{ background: `linear-gradient(135deg, ${accent}, ${accent}99)` }}
                    >
                      <Music className="w-6 h-6 text-white/80" />
                    </div>
                  )}

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-white truncate">{track.name}</div>
                    <div className="text-xs text-gray-400 mt-0.5">
                      {msToReadable(track.msPlayed ?? 0)} listened
                    </div>
                  </div>

                  {/* Plays badge */}
                  <div
                    className="text-xs font-bold px-3 py-1 rounded-full shrink-0"
                    style={{ background: `${accent}22`, color: accent }}
                  >
                    {track.playCount} plays
                  </div>

                  <ChevronRight className="w-4 h-4 text-gray-600 group-hover:text-gray-300 transition-colors shrink-0" />
                </motion.div>
              );
            })}
          </div>
        )}
      </motion.section>

      {/* Top Artists */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7 }}
      >
        <h3 className="text-2xl font-extrabold mb-4">
          <span className="bg-gradient-to-r from-teal-400 to-cyan-400 bg-clip-text text-transparent">
            Top Artists
          </span>
        </h3>

        {topArtists.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-10 text-gray-500">
            <Mic2 className="w-10 h-10 opacity-30" />
            <p className="italic text-sm">No artist data yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {topArtists.map((artist, index) => {
              const accent = getColor(index + 2);
              return (
                <motion.div
                  key={artist.artistId}
                  className="bg-white/5 rounded-2xl overflow-hidden cursor-pointer hover:bg-white/10 transition-all group relative"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.8 + index * 0.08 }}
                  whileHover={{ scale: 1.03 }}
                >
                  {/* Artist Photo */}
                  {artist.imageUrl ? (
                    <div className="relative w-full aspect-square">
                      <img
                        src={artist.imageUrl}
                        alt={artist.name}
                        className="w-full h-full object-cover"
                      />
                      {/* Gradient overlay */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                      {/* Rank badge */}
                      <div
                        className="absolute top-2 left-2 w-7 h-7 rounded-full flex items-center justify-center text-xs font-black"
                        style={{ background: accent }}
                      >
                        {index + 1}
                      </div>
                    </div>
                  ) : (
                    <div
                      className="w-full aspect-square flex items-center justify-center text-3xl font-black"
                      style={{ background: `linear-gradient(135deg, ${accent}, ${accent}77)` }}
                    >
                      {index + 1}
                    </div>
                  )}

                  {/* Info */}
                  <div className="p-3">
                    <div className="font-bold text-white text-sm truncate">{artist.name}</div>
                    <div className="text-xs text-gray-400 mt-0.5">
                      {artist.playCount} plays · {msToReadable(artist.msPlayed ?? 0)}
                    </div>
                    {artist.genres?.[0] && (
                      <div
                        className="text-xs mt-1 font-semibold capitalize"
                        style={{ color: accent }}
                      >
                        {artist.genres[0]}
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </motion.section>
    </div>
  );
}
