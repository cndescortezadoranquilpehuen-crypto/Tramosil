import React, { useState, useMemo, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  ProduccionDia,
  ProduccionPersonal,
  Personal,
  EspecieMadera,
  CalidadMadera
} from '../types';
import { useReconciliation } from '../hooks/useReconciliation';
import { ReconciliationAlertBanner } from './ReconciliationAlertBanner';
import { DailyProductionColumnChart } from './DailyProductionColumnChart';
import { subscribeFaenaGoal, saveFaenaGoal } from '../services/configService';
import {
  BarChart3,
  TrendingUp,
  Calendar,
  Layers,
  Award,
  ArrowUpRight,
  PlusCircle,
  Activity,
  Pencil,
  Check,
  X,
  Target,
  Ruler
} from 'lucide-react';
import { NavTab } from './Header';

interface Props {
  produccionDia: ProduccionDia[];
  produccionPersonal: ProduccionPersonal[];
  personalList: Personal[];
  onNavigateTab: (tab: NavTab) => void;
}

export const DashboardModule: React.FC<Props> = ({
  produccionDia,
  produccionPersonal,
  personalList,
  onNavigateTab,
}) => {
  const { isAdmin } = useAuth();
  const [selectedMonth, setSelectedMonth] = useState<string>('all');
  const [targetAuditDate, setTargetAuditDate] = useState<string | undefined>(undefined);
  const [faenaMilestoneMR, setFaenaMilestoneMR] = useState<number>(500);
  const [isEditingGoal, setIsEditingGoal] = useState<boolean>(false);
  const [inputGoalMR, setInputGoalMR] = useState<string>('500');
  const [isSavingGoal, setIsSavingGoal] = useState<boolean>(false);

  // Subscribe to real-time manual goal
  useEffect(() => {
    const unsub = subscribeFaenaGoal((goal) => {
      setFaenaMilestoneMR(goal);
      setInputGoalMR(String(goal));
    });
    return () => unsub();
  }, []);

  const handleSaveGoal = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const val = parseFloat(inputGoalMR);
    if (!isNaN(val) && val > 0) {
      setIsSavingGoal(true);
      await saveFaenaGoal(val);
      setIsSavingGoal(false);
      setIsEditingGoal(false);
    }
  };

  // Filter datasets by month if chosen
  const filteredDia = useMemo(() => {
    if (selectedMonth === 'all') return produccionDia;
    return produccionDia.filter((d) => d.fecha.startsWith(selectedMonth));
  }, [produccionDia, selectedMonth]);

  const filteredPersonal = useMemo(() => {
    if (selectedMonth === 'all') return produccionPersonal;
    return produccionPersonal.filter((p) => p.fecha.startsWith(selectedMonth));
  }, [produccionPersonal, selectedMonth]);

  // Overall totals
  const totalDiaMR = useMemo(
    () => filteredDia.reduce((sum, d) => sum + (Number(d.volumenMR) || 0), 0),
    [filteredDia]
  );

  const totalPersonalMR = useMemo(
    () => filteredPersonal.reduce((sum, p) => sum + (Number(p.volumenMR) || 0), 0),
    [filteredPersonal]
  );

  // Number of unique active work dates
  const uniqueDatesCount = useMemo(() => {
    const datesSet = new Set<string>();
    filteredDia.forEach((d) => datesSet.add(d.fecha));
    filteredPersonal.forEach((p) => datesSet.add(p.fecha));
    return datesSet.size;
  }, [filteredDia, filteredPersonal]);

  const avgDiarioMR = useMemo(() => {
    return uniqueDatesCount > 0 ? totalDiaMR / uniqueDatesCount : 0;
  }, [totalDiaMR, uniqueDatesCount]);

  // Reconciliation auditor hook: keeps descuadre logic as an active alert trigger only
  const { reconciliations, discrepancyList } = useReconciliation(
    produccionDia,
    produccionPersonal,
    targetAuditDate
  );

  // Operator rankings (Producción por Persona)
  const operatorRankings = useMemo(() => {
    const map = new Map<string, { totalMR: number; count: number; lastDate: string }>();

    filteredPersonal.forEach((rec) => {
      const op = rec.operador || 'Sin Operador';
      const existing = map.get(op) || { totalMR: 0, count: 0, lastDate: rec.fecha };
      map.set(op, {
        totalMR: existing.totalMR + (Number(rec.volumenMR) || 0),
        count: existing.count + 1,
        lastDate: rec.fecha > existing.lastDate ? rec.fecha : existing.lastDate,
      });
    });

    const list = Array.from(map.entries()).map(([operador, data]) => ({
      operador,
      totalMR: Math.round(data.totalMR * 100) / 100,
      count: data.count,
      lastDate: data.lastDate,
      percentage: totalPersonalMR > 0 ? (data.totalMR / totalPersonalMR) * 100 : 0,
    }));

    return list.sort((a, b) => b.totalMR - a.totalMR);
  }, [filteredPersonal, totalPersonalMR]);

  // Species distribution
  const speciesData = useMemo(() => {
    const map: Record<EspecieMadera, number> = {
      'Pino Radiata': 0,
      'Euca GL': 0,
      'Euca NT': 0,
    };
    filteredDia.forEach((d) => {
      if (map[d.especie] !== undefined) {
        map[d.especie] += Number(d.volumenMR) || 0;
      }
    });
    return map;
  }, [filteredDia]);

  // Quality distribution
  const qualityData = useMemo(() => {
    const map: Record<CalidadMadera, number> = {
      Bosque: 0,
      LOG: 0,
    };
    filteredDia.forEach((d) => {
      if (map[d.calidad] !== undefined) {
        map[d.calidad] += Number(d.volumenMR) || 0;
      }
    });
    return map;
  }, [filteredDia]);

  // Producción y Distribución por Largo de la Madera
  const woodLengthStats = useMemo(() => {
    const map = new Map<number, { totalMR: number; count: number }>();

    filteredDia.forEach((d) => {
      const length = Number(d.largoMadera) || 0;
      if (length > 0) {
        const existing = map.get(length) || { totalMR: 0, count: 0 };
        map.set(length, {
          totalMR: existing.totalMR + (Number(d.volumenMR) || 0),
          count: existing.count + 1,
        });
      }
    });

    // Si la BD diaria no tiene largo registrado o está vacía, se complementa con BD Personal
    if (map.size === 0) {
      filteredPersonal.forEach((p) => {
        const length = Number(p.largoMadera) || 0;
        if (length > 0) {
          const existing = map.get(length) || { totalMR: 0, count: 0 };
          map.set(length, {
            totalMR: existing.totalMR + (Number(p.volumenMR) || 0),
            count: existing.count + 1,
          });
        }
      });
    }

    const totalMRAll = Array.from(map.values()).reduce((sum, item) => sum + item.totalMR, 0);

    const list = Array.from(map.entries())
      .map(([largo, item]) => ({
        largo,
        label: `${largo.toFixed(2).replace(/\.?0+$/, '')} m`,
        totalMR: Math.round(item.totalMR * 100) / 100,
        count: item.count,
        percentage: totalMRAll > 0 ? (item.totalMR / totalMRAll) * 100 : 0,
      }))
      .sort((a, b) => b.totalMR - a.totalMR);

    const predominant = list.length > 0 ? list[0] : null;

    return {
      list,
      totalMRAll,
      predominant,
    };
  }, [filteredDia, filteredPersonal]);

  // Monthly faena target: manual goal set by Administrator
  const faenaProgressPct = faenaMilestoneMR > 0
    ? Math.round((totalDiaMR / faenaMilestoneMR) * 100)
    : 0;

  return (
    <div className="space-y-6">
      
      {/* Dashboard Header & Month Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-[#676057]/15">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#676057] text-white">
              <BarChart3 className="w-4 h-4" />
            </span>
            <h2 className="text-xl sm:text-2xl font-black text-[#676057] tracking-tight">
              Dashboard de Producción Forestal
            </h2>
          </div>
          <p className="mt-1 text-xs sm:text-sm text-[#676057]/80">
            Control de faena en tiempo real, gráfico de producción día a día y rendimiento de operadores.
          </p>
        </div>

        {/* Quick Month Filter & Action Buttons */}
        <div className="flex items-center gap-2 self-start sm:self-center">
          <div className="relative">
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="px-3 py-2 rounded-xl text-xs font-bold border border-gray-200 bg-white text-[#676057] focus:ring-2 focus:ring-[#BCB703] shadow-2xs"
            >
              <option value="all">Todo el Histórico</option>
              <option value="2026-11">Noviembre 2026</option>
              <option value="2026-10">Octubre 2026</option>
              <option value="2026-09">Septiembre 2026</option>
            </select>
          </div>

          <button
            onClick={() => onNavigateTab('produccion-dia')}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#676057] hover:bg-[#534d45] text-white text-xs font-bold transition shadow-2xs"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Nuevo Registro</span>
          </button>
        </div>
      </div>

      {/* Reconciliation Alert Banner: only alerts when an active discrepancy exists */}
      <ReconciliationAlertBanner
        discrepancies={discrepancyList}
        allReconciliations={reconciliations}
        selectedFecha={targetAuditDate}
        onSelectFecha={(f) => setTargetAuditDate(f)}
      />

      {/* KPI Cards Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Total Producción Día */}
        <div className="bg-white rounded-3xl p-5 border border-[#676057]/10 shadow-sm relative overflow-hidden group hover:border-[#676057]/30 transition">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#676057]/70">
              Producción Día Total
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#676057]/10 text-[#676057]">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-[#676057]">
              {totalDiaMR.toFixed(2)}
            </span>
            <span className="text-xs font-bold text-[#676057]/70">MR</span>
          </div>
          <p className="mt-1 text-[11px] text-gray-500">
            {filteredDia.length} registros consolidados en faena
          </p>
          <div className="mt-3 flex items-center gap-1 text-[11px] font-bold text-[#676057] cursor-pointer" onClick={() => onNavigateTab('bd-produccion-dia')}>
            <span>Ver Base de Datos</span>
            <ArrowUpRight className="w-3 h-3" />
          </div>
        </div>

        {/* Total Producción Personal */}
        <div className="bg-white rounded-3xl p-5 border border-[#676057]/10 shadow-sm relative overflow-hidden group hover:border-[#BCB703]/50 transition">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#676057]/70">
              Suma Prod. Personal
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#BCB703]/20 text-[#676057]">
              <Award className="w-4 h-4 text-[#BCB703]" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-[#BCB703]">
              {totalPersonalMR.toFixed(2)}
            </span>
            <span className="text-xs font-bold text-gray-500">MR</span>
          </div>
          <p className="mt-1 text-[11px] text-gray-500">
            {filteredPersonal.length} registros individuales de operadores
          </p>
          <div className="mt-3 flex items-center gap-1 text-[11px] font-bold text-[#BCB703] cursor-pointer" onClick={() => onNavigateTab('bd-produccion-personal')}>
            <span>Ver Base de Datos</span>
            <ArrowUpRight className="w-3 h-3" />
          </div>
        </div>

        {/* Promedio Diario de Extracción */}
        <div className="bg-white rounded-3xl p-5 border border-[#676057]/10 shadow-sm relative overflow-hidden group hover:border-[#D37608]/50 transition">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#676057]/70">
              Promedio Diario
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-orange-100 text-[#D37608]">
              <Activity className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-[#D37608]">
              {avgDiarioMR.toFixed(1)}
            </span>
            <span className="text-xs font-bold text-gray-500">MR / día</span>
          </div>
          <p className="mt-1 text-[11px] text-gray-500">
            Calculado en {uniqueDatesCount} jornada(s) operativas
          </p>
          <div className="mt-3 text-[11px] font-bold text-[#676057]">
            Ritmo de producción en faena
          </div>
        </div>

        {/* Avance Faena & Dotación (Meta Manual Configurable por Administrador) */}
        <div className="bg-[#F2EDC9]/60 rounded-3xl p-5 border border-[#676057]/15 shadow-sm relative group">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#676057]/70">
                Avance de Faena
              </span>
              {isAdmin && (
                <button
                  type="button"
                  onClick={() => {
                    setInputGoalMR(String(faenaMilestoneMR));
                    setIsEditingGoal(true);
                  }}
                  className="p-1 rounded-md text-[#676057]/60 hover:text-[#676057] hover:bg-[#676057]/10 transition"
                  title="Configurar meta del mes (Administrador)"
                >
                  <Pencil className="w-3 h-3" />
                </button>
              )}
            </div>
            <span className="text-xs font-black text-[#676057]">{faenaProgressPct}%</span>
          </div>

          <div className="mt-2.5 w-full bg-gray-200/80 rounded-full h-3 overflow-hidden">
            <div
              className="bg-[#BCB703] h-full rounded-full transition-all duration-700"
              style={{ width: `${Math.min(100, Math.max(faenaProgressPct, 0))}%` }}
            />
          </div>

          <div className="mt-2.5 flex items-center justify-between text-[11px] text-[#676057]">
            <div className="flex items-center gap-1.5">
              <span>
                Meta:{' '}
                <button
                  type="button"
                  onClick={() => {
                    if (isAdmin) {
                      setInputGoalMR(String(faenaMilestoneMR));
                      setIsEditingGoal(true);
                    }
                  }}
                  className={`${isAdmin ? 'hover:underline cursor-pointer' : 'cursor-default'} font-bold text-[#676057]`}
                  title={isAdmin ? 'Haz clic para modificar la meta' : undefined}
                >
                  {faenaMilestoneMR} MR
                </button>
              </span>
            </div>
            <span className="font-bold text-[#BCB703]">
              {personalList.filter((p) => p.activo !== false).length} Operadores Activos
            </span>
          </div>

          {/* Modal para que el Administrador ingrese la Meta Mensual */}
          {isEditingGoal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
              <div className="bg-white rounded-3xl max-w-sm w-full p-5 shadow-2xl space-y-4 border border-gray-100">
                <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                  <div className="flex items-center gap-2">
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#BCB703]/20 text-[#676057]">
                      <Target className="w-4 h-4 text-[#BCB703]" />
                    </span>
                    <h4 className="font-bold text-sm text-[#676057]">
                      Meta Mensual de Producción
                    </h4>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsEditingGoal(false)}
                    className="p-1 text-gray-400 hover:text-gray-600 rounded-lg"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <p className="text-xs text-gray-500">
                  Ingresa manualmente la meta mensual en <strong>Metros Ruma (MR)</strong> para el cálculo del avance de faena.
                </p>

                <form onSubmit={handleSaveGoal} className="space-y-3">
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-600 mb-1">
                      Meta Objetivo del Mes
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        min="1"
                        step="1"
                        value={inputGoalMR}
                        onChange={(e) => setInputGoalMR(e.target.value)}
                        placeholder="Ej. 500"
                        required
                        className="w-full pl-3.5 pr-12 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#BCB703] text-sm font-bold text-[#676057]"
                      />
                      <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400">
                        MR
                      </span>
                    </div>
                  </div>

                  {/* Botones de selección rápida */}
                  <div className="flex items-center gap-1.5 flex-wrap pt-1">
                    <span className="text-[10px] text-gray-400 font-semibold w-full">Metas frecuentes:</span>
                    {[300, 500, 800, 1000, 1500, 2000].map((preset) => (
                      <button
                        type="button"
                        key={preset}
                        onClick={() => setInputGoalMR(String(preset))}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition ${
                          inputGoalMR === String(preset)
                            ? 'bg-[#BCB703] text-white border-[#BCB703]'
                            : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
                        }`}
                      >
                        {preset} MR
                      </button>
                    ))}
                  </div>

                  <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
                    <button
                      type="button"
                      onClick={() => setIsEditingGoal(false)}
                      disabled={isSavingGoal}
                      className="px-3.5 py-2 rounded-xl border border-gray-200 text-xs font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-50"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={isSavingGoal}
                      className="px-4 py-2 rounded-xl bg-[#676057] text-xs font-bold text-white hover:bg-[#534d45] flex items-center gap-1.5 shadow-xs disabled:opacity-50 transition active:scale-95"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>{isSavingGoal ? 'Guardando...' : 'Guardar Meta'}</span>
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Main Column Chart: Gráfico de Columnas Día a Día */}
      <DailyProductionColumnChart
        produccionDia={filteredDia}
        produccionPersonal={filteredPersonal}
        selectedMonth={selectedMonth}
      />

      {/* Two Column Layout: Operator Production & Wood Classifications */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Producción por Persona (Ranking) */}
        <div className="lg:col-span-6 bg-white rounded-3xl p-5 sm:p-6 shadow-sm border border-[#676057]/10 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-[#676057] flex items-center gap-2">
                <Award className="w-4 h-4 text-[#D37608]" />
                Producción por Operador
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">
                Rendimiento acumulado por cada operador registrado en faena.
              </p>
            </div>
          </div>

          {operatorRankings.length === 0 ? (
            <div className="py-16 text-center text-xs text-gray-400">
              No hay datos registrados en Producción Personal aún.
            </div>
          ) : (
            <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
              {operatorRankings.map((op, idx) => (
                <div
                  key={op.operador}
                  className="p-3.5 rounded-2xl border border-gray-100 bg-gray-50/50 hover:bg-white hover:border-[#BCB703]/50 transition"
                >
                  <div className="flex items-center justify-between text-xs mb-1">
                    <div className="flex items-center gap-2">
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#676057] text-white text-[10px] font-bold">
                        {idx + 1}
                      </span>
                      <span className="font-bold text-[#676057]">{op.operador}</span>
                    </div>
                    <span className="font-black text-[#BCB703] text-sm">
                      {op.totalMR.toFixed(2)} MR
                    </span>
                  </div>

                  <div className="w-full bg-gray-200/80 rounded-full h-2 overflow-hidden my-1.5">
                    <div
                      className="bg-[#D37608] h-full rounded-full transition-all duration-500"
                      style={{ width: `${Math.max(op.percentage, 4)}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-gray-400">
                    <span>{op.count} registro(s)</span>
                    <span className="font-semibold text-gray-600">{op.percentage.toFixed(1)}% del total</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Column: Especies, Calidad y Largo de Madera */}
        <div className="lg:col-span-6 space-y-6">
          
          {/* Especie y Calidad en sub-grid responsivo */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            {/* Distribución por Especie */}
            <div className="bg-white rounded-3xl p-4 sm:p-5 border border-[#676057]/10 shadow-sm space-y-3">
              <h4 className="text-sm font-bold text-[#676057] flex items-center gap-2">
                <Layers className="w-4 h-4 text-[#BCB703]" />
                Por Especie
              </h4>
              <div className="space-y-2.5">
                {(['Pino Radiata', 'Euca GL', 'Euca NT'] as EspecieMadera[]).map((esp) => {
                  const val = speciesData[esp] || 0;
                  const pct = totalDiaMR > 0 ? (val / totalDiaMR) * 100 : 0;
                  return (
                    <div key={esp} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-[#676057] truncate max-w-[110px]">{esp}</span>
                        <span className="font-bold text-gray-700 text-[11px]">
                          {val.toFixed(1)} MR ({pct.toFixed(0)}%)
                        </span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-[#BCB703] h-full rounded-full transition-all duration-500"
                          style={{ width: `${Math.max(pct, 1)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Distribución por Calidad */}
            <div className="bg-white rounded-3xl p-4 sm:p-5 border border-[#676057]/10 shadow-sm space-y-3">
              <h4 className="text-sm font-bold text-[#676057] flex items-center gap-2">
                <Layers className="w-4 h-4 text-[#D37608]" />
                Por Calidad
              </h4>
              <div className="space-y-2.5">
                {(['Bosque', 'LOG'] as CalidadMadera[]).map((cal) => {
                  const val = qualityData[cal] || 0;
                  const pct = totalDiaMR > 0 ? (val / totalDiaMR) * 100 : 0;
                  return (
                    <div key={cal} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-[#676057]">Calidad {cal}</span>
                        <span className="font-bold text-gray-700 text-[11px]">
                          {val.toFixed(1)} MR ({pct.toFixed(0)}%)
                        </span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-[#D37608] h-full rounded-full transition-all duration-500"
                          style={{ width: `${Math.max(pct, 1)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Gráfico e Indicadores de Producción por Largo de Madera */}
          <div className="bg-white rounded-3xl p-5 sm:p-6 border border-[#676057]/10 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h4 className="text-sm font-bold text-[#676057] flex items-center gap-2">
                  <Ruler className="w-4 h-4 text-[#D37608]" />
                  Producción por Largo de la Madera
                </h4>
                <p className="text-[11px] text-gray-500 mt-0.5">
                  Volumen en MR y proporción de madera clasificada según longitud.
                </p>
              </div>

              {woodLengthStats.predominant && (
                <div className="flex items-center gap-1.5 self-start sm:self-center bg-[#F2EDC9]/80 px-2.5 py-1 rounded-xl border border-[#676057]/15">
                  <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Predominante:</span>
                  <span className="text-xs font-black text-[#D37608]">
                    {woodLengthStats.predominant.label}
                  </span>
                  <span className="text-[10px] font-bold text-[#676057]">
                    ({woodLengthStats.predominant.percentage.toFixed(0)}%)
                  </span>
                </div>
              )}
            </div>

            {woodLengthStats.list.length === 0 ? (
              <div className="py-8 text-center text-xs text-gray-400">
                No hay registros con medidas de largo aún en las bases de datos.
              </div>
            ) : (
              <div className="space-y-3">
                {woodLengthStats.list.map((item, idx) => {
                  const barColor = idx % 2 === 0 ? 'bg-[#BCB703]' : 'bg-[#D37608]';
                  const textColor = idx % 2 === 0 ? 'text-[#858102]' : 'text-[#D37608]';
                  return (
                    <div key={item.largo} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded-md bg-[#676057]/10 font-black text-[#676057] text-[11px]">
                            {item.label}
                          </span>
                          <span className="text-[11px] text-gray-400">
                            {item.count} registro{item.count !== 1 ? 's' : ''}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 font-bold">
                          <span className={`text-xs ${textColor}`}>
                            {item.totalMR.toFixed(2)} MR
                          </span>
                          <span className="text-[11px] text-gray-400">
                            ({item.percentage.toFixed(1)}%)
                          </span>
                        </div>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
                        <div
                          className={`${barColor} h-full rounded-full transition-all duration-500`}
                          style={{ width: `${Math.max(item.percentage, 2)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}

                {/* Resumen footer */}
                <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-500 font-medium">
                  <span>{woodLengthStats.list.length} medida(s) registrada(s)</span>
                  <span>
                    Total medido:{' '}
                    <strong className="text-[#676057] font-bold">
                      {woodLengthStats.totalMRAll.toFixed(2)} MR
                    </strong>
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
