import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { PWAInstallButton } from './PWAInstallButton';
import {
  LayoutDashboard,
  CalendarDays,
  UserCheck,
  Database,
  Users2,
  ShieldCheck,
  LogOut,
  Menu,
  X,
  ChevronDown,
  User,
  TreePine
} from 'lucide-react';
import { UserRole } from '../types';

export type NavTab =
  | 'dashboard'
  | 'produccion-dia'
  | 'produccion-personal'
  | 'bd-produccion-dia'
  | 'bd-produccion-personal'
  | 'gestion-personal'
  | 'gestion-usuarios';

interface Props {
  activeTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
}

export const Header: React.FC<Props> = ({ activeTab, onSelectTab }) => {
  const { currentUser, role, logout, canManagePersonal, canManageUsers, quickLoginAs } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [roleMenuOpen, setRoleMenuOpen] = useState(false);

  const navItems: { id: NavTab; label: string; icon: React.ReactNode; badge?: string; restricted?: boolean }[] = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: <LayoutDashboard className="w-4 h-4" />,
    },
    {
      id: 'produccion-dia',
      label: 'Producción Día',
      icon: <CalendarDays className="w-4 h-4" />,
    },
    {
      id: 'produccion-personal',
      label: 'Prod. Personal',
      icon: <UserCheck className="w-4 h-4" />,
    },
    {
      id: 'bd-produccion-dia',
      label: 'BD Prod. Día',
      icon: <Database className="w-4 h-4" />,
    },
    {
      id: 'bd-produccion-personal',
      label: 'BD Prod. Personal',
      icon: <Database className="w-4 h-4" />,
    },
    {
      id: 'gestion-personal',
      label: 'Gestión Personal',
      icon: <Users2 className="w-4 h-4" />,
      restricted: !canManagePersonal,
      badge: 'Sup/Admin',
    },
    {
      id: 'gestion-usuarios',
      label: 'Gestión Usuarios',
      icon: <ShieldCheck className="w-4 h-4" />,
      restricted: !canManageUsers,
      badge: 'Admin',
    },
  ];

  const handleTabClick = (tabId: NavTab) => {
    onSelectTab(tabId);
    setMobileMenuOpen(false);
  };

  const getRoleBadgeStyle = (r: UserRole) => {
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
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-[#676057]/15 shadow-xs">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20 gap-2 sm:gap-4">
          
          {/* Logo and Brand */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => onSelectTab('dashboard')}
              className="flex items-center gap-2 group text-left"
            >
              <div className="h-10 sm:h-12 flex items-center justify-center p-1 bg-white rounded-lg border border-gray-100 shadow-xs">
                <img
                  src="/logo.jpg"
                  alt="Tramosil Logo"
                  className="h-8 sm:h-10 w-auto object-contain transition-transform group-hover:scale-105"
                  onError={(e) => {
                    // Fallback if image fails
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
              </div>
              <div className="hidden sm:block">
                <div className="flex items-center gap-1.5">
                  <span className="text-xl font-black tracking-tight text-[#676057]">
                    Tramosil
                  </span>
                  <TreePine className="w-4 h-4 text-[#BCB703]" />
                </div>
                <span className="block text-[10px] uppercase font-bold tracking-widest text-[#676057]/70">
                  Control Forestal & Faenas
                </span>
              </div>
            </button>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden lg:flex items-center space-x-1">
            {navItems.map((item) => {
              if (item.restricted) return null;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleTabClick(item.id)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                    isActive
                      ? 'bg-[#676057] text-white shadow-sm'
                      : 'text-[#676057] hover:bg-[#F2EDC9]/60 hover:text-[#534d45]'
                  }`}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Right Actions: PWA Install + User Profile & Role Switcher */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* PWA Install Button */}
            <PWAInstallButton compact />

            {/* Quick Demo Switcher / User Role */}
            <div className="relative">
              <button
                onClick={() => setRoleMenuOpen(!roleMenuOpen)}
                className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl border border-gray-200 bg-gray-50/80 hover:bg-gray-100 transition text-left"
                title="Cambiar rol para pruebas o ver usuario"
              >
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#676057]/10 text-[#676057]">
                  <User className="w-4 h-4" />
                </div>
                <div className="hidden md:block text-left">
                  <span className="block text-xs font-bold text-[#676057] leading-tight truncate max-w-[130px]">
                    {currentUser?.name || 'Usuario'}
                  </span>
                  <span
                    className={`inline-block px-1.5 py-0.2 rounded text-[10px] font-bold tracking-wide ${getRoleBadgeStyle(
                      role
                    )}`}
                  >
                    {role}
                  </span>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
              </button>

              {/* Dropdown Menu for Testing Roles and Account Details */}
              {roleMenuOpen && (
                <div className="absolute right-0 mt-2 w-64 rounded-2xl bg-white p-3 shadow-2xl border border-gray-100 z-50 animate-fade-in text-xs">
                  <div className="pb-2 mb-2 border-b border-gray-100">
                    <span className="block font-bold text-[#676057] text-sm">{currentUser?.name}</span>
                    <span className="text-gray-500 text-[11px] truncate block">{currentUser?.email}</span>
                    <div className="mt-1 flex items-center gap-1.5">
                      <span className="text-[11px] text-gray-500">Rol activo:</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${getRoleBadgeStyle(role)}`}>
                        {role}
                      </span>
                    </div>
                  </div>

                  <div className="py-1">
                    <span className="block text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-1.5">
                      Cambiar rol (Modo Pruebas)
                    </span>
                    <div className="space-y-1">
                      {(['Administrador', 'Supervisor', 'Usuario'] as UserRole[]).map((r) => (
                        <button
                          key={r}
                          onClick={() => {
                            quickLoginAs(r);
                            setRoleMenuOpen(false);
                          }}
                          className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left transition ${
                            role === r
                              ? 'bg-[#F2EDC9] text-[#676057] font-bold'
                              : 'hover:bg-gray-50 text-gray-700'
                          }`}
                        >
                          <span>{r}</span>
                          {role === r && <span className="text-[10px] text-[#D37608] font-bold">Activo</span>}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="pt-2 mt-2 border-t border-gray-100">
                    <button
                      onClick={() => {
                        setRoleMenuOpen(false);
                        logout();
                      }}
                      className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-red-600 hover:bg-red-50 transition font-medium"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Cerrar Sesión</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Mobile Hamburger Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 rounded-xl text-[#676057] hover:bg-[#F2EDC9]/50 transition"
              aria-label="Abrir menú"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="lg:hidden py-3 border-t border-[#676057]/10 animate-fade-in space-y-1">
            {navItems.map((item) => {
              if (item.restricted) return null;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleTabClick(item.id)}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition ${
                    isActive
                      ? 'bg-[#676057] text-white shadow-xs'
                      : 'text-[#676057] hover:bg-[#F2EDC9]/50'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    {item.icon}
                    <span>{item.label}</span>
                  </div>
                  {item.badge && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-200 text-gray-700">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </header>
  );
};
