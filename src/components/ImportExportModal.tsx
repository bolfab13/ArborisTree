import React, { useState } from 'react';
import { 
  X, 
  Download, 
  Upload, 
  FileText, 
  FileCode, 
  Check, 
  Copy, 
  AlertCircle, 
  Trash2,
  HardDrive
} from 'lucide-react';
import { useGenealogy } from '../context/GenealogyContext';
import { 
  exportToGedcom, 
  exportToJson, 
  importFromJson, 
  analyzeGedcomWithArchipelagos, 
  detectArchipelagos,
  GedcomAnalysisResult 
} from '../utils/gedcom';
import { ArchipelagoSelectionCard } from './ArchipelagoSelectionCard';

interface ImportExportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ImportExportModal({ isOpen, onClose }: ImportExportModalProps) {
  const { tree, loadTree, clearTree } = useGenealogy();
  const [tab, setTab] = useState<'export' | 'import' | 'danger'>('export');
  const [copiedFormat, setCopiedFormat] = useState<'gedcom' | 'json' | null>(null);
  
  // Import state
  const [importContent, setImportContent] = useState('');
  const [importFileName, setImportFileName] = useState('');
  const [analysisResult, setAnalysisResult] = useState<GedcomAnalysisResult | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Clear confirmation state
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  if (!isOpen) return null;

