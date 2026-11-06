import React, { useState } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { Download, Smartphone, X, CheckCircle2 } from 'lucide-react';

export const PWAInstallButton: React.FC<{ compact?: boolean }> = ({ compact = false }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [installedSuccess, setInstalledSuccess] = useState(false);

  if (isInstalled) {
    return null;
  }

  const handleInstallClick = async () => {
    const success = await install();
    if (success) {
      setInstalledSuccess(true);
      setTimeout(() => setInstalledSuccess(false), 4000);
    }
  };

  if (installedSuccess) {
    return (
      <div className="flex items-center gap-2 text-xs font-semibold text-[#BCB703] bg-white/90 px-3 py-1.5 rounded-lg border border-[#BCB703]/30 shadow-sm animate-fade-in">
        <CheckCircle2 className="w-4 h-4 text-[#BCB703]" />
        <span>¡App Instalada con éxito!</span>
      </div>
    );
  }

  // Chromium / Android / Desktop flow
  if (isInstallable) {
    return (
      <button
        onClick={handleInstallClick}
        title="Instalar aplicación en dispositivo"
        className={`flex items-center gap-2 font-medium transition-all shadow-sm rounded-lg active:scale-95 ${
          compact
            ? 'px-2.5 py-1.5 text-xs bg-[#D37608] hover:bg-[#b86403] text-white'
            : 'px-3.5 py-2 text-xs md:text-sm bg-[#D37608] hover:bg-[#b86403] text-white ring-2 ring-[#D37608]/20'
        }`}
      >
        <Download className="w-4 h-4 animate-bounce" />
        <span>Instalar App</span>
      </button>
    );
  }

  // iOS Safari flow
  if (isIOS) {
    return (
      <>
        <button
          onClick={() => setShowIOSGuide(true)}
          title="Instalar en iPhone o iPad"
          className="flex items-center gap-1.5 rounded-lg border border-[#676057]/30 bg-white/80 px-2.5 py-1.5 text-xs font-medium text-[#676057] hover:bg-[#F2EDC9]/50 transition shadow-sm"
        >
          <Smartphone className="w-3.5 h-3.5 text-[#D37608]" />
          <span>Instalar en iOS</span>
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
            <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl border border-[#676057]/10">
              <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <img src="/logo.jpg" alt="Tramosil" className="h-6 object-contain" />
                  <h3 className="text-base font-bold text-[#676057]">Instalar Tramosil en iOS</h3>
                </div>
                <button
                  onClick={() => setShowIOSGuide(false)}
                  className="p-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="mt-4 space-y-3 text-xs md:text-sm text-[#676057]">
                <div className="flex items-start gap-3 bg-[#F2EDC9]/40 p-3 rounded-xl border border-[#F2EDC9]">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#BCB703] text-white font-bold text-xs">
                    1
                  </span>
                  <p>
                    Toca el botón <strong>Compartir</strong> (ícono de cuadro con flecha hacia arriba) en la barra inferior de Safari.
                  </p>
                </div>
                <div className="flex items-start gap-3 bg-[#F2EDC9]/40 p-3 rounded-xl border border-[#F2EDC9]">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#BCB703] text-white font-bold text-xs">
                    2
                  </span>
                  <p>
                    Desliza hacia abajo y selecciona <strong>"Agregar a pantalla de inicio"</strong>.
                  </p>
                </div>
                <div className="flex items-start gap-3 bg-[#F2EDC9]/40 p-3 rounded-xl border border-[#F2EDC9]">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#BCB703] text-white font-bold text-xs">
                    3
                  </span>
                  <p>
                    Presiona <strong>"Agregar"</strong> en la esquina superior derecha. ¡Listo!
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowIOSGuide(false)}
                className="mt-5 w-full rounded-xl bg-[#676057] py-2.5 text-xs md:text-sm font-semibold text-white hover:bg-[#534d45] transition"
              >
                Entendido
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  // Fallback trigger button if browser deferred prompt has not triggered yet
  return (
    <button
      onClick={() => {
        alert(
          'Para instalar Tramosil:\n\n• En Chrome/Edge: Presiona el ícono de instalar en la barra de direcciones o el menú de tres puntos > "Instalar Tramosil".\n• En celular: Abre el menú del navegador y selecciona "Agregar a la pantalla principal".'
        );
      }}
      className="hidden sm:flex items-center gap-1.5 rounded-lg border border-[#D37608]/40 bg-white/70 px-2.5 py-1.5 text-xs font-medium text-[#D37608] hover:bg-[#F2EDC9]/60 transition"
      title="Instrucciones para instalar como App"
    >
      <Download className="w-3.5 h-3.5" />
      <span>Instalar App</span>
    </button>
  );
};
