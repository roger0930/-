import { Mode, Project, STORAGE_KEYS } from '../types';

export const getProjects = (mode: Mode): Project[] => {
  try {
    const data = localStorage.getItem(STORAGE_KEYS[mode]);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    console.error('Failed to load projects', e);
    return [];
  }
};

export const saveProjects = (mode: Mode, projects: Project[]) => {
  try {
    localStorage.setItem(STORAGE_KEYS[mode], JSON.stringify(projects));
  } catch (e) {
    console.error('Storage full or error', e);
    alert('儲存失敗：空間不足');
  }
};
