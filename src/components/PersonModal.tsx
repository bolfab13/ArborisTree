import React, { useState, useEffect } from 'react';
import { 
  X, 
  Upload, 
  User, 
  Heart, 
  Users, 
  Sparkles,
  AlertCircle 
} from 'lucide-react';
import { useGenealogy } from '../context/GenealogyContext';
import { Gender, Person, RelationStatus } from '../types/genealogy';

export function PersonModal() {
  const { 
    isAddModalOpen, 
    setIsAddModalOpen, 
    editingPerson, 
    setEditingPerson, 
    addPerson, 
    updatePerson, 
    tree,
    modalAddRelativeTarget,
    setModalAddRelativeTarget
  } = useGenealogy();

  const [activeTab, setActiveTab] = useState<'civil' | 'life' | 'family' | 'photo'>('civil');
  
  // Form fields
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [maidenName, setMaidenName] = useState('');
  const [gender, setGender] = useState<Gender>('M');
  const [birthDate, setBirthDate] = useState('');
  const [birthPlace, setBirthPlace] = useState('');
  const [deathDate, setDeathDate] = useState('');
  const [deathPlace, setDeathPlace] = useState('');
  const [isLiving, setIsLiving] = useState(true);
  const [occupation, setOccupation] = useState('');
  const [biography, setBiography] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [fatherId, setFatherId] = useState<string>('');
  const [motherId, setMotherId] = useState<string>('');
  const [relationStatus, setRelationStatus] = useState<RelationStatus>('validated');
  const [selectedSpouseIds, setSelectedSpouseIds] = useState<string[]>([]);
  const [selectedChildIds, setSelectedChildIds] = useState<string[]>([]);
  
  const [error, setError] = useState<string | null>(null);

  // Populate form on open
  useEffect(() => {
    if (!isAddModalOpen) return;

    if (editingPerson) {
      setFirstName(editingPerson.firstName);
      setLastName(editingPerson.lastName);
      setMaidenName(editingPerson.maidenName || '');
      setGender(editingPerson.gender);
      setBirthDate(editingPerson.birthDate || '');
      setBirthPlace(editingPerson.birthPlace || '');
      setDeathDate(editingPerson.deathDate || '');
      setDeathPlace(editingPerson.deathPlace || '');
      setIsLiving(editingPerson.isLiving);
      setOccupation(editingPerson.occupation || '');
      setBiography(editingPerson.biography || '');
      setPhotoUrl(editingPerson.photoUrl || '');
      setFatherId(editingPerson.fatherId || '');
      setMotherId(editingPerson.motherId || '');
      setRelationStatus(editingPerson.relationStatus || 'validated');
      setSelectedSpouseIds(editingPerson.spouseIds || []);
      setSelectedChildIds(editingPerson.childIds || []);
    } else {
      // Default new person
      setFirstName('');
      const defaultLast = tree.name?.replace('Archipel ', '') || '';
      setLastName(defaultLast);
      setMaidenName('');
      setGender('M');
      setBirthDate('');
      setBirthPlace('');
      setDeathDate('');
      setDeathPlace('');
      setIsLiving(true);
      setOccupation('');
      setBiography('');
      setPhotoUrl('');
      setFatherId('');
      setMotherId('');
      setRelationStatus('validated');
      setSelectedSpouseIds([]);
      setSelectedChildIds([]);

      // Pre-populate if quickAddRelative was called
      if (modalAddRelativeTarget) {
        const { relation, targetId } = modalAddRelativeTarget;
        const target = tree.persons[targetId];
        if (target) {
          if (relation === 'father') {
            setGender('M');
            setLastName(target.lastName);
            setSelectedChildIds([targetId]);
          } else if (relation === 'mother') {
            setGender('F');
            setSelectedChildIds([targetId]);
          } else if (relation === 'spouse') {
            setGender(target.gender === 'M' ? 'F' : 'M');
            setSelectedSpouseIds([targetId]);
          } else if (relation === 'child') {
            if (target.gender === 'M') {
              setFatherId(target.id);
              setLastName(target.lastName);
              if (target.spouseIds.length > 0) {
                setMotherId(target.spouseIds[0]);
              }
            } else {
              setMotherId(target.id);
              if (target.spouseIds.length > 0) {
                setFatherId(target.spouseIds[0]);
              }
            }
          }
        }
      }
    }

    setError(null);
    setActiveTab('civil');
  }, [isAddModalOpen, editingPerson, modalAddRelativeTarget, tree]);

  if (!isAddModalOpen) return null;

  const handleClose = () => {
    setIsAddModalOpen(false);
    setEditingPerson(null);
    setModalAddRelativeTarget(null);
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        setError("L'image est un peu lourde (> 2 Mo). Veuillez choisir une image plus légère.");
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        setPhotoUrl(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim() || !lastName.trim()) {
      setError('Veuillez renseigner au moins le prénom et le nom de famille.');
      setActiveTab('civil');
      return;
    }

    const payload: Partial<Person> = {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      maidenName: maidenName.trim() || undefined,
      gender,
      birthDate: birthDate.trim() || undefined,
      birthPlace: birthPlace.trim() || undefined,
      deathDate: isLiving ? undefined : (deathDate.trim() || undefined),
      deathPlace: isLiving ? undefined : (deathPlace.trim() || undefined),
      isLiving,
      occupation: occupation.trim() || undefined,
      biography: biography.trim() || undefined,
      photoUrl: photoUrl.trim() || undefined,
      fatherId: fatherId || undefined,
      motherId: motherId || undefined,
      spouseIds: selectedSpouseIds,
      childIds: selectedChildIds,
      relationStatus,
    };

    if (editingPerson) {
      updatePerson(editingPerson.id, payload);
    } else {
      addPerson(payload);
    }

    handleClose();
  };

  const allPersons = Object.values(tree.persons).filter(
    (p) => !editingPerson || p.id !== editingPerson.id
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fade-in">
      <div 
        className="w-full max-w-2xl bg-[#0c0e12] border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] text-zinc-100 font-sans"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header (Verve style) */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-white/[0.02]">
          <div>
            <h2 className="text-lg font-bold text-white tracking-tight">
              {editingPerson ? `Modifier ${editingPerson.firstName} ${editingPerson.lastName}` : 'Ajouter une personne'}
            </h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              {editingPerson ? 'Mettez à jour les filiations et attributs' : 'Créez un nouveau nœud dans votre archipel'}
            </p>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 text-zinc-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 px-6 pt-2 border-b border-white/10 bg-white/[0.01] text-xs font-mono">
          <button
            type="button"
            onClick={() => setActiveTab('civil')}
            className={`px-3 py-2 border-b-2 font-medium transition-colors cursor-pointer ${
              activeTab === 'civil'
                ? 'border-emerald-400 text-emerald-400 font-semibold'
                : 'border-transparent text-zinc-400 hover:text-white'
            }`}
          >
            État Civil & Statut
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('family')}
            className={`px-3 py-2 border-b-2 font-medium transition-colors cursor-pointer ${
              activeTab === 'family'
                ? 'border-emerald-400 text-emerald-400 font-semibold'
                : 'border-transparent text-zinc-400 hover:text-white'
            }`}
          >
            Filiations & Alliances
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('life')}
            className={`px-3 py-2 border-b-2 font-medium transition-colors cursor-pointer ${
              activeTab === 'life'
                ? 'border-emerald-400 text-emerald-400 font-semibold'
                : 'border-transparent text-zinc-400 hover:text-white'
            }`}
          >
            Biographie & Métier
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('photo')}
            className={`px-3 py-2 border-b-2 font-medium transition-colors cursor-pointer ${
              activeTab === 'photo'
                ? 'border-emerald-400 text-emerald-400 font-semibold'
                : 'border-transparent text-zinc-400 hover:text-white'
            }`}
          >
            Portrait
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          {error && (
            <div className="flex items-center gap-2 p-3 bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs rounded-xl">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          {/* TAB 1: CIVIL IDENTITY */}
          {activeTab === 'civil' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-mono text-zinc-400 mb-1.5 uppercase">
                    Prénom(s) *
                  </label>
                  <input
                    type="text"
                    required
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="ex: Jean"
                    className="w-full px-3 py-2 text-xs bg-white/[0.04] border border-white/10 rounded-xl text-white placeholder-zinc-600 focus:border-emerald-400 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono text-zinc-400 mb-1.5 uppercase">
                    Nom patronymique *
                  </label>
                  <input
                    type="text"
                    required
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="ex: Dubois"
                    className="w-full px-3 py-2 text-xs bg-white/[0.04] border border-white/10 rounded-xl text-white placeholder-zinc-600 focus:border-emerald-400 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-mono text-zinc-400 mb-1.5 uppercase">
                    Nom de naissance / jeune fille
                  </label>
                  <input
                    type="text"
                    value={maidenName}
                    onChange={(e) => setMaidenName(e.target.value)}
                    placeholder="ex: Laurent"
                    className="w-full px-3 py-2 text-xs bg-white/[0.04] border border-white/10 rounded-xl text-white placeholder-zinc-600 focus:border-emerald-400 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono text-zinc-400 mb-1.5 uppercase">
                    Sexe
                  </label>
                  <div className="flex items-center gap-2">
                    {(['M', 'F', 'O'] as const).map((g) => (
                      <button
                        key={g}
                        type="button"
                        onClick={() => setGender(g)}
                        className={`flex-1 py-1.5 text-xs font-mono rounded-lg border transition-all cursor-pointer ${
                          gender === g
                            ? 'bg-emerald-500/15 border-emerald-400 text-emerald-300 font-semibold'
                            : 'bg-white/[0.02] border-white/10 text-zinc-400 hover:text-white'
                        }`}
                      >
                        {g === 'M' ? 'Homme' : g === 'F' ? 'Femme' : 'Autre'}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Status Living / Deceased */}
              <div className="p-3.5 bg-white/[0.03] rounded-xl border border-white/10 flex items-center justify-between">
                <div>
                  <span className="text-xs font-medium text-white block">Cette personne est-elle en vie ?</span>
                  <span className="text-[11px] text-zinc-400">Définit si les dates de fin de vie sont requises</span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isLiving}
                    onChange={(e) => setIsLiving(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-10 h-5 bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-400"></div>
                </label>
              </div>

              {/* Relation Validation Status */}
              <div className="p-3.5 bg-white/[0.03] rounded-xl border border-white/10">
                <label className="block text-xs font-mono text-zinc-400 mb-2 uppercase">
                  Statut de la relation généalogique
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setRelationStatus('validated')}
                    className={`py-1.5 px-2 text-xs font-mono rounded-lg border transition-all cursor-pointer ${
                      relationStatus === 'validated'
                        ? 'bg-emerald-500/15 border-emerald-400 text-emerald-300 font-semibold'
                        : 'bg-white/[0.02] border-white/10 text-zinc-400'
                    }`}
                  >
                    Validée
                  </button>
                  <button
                    type="button"
                    onClick={() => setRelationStatus('to_confirm')}
                    className={`py-1.5 px-2 text-xs font-mono rounded-lg border transition-all cursor-pointer ${
                      relationStatus === 'to_confirm'
                        ? 'bg-amber-500/15 border-amber-400 text-amber-300 font-semibold'
                        : 'bg-white/[0.02] border-white/10 text-zinc-400'
                    }`}
                  >
                    À confirmer
                  </button>
                  <button
                    type="button"
                    onClick={() => setRelationStatus('contested')}
                    className={`py-1.5 px-2 text-xs font-mono rounded-lg border transition-all cursor-pointer ${
                      relationStatus === 'contested'
                        ? 'bg-rose-500/15 border-rose-400 text-rose-300 font-semibold'
                        : 'bg-white/[0.02] border-white/10 text-zinc-400'
                    }`}
                  >
                    Contestée
                  </button>
                </div>
              </div>

              {/* Dates & Places */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-3 p-3 bg-white/[0.02] border border-white/10 rounded-xl">
                  <span className="text-xs font-mono text-emerald-400 block font-semibold">Naissance</span>
                  <div>
                    <label className="block text-[11px] text-zinc-400 mb-1">Date</label>
                    <input
                      type="text"
                      value={birthDate}
                      onChange={(e) => setBirthDate(e.target.value)}
                      placeholder="ex: 1945"
                      className="w-full px-3 py-1.5 text-xs bg-white/[0.04] border border-white/10 rounded-lg text-white focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-zinc-400 mb-1">Lieu</label>
                    <input
                      type="text"
                      value={birthPlace}
                      onChange={(e) => setBirthPlace(e.target.value)}
                      placeholder="ex: Lyon, France"
                      className="w-full px-3 py-1.5 text-xs bg-white/[0.04] border border-white/10 rounded-lg text-white focus:outline-none"
                    />
                  </div>
                </div>

                {!isLiving && (
                  <div className="space-y-3 p-3 bg-white/[0.02] border border-white/10 rounded-xl">
                    <span className="text-xs font-mono text-zinc-400 block font-semibold">Décès</span>
                    <div>
                      <label className="block text-[11px] text-zinc-400 mb-1">Date</label>
                      <input
                        type="text"
                        value={deathDate}
                        onChange={(e) => setDeathDate(e.target.value)}
                        placeholder="ex: 2018"
                        className="w-full px-3 py-1.5 text-xs bg-white/[0.04] border border-white/10 rounded-lg text-white focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-zinc-400 mb-1">Lieu</label>
                      <input
                        type="text"
                        value={deathPlace}
                        onChange={(e) => setDeathPlace(e.target.value)}
                        placeholder="ex: Paris, France"
                        className="w-full px-3 py-1.5 text-xs bg-white/[0.04] border border-white/10 rounded-lg text-white focus:outline-none"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: FAMILY TIES */}
          {activeTab === 'family' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-mono text-zinc-400 mb-1.5 uppercase">
                    Père
                  </label>
                  <select
                    value={fatherId}
                    onChange={(e) => setFatherId(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-zinc-900 border border-white/10 rounded-xl text-white focus:outline-none cursor-pointer"
                  >
                    <option value="">-- Aucun père sélectionné --</option>
                    {allPersons
                      .filter((p) => p.gender === 'M' || !p.gender)
                      .map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.firstName} {p.lastName} {p.birthDate ? `(${p.birthDate.replace(/\D/g, '').slice(-4)})` : ''}
                        </option>
                      ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-mono text-zinc-400 mb-1.5 uppercase">
                    Mère
                  </label>
                  <select
                    value={motherId}
                    onChange={(e) => setMotherId(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-zinc-900 border border-white/10 rounded-xl text-white focus:outline-none cursor-pointer"
                  >
                    <option value="">-- Aucune mère sélectionnée --</option>
                    {allPersons
                      .filter((p) => p.gender === 'F' || !p.gender)
                      .map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.firstName} {p.lastName} {p.birthDate ? `(${p.birthDate.replace(/\D/g, '').slice(-4)})` : ''}
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              {/* Spouses */}
              <div>
                <label className="block text-xs font-mono text-zinc-400 mb-1.5 uppercase">
                  Conjoint(e)s & Alliances
                </label>
                <div className="max-h-36 overflow-y-auto p-2 bg-white/[0.03] border border-white/10 rounded-xl space-y-1">
                  {allPersons.length === 0 ? (
                    <span className="text-xs text-zinc-500 italic">Aucun autre membre disponible</span>
                  ) : (
                    allPersons.map((p) => {
                      const isSelected = selectedSpouseIds.includes(p.id);
                      return (
                        <label
                          key={p.id}
                          className="flex items-center gap-2 p-1.5 hover:bg-white/[0.05] rounded-lg text-xs cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedSpouseIds([...selectedSpouseIds, p.id]);
                              } else {
                                setSelectedSpouseIds(selectedSpouseIds.filter((id) => id !== p.id));
                              }
                            }}
                            className="text-emerald-400"
                          />
                          <span className="font-medium text-white">
                            {p.firstName} {p.lastName}
                          </span>
                          <span className="text-[11px] text-zinc-400">
                            {p.birthDate ? `(${p.birthDate.replace(/\D/g, '').slice(-4)})` : ''}
                          </span>
                        </label>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Children */}
              <div>
                <label className="block text-xs font-mono text-zinc-400 mb-1.5 uppercase">
                  Enfants
                </label>
                <div className="max-h-36 overflow-y-auto p-2 bg-white/[0.03] border border-white/10 rounded-xl space-y-1">
                  {allPersons.length === 0 ? (
                    <span className="text-xs text-zinc-500 italic">Aucun autre membre disponible</span>
                  ) : (
                    allPersons.map((p) => {
                      const isSelected = selectedChildIds.includes(p.id);
                      return (
                        <label
                          key={p.id}
                          className="flex items-center gap-2 p-1.5 hover:bg-white/[0.05] rounded-lg text-xs cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedChildIds([...selectedChildIds, p.id]);
                              } else {
                                setSelectedChildIds(selectedChildIds.filter((id) => id !== p.id));
                              }
                            }}
                            className="text-emerald-400"
                          />
                          <span className="font-medium text-white">
                            {p.firstName} {p.lastName}
                          </span>
                          <span className="text-[11px] text-zinc-400">
                            {p.birthDate ? `(${p.birthDate.replace(/\D/g, '').slice(-4)})` : ''}
                          </span>
                        </label>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: LIFE & BIOGRAPHY */}
          {activeTab === 'life' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-mono text-zinc-400 mb-1.5 uppercase">
                  Profession ou Titre
                </label>
                <input
                  type="text"
                  value={occupation}
                  onChange={(e) => setOccupation(e.target.value)}
                  placeholder="ex: Architecte, Ingénieur paysagiste, Botaniste..."
                  className="w-full px-3 py-2 text-xs bg-white/[0.04] border border-white/10 rounded-xl text-white placeholder-zinc-600 focus:border-emerald-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-zinc-400 mb-1.5 uppercase">
                  Notes biographiques & anecdotes
                </label>
                <textarea
                  rows={5}
                  value={biography}
                  onChange={(e) => setBiography(e.target.value)}
                  placeholder="Récit de vie, réalisations..."
                  className="w-full px-3 py-2 text-xs bg-white/[0.04] border border-white/10 rounded-xl text-white placeholder-zinc-600 focus:border-emerald-400 focus:outline-none"
                />
              </div>
            </div>
          )}

          {/* TAB 4: PORTRAIT */}
          {activeTab === 'photo' && (
            <div className="space-y-4">
              <div className="flex items-center gap-5 p-4 bg-white/[0.03] border border-white/10 rounded-xl">
                <div className="w-16 h-16 rounded-xl overflow-hidden shrink-0 border border-white/10 bg-zinc-800 flex items-center justify-center">
                  {photoUrl ? (
                    <img
                      src={photoUrl}
                      alt=""
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <User className="w-8 h-8 text-zinc-500" />
                  )}
                </div>

                <div className="flex-1 space-y-2">
                  <span className="text-xs font-medium text-white block">Téléverser une photo locale</span>
                  <label className="inline-flex items-center gap-2 px-3 py-1.5 bg-white/10 hover:bg-white/15 border border-white/10 rounded-lg text-xs font-medium text-zinc-200 cursor-pointer transition-colors">
                    <Upload className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Choisir une image</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoUpload}
                      className="hidden"
                    />
                  </label>
                  {photoUrl && (
                    <button
                      type="button"
                      onClick={() => setPhotoUrl('')}
                      className="block text-[11px] text-rose-400 hover:underline cursor-pointer"
                    >
                      Supprimer la photo
                    </button>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono text-zinc-400 mb-1.5 uppercase">
                  Ou URL directe d'image :
                </label>
                <input
                  type="url"
                  value={photoUrl.startsWith('data:') ? '' : photoUrl}
                  onChange={(e) => setPhotoUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full px-3 py-2 text-xs bg-white/[0.04] border border-white/10 rounded-xl text-white focus:outline-none"
                />
              </div>
            </div>
          )}

          {/* Footer Controls */}
          <div className="pt-4 border-t border-white/10 flex items-center justify-between">
            <button
              type="button"
              onClick={handleClose}
              className="button-verve-secondary text-xs py-2 px-4"
            >
              Annuler
            </button>

            <button
              type="submit"
              className="button-verve-primary text-xs py-2 px-5"
            >
              {editingPerson ? 'Enregistrer les modifications' : 'Ajouter à l\'archipel'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
