import React, { useState, useEffect, useRef, useCallback } from 'react';
import { getBlob } from '../hooks/useIndexedDB';
import '../styles/frames.css';
import '../styles/animations.css';

const PALETTE = ['#328FB1','#F27B77','#F29985','#A0D9D4','#C8A84B','#8B1A1A','#5DCAA5','#FFD700','#FF9F43'];
const CONFETTI_COUNT = 32;

function makeConfetti(baseColor) {
  return Array.from({ length: CONFETTI_COUNT }, (_, i) => {
    // Evenly spread angles with a little jitter
    const angle = (i / CONFETTI_COUNT) * 2 * Math.PI + (Math.random() - 0.5) * 0.4;
    const speed = 55 + Math.random() * 75;
    // Slight gravity: end y is pushed down by 20-50px extra
    const endX = Math.cos(angle) * speed;
    const endY = Math.sin(angle) * speed + 25 + Math.random() * 30;
    const isRect = i % 3 !== 0; // 2/3 are streamers, 1/3 circles
    const color = i % 4 === 0 ? baseColor : PALETTE[i % PALETTE.length];
    const size = isRect
      ? { w: 5 + Math.random() * 4, h: 11 + Math.random() * 6 }
      : { w: 7 + Math.random() * 5, h: 7 + Math.random() * 5 };
    const rotation = (Math.random() - 0.5) * 720; // ±720 deg spin
    const duration = 750 + Math.random() * 300;
    return { id: i, endX, endY, color, isRect, size, rotation, duration };
  });
}

