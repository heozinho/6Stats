import { useState, useEffect, useCallback } from 'react';
import { LayoutDashboard, History, LogOut, RefreshCw, Wrench } from 'lucide-react';
import { WelcomeScreen } from './components/WelcomeScreen';
import { Dashboard } from './components/Dashboard';
import { StatCard } from './components/StatCard';
import { HistoryScreen } from './components/HistoryScreen';
import { AnalyticsPlayground } from './components/AnalyticsPlayground';
import { GlowBackground } from './components/GlowBackground';
import { Moon, Sun } from 'lucide-react';

export interface LiveStats {
  todayStats: any;
  topTracks: any[];
  topArtists: any[];
}

export default function App() {
  const [screen, setScreen] = useState<'welcome' | 'app' | 'loading'>('welcome');
  const [activeTab, setActiveTab] = useState<'dashboard' | 'history' | 'playground'>('dashboard');
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

  const logout = useCallback((reason?: 'expired' | 'manual') => {
    localStorage.removeItem('6stats_token');
    setScreen('welcome');
    setLiveStats(null);
    setRecentHistory([]);
    setShowStatCard(false);
    if (reason === 'expired') {
      setError('Session expired — please log in again.');
    }
  }, []);

  // Authenticated fetch — auto-logs out on 401
  const fetchWithAuth = useCallback(async (input: string, init?: RequestInit): Promise<Response> => {
    const token = localStorage.getItem('6stats_token');
    const res = await fetch(input, {
      ...init,
      headers: {
        ...(init?.headers ?? {}),
        Authorization: `Bearer ${token}`,
      },
    });
    if (res.status === 401) {
      logout('expired');
      throw new Error('Session expired');
    }
    return res;
  }, [logout]);

  // App-level sync — called once on login and whenever the user taps "Sync Now"
  const triggerSync = useCallback(async () => {
    setSyncing(true);
    try {
      await fetchWithAuth(`${backendUrl}/sync/recent`, { method: 'POST' });
      setLastSynced(Date.now());
    } catch (err) {
      console.error('Sync failed:', err);
    } finally {
      setSyncing(false);
    }
  }, [backendUrl, fetchWithAuth]);

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

  // Auto-poll every 5 minutes
  useEffect(() => {
    if (screen !== 'app') return;
    const interval = setInterval(() => {
      if (!syncing) triggerSync();
    }, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [screen, syncing, triggerSync]);


  return (
    <div className="size-full bg-background text-foreground overflow-hidden flex flex-col">
      {/* Error toast */}
      {error && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 bg-red-500 text-white px-6 py-3 rounded-full shadow-lg flex items-center gap-3 whitespace-nowrap">
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
          
          {/* Top-right controls: Sync · Theme · Logout */}
          <div className="absolute top-5 right-4 z-50 flex items-center gap-1.5">
            <button
              onClick={triggerSync}
              disabled={syncing}
              title="Sync latest plays"
              className="p-2.5 rounded-full bg-white/5 hover:bg-white/10 glass transition-all disabled:opacity-40"
            >
              <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin text-orange-400' : ''}`} />
            </button>
            <button
              onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}
              className="p-2.5 rounded-full bg-white/5 hover:bg-white/10 glass transition-all"
              title="Toggle theme"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            <button
              onClick={() => logout('manual')}
              className="p-2.5 rounded-full bg-white/5 hover:bg-red-500/20 hover:text-red-400 glass transition-all"
              title="Log out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>

          {/* Tab content */}
          <div className="flex-1 overflow-hidden">
            {activeTab === 'dashboard' && (
              <Dashboard
                backendUrl={backendUrl}
                fetchWithAuth={fetchWithAuth}
                lastSynced={lastSynced}
                onBpmChange={(b) => setBpm(b)}
                onHistoryChange={(h) => setRecentHistory(h)}
                history={recentHistory}
                onNavigateToPlayground={() => setActiveTab('playground')}
                onViewStatCard={(stats) => {
                  setLiveStats(stats);
                  setShowStatCard(true);
                }}
              />
            )}
            {activeTab === 'history' && (
              <HistoryScreen
                backendUrl={backendUrl}
                fetchWithAuth={fetchWithAuth}
                lastSynced={lastSynced}
              />
            )}
            {activeTab === 'playground' && (
              <AnalyticsPlayground history={recentHistory} />
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
            <button
              onClick={() => setActiveTab('playground')}
              className={`flex-1 flex flex-col items-center py-4 gap-1 transition-colors ${
                activeTab === 'playground' ? 'text-yellow-400' : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              <Wrench className="w-5 h-5" />
              <span className="text-xs font-semibold">Playground</span>
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
