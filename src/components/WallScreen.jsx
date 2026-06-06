import React, { useState } from 'react';
import FrameCard from './FrameCard';
import AddMemberModal from './AddMemberModal';
import MusicPlayer from './MusicPlayer';
import '../styles/frames.css';
import '../styles/animations.css';

const FRAME_CLASSES = ['frame-1','frame-2','frame-3','frame-4','frame-5','frame-6','frame-7'];
const POS_CLASSES   = ['frame-pos-1','frame-pos-2','frame-pos-3','frame-pos-4','frame-pos-5','frame-pos-6','frame-pos-7'];
const BURST_COLORS  = ['#328FB1','#F27B77','#F29985','#A0D9D4','#C8A84B','#8B1A1A','#5DCAA5'];

const WALL_BG = {
  backgroundColor: '#f0faf0',
  backgroundImage: [
    'repeating-linear-gradient(0deg,  rgba(104,176,104,0.28) 0px, rgba(104,176,104,0.28) 40px, transparent 40px, transparent 80px)',
    'repeating-linear-gradient(90deg, rgba(104,176,104,0.28) 0px, rgba(104,176,104,0.28) 40px, transparent 40px, transparent 80px)',
  ].join(', '),
};

const STARS = Array.from({ length: 10 }, (_, i) => ({
  id: i,
  top:   `${8  + (i * 8.7)  % 80}%`,
  left:  `${5  + (i * 9.3)  % 88}%`,
  size:  `${3  + (i % 3)}px`,
  dur:   `${2.2 + (i % 4) * 0.7}s`,
  delay: `${(i * 0.45) % 4}s`,
}));

