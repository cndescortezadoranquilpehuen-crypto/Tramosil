import * as XLSX from 'xlsx';
import { ProduccionDia, ProduccionPersonal } from '../types';

export function exportToCSV(filename: string, rows: Record<string, unknown>[]) {
  if (!rows || !rows.length) return;
  const headers = Object.keys(rows[0]);
  const csvContent = [
    headers.join(';'),
    ...rows.map((row) =>
      headers
        .map((field) => {
          let val = row[field];
          if (val === null || val === undefined) val = '';
          const str = String(val).replace(/"/g, '""');
          return `"${str}"`;
        })
        .join(';')
    ),
  ].join('\r\n');

  const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function exportProduccionDiaExcel(data: ProduccionDia[], filename = 'Produccion_Dia_Tramosil') {
  const formatted = data.map((d) => ({
    'ID': d.id,
    'Fecha Operación': d.fecha,
    'Fecha y Hora Registro': d.fechaHoraIngreso,
    'Especie': d.especie,
    'Calidad': d.calidad,
    'Largo Madera (m)': d.largoMadera,
    'Volumen (MR)': d.volumenMR,
    'Registrado Por': d.createdByName || 'Operador',
  }));

  const worksheet = XLSX.utils.json_to_sheet(formatted);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Producción Día');

  // Auto-fit column widths
  worksheet['!cols'] = [
    { wch: 20 },
    { wch: 15 },
    { wch: 22 },
    { wch: 16 },
    { wch: 12 },
    { wch: 16 },
    { wch: 14 },
    { wch: 22 },
  ];

  XLSX.writeFile(workbook, `${filename}.xlsx`);
}

export function exportProduccionPersonalExcel(data: ProduccionPersonal[], filename = 'Produccion_Personal_Tramosil') {
  const formatted = data.map((d) => ({
    'ID': d.id,
    'Fecha Operación': d.fecha,
    'Fecha y Hora Registro': d.fechaHoraIngreso,
    'Operador': d.operador,
    'Especie': d.especie,
    'Calidad': d.calidad,
    'Largo Madera (m)': d.largoMadera,
    'Volumen (MR)': d.volumenMR,
    'Registrado Por': d.createdByName || 'Supervisor',
  }));

  const worksheet = XLSX.utils.json_to_sheet(formatted);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Producción Personal');

  worksheet['!cols'] = [
    { wch: 20 },
    { wch: 15 },
    { wch: 22 },
    { wch: 24 },
    { wch: 16 },
    { wch: 12 },
    { wch: 16 },
    { wch: 14 },
    { wch: 22 },
  ];

  XLSX.writeFile(workbook, `${filename}.xlsx`);
}
