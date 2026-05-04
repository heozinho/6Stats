import { motion } from 'motion/react';
import { useState, useEffect, useRef, useCallback } from 'react';
import { Music, History, RefreshCw } from 'lucide-react';

interface HistoryScreenProps {
  backendUrl: string;
  getHeaders: () => Record<string, string>;
  lastSynced: number;
  syncing: boolean;
  onSync: () => void;
}

interface HistoryEntry {
  id: string;
  playedAt: string;
  durationMs: number;
  source: string | null;
  trackId: string;
  trackName: string;
  imageUrl: string | null;
  artistName: string | null;
}

function formatPlayedAt(dateStr: string): { date: string; time: string } {
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / 86400000);

  let date: string;
  if (diffDays === 0) date = 'Today';
  else if (diffDays === 1) date = 'Yesterday';
  else if (diffDays < 7) date = `${diffDays} days ago`;
  else date = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });

  const time = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  return { date, time };
}

function msToMin(ms: number): string {
  const s = Math.round(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

// Group history entries by date label
function groupByDate(entries: HistoryEntry[]) {
  const groups: { label: string; items: HistoryEntry[] }[] = [];
  let currentLabel = '';

  for (const entry of entries) {
    const { date } = formatPlayedAt(entry.playedAt);
    if (date !== currentLabel) {
      currentLabel = date;
      groups.push({ label: date, items: [] });
    }
    groups[groups.length - 1].items.push(entry);
  }
  return groups;
}

export function HistoryScreen({ backendUrl, getHeaders, lastSynced, syncing, onSync }: HistoryScreenProps) {
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const loaderRef = useRef<HTMLDivElement>(null);

  const fetchPage = useCallback(async (pageNum: number, replace = false) => {
    if (pageNum === 0) setLoading(true); else setLoadingMore(true);
    try {
      const res = await fetch(`${backendUrl}/stats/history?page=${pageNum}&limit=50`, { headers: getHeaders() });
      const data = await res.json() as any;
      setHistory(prev => replace ? data.history : [...prev, ...data.history]);
      setHasMore(data.hasMore);
      setPage(pageNum);
    } catch (e) {
      console.error('History fetch error', e);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [backendUrl]);

  // Re-fetch from page 0 whenever the app-level sync completes
  useEffect(() => { fetchPage(0, true); }, [lastSynced]);

  // Infinite scroll — observe the loader div
  useEffect(() => {
    if (!loaderRef.current) return;
    const obs = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore && !loadingMore) {
        fetchPage(page + 1);
      }
    }, { threshold: 0.1 });
    obs.observe(loaderRef.current);
    return () => obs.disconnect();
  }, [hasMore, loadingMore, page, fetchPage]);

  const groups = groupByDate(history);

  if (loading) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center gap-4">
        <div className="animate-spin w-12 h-12 border-4 border-teal-500 border-t-transparent rounded-full" />
        <p className="text-gray-400 text-sm">Loading your history...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full pb-28 overflow-y-auto">
      {/* Header */}
      <motion.div
        className="sticky top-0 z-10 px-6 pt-6 pb-4 bg-background/80 backdrop-blur-xl border-b border-white/5"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-extrabold">Listening History</h2>
            <p className="text-gray-400 text-sm mt-0.5">{history.length} plays tracked</p>
          </div>
          <button
            onClick={onSync}
            disabled={syncing}
            title="Sync latest plays"
            className="p-3 rounded-full bg-white/5 hover:bg-white/10 transition-colors disabled:opacity-40"
          >
            <RefreshCw className={`w-4 h-4 text-gray-400 ${syncing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </motion.div>

      {/* Empty state */}
      {history.length === 0 && (
        <div className="flex flex-col items-center justify-center gap-4 py-24 text-gray-500">
          <History className="w-12 h-12 opacity-30" />
          <p className="text-sm italic">No listening history yet. Sync your Spotify first!</p>
        </div>
      )}

      {/* Grouped history */}
      <div className="px-6 pt-4 space-y-6">
        {groups.map((group, gi) => (
          <motion.div
            key={group.label}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: gi * 0.04 }}
          >
            {/* Date label */}
            <div className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-3 flex items-center gap-2">
              <div className="h-px flex-1 bg-white/5" />
              {group.label}
              <div className="h-px flex-1 bg-white/5" />
            </div>

            {/* Plays in this group */}
            <div className="space-y-2">
              {group.items.map((entry, i) => {
                const { time } = formatPlayedAt(entry.playedAt);
                return (
                  <motion.div
                    key={entry.id}
                    className="flex items-center gap-3 p-3 rounded-2xl bg-white/5 hover:bg-white/8 transition-colors"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.02 }}
                  >
                    {/* Album art */}
                    {entry.imageUrl ? (
                      <img
                        src={entry.imageUrl}
                        alt={entry.trackName}
                        className="w-12 h-12 rounded-xl object-cover shrink-0"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
                        <Music className="w-5 h-5 text-white/30" />
                      </div>
                    )}

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-white text-sm truncate">{entry.trackName}</div>
                      <div className="text-xs text-gray-400 truncate">{entry.artistName ?? 'Unknown artist'}</div>
                    </div>

                    {/* Time + duration */}
                    <div className="text-right shrink-0">
                      <div className="text-xs text-gray-300 font-medium">{time}</div>
                      <div className="text-xs text-gray-500 mt-0.5">{msToMin(entry.durationMs)}</div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        ))}

        {/* Infinite scroll loader */}
        <div ref={loaderRef} className="py-6 flex justify-center">
          {loadingMore && (
            <div className="animate-spin w-6 h-6 border-2 border-teal-500 border-t-transparent rounded-full" />
          )}
          {!hasMore && history.length > 0 && (
            <p className="text-gray-600 text-xs">You've reached the beginning of your history</p>
          )}
        </div>
      </div>
    </div>
  );
}
