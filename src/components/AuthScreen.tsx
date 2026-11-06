import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Lock, Mail, User, ShieldCheck, ArrowRight, TreePine, CheckCircle } from 'lucide-react';
import { PWAInstallButton } from './PWAInstallButton';

export const AuthScreen: React.FC = () => {
  const { login, quickLoginAs } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!email || !password) {
      setErrorMsg('Por favor ingresa correo y contraseña.');
      return;
    }

    setIsSubmitting(true);
    const res = await login(email, password);
    if (!res.success && res.error) {
      setErrorMsg(res.error);
    }
    setIsSubmitting(false);
  };

  return (
    <div className="min-h-screen flex flex-col justify-center py-12 sm:px-6 lg:px-8 bg-linear-to-b from-[#F2EDC9]/40 via-white to-[#F2EDC9]/20">
      <div className="sm:mx-auto sm:w-full sm:max-w-md px-4">
        
        {/* Logo and App Title */}
        <div className="flex flex-col items-center text-center">
          <div className="bg-white p-3 rounded-2xl shadow-md border border-[#676057]/10 mb-4 inline-block">
            <img
              src="/logo.jpg"
              alt="Tramosil Logo"
              className="h-14 sm:h-16 w-auto object-contain mx-auto"
            />
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-[#676057] flex items-center gap-2 justify-center">
            <span>Tramosil</span>
            <TreePine className="w-6 h-6 text-[#BCB703]" />
          </h1>
          <p className="mt-1 text-sm font-medium text-[#676057]/80">
            Control Operacional y Gestión de Producción Forestal
          </p>
          <div className="mt-3">
            <PWAInstallButton compact />
          </div>
        </div>

        {/* Auth Card */}
        <div className="mt-6 bg-white py-8 px-6 sm:px-10 shadow-xl rounded-3xl border border-[#676057]/10">
          
          <div className="mb-6 text-center border-b border-gray-100 pb-3">
            <h2 className="text-base font-bold text-[#676057]">
              Iniciar Sesión
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Ingresa tus credenciales para acceder al sistema
            </p>
          </div>

          {errorMsg && (
            <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-xs font-semibold text-red-700 animate-shake">
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#676057] mb-1">
                Correo Electrónico
              </label>
              <div className="relative rounded-xl shadow-xs">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                  <Mail className="h-4 w-4" />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="operador@tramosil.cl"
                  required
                  className="block w-full pl-9 pr-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#BCB703] focus:border-[#BCB703] transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#676057] mb-1">
                Contraseña
              </label>
              <div className="relative rounded-xl shadow-xs">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                  <Lock className="h-4 w-4" />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="block w-full pl-9 pr-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#BCB703] focus:border-[#BCB703] transition"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-bold text-white bg-[#676057] hover:bg-[#534d45] focus:outline-hidden focus:ring-2 focus:ring-offset-2 focus:ring-[#676057] shadow-md transition disabled:opacity-50"
            >
              <span>{isSubmitting ? 'Verificando...' : 'Entrar al Sistema'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Quick Access Preset Buttons for Testing */}
          <div className="mt-8 pt-6 border-t border-gray-100">
            <span className="block text-center text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">
              Acceso Rápido para Pruebas
            </span>
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => quickLoginAs('Administrador')}
                className="w-full flex items-center justify-between p-2.5 rounded-xl border border-[#D37608]/30 bg-orange-50/50 hover:bg-orange-50 text-left transition text-xs"
              >
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-[#D37608]" />
                  <div>
                    <span className="font-bold text-[#676057] block">Administrador</span>
                    <span className="text-[11px] text-gray-500">Acceso total (Edición, Eliminación, Usuarios, Personal)</span>
                  </div>
                </div>
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-[#D37608] text-white">
                  Admin
                </span>
              </button>

              <button
                type="button"
                onClick={() => quickLoginAs('Supervisor')}
                className="w-full flex items-center justify-between p-2.5 rounded-xl border border-[#BCB703]/40 bg-lime-50/50 hover:bg-lime-50 text-left transition text-xs"
              >
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-[#BCB703]" />
                  <div>
                    <span className="font-bold text-[#676057] block">Supervisor</span>
                    <span className="text-[11px] text-gray-500">Ingreso, edición y eliminación de producción y personal</span>
                  </div>
                </div>
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-[#BCB703] text-white">
                  Supervisor
                </span>
              </button>

              <button
                type="button"
                onClick={() => quickLoginAs('Usuario')}
                className="w-full flex items-center justify-between p-2.5 rounded-xl border border-gray-200 bg-gray-50 hover:bg-gray-100 text-left transition text-xs"
              >
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-[#676057]" />
                  <div>
                    <span className="font-bold text-[#676057] block">Usuario (Operador)</span>
                    <span className="text-[11px] text-gray-500">Ingreso de producción (sin permiso de eliminación)</span>
                  </div>
                </div>
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-[#676057] text-white">
                  Operador
                </span>
              </button>
            </div>
            <p className="mt-4 text-center text-[11px] text-gray-400">
              Las cuentas de usuario son gestionadas por el Administrador en el módulo de Gestión de Usuarios.
            </p>
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-gray-400">
          Tramosil &copy; {new Date().getFullYear()} — Gestión Forestal Integral
        </p>
      </div>
    </div>
  );
};
