"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import styles from "./AudioProvider.module.css";

/** Source: https://www.youtube.com/watch?v=ldjZKkcu5_k */
const YOUTUBE_VIDEO_ID = "ldjZKkcu5_k";

const STORAGE_KEYS = {
  muted: "ducksite:bg-music-muted",
  volume: "ducksite:bg-music-volume",
};

const AudioContext = createContext(null);

export function useAudio() {
  const ctx = useContext(AudioContext);
  if (!ctx) {
    throw new Error("useAudio must be used within AudioProvider");
  }
  return ctx;
}

function queueYoutubeReady(fn) {
  const prev = window.onYouTubeIframeAPIReady;
  window.onYouTubeIframeAPIReady = function youtubeReady() {
    try {
      prev?.();
    } catch {
      /* ignore */
    }
    fn();
  };
}

function MusicControls() {
  const {
    playing,
    muted,
    volume,
    hydrated,
    musicExpanded,
    setMusicExpanded,
    togglePlay,
    toggleMute,
    setVolume,
  } = useAudio();

  if (!hydrated) {
    return null;
  }

  const volPercent = Math.round(volume * 100);

  return (
    <div className={styles.musicRoot}>
      {!musicExpanded ? (
        <button
          type="button"
          className={styles.fab}
          onClick={() => setMusicExpanded(true)}
          aria-label="Open background music"
          title="Music"
        >
          🎵
        </button>
      ) : null}

      {musicExpanded ? (
        <aside className={styles.panel} aria-label="Background music controls">
          <div className={styles.panelHeader}>
            <span className={styles.label}>Background music</span>
            <button
              type="button"
              className={styles.closeBtn}
              onClick={() => setMusicExpanded(false)}
              aria-label="Close music panel"
            >
              ×
            </button>
          </div>
          <div className={styles.row}>
            <button type="button" className={styles.playBtn} onClick={togglePlay}>
              {playing ? "Pause" : "Play"}
            </button>
            <button
              type="button"
              className={styles.iconBtn}
              onClick={toggleMute}
              aria-label={muted ? "Unmute" : "Mute"}
              title={muted ? "Unmute" : "Mute"}
            >
              {muted ? "🔇" : "🔊"}
            </button>
          </div>
          <div className={styles.volumeLabel}>
            <span>Volume</span>
            <span>{muted ? "—" : `${volPercent}%`}</span>
          </div>
          <input
            className={styles.volume}
            type="range"
            min={0}
            max={100}
            value={volPercent}
            disabled={muted}
            aria-label="Music volume"
            onChange={(e) => setVolume(Number(e.target.value) / 100)}
          />
          <p className={styles.hint}>
            Audio streams from YouTube in the background (no video shown).{" "}
            <a
              href="https://www.youtube.com/watch?v=ldjZKkcu5_k"
              target="_blank"
              rel="noopener noreferrer"
            >
              Open on YouTube
            </a>{" "}
            if you want the video. Tap Play — autoplay with sound is blocked until then.
          </p>
        </aside>
      ) : null}
    </div>
  );
}

