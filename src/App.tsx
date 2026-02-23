import { useState } from 'react';
import Dashboard from './components/Dashboard';
import CaseSystem from './components/CaseSystem';
import CheckForm from './features/CheckForm';
import LostForm from './features/LostForm';
import UrgentForm from './features/UrgentForm';
import DVForm from './features/DVForm';
import { Mode } from './types';

export default function App() {
  const [mode, setMode] = useState<Mode | null>(null);

  if (!mode) {
    return <Dashboard onSelectMode={setMode} />;
  }

  return (
    <CaseSystem mode={mode} onBack={() => setMode(null)}>
      {({ currentProject, updateProject, saveAll }) => {
        if (mode === 'check') {
          return (
            <CheckForm 
              currentProject={currentProject} 
              updateProject={updateProject} 
              saveAll={saveAll} 
            />
          );
        }
        if (mode === 'lost') {
          return (
            <LostForm 
              currentProject={currentProject} 
              updateProject={updateProject} 
              saveAll={saveAll} 
            />
          );
        }
        if (mode === 'urgent') {
          return (
            <UrgentForm 
              currentProject={currentProject} 
              updateProject={updateProject} 
              saveAll={saveAll} 
            />
          );
        }
        if (mode === 'dv') {
          return (
            <DVForm 
              currentProject={currentProject} 
              updateProject={updateProject} 
              saveAll={saveAll} 
            />
          );
        }
        return null;
      }}
    </CaseSystem>
  );
}
