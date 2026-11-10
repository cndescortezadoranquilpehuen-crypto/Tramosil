import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Header, NavTab } from './components/Header';
import { AuthScreen } from './components/AuthScreen';
import { DashboardModule } from './components/DashboardModule';
import { ProduccionDiaModule } from './components/ProduccionDiaModule';
import { ProduccionPersonalModule } from './components/ProduccionPersonalModule';
import { BDProduccionDiaModule } from './components/BDProduccionDiaModule';
import { BDProduccionPersonalModule } from './components/BDProduccionPersonalModule';
import { GestionPersonalModule } from './components/GestionPersonalModule';
import { GestionUsuariosModule } from './components/GestionUsuariosModule';
import { OfflineIndicator } from './components/OfflineIndicator';
import {
  fetchProduccionDia,
  subscribeProduccionDia
} from './services/produccionDiaService';
import {
  fetchProduccionPersonal,
  subscribeProduccionPersonal
} from './services/produccionPersonalService';
import {
  fetchPersonal,
  subscribePersonal
} from './services/personalService';
import {
  fetchUsers,
  subscribeUsers
} from './services/userService';
import { purgeMockData } from './services/cleanupService';
import {
  ProduccionDia,
  ProduccionPersonal,
  Personal,
  UserAccount
} from './types';
import { Loader2 } from 'lucide-react';

function MainApp() {
  const { currentUser, loading } = useAuth();
  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');

  // Application Data States
  const [produccionDia, setProduccionDia] = useState<ProduccionDia[]>([]);
  const [produccionPersonal, setProduccionPersonal] = useState<ProduccionPersonal[]>([]);
  const [personalList, setPersonalList] = useState<Personal[]>([]);
  const [usersList, setUsersList] = useState<UserAccount[]>([]);
  const [dataLoading, setDataLoading] = useState(true);

  // Subscribe to Firestore collections
  useEffect(() => {
    if (!currentUser) return;

    let unsubDia = () => {};
    let unsubPers = () => {};
    let unsubStaff = () => {};
    let unsubUsers = () => {};

    const loadInitialData = async () => {
      try {
        await purgeMockData();
        const [dia, pers, staff, users] = await Promise.all([
          fetchProduccionDia(),
          fetchProduccionPersonal(),
          fetchPersonal(),
          fetchUsers(),
        ]);
        setProduccionDia(dia);
        setProduccionPersonal(pers);
        setPersonalList(staff);
        setUsersList(users);
      } catch (err) {
        console.warn('Initial data load note:', err);
      } finally {
        setDataLoading(false);
      }

      // Attach live listeners
      unsubDia = subscribeProduccionDia((list) => setProduccionDia(list));
      unsubPers = subscribeProduccionPersonal((list) => setProduccionPersonal(list));
      unsubStaff = subscribePersonal((list) => setPersonalList(list));
      unsubUsers = subscribeUsers((list) => setUsersList(list));
    };

    loadInitialData();

    return () => {
      unsubDia();
      unsubPers();
      unsubStaff();
      unsubUsers();
    };
  }, [currentUser]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#F2EDC9]/20 text-[#676057]">
        <Loader2 className="w-8 h-8 animate-spin text-[#BCB703] mb-3" />
        <span className="text-sm font-bold">Cargando Sistema Tramosil...</span>
      </div>
    );
  }

  if (!currentUser) {
    return <AuthScreen />;
  }

  const handleRefresh = async () => {
    const [dia, pers, staff, users] = await Promise.all([
      fetchProduccionDia(),
      fetchProduccionPersonal(),
      fetchPersonal(),
      fetchUsers(),
    ]);
    setProduccionDia(dia);
    setProduccionPersonal(pers);
    setPersonalList(staff);
    setUsersList(users);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F2EDC9]/15 text-[#676057]">
      {/* Top Header with Navigation, Brand and PWA Install Button */}
      <Header activeTab={activeTab} onSelectTab={(tab) => setActiveTab(tab)} />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {dataLoading ? (
          <div className="py-20 flex flex-col items-center justify-center text-[#676057]">
            <Loader2 className="w-7 h-7 animate-spin text-[#BCB703] mb-2" />
            <span className="text-xs font-semibold">Sincronizando datos con Firebase...</span>
          </div>
        ) : (
          <>
            {activeTab === 'dashboard' && (
              <DashboardModule
                produccionDia={produccionDia}
                produccionPersonal={produccionPersonal}
                personalList={personalList}
                onNavigateTab={(tab) => setActiveTab(tab)}
              />
            )}

            {activeTab === 'produccion-dia' && (
              <ProduccionDiaModule
                produccionDia={produccionDia}
                produccionPersonal={produccionPersonal}
                onRecordSaved={handleRefresh}
                onNavigateToBD={() => setActiveTab('bd-produccion-dia')}
              />
            )}

            {activeTab === 'produccion-personal' && (
              <ProduccionPersonalModule
                personalList={personalList}
                produccionDia={produccionDia}
                produccionPersonal={produccionPersonal}
                onRecordSaved={handleRefresh}
                onNavigateToBD={() => setActiveTab('bd-produccion-personal')}
                onNavigateToPersonal={() => setActiveTab('gestion-personal')}
              />
            )}

            {activeTab === 'bd-produccion-dia' && (
              <BDProduccionDiaModule
                data={produccionDia}
                onDataChanged={handleRefresh}
              />
            )}

            {activeTab === 'bd-produccion-personal' && (
              <BDProduccionPersonalModule
                data={produccionPersonal}
                personalList={personalList}
                onDataChanged={handleRefresh}
              />
            )}

            {activeTab === 'gestion-personal' && (
              <GestionPersonalModule
                personalList={personalList}
                onDataChanged={handleRefresh}
              />
            )}

            {activeTab === 'gestion-usuarios' && (
              <GestionUsuariosModule
                usersList={usersList}
                onDataChanged={handleRefresh}
              />
            )}
          </>
        )}
      </main>

      {/* Offline Toast Indicator */}
      <OfflineIndicator />

      {/* Footer */}
      <footer className="border-t border-[#676057]/10 bg-white/70 py-6 mt-12 text-center text-xs text-[#676057]/70">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <img src="/logo.jpg" alt="Tramosil" className="h-5 object-contain" />
            <span className="font-bold text-[#676057]">Tramosil</span>
            <span>&copy; {new Date().getFullYear()} — Control de Producción y Faenas Forestales</span>
          </div>
          <div className="flex items-center gap-4 text-[11px]">
            <span className="text-[#BCB703] font-semibold">PWA Instalable</span>
            <span>•</span>
            <span>Firebase Firestore & Auth</span>
            <span>•</span>
            <span className="text-gray-400">Listo para GitHub & Vercel</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