export default function WallScreen({ people, baby, onAddMember, onEditMember, onEditBaby, onDeleteMember, music }) {
  const [editingPerson, setEditingPerson] = useState(null);
  const [addingNew, setAddingNew] = useState(false);
  const [editingBaby, setEditingBaby] = useState(false);

  // Personalised title state
  const [babyName, setBabyName]       = useState(() => localStorage.getItem('babyName') || 'Baby');
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft]   = useState('');

  const { isBedtime, toggleBedtime } = music;

  const isDesktop = window.innerWidth > 900;
  const isTablet  = window.innerWidth >= 768 && window.innerWidth <= 900;
  // mobile = !isDesktop && !isTablet  (< 768px)

  // ── Title editing ─────────────────────────────────────────────────────────
  function startEditTitle() {
    setTitleDraft(babyName);
    setEditingTitle(true);
  }

  function saveTitle() {
    const trimmed = titleDraft.trim() || 'Baby';
    localStorage.setItem('babyName', trimmed);
    setBabyName(trimmed);
    setEditingTitle(false);
  }

  function handleTitleKey(e) {
    if (e.key === 'Enter') saveTitle();
    if (e.key === 'Escape') setEditingTitle(false);
  }

  // ── Member handlers ───────────────────────────────────────────────────────
  function openEdit(person) {
    if (person.id === 'baby') setEditingBaby(true);
    else setEditingPerson(person);
  }

  function handleSavePerson(updated) {
    if (editingPerson) onEditMember(updated);
    else               onAddMember(updated);
    setEditingPerson(null);
    setAddingNew(false);
  }

  function handleSaveBaby(updated) {
    onEditBaby(updated);
    setEditingBaby(false);
  }

  function handleDelete(id) {
    onDeleteMember(id);
    setEditingPerson(null);
  }

  // Shared FrameCard props builder
  const frameCardProps = (person, frameClass, posClass) => ({
    person, frameClass, posClass, onEdit: openEdit, isBedtime,
  });

  return (
    <div className="wall-fade-in" style={{ minHeight: '100vh', ...WALL_BG, position: 'relative', paddingBottom: '80px' }}>

      {/* ── Fixed overlays ─────────────────────────────────────────────── */}
      {/* Top-right buttons */}
      <div style={{ position: 'fixed', top: '16px', right: '16px', zIndex: 600, display: 'flex', gap: '10px' }}>
        <button
          onClick={toggleBedtime}
          title={isBedtime ? 'Turn off bedtime mode' : 'Turn on bedtime mode'}
          style={{
            width: '48px', height: '48px', borderRadius: '50%',
            background: isBedtime ? 'rgba(255,180,80,0.85)' : 'rgba(50,143,177,0.82)',
            color: '#fff', border: 'none', fontSize: '22px', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: isBedtime ? '0 4px 14px rgba(255,140,40,0.5)' : '0 4px 14px rgba(50,143,177,0.4)',
            transition: 'background 1s ease, box-shadow 1s ease',
          }}
        >
          🌙
        </button>
        {people.length < 7 && (
          <button
            onClick={() => setAddingNew(true)}
            title="Add family member"
            style={{
              width: '48px', height: '48px', borderRadius: '50%',
              background: '#5a9e5a', color: '#fff', border: 'none',
              fontSize: '26px', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 14px rgba(90,158,90,0.45)', lineHeight: 1,
            }}
          >
            +
          </button>
        )}
      </div>

      {/* Bedtime overlay */}
      <div
        style={{
          position: 'fixed', inset: 0,
          background: 'rgba(44,24,16,0.55)',
          opacity: isBedtime ? 1 : 0,
          pointerEvents: 'none',
          zIndex: 5,
          transition: 'opacity 2s ease',
        }}
      >
        {STARS.map((s) => (
          <div
            key={s.id}
            className="bedtime-star"
            style={{ top: s.top, left: s.left, width: s.size, height: s.size, '--tw-dur': s.dur, '--tw-delay': s.delay }}
          />
        ))}
      </div>

      {/* Goodnight text */}
      <div
        style={{
          position: 'fixed', top: '72px', left: '50%',
          transform: 'translateX(-50%)',
          color: 'rgba(255,245,220,0.92)',
          fontFamily: "Georgia, 'Times New Roman', serif",
          fontSize: 'clamp(16px, 3vw, 22px)',
          fontStyle: 'italic',
          letterSpacing: '0.04em',
          pointerEvents: 'none',
          zIndex: 6,
          opacity: isBedtime ? 1 : 0,
          transition: 'opacity 2s ease',
          textShadow: '0 2px 12px rgba(0,0,0,0.5)',
          whiteSpace: 'nowrap',
        }}
      >
        Goodnight ✨
      </div>

      {/* ── Wall title ─────────────────────────────────────────────────── */}
      <div
        style={{
          padding: isDesktop ? '20px 24px 8px' : '16px 20px 4px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          position: 'relative',
          zIndex: 4,
        }}
      >
        {editingTitle ? (
          <input
            autoFocus
            value={titleDraft}
            onChange={(e) => setTitleDraft(e.target.value)}
            onBlur={saveTitle}
            onKeyDown={handleTitleKey}
            style={{
              fontFamily: "Georgia, 'Times New Roman', serif",
              fontSize: isDesktop ? '26px' : '20px',
              color: '#328FB1',
              border: '2px solid #A0D9D4',
              borderRadius: '8px',
              padding: '4px 10px',
              outline: 'none',
              background: 'rgba(255,255,255,0.88)',
              width: '220px',
            }}
          />
        ) : (
          <>
            <h1
              style={{
                fontFamily: "Georgia, 'Times New Roman', serif",
                fontSize: isDesktop ? '26px' : '20px',
                color: '#328FB1',
                margin: 0,
                fontWeight: 'bold',
                textShadow: '0 1px 6px rgba(255,255,255,0.8)',
                lineHeight: 1.2,
              }}
            >
              {babyName}'s Family Wall
            </h1>
            <button
              onClick={startEditTitle}
              title="Edit baby's name"
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontSize: '14px',
                color: '#A0D9D4',
                padding: '2px 4px',
                lineHeight: 1,
                flexShrink: 0,
              }}
            >
              ✏️
            </button>
          </>
        )}
      </div>

      {/* ── Desktop: absolute scattered layout ─────────────────────────── */}
      {isDesktop ? (
        <div style={{ position: 'relative', minHeight: 'max(860px, calc(100vh - 80px))' }}>
          <FrameCard key="baby" {...frameCardProps(baby, 'frame-baby', 'frame-pos-baby')} />
          {people.map((person, i) => (
            <FrameCard key={person.id} {...frameCardProps(person, FRAME_CLASSES[i % FRAME_CLASSES.length], POS_CLASSES[i % POS_CLASSES.length])} />
          ))}
          {people.length < 7 && (() => {
            const i = people.length;
            return (
              <EmptySlot
                key={`empty-${i}`}
                frameClass={FRAME_CLASSES[i % FRAME_CLASSES.length]}
                posClass={POS_CLASSES[i % POS_CLASSES.length]}
                onClick={() => setAddingNew(true)}
              />
            );
          })()}
        </div>

      ) : isTablet ? (
        /* ── Tablet: 3-column flex ─────────────────────────────────────── */
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px 24px 80px', gap: '48px' }}>
          <div style={{ position: 'relative' }}>
            <FrameCard key="baby" {...frameCardProps(baby, 'frame-baby', 'frame-pos-baby')} />
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '12px', width: '100%' }}>
            {people.map((person, i) => (
              <div key={person.id} style={{ position: 'relative' }}>
                <FrameCard {...frameCardProps(person, FRAME_CLASSES[i % FRAME_CLASSES.length], POS_CLASSES[i % POS_CLASSES.length])} />
              </div>
            ))}
          </div>
        </div>

      ) : (
        /* ── Mobile: 2-column CSS grid ─────────────────────────────────── */
        <div style={{ padding: '16px 12px 80px' }}>
          {/* Baby frame — centered above grid */}
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px', position: 'relative' }}>
            <FrameCard key="baby" {...frameCardProps(baby, 'frame-baby', 'frame-pos-baby')} />
          </div>
          {/* Family frames grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
            {people.map((person, i) => (
              <div key={person.id} style={{ position: 'relative', paddingBottom: '56px' }}>
                <FrameCard {...frameCardProps(person, FRAME_CLASSES[i % FRAME_CLASSES.length], POS_CLASSES[i % POS_CLASSES.length])} />
              </div>
            ))}
          </div>
        </div>
      )}

      <MusicPlayer music={music} />

      {/* Family member modal */}
      {(addingNew || editingPerson) && (
        <AddMemberModal
          person={editingPerson || { _isNew: true, color: BURST_COLORS[people.length % BURST_COLORS.length] }}
          onSave={handleSavePerson}
          onDelete={handleDelete}
          onCancel={() => { setEditingPerson(null); setAddingNew(false); }}
        />
      )}

      {/* Baby modal — no Delete button */}
      {editingBaby && (
        <AddMemberModal
          person={baby}
          onSave={handleSaveBaby}
          onDelete={() => {}}
          onCancel={() => setEditingBaby(false)}
          hiddeDelete
        />
      )}
    </div>
  );
}

function EmptySlot({ frameClass, posClass, onClick }) {
  return (
    <div
      className={`frame-add-placeholder frame-card ${frameClass} ${posClass}`}
      onClick={onClick}
      style={{ borderRadius: (frameClass === 'frame-1' || frameClass === 'frame-6') ? '50%' : undefined }}
    >
      <span>+</span>
    </div>
  );
}