export default function AudioProvider({ children }) {
  const [playing, setPlaying] = useState(false);
  const [muted, setMutedState] = useState(false);
  const [volume, setVolumeState] = useState(0.65);
  const [hydrated, setHydrated] = useState(false);
  const [musicExpanded, setMusicExpanded] = useState(false);

  const ytPlayerRef = useRef(null);
  const volumeRef = useRef(volume);
  const mutedRef = useRef(muted);

  useEffect(() => {
    volumeRef.current = volume;
  }, [volume]);

  useEffect(() => {
    mutedRef.current = muted;
  }, [muted]);

  useEffect(() => {
    try {
      const rawVol = localStorage.getItem(STORAGE_KEYS.volume);
      const rawMuted = localStorage.getItem(STORAGE_KEYS.muted);
      if (rawVol != null) {
        const n = Number(rawVol);
        if (!Number.isNaN(n) && n >= 0 && n <= 1) {
          setVolumeState(n);
        }
      }
      if (rawMuted === "true" || rawMuted === "false") {
        setMutedState(rawMuted === "true");
      }
    } catch {
      /* ignore */
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated || typeof window === "undefined") return;

    let cancelled = false;

    const shell = document.createElement("div");
    shell.className = styles.ytShell;
    shell.setAttribute("aria-hidden", "true");
    document.body.appendChild(shell);

    const host = document.createElement("div");
    host.style.width = "100%";
    host.style.height = "100%";
    shell.appendChild(host);

    function applyVolumeAndMute(player) {
      if (!player || typeof player.setVolume !== "function") return;
      try {
        player.setVolume(Math.round(volumeRef.current * 100));
        if (mutedRef.current) player.mute();
        else player.unMute();
      } catch {
        /* ignore */
      }
    }

    function createPlayer() {
      if (cancelled || ytPlayerRef.current) return;
      if (!window.YT?.Player) return;

      const player = new window.YT.Player(host, {
        videoId: YOUTUBE_VIDEO_ID,
        width: "100%",
        height: "100%",
        playerVars: {
          origin: window.location.origin,
          enablejsapi: 1,
          autoplay: 0,
          controls: 0,
          rel: 0,
          modestbranding: 1,
          playsinline: 1,
          loop: 1,
          playlist: YOUTUBE_VIDEO_ID,
        },
        events: {
          onReady: (e) => {
            ytPlayerRef.current = e.target;
            applyVolumeAndMute(e.target);
          },
          onStateChange: (e) => {
            const YT = window.YT;
            if (!YT) return;
            if (e.data === YT.PlayerState.PLAYING) setPlaying(true);
            else if (
              e.data === YT.PlayerState.PAUSED ||
              e.data === YT.PlayerState.ENDED ||
              e.data === YT.PlayerState.CUED
            ) {
              setPlaying(false);
            }
          },
        },
      });
      ytPlayerRef.current = player;
    }

    function boot() {
      if (cancelled) return;

      if (window.YT && window.YT.Player) {
        createPlayer();
        return;
      }

      queueYoutubeReady(() => {
        if (!cancelled) createPlayer();
      });

      if (!document.querySelector('script[src="https://www.youtube.com/iframe_api"]')) {
        const tag = document.createElement("script");
        tag.src = "https://www.youtube.com/iframe_api";
        tag.async = true;
        document.head.appendChild(tag);
      }
    }

    const t = window.requestAnimationFrame(() => boot());

    return () => {
      cancelled = true;
      window.cancelAnimationFrame(t);
      try {
        ytPlayerRef.current?.destroy?.();
      } catch {
        /* ignore */
      }
      ytPlayerRef.current = null;
      shell.remove();
    };
  }, [hydrated]);

  useEffect(() => {
    const p = ytPlayerRef.current;
    if (!p || typeof p.setVolume !== "function") return;
    try {
      p.setVolume(Math.round(volume * 100));
    } catch {
      /* ignore */
    }
  }, [volume]);

  useEffect(() => {
    const p = ytPlayerRef.current;
    if (!p) return;
    try {
      if (muted) p.mute();
      else p.unMute();
    } catch {
      /* ignore */
    }
  }, [muted]);

  const play = useCallback(() => {
    try {
      ytPlayerRef.current?.playVideo?.();
    } catch {
      /* ignore */
    }
  }, []);

  const pause = useCallback(() => {
    try {
      ytPlayerRef.current?.pauseVideo?.();
    } catch {
      /* ignore */
    }
  }, []);

  const togglePlay = useCallback(() => {
    const YT = window.YT;
    const p = ytPlayerRef.current;
    if (!p || !YT) {
      play();
      return;
    }
    try {
      const state = p.getPlayerState?.();
      if (state === YT.PlayerState.PLAYING) pause();
      else play();
    } catch {
      play();
    }
  }, [play, pause]);

  const setMuted = useCallback((next) => {
    setMutedState(next);
    try {
      localStorage.setItem(STORAGE_KEYS.muted, String(next));
    } catch {
      /* ignore */
    }
  }, []);

  const toggleMute = useCallback(() => {
    setMuted(!muted);
  }, [muted, setMuted]);

  const setVolume = useCallback((next) => {
    const clamped = Math.max(0, Math.min(1, next));
    setVolumeState(clamped);
    try {
      localStorage.setItem(STORAGE_KEYS.volume, String(clamped));
    } catch {
      /* ignore */
    }
  }, []);

  const value = useMemo(
    () => ({
      playing,
      muted,
      volume,
      hydrated,
      musicExpanded,
      setMusicExpanded,
      play,
      pause,
      togglePlay,
      setMuted,
      toggleMute,
      setVolume,
    }),
    [
      playing,
      muted,
      volume,
      hydrated,
      musicExpanded,
      setMusicExpanded,
      play,
      pause,
      togglePlay,
      setMuted,
      toggleMute,
      setVolume,
    ]
  );

  return (
    <AudioContext.Provider value={value}>
      {children}
      <MusicControls />
    </AudioContext.Provider>
  );
}
