export type Mode = 'check' | 'lost' | 'dv' | 'urgent';

export interface Person {
  uid: string;
  name: string;
  ename?: string;
  cname?: string;
  nation?: string;
  id?: string;
  dob?: string;
  age?: string;
  phone?: string;
  phonef?: string;
  arc?: string;
  passport?: string;
  memo?: string;
  isForeign: boolean;
  isMinor: boolean;
  imgs: string[];
  
  // Lost specific
  caseTypes?: string[];
  caseTypeOther?: string;
  address?: string;
  statuses?: string[];
  statusOther?: string;
  contacts?: string;

  // DV specific
  injury?: string;
  tagPhy?: boolean;
  tagMen?: boolean;
  tagEco?: boolean;
  tagSuiIdea?: boolean;
  tagSuiAct?: boolean;
  tagPo?: boolean;
  tagLaw?: boolean;
  tipvdaData?: string;
  tipvdaScore?: number;
  selfScore?: number;
  selfDesc?: string;
  role?: string;

  // Urgent specific
  hasCar?: boolean;
  carId?: string;
  carType?: string;
  pos?: string;
  isArrest?: boolean;
  time?: string;
  location?: string;
  hasWeapon?: boolean;
  isInjured?: boolean;
}

export interface Project {
  id: number;
  name: string;
  type: Mode;
  data: Person[];
  // DV specific extra fields on project level
  dvData?: {
    mutual: boolean;
    time: string;
    loc: string;
    rel: string;
    cause: string;
    hasMinor: boolean;
    minors: any[];
  };
}

export const STORAGE_KEYS: Record<Mode, string> = {
  check: 'police_v44_check_data',
  lost: 'police_v46_lost_final_data',
  dv: 'police_dv_v47_1',
  urgent: 'police_v44_order_data',
};

export const THEME_COLORS: Record<Mode, string> = {
  check: '#1a237e', // Blue
  lost: '#f57f17', // Orange
  dv: '#6a1b9a',   // Purple
  urgent: '#b71c1c', // Red
};
