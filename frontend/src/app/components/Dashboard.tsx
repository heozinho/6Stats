import { motion } from 'motion/react';
import { Clock, TrendingUp, Share2, ChevronRight, RefreshCw } from 'lucide-react';
import { useState, useEffect } from 'react';

interface DashboardProps {
  onViewStatCard: () => void;
}

const colors = ['#ff6b35', '#ffd23f', '#4ecdc4', '#f4a261', '#95e1d3'];
const getColor = (index: number) => colors[index % colors.length];

export function Dashboard({ onViewStatCard }: DashboardProps) {
  const [activeTab, setActiveTab] = useState<'today' | 'week'>('today');
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [stats, setStats] = useState<any>(null);
  const [topTracks, setTopTracks] = useState<any[]>([]);
  const [topArtists, setTopArtists] = useState<any[]>([]);

  const fetchStats = async () => {
    const token = localStorage.getItem('6stats_token');
    const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8788';
    const headers = { 'Authorization': `Bearer ${token}` };

    try {
      const [todayRes, tracksRes, artistsRes] = await Promise.all([
        fetch(`${backendUrl}/stats/today`, { headers }),
        fetch(`${backendUrl}/stats/top-tracks`, { headers }),
        fetch(`${backendUrl}/stats/top-artists`, { headers })
      ]);

      const todayData = await todayRes.json();
      const tracksData = await tracksRes.json();
      const artistsData = await artistsRes.json();

      setStats(todayData);
      setTopTracks(tracksData.topTracks || []);
      setTopArtists(artistsData.topArtists || []);
    } catch (err) {
      console.error('Error fetching data:', err);
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    const token = localStorage.getItem('6stats_token');
    const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8788';
    const headers = { 'Authorization': `Bearer ${token}` };

    try {
      await fetch(`${backendUrl}/sync/recent`, { method: 'POST', headers });
      await fetchStats();
    } catch (err) {
      console.error('Sync failed:', err);
    } finally {
      setSyncing(false);
    }
  };

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await handleSync();
      setLoading(false);
    };
    init();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center p-6">
        <div className="animate-spin w-16 h-16 border-4 border-orange-500 border-t-transparent rounded-full mb-4"></div>
        <p className="text-xl font-bold bg-gradient-to-r from-orange-400 to-yellow-400 bg-clip-text text-transparent">
          Syncing with Spotify...
        </p>
      </div>
    );
  }

  const minutesListened = stats?.totalMs ? Math.round(stats.totalMs / 60000) : 0;
  const totalPlays = stats?.totalPlays || 0;

  return (
    <div className="min-h-screen w-full p-6 pb-24 overflow-y-auto">
      {/* Header */}
      <motion.div
        className="mb-8 flex justify-between items-start"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div>
          <h2 className="text-4xl font-extrabold mb-2">Your Stats</h2>
          <p className="text-gray-400">Celebrate your music journey</p>
        </div>
        <button 
          onClick={handleSync}
          disabled={syncing}
          className={`p-3 rounded-full bg-card hover:bg-card/80 transition-colors ${syncing ? 'opacity-50' : ''}`}
        >
          <RefreshCw className={`w-5 h-5 text-gray-400 ${syncing ? 'animate-spin' : ''}`} />
        </button>
      </motion.div>

      {/* Tab Switcher */}
      <motion.div
        className="flex gap-3 mb-8"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <button
          onClick={() => setActiveTab('today')}
          className={`flex-1 py-3 px-6 rounded-full font-bold transition-all ${
            activeTab === 'today'
              ? 'bg-gradient-to-r from-orange-500 to-yellow-400 text-black shadow-lg'
              : 'bg-card text-gray-400'
          }`}
        >
          Today
        </button>
        <button
          onClick={() => setActiveTab('week')}
          className={`flex-1 py-3 px-6 rounded-full font-bold transition-all ${
            activeTab === 'week'
              ? 'bg-gradient-to-r from-orange-500 to-yellow-400 text-black shadow-lg'
              : 'bg-card text-gray-400'
          }`}
        >
          This Week
        </button>
      </motion.div>

      {/* Minutes Listened Card */}
      <motion.div
        className="relative mb-6 p-8 rounded-3xl overflow-hidden cursor-pointer"
        style={{ background: 'linear-gradient(135deg, #ff6b35 0%, #ffd23f 100%)' }}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.2 }}
        whileHover={{ scale: 1.02 }}
        onClick={onViewStatCard}
      >
        <div className="absolute top-4 right-4">
          <Share2 className="w-5 h-5 text-white/80" />
        </div>
        <div className="flex items-center gap-3 mb-3">
          <Clock className="w-6 h-6 text-black/80" />
          <span className="text-black/80 font-medium">Minutes Listened</span>
        </div>
        <motion.div
          className="text-7xl font-black text-black mb-2"
          key={minutesListened}
          initial={{ scale: 1.1, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
        >
          {minutesListened.toLocaleString()}
        </motion.div>
        <div className="flex items-center gap-2 text-black/70">
          <TrendingUp className="w-4 h-4" />
          <span className="text-sm">{totalPlays} total plays today</span>
        </div>
      </motion.div>

      {/* Top Tracks */}
      <motion.div
        className="mb-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <h3 className="text-2xl font-extrabold mb-4 flex items-center gap-2">
          <span className="bg-gradient-to-r from-orange-400 to-yellow-400 bg-clip-text text-transparent">
            Top Tracks
          </span>
        </h3>
        {topTracks.length === 0 ? (
          <p className="text-gray-500 italic">Play some tracks on Spotify to see them here!</p>
        ) : (
          <div className="space-y-3">
            {topTracks.map((track, index) => {
              const color = getColor(index);
              return (
                <motion.div
                  key={track.trackId}
                  className="bg-card p-5 rounded-2xl flex items-center gap-4 cursor-pointer hover:bg-card/80 transition-all group"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 + index * 0.1 }}
                  whileHover={{ scale: 1.02 }}
                >
                  <div
                    className="w-14 h-14 rounded-xl flex items-center justify-center shadow-lg"
                    style={{
                      background: `linear-gradient(135deg, ${color}, ${color}dd)`,
                      boxShadow: `0 4px 20px ${color}40`
                    }}
                  >
                    <span className="text-2xl font-black text-white">{index + 1}</span>
                  </div>
                  <div className="flex-1">
                    <div className="font-bold text-white line-clamp-1">{track.name}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium text-gray-400">{track.playCount} plays</div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-500 group-hover:text-white transition-colors" />
                </motion.div>
              );
            })}
          </div>
        )}
      </motion.div>

      {/* Top Artists */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8 }}
      >
        <h3 className="text-2xl font-extrabold mb-4 flex items-center gap-2">
          <span className="bg-gradient-to-r from-teal-400 to-cyan-400 bg-clip-text text-transparent">
            Top Artists
          </span>
        </h3>
        {topArtists.length === 0 ? (
          <p className="text-gray-500 italic">No artist data yet.</p>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {topArtists.map((artist, index) => {
              const color = getColor(index + 2); // Offset color for artists
              return (
                <motion.div
                  key={artist.artistId}
                  className="bg-card p-5 rounded-2xl cursor-pointer hover:bg-card/80 transition-all group relative overflow-hidden"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.9 + index * 0.1 }}
                  whileHover={{ scale: 1.05 }}
                >
                  <div
                    className="absolute inset-0 opacity-10 group-hover:opacity-20 transition-opacity"
                    style={{ background: `linear-gradient(135deg, ${color}, transparent)` }}
                  />
                  <div className="relative">
                    <div
                      className="w-12 h-12 rounded-full mb-3 flex items-center justify-center font-black text-xl shadow-lg"
                      style={{
                        background: `linear-gradient(135deg, ${color}, ${color}dd)`,
                        boxShadow: `0 4px 15px ${color}40`
                      }}
                    >
                      {index + 1}
                    </div>
                    <div className="font-bold text-white mb-1 line-clamp-1">{artist.name}</div>
                    <div className="text-sm text-gray-400">{artist.playCount} plays</div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </motion.div>
    </div>
  );
}
