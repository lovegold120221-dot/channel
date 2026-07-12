import React, { useState, useEffect, useRef } from "react";
import { BroadcastStation } from "../types";
import { Play, Pause, Volume2, VolumeX, ShieldAlert, BadgeInfo, Disc3, Radio, Tv, Maximize, Minimize, Share2, Check } from "lucide-react";
import Hls from "hls.js";

interface AudioPlayerProps {
  station: BroadcastStation | null;
  isPlaying: boolean;
  setIsPlaying: (playing: boolean) => void;
  onAnalyserNode?: (node: AnalyserNode | null) => void;
  isTranslating?: boolean;
  onShare?: () => void;
  isCopied?: boolean;
}

export default function AudioPlayer({ station, isPlaying, setIsPlaying, onAnalyserNode, isTranslating, onShare, isCopied }: AudioPlayerProps) {
  const [volume, setVolume] = useState(0.8);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [videoSize, setVideoSize] = useState({ width: 320, height: 180 });
  const [isResizing, setIsResizing] = useState(false);
  const resizeStartPos = useRef({ x: 0, y: 0, w: 0, h: 0 });

  const startResizing = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);
    resizeStartPos.current = {
      x: e.clientX,
      y: e.clientY,
      w: videoSize.width,
      h: videoSize.height
    };
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      
      const dx = resizeStartPos.current.x - e.clientX;
      const dy = resizeStartPos.current.y - e.clientY;
      
      const newWidth = Math.max(240, Math.min(window.innerWidth * 0.9, resizeStartPos.current.w + dx));
      const newHeight = Math.max(135, Math.min(window.innerHeight * 0.8, resizeStartPos.current.h + dy));
      
      setVideoSize({ width: newWidth, height: newHeight });
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);

  const [loading, setLoading] = useState(false);
  const [streamError, setStreamError] = useState<string | null>(null);

  const mediaRef = useRef<HTMLVideoElement | null>(null);
  useEffect(() => {
    if (mediaRef.current) {
      (window as any).__sharedAudioElement = mediaRef.current;
    }
    return () => {
      if ((window as any).__sharedAudioElement === mediaRef.current) {
        (window as any).__sharedAudioElement = null;
      }
    };
  }, []);
  const hlsRef = useRef<Hls | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);

  const lastUrlRef = useRef<string>("");
  const playPromiseRef = useRef<Promise<void> | null>(null);

  // Initialize Web Audio API on first interaction/play
  const initAudioContext = () => {
    if (!mediaRef.current) return;
    
    // Check if the source is already connected to avoid 'HTMLMediaElement already connected' error
    if (sourceRef.current) return;

    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const context = audioContextRef.current || (window as any).__sharedAudioContext || new AudioContextClass();
      (window as any).__sharedAudioContext = context;
      
      const analyser = context.createAnalyser();
      analyser.fftSize = 256;
      
      let source = (window as any).__sharedSourceNode;
      if (!source) {
        source = context.createMediaElementSource(mediaRef.current);
        (window as any).__sharedSourceNode = source;
      }
      source.connect(analyser);
      analyser.connect(context.destination);

      audioContextRef.current = context;
      analyserRef.current = analyser;
      sourceRef.current = source;

      if (onAnalyserNode) {
        onAnalyserNode(analyser);
      }
    } catch (e) {
      console.warn("Web Audio API not supported or failed to initialize:", e);
    }
  };

  // Synchronize audio/video stream play/pause when station or isPlaying changes
  useEffect(() => {
    if (!mediaRef.current) return;

    if (!station) {
      lastUrlRef.current = "";
      playPromiseRef.current = null;
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
      try {
        mediaRef.current.pause();
        mediaRef.current.removeAttribute("src");
        mediaRef.current.load();
      } catch (e) {}
      setIsPlaying(false);
      setLoading(false);
      setStreamError(null);
      return;
    }

    const targetUrl = station.url_resolved || station.url;
    const proxiedUrl = `/api/proxy-stream?url=${encodeURIComponent(targetUrl)}`;
    const isHls = targetUrl.toLowerCase().includes(".m3u8") || station.url.toLowerCase().includes(".m3u8") || station.type === 'tv';

    let isCancelled = false;

    if (isPlaying) {
      const startPlayback = async () => {
        // Initialize Web Audio pipeline on first play
        initAudioContext();
        
        // Resume AudioContext if suspended
        if (audioContextRef.current?.state === "suspended") {
          await audioContextRef.current.resume();
        }

        // Auto-resume custom Web Audio pipelines to prevent browser-side playback block of media source
        if (typeof window !== "undefined" && typeof (window as any).__resumeMicContext === "function") {
          try {
            await (window as any).__resumeMicContext();
          } catch (e) {
            console.warn("[Audio Setup] Failed to resume Web Audio context before play:", e);
          }
        }

        if (isCancelled || !mediaRef.current) return;

        const currentActiveUrl = isHls ? targetUrl : proxiedUrl;
        const isNewSource = lastUrlRef.current !== currentActiveUrl;
        if (isNewSource) {
          lastUrlRef.current = currentActiveUrl;
          setStreamError(null);
          setLoading(true);

          if (hlsRef.current) {
            hlsRef.current.destroy();
            hlsRef.current = null;
          }

          try {
            mediaRef.current.pause();
          } catch (e) {}

          if (isHls) {
            if (mediaRef.current.canPlayType("application/vnd.apple.mpegurl")) {
              // Safari / Apple native HLS support
              mediaRef.current.src = targetUrl;
              mediaRef.current.load();
            } else if (Hls.isSupported()) {
              // Chrome / Firefox / Opera Hls.js fallback
              const hls = new Hls({
                enableWorker: true,
                lowLatencyMode: true,
                maxBufferSize: 0, 
                maxBufferLength: 1.5,
                liveDurationInfinity: true,
              });
              hlsRef.current = hls;
              
              hls.on(Hls.Events.ERROR, (event, data) => {
                if (data.fatal) {
                  console.warn(`HLS.js encountered fatal error: ${data.details}. Attempting recovery...`);
                  if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
                    console.log("HLS network error. Switching to proxied HLS playlist fallback...");
                    try {
                      hls.destroy();
                      hlsRef.current = null;
                      if (mediaRef.current) {
                        mediaRef.current.src = proxiedUrl;
                        mediaRef.current.play().catch(() => setErrorState());
                      }
                    } catch (err) {
                      setErrorState();
                    }
                  } else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
                    hls.recoverMediaError();
                  } else {
                    setErrorState();
                  }
                }
              });

              hls.loadSource(targetUrl);
              hls.attachMedia(mediaRef.current);
            } else {
              // Absolute fallback using stream proxy
              mediaRef.current.src = proxiedUrl;
              mediaRef.current.load();
            }
          } else {
            // Standard MP3 / AAC / OGG streams
            mediaRef.current.src = proxiedUrl;
            mediaRef.current.load();
          }
        }

        setLoading(true);
        try {
          const playPromise = mediaRef.current.play();
          playPromiseRef.current = playPromise;

          await playPromise;

          if (isCancelled) return;
          if (playPromiseRef.current === playPromise) {
            setLoading(false);
            setStreamError(null);
          }
        } catch (err: any) {
          if (isCancelled) return;
          
          if (err.name === "AbortError" || err.message?.includes("interrupted")) {
            console.log("Audio playback interrupted by a newer state change (expected behavior).");
          } else {
            console.warn("Audio playback failed:", err.message || err);
            setErrorState();
          }
        }
      };

      startPlayback();
    } else {
      setLoading(false);
      playPromiseRef.current = null;
      lastUrlRef.current = ""; // Force reload on next play to bypass stale buffers
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
      try {
        mediaRef.current.pause();
      } catch (e) {}
    }

    return () => {
      isCancelled = true;
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [station, isPlaying]);

  // Synchronize volume sliders with automatic ducking support
  useEffect(() => {
    if (!mediaRef.current) return;
    
    // If translation is active, we duck the volume to 20% of its current setting
    const targetVolume = isTranslating ? volume * 0.2 : volume;
    mediaRef.current.volume = isMuted ? 0 : targetVolume;
  }, [volume, isMuted, isTranslating]);

  const setErrorState = () => {
    setLoading(false);
    setIsPlaying(false);
    setStreamError("Failed to stream broadcast. The radio server might be offline or blocked by browser CORS restrictions.");
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
  };

  return (
    <div className="bg-white dark:bg-slate-900 border-t border-slate-200/50 dark:border-slate-800/50 py-3.5 px-6 flex flex-col md:flex-row gap-4 items-center justify-between shadow-lg relative min-h-[75px]">
      
      {/* Hidden/Floating Media Element (Can handle both Audio and Video) */}
      <div 
        className={station?.type === 'tv' && isPlaying ? `fixed z-[100] rounded-xl overflow-hidden shadow-2xl border-2 border-emerald-500 bg-black flex flex-col group ${isFullscreen ? "inset-4" : "bottom-24 right-4"}` : "hidden"}
        style={isFullscreen ? {} : { width: `${videoSize.width}px`, height: `${videoSize.height}px`, minWidth: "240px", minHeight: "135px" }}
      >
        {/* Resize Handle (Top-Left corner for bottom-right anchored box) */}
        {!isFullscreen && (
          <div 
            onMouseDown={startResizing}
            className="absolute top-0 left-0 w-8 h-8 cursor-nwse-resize z-30 flex items-center justify-center group/resize"
            title="Resize player"
          >
            <div className="w-3 h-3 border-t-2 border-l-2 border-white/30 group-hover/resize:border-emerald-400 transition-colors rounded-tl-sm shadow-sm" />
          </div>
        )}

        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-10 flex gap-2">
          <button 
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-2 bg-black/60 hover:bg-black/80 text-white rounded-lg backdrop-blur-sm border border-white/10 transition-colors"
            title={isFullscreen ? "Minimize" : "Maximize"}
          >
            {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
          </button>
        </div>
        <video
          ref={mediaRef}
          crossOrigin="anonymous"
          className="w-full h-full object-contain bg-black outline-none"
          playsInline
          controls={station?.type === 'tv'}
          onCanPlay={() => {
            setLoading(false);
            setStreamError(null);
          }}
          onWaiting={() => setLoading(true)}
          onError={() => {
            if (!isPlaying || !station || !mediaRef.current) return;
            const error = mediaRef.current.error;
            if (!error || error.code === 1) return;
            const currentSrc = mediaRef.current.src || "";
            if (!currentSrc || currentSrc === window.location.href || !currentSrc.startsWith("http")) return;

            const fallbackProxied = `/api/proxy-stream?url=${encodeURIComponent(station.url)}`;
            if (currentSrc && !currentSrc.includes(encodeURIComponent(station.url))) {
              mediaRef.current.src = fallbackProxied;
              mediaRef.current.play().catch(() => setErrorState());
            } else {
              setErrorState();
            }
          }}
          onEnded={() => setIsPlaying(false)}
        />
      </div>

      {/* Station information branding */}
      <div className="flex items-center gap-3 w-full md:w-1/3">
        {station ? (
          <>
            <div className="relative">
              <div className={`w-11 h-11 rounded-full bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-center justify-center overflow-hidden flex-shrink-0 ${isPlaying ? 'animate-spin [animation-duration:8s]' : ''}`}>
                {station.favicon ? (
                  <img
                    src={station.favicon}
                    alt=""
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      const tgt = e.target as HTMLImageElement;
                      tgt.style.display = 'none';
                    }}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  station.type === 'tv' ? <Tv className="w-5 h-5 text-emerald-500" /> : <Radio className="w-5 h-5 text-emerald-500" />
                )}
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 bg-green-500 w-3.5 h-3.5 rounded-full border-2 border-white dark:border-slate-900 flex items-center justify-center">
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-scale" />
              </div>
            </div>

            <div className="flex-1 overflow-hidden">
              <p className="font-display font-bold text-sm text-slate-800 dark:text-slate-100 truncate flex items-center gap-1.5">
                {station.name}
              </p>
              <p className="text-xs text-slate-400 dark:text-slate-300 truncate capitalize">
                {station.type === 'tv' ? 'Live TV' : (station.tags ? station.tags.split(',').slice(0, 2).join(' • ') : 'Global Channel')}
              </p>
            </div>
            
            {/* Share Link Action */}
            {onShare && (
              <button
                onClick={onShare}
                className={`p-2 rounded-lg border transition-all duration-200 active:scale-95 flex items-center justify-center shadow-sm ${
                  isCopied 
                    ? "bg-emerald-500 border-emerald-500 text-white" 
                    : "bg-white dark:bg-slate-800 border-slate-200/60 dark:border-slate-800/60 text-slate-400 hover:text-emerald-500 dark:hover:text-emerald-400"
                }`}
                title="Share station location coordinates"
              >
                {isCopied ? <Check className="w-3.5 h-3.5" /> : <Share2 className="w-3.5 h-3.5" />}
              </button>
            )}
          </>
        ) : (
          <div className="flex items-center gap-2 text-slate-400 dark:text-slate-400">
            <button
              type="button"
              className="w-11 h-11 rounded-full border border-dashed border-slate-200 dark:border-slate-800 flex items-center justify-center flex-shrink-0"
              aria-label="No station loaded"
            >
              <Disc3 className="w-5 h-5 text-slate-300 dark:text-slate-500" />
            </button>
            <div className="flex flex-col">
              <span className="text-xs font-semibold">Tuning Station empty...</span>
              <span className="text-[10px] text-slate-400 dark:text-slate-400">Select any target location above</span>
            </div>
          </div>
        )}
      </div>

      {/* Media Player Primary Controls */}
      <div className="flex flex-col items-center gap-1 w-full md:w-1/3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            disabled={!station}
            className={`w-10 h-10 rounded-full flex items-center justify-center text-white transition-all shadow ${
              !station
                ? "bg-slate-200 dark:bg-slate-800 cursor-not-allowed text-slate-400"
                : isPlaying
                ? "bg-emerald-600 hover:bg-emerald-700 hover:scale-105"
                : "bg-emerald-500 hover:bg-emerald-600 hover:scale-105"
            }`}
            id="control_play_pause"
          >
            {loading ? (
              <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            ) : isPlaying ? (
              <Pause className="w-5 h-5 fill-current" />
            ) : (
              <Play className="w-5 h-5 fill-current translate-x-[1px]" />
            )}
          </button>
        </div>
      </div>

      {/* Media Player Volume & Actions */}
      <div className="flex items-center justify-end gap-3.5 w-full md:w-1/3">
        <div className="flex items-center gap-2 text-slate-500">
          <button
            onClick={toggleMute}
            className="hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
          >
            {isMuted || volume === 0 ? (
              <VolumeX className="w-4 h-4" />
            ) : (
              <Volume2 className="w-4 h-4" />
            )}
          </button>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={isMuted ? 0 : volume}
            onChange={(e) => {
              setVolume(parseFloat(e.target.value));
              setIsMuted(false);
            }}
            className="w-20 accent-emerald-500 h-1 bg-slate-200 dark:bg-slate-800 rounded-lg cursor-pointer"
          />
        </div>
      </div>
    </div>
  );
}
