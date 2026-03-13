export interface PatientData {
  name: string;
  rmNumber: string;
  dob: string;
  gender: 'Laki-laki' | 'Perempuan';
  operator: string;
  procedures: string[];
  diagnosis: string;
  differentialDiagnosis: string;
  category: 'Kamar Operasi' | 'Poli' | 'IGD';
  diagnosis_icd10: string;
  procedures_icd9: string[];
}

export interface Capture {
  id: string;
  type: 'image' | 'video';
  url: string;
  originalUrl?: string; // Store original for re-editing
  shapes?: any[]; // Store Konva shapes for re-editing
  timestamp: Date;
  caption?: string;
}

export interface Session {
  id: string;
  date: Date;
  patient: PatientData;
  captures: Capture[];
  clinicalNotes?: string;
  status: 'active' | 'completed';
}

export type UserRole = 'doctor' | 'admin';

export interface HospitalSettings {
  id: string;
  name: string;
  address: string;
  phone: string;
  fax?: string;
  website?: string;
  email: string;
  logoUrl?: string;
  enterpriseId?: string;
  subscriptionStatus?: 'active' | 'trial' | 'expired';
}

export interface UserProfile {
  id: string;
  name: string;
  specialization: string;
  email: string;
  phone: string;
  role: UserRole;
  avatar?: string;
  status?: 'active' | 'inactive';
  lastLogin?: Date;
  strNumber?: string;
  sipNumber?: string;
  nameChangeRequested?: boolean;
  lastNameChangeDate?: string;
  enterprise_id?: string | null;
  preferences?: {
    fontSize: 'normal' | 'large' | 'extra-large';
  };
}
