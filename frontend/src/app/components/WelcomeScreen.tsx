import { Music } from 'lucide-react';
import { motion, useAnimation } from 'motion/react';
import { useState, useEffect } from 'react';

interface WelcomeScreenProps {
  onConnect: () => void;
}

export function WelcomeScreen({ onConnect }: WelcomeScreenProps) {
  const [showStats, setShowStats] = useState(false);
  const controls = useAnimation();

  useEffect(() => {
    const sequence = async () => {
      await new Promise(resolve => setTimeout(resolve, 800));
      setShowStats(true);
      await controls.start({
        scale: [1, 1.1, 1],
        transition: { duration: 0.6, ease: "easeInOut" }
      });
    };
    sequence();
  }, [controls]);

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Coachella-inspired animated background */}
      <div className="absolute inset-0 overflow-hidden">
        <motion.div
          className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full opacity-20 blur-3xl"
          style={{ background: 'linear-gradient(135deg, #ff6b35 0%, #ffd23f 100%)' }}
          animate={{
            scale: [1, 1.3, 1],
            x: [0, 50, 0],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
        <motion.div
          className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] rounded-full opacity-20 blur-3xl"
          style={{ background: 'linear-gradient(135deg, #4ecdc4 0%, #95e1d3 100%)' }}
          animate={{
            scale: [1.2, 1, 1.2],
            x: [0, -50, 0],
          }}
          transition={{
            duration: 25,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
        <motion.div
          className="absolute top-[30%] right-[20%] w-[40%] h-[40%] rounded-full opacity-15 blur-3xl"
          style={{ background: 'linear-gradient(135deg, #f4a261 0%, #ff8e53 100%)' }}
          animate={{
            scale: [1, 1.2, 1],
            y: [0, 30, 0],
          }}
          transition={{
            duration: 15,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
      </div>

      {/* Content */}
      <motion.div
        className="relative z-10 flex flex-col items-center gap-8 max-w-md w-full"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        {/* Animated Logo */}
        <motion.div
          className="flex items-center gap-2"
          animate={controls}
        >
          <motion.h1
            className="font-extrabold tracking-tight bg-gradient-to-br from-orange-400 via-yellow-300 to-teal-400 bg-clip-text text-transparent pb-4 pt-2"
            initial={{ fontSize: "12rem", letterSpacing: "-0.05em" }}
            animate={showStats ? { fontSize: "6rem" } : {}}
            transition={{ duration: 0.8, ease: "easeOut" }}
          >
            6
          </motion.h1>
          <motion.span
            className="font-extrabold tracking-tight bg-gradient-to-br from-orange-400 via-yellow-300 to-teal-400 bg-clip-text text-transparent"
            initial={{ opacity: 0, width: 0, fontSize: "6rem" }}
            animate={showStats ? { opacity: 1, width: "auto" } : {}}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            Stats
          </motion.span>
        </motion.div>

        {/* Tagline */}
        <motion.p
          className="text-lg text-gray-400 text-center max-w-xs"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2 }}
        >
          Your music, visualized
        </motion.p>

        {/* Connect Button */}
        <motion.button
          onClick={() => {
            const clientId = import.meta.env.VITE_SPOTIFY_CLIENT_ID;
            const redirectUri = encodeURIComponent(window.location.origin + '/');
            const scope = encodeURIComponent('user-read-recently-played user-top-read');
            window.location.href = `https://accounts.spotify.com/authorize?client_id=${clientId}&response_type=code&redirect_uri=${redirectUri}&scope=${scope}`;
          }}
          className="mt-8 w-full py-5 px-8 rounded-full bg-gradient-to-r from-orange-500 via-amber-400 to-yellow-400 text-black font-bold text-lg shadow-2xl relative overflow-hidden group"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.5 }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-orange-400 via-amber-300 to-yellow-300 opacity-0 group-hover:opacity-100 transition-opacity" />
          <span className="relative z-10 flex items-center justify-center gap-3">
            <Music className="w-6 h-6" />
            Connect with Spotify
          </span>
        </motion.button>
      </motion.div>
    </div>
  );
}
