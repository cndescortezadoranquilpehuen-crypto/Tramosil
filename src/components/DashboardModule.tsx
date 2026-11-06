import React, { useState, useMemo } from 'react';
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
import {
  BarChart3,
  TrendingUp,
  Calendar,
  Layers,
  Award,
  ArrowUpRight,
  PlusCircle,
  Activity
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
  const [selectedMonth, setSelectedMonth] = useState<string>('all');
  const [targetAuditDate, setTargetAuditDate] = useState<string | undefined>(undefined);

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

  // Monthly faena target: set nominal faena milestone e.g. 500 MR or 1.5x total
  const faenaMilestoneMR = Math.max(500, Math.ceil(totalDiaMR / 200) * 200 + 100);
  const faenaProgressPct = Math.min(100, Math.round((totalDiaMR / faenaMilestoneMR) * 100));

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

        {/* Avance Faena & Dotación */}
        <div className="bg-[#F2EDC9]/60 rounded-3xl p-5 border border-[#676057]/15 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#676057]/70">
              Avance de Faena
            </span>
            <span className="text-xs font-black text-[#676057]">{faenaProgressPct}%</span>
          </div>
          <div className="mt-2.5 w-full bg-gray-200/80 rounded-full h-3 overflow-hidden">
            <div
              className="bg-[#BCB703] h-full rounded-full transition-all duration-700"
              style={{ width: `${faenaProgressPct}%` }}
            />
          </div>
          <div className="mt-2.5 flex items-center justify-between text-[11px] text-[#676057]">
            <span>Meta: {faenaMilestoneMR} MR</span>
            <span className="font-bold text-[#BCB703]">
              {personalList.filter((p) => p.activo !== false).length} Operadores Activos
            </span>
          </div>
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

        {/* Right Column: Especies y Calidad */}
        <div className="lg:col-span-6 space-y-6">
          {/* Distribución por Especie */}
          <div className="bg-white rounded-3xl p-5 sm:p-6 border border-[#676057]/10 shadow-sm space-y-3">
            <h4 className="text-sm font-bold text-[#676057] flex items-center gap-2">
              <Layers className="w-4 h-4 text-[#BCB703]" />
              Distribución por Especie de Madera
            </h4>
            <div className="space-y-3">
              {(['Pino Radiata', 'Euca GL', 'Euca NT'] as EspecieMadera[]).map((esp) => {
                const val = speciesData[esp] || 0;
                const pct = totalDiaMR > 0 ? (val / totalDiaMR) * 100 : 0;
                return (
                  <div key={esp} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-[#676057]">{esp}</span>
                      <span className="font-bold text-gray-700">
                        {val.toFixed(2)} MR ({pct.toFixed(1)}%)
                      </span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
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
          <div className="bg-white rounded-3xl p-5 sm:p-6 border border-[#676057]/10 shadow-sm space-y-3">
            <h4 className="text-sm font-bold text-[#676057] flex items-center gap-2">
              <Layers className="w-4 h-4 text-[#D37608]" />
              Distribución por Calidad de Madera
            </h4>
            <div className="space-y-3">
              {(['Bosque', 'LOG'] as CalidadMadera[]).map((cal) => {
                const val = qualityData[cal] || 0;
                const pct = totalDiaMR > 0 ? (val / totalDiaMR) * 100 : 0;
                return (
                  <div key={cal} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-[#676057]">Calidad {cal}</span>
                      <span className="font-bold text-gray-700">
                        {val.toFixed(2)} MR ({pct.toFixed(1)}%)
                      </span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
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

      </div>
    </div>
  );
};
