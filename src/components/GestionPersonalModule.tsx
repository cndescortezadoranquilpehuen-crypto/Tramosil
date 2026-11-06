import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Personal } from '../types';
import { savePersonal, deletePersonal } from '../services/personalService';
import {
  Users2,
  UserPlus,
  Edit2,
  Trash2,
  ShieldAlert,
  Search,
  CheckCircle,
  XCircle,
  X,
  Check
} from 'lucide-react';

interface Props {
  personalList: Personal[];
  onDataChanged: () => void;
}

// Format Chilean RUT (e.g. 12345678-9 -> 12.345.678-9)
function formatRUT(rut: string): string {
  const clean = rut.replace(/[^0-9kK]/g, '').toUpperCase();
  if (clean.length < 2) return clean;
  const dv = clean.slice(-1);
  let cuerpo = clean.slice(0, -1);
  cuerpo = cuerpo.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${cuerpo}-${dv}`;
}

export const GestionPersonalModule: React.FC<Props> = ({ personalList, onDataChanged }) => {
  const { canManagePersonal, role } = useAuth();

  const [searchTerm, setSearchTerm] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form fields
  const [nombre, setNombre] = useState('');
  const [rut, setRut] = useState('');
  const [cargo, setCargo] = useState('Operador Cosechadora');
  const [activo, setActivo] = useState(true);
  const [formError, setFormError] = useState('');

  // Delete modal
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // If user role is NOT supervisor or admin, block access
  if (!canManagePersonal) {
    return (
      <div className="py-16 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-red-100 text-red-600 mb-4">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h3 className="text-xl font-bold text-[#676057]">Acceso Restringido</h3>
        <p className="mt-2 text-sm text-gray-500 max-w-md mx-auto">
          El módulo de Gestión de Personal sólo puede ser visualizado y modificado por los roles de <strong>Supervisor</strong> y <strong>Administrador</strong>.
        </p>
        <span className="mt-4 inline-block px-3 py-1 rounded-full bg-gray-100 text-xs font-semibold text-gray-600">
          Tu rol actual: {role}
        </span>
      </div>
    );
  }

  const handleOpenAdd = () => {
    setEditingId(null);
    setNombre('');
    setRut('');
    setCargo('Operador Cosechadora');
    setActivo(true);
    setFormError('');
    setModalOpen(true);
  };

  const handleOpenEdit = (p: Personal) => {
    setEditingId(p.id);
    setNombre(p.nombre);
    setRut(p.rut);
    setCargo(p.cargo || 'Operador Cosechadora');
    setActivo(p.activo !== false);
    setFormError('');
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!nombre.trim()) {
      setFormError('Por favor ingresa el nombre del trabajador.');
      return;
    }
    if (!rut.trim()) {
      setFormError('Por favor ingresa el RUT del trabajador.');
      return;
    }

    const formattedRut = formatRUT(rut);

    await savePersonal({
      id: editingId || undefined,
      nombre: nombre.trim(),
      rut: formattedRut,
      cargo: cargo.trim(),
      activo,
      fechaIngreso: new Date().toISOString().split('T')[0],
    });

    setModalOpen(false);
    onDataChanged();
  };

  const handleDelete = async (id: string) => {
    await deletePersonal(id);
    setDeletingId(null);
    onDataChanged();
  };

  const filteredPersonal = personalList.filter((p) => {
    const term = searchTerm.toLowerCase();
    return (
      p.nombre.toLowerCase().includes(term) ||
      p.rut.toLowerCase().includes(term) ||
      p.cargo.toLowerCase().includes(term)
    );
  });

  return (
    <div className="space-y-6">
      
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-[#676057]/15">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#BCB703] text-white">
              <Users2 className="w-4 h-4" />
            </span>
            <h2 className="text-xl sm:text-2xl font-black text-[#676057] tracking-tight">
              Gestión de Personal
            </h2>
          </div>
          <p className="mt-1 text-xs sm:text-sm text-[#676057]/80">
            Registro de personal activo y trabajadores de faena. Esta nómina alimenta la lista desplegable de operadores en Producción Personal.
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#676057] hover:bg-[#534d45] text-white text-xs font-bold shadow-xs transition self-start sm:self-center active:scale-95"
        >
          <UserPlus className="w-4 h-4" />
          <span>Agregar Trabajador</span>
        </button>
      </div>

      {/* Search Toolbar */}
      <div className="bg-white rounded-3xl p-4 shadow-sm border border-[#676057]/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar trabajador por nombre, RUT o cargo..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3.5 py-2 text-xs rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#BCB703] bg-white font-medium"
          />
        </div>

        <div className="flex items-center gap-2 text-xs text-gray-500 font-semibold px-2">
          <span>Total en nómina:</span>
          <span className="font-bold text-[#676057]">{personalList.length}</span>
          <span>•</span>
          <span className="text-[#BCB703] font-bold">
            {personalList.filter((p) => p.activo !== false).length} Activos
          </span>
        </div>
      </div>

      {/* Personal List Cards & Table */}
      <div className="bg-white rounded-3xl shadow-sm border border-[#676057]/10 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[#676057] text-white uppercase tracking-wider text-[11px]">
                <th className="py-3.5 px-4 font-bold">Nombre Completo</th>
                <th className="py-3.5 px-4 font-bold">RUT</th>
                <th className="py-3.5 px-4 font-bold">Cargo / Función</th>
                <th className="py-3.5 px-4 font-bold text-center">Estado</th>
                <th className="py-3.5 px-4 font-bold text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredPersonal.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-gray-400 text-xs">
                    No se encontraron trabajadores en la lista.
                  </td>
                </tr>
              ) : (
                filteredPersonal.map((p) => (
                  <tr key={p.id} className="hover:bg-[#F2EDC9]/25 transition">
                    <td className="py-3.5 px-4 font-bold text-[#676057] text-sm">
                      {p.nombre}
                    </td>
                    <td className="py-3.5 px-4 font-mono font-semibold text-gray-700">
                      {p.rut}
                    </td>
                    <td className="py-3.5 px-4 text-gray-600 font-medium">
                      {p.cargo || 'Operador'}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      {p.activo !== false ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                          <CheckCircle className="w-3 h-3" />
                          <span>Trabajando (Activo)</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-gray-100 text-gray-600 text-[10px] font-bold">
                          <XCircle className="w-3 h-3" />
                          <span>Inactivo</span>
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleOpenEdit(p)}
                          className="p-1.5 text-gray-500 hover:text-[#BCB703] hover:bg-gray-100 rounded-lg transition"
                          title="Editar trabajador"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setDeletingId(p.id)}
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                          title="Eliminar de nómina"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <h4 className="font-bold text-base text-[#676057]">
                {editingId ? 'Editar Trabajador' : 'Agregar Personal a la Faena'}
              </h4>
              <button
                onClick={() => setModalOpen(false)}
                className="p-1 text-gray-400 hover:text-gray-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="p-3 rounded-xl bg-red-50 text-red-700 text-xs font-semibold">
                {formError}
              </div>
            )}

            <form onSubmit={handleSave} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-gray-600 mb-1">
                  Nombre Completo <span className="text-[#D37608]">*</span>
                </label>
                <input
                  type="text"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  placeholder="Ej. Rodrigo Araya Silva"
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#BCB703] text-sm"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-600 mb-1">
                  RUT <span className="text-[#D37608]">*</span>
                </label>
                <input
                  type="text"
                  value={rut}
                  onChange={(e) => setRut(e.target.value)}
                  placeholder="Ej. 15.482.910-4"
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#BCB703] text-sm font-mono"
                />
                <span className="text-[10px] text-gray-400 mt-1 block">
                  Ingrese con o sin puntos y guión. El sistema lo formateará automáticamente.
                </span>
              </div>

              <div>
                <label className="block font-bold text-gray-600 mb-1">Cargo / Función</label>
                <select
                  value={cargo}
                  onChange={(e) => setCargo(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#BCB703] text-sm bg-white"
                >
                  <option value="Operador Cosechadora">Operador Cosechadora</option>
                  <option value="Operador Skidder">Operador Skidder</option>
                  <option value="Operador Feller">Operador Feller</option>
                  <option value="Huinchero Forestal">Huinchero Forestal</option>
                  <option value="Motosierrista">Motosierrista</option>
                  <option value="Clasificador de Madera">Clasificador de Madera</option>
                  <option value="Jefe de Cuadrilla">Jefe de Cuadrilla</option>
                  <option value="Operador General">Operador General</option>
                </select>
              </div>

              <div className="flex items-center gap-3 pt-1">
                <input
                  type="checkbox"
                  id="activoCheckbox"
                  checked={activo}
                  onChange={(e) => setActivo(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-[#BCB703] focus:ring-[#BCB703]"
                />
                <label htmlFor="activoCheckbox" className="font-semibold text-gray-700 select-none">
                  Trabajador activo actualmente en faena (visible en selector de operadores)
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-3.5 py-2 rounded-xl border border-gray-200 text-xs font-semibold text-gray-600 hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-[#676057] text-xs font-bold text-white hover:bg-[#534d45] flex items-center gap-1.5"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>{editingId ? 'Guardar Cambios' : 'Registrar Personal'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {deletingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl">
            <h4 className="font-bold text-base text-[#676057]">¿Eliminar trabajador?</h4>
            <p className="mt-2 text-xs text-gray-600">
              Esta acción eliminará al trabajador de la lista de personal activo.
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
                Eliminar de Nómina
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
