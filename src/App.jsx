import React, { useState, useEffect } from 'react';
import SplashScreen from './components/SplashScreen';
import WallScreen from './components/WallScreen';
import BabyNameScreen from './components/BabyNameScreen';
import { useMusic } from './hooks/useMusic';
import { deleteBlob } from './hooks/useIndexedDB';
import defaultFamily from './data/defaultFamily';

const LS_KEY      = 'babywall_people';
const LS_BABY_KEY = 'babywall_baby';

const DEFAULT_BABY = {
  id: 'baby',
  name: 'Baby',
  roleEn: 'our little star',
  roleVi: '',
  color: '#FFD700',
};

function loadPeople() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) return JSON.parse(raw);
  } catch (_) {}
  return null;
}

function savePeople(people) {
  const slim = people.map(({ id, name, roleEn, roleVi, color }) => ({ id, name, roleEn, roleVi, color }));
  localStorage.setItem(LS_KEY, JSON.stringify(slim));
}

function loadBaby() {
  try {
    const raw = localStorage.getItem(LS_BABY_KEY);
    if (raw) return JSON.parse(raw);
  } catch (_) {}
  return null;
}

function saveBaby(baby) {
  const { id, name, roleEn, roleVi, color } = baby;
  localStorage.setItem(LS_BABY_KEY, JSON.stringify({ id, name, roleEn, roleVi, color }));
}

export default function App() {
  const [screen, setScreen] = useState(() =>
    localStorage.getItem('babyName') ? 'splash' : 'name-setup'
  );
  const [people, setPeople] = useState(() => loadPeople() || defaultFamily);
  const [baby, setBaby] = useState(() => loadBaby() || DEFAULT_BABY);
  const music = useMusic();

  useEffect(() => { savePeople(people); }, [people]);
  useEffect(() => { saveBaby(baby); }, [baby]);

  function handleAddMember(person)    { setPeople((prev) => [...prev, person]); }
  function handleEditMember(updated)  { setPeople((prev) => prev.map((p) => p.id === updated.id ? updated : p)); }
  function handleEditBaby(updated)    { setBaby(updated); }

  async function handleDeleteMember(id) {
    await deleteBlob('photos', id);
    await deleteBlob('voices', id);
    setPeople((prev) => prev.filter((p) => p.id !== id));
  }

  if (screen === 'name-setup') {
    return <BabyNameScreen onDone={() => setScreen('wall')} />;
  }

  if (screen === 'splash') {
    return <SplashScreen music={music} onStart={() => setScreen('wall')} />;
  }

  return (
    <WallScreen
      people={people}
      baby={baby}
      onAddMember={handleAddMember}
      onEditMember={handleEditMember}
      onEditBaby={handleEditBaby}
      onDeleteMember={handleDeleteMember}
      music={music}
    />
  );
}
