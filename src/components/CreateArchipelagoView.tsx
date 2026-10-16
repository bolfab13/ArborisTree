import React, { useState } from 'react';
import { 
  ArrowRight, 
  Upload, 
  HardDrive, 
  CheckCircle2, 
  AlertCircle,
  Network,
  Calendar,
  MapPin,
  Briefcase
} from 'lucide-react';
import { useGenealogy } from '../context/GenealogyContext';
import { Gender } from '../types/genealogy';
import { 
  importFromJson, 
  analyzeGedcomWithArchipelagos, 
  detectArchipelagos,
  GedcomAnalysisResult 
} from '../utils/gedcom';
import { ArchipelagoSelectionCard } from './ArchipelagoSelectionCard';

export function CreateArchipelagoView() {
  const { initializeArchipelago, loadTree } = useGenealogy();

  // Founder Form State
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [gender, setGender] = useState<Gender>('M');
  const [birthDate, setBirthDate] = useState('');
  const [birthPlace, setBirthPlace] = useState('');
  const [occupation, setOccupation] = useState('');
  const [founderError, setFounderError] = useState<string | null>(null);

  // GEDCOM / JSON Analysis & Multi-Archipelago State
  const [isDragging, setIsDragging] = useState(false);
  const [importFileName, setImportFileName] = useState('');
  const [analysisResult, setAnalysisResult] = useState<GedcomAnalysisResult | null>(null);
  const [importError, setImportError] = useState<string | null>(null);

  const handleFounderSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim() || !lastName.trim()) {
      setFounderError('Veuillez renseigner votre prénom et votre nom de famille.');
      return;
    }
    initializeArchipelago(firstName, lastName, gender, birthDate, birthPlace, occupation);
  };

  const processFile = (file: File) => {
    setImportFileName(file.name);
    setImportError(null);
    setAnalysisResult(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = (e.target?.result as string) || '';

      try {
        if (text.trim().startsWith('{')) {
          const parsed = importFromJson(text);
          const archs = detectArchipelagos(parsed.persons);
          setAnalysisResult({
            fullTree: parsed,
            archipelagos: archs,
            personCount: Object.keys(parsed.persons).length,
            familyCount: 0,
            sampleNames: Object.values(parsed.persons || {}).slice(0, 4).map((p) => `${p.firstName} ${p.lastName}`.trim()),
            suggestedName: parsed.name || file.name.replace(/\.[^/.]+$/, ''),
          });
        } else {
          const analysis = analyzeGedcomWithArchipelagos(text, file.name);
          if (analysis.personCount === 0) {
            setImportError('Aucun individu détecté dans ce fichier GEDCOM. Vérifiez le format.');
          } else {
            setAnalysisResult(analysis);
          }
        }
      } catch (err: any) {
        setImportError(`Erreur lors de l'analyse du fichier : ${err.message}`);
      }
    };

    reader.onerror = () => {
      setImportError('Impossible de lire ce fichier.');
    };

    reader.readAsText(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  return (
    <div className="relative min-h-[calc(100vh-65px)] flex flex-col items-center justify-center px-4 sm:px-6 py-12 overflow-hidden bg-[#08090c]">
      
      {/* Verve Ambient Glows */}
      <div 
        className="ambient-glow bg-emerald-500/15 top-[-120px] left-1/2 -translate-x-1/2" 
        style={{ width: '700px', height: '700px' }}
      />
      <div 
        className="ambient-glow bg-cyan-500/10 bottom-[-150px] right-[-100px]" 
        style={{ width: '500px', height: '500px' }}
      />

      <div className="relative z-10 max-w-5xl w-full flex flex-col items-center">
        
        {/* Verve Technical Badge */}
        <div className="badge-verve mb-6 text-zinc-300">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>ARCHIPEL · CARTOGRAPHIE FAMILIALE SOUVERAINE</span>
        </div>

        {/* Hero Title with Verve Linear Gradient */}
        <h1 className="text-3xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-center leading-tight mb-4">
          <span className="title-linear">Initialisez votre archipel.</span>
        </h1>

        <p className="text-sm sm:text-base text-zinc-400 text-center max-w-2xl mb-10 leading-relaxed font-sans">
          Démarrez votre cartographie généalogique vierge en créant le point d'ancrage central,
          ou importez directement vos archives au standard universel GEDCOM.
        </p>

        {/* 2-Column Grid: Left: Founder Form, Right: GEDCOM Import / Archipelago Selection */}
        <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* OPTION 1: Create Blank Founder */}
          <div className="lg:col-span-6 card-verve p-6 sm:p-8 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-5 border-b border-white/10 mb-6">
                <div>
                  <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
                    <span>Créer un archipel vierge</span>
                  </h2>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    Renseignez vos nom et prénom pour créer le point d'ancrage central
                  </p>
                </div>
                <div className="w-8 h-8 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center font-mono text-xs font-bold">
                  01
                </div>
              </div>

              {founderError && (
                <div className="mb-5 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{founderError}</span>
                </div>
              )}

              <form onSubmit={handleFounderSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-mono text-zinc-400 mb-1.5 uppercase tracking-wider">
                      Prénom *
                    </label>
                    <input
                      type="text"
                      required
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      placeholder="ex: Alexandre"
                      className="w-full px-3.5 py-2.5 text-xs bg-white/[0.04] border border-white/10 rounded-xl text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400/40 transition-all font-sans"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-mono text-zinc-400 mb-1.5 uppercase tracking-wider">
                      Nom de famille *
                    </label>
                    <input
                      type="text"
                      required
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      placeholder="ex: Martin"
                      className="w-full px-3.5 py-2.5 text-xs bg-white/[0.04] border border-white/10 rounded-xl text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400/40 transition-all font-sans"
                    />
                  </div>
                </div>

                {/* Gender selector */}
                <div>
                  <label className="block text-xs font-mono text-zinc-400 mb-1.5 uppercase tracking-wider">
                    Sexe
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['M', 'F', 'O'] as const).map((g) => (
                      <button
                        key={g}
                        type="button"
                        onClick={() => setGender(g)}
                        className={`py-2 text-xs font-mono rounded-lg border transition-all cursor-pointer ${
                          gender === g
                            ? 'bg-emerald-500/15 border-emerald-400 text-emerald-300 font-semibold shadow-xs'
                            : 'bg-white/[0.02] border-white/10 text-zinc-400 hover:text-white hover:bg-white/[0.05]'
                        }`}
                      >
                        {g === 'M' ? 'Homme' : g === 'F' ? 'Femme' : 'Autre'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Optional Birth Date and Place */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                  <div>
                    <label className="block text-xs font-mono text-zinc-400 mb-1.5 uppercase tracking-wider">
                      Année / Date de naissance
                    </label>
                    <div className="relative">
                      <Calendar className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={birthDate}
                        onChange={(e) => setBirthDate(e.target.value)}
                        placeholder="ex: 1985"
                        className="w-full pl-9 pr-3.5 py-2.5 text-xs bg-white/[0.04] border border-white/10 rounded-xl text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-400 transition-all font-sans"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-mono text-zinc-400 mb-1.5 uppercase tracking-wider">
                      Lieu de naissance
                    </label>
                    <div className="relative">
                      <MapPin className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={birthPlace}
                        onChange={(e) => setBirthPlace(e.target.value)}
                        placeholder="ex: Paris, France"
                        className="w-full pl-9 pr-3.5 py-2.5 text-xs bg-white/[0.04] border border-white/10 rounded-xl text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-400 transition-all font-sans"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-mono text-zinc-400 mb-1.5 uppercase tracking-wider">
                    Profession ou Vocation (optionnel)
                  </label>
                  <div className="relative">
                    <Briefcase className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={occupation}
                      onChange={(e) => setOccupation(e.target.value)}
                      placeholder="ex: Architecte, Ingénieur, Chercheur..."
                      className="w-full pl-9 pr-3.5 py-2.5 text-xs bg-white/[0.04] border border-white/10 rounded-xl text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-400 transition-all font-sans"
                    />
                  </div>
                </div>

                <div className="pt-4">
                  <button
                    type="submit"
                    className="button-verve-primary w-full py-3 text-sm flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-emerald-950/40"
                  >
                    <span>Créer et afficher mon archipel</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* OPTION 2: Import GEDCOM / Multi-Archipelago Selector */}
          <div className="lg:col-span-6 card-verve p-6 sm:p-8 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-5 border-b border-white/10 mb-6">
                <div>
                  <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
                    <span>Importer un fichier .GED</span>
                  </h2>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    Détection automatique d'archipels séparés et choix du pivot
                  </p>
                </div>
                <div className="w-8 h-8 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 flex items-center justify-center font-mono text-xs font-bold">
                  02
                </div>
              </div>

              {importError && (
                <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{importError}</span>
                </div>
              )}

              {/* Show Archipelago Selection & Pivot Picker if file is analyzed */}
              {analysisResult ? (
                <ArchipelagoSelectionCard
                  fullTree={analysisResult.fullTree}
                  archipelagos={analysisResult.archipelagos}
                  fileName={importFileName}
                  onConfirmImport={(filteredTree) => {
                    loadTree(filteredTree);
                  }}
                  onCancel={() => {
                    setAnalysisResult(null);
                    setImportFileName('');
                  }}
                />
              ) : (
                /* Drag and Drop Box */
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={`p-6 border-2 border-dashed rounded-2xl text-center transition-all flex flex-col items-center justify-center ${
                    isDragging
                      ? 'border-emerald-400 bg-emerald-500/10 scale-[1.01]'
                      : 'border-white/15 bg-white/[0.02] hover:border-emerald-400/40 hover:bg-white/[0.04]'
                  }`}
                >
                  <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-3">
                    <Upload className="w-6 h-6" />
                  </div>

                  <span className="text-sm font-bold text-white block">
                    Glissez votre fichier ici
                  </span>
                  <span className="text-xs text-zinc-400 block mt-1 max-w-[240px]">
                    Fichiers <strong className="text-zinc-200">.ged</strong> (GEDCOM 5.5.1) ou <strong className="text-zinc-200">.json</strong>
                  </span>

                  <label className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/15 border border-white/15 rounded-full text-xs font-mono text-zinc-200 cursor-pointer transition-colors">
                    <HardDrive className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Parcourir mes fichiers</span>
                    <input
                      type="file"
                      accept=".ged,.gedcom,.json"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </label>
                </div>
              )}
            </div>

            {/* Privacy note */}
            <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-between text-[11px] font-mono text-zinc-500">
              <span className="flex items-center gap-1.5">
                <Network className="w-3.5 h-3.5 text-emerald-500/70" />
                Traitement 100% local dans votre navigateur
              </span>
              <span>Aucune fuite externe</span>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
