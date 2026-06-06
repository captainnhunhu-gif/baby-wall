import { useRef, useState, useEffect, useCallback } from 'react';
import { getBlob, saveBlob, deleteBlob } from './useIndexedDB';

const DEFAULTS = [
  { id: 1, name: 'Twinkle Twinkle Little Star' },
  { id: 2, name: "Brahms' Lullaby" },
  { id: 3, name: 'You Are My Sunshine' },
  { id: 4, name: 'Hush Little Baby' },
  { id: 5, name: 'Mary Had a Little Lamb' },
];

const LS_KEY = 'musicSettings';
const IDB_STORE = 'custom-songs';
const IDB_KEY = (id) => `custom-song-${id}`;

function defaultSrc(id) {
  return `/music/song${id}.mp3`;
}

function loadSettings() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) {
      const p = JSON.parse(raw);
      return {
        index:        typeof p.index        === 'number' ? Math.min(p.index, DEFAULTS.length - 1) : 0,
        volume:       typeof p.volume       === 'number' ? Math.max(0, Math.min(1, p.volume))      : 0.6,
        bedtimeVolume:typeof p.bedtimeVolume=== 'number' ? Math.max(0, Math.min(1, p.bedtimeVolume)):0.35,
        names:        Array.isArray(p.names) && p.names.length === DEFAULTS.length
                        ? p.names
                        : DEFAULTS.map((d) => d.name),
      };
    }
  } catch (_) {}
  return {
    index: 0,
    volume: 0.6,
    bedtimeVolume: 0.35,
    names: DEFAULTS.map((d) => d.name),
  };
}

