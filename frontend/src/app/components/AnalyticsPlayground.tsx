import { motion } from 'motion/react';
import { useMemo } from 'react';
import { AudioDNA } from './AudioDNA';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip } from 'recharts';
import { Wrench, Activity, Target } from 'lucide-react';

interface AnalyticsPlaygroundProps {
  history: any[];
}

export function AnalyticsPlayground({ history }: AnalyticsPlaygroundProps) {
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
        <div className="mb-12">
          <AudioDNA history={history} />
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