export default function FrameCard({ person, frameClass, posClass, onEdit, isBedtime }) {
  const [photoUrl, setPhotoUrl] = useState(null);
  const [isBouncing, setIsBouncing] = useState(false);
  const [confetti, setConfetti] = useState([]);
  const [toast, setToast] = useState(null);
  const [toastHiding, setToastHiding] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  const toastTimerRef = useRef(null);
  const menuTimerRef = useRef(null);
  const audioRef = useRef(null);

  // Load photo from IndexedDB on mount, fall back to avatarUrl
  useEffect(() => {
    let objectUrl = null;
    getBlob('photos', person.id).then((blob) => {
      if (blob) {
        objectUrl = URL.createObjectURL(blob);
        setPhotoUrl(objectUrl);
      } else if (person.avatarUrl) {
        setPhotoUrl(person.avatarUrl);
      }
    });
    return () => { if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [person.id, person.avatarUrl]);

  // Close menu if person changes
  useEffect(() => { setShowMenu(false); }, [person.id]);

  const playVoice = useCallback(async () => {
    // In bedtime mode, prefer goodnight recording; fall back to regular
    let blob = null;
    if (isBedtime) blob = await getBlob('goodnight-voices', person.id);
    if (!blob)    blob = await getBlob('voices', person.id);
    if (!blob) return;
    if (audioRef.current) {
      audioRef.current.pause();
      URL.revokeObjectURL(audioRef.current._blobUrl);
    }
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    audio._blobUrl = url;
    audioRef.current = audio;
    audio.play().catch(() => {});
    audio.onended = () => URL.revokeObjectURL(url);
  }, [person.id, isBedtime]);

  const showToastFor = useCallback((name, role) => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToastHiding(false);
    setToast({ name, role });
    toastTimerRef.current = setTimeout(() => {
      setToastHiding(true);
      setTimeout(() => setToast(null), 260);
    }, 3000);
  }, []);

  const triggerPlay = useCallback(() => {
    // Bounce
    setIsBouncing(true);
    setTimeout(() => setIsBouncing(false), 360);

    // Confetti burst
    setConfetti(makeConfetti(person.color));
    setTimeout(() => setConfetti([]), 1100);

    // Voice
    playVoice();

    // Toast
    const roles = [person.roleEn, person.roleVi].filter(Boolean).join(' · ');
    const toastName = isBedtime ? `${person.name} 🌙` : person.name;
    const toastRole = isBedtime ? `Goodnight from ${person.name}` : roles;
    showToastFor(toastName, toastRole);
  }, [person, playVoice, showToastFor, isBedtime]);

  const openMenu = useCallback((e) => {
    e.stopPropagation();
    if (menuTimerRef.current) clearTimeout(menuTimerRef.current);
    setShowMenu(true);
    // Auto-dismiss after 3s
    menuTimerRef.current = setTimeout(() => setShowMenu(false), 3000);
  }, []);

  const handlePlay = useCallback((e) => {
    e.stopPropagation();
    setShowMenu(false);
    if (menuTimerRef.current) clearTimeout(menuTimerRef.current);
    triggerPlay();
  }, [triggerPlay]);

  const handleEdit = useCallback((e) => {
    e.stopPropagation();
    setShowMenu(false);
    if (menuTimerRef.current) clearTimeout(menuTimerRef.current);
    onEdit(person);
  }, [onEdit, person]);

  // Close menu when clicking outside
  useEffect(() => {
    if (!showMenu) return;
    const dismiss = () => setShowMenu(false);
    window.addEventListener('click', dismiss, { once: true });
    window.addEventListener('touchend', dismiss, { once: true });
    return () => {
      window.removeEventListener('click', dismiss);
      window.removeEventListener('touchend', dismiss);
    };
  }, [showMenu]);

  const baseRotation = getBaseRotation(posClass);

  return (
    <div
      className={`frame-card ${frameClass} ${posClass} ${isBouncing ? 'bouncing' : ''}`}
      style={{ '--base-transform': `rotate(${baseRotation})`, overflow: 'visible' }}
      onClick={openMenu}
    >
      {/* Amber bedtime glow layer (behind frame content) */}
      <div style={{
        position: 'absolute',
        inset: '-10px',
        borderRadius: 'inherit',
        boxShadow: '0 0 20px rgba(255,180,80,0.4)',
        pointerEvents: 'none',
        opacity: isBedtime ? 1 : 0,
        transition: 'opacity 2s ease',
        zIndex: -1,
      }} />

      {/* Photo */}
      <div className="frame-inner">
        {photoUrl ? (
          <img
            src={photoUrl}
            alt={person.name}
            draggable={false}
            style={{
              filter: isBedtime ? 'sepia(0.3) brightness(0.85)' : 'none',
              transition: 'filter 2s ease',
            }}
          />
        ) : (
          <div className="frame-placeholder" style={{ background: person.color || '#C8A84B' }}>
            👶
          </div>
        )}
      </div>

      {/* Name label */}
      <div className="frame-label">
        <span className="frame-label-name">{person.name}</span>
        {(person.roleEn || person.roleVi) && (
          <span className="frame-label-roles">
            {[person.roleEn, person.roleVi].filter(Boolean).join(' · ')}
          </span>
        )}
      </div>

      {/* Confetti */}
      {confetti.map((p) => (
        <span
          key={p.id}
          className="confetti-piece"
          style={{
            width: `${p.size.w}px`,
            height: `${p.size.h}px`,
            marginLeft: `-${p.size.w / 2}px`,
            marginTop: `-${p.size.h / 2}px`,
            background: p.color,
            borderRadius: p.isRect ? '1px' : '50%',
            '--cx': `${p.endX}px`,
            '--cy': `${p.endY}px`,
            '--cr': `${p.rotation}deg`,
            '--cs': 0.3,
            '--cd': `${p.duration}ms`,
          }}
        />
      ))}

      {/* Single-click action menu */}
      {showMenu && (
        <div className="frame-action-menu" onClick={(e) => e.stopPropagation()}>
          <button className="frame-action-btn play-btn" onClick={handlePlay}>
            ▶ Play
          </button>
          <button className="frame-action-btn edit-btn" onClick={handleEdit}>
            ✏️ Edit
          </button>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className={`frame-toast ${toastHiding ? 'toast-hiding' : ''}`}>
          <span className="toast-name">{toast.name}</span>
          {toast.role && <span className="toast-role">{toast.role}</span>}
        </div>
      )}
    </div>
  );
}

function getBaseRotation(posClass) {
  const map = {
    'frame-pos-1':    '-6deg',
    'frame-pos-2':    '3deg',
    'frame-pos-3':    '-4deg',
    'frame-pos-4':    '7deg',
    'frame-pos-5':    '-3deg',
    'frame-pos-6':    '5deg',
    'frame-pos-7':    '-2deg',
    'frame-pos-baby': '1deg',
  };
  return map[posClass] || '0deg';
}
