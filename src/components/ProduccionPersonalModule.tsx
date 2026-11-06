import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  EspecieMadera,
  CalidadMadera,
  Personal,
  ProduccionDia,
  ProduccionPersonal
} from '../types';
import { saveProduccionPersonal } from '../services/produccionPersonalService';
import { ReconciliationAlertBanner } from './ReconciliationAlertBanner';
import { useReconciliation } from '../hooks/useReconciliation';
import {
  UserCheck,
  Plus,
  CheckCircle,
  Trees,
  Layers,
  Ruler,
  Box,
  HardHat,
  Clock,
  Calendar,
  AlertCircle
} from 'lucide-react';

interface Props {
  personalList: Personal[];
  produccionDia: ProduccionDia[];
  produccionPersonal: ProduccionPersonal[];
  onRecordSaved: () => void;
  onNavigateToBD: () => void;
  onNavigateToPersonal?: () => void;
}

export const ProduccionPersonalModule: React.FC<Props> = ({
  personalList,
  produccionDia,
  produccionPersonal,
  onRecordSaved,
  onNavigateToBD,
  onNavigateToPersonal,
}) => {
  const { currentUser, canManagePersonal } = useAuth();

  const todayStr = new Date().toISOString().split('T')[0];
  const [fecha, setFecha] = useState(todayStr);

  // Active personnel
  const activePersonnel = personalList.filter((p) => p.activo !== false);

  const [selectedOperadorId, setSelectedOperadorId] = useState<string>(
    activePersonnel.length > 0 ? activePersonnel[0].id : ''
  );
  const [especie, setEspecie] = useState<EspecieMadera>('Pino Radiata');
  const [calidad, setCalidad] = useState<CalidadMadera>('Bosque');
  const [largoMadera, setLargoMadera] = useState<string>('3.20');
  const [volumenMR, setVolumenMR] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Reconciliation for selected date
  const { reconciliations, discrepancyList } = useReconciliation(
    produccionDia,
    produccionPersonal,
    fecha
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!selectedOperadorId) {
      setErrorMessage('Por favor seleccione un Operador del personal.');
      return;
    }

    const operadorObj = personalList.find((p) => p.id === selectedOperadorId);
    const operadorNombre = operadorObj ? operadorObj.nombre : selectedOperadorId;

    const parsedMR = parseFloat(volumenMR);
    if (isNaN(parsedMR) || parsedMR <= 0) {
      setErrorMessage('Por favor ingrese un Volumen MR válido mayor a 0.');
      return;
    }

    setSaving(true);
    try {
      await saveProduccionPersonal({
        fecha,
        operadorId: selectedOperadorId,
        operador: operadorNombre,
        especie,
        calidad,
        largoMadera: largoMadera || 0,
        volumenMR: parsedMR,
        createdBy: currentUser?.id,
        createdByName: currentUser?.name || 'Supervisor',
      });

      setSuccessMessage(true);
      setVolumenMR('');
      onRecordSaved();

      setTimeout(() => {
        setSuccessMessage(false);
      }, 3500);
    } catch (err: unknown) {
      const e = err as Error;
      setErrorMessage('Error al guardar registro: ' + (e.message || 'Error desconocido'));
    } finally {
      setSaving(false);
    }
  };

  const recordsOnDate = produccionPersonal.filter((p) => p.fecha === fecha);
  const totalPersonalDateMR = recordsOnDate.reduce((sum, r) => sum + (Number(r.volumenMR) || 0), 0);

  return (
    <div className="space-y-6">
      
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-[#676057]/15">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#BCB703] text-white">
              <UserCheck className="w-4 h-4" />
            </span>
            <h2 className="text-xl sm:text-2xl font-black text-[#676057] tracking-tight">
              Producción Personal
            </h2>
          </div>
          <p className="mt-1 text-xs sm:text-sm text-[#676057]/80">
            Registro individual de faena por operador asignado. La fecha y hora de registro se almacena de forma oculta en segundo plano.
          </p>
        </div>

        <button
          onClick={onNavigateToBD}
          className="self-start sm:self-center px-3 py-1.5 rounded-xl border border-[#676057]/30 bg-white text-xs font-bold text-[#676057] hover:bg-[#F2EDC9]/60 transition shadow-2xs"
        >
          Ver Historial (BD Prod. Personal) &rarr;
        </button>
      </div>

      {/* Discrepancy Banner for this date */}
      <ReconciliationAlertBanner
        discrepancies={discrepancyList}
        allReconciliations={reconciliations}
        selectedFecha={fecha}
        onSelectFecha={(f) => setFecha(f)}
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Form */}
        <div className="lg:col-span-7 bg-white rounded-3xl p-5 sm:p-7 shadow-sm border border-[#676057]/10">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-base font-bold text-[#676057] flex items-center gap-2">
              <Plus className="w-4 h-4 text-[#BCB703]" />
              Nuevo Registro de Producción Personal
            </h3>
            <span className="text-[11px] font-semibold text-gray-400 bg-gray-50 px-2.5 py-1 rounded-full">
              Asignación por Operador
            </span>
          </div>

          {successMessage && (
            <div className="mb-5 p-3.5 rounded-2xl bg-[#BCB703]/20 border border-[#BCB703]/40 text-[#676057] flex items-center gap-2.5 text-xs sm:text-sm font-semibold animate-fade-in">
              <CheckCircle className="w-5 h-5 text-[#BCB703] shrink-0" />
              <span>¡Producción Personal registrada exitosamente en la base de datos!</span>
            </div>
          )}

          {errorMessage && (
            <div className="mb-5 p-3 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold">
              {errorMessage}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
            
            {/* Fecha */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#676057] mb-1.5">
                Fecha Operativa <span className="text-[#D37608]">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                  <Calendar className="w-4 h-4" />
                </div>
                <input
                  type="date"
                  value={fecha}
                  onChange={(e) => setFecha(e.target.value)}
                  required
                  className="w-full pl-10 pr-3.5 py-2.5 text-sm rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#BCB703] focus:border-[#BCB703] transition font-medium"
                />
              </div>
            </div>

            {/* Operador (Populated from Gestión de Personal) */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-[#676057]">
                  Operador de Faena <span className="text-[#D37608]">*</span>
                </label>
                {canManagePersonal && onNavigateToPersonal && (
                  <button
                    type="button"
                    onClick={onNavigateToPersonal}
                    className="text-[11px] font-semibold text-[#BCB703] hover:underline"
                  >
                    + Gestionar Personal
                  </button>
                )}
              </div>

              {activePersonnel.length === 0 ? (
                <div className="p-3 rounded-xl bg-orange-50 border border-orange-200 text-xs text-orange-800 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-[#D37608] shrink-0" />
                  <span>
                    No hay personal activo registrado aún. Ingrese personal en el módulo de Gestión de Personal.
                  </span>
                </div>
              ) : (
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                    <UserCheck className="w-4 h-4 text-[#BCB703]" />
                  </div>
                  <select
                    value={selectedOperadorId}
                    onChange={(e) => setSelectedOperadorId(e.target.value)}
                    required
                    className="w-full pl-10 pr-8 py-2.5 text-sm rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#BCB703] focus:border-[#BCB703] transition font-semibold text-[#676057] bg-white"
                  >
                    <option value="" disabled>Seleccione un operador</option>
                    {activePersonnel.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.nombre} — RUT: {p.rut} ({p.cargo})
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Especie & Calidad */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#676057] mb-1.5">
                  Especie <span className="text-[#D37608]">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                    <Trees className="w-4 h-4" />
                  </div>
                  <select
                    value={especie}
                    onChange={(e) => setEspecie(e.target.value as EspecieMadera)}
                    className="w-full pl-10 pr-8 py-2.5 text-sm rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#BCB703] focus:border-[#BCB703] transition font-medium bg-white"
                  >
                    <option value="Pino Radiata">Pino Radiata</option>
                    <option value="Euca GL">Euca GL</option>
                    <option value="Euca NT">Euca NT</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#676057] mb-1.5">
                  Calidad Madera <span className="text-[#D37608]">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                    <Layers className="w-4 h-4" />
                  </div>
                  <select
                    value={calidad}
                    onChange={(e) => setCalidad(e.target.value as CalidadMadera)}
                    className="w-full pl-10 pr-8 py-2.5 text-sm rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#BCB703] focus:border-[#BCB703] transition font-medium bg-white"
                  >
                    <option value="Bosque">Bosque</option>
                    <option value="LOG">LOG</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Largo Madera & Volumen MR */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#676057] mb-1.5">
                  Largo Madera (m)
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                    <Ruler className="w-4 h-4" />
                  </div>
                  <input
                    type="number"
                    step="0.01"
                    value={largoMadera}
                    onChange={(e) => setLargoMadera(e.target.value)}
                    placeholder="Ej. 2.44, 3.20"
                    className="w-full pl-10 pr-3.5 py-2.5 text-sm rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#BCB703] focus:border-[#BCB703] transition font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#676057] mb-1.5">
                  Volumen MR (Metro Ruma) <span className="text-[#D37608]">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                    <Box className="w-4 h-4 text-[#D37608]" />
                  </div>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={volumenMR}
                    onChange={(e) => setVolumenMR(e.target.value)}
                    placeholder="Ej. 65.4"
                    required
                    className="w-full pl-10 pr-3.5 py-2.5 text-sm rounded-xl border border-[#D37608]/40 focus:ring-2 focus:ring-[#D37608] focus:border-[#D37608] transition font-bold text-[#676057]"
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={saving || activePersonnel.length === 0}
              className="w-full mt-2 py-3 px-4 rounded-xl bg-[#BCB703] hover:bg-[#a6a202] text-white font-bold text-sm shadow-md transition flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Plus className="w-4 h-4" />
              <span>{saving ? 'Guardando en Base de Datos...' : 'Registrar Producción Personal'}</span>
            </button>
          </form>
        </div>

        {/* Date Breakdown per operator */}
        <div className="lg:col-span-5 space-y-4">
          
          <div className="bg-[#F2EDC9]/60 rounded-3xl p-5 border border-[#676057]/15 shadow-xs">
            <span className="text-xs font-bold uppercase tracking-wider text-[#676057]/70 block">
              Suma Personal en Fecha
            </span>
            <div className="flex items-baseline justify-between mt-2">
              <h4 className="text-2xl font-black text-[#676057]">{fecha}</h4>
              <span className="text-lg font-black text-[#BCB703]">
                {totalPersonalDateMR.toFixed(2)} MR Total
              </span>
            </div>
            <p className="text-xs text-[#676057]/80 mt-1">
              {recordsOnDate.length} registro(s) asignados a operadores este día.
            </p>
          </div>

          <div className="bg-white rounded-3xl p-5 border border-[#676057]/10 shadow-xs">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#676057] mb-3">
              Detalle Operadores ({fecha})
            </h4>

            {recordsOnDate.length === 0 ? (
              <div className="py-8 text-center text-xs text-gray-400">
                No hay registros de personal en esta fecha aún.
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
                {recordsOnDate.map((r) => (
                  <div
                    key={r.id}
                    className="p-3 rounded-2xl border border-gray-100 bg-gray-50/70 hover:bg-white hover:border-[#BCB703]/50 transition flex items-center justify-between"
                  >
                    <div>
                      <span className="font-bold text-xs text-[#676057] block">{r.operador}</span>
                      <div className="flex items-center gap-2 text-[11px] text-gray-500 mt-0.5">
                        <span>{r.especie} ({r.calidad})</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="font-extrabold text-sm text-[#BCB703] block">
                        {r.volumenMR} MR
                      </span>
                      <span className="text-[10px] text-gray-400 block">
                        {r.fechaHoraIngreso?.split(' ')[1] || ''}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
