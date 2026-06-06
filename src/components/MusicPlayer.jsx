import React, { useState, useRef } from 'react';

export default function MusicPlayer({ music }) {
  const {
    isPlaying, songName, songs, volume, bedtimeVolume, hidden,
    play, pause, next, prev, setVolume, setBedtimeVolume,
    updateSongName, uploadCustomSong, resetToDefaults,
  } = music;

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [resetting, setResetting] = useState(false);
  const fileInputRefs = useRef([]);

  if (hidden) return null;

  async function handleReset() {
    setResetting(true);
    try { await resetToDefaults(); } finally { setResetting(false); }
  }

  return (
    <>
      {/* Backdrop — closes panel on tap outside */}
      {settingsOpen && (
        <div
          onClick={() => setSettingsOpen(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 490,
            background: 'rgba(0,0,0,0.35)',
          }}
        />
      )}

      {/* Slide-up settings panel */}
      <div
        style={{
          position: 'fixed',
          left: 0, right: 0,
          bottom: '56px',
          zIndex: 495,
          background: '#1f6f8b',
          borderRadius: '16px 16px 0 0',
          boxShadow: '0 -4px 24px rgba(0,0,0,0.28)',
          maxHeight: settingsOpen ? '75vh' : '0',
          overflow: 'hidden',
          transition: 'max-height 0.32s cubic-bezier(0.4,0,0.2,1)',
        }}
      >
        <div
          style={{
            padding: '20px 20px 24px',
            overflowY: 'auto',
            maxHeight: '75vh',
          }}
        >
          {/* Panel header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
            <span style={{ color: '#fff', fontFamily: "Georgia, serif", fontSize: '16px', fontWeight: 'bold' }}>
              Music Settings
            </span>
            <button
              onClick={() => setSettingsOpen(false)}
              style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff', borderRadius: '50%', width: '28px', height: '28px', cursor: 'pointer', fontSize: '14px', lineHeight: 1 }}
            >
              ✕
            </button>
          </div>

          {/* Master volume */}
          <SliderSection
            label={`Volume: ${Math.round(volume * 100)}%`}
            value={volume}
            onChange={setVolume}
          />

          {/* Bedtime volume */}
          <SliderSection
            label={`Bedtime volume: ${Math.round(bedtimeVolume * 100)}%`}
            value={bedtimeVolume}
            onChange={setBedtimeVolume}
          />

          {/* Song list */}
          <div style={{ marginBottom: '16px' }}>
            <div style={{ color: 'rgba(255,255,255,0.75)', fontSize: '12px', fontFamily: "Georgia, serif", marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Songs
            </div>
            {songs.map((song, idx) => (
              <SongRow
                key={song.id}
                song={song}
                idx={idx}
                onNameChange={(name) => updateSongName(idx, name)}
                onUpload={(file) => uploadCustomSong(idx, file)}
                inputRef={(el) => (fileInputRefs.current[idx] = el)}
              />
            ))}
          </div>

          {/* Reset button */}
          <button
            onClick={handleReset}
            disabled={resetting}
            style={{
              width: '100%',
              padding: '10px',
              background: 'rgba(255,255,255,0.12)',
              border: '1.5px solid rgba(255,255,255,0.35)',
              borderRadius: '8px',
              color: '#fff',
              fontFamily: "Georgia, serif",
              fontSize: '14px',
              cursor: resetting ? 'not-allowed' : 'pointer',
              opacity: resetting ? 0.6 : 1,
              transition: 'opacity 0.15s',
            }}
          >
            {resetting ? 'Resetting…' : 'Reset to default songs'}
          </button>
        </div>
      </div>

      {/* Fixed bottom player bar */}
      <div
        style={{
          position: 'fixed',
          bottom: 0, left: 0, right: 0,
          height: '56px',
          background: '#328FB1',
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          zIndex: 500,
          boxShadow: '0 -2px 12px rgba(0,0,0,0.18)',
          padding: '0 10px',
        }}
      >
        <PlayerBtn onClick={prev} title="Previous">⏮</PlayerBtn>

        <PlayerBtn onClick={isPlaying ? pause : play} title={isPlaying ? 'Pause' : 'Play'} big>
          {isPlaying ? '⏸' : '▶'}
        </PlayerBtn>

        <PlayerBtn onClick={next} title="Next">⏭</PlayerBtn>

        <span
          style={{
            flex: '1 1 0',
            color: 'rgba(255,255,255,0.92)',
            fontFamily: "Georgia, 'Times New Roman', serif",
            fontSize: 'clamp(11px, 2.4vw, 13px)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            fontStyle: 'italic',
            padding: '0 4px',
          }}
        >
          ♪ {songName}
        </span>

        {/* Volume slider */}
        <input
          type="range"
          min="0"
          max="1"
          step="0.05"
          value={volume}
          onChange={(e) => setVolume(parseFloat(e.target.value))}
          aria-label="Volume"
          title={`Volume: ${Math.round(volume * 100)}%`}
          style={{
            width: 'clamp(60px, 12vw, 100px)',
            accentColor: '#fff',
            cursor: 'pointer',
            flexShrink: 0,
          }}
        />

        {/* Settings button */}
        <PlayerBtn
          onClick={() => setSettingsOpen((v) => !v)}
          title="Music settings"
          style={{ opacity: settingsOpen ? 0.7 : 1 }}
        >
          ⚙️
        </PlayerBtn>
      </div>
    </>
  );
}

/* ── Sub-components ─────────────────────────────────────────────────────── */

function SliderSection({ label, value, onChange }) {
  return (
    <div style={{ marginBottom: '14px' }}>
      <div style={{ color: 'rgba(255,255,255,0.85)', fontSize: '13px', fontFamily: "Georgia, serif", marginBottom: '6px' }}>
        {label}
      </div>
      <input
        type="range"
        min="0"
        max="1"
        step="0.05"
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        style={{ width: '100%', accentColor: '#fff', cursor: 'pointer' }}
      />
    </div>
  );
}

function SongRow({ song, idx, onNameChange, onUpload, inputRef }) {
  const fileRef = useRef(null);

  function handleFile(e) {
    const file = e.target.files[0];
    if (file) onUpload(file);
    e.target.value = '';
  }

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        marginBottom: '10px',
        background: 'rgba(255,255,255,0.08)',
        borderRadius: '8px',
        padding: '8px 10px',
      }}
    >
      <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px', minWidth: '16px', fontFamily: "Georgia, serif" }}>
        {idx + 1}.
      </span>

      <input
        type="text"
        value={song.name}
        onChange={(e) => onNameChange(e.target.value)}
        style={{
          flex: '1 1 0',
          background: 'rgba(255,255,255,0.12)',
          border: '1px solid rgba(255,255,255,0.25)',
          borderRadius: '6px',
          padding: '5px 8px',
          color: '#fff',
          fontFamily: "Georgia, serif",
          fontSize: '13px',
          outline: 'none',
          minWidth: 0,
        }}
        placeholder="Song name"
      />

      {/* Replace MP3 button */}
      <button
        onClick={() => fileRef.current?.click()}
        title="Replace MP3"
        style={{
          background: 'rgba(255,255,255,0.15)',
          border: '1px solid rgba(255,255,255,0.3)',
          borderRadius: '6px',
          color: '#fff',
          fontSize: '12px',
          padding: '5px 8px',
          cursor: 'pointer',
          whiteSpace: 'nowrap',
          fontFamily: "Georgia, serif",
          flexShrink: 0,
        }}
      >
        🎵 Replace
      </button>

      <input
        ref={(el) => { fileRef.current = el; if (inputRef) inputRef(el); }}
        type="file"
        accept=".mp3,audio/mpeg"
        style={{ display: 'none' }}
        onChange={handleFile}
      />
    </div>
  );
}

function PlayerBtn({ onClick, children, big, title, style: extraStyle }) {
  return (
    <button
      onClick={onClick}
      title={title}
      aria-label={title}
      style={{
        background: 'none',
        border: 'none',
        color: '#fff',
        fontSize: big ? '22px' : '18px',
        cursor: 'pointer',
        padding: '4px 6px',
        borderRadius: '6px',
        lineHeight: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'background 0.15s',
        minWidth: big ? '38px' : '32px',
        minHeight: '38px',
        flexShrink: 0,
        ...extraStyle,
      }}
      onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.15)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = 'none'; }}
    >
      {children}
    </button>
  );
}
