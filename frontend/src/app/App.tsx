import { useState, useEffect } from 'react';
import { WelcomeScreen } from './components/WelcomeScreen';
import { Dashboard } from './components/Dashboard';
import { StatCard } from './components/StatCard';

export interface LiveStats {
  todayStats: any;
  topTracks: any[];
  topArtists: any[];
}

export default function App() {
  const [screen, setScreen] = useState<'welcome' | 'dashboard' | 'loading'>('welcome');
  const [showStatCard, setShowStatCard] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [liveStats, setLiveStats] = useState<LiveStats | null>(null);

  const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8788';

  useEffect(() => {
    const token = localStorage.getItem('6stats_token');
    if (token && window.location.search === '') {
      setScreen('dashboard');
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
        .then(data => {
          if (data.token) {
            localStorage.setItem('6stats_token', data.token);
            setScreen('dashboard');
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

  return (
    <div className="size-full bg-background text-foreground overflow-hidden">
      {error && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 bg-red-500 text-white px-6 py-3 rounded-full shadow-lg flex items-center gap-3">
          {error}
          <button className="font-bold" onClick={() => setError(null)}>✕</button>
        </div>
      )}

      {screen === 'loading' && (
        <div className="min-h-screen w-full flex flex-col items-center justify-center p-6 bg-background relative overflow-hidden">
          <div className="animate-spin w-16 h-16 border-4 border-orange-500 border-t-transparent rounded-full mb-4" />
          <p className="text-xl font-bold bg-gradient-to-r from-orange-400 to-yellow-400 bg-clip-text text-transparent">
            Connecting to Spotify...
          </p>
        </div>
      )}

      {screen === 'welcome' && (
        <WelcomeScreen onConnect={() => setScreen('dashboard')} />
      )}

      {screen === 'dashboard' && (
        <Dashboard
          onViewStatCard={(stats) => {
            setLiveStats(stats);
            setShowStatCard(true);
          }}
        />
      )}

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
