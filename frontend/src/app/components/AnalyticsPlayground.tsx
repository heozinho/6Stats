import { motion } from 'motion/react';
import { useMemo, useState, useEffect, useRef } from 'react';
import { AudioDNA } from './AudioDNA';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip } from 'recharts';
import { Wrench, Activity, Target, Download, Scissors, Clock } from 'lucide-react';
import html2canvas from 'html2canvas';

interface AnalyticsPlaygroundProps {
  history: any[];
}

export function AnalyticsPlayground({ history: initialHistory }: AnalyticsPlaygroundProps) {
  const [history, setHistory] = useState(initialHistory);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [splicing, setSplicing] = useState(false);
  const dnaRef = useRef<HTMLDivElement>(null);

  // Sync with prop updates
  useEffect(() => {
    if (page === 1) {
      setHistory(initialHistory);
    }
  }, [initialHistory, page]);

  const fetchHistoryPage = async (newPage: number) => {
    setLoading(true);
    setPage(newPage);
    try {
      const token = localStorage.getItem('6stats_token');
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/stats/history?page=${newPage}&limit=50`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setHistory(data.history);
      }
    } catch (err) {
      console.error('Failed to fetch history:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    if (!dnaRef.current) return;
    try {
      const canvas = await html2canvas(dnaRef.current, {
        backgroundColor: '#111',
        scale: 2,
        logging: false
      });
      const url = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = url;
      a.download = `6stats-dna-export.png`;
      a.click();
    } catch (err) {
      console.error('Failed to export DNA:', err);
    }
  };

  const handleSpliceGenes = async () => {
    if (!history || history.length === 0) return;
    setSplicing(true);
    try {
      const highEnergyTracks = history.filter(t => t.energy && t.energy > 0.7).map(t => t.spotifyTrackId || t.trackId);
      if (highEnergyTracks.length === 0) {
        alert('Not enough high-energy tracks to splice!');
        setSplicing(false);
        return;
      }
      
      const token = localStorage.getItem('6stats_token');
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/playlists/splice`, {
        method: 'POST',
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          trackIds: highEnergyTracks,
          name: '6Stats: High Energy DNA Spliced'
        })
      });
      
      const data = await res.json();
      if (res.ok) {
        alert(`Playlist created! Opening in Spotify...`);
        window.open(data.url, '_blank');
      } else {
        alert('Failed to splice genes: ' + data.error);
      }
    } catch (err) {
      console.error('Error splicing genes:', err);
    } finally {
      setSplicing(false);
    }
  };

  // 1. Radar Chart Data (Average Vibe)
  const radarData = useMemo(() => {
    if (!history || history.length === 0) return [];
    
    let totalValence = 0;
    let totalEnergy = 0;
    let totalDanceability = 0;
    let totalAcousticness = 0;
    let count = 0;

    for (const track of history) {
      if (track.valence !== undefined && track.valence !== null) {
        totalValence += track.valence;
        totalEnergy += track.energy || 0;
        totalDanceability += track.danceability || 0;
        totalAcousticness += track.acousticness || 0;
        count++;
      }
    }

    if (count === 0) return [];

    return [
      { subject: 'Valence (Happiness)', A: Math.round(totalValence / count), fullMark: 100 },
      { subject: 'Energy', A: Math.round(totalEnergy / count), fullMark: 100 },
      { subject: 'Danceability', A: Math.round(totalDanceability / count), fullMark: 100 },
      { subject: 'Acousticness', A: Math.round(totalAcousticness / count), fullMark: 100 },
    ];
  }, [history]);

  // 2. Line Chart Data (BPM Heartbeat)
  const bpmData = useMemo(() => {
    if (!history || history.length === 0) return [];
    
    return [...history]
      .reverse() // Oldest to newest
      .filter(t => t.tempo && t.tempo > 0)
      .map((t, index) => ({
        name: t.trackName,
        artist: t.artistName,
        bpm: Math.round(t.tempo),
        index,
      }));
  }, [history]);

  return (
    <div className="h-full overflow-y-auto pb-24 px-4 pt-20 custom-scrollbar">
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-4xl mx-auto"
      >
        <div className="flex items-center gap-3 mb-8">
          <Wrench className="w-8 h-8 text-yellow-500 dark:text-yellow-400" />
          <h2 className="text-3xl font-black tracking-tight text-foreground">Analytics Playground</h2>
        </div>

        {/* The Audio DNA Bar */}
        <div className="mb-12 glass bg-black/5 dark:bg-white/5 rounded-3xl p-6">
          <div ref={dnaRef} className="p-4 bg-background rounded-2xl">
            <AudioDNA history={history} />
          </div>
          
          {/* Controls */}
          <div className="mt-6 flex flex-col md:flex-row items-center justify-between gap-4 border-t border-foreground/10 pt-6">
            <div className="flex items-center gap-4">
              <span className="text-sm font-bold text-foreground/50">DNA ERAS</span>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => fetchHistoryPage(page > 1 ? page - 1 : 1)}
                  disabled={page === 1 || loading}
                  className="px-3 py-1.5 rounded-full bg-foreground/10 text-xs font-bold hover:bg-foreground/20 disabled:opacity-50 transition-colors"
                >
                  NEWER
                </button>
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-foreground/5 text-xs font-bold text-foreground/60">
                  <Clock className="w-3 h-3" />
                  ERA {page}
                </div>
                <button 
                  onClick={() => fetchHistoryPage(page + 1)}
                  disabled={loading}
                  className="px-3 py-1.5 rounded-full bg-foreground/10 text-xs font-bold hover:bg-foreground/20 disabled:opacity-50 transition-colors"
                >
                  OLDER
                </button>
              </div>
            </div>
            
            <div className="flex items-center gap-3 w-full md:w-auto">
              <button 
                onClick={handleSpliceGenes}
                disabled={splicing}
                className="flex-1 md:flex-none flex items-center justify-center gap-2 px-5 py-2.5 rounded-full bg-green-500/10 text-green-500 font-bold text-sm hover:bg-green-500/20 transition-colors disabled:opacity-50"
              >
                <Scissors className="w-4 h-4" />
                {splicing ? 'Splicing...' : 'Splice High-Energy Genes'}
              </button>
              <button 
                onClick={handleExport}
                className="flex-1 md:flex-none flex items-center justify-center gap-2 px-5 py-2.5 rounded-full bg-foreground/10 text-foreground font-bold text-sm hover:bg-foreground/20 transition-colors"
              >
                <Download className="w-4 h-4" />
                Export Poster
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Vibe Radar */}
          <div className="glass bg-black/5 dark:bg-white/5 rounded-3xl p-6 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-20 group-hover:opacity-100 transition-opacity">
              <Target className="w-6 h-6 text-orange-500 dark:text-orange-400" />
            </div>
            <h3 className="text-xl font-bold mb-2 text-foreground">The Vibe Radar</h3>
            <p className="text-sm text-foreground/60 mb-6">Average acoustic features of your recent tracks.</p>
            
            <div className="h-64 w-full">
              {radarData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                    <PolarGrid stroke="currentColor" strokeOpacity={0.1} />
                    <PolarAngleAxis dataKey="subject" tick={{ fill: 'currentColor', opacity: 0.7, fontSize: 12 }} />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                    <Radar
                      name="Vibe"
                      dataKey="A"
                      stroke="#fb923c"
                      fill="#fb923c"
                      fillOpacity={0.4}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center text-gray-500 italic">No audio features available.</div>
              )}
            </div>
          </div>

          {/* BPM Heartbeat */}
          <div className="glass bg-black/5 dark:bg-white/5 rounded-3xl p-6 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-20 group-hover:opacity-100 transition-opacity">
              <Activity className="w-6 h-6 text-teal-500 dark:text-teal-400" />
            </div>
            <h3 className="text-xl font-bold mb-2 text-foreground">BPM Heartbeat</h3>
            <p className="text-sm text-foreground/60 mb-6">How your tempo changes from song to song.</p>
            
            <div className="h-64 w-full">
              {bpmData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={bpmData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <XAxis dataKey="index" hide />
                    <YAxis domain={['dataMin - 10', 'dataMax + 10']} stroke="currentColor" strokeOpacity={0.1} tick={{ fill: 'currentColor', opacity: 0.7, fontSize: 10 }} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: 'rgba(0,0,0,0.8)', border: 'none', borderRadius: '12px', color: '#fff' }}
                      labelStyle={{ display: 'none' }}
                      formatter={(value: any, _name: any, props: any) => [
                        `${value} BPM`,
                        `${props.payload.name} - ${props.payload.artist}`
                      ]}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="bpm" 
                      stroke="#2dd4bf" 
                      strokeWidth={3}
                      dot={false}
                      activeDot={{ r: 6, fill: '#2dd4bf', stroke: '#000', strokeWidth: 2 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center text-gray-500 italic">No BPM data available.</div>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
