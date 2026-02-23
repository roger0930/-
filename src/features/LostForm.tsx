import { useState } from 'react';
import { Project, Person } from '../types';
import PhotoUploader from '../components/PhotoUploader';
import { performOCR, parseOCRData, calculateAge } from '../utils/ocr';
import html2canvas from 'html2canvas';
import { Loader2, Plus, X } from 'lucide-react';

interface LostFormProps {
  currentProject: Project;
  updateProject: (p: Project) => void;
  saveAll: () => void;
}

export default function LostForm({ currentProject, updateProject, saveAll }: LostFormProps) {
  const [loading, setLoading] = useState(false);
  
  // Lost system usually has only 1 person per case in the original code structure (proj.data[0]),
  // but the data structure allows array. The original code: `proj.data = [{...}]`.
  // We will assume index 0 is the main subject.
  const person = currentProject.data[0] || { uid: Date.now().toString(), name: '', isForeign: false, isMinor: false, imgs: [] };

  const updatePerson = (updates: Partial<Person>) => {
    const newData = [...currentProject.data];
    newData[0] = { ...person, ...updates };
    updateProject({ ...currentProject, data: newData });
  };

  const handleOCR = async (file: File, isForeign: boolean) => {
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
      updatePerson(updates);
    } catch (e) {
      alert('辨識失敗');
    } finally {
      setLoading(false);
    }
  };

  const toggleTag = (field: 'caseTypes' | 'statuses', value: string) => {
    const current = person[field] || [];
    const newTags = current.includes(value) 
      ? current.filter(t => t !== value)
      : [...current, value];
    updatePerson({ [field]: newTags });
  };

  const addContact = () => {
    const current = person.contacts || '';
    const newContact = `[]  `; // Placeholder format
    updatePerson({ contacts: current ? current + '\n' + newContact : newContact });
  };

  const updateContact = (idx: number, field: 'rel'|'name'|'tel', val: string) => {
    const lines = (person.contacts || '').split('\n');
    const line = lines[idx] || '[]  ';
    const match = line.match(/\[(.*?)\]\s*(.*?)\s*([\d\-\(\)\s]*)$/);
    
    let rel = match ? match[1] : '';
    let name = match ? match[2] : '';
    let tel = match ? match[3] : '';

    if (field === 'rel') rel = val;
    if (field === 'name') name = val;
    if (field === 'tel') tel = val;

    lines[idx] = `[${rel}] ${name} ${tel}`;
    updatePerson({ contacts: lines.join('\n') });
  };

  const removeContact = (idx: number) => {
    const lines = (person.contacts || '').split('\n');
    lines.splice(idx, 1);
    updatePerson({ contacts: lines.join('\n') });
  };

  const exportToScreenshots = async () => {
    setLoading(true);
    const temp = document.createElement('div');
    temp.style.position = 'absolute';
    temp.style.left = '-9999px';
    temp.style.width = '360px';
    document.body.appendChild(temp);

    try {
      const color = '#f57f17';
      const d = person;
      
      // Title logic
      let titleParts = [...(d.caseTypes || [])];
      if (titleParts.includes('其他') && d.caseTypeOther) {
        titleParts = titleParts.filter(t => t !== '其他');
        titleParts.push(d.caseTypeOther);
      }
      const cardTitle = titleParts.join(' / ') || '協尋案件';

      // Status logic
      let statParts = [...(d.statuses || [])];
      if (statParts.includes('其他') && d.statusOther) {
        statParts = statParts.filter(s => s !== '其他');
        statParts.push(d.statusOther);
      }
      const statusHtml = statParts.map(s => 
        `<span style="background:${color}; color:white; padding:2px 6px; border-radius:3px; font-weight:bold; margin-right:4px;">${s}</span>`
      ).join('');

      const contactsHtml = d.contacts ? d.contacts.split('\n').map(c => `<div>${c}</div>`).join('') : '<span style="color:#999">無</span>';

      let infoHtml = '';
      if (d.isForeign) {
         infoHtml = `
           <div style="display:flex; gap:4px; margin-bottom:4px;">
             <div style="flex:1"><div style="font-size:10px; color:#e65100; font-weight:bold;">英文名</div><div style="font-weight:bold; font-size:13px;">${d.ename || ''}</div></div>
             <div style="flex:1"><div style="font-size:10px; color:#e65100; font-weight:bold;">中文名</div><div style="font-weight:bold; font-size:13px;">${d.cname || ''}</div></div>
           </div>
           <div style="display:flex; gap:4px; margin-bottom:4px;">
             <div style="flex:1"><div style="font-size:10px; color:#e65100; font-weight:bold;">國籍</div><div style="font-weight:bold; font-size:13px;">${d.nation || ''}</div></div>
             <div style="flex:1"><div style="font-size:10px; color:#e65100; font-weight:bold;">年齡</div><div style="font-weight:bold; font-size:13px;">${d.age || ''}</div></div>
           </div>
           <div style="display:flex; gap:4px; margin-bottom:4px;">
             <div style="flex:1"><div style="font-size:10px; color:#e65100; font-weight:bold;">居留證</div><div style="font-weight:bold; font-size:13px;">${d.arc || ''}</div></div>
             <div style="flex:1"><div style="font-size:10px; color:#e65100; font-weight:bold;">護照</div><div style="font-weight:bold; font-size:13px;">${d.passport || ''}</div></div>
           </div>
           <div style="display:flex; gap:4px; margin-bottom:4px;">
             <div style="flex:1"><div style="font-size:10px; color:#e65100; font-weight:bold;">電話</div><div style="font-weight:bold; font-size:13px;">${d.phonef || ''}</div></div>
           </div>
         `;
      } else {
         infoHtml = `
           <div style="margin-bottom:4px;">
             <div style="font-size:10px; color:#e65100; font-weight:bold;">姓名</div><div style="font-weight:bold; font-size:18px;">${d.name || ''}</div>
           </div>
           <div style="display:flex; gap:4px; margin-bottom:4px;">
             <div style="flex:1"><div style="font-size:10px; color:#e65100; font-weight:bold;">生日</div><div style="font-weight:bold; font-size:13px;">${d.dob || ''}</div></div>
             <div style="flex:1"><div style="font-size:10px; color:#e65100; font-weight:bold;">年齡</div><div style="font-weight:bold; font-size:13px;">${d.age || ''}</div></div>
           </div>
           <div style="display:flex; gap:4px; margin-bottom:4px;">
             <div style="flex:1"><div style="font-size:10px; color:#e65100; font-weight:bold;">身分證</div><div style="font-weight:bold; font-size:13px;">${d.id || ''}</div></div>
             <div style="flex:1"><div style="font-size:10px; color:#e65100; font-weight:bold;">電話</div><div style="font-weight:bold; font-size:13px;">${d.phone || ''}</div></div>
           </div>
         `;
      }

      let photoHtml = '';
      if (d.imgs && d.imgs.length > 0) {
          photoHtml = `<div style="margin-top:8px; text-align:center;">`;
          d.imgs.forEach(src => {
              photoHtml += `<img src="${src}" style="width:100%; border-radius:3px; border:1px solid #eee; margin-bottom:2px;">`;
          });
          photoHtml += `</div>`;
      }

      const now = new Date();
      const timeStr = `${now.getFullYear()-1911}/${(now.getMonth()+1).toString().padStart(2,'0')}/${now.getDate().toString().padStart(2,'0')} ${now.getHours().toString().padStart(2,'0')}:${now.getMinutes().toString().padStart(2,'0')}`;

      temp.innerHTML = `
        <div style="padding:20px; background:#fff; border:5px solid ${color}; width:360px; font-family:sans-serif;">
            <div style="text-align:center; margin:0 0 10px 0; border-bottom:3px solid ${color}; padding-bottom:5px;">
                <span style="font-size:20px; font-weight:bold; color:${color};">${cardTitle}</span>
            </div>
            ${infoHtml}
            ${d.address ? `<div style="margin-top:5px; border-top:1px dashed #eee; padding-top:5px;"><div style="font-size:10px; color:#e65100; font-weight:bold;">住居所</div><div style="font-weight:bold; font-size:13px;">${d.address}</div></div>` : ''}
            ${statusHtml ? `<div style="margin-top:5px;">${statusHtml}</div>` : ''}
            <div style="margin-top:8px; padding:8px; background:#fff3e0; border:1px dashed ${color}; border-radius:4px;">
                <label style="color:${color}; border-bottom:1px solid #ffe0b2; margin-bottom:4px; font-size:10px; font-weight:bold; display:block;">聯絡人</label>
                <div style="font-weight:bold; color:#bf360c; font-size:12px;">${contactsHtml}</div>
            </div>
            ${d.memo ? `<div style="border-top:1px solid #eee; margin-top:5px; padding-top:2px; font-size:12px;"><b>備註：</b>${d.memo}</div>` : ''}
            ${photoHtml}
            <div style="text-align:right; font-size:10px; color:#999; margin-top:5px;">製表時間 ${timeStr}</div>
        </div>
      `;

      const canvas = await html2canvas(temp, { scale: 2, useCORS: true });
      const link = document.createElement('a');
      link.download = `${currentProject.name}_${d.name || '無名'}.jpg`;
      link.href = canvas.toDataURL('image/jpeg', 0.9);
      link.click();

    } catch (e) {
      console.error(e);
      alert('匯出失敗');
    } finally {
      document.body.removeChild(temp);
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      {loading && (
        <div className="fixed inset-0 bg-black/80 z-[9999] flex flex-col items-center justify-center text-white">
          <Loader2 className="animate-spin mb-2" size={32} />
          <h3>處理中...</h3>
        </div>
      )}

      <div className="bg-white rounded-lg border border-orange-300 overflow-hidden shadow-sm">
        <div className="p-3 space-y-3">
          
          {/* Case Types */}
          <div>
            <label className="block text-xs font-bold text-orange-800 mb-1">案件類型 (可多選)</label>
            <div className="flex flex-wrap gap-2">
              {['迷失老人', '精神異常', '遊民', '其他'].map(t => (
                <button
                  key={t}
                  onClick={() => toggleTag('caseTypes', t)}
                  className={`px-3 py-1 rounded text-xs font-bold border ${person.caseTypes?.includes(t) ? 'bg-orange-500 text-white border-orange-500' : 'bg-white text-orange-600 border-orange-200'}`}
                >
                  {t}
                </button>
              ))}
            </div>
            {person.caseTypes?.includes('其他') && (
              <input 
                type="text" 
                placeholder="請輸入自訂類型"
                value={person.caseTypeOther || ''}
                onChange={(e) => updatePerson({ caseTypeOther: e.target.value })}
                className="w-full mt-2 border border-orange-300 rounded px-2 py-1 text-sm"
              />
            )}
          </div>

          <div className="border-t border-orange-100 pt-2">
            <label className="block text-xs font-bold text-slate-500 mb-2">基本資料</label>
            <div className="flex gap-2 mb-2">
              <label className={`flex-1 flex items-center justify-center border rounded p-1 cursor-pointer text-xs font-bold ${person.isForeign ? 'bg-orange-600 text-white border-orange-600' : 'bg-white text-slate-600'}`}>
                <input type="checkbox" className="hidden" checked={person.isForeign} onChange={(e) => updatePerson({ isForeign: e.target.checked })} />
                外籍
              </label>
              <label className={`flex-1 flex items-center justify-center border rounded p-1 cursor-pointer text-xs font-bold ${person.isMinor ? 'bg-red-600 text-white border-red-600' : 'bg-white text-slate-600'}`}>
                <input type="checkbox" className="hidden" checked={person.isMinor} onChange={(e) => updatePerson({ isMinor: e.target.checked })} />
                未成年
              </label>
            </div>

            {!person.isForeign ? (
               <>
                 <div className="flex gap-2 mb-2">
                    <div className="flex-1">
                      <label className="block text-[10px] font-bold text-slate-500">姓名</label>
                      <input type="text" value={person.name} onChange={(e) => updatePerson({ name: e.target.value })} className="w-full border border-slate-300 rounded px-2 py-1 text-sm" />
                    </div>
                    <div className="flex-1 flex items-end">
                       <label className="block w-full bg-blue-900 text-white text-center rounded py-1 text-xs font-bold cursor-pointer">
                          M-Police 辨識
                          <input type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => e.target.files?.[0] && handleOCR(e.target.files[0], false)} />
                       </label>
                    </div>
                 </div>
                 <div className="flex gap-2 mb-2">
                    <div className="flex-1">
                      <label className="block text-[10px] font-bold text-slate-500">生日</label>
                      <input type="text" value={person.dob || ''} placeholder="年/月/日" onChange={(e) => { const val = e.target.value; const age = calculateAge(val); updatePerson({ dob: val, age: age ? age.toString() : person.age, isMinor: (age !== null && age < 18) }); }} className="w-full border border-slate-300 rounded px-2 py-1 text-sm" />
                    </div>
                    <div className="flex-1">
                      <label className="block text-[10px] font-bold text-slate-500">年齡</label>
                      <input type="text" readOnly value={person.age || ''} className="w-full border border-slate-300 rounded px-2 py-1 text-sm bg-slate-100" />
                    </div>
                 </div>
                 <div className="flex gap-2 mb-2">
                    <div className="flex-1">
                      <label className="block text-[10px] font-bold text-slate-500">身分證</label>
                      <input type="text" value={person.id || ''} onChange={(e) => updatePerson({ id: e.target.value })} className="w-full border border-slate-300 rounded px-2 py-1 text-sm" />
                    </div>
                    <div className="flex-1">
                      <label className="block text-[10px] font-bold text-slate-500">電話</label>
                      <input type="tel" value={person.phone || ''} onChange={(e) => updatePerson({ phone: e.target.value })} className="w-full border border-slate-300 rounded px-2 py-1 text-sm" />
                    </div>
                 </div>
               </>
            ) : (
               <>
                 <div className="flex gap-2 mb-2">
                    <div className="flex-1">
                      <label className="block text-[10px] font-bold text-slate-500">國籍</label>
                      <input type="text" value={person.nation || ''} onChange={(e) => updatePerson({ nation: e.target.value })} className="w-full border border-slate-300 rounded px-2 py-1 text-sm" />
                    </div>
                    <div className="flex-1 flex items-end">
                       <label className="block w-full bg-blue-900 text-white text-center rounded py-1 text-xs font-bold cursor-pointer">
                          M-Police 辨識
                          <input type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => e.target.files?.[0] && handleOCR(e.target.files[0], true)} />
                       </label>
                    </div>
                 </div>
                 <div className="flex gap-2 mb-2">
                    <div className="flex-1">
                      <label className="block text-[10px] font-bold text-slate-500">英文名</label>
                      <input type="text" value={person.ename || ''} onChange={(e) => updatePerson({ ename: e.target.value })} className="w-full border border-slate-300 rounded px-2 py-1 text-sm" />
                    </div>
                    <div className="flex-1">
                      <label className="block text-[10px] font-bold text-slate-500">中文名</label>
                      <input type="text" value={person.cname || ''} onChange={(e) => updatePerson({ cname: e.target.value })} className="w-full border border-slate-300 rounded px-2 py-1 text-sm" />
                    </div>
                 </div>
                 <div className="flex gap-2 mb-2">
                    <div className="flex-1">
                      <label className="block text-[10px] font-bold text-slate-500">居留證</label>
                      <input type="text" value={person.arc || ''} onChange={(e) => updatePerson({ arc: e.target.value })} className="w-full border border-slate-300 rounded px-2 py-1 text-sm" />
                    </div>
                    <div className="flex-1">
                      <label className="block text-[10px] font-bold text-slate-500">護照</label>
                      <input type="text" value={person.passport || ''} onChange={(e) => updatePerson({ passport: e.target.value })} className="w-full border border-slate-300 rounded px-2 py-1 text-sm" />
                    </div>
                 </div>
                 <div className="flex gap-2 mb-2">
                    <div className="flex-1">
                      <label className="block text-[10px] font-bold text-slate-500">電話</label>
                      <input type="tel" value={person.phonef || ''} onChange={(e) => updatePerson({ phonef: e.target.value })} className="w-full border border-slate-300 rounded px-2 py-1 text-sm" />
                    </div>
                 </div>
               </>
            )}

            <div className="mb-2">
               <label className="block text-[10px] font-bold text-slate-500">住居所</label>
               <input type="text" value={person.address || ''} onChange={(e) => updatePerson({ address: e.target.value })} className="w-full border border-slate-300 rounded px-2 py-1 text-sm" />
            </div>
          </div>

          {/* Statuses */}
          <div>
            <label className="block text-xs font-bold text-orange-800 mb-1">當下狀態 (可多選)</label>
            <div className="flex flex-wrap gap-2">
              {['無法溝通', '重聽', '具攻擊性', '其他'].map(s => (
                <button
                  key={s}
                  onClick={() => toggleTag('statuses', s)}
                  className={`px-3 py-1 rounded text-xs font-bold border ${person.statuses?.includes(s) ? 'bg-orange-500 text-white border-orange-500' : 'bg-white text-orange-600 border-orange-200'}`}
                >
                  {s}
                </button>
              ))}
            </div>
            {person.statuses?.includes('其他') && (
              <input 
                type="text" 
                placeholder="請輸入其他狀態"
                value={person.statusOther || ''}
                onChange={(e) => updatePerson({ statusOther: e.target.value })}
                className="w-full mt-2 border border-orange-300 rounded px-2 py-1 text-sm"
              />
            )}
          </div>

          {/* Contacts */}
          <div className="bg-slate-50 p-2 rounded border border-slate-200">
             <div className="text-xs font-bold text-slate-600 mb-2">👨‍👩‍👧 聯絡/照顧人資料</div>
             <div className="space-y-2">
                {(person.contacts || '').split('\n').filter(l => l.trim()).map((line, idx) => {
                   const match = line.match(/\[(.*?)\]\s*(.*?)\s*([\d\-\(\)\s]*)$/);
                   return (
                     <div key={idx} className="flex gap-1 items-center">
                        <input type="text" placeholder="關係" className="w-1/4 border rounded px-1 text-xs h-8" value={match ? match[1] : ''} onChange={(e) => updateContact(idx, 'rel', e.target.value)} />
                        <input type="text" placeholder="姓名" className="w-1/3 border rounded px-1 text-xs h-8" value={match ? match[2] : ''} onChange={(e) => updateContact(idx, 'name', e.target.value)} />
                        <input type="tel" placeholder="電話" className="w-1/3 border rounded px-1 text-xs h-8" value={match ? match[3] : ''} onChange={(e) => updateContact(idx, 'tel', e.target.value)} />
                        <X size={16} className="text-slate-400 cursor-pointer" onClick={() => removeContact(idx)} />
                     </div>
                   );
                })}
             </div>
             <button onClick={addContact} className="w-full mt-2 border border-dashed border-slate-400 text-slate-500 rounded py-1 text-xs">＋ 新增聯絡人</button>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-500">備註</label>
            <textarea 
              value={person.memo || ''}
              onChange={(e) => updatePerson({ memo: e.target.value })}
              className="w-full border border-slate-300 rounded px-2 py-1 text-sm h-16"
            />
          </div>

          <PhotoUploader 
            images={person.imgs} 
            onUpdate={(imgs) => updatePerson({ imgs })} 
            color="#f57f17"
          />

          <button onClick={exportToScreenshots} className="w-full bg-orange-600 text-white font-bold py-3 rounded-lg shadow-sm mt-4">
            📸 產生圖卡
          </button>

        </div>
      </div>
    </div>
  );
}