  // Export handlers
  const handleDownloadGedcom = () => {
    const content = exportToGedcom(tree);
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(tree.name || 'archipel').toLowerCase().replace(/[^a-z0-9]/g, '_')}.ged`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadJson = () => {
    const content = exportToJson(tree);
    const blob = new Blob([content], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(tree.name || 'archipel').toLowerCase().replace(/[^a-z0-9]/g, '_')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCopyGedcom = () => {
    const content = exportToGedcom(tree);
    navigator.clipboard.writeText(content);
    setCopiedFormat('gedcom');
    setTimeout(() => setCopiedFormat(null), 2000);
  };

  const handleCopyJson = () => {
    const content = exportToJson(tree);
    navigator.clipboard.writeText(content);
    setCopiedFormat('json');
    setTimeout(() => setCopiedFormat(null), 2000);
  };

  // Process a selected or dropped file
  const processFile = (file: File) => {
    setImportFileName(file.name);
    setImportError(null);
    setAnalysisResult(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = (event.target?.result as string) || '';
      setImportContent(text);

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

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
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
    if (file) processFile(file);
  };

  const handleAnalyzePastedText = () => {
    if (!importContent.trim()) {
      setImportError('Veuillez coller un contenu GEDCOM ou JSON valide.');
      return;
    }

    setImportError(null);
    try {
      if (importContent.trim().startsWith('{')) {
        const parsed = importFromJson(importContent);
        const archs = detectArchipelagos(parsed.persons);
        setAnalysisResult({
          fullTree: parsed,
          archipelagos: archs,
          personCount: Object.keys(parsed.persons).length,
          familyCount: 0,
          sampleNames: Object.values(parsed.persons || {}).slice(0, 4).map((p) => `${p.firstName} ${p.lastName}`.trim()),
          suggestedName: parsed.name || 'Archipel collé',
        });
      } else {
        const analysis = analyzeGedcomWithArchipelagos(importContent, 'GEDCOM collé');
        if (analysis.personCount === 0) {
          throw new Error('Aucun individu valide trouvé dans le texte.');
        }
        setAnalysisResult(analysis);
      }
    } catch (err: any) {
      setImportError(err.message || 'Erreur lors de l\'analyse du contenu.');
    }
  };

  const handleExecuteClearAll = () => {
    clearTree();
    setShowClearConfirm(false);
    onClose();
  };

  const personCount = Object.keys(tree.persons).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in font-sans">
      <div 
        className="w-full max-w-2xl bg-[#0c0e12] border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[88vh] text-zinc-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-white/[0.02]">
          <div>
            <h2 className="text-lg font-bold text-white tracking-tight">
              Exportation & Importation de Données
            </h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              Standards ouverts GEDCOM 5.5.1 et JSON pour préserver votre souveraineté généalogique.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 px-6 pt-2 border-b border-white/10 bg-white/[0.01] text-xs font-mono">
          <button
            type="button"
            onClick={() => setTab('export')}
            className={`px-3 py-2 border-b-2 font-medium transition-colors cursor-pointer ${
              tab === 'export'
                ? 'border-emerald-400 text-emerald-400 font-semibold'
                : 'border-transparent text-zinc-400 hover:text-white'
            }`}
          >
            Exporter (GEDCOM & JSON)
          </button>
          <button
            type="button"
            onClick={() => setTab('import')}
            className={`px-3 py-2 border-b-2 font-medium transition-colors cursor-pointer ${
              tab === 'import'
                ? 'border-emerald-400 text-emerald-400 font-semibold'
                : 'border-transparent text-zinc-400 hover:text-white'
            }`}
          >
            Importer un fichier
          </button>
          <button
            type="button"
            onClick={() => setTab('danger')}
            className={`px-3 py-2 border-b-2 font-medium transition-colors cursor-pointer ${
              tab === 'danger'
                ? 'border-rose-400 text-rose-400 font-semibold'
                : 'border-transparent text-zinc-400 hover:text-white'
            }`}
          >
            Vider tout / Réinitialiser
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          
          {/* TAB 1: EXPORT */}
          {tab === 'export' && (
            <div className="space-y-4">
              <div className="bg-white/[0.03] p-5 rounded-xl border border-white/10">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3.5">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white tracking-tight">
                        Format Standard GEDCOM 5.5.1 (.ged)
                      </h3>
                      <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                        Le format universel de généalogie. Compatible avec Geneanet, Ancestry, Filae et MyHeritage.
                      </p>
                      <span className="inline-block mt-2 font-mono text-[11px] text-zinc-500">
                        {personCount} individus et alliances enregistrés
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 shrink-0">
                    <button
                      onClick={handleDownloadGedcom}
                      disabled={personCount === 0}
                      className="button-verve-primary text-xs py-1.5 px-3 cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Télécharger .GED</span>
                    </button>
                    <button
                      onClick={handleCopyGedcom}
                      disabled={personCount === 0}
                      className="button-verve-secondary text-xs py-1.5 px-3 cursor-pointer"
                    >
                      {copiedFormat === 'gedcom' ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          <span className="text-emerald-400 font-mono">Copié !</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5 text-zinc-400" />
                          <span className="font-mono">Copier brut</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>

              <div className="bg-white/[0.03] p-5 rounded-xl border border-white/10">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3.5">
                    <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0">
                      <FileCode className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white tracking-tight">
                        Sauvegarde Complète JSON ARCHIPEL (.json)
                      </h3>
                      <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                        Sauvegarde intégrale avec photos encodées, notes biographiques et statuts de validation.
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 shrink-0">
                    <button
                      onClick={handleDownloadJson}
                      disabled={personCount === 0}
                      className="button-verve-primary text-xs py-1.5 px-3 cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Télécharger .JSON</span>
                    </button>
                    <button
                      onClick={handleCopyJson}
                      disabled={personCount === 0}
                      className="button-verve-secondary text-xs py-1.5 px-3 cursor-pointer"
                    >
                      {copiedFormat === 'json' ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          <span className="text-emerald-400 font-mono">Copié !</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5 text-zinc-400" />
                          <span className="font-mono">Copier JSON</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: IMPORT */}
          {tab === 'import' && (
            <div className="space-y-4">
              {importError && (
                <div className="flex items-center gap-2 p-3 bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs rounded-xl">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
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
                    onClose();
                  }}
                  onCancel={() => {
                    setAnalysisResult(null);
                    setImportFileName('');
                    setImportContent('');
                  }}
                />
              ) : (
                <>
                  {/* Drag and Drop Container */}
                  <div 
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    className={`p-6 border-2 border-dashed rounded-2xl text-center transition-all ${
                      isDragging
                        ? 'border-emerald-400 bg-emerald-500/10 scale-[1.01]'
                        : 'border-white/10 bg-white/[0.02] hover:border-emerald-400/50'
                    }`}
                  >
                    <Upload className="w-8 h-8 text-emerald-400 mx-auto mb-2 opacity-80" />
                    <span className="text-sm font-bold text-white block">
                      Glissez-déposez un fichier .GED ou .JSON
                    </span>
                    <span className="text-xs text-zinc-400 block mt-1">
                      Détection automatique des archipels séparés et sélection personnalisée.
                    </span>

                    <label className="mt-4 inline-flex items-center gap-2 px-4 py-2 button-verve-primary text-xs cursor-pointer">
                      <HardDrive className="w-3.5 h-3.5" />
                      <span>Parcourir vos fichiers</span>
                      <input
                        type="file"
                        accept=".ged,.gedcom,.json"
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                    </label>

                    {importFileName && (
                      <p className="mt-3 text-xs font-mono text-emerald-400 font-semibold">
                        Fichier sélectionné : {importFileName}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-mono text-zinc-400 mb-1.5 uppercase">
                      Ou collez directement le texte GEDCOM ou JSON brut :
                    </label>
                    <textarea
                      rows={4}
                      value={importContent}
                      onChange={(e) => {
                        setImportContent(e.target.value);
                        setImportError(null);
                      }}
                      placeholder="0 HEAD&#10;1 SOUR ...&#10;0 @I1@ INDI..."
                      className="w-full px-3 py-2 text-xs bg-white/[0.04] border border-white/10 rounded-xl text-white font-mono focus:outline-none focus:border-emerald-400"
                    />
                  </div>

                  <button
                    onClick={handleAnalyzePastedText}
                    disabled={!importContent.trim()}
                    className={`w-full py-2.5 rounded-full text-xs font-mono font-medium transition-all ${
                      importContent.trim()
                        ? 'button-verve-primary cursor-pointer'
                        : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                    }`}
                  >
                    <Upload className="w-4 h-4 mr-1.5 inline" />
                    <span>Analyser le texte et afficher les archipels</span>
                  </button>
                </>
              )}
            </div>
          )}

          {/* TAB 3: VIDER TOUT / RÉINITIALISER */}
          {tab === 'danger' && (
            <div className="space-y-4">
              <div className="p-5 bg-rose-500/[0.05] border border-rose-500/20 rounded-xl space-y-4">
                <div className="flex items-start gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400 shrink-0">
                    <Trash2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white tracking-tight">
                      Vider tout l'archipel (page vierge)
                    </h4>
                    <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                      Supprime l'intégralité des personnes ({personCount} individus), réinitialise le stockage local,
                      et vous ramène immédiatement à l'écran de création du fondateur ou d'importation d'un nouveau fichier.
                    </p>
                  </div>
                </div>

                {!showClearConfirm ? (
                  <div className="pt-2 flex justify-end">
                    <button
                      type="button"
                      onClick={() => setShowClearConfirm(true)}
                      className="px-4 py-2 text-xs font-mono font-bold text-rose-300 hover:text-white bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 rounded-full transition-colors cursor-pointer flex items-center gap-1.5"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Vider tout</span>
                    </button>
                  </div>
                ) : (
                  <div className="p-4 bg-black/40 border border-rose-500/40 rounded-xl space-y-3 animate-fade-in">
                    <div className="flex items-center gap-2 text-rose-300 text-xs font-semibold">
                      <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                      <span>Êtes-vous certain de vouloir tout supprimer ?</span>
                    </div>
                    <p className="text-xs text-zinc-400">
                      Toutes les données seront définitivement effacées du navigateur. Pensez à exporter en GEDCOM ou JSON si vous souhaitez les conserver.
                    </p>
                    <div className="flex items-center justify-end gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setShowClearConfirm(false)}
                        className="px-3 py-1.5 text-xs text-zinc-400 hover:text-white rounded-lg transition-colors cursor-pointer"
                      >
                        Annuler
                      </button>
                      <button
                        type="button"
                        onClick={handleExecuteClearAll}
                        className="px-4 py-1.5 text-xs font-mono font-bold text-white bg-rose-600 hover:bg-rose-500 rounded-full transition-colors cursor-pointer shadow-md shadow-rose-950 flex items-center gap-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Confirmer : Vider tout</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-white/[0.02] border-t border-white/10 text-xs text-zinc-500 flex items-center justify-between">
          <span className="font-mono text-[11px]">ARCHIPEL · Données privées et souveraines</span>
          <button
            onClick={onClose}
            className="text-xs text-zinc-400 hover:text-white cursor-pointer"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}
