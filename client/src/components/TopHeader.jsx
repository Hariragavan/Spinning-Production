import React, { useState, useEffect } from 'react';
import { 
  Maximize2, 
  Minimize2, 
  Tv, 
  LogIn, 
  LogOut, 
  UserCheck, 
  Sparkles, 
  ShieldCheck, 
  Radio,
  Clock
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function TopHeader({ onOpenLogin, onOpenTvMode }) {
  const { user, logout } = useAuth();
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date().toLocaleTimeString());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date().toLocaleTimeString()), 1000);
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      clearInterval(timer);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  return (
    <header className="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between shadow-xs sticky top-0 z-30 select-none">
      {/* Left: Unit Branding */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="w-8 h-8 rounded-lg bg-indigo-600 text-white font-black text-xs flex items-center justify-center shadow-xs">
            SCM
          </span>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-900 text-sm tracking-tight">SCM Textile Spinners</span>
              <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-1.5 py-0.2 rounded">
                Unit 01 [2nd Shed]
              </span>
            </div>
            <span className="text-[11px] text-slate-500 font-medium flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              14 Frames Telemetry Hub (SP025–SP056)
            </span>
          </div>
        </div>
      </div>

      {/* Right: Three Required Action Controls */}
      {/* 1. Full Screen Button | 2. TV Mode Button | 3. Login Button */}
      <div className="flex items-center gap-3">
        {/* Clock display */}
        <div className="hidden md:flex items-center gap-1.5 text-xs text-slate-500 font-mono font-medium mr-1">
          <Clock size={13} className="text-slate-400" />
          <span>{currentTime}</span>
        </div>

        {/* 1. Full Screen Button */}
        <button
          onClick={toggleFullscreen}
          id="top-fullscreen-btn"
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 hover:text-slate-900 border border-slate-200 rounded-lg transition-all shadow-xs"
          title={isFullscreen ? "Exit Fullscreen" : "Toggle Full Screen"}
        >
          {isFullscreen ? <Minimize2 size={14} className="text-indigo-600" /> : <Maximize2 size={14} className="text-indigo-600" />}
          <span>{isFullscreen ? 'Exit Full Screen' : 'Full Screen'}</span>
        </button>

        {/* 2. TV Mode Button */}
        <button
          onClick={onOpenTvMode}
          id="top-tv-mode-btn"
          className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs transition-all"
          title="Launch Shop Floor TV Signage Carousel"
        >
          <Tv size={14} />
          <span>TV Mode</span>
        </button>

        {/* 3. Login Button */}
        {user ? (
          <div className="flex items-center gap-2 pl-1 border-l border-slate-200">
            <button
              onClick={onOpenLogin}
              id="top-user-profile-btn"
              className="flex items-center gap-2 px-2.5 py-1 text-xs bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors text-left"
              title="Click to Switch User / Role"
            >
              <div className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-[10px]">
                {user.name ? user.name[0] : 'U'}
              </div>
              <div className="flex flex-col leading-tight">
                <span className="font-bold text-slate-800 text-[11px] truncate max-w-[100px]">{user.name}</span>
                <span className="text-[9px] uppercase font-semibold text-indigo-600">{user.role}</span>
              </div>
            </button>

            <button
              onClick={logout}
              id="top-logout-btn"
              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors"
              title="Sign Out"
            >
              <LogOut size={14} />
            </button>
          </div>
        ) : (
          <button
            onClick={onOpenLogin}
            id="top-login-btn"
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-slate-800 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg shadow-xs transition-all"
            title="Authenticate with credentials or PIN"
          >
            <LogIn size={14} className="text-indigo-600" />
            <span>Login</span>
          </button>
        )}
      </div>
    </header>
  );
}
