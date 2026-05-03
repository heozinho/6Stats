import { motion } from 'motion/react';
import { Clock, TrendingUp, Share2, ChevronRight } from 'lucide-react';
import { useState } from 'react';

interface DashboardProps {
  onViewStatCard: () => void;
}

const mockTopTracks = [
  { id: 1, name: 'Blinding Lights', artist: 'The Weeknd', plays: 342, color: '#ff6b35' },
  { id: 2, name: 'As It Was', artist: 'Harry Styles', plays: 298, color: '#ffd23f' },
  { id: 3, name: 'Anti-Hero', artist: 'Taylor Swift', plays: 276, color: '#4ecdc4' },
  { id: 4, name: 'Flowers', artist: 'Miley Cyrus', plays: 251, color: '#f4a261' },
  { id: 5, name: 'Calm Down', artist: 'Rema & Selena Gomez', plays: 234, color: '#95e1d3' },
];

const mockTopArtists = [
  { id: 1, name: 'The Weeknd', genre: 'R&B', color: '#ff6b35' },
  { id: 2, name: 'Taylor Swift', genre: 'Pop', color: '#ffd23f' },
  { id: 3, name: 'Drake', genre: 'Hip-Hop', color: '#4ecdc4' },
  { id: 4, name: 'Bad Bunny', genre: 'Reggaeton', color: '#f4a261' },
];

export function Dashboard({ onViewStatCard }: DashboardProps) {
  const [activeTab, setActiveTab] = useState<'today' | 'week'>('today');
  const minutesListened = activeTab === 'today' ? 247 : 1834;

  return (
    <div className="min-h-screen w-full p-6 pb-24 overflow-y-auto">
      {/* Header */}
      <motion.div
        className="mb-8"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h2 className="text-4xl font-extrabold mb-2">Your Stats</h2>
        <p className="text-gray-400">Celebrate your music journey</p>
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
        style={{
          background: 'linear-gradient(135deg, #ff6b35 0%, #ffd23f 100%)',
        }}
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
          <span className="text-sm">+23% from last {activeTab === 'today' ? 'day' : 'week'}</span>
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
        <div className="space-y-3">
          {mockTopTracks.map((track, index) => (
            <motion.div
              key={track.id}
              className="bg-card p-5 rounded-2xl flex items-center gap-4 cursor-pointer hover:bg-card/80 transition-all group"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 + index * 0.1 }}
              whileHover={{ scale: 1.02 }}
            >
              <div
                className="w-14 h-14 rounded-xl flex items-center justify-center shadow-lg"
                style={{
                  background: `linear-gradient(135deg, ${track.color}, ${track.color}dd)`,
                  boxShadow: `0 4px 20px ${track.color}40`
                }}
              >
                <span className="text-2xl font-black text-white">{index + 1}</span>
              </div>
              <div className="flex-1">
                <div className="font-bold text-white">{track.name}</div>
                <div className="text-sm text-gray-400">{track.artist}</div>
              </div>
              <div className="text-right">
                <div className="text-sm font-medium text-gray-400">{track.plays} plays</div>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-500 group-hover:text-white transition-colors" />
            </motion.div>
          ))}
        </div>
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
        <div className="grid grid-cols-2 gap-4">
          {mockTopArtists.map((artist, index) => (
            <motion.div
              key={artist.id}
              className="bg-card p-5 rounded-2xl cursor-pointer hover:bg-card/80 transition-all group relative overflow-hidden"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.9 + index * 0.1 }}
              whileHover={{ scale: 1.05 }}
            >
              <div
                className="absolute inset-0 opacity-10 group-hover:opacity-20 transition-opacity"
                style={{ background: `linear-gradient(135deg, ${artist.color}, transparent)` }}
              />
              <div className="relative">
                <div
                  className="w-12 h-12 rounded-full mb-3 flex items-center justify-center font-black text-xl shadow-lg"
                  style={{
                    background: `linear-gradient(135deg, ${artist.color}, ${artist.color}dd)`,
                    boxShadow: `0 4px 15px ${artist.color}40`
                  }}
                >
                  {index + 1}
                </div>
                <div className="font-bold text-white mb-1">{artist.name}</div>
                <div className="text-sm text-gray-400">{artist.genre}</div>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
