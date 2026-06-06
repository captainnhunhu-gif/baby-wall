import React, { useState, useRef, useEffect } from 'react';
import '../styles/animations.css';

export default function BabyNameScreen({ onDone }) {
  const [name, setName] = useState('');
  const [shaking, setShaking] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  function submit() {
    const trimmed = name.trim();
    if (!trimmed) {
      setShaking(true);
      // Remove class so it can re-trigger on repeated attempts
      setTimeout(() => setShaking(false), 400);
      return;
    }
    localStorage.setItem('babyName', trimmed);
    onDone(trimmed);
  }

  function handleKey(e) {
    if (e.key === 'Enter') submit();
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: '#F1E9D0',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        zIndex: 900,
      }}
    >
      {/* Bottle emoji */}
      <div style={{ fontSize: '64px', marginBottom: '24px', lineHeight: 1 }}>🍼</div>

      {/* Heading */}
      <h1
        style={{
          fontFamily: "Georgia, 'Times New Roman', serif",
          fontSize: 'clamp(22px, 5vw, 28px)',
          color: '#328FB1',
          textAlign: 'center',
          margin: '0 0 10px',
          fontWeight: 'bold',
        }}
      >
        Welcome! What's your baby's name?
      </h1>

      {/* Subtitle */}
      <p
        style={{
          fontFamily: 'sans-serif',
          fontSize: '15px',
          color: '#888',
          margin: '0 0 28px',
          textAlign: 'center',
        }}
      >
        We'll personalise the wall just for them 💕
      </p>

      {/* Name input */}
      <input
        ref={inputRef}
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={handleKey}
        placeholder="e.g. Luna, Minh, Oliver"
        className={shaking ? 'input-shake' : ''}
        style={{
          width: 'min(380px, 90vw)',
          fontSize: '20px',
          padding: '14px 18px',
          border: `2px solid ${shaking ? '#e07070' : '#A0D9D4'}`,
          borderRadius: '12px',
          textAlign: 'center',
          background: '#fff',
          outline: 'none',
          fontFamily: "Georgia, 'Times New Roman', serif",
          boxShadow: '0 2px 12px rgba(0,0,0,0.07)',
          transition: 'border-color 0.2s',
        }}
      />

      {/* Submit button */}
      <button
        onClick={submit}
        style={{
          marginTop: '20px',
          background: '#328FB1',
          color: '#fff',
          fontSize: '16px',
          padding: '14px 40px',
          borderRadius: '30px',
          border: 'none',
          cursor: 'pointer',
          fontFamily: "Georgia, 'Times New Roman', serif",
          boxShadow: '0 4px 16px rgba(50,143,177,0.35)',
          transition: 'background 0.18s',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.background = '#2a7a9a'; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = '#328FB1'; }}
      >
        Let's go! 🎉
      </button>
    </div>
  );
}
