import { useState, useEffect } from 'react';
import { GenealogyProvider, useGenealogy } from './context/GenealogyContext';
import { Header } from './components/Header';
import { CreateArchipelagoView } from './components/CreateArchipelagoView';
import { FamilyTreeView } from './components/FamilyTreeView';
import { DirectoryView } from './components/DirectoryView';
import { TimelineView } from './components/TimelineView';
import { StatsView } from './components/StatsView';
import { PersonDetailDrawer } from './components/PersonDetailDrawer';
import { PersonModal } from './components/PersonModal';
import { ImportExportModal } from './components/ImportExportModal';
import { SearchPalette } from './components/SearchPalette';

function MainAppContent() {
  const { tree, viewMode } = useGenealogy();
  const [isImportExportOpen, setIsImportExportOpen] = useState(false);
  const [isSearchPaletteOpen, setIsSearchPaletteOpen] = useState(false);

  const hasPersons = Object.keys(tree.persons).length > 0;

  // Global keyboard shortcut: Cmd+K / Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsSearchPaletteOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="min-h-screen bg-[#08090c] text-zinc-100 flex flex-col font-sans selection:bg-emerald-500/20 selection:text-emerald-300">
      
      {/* 3-Zone Top Bar */}
      <Header
        onOpenImportExport={() => setIsImportExportOpen(true)}
        onOpenSearchPalette={() => setIsSearchPaletteOpen(true)}
      />

      {/* Main View Area */}
      <main className="flex-1 w-full">
        {!hasPersons ? (
          <CreateArchipelagoView />
        ) : (
          <>
            {viewMode === 'tree' && <FamilyTreeView />}
            {viewMode === 'directory' && <DirectoryView />}
            {viewMode === 'timeline' && <TimelineView />}
            {viewMode === 'stats' && <StatsView />}
          </>
        )}
      </main>

      {/* Global Overlays & Modals */}
      <PersonDetailDrawer />
      <PersonModal />
      <ImportExportModal
        isOpen={isImportExportOpen}
        onClose={() => setIsImportExportOpen(false)}
      />
      <SearchPalette
        isOpen={isSearchPaletteOpen}
        onClose={() => setIsSearchPaletteOpen(false)}
      />
    </div>
  );
}

export default function App() {
  return (
    <GenealogyProvider>
      <MainAppContent />
    </GenealogyProvider>
  );
}
