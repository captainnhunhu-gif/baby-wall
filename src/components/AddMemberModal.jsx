import React, { useState, useRef, useEffect, useCallback } from 'react';
import heic2any from 'heic2any';
import { saveBlob, getBlob, deleteBlob } from '../hooks/useIndexedDB';

const BURST_COLORS = ['#328FB1','#F27B77','#F29985','#A0D9D4','#C8A84B','#8B1A1A','#5DCAA5'];

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

async function processImage(file) {
  let source = file;

  // Detect HEIC/HEIF by MIME type OR extension (iPhone often sends no MIME type)
  const mime = (file.type || '').toLowerCase();
  const name = (file.name || '').toLowerCase();
  const isHeic = mime.includes('heic') || mime.includes('heif') ||
                 name.endsWith('.heic') || name.endsWith('.heif');

  if (isHeic) {
    try {
      const result = await heic2any({ blob: file, toType: 'image/jpeg', quality: 0.85 });
      source = Array.isArray(result) ? result[0] : result;
    } catch (e) {
      throw new Error('HEIC conversion failed. Try saving the photo as JPEG first.');
    }
  }

  // Resize on canvas to max 800×800
  return new Promise((resolve, reject) => {
    const img = new Image();
    // crossOrigin needed for some browsers when drawing to canvas
    img.crossOrigin = 'anonymous';

    let objUrl = null;
    try {
      objUrl = URL.createObjectURL(source);
    } catch (e) {
      reject(new Error('Could not read the image file.'));
      return;
    }

    img.onload = () => {
      URL.revokeObjectURL(objUrl);
      const MAX = 800;
      let { width, height } = img;
      if (width === 0 || height === 0) {
        reject(new Error('Image has zero dimensions.'));
        return;
      }
      if (width > MAX || height > MAX) {
        if (width > height) {
          height = Math.round((height / width) * MAX);
          width = MAX;
        } else {
          width = Math.round((width / height) * MAX);
          height = MAX;
        }
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob);
          else reject(new Error('Canvas export failed. Try a different image.'));
        },
        'image/jpeg',
        0.85,
      );
    };
    img.onerror = () => {
      if (objUrl) URL.revokeObjectURL(objUrl);
      reject(new Error('Could not load the image. Try a JPEG or PNG.'));
    };
    img.src = objUrl;
  });
}

