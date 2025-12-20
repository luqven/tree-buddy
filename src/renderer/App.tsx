import { useState } from 'react';
import { ProjectList } from './components/ProjectList';
import { SettingsPane } from './components/SettingsPane';
import { Header } from './components/Header';

type View = 'projects' | 'settings';

export function App() {
  const [view, setView] = useState<View>('projects');

  return (
    <div className="h-full flex flex-col bg-background text-foreground no-select">
      <Header view={view} onViewChange={setView} />
      <main className="flex-1 overflow-hidden">
        {view === 'projects' && <ProjectList />}
        {view === 'settings' && <SettingsPane />}
      </main>
    </div>
  );
}
