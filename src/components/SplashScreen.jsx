import React from 'react';
import '../styles/animations.css';

const STARS = [
  { top: '12%', left: '8%',   size: '32px', color: '#C8A84B', dur: '3.2s', delay: '0s'   },
  { top: '18%', right: '10%', size: '24px', color: '#F27B77', dur: '2.8s', delay: '0.5s' },
  { top: '70%', left: '6%',   size: '20px', color: '#A0D9D4', dur: '3.5s', delay: '1s'   },
  { top: '65%', right: '8%',  size: '28px', color: '#F29985', dur: '2.6s', delay: '0.3s' },
  { top: '40%', left: '3%',   size: '18px', color: '#5DCAA5', dur: '3.8s', delay: '0.8s' },
  { top: '35%', right: '4%',  size: '22px', color: '#C8A84B', dur: '3.0s', delay: '1.2s' },
  { top: '85%', left: '30%',  size: '16px', color: '#F27B77', dur: '2.5s', delay: '0.6s' },
  { top: '80%', right: '28%', size: '20px', color: '#328FB1', dur: '3.3s', delay: '0.2s' },
];

export default function SplashScreen({ music, onStart }) {
  function handleTap() {
    music.play();
    onStart();
  }

  return (
    <div
      onClick={handleTap}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'radial-gradient(ellipse at 50% 40%, #F8F0DC 0%, #EDE0BE 50%, #DDD0A8 100%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        overflow: 'hidden',
      }}
    >
      {/* Floating decorations */}
      {STARS.map((s, i) => (
        <span
          key={i}
          className="splash-star"
          style={{
            top: s.top,
            left: s.left,
            right: s.right,
            '--size': s.size,
            '--color': s.color,
            '--dur': s.dur,
            '--delay': s.delay,
          }}
        >
          ✿
        </span>
      ))}

      {/* Main content */}
      <div
        style={{
          textAlign: 'center',
          padding: '0 24px',
          zIndex: 1,
        }}
      >
        <div style={{ fontSize: '64px', marginBottom: '8px', lineHeight: 1 }}>🧸</div>
        <h1
          style={{
            fontFamily: "Georgia, 'Times New Roman', serif",
            fontSize: 'clamp(28px, 7vw, 52px)',
            fontWeight: 'bold',
            color: '#3D2B1F',
            marginBottom: '12px',
            letterSpacing: '0.02em',
            lineHeight: 1.2,
            textShadow: '0 2px 8px rgba(200,168,75,0.3)',
          }}
        >
          Baby's Family Wall
        </h1>
        <p
          className="pulse-text"
          style={{
            fontFamily: "Georgia, 'Times New Roman', serif",
            fontSize: 'clamp(16px, 4vw, 22px)',
            color: '#8B6914',
            fontStyle: 'italic',
            letterSpacing: '0.08em',
          }}
        >
          tap to begin
        </p>
      </div>

      {/* Bottom decoration */}
      <div
        style={{
          position: 'absolute',
          bottom: '32px',
          fontSize: '28px',
          opacity: 0.4,
          letterSpacing: '12px',
        }}
      >
        ✿ ✿ ✿
      </div>
    </div>
  );
}