export function useMusic() {
  // ── Initial settings (read once) ────────────────────────────────────────
  const [init] = useState(loadSettings);

  // ── State ────────────────────────────────────────────────────────────────
  const [songs, setSongs] = useState(() =>
    DEFAULTS.map((d, i) => ({
      id:   d.id,
      name: init.names[i] ?? d.name,
      src:  defaultSrc(d.id),
    }))
  );
  const [currentIndex, setCurrentIndex] = useState(init.index);
  const [isPlaying, setIsPlaying]         = useState(false);
  const [volume, setVolumeState]           = useState(init.volume);
  const [bedtimeVolume, setBedtimeState]   = useState(init.bedtimeVolume);
  const [hidden, setHidden]                = useState(false);
  const [isBedtime, setIsBedtime]          = useState(() => shouldBeBedtime());

  // ── Mutable refs (no re-renders) ─────────────────────────────────────────
  const audioRef        = useRef(null);
  const currentIdxRef   = useRef(init.index);
  const songsRef        = useRef(null);   // kept in sync below
  const isPlayingRef    = useRef(false);
  const blobUrlsRef     = useRef({});     // IDB_KEY(id) → object URL
  const preloadAudioRef = useRef(null);
  const skipCountRef    = useRef(0);
  // Bedtime refs
  const isBedtimeRef       = useRef(false);
  const volumeRef          = useRef(init.volume);
  const bedtimeVolumeRef   = useRef(init.bedtimeVolume);
  const fadeIntervalRef    = useRef(null);
  const bedtimeIntervalRef = useRef(null);

  // Keep refs in sync with state
  songsRef.current      = songs;
  currentIdxRef.current = currentIndex;
  isPlayingRef.current  = isPlaying;
  volumeRef.current         = volume;
  bedtimeVolumeRef.current  = bedtimeVolume;
  isBedtimeRef.current      = isBedtime;

  // ── Persist settings to localStorage ─────────────────────────────────────
  useEffect(() => {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify({
        index: currentIndex,
        volume,
        bedtimeVolume,
        names: songs.map((s) => s.name),
      }));
    } catch (_) {}
  }, [currentIndex, volume, bedtimeVolume, songs]);

  // ── Bedtime helpers ───────────────────────────────────────────────────────
  function isInBedtimeHour() {
    const h = new Date().getHours();
    return h >= 19 && h < 21;
  }

  function readOverride() {
    try { return JSON.parse(localStorage.getItem('bedtimeManualOverride')); } catch { return null; }
  }

  function saveOverride(val) {
    if (val === null) localStorage.removeItem('bedtimeManualOverride');
    else localStorage.setItem('bedtimeManualOverride', JSON.stringify(val));
  }

  function shouldBeBedtime() {
    const override = readOverride();
    if (override === 'on') return true;
    if (override === 'off') {
      if (new Date().getHours() === 0) { saveOverride(null); return isInBedtimeHour(); }
      return false;
    }
    return isInBedtimeHour();
  }

  function fadeVolume(from, to, durationMs) {
    if (fadeIntervalRef.current) clearInterval(fadeIntervalRef.current);
    const audio = audioRef.current;
    if (!audio) return;
    const steps = Math.max(1, Math.round(durationMs / 100));
    const stepMs = durationMs / steps;
    const delta = (to - from) / steps;
    let count = 0;
    fadeIntervalRef.current = setInterval(() => {
      count++;
      const next = Math.max(0, Math.min(1, from + delta * count));
      if (audioRef.current) audioRef.current.volume = next;
      if (count >= steps) {
        clearInterval(fadeIntervalRef.current);
        fadeIntervalRef.current = null;
      }
    }, stepMs);
  }

  // ── Helpers ──────────────────────────────────────────────────────────────
  function setAudioSrc(audio, src) {
    audio.pause();
    audio.src = src;
    audio.currentTime = 0;
  }

  function tryPlay(audio) {
    return audio.play().then(() => {
      setIsPlaying(true);
      skipCountRef.current = 0;
      // Pre-buffer next song
      const nextIdx = (currentIdxRef.current + 1) % songsRef.current.length;
      const nextSrc = songsRef.current[nextIdx]?.src;
      if (nextSrc) {
        if (!preloadAudioRef.current) preloadAudioRef.current = new Audio();
        preloadAudioRef.current.preload = 'auto';
        preloadAudioRef.current.src = nextSrc;
      }
    });
  }

  // ── Mount: create Audio, wire events, load custom songs ──────────────────
  useEffect(() => {
    const audio = new Audio();
    audio.volume = init.volume;
    audio.preload = 'auto';
    audioRef.current = audio;

    // Auto-advance when song ends
    audio.addEventListener('ended', () => {
      const nextIdx = (currentIdxRef.current + 1) % songsRef.current.length;
      const nextSrc = songsRef.current[nextIdx]?.src;
      setAudioSrc(audio, nextSrc);
      currentIdxRef.current = nextIdx;
      setCurrentIndex(nextIdx);
      tryPlay(audio).catch(() => setIsPlaying(false));
    });

    // Skip to next on error; hide player if everything fails
    audio.addEventListener('error', () => {
      console.error('[useMusic] failed to load:', audio.src);
      skipCountRef.current++;
      if (skipCountRef.current >= DEFAULTS.length) {
        setHidden(true);
        return;
      }
      const nextIdx = (currentIdxRef.current + 1) % songsRef.current.length;
      const nextSrc = songsRef.current[nextIdx]?.src;
      setAudioSrc(audio, nextSrc);
      currentIdxRef.current = nextIdx;
      setCurrentIndex(nextIdx);
      if (isPlayingRef.current) {
        tryPlay(audio).catch(() => setIsPlaying(false));
      }
    });

    // Pre-buffer next song 5 s before current ends
    audio.addEventListener('timeupdate', () => {
      if (audio.duration && audio.duration - audio.currentTime < 5) {
        const nextIdx = (currentIdxRef.current + 1) % songsRef.current.length;
        const nextSrc = songsRef.current[nextIdx]?.src;
        if (nextSrc) {
          if (!preloadAudioRef.current) preloadAudioRef.current = new Audio();
          if (preloadAudioRef.current.src !== nextSrc) {
            preloadAudioRef.current.preload = 'auto';
            preloadAudioRef.current.src = nextSrc;
          }
        }
      }
    });

    // Set initial src (no play — waits for user gesture via play())
    audio.src = songsRef.current[currentIdxRef.current]?.src || defaultSrc(1);

    // Load any custom songs stored in IndexedDB
    const loadCustom = async () => {
      const overrides = {}; // id → blobUrl
      await Promise.all(
        DEFAULTS.map(async (d) => {
          try {
            const blob = await getBlob(IDB_STORE, IDB_KEY(d.id));
            if (blob) {
              const url = URL.createObjectURL(blob);
              blobUrlsRef.current[IDB_KEY(d.id)] = url;
              overrides[d.id] = url;
            }
          } catch (_) {}
        })
      );
      if (Object.keys(overrides).length === 0) return;
      setSongs((prev) => prev.map((s) => overrides[s.id] ? { ...s, src: overrides[s.id] } : s));
      // Update audio element if current song has a custom version
      const curId = DEFAULTS[currentIdxRef.current]?.id;
      if (curId && overrides[curId]) {
        audio.src = overrides[curId];
      }
    };
    loadCustom();

    return () => {
      audio.pause();
      audio.src = '';
      if (preloadAudioRef.current) { preloadAudioRef.current.src = ''; }
      // eslint-disable-next-line react-hooks/exhaustive-deps
      Object.values(blobUrlsRef.current).forEach((u) => { try { URL.revokeObjectURL(u); } catch (_) {} });
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Public API ────────────────────────────────────────────────────────────

  const play = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    // Re-attach src if it was lost
    if (!audio.src || audio.src === window.location.href) {
      audio.src = songsRef.current[currentIdxRef.current]?.src || defaultSrc(1);
    }
    tryPlay(audio).catch((e) => console.error('[useMusic] play():', e));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const pause = useCallback(() => {
    audioRef.current?.pause();
    setIsPlaying(false);
  }, []);

  const next = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const nextIdx = (currentIdxRef.current + 1) % songsRef.current.length;
    setAudioSrc(audio, songsRef.current[nextIdx].src);
    currentIdxRef.current = nextIdx;
    setCurrentIndex(nextIdx);
    if (isPlayingRef.current) tryPlay(audio).catch(() => setIsPlaying(false));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const prev = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const prevIdx = (currentIdxRef.current - 1 + songsRef.current.length) % songsRef.current.length;
    setAudioSrc(audio, songsRef.current[prevIdx].src);
    currentIdxRef.current = prevIdx;
    setCurrentIndex(prevIdx);
    if (isPlayingRef.current) tryPlay(audio).catch(() => setIsPlaying(false));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const setVolume = useCallback((v) => {
    const clamped = Math.max(0, Math.min(1, v));
    // In bedtime mode don't disturb the faded audio level; just store for when we exit
    if (!isBedtimeRef.current && audioRef.current) audioRef.current.volume = clamped;
    setVolumeState(clamped);
  }, []);

  const setBedtimeVolume = useCallback((v) => {
    const clamped = Math.max(0, Math.min(1, v));
    if (isBedtimeRef.current && audioRef.current) audioRef.current.volume = clamped;
    setBedtimeState(clamped);
  }, []);

  const updateSongName = useCallback((idx, name) => {
    setSongs((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], name };
      return next;
    });
  }, []);

  const uploadCustomSong = useCallback(async (idx, file) => {
    const songId = DEFAULTS[idx]?.id;
    if (!songId) return;
    const key = IDB_KEY(songId);

    // Revoke previous blob URL for this slot
    if (blobUrlsRef.current[key]) {
      URL.revokeObjectURL(blobUrlsRef.current[key]);
    }

    try {
      await saveBlob(IDB_STORE, key, file);
    } catch (e) {
      console.error('[useMusic] IDB save failed:', e);
    }

    const url = URL.createObjectURL(file);
    blobUrlsRef.current[key] = url;

    // Derive display name from file name
    const name = file.name
      ? file.name.replace(/\.mp3$/i, '').replace(/[-_]+/g, ' ').trim()
      : songsRef.current[idx]?.name;

    setSongs((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], name, src: url };
      return next;
    });

    // If this is the currently loaded song, hot-swap it
    const audio = audioRef.current;
    if (audio && idx === currentIdxRef.current) {
      const was = isPlayingRef.current;
      setAudioSrc(audio, url);
      if (was) tryPlay(audio).catch(() => setIsPlaying(false));
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const resetToDefaults = useCallback(async () => {
    // Remove all custom songs from IndexedDB and revoke blob URLs
    await Promise.all(
      DEFAULTS.map(async (d) => {
        const key = IDB_KEY(d.id);
        try { await deleteBlob(IDB_STORE, key); } catch (_) {}
        if (blobUrlsRef.current[key]) {
          URL.revokeObjectURL(blobUrlsRef.current[key]);
          delete blobUrlsRef.current[key];
        }
      })
    );

    const defaultSongs = DEFAULTS.map((d, i) => ({
      id:   d.id,
      name: d.name,
      src:  defaultSrc(d.id),
    }));
    setSongs(defaultSongs);

    // Reload current song from default path
    const audio = audioRef.current;
    if (audio) {
      const was = isPlayingRef.current;
      const src = defaultSrc(DEFAULTS[currentIdxRef.current].id);
      setAudioSrc(audio, src);
      if (was) tryPlay(audio).catch(() => setIsPlaying(false));
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const enterBedtime = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    // Switch to Brahms Lullaby (index 1) if not already there
    if (currentIdxRef.current !== 1) {
      setAudioSrc(audio, songsRef.current[1]?.src || defaultSrc(2));
      currentIdxRef.current = 1;
      setCurrentIndex(1);
      if (isPlayingRef.current) tryPlay(audio).catch(() => setIsPlaying(false));
    }
    // Slow tempo
    audio.playbackRate = 0.77;
    // Fade volume to bedtime level
    fadeVolume(audio.volume, bedtimeVolumeRef.current, 3000);
    setIsBedtime(true);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const exitBedtime = useCallback(() => {
    const audio = audioRef.current;
    if (audio) {
      audio.playbackRate = 1.0;
      fadeVolume(audio.volume, volumeRef.current, 3000);
    }
    setIsBedtime(false);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleBedtime = useCallback(() => {
    if (isBedtimeRef.current) {
      // Turning OFF — if we're in bedtime hours, suppress auto for the rest of the night
      if (isInBedtimeHour()) saveOverride('off');
      else saveOverride(null);
      exitBedtime();
    } else {
      // Turning ON manually
      saveOverride('on');
      enterBedtime();
    }
  }, [enterBedtime, exitBedtime]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto bedtime interval check
  useEffect(() => {
    const tick = () => {
      const should = shouldBeBedtime();
      if (should && !isBedtimeRef.current) enterBedtime();
      else if (!should && isBedtimeRef.current) {
        // Only auto-exit if there's no 'on' manual override
        const override = readOverride();
        if (override !== 'on') exitBedtime();
      }
    };
    // Initial check (audio might not be loaded yet — enterBedtime guards this)
    tick();
    bedtimeIntervalRef.current = setInterval(tick, 60000);
    return () => {
      clearInterval(bedtimeIntervalRef.current);
      if (fadeIntervalRef.current) clearInterval(fadeIntervalRef.current);
    };
  }, [enterBedtime, exitBedtime]); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    // Playback state
    isPlaying,
    currentSongIndex: currentIndex,
    currentSongName:  songs[currentIndex]?.name ?? '',
    songs,
    volume,
    bedtimeVolume,
    hidden,
    // Controls
    play,
    pause,
    next,
    prev,
    setVolume,
    setBedtimeVolume,
    // Settings
    updateSongName,
    uploadCustomSong,
    resetToDefaults,
    // Bedtime mode
    isBedtime,
    toggleBedtime,
    // Legacy aliases used elsewhere in the app
    songName:    songs[currentIndex]?.name ?? '',
    currentSong: currentIndex,
  };
}