export default function AddMemberModal({ person, onSave, onDelete, onCancel, hiddeDelete }) {
  const isEditing = Boolean(person?.id && !person._isNew);

  const [name, setName] = useState(person?.name || '');
  const [roleEn, setRoleEn] = useState(person?.roleEn || '');
  const [roleVi, setRoleVi] = useState(person?.roleVi || '');
  const [color, setColor] = useState(person?.color || BURST_COLORS[0]);
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState(null);
  const [photoBlob, setPhotoBlob] = useState(null);
  const [voiceBlob, setVoiceBlob] = useState(null);
  const [voiceReady, setVoiceReady] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [goodnightBlob, setGoodnightBlob] = useState(null);
  const [goodnightReady, setGoodnightReady] = useState(false);
  const [isRecordingGoodnight, setIsRecordingGoodnight] = useState(false);
  const [isProcessingPhoto, setIsProcessingPhoto] = useState(false);
  const [error, setError] = useState('');

  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const streamRef = useRef(null);
  const gnMediaRecorderRef = useRef(null);
  const gnChunksRef = useRef([]);
  const gnStreamRef = useRef(null);

  // Load existing photo/voice for editing
  useEffect(() => {
    if (!isEditing) return;
    getBlob('photos', person.id).then((blob) => {
      if (blob) {
        const url = URL.createObjectURL(blob);
        setPhotoPreviewUrl(url);
      } else if (person.avatarUrl) {
        setPhotoPreviewUrl(person.avatarUrl);
      }
    });
    getBlob('voices', person.id).then((blob) => {
      if (blob) setVoiceReady(true);
    });
    getBlob('goodnight-voices', person.id).then((blob) => {
      if (blob) setGoodnightReady(true);
    });
    return () => {
      if (photoPreviewUrl && photoPreviewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(photoPreviewUrl);
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handlePhotoFile = useCallback(async (file) => {
    if (!file) return;
    setIsProcessingPhoto(true);
    setError('');
    try {
      const blob = await processImage(file);
      setPhotoBlob(blob);
      const url = URL.createObjectURL(blob);
      setPhotoPreviewUrl((prev) => {
        if (prev && prev.startsWith('blob:')) URL.revokeObjectURL(prev);
        return url;
      });
    } catch (e) {
      setError(e.message || 'Could not process photo. Please try another file.');
    } finally {
      setIsProcessingPhoto(false);
    }
  }, []);

  async function startRecording() {
    setError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mr = new MediaRecorder(stream);
      mediaRecorderRef.current = mr;
      chunksRef.current = [];
      mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        setVoiceBlob(blob);
        setVoiceReady(true);
        stream.getTracks().forEach((t) => t.stop());
      };
      mr.start();
      setIsRecording(true);
    } catch (e) {
      setError('Microphone access denied.');
    }
  }

  function stopRecording() {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
  }

  async function startGoodnightRecording() {
    setError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      gnStreamRef.current = stream;
      const mr = new MediaRecorder(stream);
      gnMediaRecorderRef.current = mr;
      gnChunksRef.current = [];
      mr.ondataavailable = (e) => { if (e.data.size > 0) gnChunksRef.current.push(e.data); };
      mr.onstop = () => {
        const blob = new Blob(gnChunksRef.current, { type: 'audio/webm' });
        setGoodnightBlob(blob);
        setGoodnightReady(true);
        stream.getTracks().forEach((t) => t.stop());
      };
      mr.start();
      setIsRecordingGoodnight(true);
    } catch (_) { setError('Microphone access denied.'); }
  }

  function stopGoodnightRecording() {
    gnMediaRecorderRef.current?.stop();
    setIsRecordingGoodnight(false);
  }

  async function handleSave() {
    if (!name.trim()) { setError('Name is required.'); return; }
    setError('');

    const id = isEditing ? person.id : generateId();
    const updated = {
      id,
      name: name.trim(),
      roleEn: roleEn.trim(),
      roleVi: roleVi.trim(),
      color,
    };

    // Save blobs to IndexedDB
    if (photoBlob)     await saveBlob('photos', id, photoBlob);
    if (voiceBlob)     await saveBlob('voices', id, voiceBlob);
    if (goodnightBlob) await saveBlob('goodnight-voices', id, goodnightBlob);

    onSave(updated);
  }

  async function handleDelete() {
    if (!person?.id) return;
    await deleteBlob('photos', person.id);
    await deleteBlob('voices', person.id);
    await deleteBlob('goodnight-voices', person.id);
    onDelete(person.id);
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.55)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 800,
        padding: '16px',
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}
    >
      <div
        style={{
          background: '#FFFDF7',
          borderRadius: '16px',
          padding: '28px 24px 20px',
          width: '100%',
          maxWidth: '420px',
          maxHeight: '90vh',
          overflowY: 'auto',
          boxShadow: '0 20px 60px rgba(0,0,0,0.28)',
        }}
      >
        <h2 style={{ fontFamily: "Georgia, serif", color: '#3D2B1F', marginBottom: '20px', fontSize: '20px' }}>
          {isEditing ? 'Edit Family Member' : 'Add Family Member'}
        </h2>

        {/* Photo */}
        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          <div
            style={{
              width: '110px',
              height: '110px',
              borderRadius: '8px',
              overflow: 'hidden',
              margin: '0 auto 10px',
              border: '3px solid #C8A84B',
              background: color,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {photoPreviewUrl ? (
              <img src={photoPreviewUrl} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <span style={{ fontSize: '40px' }}>👶</span>
            )}
          </div>
          <label style={btnStyle('outline')}>
            {isProcessingPhoto ? 'Processing…' : '📷 Choose Photo'}
            <input
              type="file"
              accept="image/*,.heic,.heif"
              style={{ display: 'none' }}
              onChange={(e) => handlePhotoFile(e.target.files[0])}
            />
          </label>
        </div>

        {/* Fields */}
        <Field label="Name *" value={name} onChange={setName} placeholder="e.g. Bà Ngoại" />
        <Field label="English Role" value={roleEn} onChange={setRoleEn} placeholder="e.g. grandma" />
        <Field label="Vietnamese Role" value={roleVi} onChange={setRoleVi} placeholder="e.g. bà ngoại" />

        {/* Color picker */}
        <div style={{ marginBottom: '16px' }}>
          <label style={labelStyle}>Burst Color</label>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '6px' }}>
            {BURST_COLORS.map((c) => (
              <button
                key={c}
                onClick={() => setColor(c)}
                title={c}
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  background: c,
                  border: color === c ? '3px solid #3D2B1F' : '2px solid transparent',
                  cursor: 'pointer',
                  outline: color === c ? '2px solid #C8A84B' : 'none',
                }}
              />
            ))}
          </div>
        </div>

        {/* Voice */}
        <div style={{ marginBottom: '16px' }}>
          <label style={labelStyle}>Voice Recording</label>
          <div style={{ display: 'flex', gap: '10px', marginTop: '6px', flexWrap: 'wrap' }}>
            {isRecording ? (
              <button style={btnStyle('danger')} onClick={stopRecording}>⏹ Stop</button>
            ) : (
              <button style={btnStyle('outline')} onClick={startRecording}>🎙 Record</button>
            )}
            <label style={btnStyle('outline')}>
              📁 Upload Audio
              <input
                type="file"
                accept="audio/*"
                style={{ display: 'none' }}
                onChange={(e) => {
                  const f = e.target.files[0];
                  if (f) { setVoiceBlob(f); setVoiceReady(true); }
                }}
              />
            </label>
            {voiceReady && <span style={{ color: '#5DCAA5', fontSize: '13px', alignSelf: 'center' }}>✓ Voice ready</span>}
          </div>
        </div>

        {/* Goodnight voice */}
        <div style={{ marginBottom: '20px', background: 'rgba(255,180,80,0.08)', borderRadius: '10px', padding: '12px 14px' }}>
          <label style={{ ...labelStyle, color: '#8B6000' }}>🌙 Goodnight Message <span style={{ fontWeight: 'normal', color: '#9B7020' }}>(optional)</span></label>
          <p style={{ fontSize: '11px', color: '#9B7020', fontFamily: "Georgia, serif", margin: '2px 0 8px', fontStyle: 'italic' }}>
            Played at bedtime instead of the regular voice recording.
          </p>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            {isRecordingGoodnight ? (
              <button style={btnStyle('danger')} onClick={stopGoodnightRecording}>⏹ Stop</button>
            ) : (
              <button style={btnStyle('outline')} onClick={startGoodnightRecording}>🎙 Record</button>
            )}
            <label style={btnStyle('outline')}>
              📁 Upload
              <input
                type="file"
                accept="audio/*"
                style={{ display: 'none' }}
                onChange={(e) => {
                  const f = e.target.files[0];
                  if (f) { setGoodnightBlob(f); setGoodnightReady(true); }
                }}
              />
            </label>
            {goodnightReady && <span style={{ color: '#C8A84B', fontSize: '13px', alignSelf: 'center' }}>✓ Ready</span>}
          </div>
        </div>

        {error && (
          <p style={{ color: '#8B1A1A', fontSize: '13px', marginBottom: '12px' }}>{error}</p>
        )}

        {/* Buttons */}
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
          {isEditing && !hiddeDelete && (
            <button style={btnStyle('danger')} onClick={handleDelete}>Delete</button>
          )}
          <button style={btnStyle('ghost')} onClick={onCancel}>Cancel</button>
          <button style={btnStyle('primary')} onClick={handleSave}>Save</button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, placeholder }) {
  return (
    <div style={{ marginBottom: '14px' }}>
      <label style={labelStyle}>{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          width: '100%',
          padding: '9px 12px',
          border: '1.5px solid #C8A84B',
          borderRadius: '8px',
          fontFamily: "Georgia, serif",
          fontSize: '15px',
          color: '#3D2B1F',
          background: '#FFFDF7',
          outline: 'none',
          boxSizing: 'border-box',
        }}
      />
    </div>
  );
}

const labelStyle = {
  display: 'block',
  fontFamily: "Georgia, serif",
  fontSize: '13px',
  color: '#6B4A35',
  marginBottom: '4px',
  fontWeight: 'bold',
};

function btnStyle(variant) {
  const base = {
    fontFamily: "Georgia, serif",
    fontSize: '14px',
    padding: '8px 16px',
    borderRadius: '8px',
    cursor: 'pointer',
    border: 'none',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    transition: 'opacity 0.15s',
  };
  if (variant === 'primary') return { ...base, background: '#328FB1', color: '#fff' };
  if (variant === 'danger')  return { ...base, background: '#8B1A1A', color: '#fff' };
  if (variant === 'ghost')   return { ...base, background: '#e8e0d0', color: '#3D2B1F' };
  return { ...base, background: 'transparent', color: '#328FB1', border: '1.5px solid #328FB1' };
}
