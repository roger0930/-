import { useState } from 'react';
import { Project, Person } from '../types';
import PhotoUploader from '../components/PhotoUploader';
import { performOCR, parseOCRData, calculateAge } from '../utils/ocr';
import html2canvas from 'html2canvas';
import { Loader2, Trash2, AlertTriangle, Shield, Gavel, FileText, Activity, X } from 'lucide-react';

interface DVFormProps {
  currentProject: Project;
  updateProject: (p: Project) => void;
  saveAll: () => void;
}

export default function DVForm({ currentProject, updateProject, saveAll }: DVFormProps) {
  const [loading, setLoading] = useState(false);
  const [tipvdaModalOpen, setTipvdaModalOpen] = useState(false);
  const [currentTipvdaUid, setCurrentTipvdaUid] = useState<string | null>(null);

  // Helper to access dvData safely
  const dvData = currentProject.dvData || {
    mutual: false, time: '', loc: '桃園市桃園區', rel: '', cause: '', hasMinor: false, minors: []
  };

  const updateDvData = (updates: any) => {
    updateProject({ ...currentProject, dvData: { ...dvData, ...updates } });
  };

  const updatePerson = (index: number, updates: Partial<Person>) => {
    const newData = [...currentProject.data];
    newData[index] = { ...newData[index], ...updates };
    updateProject({ ...currentProject, data: newData });
  };

  const addPerson = () => {
    const newPerson: Person = {
      uid: Date.now().toString(),
      name: '', role: '對象', isForeign: false, isMinor: false, imgs: []
    };
    updateProject({ ...currentProject, data: [...currentProject.data, newPerson] });
  };

  const removePerson = (index: number) => {
    if (confirm('刪除此人？')) {
      const newData = [...currentProject.data];
      newData.splice(index, 1);
      updateProject({ ...currentProject, data: newData });
    }
  };

  const toggleMutual = () => {
    const newMutual = !dvData.mutual;
    updateDvData({ mutual: newMutual });
    
    // Update roles
    const newData = currentProject.data.map((p, idx) => {
      let role = p.role;
      if (newMutual) {
        role = `對象 ${idx + 1}`;
      } else {
        role = idx === 0 ? '被害人' : '相對人';
      }
      return { ...p, role };
    });
    updateProject({ ...currentProject, dvData: { ...dvData, mutual: newMutual }, data: newData });
  };

  const handleOCR = async (index: number, file: File, isForeign: boolean) => {
    setLoading(true);
    try {
      const { text, lines } = await performOCR(file, isForeign);
      const parsed = parseOCRData(text, lines, isForeign);
      
      const updates: Partial<Person> = { ...parsed };
      if (parsed.dob) {
        const age = calculateAge(parsed.dob);
        if (age !== null) {
          updates.age = age.toString();
          if (age < 18) updates.isMinor = true;
        }
      }
      updatePerson(index, updates);
    } catch (e) {
      alert('辨識失敗');
    } finally {
      setLoading(false);
    }
  };

  const setTimeNow = () => {
    const n = new Date();
    const timeStr = `${n.getFullYear()-1911}年${(n.getMonth()+1).toString().padStart(2,'0')}月${n.getDate().toString().padStart(2,'0')}日${n.getHours().toString().padStart(2,'0')}時${n.getMinutes().toString().padStart(2,'0')}分`;
    updateDvData({ time: timeStr });
  };

  // TIPVDA Logic
  const openTipvda = (uid: string) => {
    setCurrentTipvdaUid(uid);
    setTipvdaModalOpen(true);
  };

  const saveTipvda = (data: any, score: number, selfScore: number, selfDesc: string) => {
    const idx = currentProject.data.findIndex(p => p.uid === currentTipvdaUid);
    if (idx !== -1) {
      updatePerson(idx, {
        tipvdaData: JSON.stringify(data),
        tipvdaScore: score,
        selfScore,
        selfDesc
      });
    }
    setTipvdaModalOpen(false);
  };

  const generateRiskCard = async () => {
    setLoading(true);
    const temp = document.createElement('div');
    temp.style.position = 'absolute';
    temp.style.left = '-9999px';
    temp.style.width = '700px'; // Wider for DV card
    document.body.appendChild(temp);

    try {
      const color = '#6a1b9a'; // Purple
      const people = currentProject.data;
      
      // Check high risk
      let isHighRisk = false;
      people.forEach(p => {
        if ((p.tipvdaScore || 0) >= 5 || (p.selfScore || 0) >= 8) isHighRisk = true;
      });
      
      const displayColor = isHighRisk ? '#d32f2f' : color;
      const titleText = isHighRisk ? '⚠️ 婦幼案摘 - [高危機]' : '🛡️ 婦幼案摘 - [一般]';

      let peopleHtml = '';
      people.forEach(p => {
        const isPersonHighRisk = (p.tipvdaScore || 0) >= 5 || (p.selfScore || 0) >= 8;
        const borderColor = isPersonHighRisk ? '#d32f2f' : '#999';
        
        // Tags
        let tagsHtml = '';
        if (p.tagPhy) tagsHtml += `<span style="background:#d32f2f; color:white; padding:2px 6px; border-radius:4px; font-size:12px; margin-right:4px;">肢體暴力</span>`;
        if (p.tagMen) tagsHtml += `<span style="background:#d32f2f; color:white; padding:2px 6px; border-radius:4px; font-size:12px; margin-right:4px;">精神暴力</span>`;
        if (p.tagEco) tagsHtml += `<span style="background:#d32f2f; color:white; padding:2px 6px; border-radius:4px; font-size:12px; margin-right:4px;">經濟暴力</span>`;
        
        let infoRows = '';
        if (p.isForeign) {
           infoRows = `
             <div><b>${p.ename || ''}</b> (${p.nation || ''})</div>
             <div style="font-size:13px;">中文: ${p.cname || '-'} / 居留: ${p.arc || '-'} / 護照: ${p.passport || '-'}</div>
             <div style="font-size:13px;">電話: ${p.phonef || ''}</div>
           `;
        } else {
           infoRows = `
             <div><b>${p.name || ''}</b> ${p.isMinor ? '(未成年)' : ''}</div>
             <div style="font-size:13px;">身分證: ${p.id || ''} / 生日: ${p.dob || ''} (${p.age || ''}歲)</div>
             <div style="font-size:13px;">電話: ${p.phone || ''}</div>
           `;
        }

        peopleHtml += `
          <div style="border:2px solid ${borderColor}; border-radius:6px; overflow:hidden; background:#fff; display:flex; flex-direction:column;">
            <div style="background:#f3e5f5; color:#6a1b9a; font-size:13px; font-weight:bold; padding:4px 10px; border-bottom:1px solid #eee;">
              📌 ${p.role}
            </div>
            <div style="padding:10px; flex:1;">
              ${infoRows}
              ${p.memo ? `<div style="font-size:12px; color:#666; border-top:1px dashed #ccc; margin-top:2px;">註: ${p.memo}</div>` : ''}
              <div style="margin-top:5px;">${tagsHtml}</div>
              ${p.injury ? `<div style="font-size:12px; color:#d32f2f; font-weight:bold; margin-top:6px;">🤕 受傷：${p.injury}</div>` : ''}
            </div>
          </div>
        `;
      });

      const now = new Date();
      const dateStr = `${now.getFullYear()-1911}/${(now.getMonth()+1).toString().padStart(2,'0')}/${now.getDate().toString().padStart(2,'0')} ${now.getHours().toString().padStart(2,'0')}:${now.getMinutes().toString().padStart(2,'0')}`;

      temp.innerHTML = `
        <div style="width:700px; background:#fff; border:4px solid ${displayColor}; font-family:sans-serif;">
            <div style="background:${displayColor}; color:white; padding:10px; text-align:center; font-weight:bold; font-size:20px;">
                ${titleText} ${dvData.mutual ? '(互控)' : ''}
            </div>
            <div style="padding:15px;">
                <div style="text-align:right; font-size:12px; color:#666; margin-bottom:10px;">製表時間: ${dateStr}</div>
                
                <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px; margin-bottom:15px;">
                    ${peopleHtml}
                </div>

                <div style="border:2px solid #999; border-radius:6px; padding:10px; margin-bottom:10px; background:#fff;">
                    <div style="font-weight:bold; color:#333; border-bottom:1px dashed #999; margin-bottom:5px; padding-bottom:2px;">【具體事實】</div>
                    <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px; font-size:13px; margin-bottom:5px;">
                        <div><b>時間：</b>${dvData.time}</div>
                        <div><b>地點：</b>${dvData.loc}</div>
                    </div>
                    <div style="font-size:13px; margin-bottom:5px;"><b>關係：</b>${dvData.rel}</div>
                    <div style="font-size:13px; line-height:1.5;"><b>發生原因：</b>${dvData.cause || '(未輸入)'}</div>
                </div>
            </div>
        </div>
      `;

      const canvas = await html2canvas(temp, { scale: 2, useCORS: true });
      const link = document.createElement('a');
      link.download = `${currentProject.name}_案摘.jpg`;
      link.href = canvas.toDataURL('image/jpeg', 0.9);
      link.click();

      // Generate TIPVDA cards for each person who has data
      // (Simplified: In real app we would loop and generate multiple)
      
    } catch (e) {
      console.error(e);
      alert('匯出失敗');
    } finally {
      document.body.removeChild(temp);
      setLoading(false);
    }
  };

  return (
    <div>
      {loading && (
        <div className="fixed inset-0 bg-black/80 z-[9999] flex flex-col items-center justify-center text-white">
          <Loader2 className="animate-spin mb-2" size={32} />
          <h3>處理中...</h3>
        </div>
      )}

      {tipvdaModalOpen && (
        <TipvdaModal 
          uid={currentTipvdaUid!} 
          initialData={currentProject.data.find(p => p.uid === currentTipvdaUid)?.tipvdaData}
          onSave={saveTipvda}
          onClose={() => setTipvdaModalOpen(false)}
        />
      )}

      <div className="space-y-3">
        <label className={`flex items-center justify-center p-2 rounded border-2 font-bold cursor-pointer transition-colors ${dvData.mutual ? 'bg-orange-500 text-white border-orange-500' : 'bg-white text-orange-500 border-orange-500'}`}>
           <input type="checkbox" className="hidden" checked={dvData.mutual} onChange={toggleMutual} />
           👊 本案為互控案件
        </label>

        {currentProject.data.map((person, idx) => (
          <div key={person.uid} className="bg-white rounded-lg border border-purple-300 overflow-hidden shadow-sm">
            <div className="bg-slate-100 p-2 font-bold flex justify-between items-center border-b border-slate-200 text-purple-900">
              <span>({idx + 1}) {person.role} {person.name ? `- ${person.name}` : ''}</span>
            </div>
            
            <div className="p-2 space-y-2">
              <div className="flex gap-2 mb-2">
                <label className={`flex-1 flex items-center justify-center border rounded p-1 cursor-pointer text-xs font-bold ${person.isForeign ? 'bg-blue-900 text-white border-blue-900' : 'bg-white text-slate-600'}`}>
                  <input type="checkbox" className="hidden" checked={person.isForeign} onChange={(e) => updatePerson(idx, { isForeign: e.target.checked })} />
                  外籍
                </label>
                <label className={`flex-1 flex items-center justify-center border rounded p-1 cursor-pointer text-xs font-bold ${person.isMinor ? 'bg-red-600 text-white border-red-600' : 'bg-white text-slate-600'}`}>
                  <input type="checkbox" className="hidden" checked={person.isMinor} onChange={(e) => updatePerson(idx, { isMinor: e.target.checked })} />
                  未成年
                </label>
              </div>

              {!person.isForeign ? (
                <>
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <label className="block text-[10px] font-bold text-slate-500">姓名</label>
                      <input type="text" value={person.name} onChange={(e) => updatePerson(idx, { name: e.target.value })} className="w-full border border-slate-300 rounded px-2 py-1 text-sm" />
                    </div>
                    <div className="flex-1 flex items-end">
                       <label className="block w-full bg-blue-900 text-white text-center rounded py-1 text-xs font-bold cursor-pointer">
                          M-Police 辨識
                          <input type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => e.target.files?.[0] && handleOCR(idx, e.target.files[0], false)} />
                       </label>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <label className="block text-[10px] font-bold text-slate-500">生日</label>
                      <input type="text" value={person.dob || ''} placeholder="年/月/日" onChange={(e) => { const val = e.target.value; const age = calculateAge(val); updatePerson(idx, { dob: val, age: age ? age.toString() : person.age, isMinor: (age !== null && age < 18) }); }} className="w-full border border-slate-300 rounded px-2 py-1 text-sm" />
                    </div>
                    <div className="flex-1">
                      <label className="block text-[10px] font-bold text-slate-500">年齡</label>
                      <input type="text" readOnly value={person.age || ''} className="w-full border border-slate-300 rounded px-2 py-1 text-sm bg-slate-100" />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <label className="block text-[10px] font-bold text-slate-500">身分證</label>
                      <input type="text" value={person.id || ''} onChange={(e) => updatePerson(idx, { id: e.target.value })} className="w-full border border-slate-300 rounded px-2 py-1 text-sm" />
                    </div>
                    <div className="flex-1">
                      <label className="block text-[10px] font-bold text-slate-500">電話</label>
                      <input type="tel" value={person.phone || ''} onChange={(e) => updatePerson(idx, { phone: e.target.value })} className="w-full border border-slate-300 rounded px-2 py-1 text-sm" />
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <label className="block text-[10px] font-bold text-slate-500">國籍</label>
                      <input type="text" value={person.nation || ''} onChange={(e) => updatePerson(idx, { nation: e.target.value })} className="w-full border border-slate-300 rounded px-2 py-1 text-sm" />
                    </div>
                    <div className="flex-1 flex items-end">
                       <label className="block w-full bg-blue-900 text-white text-center rounded py-1 text-xs font-bold cursor-pointer">
                          M-Police 辨識
                          <input type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => e.target.files?.[0] && handleOCR(idx, e.target.files[0], true)} />
                       </label>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <label className="block text-[10px] font-bold text-slate-500">英文名</label>
                      <input type="text" value={person.ename || ''} onChange={(e) => updatePerson(idx, { ename: e.target.value })} className="w-full border border-slate-300 rounded px-2 py-1 text-sm" />
                    </div>
                    <div className="flex-1">
                      <label className="block text-[10px] font-bold text-slate-500">中文名</label>
                      <input type="text" value={person.cname || ''} onChange={(e) => updatePerson(idx, { cname: e.target.value })} className="w-full border border-slate-300 rounded px-2 py-1 text-sm" />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <label className="block text-[10px] font-bold text-slate-500">居留證</label>
                      <input type="text" value={person.arc || ''} onChange={(e) => updatePerson(idx, { arc: e.target.value })} className="w-full border border-slate-300 rounded px-2 py-1 text-sm" />
                    </div>
                    <div className="flex-1">
                      <label className="block text-[10px] font-bold text-slate-500">護照</label>
                      <input type="text" value={person.passport || ''} onChange={(e) => updatePerson(idx, { passport: e.target.value })} className="w-full border border-slate-300 rounded px-2 py-1 text-sm" />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <label className="block text-[10px] font-bold text-slate-500">電話</label>
                      <input type="tel" value={person.phonef || ''} onChange={(e) => updatePerson(idx, { phonef: e.target.value })} className="w-full border border-slate-300 rounded px-2 py-1 text-sm" />
                    </div>
                  </div>
                </>
              )}

              {/* DV Specific Fields */}
              <div className="border-t border-dashed border-slate-300 pt-2 mt-2">
                 <label className="block text-xs font-bold text-purple-800 mb-1">⚠️ 受暴樣態</label>
                 <div className="flex gap-1 mb-2">
                    <button onClick={() => updatePerson(idx, { tagPhy: !person.tagPhy })} className={`flex-1 py-1 text-xs border rounded ${person.tagPhy ? 'bg-red-600 text-white' : 'bg-white'}`}>肢體</button>
                    <button onClick={() => updatePerson(idx, { tagMen: !person.tagMen })} className={`flex-1 py-1 text-xs border rounded ${person.tagMen ? 'bg-red-600 text-white' : 'bg-white'}`}>精神</button>
                    <button onClick={() => updatePerson(idx, { tagEco: !person.tagEco })} className={`flex-1 py-1 text-xs border rounded ${person.tagEco ? 'bg-red-600 text-white' : 'bg-white'}`}>經濟</button>
                 </div>
                 
                 {(person.tagPhy) && (
                    <div className="mb-2">
                       <label className="text-[10px] text-slate-500">🤕 受傷位置</label>
                       <input type="text" value={person.injury || ''} onChange={(e) => updatePerson(idx, { injury: e.target.value })} className="w-full border rounded px-1 text-sm" />
                    </div>
                 )}

                 <div className="flex gap-1 mb-2">
                    <button onClick={() => updatePerson(idx, { tagSuiIdea: !person.tagSuiIdea })} className={`flex-1 py-1 text-xs border rounded ${person.tagSuiIdea ? 'bg-purple-600 text-white' : 'bg-white'}`}>⚠️ 自殺意念</button>
                    <button onClick={() => updatePerson(idx, { tagSuiAct: !person.tagSuiAct })} className={`flex-1 py-1 text-xs border rounded ${person.tagSuiAct ? 'bg-purple-600 text-white' : 'bg-white'}`}>🚫 自殺行為</button>
                 </div>
                 <div className="flex gap-1 mb-2">
                    <button onClick={() => updatePerson(idx, { tagPo: !person.tagPo })} className={`flex-1 py-1 text-xs border rounded ${person.tagPo ? 'bg-purple-600 text-white' : 'bg-white'}`}>📜 申請保護令</button>
                    <button onClick={() => updatePerson(idx, { tagLaw: !person.tagLaw })} className={`flex-1 py-1 text-xs border rounded ${person.tagLaw ? 'bg-purple-600 text-white' : 'bg-white'}`}>⚖️ 提告</button>
                 </div>

                 <button 
                   onClick={() => openTipvda(person.uid)}
                   className={`w-full py-2 rounded border font-bold text-xs mb-2 ${person.tipvdaScore && person.tipvdaScore >= 5 ? 'bg-red-600 text-white' : (person.tipvdaScore ? 'bg-purple-600 text-white' : 'bg-white text-slate-600 border-slate-300')}`}
                 >
                   {person.tipvdaScore ? `⚠️ TIPVDA: ${person.tipvdaScore}分 / 自評: ${person.selfScore}分` : '⚠️ 評估 TIPVDA 量表'}
                 </button>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500">備註</label>
                <textarea 
                  value={person.memo || ''}
                  onChange={(e) => updatePerson(idx, { memo: e.target.value })}
                  className="w-full border border-slate-300 rounded px-2 py-1 text-sm h-16"
                />
              </div>

              <button 
                onClick={() => removePerson(idx)}
                className="w-full text-red-500 border border-red-500 rounded py-2 mt-2 font-bold text-xs flex items-center justify-center gap-1"
              >
                <Trash2 size={12} /> 刪除此對象
              </button>
            </div>
          </div>
        ))}

        <button 
          onClick={addPerson}
          className="w-full border-2 border-dashed border-purple-900 text-purple-900 font-bold py-3 rounded-lg bg-white"
        >
          ＋ 新增對象
        </button>

        {/* Case Info */}
        <div className="bg-white p-3 rounded-lg border-2 border-purple-600 mt-4">
           <div className="font-bold text-purple-800 border-b pb-2 mb-2">📂 具體事實</div>
           <div className="space-y-2">
              <div className="flex gap-2">
                 <div className="flex-[2]">
                    <label className="text-[10px] text-slate-500">發生時間</label>
                    <input type="text" value={dvData.time} onChange={(e) => updateDvData({ time: e.target.value })} className="w-full border rounded px-1 text-sm" placeholder="(自動產生)" />
                 </div>
                 <button onClick={setTimeNow} className="bg-purple-600 text-white text-xs px-2 rounded h-8 mt-4">現在</button>
              </div>
              <div>
                 <label className="text-[10px] text-slate-500">發生地點</label>
                 <input type="text" value={dvData.loc} onChange={(e) => updateDvData({ loc: e.target.value })} className="w-full border rounded px-1 text-sm" />
              </div>
              <div>
                 <label className="text-[10px] text-slate-500">兩造關係</label>
                 <input type="text" value={dvData.rel} onChange={(e) => updateDvData({ rel: e.target.value })} className="w-full border rounded px-1 text-sm" placeholder="例：夫妻、父子" />
              </div>
              <div>
                 <label className="text-[10px] text-slate-500">發生原因</label>
                 <textarea value={dvData.cause} onChange={(e) => updateDvData({ cause: e.target.value })} className="w-full border rounded px-1 text-sm h-16" placeholder="請輸入案發原因..." />
              </div>
           </div>
        </div>

        <button onClick={generateRiskCard} className="w-full bg-purple-800 text-white font-bold py-3 rounded-lg shadow-sm mt-4">
            📃 產生風險圖卡
        </button>
      </div>
    </div>
  );
}

