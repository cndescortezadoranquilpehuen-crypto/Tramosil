import { useMemo } from 'react';
import { DateReconciliation, ProduccionDia, ProduccionPersonal } from '../types';

export function useReconciliation(
  produccionDia: ProduccionDia[],
  produccionPersonal: ProduccionPersonal[],
  selectedFecha?: string
) {
  const reconciliations = useMemo(() => {
    // Collect all unique dates
    const datesSet = new Set<string>();
    produccionDia.forEach((d) => d.fecha && datesSet.add(d.fecha));
    produccionPersonal.forEach((p) => p.fecha && datesSet.add(p.fecha));

    const sortedDates = Array.from(datesSet).sort((a, b) => b.localeCompare(a));

    const result: DateReconciliation[] = sortedDates.map((fecha) => {
      const recordsDia = produccionDia.filter((d) => d.fecha === fecha);
      const recordsPersonal = produccionPersonal.filter((p) => p.fecha === fecha);

      const totalDiaMR = recordsDia.reduce((sum, d) => sum + (Number(d.volumenMR) || 0), 0);
      const totalPersonalMR = recordsPersonal.reduce((sum, p) => sum + (Number(p.volumenMR) || 0), 0);

      // Round to 2 decimals to avoid floating point issues
      const roundedDia = Math.round(totalDiaMR * 100) / 100;
      const roundedPers = Math.round(totalPersonalMR * 100) / 100;
      const diferenciaMR = Math.round(Math.abs(roundedDia - roundedPers) * 100) / 100;

      const isBalanced = diferenciaMR === 0;

      return {
        fecha,
        totalDiaMR: roundedDia,
        totalPersonalMR: roundedPers,
        diferenciaMR,
        isBalanced,
        countDia: recordsDia.length,
        countPersonal: recordsPersonal.length,
      };
    });

    return result;
  }, [produccionDia, produccionPersonal]);

  const discrepancyList = useMemo(() => {
    return reconciliations.filter((r) => !r.isBalanced);
  }, [reconciliations]);

  const targetDateReconciliation = useMemo(() => {
    if (!selectedFecha) {
      return reconciliations.length > 0 ? reconciliations[0] : null;
    }
    return reconciliations.find((r) => r.fecha === selectedFecha) || null;
  }, [reconciliations, selectedFecha]);

  return {
    reconciliations,
    discrepancyList,
    hasDiscrepancies: discrepancyList.length > 0,
    targetDateReconciliation,
  };
}
