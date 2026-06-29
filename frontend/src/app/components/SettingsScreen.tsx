import { useState, useEffect } from 'react';
import { Key, Trash2, Copy, Check } from 'lucide-react';

interface ApiKey {
  id: string;
  key: string;
  name: string;
  createdAt: string;
}

export function SettingsScreen({ backendUrl, fetchWithAuth }: { backendUrl: string, fetchWithAuth: any }) {
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    fetchKeys();
  }, []);

  const fetchKeys = async () => {
    try {
      const res = await fetchWithAuth(`${backendUrl}/auth/api-keys`);
      if (res.ok) {
        const data = await res.json();
        setApiKeys(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const generateKey = async () => {
    setGenerating(true);
    try {
      const res = await fetchWithAuth(`${backendUrl}/auth/api-keys`, { method: 'POST' });
      if (res.ok) {
        const newKey = await res.json();
        setApiKeys(prev => [...prev, newKey]);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setGenerating(false);
    }
  };

  const deleteKey = async (id: string) => {
    try {
      const res = await fetchWithAuth(`${backendUrl}/auth/api-keys/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setApiKeys(prev => prev.filter(k => k.id !== id));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const copyToClipboard = (keyStr: string, id: string) => {
    navigator.clipboard.writeText(keyStr);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 scrollbar-hide">
      <div className="max-w-2xl mx-auto pt-16 pb-32">
        <h1 className="text-3xl font-bold mb-2">Settings</h1>
        <p className="text-gray-400 mb-8">Manage your account and connections.</p>
        
        <div className="glass p-6 rounded-3xl border border-white/5 space-y-6">
          <div>
            <h2 className="text-xl font-semibold flex items-center gap-2 mb-1">
              <Key className="w-5 h-5 text-purple-400" />
              Muzeebra Connect Keys
            </h2>
            <p className="text-sm text-gray-400">
              Generate an API key to securely connect the Muzeebra macOS client to your 6Stats account without logging in again.
            </p>
          </div>

          {loading ? (
            <div className="animate-pulse bg-white/5 h-16 rounded-xl"></div>
          ) : (
            <div className="space-y-4">
              {apiKeys.length === 0 ? (
                <div className="text-center py-6 text-gray-500">
                  You haven't generated any keys yet.
                </div>
              ) : (
                apiKeys.map(k => (
                  <div key={k.id} className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center p-4 bg-black/20 rounded-xl border border-white/5">
                    <div>
                      <div className="font-medium text-white">{k.name}</div>
                      <div className="text-xs text-gray-500 font-mono mt-1 blur-sm hover:blur-none transition-all">{k.key}</div>
                      <div className="text-xs text-gray-600 mt-1">Created: {new Date(k.createdAt).toLocaleDateString()}</div>
                    </div>
                    <div className="flex gap-2 w-full sm:w-auto">
                      <button 
                        onClick={() => copyToClipboard(k.key, k.id)}
                        className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-sm transition-colors"
                      >
                        {copiedId === k.id ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                        {copiedId === k.id ? 'Copied' : 'Copy'}
                      </button>
                      <button 
                        onClick={() => deleteKey(k.id)}
                        className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg text-sm transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                        Revoke
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          <button 
            onClick={generateKey}
            disabled={generating}
            className="w-full py-3 px-4 bg-purple-500 hover:bg-purple-600 text-white font-semibold rounded-xl transition-all disabled:opacity-50"
          >
            {generating ? 'Generating...' : 'Generate New Key'}
          </button>
        </div>
      </div>
    </div>
  );
}
