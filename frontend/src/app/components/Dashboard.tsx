import { motion } from 'motion/react';
import { Clock, TrendingUp, Share2, ChevronRight, Music, BarChart2, Wrench, Mic2 } from 'lucide-react';
import { useState, useEffect } from 'react';

function msToReadable(ms: number) {
  const mins = Math.round(ms / 60000);
  if (mins < 60) return `${mins}m`;
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
}

interface DashboardProps {
  backendUrl: string;
  fetchWithAuth: (input: string, init?: RequestInit) => Promise<Response>;
  lastSynced: number;
  onViewStatCard: (stats: { todayStats: any; topTracks: any[]; topArtists: any[] }) => void;
  onBpmChange: (bpm: number) => void;
  onHistoryChange: (history: any[]) => void;
  onNavigateToPlayground: () => void;
  history: any[];
}

const colors = ['#ff6b35', '#ffd23f', '#4ecdc4', '#f4a261', '#95e1d3'];
const getColor = (index: number) => colors[index % colors.length];

// Detect user's IANA timezone once
const USER_TZ = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

export function Dashboard({ backendUrl, fetchWithAuth, lastSynced, onViewStatCard, onBpmChange, onHistoryChange, onNavigateToPlayground }: DashboardProps) {
  const [activeTab, setActiveTab] = useState<'today' | 'week'>('today');
  const [loading, setLoading] = useState(true);

  // Today
  const [todayStats, setTodayStats]   = useState<any>(null);
  const [todayTracks, setTodayTracks] = useState<any[]>([]);
  const [todayArtists, setTodayArtists] = useState<any[]>([]);

  // Week
  const [weekStats, setWeekStats]     = useState<any>(null);
  const [weekTracks, setWeekTracks]   = useState<any[]>([]);
  const [weekArtists, setWeekArtists] = useState<any[]>([]);

  const tz = encodeURIComponent(USER_TZ);

  const fetchStats = async () => {
    try {
      const res = await fetchWithAuth(`${backendUrl}/stats/dashboard?tz=${tz}`);
      if (!res.ok) throw new Error('Dashboard fetch failed');
      
      const data = await res.json();
      
      setTodayStats(data.today);
      setTodayTracks(data.topTracks.today);
      setTodayArtists(data.topArtists.today);
      setWeekStats(data.week);
      setWeekTracks(data.topTracks.week);
      setWeekArtists(data.topArtists.week);
      onHistoryChange(data.history || []);

      // Calculate Average BPM
      const tracksWithTempo = (data.history || []).filter((t: any) => t.tempo && t.tempo > 0);
      if (tracksWithTempo.length > 0) {
        const avgBpm = Math.round(tracksWithTempo.reduce((acc: number, t: any) => acc + t.tempo, 0) / tracksWithTempo.length);
        onBpmChange(avgBpm);
      }
    } catch (err) {
      console.error('Failed to fetch dashboard:', err);
    }
  };

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

  const isWeek = activeTab === 'week';
  const heroStats   = isWeek ? weekStats   : todayStats;
  const topTracks   = isWeek ? weekTracks  : todayTracks;
  const topArtists  = isWeek ? weekArtists : todayArtists;

  const minutesListened = heroStats?.totalMs    ? Math.round(heroStats.totalMs / 60000) : 0;
  const totalPlays      = heroStats?.totalPlays ?? 0;

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
          <p className="text-sm" style={{ color: 'rgba(255,255,255,0.3)' }}>Listening history · Spotify</p>
        </div>
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
        className="relative mb-6 p-8 rounded-3xl overflow-hidden cursor-pointer glass"
        style={{ background: 'linear-gradient(135deg, rgba(255, 107, 53, 0.2) 0%, rgba(255, 210, 63, 0.2) 100%)' }}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.2 }}
        whileHover={{ scale: 1.02 }}
        onClick={() => onViewStatCard({ todayStats: heroStats, topTracks, topArtists })}
      >
        <div className="absolute top-4 right-4 opacity-70">
          <Share2 className="w-5 h-5 text-foreground" />
        </div>
        <div className="flex items-center gap-3 mb-3">
          <Clock className="w-6 h-6 text-foreground/80" />
          <span className="text-foreground/80 font-semibold">Minutes Listened</span>
        </div>
        <motion.div
          className="text-7xl font-black text-foreground mb-2 tabular-nums"
          key={minutesListened}
          initial={{ scale: 1.1, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
        >
          {minutesListened.toLocaleString()}
        </motion.div>
        <div className="flex items-center gap-2 text-foreground/70">
          <TrendingUp className="w-4 h-4" />
          <span className="text-sm">
            {totalPlays} play{totalPlays !== 1 ? 's' : ''} {isWeek ? 'this week' : 'today'}
            {totalPlays === 0 && !isWeek && (
              <span className="ml-1 opacity-70">· updates after each song finishes</span>
            )}
          </span>
        </div>
      </motion.div>
      {/* Analytics Playground Banner */}
      <motion.div
        className="mb-10 p-6 rounded-3xl overflow-hidden cursor-pointer glass group relative"
        style={{ background: 'linear-gradient(135deg, rgba(45, 212, 191, 0.1) 0%, rgba(251, 146, 60, 0.1) 100%)' }}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.25 }}
        whileHover={{ scale: 1.02 }}
        onClick={onNavigateToPlayground}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-white/10 rounded-2xl">
              <Wrench className="w-6 h-6 text-yellow-400" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white mb-0.5">Analytics Playground</h3>
              <p className="text-sm text-gray-400">Audio DNA, Vibe Radar & BPM Heartbeat</p>
            </div>
          </div>
          <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-white/10 transition-colors">
            <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-white" />
          </div>
        </div>
      </motion.div>

      {/* Top Tracks */}
      <motion.section
        className="mb-8"
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <h3 className="flex items-center gap-2 text-lg font-bold mb-4">
          <BarChart2 className="w-4 h-4" style={{ color: '#ff6b35' }} />
          <span style={{ color: 'rgba(255,255,255,0.85)' }}>Top Tracks</span>
        </h3>

        {topTracks.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-10 text-gray-500">
            <Music className="w-10 h-10 opacity-30" />
            <p className="italic text-sm">No tracks {isWeek ? 'this week' : 'today'} yet.</p>
          </div>
        ) : (
          <div className="space-y-3">
        {(topTracks || []).map((track, index) => {
              const accent = getColor(index);
              return (
                <div
                  key={track.trackId}
                  className="bg-white/5 glass rounded-2xl flex items-center gap-4 p-3 pr-5 hover:bg-white/10 transition-all group cursor-pointer stagger-fade-in"
                  style={{ animationDelay: `${index * 0.05}s` }}
                >
                  <div className="w-8 text-center text-sm font-black shrink-0" style={{ color: accent }}>
                    {index + 1}
                  </div>
                  {track.imageUrl ? (
                    <img src={track.imageUrl} alt={track.name} className="w-14 h-14 rounded-xl object-cover shrink-0 shadow-lg" />
                  ) : (
                    <div className="w-14 h-14 rounded-xl flex items-center justify-center shrink-0 shadow-lg" style={{ background: `linear-gradient(135deg, ${accent}, ${accent}99)` }}>
                      <Music className="w-6 h-6 text-white/80" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-white truncate">{track.name}</div>
                    <div className="text-xs text-gray-400 mt-0.5">{msToReadable(track.msPlayed ?? 0)} listened</div>
                  </div>
                  <div className="text-xs font-bold px-3 py-1 rounded-full shrink-0" style={{ background: `${accent}22`, color: accent }}>
                    {track.playCount} plays
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-600 group-hover:text-gray-300 transition-colors shrink-0" />
                </div>
              );
            })}
          </div>
        )}
      </motion.section>

      {/* Top Artists */}
      <motion.section
        className="mb-8"
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <h3 className="flex items-center gap-2 text-lg font-bold mb-4">
          <Mic2 className="w-4 h-4" style={{ color: '#4ecdc4' }} />
          <span style={{ color: 'rgba(255,255,255,0.85)' }}>Top Artists</span>
        </h3>

        {topArtists.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-10 text-gray-500">
            <Mic2 className="w-10 h-10 opacity-30" />
            <p className="italic text-sm">No artists {isWeek ? 'this week' : 'today'} yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-8">
            {(topArtists || []).map((artist, index) => {
              const accent = getColor(index + 2);
              return (
                <div
                  key={artist.artistId}
                  className="cursor-pointer group relative stagger-fade-in flex flex-col"
                  style={{ animationDelay: `${index * 0.05}s` }}
                >
                  <div className="relative w-full aspect-square mb-3">
                    {artist.imageUrl ? (
                      <>
                        <img 
                          src={artist.imageUrl} 
                          alt={artist.name} 
                          className="w-full h-full object-cover rounded-[1.25rem] shadow-[0_8px_24px_-8px_rgba(0,0,0,0.5)] transition-transform duration-300 group-hover:-translate-y-1" 
                        />
                        <div className="absolute inset-0 rounded-[1.25rem] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.1)] pointer-events-none" />
                      </>
                    ) : (
                      <div 
                        className="w-full h-full rounded-[1.25rem] shadow-[0_8px_24px_-8px_rgba(0,0,0,0.5)] flex items-center justify-center transition-transform duration-300 group-hover:-translate-y-1" 
                        style={{ background: `linear-gradient(135deg, ${accent}, ${accent}77)` }}
                      >
                        <Mic2 className="w-10 h-10 text-white/50" />
                      </div>
                    )}
                    
                    {/* Rank Badge */}
                    <div 
                      className="absolute -top-2 -right-2 w-7 h-7 rounded-full flex items-center justify-center text-xs font-black shadow-md z-10 border-2 border-[#121212]" 
                      style={{ background: accent, color: '#fff' }}
                    >
                      {index + 1}
                    </div>
                  </div>
                  
                  <div className="w-full px-1">
                    <div className="font-bold text-white text-[15px] leading-tight truncate tracking-tight">{artist.name}</div>
                    <div className="text-[13px] text-gray-400 mt-0.5 truncate">
                      {artist.playCount} plays · {msToReadable(artist.msPlayed ?? 0)}
                    </div>
                    {artist.genres?.[0] && (
                      <div className="text-[11px] font-medium mt-1 truncate" style={{ color: accent }}>
                        {artist.genres[0]}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </motion.section>
    </div>
  );
}
