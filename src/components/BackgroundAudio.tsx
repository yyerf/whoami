import React, { useEffect, useRef, useState } from 'react';

// BackgroundAudio (autoplay attempt + single Pause/Play control)
// Place file at /public/audio/bg-music.mp3
// Professional minimal UI: one small toggle button.
// Autoplay: tries immediately; if blocked (no user gesture yet), shows Play button.
// Stores paused state so if user pauses we respect it next visit.

const LS_KEY_PAUSED = 'bgAudioPaused';

const BackgroundAudio: React.FC = () => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [ready, setReady] = useState(false);
  const [playing, setPlaying] = useState<boolean>(() => {
    try { return localStorage.getItem(LS_KEY_PAUSED) !== '1'; } catch { return true; }
  });
  const [autoplayBlocked, setAutoplayBlocked] = useState(false);

  useEffect(() => {
    const el = new Audio('/audio/bg-music.mp3');
    el.loop = true;
    el.preload = 'auto';
    el.volume = 0.45; // fixed subtle volume
    audioRef.current = el;
    const canplay = () => setReady(true);
    el.addEventListener('canplay', canplay);
    return () => {
      el.removeEventListener('canplay', canplay);
      el.pause();
    };
  }, []);

  // Attempt autoplay on mount & when audio ready
  useEffect(() => {
    const el = audioRef.current;
    if (!el || !ready) return;
    if (!playing) {
      el.pause();
      return;
    }
    el.play().then(() => {
      setAutoplayBlocked(false);
    }).catch(() => {
      // Autoplay blocked (no gesture) — show Play button
      setAutoplayBlocked(true);
      setPlaying(false);
    });
  }, [ready, playing]);

  const toggle = () => {
    const el = audioRef.current;
    if (!el) return;
    if (playing) {
      el.pause();
      setPlaying(false);
      try { localStorage.setItem(LS_KEY_PAUSED, '1'); } catch {}
    } else {
      el.play().then(() => {
        setPlaying(true);
        setAutoplayBlocked(false);
        try { localStorage.setItem(LS_KEY_PAUSED, '0'); } catch {}
      }).catch(() => {
        // Still blocked — keep state
        setAutoplayBlocked(true);
      });
    }
  };

  const label = !ready ? 'Loading...' : (playing ? 'Pause BGM' : 'Play BGM');

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={!ready}
      className={`mt-1 text-[11px] sm:text-xs px-2.5 py-1.5 rounded-md border font-medium tracking-wide transition shadow-sm
        ${playing ? 'bg-primary/15 border-primary/40 text-primary hover:bg-primary/25' : 'bg-background/60 border-border text-muted-foreground hover:text-foreground hover:border-primary/40'}`}
      aria-pressed={playing}
      aria-label={label}
      title={autoplayBlocked ? 'Click to start audio' : label}
    >{playing ? '⏸ BGM' : '▶ BGM'}</button>
  );
};

export default BackgroundAudio;
