import { Mode } from '../types';

interface DashboardProps {
  onSelectMode: (mode: Mode) => void;
}

export default function Dashboard({ onSelectMode }: DashboardProps) {
  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-slate-900 to-slate-800 text-slate-100 font-sans overflow-hidden">
      {/* Header */}
      <div className="p-4 text-center bg-slate-900/90 backdrop-blur border-b border-white/10 z-10">
        <h1 className="m-0 text-xl tracking-wide font-bold">外勤整合系統</h1>
        <div className="text-xs text-blue-400 mt-1 font-bold">TACTICAL INTEGRATION</div>
      </div>

      {/* Main Menu */}
      <div className="flex-1 flex flex-col justify-center items-center p-5 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="grid grid-cols-2 gap-4 w-full max-w-md">
          
          <div 
            onClick={() => onSelectMode('check')}
            className="bg-slate-800/70 border border-white/5 rounded-2xl p-5 flex flex-col items-center justify-center cursor-pointer relative overflow-hidden shadow-lg active:scale-95 transition-transform hover:bg-slate-700/50 group"
          >
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500 opacity-80"></div>
            <div className="text-3xl mb-2 drop-shadow-md group-hover:scale-110 transition-transform">📱</div>
            <div className="text-blue-400 font-bold text-base">一般盤查</div>
            <div className="text-[10px] text-slate-400 mt-1">Check System</div>
          </div>

          <div 
            onClick={() => onSelectMode('lost')}
            className="bg-slate-800/70 border border-white/5 rounded-2xl p-5 flex flex-col items-center justify-center cursor-pointer relative overflow-hidden shadow-lg active:scale-95 transition-transform hover:bg-slate-700/50 group"
          >
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-orange-500 opacity-80"></div>
            <div className="text-3xl mb-2 drop-shadow-md group-hover:scale-110 transition-transform">🍄</div>
            <div className="text-orange-400 font-bold text-base">怪人協會</div>
            <div className="text-[10px] text-slate-400 mt-1">Lost Person</div>
          </div>

          <div 
            onClick={() => onSelectMode('dv')}
            className="bg-slate-800/70 border border-white/5 rounded-2xl p-5 flex flex-col items-center justify-center cursor-pointer relative overflow-hidden shadow-lg active:scale-95 transition-transform hover:bg-slate-700/50 group"
          >
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-purple-500 opacity-80"></div>
            <div className="text-3xl mb-2 drop-shadow-md group-hover:scale-110 transition-transform">🛡️</div>
            <div className="text-purple-400 font-bold text-base">婦幼系統</div>
            <div className="text-[10px] text-slate-400 mt-1">Domestic Violence</div>
          </div>

          <div 
            onClick={() => onSelectMode('urgent')}
            className="bg-slate-800/70 border border-white/5 rounded-2xl p-5 flex flex-col items-center justify-center cursor-pointer relative overflow-hidden shadow-lg active:scale-95 transition-transform hover:bg-slate-700/50 group"
          >
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-red-500 opacity-80"></div>
            <div className="text-3xl mb-2 drop-shadow-md group-hover:scale-110 transition-transform">🚨</div>
            <div className="text-red-400 font-bold text-base">急案個化</div>
            <div className="text-[10px] text-slate-400 mt-1">Urgent Case</div>
          </div>

        </div>

        <div className="mt-8 text-[10px] text-slate-600">
          v48.0 System Ready
        </div>
      </div>
    </div>
  );
}
