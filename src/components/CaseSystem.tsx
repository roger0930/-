import { useState, useEffect, ReactNode } from 'react';
import { Mode, Project, THEME_COLORS } from '../types';
import { getProjects, saveProjects } from '../utils/storage';
import { Menu, X, Home, Trash2, Edit2, Plus } from 'lucide-react';

interface CaseSystemProps {
  mode: Mode;
  onBack: () => void;
  children: (props: { 
    currentProject: Project | null; 
    updateProject: (p: Project) => void;
    saveAll: () => void;
  }) => ReactNode;
}

export default function CaseSystem({ mode, onBack, children }: CaseSystemProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [currentProjectId, setCurrentProjectId] = useState<number | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const themeColor = THEME_COLORS[mode];

  useEffect(() => {
    const data = getProjects(mode);
    setProjects(data);
  }, [mode]);

  const currentProject = projects.find(p => p.id === currentProjectId) || null;

  const handleSaveAll = () => {
    saveProjects(mode, projects);
  };

  const updateProject = (updatedProject: Project) => {
    setProjects(prev => prev.map(p => p.id === updatedProject.id ? updatedProject : p));
    // Auto save is handled by effect or manual call, but here we update state
    // We should also save to storage immediately for safety
    const newProjects = projects.map(p => p.id === updatedProject.id ? updatedProject : p);
    saveProjects(mode, newProjects);
  };

  const createNewProject = () => {
    const now = new Date();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const defaultName = `${mm}${dd}`;
    const name = prompt(`請輸入案件名稱：`, defaultName);
    if (!name) return;

    const newProj: Project = { 
      id: Date.now(), 
      type: mode, 
      name, 
      data: [] 
    };
    
    // Initialize specific data structures if needed
    if (mode === 'lost') {
      newProj.data = [{
        uid: Date.now().toString(),
        isForeign: false, isMinor: false, imgs: [],
        caseTypes: ['迷失老人'], statuses: [],
        name: '', id: '', dob: '', age: '', phone: '', address: '',
        ename: '', cname: '', nation: '', arc: '', passport: '', phonef: '',
        contacts: '', memo: ''
      }];
    } else if (mode === 'dv') {
        newProj.dvData = {
            mutual: false,
            time: '',
            loc: '桃園市桃園區',
            rel: '',
            cause: '',
            hasMinor: false,
            minors: []
        };
        // Add default Victim and Opponent
        newProj.data = [
            { uid: Date.now() + '1', name: '', role: '被害人', isForeign: false, isMinor: false, imgs: [] },
            { uid: Date.now() + '2', name: '', role: '相對人', isForeign: false, isMinor: false, imgs: [] }
        ];
    }

    const updatedProjects = [...projects, newProj];
    setProjects(updatedProjects);
    saveProjects(mode, updatedProjects);
    setCurrentProjectId(newProj.id);
    setIsSidebarOpen(false);
  };

  const deleteProject = (id: number) => {
    if (confirm('確定要刪除此案件嗎？無法復原。')) {
      const updated = projects.filter(p => p.id !== id);
      setProjects(updated);
      saveProjects(mode, updated);
      if (currentProjectId === id) setCurrentProjectId(null);
    }
  };

  const renameProject = (id: number) => {
    const proj = projects.find(p => p.id === id);
    if (!proj) return;
    const newName = prompt("請輸入新的案件名稱：", proj.name);
    if (newName && newName.trim() !== "") {
      const updated = { ...proj, name: newName.trim() };
      updateProject(updated);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-slate-100 font-sans text-sm overflow-hidden">
      {/* Sidebar */}
      <div 
        className={`fixed inset-y-0 left-0 w-60 bg-slate-800 text-white transform transition-transform duration-300 z-50 flex flex-col ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <div className="p-4 font-bold flex justify-between items-center" style={{ backgroundColor: themeColor }}>
          <span>案件列表</span>
          <X className="cursor-pointer" onClick={() => setIsSidebarOpen(false)} />
        </div>
        
        <div className="flex-1 overflow-y-auto p-2">
          <button 
            onClick={createNewProject}
            className="w-full p-2 mb-2 bg-yellow-500 text-black font-bold rounded flex items-center justify-center gap-2"
          >
            <Plus size={16} /> 新增案件
          </button>
          
          <button 
            onClick={onBack}
            className="w-full p-2 mb-4 bg-slate-600 text-white font-bold rounded flex items-center justify-center gap-2 border border-slate-500"
          >
            <Home size={16} /> 回主選單
          </button>

          <div className="space-y-1">
            {projects.map(p => (
              <div 
                key={p.id}
                className={`flex items-center justify-between p-2 rounded cursor-pointer ${p.id === currentProjectId ? 'text-white' : 'bg-slate-700 text-slate-200'}`}
                style={{ backgroundColor: p.id === currentProjectId ? themeColor : undefined }}
              >
                <div 
                  className="flex-1 truncate mr-2"
                  onClick={() => { setCurrentProjectId(p.id); setIsSidebarOpen(false); }}
                >
                  {p.name}
                </div>
                <div className="flex gap-1">
                  <Edit2 size={14} className="cursor-pointer hover:text-yellow-400" onClick={() => renameProject(p.id)} />
                  <Trash2 size={14} className="cursor-pointer hover:text-red-400" onClick={() => deleteProject(p.id)} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Overlay */}
      {isSidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-40" onClick={() => setIsSidebarOpen(false)}></div>
      )}

      {/* Top Bar */}
      <div 
        className="text-white p-2 flex items-center gap-3 shadow-md z-30"
        style={{ backgroundColor: themeColor }}
      >
        <Menu className="cursor-pointer" onClick={() => setIsSidebarOpen(true)} />
        <div className="flex-1 font-bold text-center truncate">
          {currentProject ? currentProject.name : '請選取案件'}
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-2 pb-20 relative">
        {currentProject ? (
          children({ currentProject, updateProject, saveAll: handleSaveAll })
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-slate-400">
            <h3 className="text-lg font-bold mb-2">👋 歡迎使用</h3>
            <p className="text-center mb-4">請建立或選擇案件<br/>以開始作業</p>
            <button 
              onClick={createNewProject}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg font-bold shadow-lg active:scale-95 transition-transform flex items-center gap-2"
              style={{ backgroundColor: themeColor }}
            >
              <Plus size={20} /> 建立新案件
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
