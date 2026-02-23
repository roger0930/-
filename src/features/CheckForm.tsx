import { useState } from 'react';
import { Project, Person } from '../types';
import PhotoUploader from '../components/PhotoUploader';
import { performOCR, parseOCRData, calculateAge } from '../utils/ocr';
import html2canvas from 'html2canvas';
import * as XLSX from 'xlsx';
import { Loader2, Trash2 } from 'lucide-react';

interface CheckFormProps {
  currentProject: Project;
  updateProject: (p: Project) => void;
  saveAll: () => void;
}

export default function CheckForm({ currentProject, updateProject, saveAll }: CheckFormProps) {
  const [loading, setLoading] = useState(false);

  const updatePerson = (index: number, updates: Partial<Person>) => {
    const newData = [...currentProject.data];
    newData[index] = { ...newData[index], ...updates };
    updateProject({ ...currentProject, data: newData });
  };

  const addPerson = () => {
    const newPerson: Person = {
      uid: Date.now().toString(),
      name: '', isForeign: false, isMinor: false, imgs: []
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
      console.error(e);
    } finally {
      setLoading(false);
    }
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
      const color = '#1a237e';
      
      // Helper to generate image
      const generate = async (people: Person[], filename: string) => {
        let innerHtml = `<div style="width:360px; background:#fff;">`;
        people.forEach((p, idx) => {
          const isF = p.isForeign;
          let content = '';
          if (isF) {
            content = `
              <div style="display:flex; gap:4px; margin-bottom:4px;">
                <div style="flex:1"><div style="font-size:10px; color:#546e7a; font-weight:bold;">英文名</div><div style="font-weight:bold; font-size:13px;">${p.ename || ''}</div></div>
                <div style="flex:1"><div style="font-size:10px; color:#546e7a; font-weight:bold;">中文名</div><div style="font-weight:bold; font-size:13px;">${p.cname || ''}</div></div>
              </div>
              <div style="display:flex; gap:4px; margin-bottom:4px;">
                <div style="flex:1"><div style="font-size:10px; color:#546e7a; font-weight:bold;">居留證號</div><div style="font-weight:bold; font-size:13px;">${p.arc || ''}</div></div>
                <div style="flex:1"><div style="font-size:10px; color:#546e7a; font-weight:bold;">護照號</div><div style="font-weight:bold; font-size:13px;">${p.passport || ''}</div></div>
              </div>
              <div style="display:flex; gap:4px; margin-bottom:4px;">
                <div style="flex:1"><div style="font-size:10px; color:#546e7a; font-weight:bold;">國籍</div><div style="font-weight:bold; font-size:13px;">${p.nation || ''}</div></div>
                <div style="flex:1"><div style="font-size:10px; color:#546e7a; font-weight:bold;">電話</div><div style="font-weight:bold; font-size:13px;">${p.phonef || ''}</div></div>
              </div>
            `;
          } else {
            content = `
              <div style="margin-bottom:4px;">
                <div style="font-size:10px; color:#546e7a; font-weight:bold;">姓名</div><div style="font-weight:bold; font-size:18px;">${p.name || ''}</div>
              </div>
              <div style="display:flex; gap:4px; margin-bottom:4px;">
                <div style="flex:1"><div style="font-size:10px; color:#546e7a; font-weight:bold;">生日</div><div style="font-weight:bold; font-size:13px;">${p.dob || ''}</div></div>
                <div style="flex:1"><div style="font-size:10px; color:#546e7a; font-weight:bold;">年齡</div><div style="font-weight:bold; font-size:13px;">${p.age || ''}</div></div>
              </div>
              <div style="display:flex; gap:4px; margin-bottom:4px;">
                <div style="flex:1"><div style="font-size:10px; color:#546e7a; font-weight:bold;">身分證</div><div style="font-weight:bold; font-size:13px;">${p.id || ''}</div></div>
                <div style="flex:1"><div style="font-size:10px; color:#546e7a; font-weight:bold;">電話</div><div style="font-weight:bold; font-size:13px;">${p.phone || ''}</div></div>
              </div>
            `;
          }

          let photoHtml = '';
          if (p.imgs && p.imgs.length > 0) {
             photoHtml = `<div style="margin-top:8px; text-align:center;">`;
             p.imgs.forEach(src => {
                 photoHtml += `<img src="${src}" style="width:100%; border-radius:3px; border:1px solid #eee; margin-bottom:2px;">`;
             });
             photoHtml += `</div>`;
          }

          innerHtml += `
            <div style="padding:15px; border:5px solid ${color}; margin-bottom:10px; font-family:sans-serif;">
              <div style="display:flex; justify-content:space-between; align-items:center; margin:0 0 10px 0; border-bottom:2px solid ${color}; padding-bottom:5px;">
                <span style="font-size:16px; font-weight:bold; color:${color};">${currentProject.name}</span>
                <span style="font-size:12px; font-weight:bold; color:${color};">第${items.indexOf(p) + 1}人/共${items.length}人</span>
              </div>
              ${content}
              ${p.memo ? `<div style="border-top:1px solid #eee; margin-top:5px; padding-top:2px; font-size:12px;"><b>備註：</b>${p.memo}</div>` : ''}
              ${photoHtml}
            </div>
          `;
        });
        innerHtml += `</div>`;
        temp.innerHTML = innerHtml;

        const canvas = await html2canvas(temp, { scale: 2, useCORS: true });
        const link = document.createElement('a');
        link.download = filename;
        link.href = canvas.toDataURL('image/jpeg', 0.9);
        link.click();
      };

      // Logic: If person has photo, generate individual card. If not, group by 2.
      let buffer: Person[] = [];
      for (let i = 0; i < items.length; i++) {
        const p = items[i];
        if (p.imgs && p.imgs.length > 0) {
          if (buffer.length > 0) {
             await generate(buffer, `${currentProject.name}_combined_${Date.now()}.jpg`);
             buffer = [];
          }
          await generate([p], `${currentProject.name}_${i+1}.jpg`);
        } else {
          buffer.push(p);
          if (buffer.length === 2) {
            await generate(buffer, `${currentProject.name}_combined_${Date.now()}.jpg`);
            buffer = [];
          }
        }
      }
      if (buffer.length > 0) {
        await generate(buffer, `${currentProject.name}_combined_${Date.now()}.jpg`);
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
      備註: d.memo
    }));
    
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data), "總表");
    XLSX.writeFile(wb, `盤查_${currentProject.name}.xlsx`);
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
          <div key={person.uid} className="bg-white rounded-lg border border-slate-300 overflow-hidden shadow-sm">
            <div className="bg-slate-100 p-2 font-bold flex justify-between items-center border-b border-slate-200 text-blue-900">
              <span>({idx + 1}) {person.name || '盤查對象'} {person.isMinor ? '(未)' : ''} {person.isForeign ? '(外)' : ''}</span>
            </div>
            
            <div className="p-2 space-y-2">
              <div className="flex gap-2 mb-2">
                <label className={`flex-1 flex items-center justify-center border rounded p-1 cursor-pointer text-xs font-bold ${person.isForeign ? 'bg-blue-900 text-white border-blue-900' : 'bg-white text-slate-600'}`}>
                  <input 
                    type="checkbox" 
                    className="hidden" 
                    checked={person.isForeign} 
                    onChange={(e) => updatePerson(idx, { isForeign: e.target.checked })} 
                  />
                  外籍
                </label>
                <label className={`flex-1 flex items-center justify-center border rounded p-1 cursor-pointer text-xs font-bold ${person.isMinor ? 'bg-red-600 text-white border-red-600' : 'bg-white text-slate-600'}`}>
                  <input 
                    type="checkbox" 
                    className="hidden" 
                    checked={person.isMinor} 
                    onChange={(e) => updatePerson(idx, { isMinor: e.target.checked })} 
                  />
                  未成年
                </label>
              </div>

              {!person.isForeign ? (
                // Local Fields
                <>
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <label className="block text-[10px] font-bold text-slate-500">姓名</label>
                      <input 
                        type="text" 
                        value={person.name} 
                        onChange={(e) => updatePerson(idx, { name: e.target.value })}
                        className="w-full border border-slate-300 rounded px-2 py-1 text-sm"
                      />
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
                      <input 
                        type="text" 
                        value={person.dob || ''} 
                        placeholder="年/月/日"
                        onChange={(e) => {
                           const val = e.target.value;
                           const age = calculateAge(val);
                           updatePerson(idx, { dob: val, age: age ? age.toString() : person.age, isMinor: (age !== null && age < 18) });
                        }}
                        className="w-full border border-slate-300 rounded px-2 py-1 text-sm"
                      />
                    </div>
                    <div className="flex-1">
                      <label className="block text-[10px] font-bold text-slate-500">年齡</label>
                      <input 
                        type="text" 
                        readOnly
                        value={person.age || ''} 
                        className="w-full border border-slate-300 rounded px-2 py-1 text-sm bg-slate-100"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <label className="block text-[10px] font-bold text-slate-500">身分證</label>
                      <input 
                        type="text" 
                        value={person.id || ''} 
                        onChange={(e) => updatePerson(idx, { id: e.target.value })}
                        className="w-full border border-slate-300 rounded px-2 py-1 text-sm"
                      />
                    </div>
                    <div className="flex-1">
                      <label className="block text-[10px] font-bold text-slate-500">電話</label>
                      <input 
                        type="tel" 
                        value={person.phone || ''} 
                        onChange={(e) => updatePerson(idx, { phone: e.target.value })}
                        className="w-full border border-slate-300 rounded px-2 py-1 text-sm"
                      />
                    </div>
                  </div>
                </>
              ) : (
                // Foreign Fields
                <>
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <label className="block text-[10px] font-bold text-slate-500">國籍</label>
                      <input 
                        type="text" 
                        value={person.nation || ''} 
                        onChange={(e) => updatePerson(idx, { nation: e.target.value })}
                        className="w-full border border-slate-300 rounded px-2 py-1 text-sm"
                      />
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
                      <input 
                        type="text" 
                        value={person.ename || ''} 
                        onChange={(e) => updatePerson(idx, { ename: e.target.value })}
                        className="w-full border border-slate-300 rounded px-2 py-1 text-sm"
                      />
                    </div>
                    <div className="flex-1">
                      <label className="block text-[10px] font-bold text-slate-500">中文名</label>
                      <input 
                        type="text" 
                        value={person.cname || ''} 
                        onChange={(e) => updatePerson(idx, { cname: e.target.value })}
                        className="w-full border border-slate-300 rounded px-2 py-1 text-sm"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <label className="block text-[10px] font-bold text-slate-500">居留證號</label>
                      <input 
                        type="text" 
                        value={person.arc || ''} 
                        onChange={(e) => updatePerson(idx, { arc: e.target.value })}
                        className="w-full border border-slate-300 rounded px-2 py-1 text-sm"
                      />
                    </div>
                    <div className="flex-1">
                      <label className="block text-[10px] font-bold text-slate-500">護照號</label>
                      <input 
                        type="text" 
                        value={person.passport || ''} 
                        onChange={(e) => updatePerson(idx, { passport: e.target.value })}
                        className="w-full border border-slate-300 rounded px-2 py-1 text-sm"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <label className="block text-[10px] font-bold text-slate-500">電話</label>
                      <input 
                        type="tel" 
                        value={person.phonef || ''} 
                        onChange={(e) => updatePerson(idx, { phonef: e.target.value })}
                        className="w-full border border-slate-300 rounded px-2 py-1 text-sm"
                      />
                    </div>
                  </div>
                </>
              )}

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
                color="#1a237e"
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
          className="w-full border-2 border-dashed border-blue-900 text-blue-900 font-bold py-3 rounded-lg bg-white"
        >
          ＋ 新增對象
        </button>

        <div className="border-t border-slate-200 pt-4 mt-4 space-y-2">
          <button onClick={exportToScreenshots} className="w-full bg-blue-900 text-white font-bold py-3 rounded-lg shadow-sm">
            📸 產生圖卡 (藍色)
          </button>
          <button onClick={exportToExcel} className="w-full bg-green-700 text-white font-bold py-3 rounded-lg shadow-sm">
            📊 匯出 Excel
          </button>
        </div>
      </div>
    </div>
  );
}
