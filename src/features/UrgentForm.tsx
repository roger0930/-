import { useState } from 'react';
import { Project, Person } from '../types';
import PhotoUploader from '../components/PhotoUploader';
import { performOCR, parseOCRData, calculateAge } from '../utils/ocr';
import html2canvas from 'html2canvas';
import * as XLSX from 'xlsx';
import { Loader2, Trash2 } from 'lucide-react';

interface UrgentFormProps {
  currentProject: Project;
  updateProject: (p: Project) => void;
  saveAll: () => void;
}

export default function UrgentForm({ currentProject, updateProject, saveAll }: UrgentFormProps) {
  const [loading, setLoading] = useState(false);

  const updatePerson = (index: number, updates: Partial<Person>) => {
    const newData = [...currentProject.data];
    newData[index] = { ...newData[index], ...updates };
    updateProject({ ...currentProject, data: newData });
  };

  const addPerson = () => {
    const newPerson: Person = {
      uid: Date.now().toString(),
      name: '', isForeign: false, isMinor: false, imgs: [],
      hasCar: false, isArrest: false, hasWeapon: false, isInjured: false
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

  const copyPrevious = (index: number, type: 'car' | 'arrest') => {
    if (index === 0) return alert('上方沒有資料可供帶入！');
    const prev = currentProject.data[index - 1];
    const updates: Partial<Person> = {};
    
    if (type === 'car') {
      updates.hasCar = prev.hasCar;
      if (prev.hasCar) {
        updates.carId = prev.carId;
        updates.carType = prev.carType;
        updates.pos = prev.pos;
      }
    } else if (type === 'arrest') {
      updates.isArrest = prev.isArrest;
      if (prev.isArrest) {
        updates.time = prev.time;
        updates.location = prev.location;
      }
    }
    updatePerson(index, updates);
  };

  const setTimeNow = (index: number) => {
    const n = new Date();
    const timeStr = `${n.getFullYear()-1911}年${(n.getMonth()+1).toString().padStart(2,'0')}月${n.getDate().toString().padStart(2,'0')}日${n.getHours().toString().padStart(2,'0')}時${n.getMinutes().toString().padStart(2,'0')}分`;
    updatePerson(index, { time: timeStr });
  };

  const exportToScreenshots = async () => {
    setLoading(true);
    const temp = document.createElement('div');
    temp.style.position = 'absolute';
    temp.style.left = '-9999px';
    temp.style.width = '360px';
    document.body.appendChild(temp);

    try {
      const items = currentProject.data;
      const color = '#b71c1c';
      
      const generate = async (p: Person, idx: number, filename: string) => {
        const isF = p.isForeign;
        const hRight = `第${idx}人/共${items.length}人${p.isMinor ? ' (未)' : ''}`;
        
        let iHtml = '';
        if (isF) {
            iHtml = `<div style="border-top:1px solid #eee; padding-top:10px; font-size:12px;"><div style="display:grid; grid-template-columns: 1fr 1fr; gap:5px; margin-bottom:5px;"><div><div style="color:#666;">英文名</div><b>${p.ename || ''}</b></div><div><div style="color:#666;">中文名</div><b>${p.cname || ''}</b></div></div><div style="display:grid; grid-template-columns: 1fr 1fr; gap:5px; margin-bottom:5px;"><div><div style="color:#666;">居留號</div><b>${p.arc || ''}</b></div><div><div style="color:#666;">護照號</div><b>${p.passport || ''}</b></div></div><div style="display:grid; grid-template-columns: 1fr 1fr; gap:5px;"><div><div style="color:#666;">國籍</div><b>${p.nation || ''}</b></div><div><div style="color:#666;">電話</div><b>${p.phonef || ''}</b></div></div></div>`;
        } else {
            iHtml = `<div style="margin-bottom:10px;"><div style="font-size:12px; color:#666;">姓名</div><div style="font-size:20px; font-weight:bold;">${p.name || ''}</div></div><div style="border-top:1px solid #eee; padding-top:10px; display:grid; grid-template-columns: 1fr 1fr; gap:10px;"><div><div style="font-size:11px; color:#666;">身分證</div><div style="font-size:14px; font-weight:bold;">${p.id || ''}</div></div><div><div style="font-size:11px; color:#666;">電話</div><div style="font-size:14px; font-weight:bold;">${p.phone || ''}</div></div><div><div style="font-size:11px; color:#666;">生日</div><div style="font-size:14px;">${p.dob || ''}</div></div><div><div style="font-size:11px; color:#666;">年齡</div><div style="font-size:14px;">${p.age || ''}</div></div></div>`;
        }

        let cHtml = ''; 
        if (p.hasCar) { 
            cHtml = `<div style="border-top:1px solid #eee; margin-top:10px; padding-top:10px; display:grid; grid-template-columns: 1fr 1fr 1fr; gap:5px;"><div><div style="font-size:11px; color:#666;">車號</div><div style="font-size:14px; font-weight:bold;">${p.carId||'-'}</div></div><div><div style="font-size:11px; color:#666;">車種</div><div style="font-size:14px;">${p.carType || ''}</div></div><div><div style="font-size:11px; color:#666;">位置</div><div style="font-size:14px;">${p.pos || ''}</div></div></div>`; 
        }
        
        let aHtml = ''; 
        if (p.isArrest) { 
            aHtml = `<div style="border-top:1px solid #eee; margin-top:10px; padding-top:10px;"><div style="font-size:11px; color:#666;">逮捕時間/地點</div><div style="font-size:13px; font-weight:bold;">${p.time || ''}</div><div style="font-size:13px;">${p.location || ''}</div></div>`; 
        }

        let photoHtml = '';
        if (p.imgs && p.imgs.length > 0) {
            photoHtml = `<div style="display:flex; flex-direction:column; gap:5px; margin-top:10px;">`;
            p.imgs.forEach(src => {
                photoHtml += `<img src="${src}" style="width:100%; border:1px solid #ccc;">`;
            });
            photoHtml += `</div>`;
        }

        const tS = `background:${color}; color:white; border-radius:15px; padding:4px 12px; font-size:12px; display:inline-block; margin-right:5px; font-weight:bold;`;

        temp.innerHTML = `<div style="width:360px; background:#fff; border:4px solid ${color}; padding:15px; font-family:sans-serif;"><div style="display:flex; justify-content:space-between; align-items:center; border-bottom:3px solid ${color}; border-top:3px solid ${color}; padding:8px 0; margin:0 0 15px 0;"><span style="font-size:16px; font-weight:bold; color:${color};">${currentProject.name}</span><span style="font-size:12px; font-weight:bold; color:${color};">${hRight}</span></div>${iHtml}${cHtml}${aHtml}<div style="margin-top:15px;">${p.isInjured?`<span style="${tS}">受傷</span>`:''}${p.hasWeapon?`<span style="${tS}">持械</span>`:''}</div>${p.memo?`<div style="margin-top:10px; background:#f9f9f9; padding:5px; border-radius:4px; font-size:12px;"><b>備註：</b>${p.memo}</div>`:''}${photoHtml}</div>`;
        
        const canvas = await html2canvas(temp, { scale: 2, useCORS: true });
        const link = document.createElement('a');
        link.download = `${currentProject.name}_${idx}.jpg`;
        link.href = canvas.toDataURL('image/jpeg', 0.9);
        link.click();
      };

      for (let i = 0; i < items.length; i++) {
        await generate(items[i], i + 1, `${currentProject.name}_${i+1}.jpg`);
      }

    } catch (e) {
      console.error(e);
      alert('匯出失敗');
    } finally {
      document.body.removeChild(temp);
      setLoading(false);
    }
  };

  const exportToExcel = () => {
    const wb = XLSX.utils.book_new();
    const data = currentProject.data.map((d, i) => ({
      編號: i + 1,
      類型: d.isForeign ? "外籍" : (d.isMinor ? "未成年" : "一般"),
      姓名: d.isForeign ? d.ename : d.name,
      中文名: d.cname,
      國籍: d.nation,
      證號: d.isForeign ? d.arc : d.id,
      護照: d.passport,
      居留: d.arc,
      生日: d.dob,
      年齡: d.age,
      電話: d.isForeign ? d.phonef : d.phone,
      有無車輛: d.hasCar ? "有" : "無",
      車號: d.carId,
      車種: d.carType,
      位置: d.pos,
      有無逮捕: d.isArrest ? "是" : "否",
      逮捕時間: d.time,
      逮捕地點: d.location,
      持械: d.hasWeapon ? "是" : "",
      受傷: d.isInjured ? "是" : "",
      備註: d.memo
    }));
    
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data), "總表");
    XLSX.writeFile(wb, `急案_${currentProject.name}.xlsx`);
  };

  return (
    <div>
      {loading && (
        <div className="fixed inset-0 bg-black/80 z-[9999] flex flex-col items-center justify-center text-white">
          <Loader2 className="animate-spin mb-2" size={32} />
          <h3>處理中...</h3>
        </div>
      )}

      <div className="space-y-3">
        {currentProject.data.map((person, idx) => (
          <div key={person.uid} className="bg-white rounded-lg border border-red-300 overflow-hidden shadow-sm">
            <div className="bg-slate-100 p-2 font-bold flex justify-between items-center border-b border-slate-200 text-red-900">
              <span>({idx + 1}) {person.name || '犯嫌'} {person.isMinor ? '(未)' : ''} {person.isForeign ? '(外)' : ''}</span>
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

              {/* Car Info */}
              <div className="bg-slate-50 p-2 rounded border border-slate-200">
                 <div className="flex items-center gap-2 mb-2">
                    <label className={`flex-1 p-2 rounded border font-bold text-xs cursor-pointer ${person.hasCar ? 'bg-slate-200 text-blue-900 border-slate-300' : 'bg-white'}`}>
                       <input type="checkbox" className="hidden" checked={person.hasCar} onChange={(e) => updatePerson(idx, { hasCar: e.target.checked })} />
                       🚗 有無使用交通工具
                    </label>
                    {idx > 0 && <button onClick={() => copyPrevious(idx, 'car')} className="text-[10px] bg-slate-500 text-white px-2 py-1 rounded">同前車</button>}
                 </div>
                 {person.hasCar && (
                    <div className="flex gap-2">
                       <div className="flex-1"><label className="text-[10px] text-slate-500">車號</label><input type="text" value={person.carId || ''} onChange={(e) => updatePerson(idx, { carId: e.target.value })} className="w-full border rounded px-1 text-sm" /></div>
                       <div className="flex-1"><label className="text-[10px] text-slate-500">車種</label><select value={person.carType || '自小客'} onChange={(e) => updatePerson(idx, { carType: e.target.value })} className="w-full border rounded px-1 text-sm h-7"><option>自小客</option><option>普重機</option></select></div>
                       <div className="flex-1"><label className="text-[10px] text-slate-500">位置</label><select value={person.pos || '駕駛'} onChange={(e) => updatePerson(idx, { pos: e.target.value })} className="w-full border rounded px-1 text-sm h-7"><option>駕駛</option><option>副駕駛</option><option>乘客</option></select></div>
                    </div>
                 )}
              </div>

              {/* Arrest Info */}
              <div className="bg-slate-50 p-2 rounded border border-slate-200">
                 <div className="flex items-center gap-2 mb-2">
                    <label className={`flex-1 p-2 rounded border font-bold text-xs cursor-pointer ${person.isArrest ? 'bg-slate-200 text-blue-900 border-slate-300' : 'bg-white'}`}>
                       <input type="checkbox" className="hidden" checked={person.isArrest} onChange={(e) => updatePerson(idx, { isArrest: e.target.checked })} />
                       ⚖️ 有無逮捕
                    </label>
                    {idx > 0 && <button onClick={() => copyPrevious(idx, 'arrest')} className="text-[10px] bg-slate-500 text-white px-2 py-1 rounded">同前逮捕</button>}
                 </div>
                 {person.isArrest && (
                    <div className="space-y-2">
                       <div className="flex gap-2">
                          <div className="flex-[2]"><label className="text-[10px] text-slate-500">逮捕時間</label><input type="text" value={person.time || ''} onChange={(e) => updatePerson(idx, { time: e.target.value })} className="w-full border rounded px-1 text-sm" /></div>
                          <button onClick={() => setTimeNow(idx)} className="bg-blue-900 text-white text-xs px-2 rounded">現在</button>
                       </div>
                       <div><label className="text-[10px] text-slate-500">逮捕地點</label><input type="text" value={person.location || ''} onChange={(e) => updatePerson(idx, { location: e.target.value })} className="w-full border rounded px-1 text-sm" /></div>
                    </div>
                 )}
              </div>

              <div className="flex gap-2">
                 <label className={`flex-1 p-2 rounded border font-bold text-xs cursor-pointer text-center ${person.hasWeapon ? 'bg-red-600 text-white' : 'bg-white'}`}>
                    <input type="checkbox" className="hidden" checked={person.hasWeapon} onChange={(e) => updatePerson(idx, { hasWeapon: e.target.checked })} />
                    持械
                 </label>
                 <label className={`flex-1 p-2 rounded border font-bold text-xs cursor-pointer text-center ${person.isInjured ? 'bg-red-600 text-white' : 'bg-white'}`}>
                    <input type="checkbox" className="hidden" checked={person.isInjured} onChange={(e) => updatePerson(idx, { isInjured: e.target.checked })} />
                    受傷
                 </label>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500">備註</label>
                <textarea 
                  value={person.memo || ''}
                  onChange={(e) => updatePerson(idx, { memo: e.target.value })}
                  className="w-full border border-slate-300 rounded px-2 py-1 text-sm h-16"
                />
              </div>

              <PhotoUploader 
                images={person.imgs} 
                onUpdate={(imgs) => updatePerson(idx, { imgs })} 
                color="#b71c1c"
              />

              <button 
                onClick={() => removePerson(idx)}
                className="w-full text-red-500 border border-red-500 rounded py-2 mt-2 font-bold text-xs flex items-center justify-center gap-1"
              >
                <Trash2 size={12} /> 刪除
              </button>
            </div>
          </div>
        ))}

        <button 
          onClick={addPerson}
          className="w-full border-2 border-dashed border-red-900 text-red-900 font-bold py-3 rounded-lg bg-white"
        >
          ＋ 新增對象
        </button>

        <div className="border-t border-slate-200 pt-4 mt-4 space-y-2">
          <button onClick={exportToScreenshots} className="w-full bg-red-900 text-white font-bold py-3 rounded-lg shadow-sm">
            📇 產生圖卡
          </button>
          <button onClick={exportToExcel} className="w-full bg-green-700 text-white font-bold py-3 rounded-lg shadow-sm">
            📊 匯出 Excel
          </button>
        </div>
      </div>
    </div>
  );
}
