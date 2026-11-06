import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { UserAccount, UserRole } from '../types';
import { saveUser, deleteUser } from '../services/userService';
import {
  ShieldCheck,
  UserPlus,
  Edit2,
  Trash2,
  ShieldAlert,
  Search,
  Lock,
  Mail,
  User,
  X,
  Check
} from 'lucide-react';

interface Props {
  usersList: UserAccount[];
  onDataChanged: () => void;
}

export const GestionUsuariosModule: React.FC<Props> = ({ usersList, onDataChanged }) => {
  const { isAdmin, role, currentUser } = useAuth();

  const [searchTerm, setSearchTerm] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form fields
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [userRole, setUserRole] = useState<UserRole>('Usuario');
  const [formError, setFormError] = useState('');

  // Delete modal
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Non-admins cannot access this module
  if (!isAdmin) {
    return (
      <div className="py-16 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-red-100 text-red-600 mb-4">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h3 className="text-xl font-bold text-[#676057]">Módulo Exclusivo para Administrador</h3>
        <p className="mt-2 text-sm text-gray-500 max-w-md mx-auto">
          Sólo los usuarios con rol de <strong>Administrador</strong> tienen autorización para gestionar cuentas, credenciales y perfiles de acceso.
        </p>
        <span className="mt-4 inline-block px-3 py-1 rounded-full bg-gray-100 text-xs font-semibold text-gray-600">
          Tu rol actual: {role}
        </span>
      </div>
    );
  }

  const handleOpenAdd = () => {
    setEditingId(null);
    setEmail('');
    setName('');
    setPassword('');
    setUserRole('Usuario');
    setFormError('');
    setModalOpen(true);
  };

  const handleOpenEdit = (u: UserAccount) => {
    setEditingId(u.id);
    setEmail(u.email);
    setName(u.name);
    setPassword('');
    setUserRole(u.role);
    setFormError('');
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!email.trim() || !name.trim()) {
      setFormError('Por favor complete el nombre y correo electrónico.');
      return;
    }
    if (!editingId && !password.trim()) {
      setFormError('Por favor ingrese una contraseña para el nuevo usuario.');
      return;
    }

    await saveUser({
      id: editingId || undefined,
      email: email.trim(),
      name: name.trim(),
      role: userRole,
      password: password || undefined,
    });

    setModalOpen(false);
    onDataChanged();
  };

  const handleDelete = async (id: string) => {
    if (id === currentUser?.id) {
      alert('No puedes eliminar tu propia cuenta en sesión activa.');
      setDeletingId(null);
      return;
    }
    await deleteUser(id);
    setDeletingId(null);
    onDataChanged();
  };

  const filteredUsers = usersList.filter((u) => {
    const term = searchTerm.toLowerCase();
    return (
      u.name.toLowerCase().includes(term) ||
      u.email.toLowerCase().includes(term) ||
      u.role.toLowerCase().includes(term)
    );
  });

  const getRoleBadge = (r: UserRole) => {
    switch (r) {
      case 'Administrador':
        return 'bg-[#D37608] text-white';
      case 'Supervisor':
        return 'bg-[#BCB703] text-white';
      case 'Usuario':
      default:
        return 'bg-[#676057] text-white';
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-[#676057]/15">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#D37608] text-white">
              <ShieldCheck className="w-4 h-4" />
            </span>
            <h2 className="text-xl sm:text-2xl font-black text-[#676057] tracking-tight">
              Gestión de Usuarios
            </h2>
          </div>
          <p className="mt-1 text-xs sm:text-sm text-[#676057]/80">
            Administración centralizada de cuentas de acceso, credenciales y asignación de roles (Usuario, Supervisor, Administrador).
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#676057] hover:bg-[#534d45] text-white text-xs font-bold shadow-xs transition self-start sm:self-center active:scale-95"
        >
          <UserPlus className="w-4 h-4" />
          <span>Crear Nuevo Usuario</span>
        </button>
      </div>

      {/* Toolbar */}
      <div className="bg-white rounded-3xl p-4 shadow-sm border border-[#676057]/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar usuario por nombre, email o rol..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3.5 py-2 text-xs rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#BCB703] bg-white font-medium"
          />
        </div>

        <div className="flex items-center gap-2 text-xs text-gray-500 font-semibold px-2">
          <span>Usuarios totales:</span>
          <span className="font-bold text-[#676057]">{usersList.length}</span>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-3xl shadow-sm border border-[#676057]/10 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[#676057] text-white uppercase tracking-wider text-[11px]">
                <th className="py-3.5 px-4 font-bold">Nombre Completo</th>
                <th className="py-3.5 px-4 font-bold">Correo Electrónico</th>
                <th className="py-3.5 px-4 font-bold text-center">Rol Asignado</th>
                <th className="py-3.5 px-4 font-bold">Fecha Alta</th>
                <th className="py-3.5 px-4 font-bold text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-gray-400 text-xs">
                    No se encontraron usuarios registrados.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-[#F2EDC9]/25 transition">
                    <td className="py-3.5 px-4 font-bold text-[#676057] text-sm">
                      <div className="flex items-center gap-2">
                        <span>{u.name}</span>
                        {u.id === currentUser?.id && (
                          <span className="text-[10px] font-semibold text-gray-400 bg-gray-100 px-1.5 py-0.2 rounded">
                            (Tú)
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-medium text-gray-700">
                      {u.email}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wide ${getRoleBadge(u.role)}`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-gray-500 text-[11px]">
                      {u.createdAt ? u.createdAt.split('T')[0] : 'Hoy'}
                    </td>
                    <td className="py-3.5 px-4 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleOpenEdit(u)}
                          className="p-1.5 text-gray-500 hover:text-[#BCB703] hover:bg-gray-100 rounded-lg transition"
                          title="Editar usuario y rol"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setDeletingId(u.id)}
                          disabled={u.id === currentUser?.id}
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition disabled:opacity-30"
                          title="Eliminar usuario"
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
                {editingId ? 'Editar Usuario' : 'Crear Nuevo Usuario'}
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
                <div className="relative">
                  <User className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ej. Juan Pérez González"
                    required
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#BCB703] text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-gray-600 mb-1">
                  Correo Electrónico <span className="text-[#D37608]">*</span>
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="operador@tramosil.cl"
                    required
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#BCB703] text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-gray-600 mb-1">
                  {editingId ? 'Nueva Contraseña (dejar vacío para mantener)' : 'Contraseña *'}
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required={!editingId}
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#BCB703] text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-gray-600 mb-1.5">
                  Rol de Acceso <span className="text-[#D37608]">*</span>
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['Usuario', 'Supervisor', 'Administrador'] as UserRole[]).map((r) => (
                    <button
                      type="button"
                      key={r}
                      onClick={() => setUserRole(r)}
                      className={`py-2 px-2 text-xs font-bold rounded-xl border text-center transition ${
                        userRole === r
                          ? 'border-[#BCB703] bg-[#BCB703]/10 text-[#676057]'
                          : 'border-gray-200 text-gray-500 hover:bg-gray-50'
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
                <div className="mt-2 p-2.5 rounded-xl bg-gray-50 border border-gray-100 text-[11px] text-gray-500 space-y-1">
                  <div><strong>Usuario:</strong> Ingreso de producción (sin eliminar).</div>
                  <div><strong>Supervisor:</strong> Ingreso, edición y eliminación de producción y personal.</div>
                  <div><strong>Administrador:</strong> Control total del sistema y gestión de usuarios.</div>
                </div>
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
                  <span>{editingId ? 'Guardar Cambios' : 'Crear Usuario'}</span>
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
            <h4 className="font-bold text-base text-[#676057]">¿Eliminar usuario?</h4>
            <p className="mt-2 text-xs text-gray-600">
              Esta acción eliminará la cuenta y revocará el acceso al sistema.
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
                Eliminar Cuenta
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
