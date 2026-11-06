import React, { useState } from 'react';
import { DateReconciliation } from '../types';
import { AlertTriangle, CheckCircle2, ChevronDown, ChevronUp, Scale, Calendar } from 'lucide-react';

interface Props {
  discrepancies: DateReconciliation[];
  allReconciliations: DateReconciliation[];
  selectedFecha?: string;
  onSelectFecha?: (fecha: string) => void;
}

export const ReconciliationAlertBanner: React.FC<Props> = ({
  discrepancies,
  allReconciliations,
  selectedFecha,
  onSelectFecha,
}) => {
  const [expanded, setExpanded] = useState(false);

  // If there's a specific selected date, evaluate it
  const selectedRec = selectedFecha
    ? allReconciliations.find((r) => r.fecha === selectedFecha)
    : null;

  if (selectedRec && !selectedRec.isBalanced) {
    return (
      <div className="mb-6 rounded-2xl border-2 border-[#D37608] bg-[#F2EDC9]/60 p-4 shadow-sm transition-all animate-fade-in">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-start sm:items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#D37608] text-white shadow-md">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="inline-block rounded-md bg-[#D37608] px-2 py-0.5 text-xs font-bold text-white uppercase tracking-wider">
                  Alerta de Descuadre
                </span>
                <span className="text-xs font-semibold text-[#676057]">
                  Fecha: {selectedRec.fecha}
                </span>
              </div>
              <p className="mt-1 text-sm font-bold text-[#676057]">
                El volumen de Producción Día ({selectedRec.totalDiaMR.toFixed(2)} MR) no coincide con la suma de Producción Personal ({selectedRec.totalPersonalMR.toFixed(2)} MR).
              </p>
              <p className="text-xs text-[#676057]/80">
                Diferencia detectada:{' '}
                <strong className="text-[#D37608] font-bold">
                  {selectedRec.diferenciaMR.toFixed(2)} MR
                </strong>
                . Verifique los ingresos de esta fecha para cuadrar la faena.
              </p>
            </div>
          </div>
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1 rounded-lg border border-[#D37608]/40 bg-white px-3 py-1.5 text-xs font-semibold text-[#D37608] hover:bg-orange-50 transition self-end sm:self-center"
          >
            <span>{expanded ? 'Ocultar Detalle' : 'Auditoría'}</span>
            {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>

        {expanded && (
          <div className="mt-4 pt-3 border-t border-[#D37608]/20 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className="bg-white/80 p-3 rounded-xl border border-gray-100">
              <span className="text-gray-500 block">Total Producción Día:</span>
              <strong className="text-base text-[#676057]">{selectedRec.totalDiaMR.toFixed(2)} MR</strong>
              <span className="text-[11px] text-gray-400 block">{selectedRec.countDia} registro(s)</span>
            </div>
            <div className="bg-white/80 p-3 rounded-xl border border-gray-100">
              <span className="text-gray-500 block">Suma Prod. Personal:</span>
              <strong className="text-base text-[#676057]">{selectedRec.totalPersonalMR.toFixed(2)} MR</strong>
              <span className="text-[11px] text-gray-400 block">{selectedRec.countPersonal} registro(s)</span>
            </div>
            <div className="bg-orange-100/80 p-3 rounded-xl border border-orange-200">
              <span className="text-orange-800 block font-medium">Diferencia Neta:</span>
              <strong className="text-base text-[#D37608]">
                {selectedRec.totalDiaMR > selectedRec.totalPersonalMR ? '+' : '-'}
                {selectedRec.diferenciaMR.toFixed(2)} MR
              </strong>
              <span className="text-[11px] text-orange-700 block">
                {selectedRec.totalDiaMR > selectedRec.totalPersonalMR ? 'Falta registrar personal' : 'Exceso en personal'}
              </span>
            </div>
          </div>
        )}
      </div>
    );
  }

  // If there are general discrepancies
  if (discrepancies.length > 0) {
    return (
      <div className="mb-6 rounded-2xl border border-[#D37608]/40 bg-[#F2EDC9]/40 p-3.5 sm:p-4 shadow-sm transition-all">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#D37608] text-white shadow-sm">
              <Scale className="h-4 w-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-[#D37608]">
                  Condición de Control de Volumen
                </span>
                <span className="rounded-full bg-[#D37608] px-2 py-0.2 text-[10px] font-bold text-white">
                  {discrepancies.length} fecha(s) con descuadre
                </span>
              </div>
              <p className="text-xs sm:text-sm text-[#676057]">
                Se encontraron discrepancias entre Producción Día y la suma de Producción Personal.
              </p>
            </div>
          </div>
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1 self-end sm:self-center rounded-lg border border-[#676057]/20 bg-white px-3 py-1.5 text-xs font-medium text-[#676057] hover:bg-gray-50 transition"
          >
            <span>{expanded ? 'Ocultar fechas' : 'Ver fechas afectadas'}</span>
            {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>

        {expanded && (
          <div className="mt-3.5 pt-3 border-t border-[#676057]/10 space-y-2">
            <p className="text-xs font-semibold text-[#676057]">
              Seleccione una fecha para revisar el balance de metros ruma (MR):
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
              {discrepancies.map((d) => (
                <button
                  key={d.fecha}
                  onClick={() => onSelectFecha && onSelectFecha(d.fecha)}
                  className="flex items-center justify-between p-2.5 rounded-xl border border-[#D37608]/30 bg-white text-left hover:border-[#D37608] hover:shadow-sm transition"
                >
                  <div className="flex items-center gap-2">
                    <Calendar className="w-3.5 h-3.5 text-[#D37608]" />
                    <div>
                      <span className="block font-bold text-xs text-[#676057]">{d.fecha}</span>
                      <span className="block text-[11px] text-gray-500">
                        Día: {d.totalDiaMR.toFixed(1)} MR | Pers: {d.totalPersonalMR.toFixed(1)} MR
                      </span>
                    </div>
                  </div>
                  <span className="font-extrabold text-xs text-[#D37608]">
                    Δ {d.diferenciaMR.toFixed(1)} MR
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // All dates balanced - no alert needed in dashboard
  return null;
};
