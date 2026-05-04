import { useState, useEffect, useCallback } from 'react';
import { LayoutDashboard, History } from 'lucide-react';
import { WelcomeScreen } from './components/WelcomeScreen';
import { Dashboard } from './components/Dashboard';
import { StatCard } from './components/StatCard';
import { HistoryScreen } from './components/HistoryScreen';
import { GlowBackground } from './components/GlowBackground';
import { Moon, Sun } from 'lucide-react';

export interface LiveStats {
  todayStats: any;
  topTracks: any[];
  topArtists: any[];
}

export default function App() {
  const [screen, setScreen] = useState<'welcome' | 'app' | 'loading'>('welcome');
  const [activeTab, setActiveTab] = useState<'dashboard' | 'history'>('dashboard');
  const [showStatCard, setShowStatCard] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [liveStats, setLiveStats] = useState<LiveStats | null>(null);
  const [lastSynced, setLastSynced] = useState<number>(0);
  const [syncing, setSyncing] = useState(false);
  const [recentHistory, setRecentHistory] = useState<any[]>([]);
  const [bpm, setBpm] = useState<number>(120);
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    return (localStorage.getItem('6stats_theme') as 'dark' | 'light') || 'dark';
  });

  useEffect(() => {
    document.documentElement.className = theme;
    localStorage.setItem('6stats_theme', theme);
  }, [theme]);

  const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8788';
  const getHeaders = () => ({ Authorization: `Bearer ${localStorage.getItem('6stats_token')}` });

  // App-level sync — called once on login and whenever the user taps "Sync Now"
  const triggerSync = useCallback(async () => {
    setSyncing(true);
    try {
      await fetch(`${backendUrl}/sync/recent`, { method: 'POST', headers: getHeaders() });
      setLastSynced(Date.now());
    } catch (err) {
      console.error('Sync failed:', err);
    } finally {
      setSyncing(false);
    }
  }, [backendUrl]);

  useEffect(() => {
    const token = localStorage.getItem('6stats_token');
    if (token && window.location.search === '') {
      setScreen('app');
      return;
    }

    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const spotifyError = params.get('error');

    if (spotifyError) {
      setError(`Spotify authorization failed: ${spotifyError}`);
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (code) {
      setScreen('loading');
      window.history.replaceState({}, document.title, window.location.pathname);

      const redirectUri = window.location.origin + '/';

      fetch(`${backendUrl}/auth/spotify/connect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, redirect_uri: redirectUri }),
      })
        .then(res => {
          if (!res.ok) throw new Error('Failed to connect with Spotify');
          return res.json();
        })
        .then((data: any) => {
          if (data.token) {
            localStorage.setItem('6stats_token', data.token);
            setScreen('app');
          } else {
            throw new Error('No token received');
          }
        })
        .catch(err => {
          console.error(err);
          setError(err.message || 'Authentication failed');
          setScreen('welcome');
        });
    }
  }, []);

  // Auto-sync when app becomes visible (login or tab focus)
  useEffect(() => {
    if (screen === 'app') {
      triggerSync();
    }
  }, [screen]);

  // Auto-poll every 5 minutes while the app is open so completed plays appear
  // without needing a manual tap (Spotify only logs plays after the track finishes)
  useEffect(() => {
    if (screen !== 'app') return;
    const interval = setInterval(() => {
      if (!syncing) triggerSync();
    }, 5 * 60 * 1000); // 5 minutes
    return () => clearInterval(interval);
  }, [screen, syncing, triggerSync]);


  return (
    <div className="size-full bg-background text-foreground overflow-hidden flex flex-col">
      {/* Error toast */}
      {error && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 bg-red-500 text-white px-6 py-3 rounded-full shadow-lg flex items-center gap-3">
          {error}
          <button className="font-bold" onClick={() => setError(null)}>✕</button>
        </div>
      )}

      {/* Loading state */}
      {screen === 'loading' && (
        <div className="flex-1 flex flex-col items-center justify-center p-6">
          <div className="animate-spin w-16 h-16 border-4 border-orange-500 border-t-transparent rounded-full mb-4" />
          <p className="text-xl font-bold bg-gradient-to-r from-orange-400 to-yellow-400 bg-clip-text text-transparent">
            Connecting to Spotify...
          </p>
        </div>
      )}

      {/* Welcome */}
      {screen === 'welcome' && (
        <WelcomeScreen onConnect={() => setScreen('app')} />
      )}

      {/* Main app with tabs */}
      {screen === 'app' && (
        <>
          <GlowBackground bpm={bpm} />
          
          {/* Theme Toggle */}
          <button
            onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}
            className="absolute top-6 right-20 z-50 p-3 rounded-full bg-white/5 hover:bg-white/10 glass transition-all"
          >
            {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>

          {/* Tab content */}
          <div className="flex-1 overflow-hidden">
            {activeTab === 'dashboard' && (
              <Dashboard
                backendUrl={backendUrl}
                getHeaders={getHeaders}
                lastSynced={lastSynced}
                syncing={syncing}
                onSync={triggerSync}
                onBpmChange={(b) => setBpm(b)}
                onHistoryChange={(h) => setRecentHistory(h)}
                history={recentHistory}
                onViewStatCard={(stats) => {
                  setLiveStats(stats);
                  setShowStatCard(true);
                }}
              />
            )}
            {activeTab === 'history' && (
              <HistoryScreen
                backendUrl={backendUrl}
                getHeaders={getHeaders}
                lastSynced={lastSynced}
                syncing={syncing}
                onSync={triggerSync}
              />
            )}
          </div>

          {/* Bottom navigation */}
          <nav className="shrink-0 flex border-t border-white/10 bg-background/95 backdrop-blur-xl">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`flex-1 flex flex-col items-center py-4 gap-1 transition-colors ${
                activeTab === 'dashboard' ? 'text-orange-400' : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              <LayoutDashboard className="w-5 h-5" />
              <span className="text-xs font-semibold">Stats</span>
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`flex-1 flex flex-col items-center py-4 gap-1 transition-colors ${
                activeTab === 'history' ? 'text-teal-400' : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              <History className="w-5 h-5" />
              <span className="text-xs font-semibold">History</span>
            </button>
          </nav>
        </>
      )}

      {/* Stat card overlay */}
      {showStatCard && liveStats && (
        <StatCard
          onClose={() => setShowStatCard(false)}
          todayStats={liveStats.todayStats}
          topTracks={liveStats.topTracks}
          topArtists={liveStats.topArtists}
        />
      )}
    </div>
  );
}
