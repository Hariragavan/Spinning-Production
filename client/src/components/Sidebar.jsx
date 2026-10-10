import React, { useState } from 'react';
import { 
  LayoutDashboard, 
  Cpu, 
  BarChart3, 
  Banknote, 
  ShieldCheck, 
  Tv, 
  ChevronLeft, 
  ChevronRight, 
  LogOut, 
  Radio, 
  Clock, 
  Sparkles,
  RefreshCw,
  UserCheck
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Sidebar({ activeTab, setActiveTab, activeShift, setActiveShift, isCollapsed, setIsCollapsed }) {
  const { user, logout, switchRole } = useAuth();
  const [roleMenuOpen, setRoleMenuOpen] = useState(false);

  const navItems = [
    { id: 'dashboard', label: 'Live Dashboard', icon: LayoutDashboard },
    { id: 'operations', label: 'Shift Operations', icon: Cpu },
    { id: 'analytics', label: 'Machine Analytics', icon: BarChart3 },
    { id: 'payroll', label: 'Payroll & Passbooks', icon: Banknote },
    { id: 'admin', label: 'Data & Masters', icon: ShieldCheck, adminOnly: true },
    { id: 'tv-mode', label: 'Shop TV Display', icon: Tv }
  ];

  const shifts = ['I', 'II', 'III'];

  return (
    <aside 
      className={`relative z-20 flex flex-col justify-between bg-white border-r border-slate-200 transition-all duration-300 h-screen select-none ${
        isCollapsed ? 'w-[76px]' : 'w-[264px]'
      }`}
    >
      {/* Top Section */}
      <div className="flex flex-col">
        {/* Brand Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200">
          {!isCollapsed && (
            <div className="flex items-center space-x-3 overflow-hidden">
              <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-indigo-600 text-white font-bold shadow-sm flex-shrink-0">
                SCM
              </div>
              <div className="flex flex-col leading-tight">
                <span className="font-bold text-slate-900 text-sm tracking-tight truncate">SCM Spinners</span>
                <span className="text-[11px] font-medium text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded mt-0.5 w-fit">
                  KTTM 01 [2nd Shed]
                </span>
              </div>
            </div>
          )}

          {isCollapsed && (
            <div className="mx-auto flex items-center justify-center w-10 h-10 rounded-lg bg-indigo-600 text-white font-bold shadow-sm">
              S
            </div>
          )}

          <button 
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-md transition-colors"
            title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
          >
            {isCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </button>
        </div>

        {/* Shift Switcher & Sync Status (when expanded) */}
        {!isCollapsed && (
          <div className="px-3.5 py-3 border-b border-slate-100 bg-slate-50/70">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                Active Shift
              </span>
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                Cloud Active
              </span>
            </div>

            {/* Shift Pill Selector */}
            <div className="grid grid-cols-3 gap-1 bg-slate-200/80 p-0.5 rounded-lg text-xs font-semibold">
              {shifts.map((s) => (
                <button
                  key={s}
                  onClick={() => setActiveShift(s)}
                  className={`py-1 rounded-md transition-all text-center ${
                    activeShift === s
                      ? 'bg-white text-indigo-700 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Shift {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Navigation Items */}
        <nav className="p-2 space-y-1 mt-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            const isRestricted = item.adminOnly && user?.role === 'supervisor';

            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium transition-all text-left relative ${
                  isActive
                    ? 'bg-indigo-50 text-indigo-700 font-semibold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
                }`}
                title={item.label}
              >
                {isActive && (
                  <span className="absolute left-0 top-1.5 bottom-1.5 w-1 bg-indigo-600 rounded-r"></span>
                )}
                <Icon size={18} className={`flex-shrink-0 ${isActive ? 'text-indigo-600' : 'text-slate-400'}`} />
                {!isCollapsed && (
                  <div className="flex items-center justify-between flex-1">
                    <span className="truncate">{item.label}</span>
                    {isRestricted && (
                      <span className="text-[10px] bg-slate-100 text-slate-500 px-1 rounded">Admin</span>
                    )}
                  </div>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* User Profile & Role Drawer Bottom */}
      <div className="p-3 border-t border-slate-200 bg-white">
        {!isCollapsed ? (
          <div>
            <div className="relative">
              <div 
                onClick={() => setRoleMenuOpen(!roleMenuOpen)}
                className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-200 cursor-pointer hover:bg-slate-100 transition-colors"
              >
                <div className="flex items-center space-x-2.5 overflow-hidden">
                  <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs flex-shrink-0">
                    {user?.name ? user.name[0] : 'U'}
                  </div>
                  <div className="flex flex-col text-left truncate">
                    <span className="text-xs font-semibold text-slate-900 truncate">
                      {user?.name || 'Operator'}
                    </span>
                    <span className="text-[10px] font-medium text-slate-500 uppercase tracking-wider">
                      Role: <strong className="text-indigo-600">{user?.role || 'Guest'}</strong>
                    </span>
                  </div>
                </div>
                <UserCheck size={16} className="text-slate-400" />
              </div>

              {/* Role Switcher Menu Popup */}
              {roleMenuOpen && (
                <div className="absolute bottom-full left-0 right-0 mb-2 bg-white rounded-lg shadow-lg border border-slate-200 p-2 z-30 text-xs">
                  <p className="font-semibold text-slate-500 text-[10px] uppercase px-2 mb-1">
                    Quick Role Switch:
                  </p>
                  <button
                    onClick={() => { switchRole('admin'); setRoleMenuOpen(false); }}
                    className="w-full text-left px-2.5 py-1.5 rounded hover:bg-indigo-50 hover:text-indigo-700 flex items-center justify-between"
                  >
                    <span>Mill Admin</span>
                    {user?.role === 'admin' && <span className="text-emerald-600 font-bold">● Active</span>}
                  </button>
                  <button
                    onClick={() => { switchRole('supervisor', 'I'); setRoleMenuOpen(false); }}
                    className="w-full text-left px-2.5 py-1.5 rounded hover:bg-indigo-50 hover:text-indigo-700 flex items-center justify-between"
                  >
                    <span>Supervisor Shift I</span>
                    {user?.role === 'supervisor' && user?.shift === 'I' && <span className="text-emerald-600 font-bold">● Active</span>}
                  </button>
                  <button
                    onClick={() => { switchRole('supervisor', 'II'); setRoleMenuOpen(false); }}
                    className="w-full text-left px-2.5 py-1.5 rounded hover:bg-indigo-50 hover:text-indigo-700 flex items-center justify-between"
                  >
                    <span>Supervisor Shift II</span>
                    {user?.role === 'supervisor' && user?.shift === 'II' && <span className="text-emerald-600 font-bold">● Active</span>}
                  </button>
                  <button
                    onClick={() => { switchRole('tv_display'); setActiveTab('tv-mode'); setRoleMenuOpen(false); }}
                    className="w-full text-left px-2.5 py-1.5 rounded hover:bg-indigo-50 hover:text-indigo-700 flex items-center justify-between text-indigo-600"
                  >
                    <span>Kiosk TV Mode</span>
                  </button>
                </div>
              )}
            </div>

            <button
              onClick={logout}
              className="mt-2 w-full flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
            >
              <LogOut size={14} />
              <span>Sign Out</span>
            </button>
          </div>
        ) : (
          <button
            onClick={() => setIsCollapsed(false)}
            className="w-full flex items-center justify-center p-2 text-slate-400 hover:text-slate-700 rounded-lg"
            title="Expand Profile"
          >
            <UserCheck size={20} />
          </button>
        )}
      </div>
    </aside>
  );
}
