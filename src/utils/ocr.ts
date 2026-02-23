import { createWorker } from 'tesseract.js';

export const performOCR = async (
  imageFile: File,
  isForeignMode: boolean
): Promise<{ text: string; lines: string[] }> => {
  const worker = await createWorker('chi_tra+eng');
  
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = async () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject('Canvas context error');
        return;
      }
      
      // Standardize image processing for OCR
      canvas.width = 1600;
      canvas.height = img.height * (1600 / img.width);
      ctx.filter = 'contrast(2.0) grayscale(1)';
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      
      try {
        const { data: { text } } = await worker.recognize(canvas.toDataURL('image/jpeg', 0.9));
        const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
        await worker.terminate();
        resolve({ text, lines });
      } catch (e) {
        await worker.terminate();
        reject(e);
      }
    };
    img.onerror = reject;
    img.src = URL.createObjectURL(imageFile);
  });
};

export const parseOCRData = (text: string, lines: string[], isForeign: boolean) => {
  const cleanText = text.replace(/\s+/g, "");
  const result: any = {};

  if (isForeign) {
    // Foreign Logic
    let eName = "";
    let eNameIdx = lines.findIndex(l => /英\s*文\s*名|English/.test(l));
    if (eNameIdx !== -1) {
      eName = lines[eNameIdx].split(/[:：]/)[1] || "";
      for (let i = 1; i <= 2; i++) {
        const nextLine = lines[eNameIdx + i];
        if (!nextLine) break;
        if (/^[A-Z\s]+$/.test(nextLine.trim()) && !/中\s*文|居\s*留|護\s*照/.test(nextLine)) {
          eName += " " + nextLine.trim();
        } else if (nextLine.length < 5 && /[=:<>]/.test(nextLine)) {
          continue;
        } else if (/[\u4e00-\u9fa5]/.test(nextLine)) {
          break;
        }
      }
    }

    let cName = "";
    const cLabelLine = lines.find(l => /中\s*文\s*名/.test(l));
    if (cLabelLine) {
      const raw = cLabelLine.split(/[:：]/)[1] || "";
      cName = raw.replace(/[^\u4e00-\u9fa5]/g, "");
    } else {
      const blacklist = ["越南", "印尼", "泰國", "菲律賓", "國籍", "居留", "護照", "舊證", "性別", "出生"];
      const candidates = lines.filter(l => /^[\u4e00-\u9fa5]{2,4}$/.test(l));
      cName = candidates.find(c => !blacklist.some(b => c.includes(b))) || "";
    }

    let arc = "", passport = "";
    let arcIdx = lines.findIndex(l => /居\s*留|ARC/.test(l) || /[A-Z][0-9]{9}/.test(l.replace(/\s/g, "")));
    if (arcIdx !== -1) {
      arc = lines[arcIdx].match(/[A-Z][0-9]{9}/)?.[0] || "";
      const passLabelIdx = lines.findIndex(l => /護\s*照\s*號|Passport/.test(l));
      if (passLabelIdx !== -1) {
        passport = lines[passLabelIdx].replace(/[^A-Z0-9]/g, "");
      } else {
        const passLine = lines[arcIdx + 2] || "";
        passport = passLine.replace(/[^A-Z0-9]/g, "").match(/[A-Z0-9]{6,12}/)?.[0] || "";
      }
    }
    if (!arc) arc = cleanText.match(/[A-Z][0-9]{9}/)?.[0] || "";
    if (!passport) {
      const passMatches = cleanText.match(/[A-Z]{1,2}[0-9]{6,9}[A-Z]?/g) || [];
      passport = passMatches.find(p => p !== arc && !p.startsWith("FC") && !p.startsWith("HC")) || "";
    }

    let nation = "";
    if (/越南|Vietnam/.test(text)) nation = "越南";
    else if (/印尼|Indonesia/.test(text)) nation = "印尼";
    else if (/泰國|Thailand/.test(text)) nation = "泰國";
    else if (/菲律賓|Philippines/.test(text)) nation = "菲律賓";

    result.ename = eName.trim();
    result.cname = cName.trim();
    result.arc = arc;
    result.passport = passport;
    result.nation = nation;

  } else {
    // Local Logic
    let id = cleanText.match(/[A-Z][12][0-9]{8}/)?.[0] || "";
    let dob = "";
    const dobMatch = cleanText.match(/民國(\d{2,3})年(\d{2})月(\d{2})日/) || cleanText.match(/\d{2,3}[./-]\d{2}[./-]\d{2}/);
    if (dobMatch) {
      if (dobMatch[0].includes("年")) dob = `${dobMatch[1]}/${dobMatch[2]}/${dobMatch[3]}`;
      else dob = dobMatch[0].replace(/[./-]/g, "/");
    }

    let name = lines.find(l => /^[\u4e00-\u9fa5]{2,4}$/.test(l) && !/姓名|住址|證號/.test(l)) || "";
    if (!name) {
      const l = lines.find(l => /姓\s*名/.test(l));
      if (l) name = l.replace(/.*姓\s*名[:：\s]*/, "").trim();
    }

    result.name = name.replace(/\s/g, "");
    result.id = id;
    result.dob = dob;
  }

  return result;
};

export const calculateAge = (dob: string): number | null => {
  const parts = dob.match(/\d+/g);
  if (parts && parts.length >= 3) {
    let y = parseInt(parts[0]);
    if (y < 1911) y += 1911;
    const birth = new Date(y, parseInt(parts[1]) - 1, parseInt(parts[2]));
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
    return age >= 0 ? age : null;
  }
  return null;
};
