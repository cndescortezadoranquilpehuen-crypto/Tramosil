export type UserRole = 'Usuario' | 'Supervisor' | 'Administrador';

export interface UserAccount {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  createdAt: string;
}

export interface Personal {
  id: string;
  nombre: string;
  rut: string;
  cargo: string;
  activo: boolean;
  fechaIngreso?: string;
}

export type EspecieMadera = 'Pino Radiata' | 'Euca GL' | 'Euca NT';
export type CalidadMadera = 'Bosque' | 'LOG';

export interface ProduccionDia {
  id: string;
  fecha: string; // Fecha manual ingresada por operador YYYY-MM-DD
  fechaHoraIngreso: string; // Fecha y hora automática oculta
  especie: EspecieMadera;
  calidad: CalidadMadera;
  largoMadera: number | string;
  volumenMR: number;
  createdBy?: string;
  createdByName?: string;
}

export interface ProduccionPersonal {
  id: string;
  fecha: string; // Fecha manual ingresada por operador YYYY-MM-DD
  fechaHoraIngreso: string; // Fecha y hora automática oculta
  operadorId?: string;
  operador: string; // Seleccionado de Gestión de Personal
  especie: EspecieMadera;
  calidad: CalidadMadera;
  largoMadera: number | string;
  volumenMR: number;
  createdBy?: string;
  createdByName?: string;
}

export interface DateReconciliation {
  fecha: string;
  totalDiaMR: number;
  totalPersonalMR: number;
  diferenciaMR: number;
  isBalanced: boolean;
  countDia: number;
  countPersonal: number;
}
