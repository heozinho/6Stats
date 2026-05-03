import { useState, useEffect } from 'react';
import { WelcomeScreen } from './components/WelcomeScreen';
import { Dashboard } from './components/Dashboard';
import { StatCard } from './components/StatCard';

export default function App() {
  const [screen, setScreen] = useState<'welcome' | 'dashboard' | 'loading'>('welcome');
  const [showStatCard, setShowStatCard] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Check if we already have a token
    const token = localStorage.getItem('6stats_token');
    if (token && window.location.search === '') {
      // In a real app, you might want to validate the token first
      setScreen('dashboard');
      return;
    }

    // Check URL for Spotify OAuth callback code
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const spotifyError = params.get('error');

    if (spotifyError) {
      setError(`Spotify authorization failed: ${spotifyError}`);
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (code) {
      setScreen('loading');
      
      // Clear code from URL
      window.history.replaceState({}, document.title, window.location.pathname);

      // Exchange code for token
      const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8787';
      const redirectUri = window.location.origin + '/';

      fetch(`${backendUrl}/auth/spotify/connect`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          code,
          redirect_uri: redirectUri 
        }),
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
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 bg-red-500 text-white px-6 py-3 rounded-full shadow-lg">
          {error}
          <button className="ml-4 font-bold" onClick={() => setError(null)}>X</button>
        </div>
      )}
      
      {screen === 'loading' && (
        <div className="min-h-screen w-full flex flex-col items-center justify-center p-6 bg-background relative overflow-hidden">
          <div className="animate-spin w-16 h-16 border-4 border-orange-500 border-t-transparent rounded-full mb-4"></div>
          <p className="text-xl font-bold bg-gradient-to-r from-orange-400 to-yellow-400 bg-clip-text text-transparent">Connecting to Spotify...</p>
        </div>
      )}

      {screen === 'welcome' && (
        <WelcomeScreen onConnect={() => setScreen('dashboard')} />
      )}
      {screen === 'dashboard' && (
        <Dashboard onViewStatCard={() => setShowStatCard(true)} />
      )}
      {showStatCard && (
        <StatCard onClose={() => setShowStatCard(false)} />
      )}
    </div>
  );
}
