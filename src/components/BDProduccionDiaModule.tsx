import React, { useState, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { ProduccionDia, EspecieMadera, CalidadMadera } from '../types';
import { deleteProduccionDia, saveProduccionDia } from '../services/produccionDiaService';
import { exportProduccionDiaExcel, exportToCSV } from '../utils/exportUtils';
import {
  Database,
  FileSpreadsheet,
  FileText,
  Search,
  Filter,
  Trash2,
  Edit2,
  Calendar,
  X,
  Check,
  RotateCcw
} from 'lucide-react';

interface Props {
  data: ProduccionDia[];
  onDataChanged: () => void;
}

export const BDProduccionDiaModule: React.FC<Props> = ({ data, onDataChanged }) => {
  const { canEdit, canDelete } = useAuth();

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [filterEspecie, setFilterEspecie] = useState('');
  const [isThisMonthActive, setIsThisMonthActive] = useState(false);

  // Edit modal state
  const [editingRecord, setEditingRecord] = useState<ProduccionDia | null>(null);
  const [editVolumenMR, setEditVolumenMR] = useState('');
  const [editLargoMadera, setEditLargoMadera] = useState('');
  const [editEspecie, setEditEspecie] = useState<EspecieMadera>('Pino Radiata');
  const [editCalidad, setEditCalidad] = useState<CalidadMadera>('Bosque');
  const [editFecha, setEditFecha] = useState('');

  // Delete modal state
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // "Este mes" handler
  const handleApplyThisMonth = () => {
    if (isThisMonthActive) {
      setIsThisMonthActive(false);
      setStartDate('');
      setEndDate('');
    } else {
      const now = new Date();
      const yyyy = now.getFullYear();
      const mm = (now.getMonth() + 1).toString().padStart(2, '0');
      const start = `${yyyy}-${mm}-01`;
      // Last day of month
      const lastDay = new Date(yyyy, now.getMonth() + 1, 0).getDate();
      const end = `${yyyy}-${mm}-${lastDay.toString().padStart(2, '0')}`;
      setStartDate(start);
      setEndDate(end);
      setIsThisMonthActive(true);
    }
  };

  const handleClearFilters = () => {
    setSearchTerm('');
    setStartDate('');
    setEndDate('');
    setFilterEspecie('');
    setIsThisMonthActive(false);
  };

  // Filtered records
  const filteredData = useMemo(() => {
    return data.filter((item) => {
      // Search term
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        const matchesTerm =
          item.fecha.includes(term) ||
          item.especie.toLowerCase().includes(term) ||
          item.calidad.toLowerCase().includes(term) ||
          (item.createdByName && item.createdByName.toLowerCase().includes(term));
        if (!matchesTerm) return false;
      }

      // Date range
      if (startDate && item.fecha < startDate) return false;
      if (endDate && item.fecha > endDate) return false;

      // Especie
      if (filterEspecie && item.especie !== filterEspecie) return false;

      return true;
    }).sort((a, b) => {
      const dateComp = b.fecha.localeCompare(a.fecha);
      if (dateComp !== 0) return dateComp;
      return (b.fechaHoraIngreso || '').localeCompare(a.fechaHoraIngreso || '');
    });
  }, [data, searchTerm, startDate, endDate, filterEspecie]);

  // Total volume
  const totalVolume = useMemo(() => {
    return filteredData.reduce((acc, curr) => acc + (Number(curr.volumenMR) || 0), 0);
  }, [filteredData]);

  // Trigger Edit
  const handleOpenEdit = (rec: ProduccionDia) => {
    setEditingRecord(rec);
    setEditFecha(rec.fecha);
    setEditVolumenMR(String(rec.volumenMR));
    setEditLargoMadera(String(rec.largoMadera));
    setEditEspecie(rec.especie);
    setEditCalidad(rec.calidad);
  };

  const handleSaveEdit = async () => {
    if (!editingRecord) return;
    const mr = parseFloat(editVolumenMR);
    if (isNaN(mr) || mr <= 0) return;

    await saveProduccionDia({
      id: editingRecord.id,
      fecha: editFecha,
      fechaHoraIngreso: editingRecord.fechaHoraIngreso,
      especie: editEspecie,
      calidad: editCalidad,
      largoMadera: parseFloat(editLargoMadera) || 0,
      volumenMR: mr,
      createdBy: editingRecord.createdBy,
      createdByName: editingRecord.createdByName,
    });

    setEditingRecord(null);
    onDataChanged();
  };

  const handleDelete = async (id: string) => {
    await deleteProduccionDia(id);
    setDeletingId(null);
    onDataChanged();
  };

  // Export handlers
  const handleExportExcel = () => {
    exportProduccionDiaExcel(filteredData, `Tramosil_BD_Produccion_Dia_${new Date().toISOString().split('T')[0]}`);
  };

  const handleExportCSV = () => {
    const formatted = filteredData.map((d) => ({
      ID: d.id,
      Fecha: d.fecha,
      FechaHoraIngreso: d.fechaHoraIngreso,
      Especie: d.especie,
      Calidad: d.calidad,
      LargoMadera: d.largoMadera,
      VolumenMR: d.volumenMR,
      RegistradoPor: d.createdByName || '',
    }));
    exportToCSV(`Tramosil_BD_Produccion_Dia_${new Date().toISOString().split('T')[0]}`, formatted);
  };

  return (
    <div className="space-y-6">
      
      {/* Header & Export Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-[#676057]/15">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#676057] text-white">
              <Database className="w-4 h-4" />
            </span>
            <h2 className="text-xl sm:text-2xl font-black text-[#676057] tracking-tight">
              Base de Datos Producción Día
            </h2>
          </div>
          <p className="mt-1 text-xs sm:text-sm text-[#676057]/80">
            Historial consolidado de registros diarios con filtros por mes, rango de fechas y especie.
          </p>
        </div>

        {/* Export Buttons */}
        <div className="flex items-center gap-2 self-start md:self-center">
          <button
            onClick={handleExportExcel}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#BCB703] hover:bg-[#a6a202] text-white text-xs font-bold shadow-xs transition active:scale-95"
            title="Descargar en formato Excel (.xlsx)"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Descargar Excel</span>
          </button>

          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#676057] hover:bg-[#534d45] text-white text-xs font-bold shadow-xs transition active:scale-95"
            title="Descargar en formato CSV"
          >
            <FileText className="w-4 h-4" />
            <span>Descargar CSV</span>
          </button>
        </div>
      </div>

      {/* Filter Toolbar Card */}
      <div className="bg-white rounded-3xl p-4 sm:p-6 shadow-sm border border-[#676057]/10 space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-[#676057] flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-[#D37608]" />
            Filtros Avanzados
          </span>
          <button
            onClick={handleClearFilters}
            className="text-xs text-gray-500 hover:text-[#676057] flex items-center gap-1 font-semibold"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Limpiar Filtros</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          
          {/* Quick Filter: "Este Mes" */}
          <div className="flex flex-col justify-end">
            <button
              onClick={handleApplyThisMonth}
              className={`w-full py-2.5 px-3 rounded-xl text-xs font-bold border transition flex items-center justify-center gap-1.5 ${
                isThisMonthActive
                  ? 'bg-[#BCB703] text-white border-[#BCB703] shadow-xs'
                  : 'bg-[#F2EDC9]/50 text-[#676057] border-[#676057]/20 hover:bg-[#F2EDC9]'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>{isThisMonthActive ? '✓ Filtro Este Mes' : 'Filtrar Este Mes'}</span>
            </button>
          </div>

          {/* Fecha Desde */}
          <div>
            <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">
              Desde
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setIsThisMonthActive(false);
              }}
              className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#BCB703] bg-white font-medium"
            />
          </div>

          {/* Fecha Hasta */}
          <div>
            <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">
              Hasta
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setIsThisMonthActive(false);
              }}
              className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#BCB703] bg-white font-medium"
            />
          </div>
        </div>

        {/* Search bar & Species filter */}
        <div className="pt-2 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar por fecha, calidad, especie o usuario..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3.5 py-2 text-xs rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#BCB703] bg-white font-medium"
            />
          </div>

          <div className="w-full sm:w-48">
            <select
              value={filterEspecie}
              onChange={(e) => setFilterEspecie(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#BCB703] bg-white font-medium"
            >
              <option value="">Todas las Especies</option>
              <option value="Pino Radiata">Pino Radiata</option>
              <option value="Euca GL">Euca GL</option>
              <option value="Euca NT">Euca NT</option>
            </select>
          </div>
        </div>
      </div>

      {/* Metric summary strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="bg-white p-3.5 rounded-2xl border border-gray-100 shadow-2xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400 block">
            Registros Filtrados
          </span>
          <span className="text-xl font-black text-[#676057]">{filteredData.length}</span>
        </div>
        <div className="bg-white p-3.5 rounded-2xl border border-gray-100 shadow-2xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400 block">
            Volumen Total (MR)
          </span>
          <span className="text-xl font-black text-[#D37608]">{totalVolume.toFixed(2)} MR</span>
        </div>
        <div className="bg-white p-3.5 rounded-2xl border border-gray-100 shadow-2xs col-span-2 sm:col-span-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400 block">
            Promedio por Registro
          </span>
          <span className="text-xl font-black text-[#BCB703]">
            {filteredData.length > 0 ? (totalVolume / filteredData.length).toFixed(2) : '0.00'} MR
          </span>
        </div>
      </div>

      {/* Records Table */}
      <div className="bg-white rounded-3xl shadow-sm border border-[#676057]/10 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[#676057] text-white uppercase tracking-wider text-[11px]">
                <th className="py-3.5 px-4 font-bold">Fecha</th>
                <th className="py-3.5 px-4 font-bold">Registro Auto</th>
                <th className="py-3.5 px-4 font-bold">Especie</th>
                <th className="py-3.5 px-4 font-bold">Calidad</th>
                <th className="py-3.5 px-4 font-bold">Largo</th>
                <th className="py-3.5 px-4 font-bold text-right">Volumen (MR)</th>
                <th className="py-3.5 px-4 font-bold">Registrado Por</th>
                {(canEdit || canDelete) && <th className="py-3.5 px-4 font-bold text-center">Acciones</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredData.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-gray-400 text-xs">
                    No se encontraron registros con los filtros seleccionados.
                  </td>
                </tr>
              ) : (
                filteredData.map((row) => (
                  <tr key={row.id} className="hover:bg-[#F2EDC9]/25 transition">
                    <td className="py-3 px-4 font-bold text-[#676057] whitespace-nowrap">
                      {row.fecha}
                    </td>
                    <td className="py-3 px-4 text-gray-400 whitespace-nowrap text-[11px]">
                      {row.fechaHoraIngreso}
                    </td>
                    <td className="py-3 px-4 font-semibold text-gray-700">
                      {row.especie}
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded-md bg-gray-100 text-gray-800 font-semibold text-[10px]">
                        {row.calidad}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-gray-600">
                      {row.largoMadera} m
                    </td>
                    <td className="py-3 px-4 font-extrabold text-[#D37608] text-right whitespace-nowrap text-sm">
                      {Number(row.volumenMR).toFixed(2)} MR
                    </td>
                    <td className="py-3 px-4 text-gray-500">
                      {row.createdByName || 'Operador'}
                    </td>
                    {(canEdit || canDelete) && (
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1.5">
                          {canEdit && (
                            <button
                              onClick={() => handleOpenEdit(row)}
                              className="p-1.5 text-gray-500 hover:text-[#BCB703] hover:bg-gray-100 rounded-lg transition"
                              title="Editar registro"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {canDelete && (
                            <button
                              onClick={() => setDeletingId(row.id)}
                              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                              title="Eliminar registro (Supervisor/Admin)"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deletingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl">
            <h4 className="font-bold text-base text-[#676057]">¿Confirmar eliminación?</h4>
            <p className="mt-2 text-xs text-gray-600">
              Esta acción eliminará permanentemente el registro de Producción Día de la base de datos.
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => setDeletingId(null)}
                className="px-3 py-1.5 rounded-xl border border-gray-200 text-xs font-semibold text-gray-600 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleDelete(deletingId)}
                className="px-3 py-1.5 rounded-xl bg-red-600 text-xs font-semibold text-white hover:bg-red-700"
              >
                Eliminar Registro
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal for Supervisor & Admin */}
      {editingRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <h4 className="font-bold text-base text-[#676057]">
                Editar Registro de Producción Día
              </h4>
              <button
                onClick={() => setEditingRecord(null)}
                className="p-1 text-gray-400 hover:text-gray-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-gray-600 mb-1">Fecha</label>
                <input
                  type="date"
                  value={editFecha}
                  onChange={(e) => setEditFecha(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#BCB703]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-600 mb-1">Especie</label>
                  <select
                    value={editEspecie}
                    onChange={(e) => setEditEspecie(e.target.value as EspecieMadera)}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#BCB703] bg-white"
                  >
                    <option value="Pino Radiata">Pino Radiata</option>
                    <option value="Euca GL">Euca GL</option>
                    <option value="Euca NT">Euca NT</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-gray-600 mb-1">Calidad</label>
                  <select
                    value={editCalidad}
                    onChange={(e) => setEditCalidad(e.target.value as CalidadMadera)}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#BCB703] bg-white"
                  >
                    <option value="Bosque">Bosque</option>
                    <option value="LOG">LOG</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-600 mb-1">Largo Madera (m)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editLargoMadera}
                    onChange={(e) => setEditLargoMadera(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#BCB703]"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-600 mb-1">Volumen MR</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editVolumenMR}
                    onChange={(e) => setEditVolumenMR(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-[#D37608] font-bold text-[#676057]"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
              <button
                onClick={() => setEditingRecord(null)}
                className="px-3.5 py-2 rounded-xl border border-gray-200 text-xs font-semibold text-gray-600 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveEdit}
                className="px-4 py-2 rounded-xl bg-[#676057] text-xs font-bold text-white hover:bg-[#534d45] flex items-center gap-1.5"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Guardar Cambios</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
