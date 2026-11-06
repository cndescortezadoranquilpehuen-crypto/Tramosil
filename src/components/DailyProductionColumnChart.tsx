import React, { useState, useMemo } from 'react';
import { ProduccionDia, ProduccionPersonal } from '../types';
import { BarChart2, Calendar, TrendingUp, Filter, Sparkles } from 'lucide-react';

interface Props {
  produccionDia: ProduccionDia[];
  produccionPersonal: ProduccionPersonal[];
  selectedMonth?: string;
}

type ChartViewMode = 'ambas' | 'dia' | 'personal';

export const DailyProductionColumnChart: React.FC<Props> = ({
  produccionDia,
  produccionPersonal,
  selectedMonth,
}) => {
  const [viewMode, setViewMode] = useState<ChartViewMode>('ambas');
  const [hoveredDate, setHoveredDate] = useState<string | null>(null);

  // Consolidate data by day
  const dailyData = useMemo(() => {
    const map = new Map<string, { diaMR: number; persMR: number; diaCount: number; persCount: number }>();

    // Process Producción Día
    produccionDia.forEach((item) => {
      if (selectedMonth && selectedMonth !== 'all' && !item.fecha.startsWith(selectedMonth)) {
        return;
      }
      const existing = map.get(item.fecha) || { diaMR: 0, persMR: 0, diaCount: 0, persCount: 0 };
      existing.diaMR += Number(item.volumenMR) || 0;
      existing.diaCount += 1;
      map.set(item.fecha, existing);
    });

    // Process Producción Personal
    produccionPersonal.forEach((item) => {
      if (selectedMonth && selectedMonth !== 'all' && !item.fecha.startsWith(selectedMonth)) {
        return;
      }
      const existing = map.get(item.fecha) || { diaMR: 0, persMR: 0, diaCount: 0, persCount: 0 };
      existing.persMR += Number(item.volumenMR) || 0;
      existing.persCount += 1;
      map.set(item.fecha, existing);
    });

    // Sort chronologically (ascending for timeline)
    const sortedDates = Array.from(map.keys()).sort();

    return sortedDates.map((fecha) => {
      const data = map.get(fecha)!;
      // Format short label e.g. "05 Nov"
      const parts = fecha.split('-');
      const day = parts[2] || '';
      const monthNum = parseInt(parts[1] || '1', 10);
      const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
      const shortLabel = `${day} ${months[monthNum - 1] || ''}`;

      return {
        fecha,
        shortLabel,
        diaMR: Math.round(data.diaMR * 100) / 100,
        persMR: Math.round(data.persMR * 100) / 100,
        diaCount: data.diaCount,
        persCount: data.persCount,
        maxInDay: Math.max(data.diaMR, data.persMR),
      };
    });
  }, [produccionDia, produccionPersonal, selectedMonth]);

  // Determine highest peak value for Y-axis scale
  const { maxVal, peakDay, avgDiaMR } = useMemo(() => {
    let peak = 10;
    let bestDay = '';
    let totalMR = 0;

    dailyData.forEach((d) => {
      const compareVal =
        viewMode === 'ambas'
          ? Math.max(d.diaMR, d.persMR)
          : viewMode === 'dia'
          ? d.diaMR
          : d.persMR;

      if (compareVal > peak) {
        peak = compareVal;
        bestDay = d.fecha;
      }
      totalMR += d.diaMR;
    });

    // Round up peak nicely for Y-axis ticks
    const roundedPeak = Math.ceil(peak / 20) * 20;

    return {
      maxVal: Math.max(roundedPeak, 20),
      peakDay: bestDay,
      avgDiaMR: dailyData.length > 0 ? totalMR / dailyData.length : 0,
    };
  }, [dailyData, viewMode]);

  // Generate 4 Y-axis ticks
  const yTicks = useMemo(() => {
    return [
      Math.round(maxVal),
      Math.round(maxVal * 0.75),
      Math.round(maxVal * 0.5),
      Math.round(maxVal * 0.25),
      0,
    ];
  }, [maxVal]);

  const activeHoverItem = useMemo(() => {
    if (!hoveredDate) return null;
    return dailyData.find((d) => d.fecha === hoveredDate) || null;
  }, [hoveredDate, dailyData]);

  return (
    <div className="bg-white rounded-3xl p-5 sm:p-6 shadow-sm border border-[#676057]/10 space-y-5">
      {/* Chart Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-100">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#BCB703]/20 text-[#676057]">
              <BarChart2 className="w-4 h-4 text-[#BCB703]" />
            </span>
            <h3 className="text-base font-bold text-[#676057]">
              Producción Día a Día (Gráfico de Columnas)
            </h3>
          </div>
          <p className="text-xs text-gray-500 mt-0.5">
            Volumen acumulado por jornada operativa medido en Metro Ruma (MR).
          </p>
        </div>

        {/* View Mode Controls & Legend */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Legend */}
          <div className="flex items-center gap-3 text-xs font-semibold mr-1">
            {(viewMode === 'ambas' || viewMode === 'dia') && (
              <div className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded-xs bg-[#676057]" />
                <span className="text-gray-600">Prod. Día</span>
              </div>
            )}
            {(viewMode === 'ambas' || viewMode === 'personal') && (
              <div className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded-xs bg-[#BCB703]" />
                <span className="text-gray-600">Personal</span>
              </div>
            )}
          </div>

          {/* Toggle buttons */}
          <div className="flex rounded-xl bg-gray-100 p-1 text-[11px] font-bold">
            <button
              onClick={() => setViewMode('ambas')}
              className={`px-2.5 py-1 rounded-lg transition ${
                viewMode === 'ambas'
                  ? 'bg-white text-[#676057] shadow-xs'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              Comparativo
            </button>
            <button
              onClick={() => setViewMode('dia')}
              className={`px-2.5 py-1 rounded-lg transition ${
                viewMode === 'dia'
                  ? 'bg-white text-[#676057] shadow-xs'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              Solo Día
            </button>
            <button
              onClick={() => setViewMode('personal')}
              className={`px-2.5 py-1 rounded-lg transition ${
                viewMode === 'personal'
                  ? 'bg-white text-[#676057] shadow-xs'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              Solo Personal
            </button>
          </div>
        </div>
      </div>

      {/* Main Column Chart Container */}
      {dailyData.length === 0 ? (
        <div className="py-20 text-center text-xs text-gray-400">
          No hay registros de producción para el período seleccionado.
        </div>
      ) : (
        <div className="space-y-3">
          {/* Active tooltip banner on hover */}
          <div className="min-h-9 flex items-center justify-between px-3 py-1.5 rounded-xl bg-[#F2EDC9]/40 border border-[#676057]/10 text-xs">
            {activeHoverItem ? (
              <div className="flex items-center justify-between w-full font-medium text-[#676057]">
                <span className="font-bold flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-[#BCB703]" />
                  Fecha: {activeHoverItem.fecha}
                </span>
                <div className="flex items-center gap-4">
                  <span className="flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-[#676057]" />
                    Prod. Día: <strong>{activeHoverItem.diaMR.toFixed(2)} MR</strong>
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-[#BCB703]" />
                    Prod. Personal: <strong>{activeHoverItem.persMR.toFixed(2)} MR</strong>
                  </span>
                </div>
              </div>
            ) : (
              <span className="text-gray-400 text-[11px] italic">
                Pasa el cursor o presiona sobre cualquier columna para ver el detalle exacto de esa jornada.
              </span>
            )}
          </div>

          {/* Chart Canvas with Y-axis and Columns */}
          <div className="relative pt-6 pb-2">
            <div className="flex">
              {/* Y-Axis Labels */}
              <div className="flex flex-col justify-between text-[10px] font-bold text-gray-400 pr-2 h-64 select-none shrink-0 text-right w-11">
                {yTicks.map((tick, i) => (
                  <span key={i} className="leading-none">
                    {tick} MR
                  </span>
                ))}
              </div>

              {/* Columns Area with Horizontal Gridlines */}
              <div className="relative flex-1 h-64 border-b border-l border-gray-200 overflow-x-auto">
                {/* Horizontal gridlines */}
                <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
                  {yTicks.map((_, i) => (
                    <div
                      key={i}
                      className={`w-full border-t ${
                        i === yTicks.length - 1 ? 'border-transparent' : 'border-gray-100 border-dashed'
                      }`}
                    />
                  ))}
                </div>

                {/* Columns flex container */}
                <div className="relative h-full flex items-end justify-around px-2 min-w-max gap-3 sm:gap-6">
                  {dailyData.map((d) => {
                    const diaHeightPct = Math.min(100, Math.max(3, (d.diaMR / maxVal) * 100));
                    const persHeightPct = Math.min(100, Math.max(3, (d.persMR / maxVal) * 100));
                    const isHovered = hoveredDate === d.fecha;
                    const isPeak = d.fecha === peakDay && maxVal > 0;

                    return (
                      <div
                        key={d.fecha}
                        onMouseEnter={() => setHoveredDate(d.fecha)}
                        onMouseLeave={() => setHoveredDate(null)}
                        className={`flex flex-col items-center justify-end h-full group cursor-pointer transition-transform ${
                          isHovered ? 'scale-105' : ''
                        }`}
                      >
                        {/* Peak indicator */}
                        {isPeak && (
                          <span className="mb-1 text-[9px] font-black uppercase text-[#D37608] bg-orange-100 px-1.5 py-0.5 rounded-full flex items-center gap-0.5 shadow-2xs">
                            <Sparkles className="w-2.5 h-2.5" /> Pico
                          </span>
                        )}

                        {/* Column bars */}
                        <div className="flex items-end gap-1.5 h-full">
                          {/* Column 1: Producción Día */}
                          {(viewMode === 'ambas' || viewMode === 'dia') && (
                            <div className="relative flex flex-col items-center justify-end h-full">
                              <div
                                style={{ height: `${diaHeightPct}%` }}
                                className={`w-3.5 sm:w-6 rounded-t-lg bg-[#676057] transition-all duration-500 shadow-xs ${
                                  isHovered ? 'brightness-125' : 'group-hover:opacity-90'
                                }`}
                              />
                            </div>
                          )}

                          {/* Column 2: Producción Personal */}
                          {(viewMode === 'ambas' || viewMode === 'personal') && (
                            <div className="relative flex flex-col items-center justify-end h-full">
                              <div
                                style={{ height: `${persHeightPct}%` }}
                                className={`w-3.5 sm:w-6 rounded-t-lg bg-[#BCB703] transition-all duration-500 shadow-xs ${
                                  isHovered ? 'brightness-110' : 'group-hover:opacity-90'
                                }`}
                              />
                            </div>
                          )}
                        </div>

                        {/* X-Axis Date label */}
                        <div className="mt-2 text-center">
                          <span
                            className={`block text-[11px] font-bold whitespace-nowrap transition ${
                              isHovered ? 'text-[#676057] font-black' : 'text-gray-500'
                            }`}
                          >
                            {d.shortLabel}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Summary Strip */}
          <div className="pt-3 border-t border-gray-100 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="bg-gray-50 p-2.5 rounded-xl border border-gray-100">
              <span className="text-gray-400 block text-[10px] uppercase font-bold tracking-wider">
                Jornadas Registradas
              </span>
              <strong className="text-sm font-black text-[#676057]">
                {dailyData.length} días
              </strong>
            </div>

            <div className="bg-gray-50 p-2.5 rounded-xl border border-gray-100">
              <span className="text-gray-400 block text-[10px] uppercase font-bold tracking-wider">
                Promedio Diario
              </span>
              <strong className="text-sm font-black text-[#676057]">
                {avgDiaMR.toFixed(1)} MR/día
              </strong>
            </div>

            <div className="bg-gray-50 p-2.5 rounded-xl border border-gray-100">
              <span className="text-gray-400 block text-[10px] uppercase font-bold tracking-wider">
                Producción Máxima
              </span>
              <strong className="text-sm font-black text-[#D37608]">
                {dailyData.find((d) => d.fecha === peakDay)?.diaMR.toFixed(1) || '0.0'} MR
              </strong>
            </div>

            <div className="bg-gray-50 p-2.5 rounded-xl border border-gray-100">
              <span className="text-gray-400 block text-[10px] uppercase font-bold tracking-wider">
                Estatus Operativo
              </span>
              <strong className="text-sm font-black text-[#BCB703]">
                Flujo Activo
              </strong>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
