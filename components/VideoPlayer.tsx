import React, { useState, useRef, useEffect } from 'react';
import { Play } from 'lucide-react';

export type VideoKey = "vsl" | "test1" | "test2";

interface PlayerProps {
  id: VideoKey;
  src: string;
  poster: string;
  currentlyPlaying: VideoKey | null;
  setCurrentlyPlaying: (k: VideoKey | null) => void;
  refsMap: React.MutableRefObject<Record<VideoKey, HTMLVideoElement | null>>;
  aspectRatio?: string;
}

export function VideoPlayer({
  id,
  src,
  poster,
  currentlyPlaying,
  setCurrentlyPlaying,
  refsMap,
  aspectRatio = "16/9", 
}: PlayerProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isPosterVisible, setIsPosterVisible] = useState(true);
  const localRef = useRef<HTMLVideoElement | null>(null);
  const trackedQuartiles = useRef<Set<number>>(new Set());
  const isPlaying = currentlyPlaying === id;

  useEffect(() => {
    if (refsMap.current) {
        refsMap.current[id] = localRef.current;
    }
    return () => {
      if (refsMap.current) {
        refsMap.current[id] = null;
      }
    };
  }, [id, refsMap]);

  const sendVideoEvent = async (eventType: string) => {
    try {
        await fetch('/api/track-video', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ eventType, videoId: id })
        });
    } catch (e) { console.error('Erro tracking video', e); }
  };

  const handleTimeUpdate = () => {
    const video = localRef.current;
    if (!video) return;

    const progress = (video.currentTime / video.duration) * 100;
    
    [25, 50, 75].forEach(q => {
        if (progress >= q && !trackedQuartiles.current.has(q)) {
            trackedQuartiles.current.add(q);
            sendVideoEvent(`${q}%`);
        }
    });
  };

  const handlePlayClick = async () => {
    (Object.keys(refsMap.current) as VideoKey[]).forEach((k) => {
      if (k !== id && refsMap.current[k]) {
        try {
          refsMap.current[k]!.pause();
        } catch {}
      }
    });
    setCurrentlyPlaying(id);
    setIsPosterVisible(false);
    setIsLoading(true);
    
    if (trackedQuartiles.current.size === 0) {
        sendVideoEvent('play');
    }

    try {
      await refsMap.current[id]?.play();
    } catch (err) {
      console.error("Erro ao dar play:", err);
      setIsLoading(false);
      setIsPosterVisible(true);
      setCurrentlyPlaying(null);
    }
  };

  return (
    <div 
      className="relative w-full rounded-2xl shadow-2xl overflow-hidden border border-slate-700 bg-gray-900 group"
      style={{ aspectRatio: aspectRatio.replace('/', ' / ') }}
    >
      <video
        ref={(el) => {
          localRef.current = el;
          if (refsMap.current) refsMap.current[id] = el;
        }}
        src={src}
        playsInline
        controls={isPlaying}
        onWaiting={() => setIsLoading(true)}
        onPlaying={() => setIsLoading(false)}
        onTimeUpdate={handleTimeUpdate}
        onPause={() => {
          if (currentlyPlaying === id) setCurrentlyPlaying(null);
          setIsPosterVisible(true);
        }}
        onEnded={() => {
          setCurrentlyPlaying(null);
          setIsPosterVisible(true);
          sendVideoEvent('complete');
        }}
        className="w-full h-full object-cover"
      />
      
      {isPosterVisible && poster && (
        <div className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-105" style={{ backgroundImage: `url(${poster})` }}>
          <div className="absolute inset-0 bg-black/40 group-hover:bg-black/50 transition-all" />
        </div>
      )}

      {isPosterVisible && (
        <div
          onClick={handlePlayClick}
          className="absolute inset-0 z-10 flex items-center justify-center cursor-pointer group/play"
        >
          <div className="relative flex items-center justify-center">
            {/* Ping Animation Ring */}
            <div className="absolute w-24 h-24 bg-green-500 rounded-full animate-ping opacity-30"></div>
            
            {/* Static Glow */}
            <div className="absolute w-20 h-20 bg-green-500 rounded-full opacity-20 blur-md"></div>

            {/* Solid White Button */}
            <div className="relative w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-[0_0_30px_rgba(0,0,0,0.3)] transition-all duration-300 group-hover/play:scale-110 group-hover/play:shadow-[0_0_50px_rgba(34,197,94,0.6)]">
              <Play className="w-8 h-8 text-green-600 fill-green-600 ml-1" />
            </div>
          </div>
        </div>
      )}

      {isLoading && (
        <div className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none bg-black/60 backdrop-blur-sm">
          <div className="w-12 h-12 border-4 border-green-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}
    </div>
  );
}