// TIPVDA Modal Component
function TipvdaModal({ uid, initialData, onSave, onClose }: { uid: string, initialData: string | undefined, onSave: any, onClose: any }) {
  const [data, setData] = useState<any>(initialData ? JSON.parse(initialData) : { main: {}, sub: {}, risk: 0, durY: '', durM: '' });
  
  const toggleMain = (idx: number) => {
    const newData = { ...data, main: { ...data.main, [idx]: !data.main[idx] } };
    setData(newData);
  };

  const toggleSub = (key: string) => {
    const newData = { ...data, sub: { ...data.sub, [key]: !data.sub[key] } };
    // Auto check Q2 if any sub is checked
    const hasSub = Object.values(newData.sub).some(v => v);
    newData.main[2] = hasSub;
    setData(newData);
  };

  const score = Object.values(data.main).filter(v => v).length;
  
  const getRiskDesc = (val: number) => {
    if (val > 7) return "非常危險";
    if (val > 5) return "頗危險";
    if (val > 3) return "有些危險";
    return "不怎麼危險";
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-end justify-center sm:items-center">
      <div className="bg-white w-full max-w-md h-[90%] sm:h-auto sm:max-h-[90%] sm:rounded-lg rounded-t-xl flex flex-col animate-in slide-in-from-bottom-10">
        <div className="bg-purple-800 text-white p-3 font-bold flex justify-between items-center rounded-t-xl">
          <span>📝 TIPVDA 評估</span>
          <X className="cursor-pointer" onClick={onClose} />
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <div className="border-b pb-2">
            <label className="font-bold text-slate-600">※ 遭受暴力持續時間</label>
            <div className="flex items-center gap-2 mt-2">
              <input type="number" className="w-16 border rounded text-center" placeholder="0" value={data.durY} onChange={(e) => setData({...data, durY: e.target.value})} /> 年
              <input type="number" className="w-16 border rounded text-center" placeholder="0" value={data.durM} onChange={(e) => setData({...data, durM: e.target.value})} /> 個月
            </div>
          </div>

          <div className="bg-slate-100 p-2 text-xs text-slate-600 rounded">
            每題「有」計 1 分。<b>※ 5 分 (含) 以上為高危機。</b>
          </div>

          <div className="space-y-2 text-sm">
            {[
              "1. 對方曾做出危險動作傷害或威脅 (如拿刀、槍、棍棒、開車衝撞...)?",
              "2. 對方曾對你有不能呼吸的暴力行為 (勒頸/悶臉/按頭入水...)?",
              "3. 對方曾在住處以外的地方對你有過肢體暴力?",
              "4. 對方曾對家人以外的人施以肢體暴力?",
              "5. 對方曾未經你同意強行把你帶走或關起來?",
              "6. 對方曾揚言或威脅要殺掉你?",
              "7. 你相信對方有可能殺掉你?",
              "8. 過去一年中，對方對你愈打愈嚴重或愈打愈頻繁?"
            ].map((q, i) => (
              <div key={i} className="border-b pb-2">
                <div className="flex justify-between items-start gap-2">
                  <div className="flex-1">{q}</div>
                  <input type="checkbox" className="w-5 h-5 accent-purple-600" checked={data.main[i+1] || false} onChange={() => toggleMain(i+1)} disabled={i===1} />
                </div>
                {i === 1 && (
                  <div className="grid grid-cols-2 gap-2 mt-2 bg-slate-50 p-2 rounded text-xs">
                    {['勒/掐脖子', '悶臉部', '按頭入水', '開瓦斯', '其他'].map((sub, si) => (
                      <label key={si} className="flex items-center gap-1">
                        <input type="checkbox" checked={data.sub[`2${String.fromCharCode(97+si)}`] || false} onChange={() => toggleSub(`2${String.fromCharCode(97+si)}`)} /> {sub}
                      </label>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="border-t pt-4">
            <label className="font-bold">※ 被害人自評危險程度 (0-10)</label>
            <input 
              type="range" min="0" max="10" 
              className="w-full mt-2 accent-purple-600"
              value={data.risk} 
              onChange={(e) => setData({...data, risk: parseInt(e.target.value)})} 
            />
            <div className={`text-center font-bold p-2 mt-2 rounded border ${data.risk > 7 ? 'bg-red-50 text-red-600 border-red-200' : 'bg-slate-50 text-slate-600'}`}>
              {data.risk} 分 ({getRiskDesc(data.risk)})
            </div>
          </div>
        </div>

        <div className="p-3 border-t bg-slate-50 flex justify-between items-center rounded-b-xl">
          <span className="font-bold">總分：{score} 分</span>
          <button 
            onClick={() => onSave(data, score, data.risk, getRiskDesc(data.risk))}
            className="bg-purple-800 text-white px-4 py-2 rounded font-bold"
          >
            確認儲存
          </button>
        </div>
      </div>
    </div>
  );
}
