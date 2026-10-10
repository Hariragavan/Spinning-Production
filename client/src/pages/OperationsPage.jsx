import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, 
  Copy, 
  Trash2, 
  Wand2, 
  Lock, 
  Unlock, 
  AlertTriangle, 
  AlertCircle, 
  CheckCircle2, 
  ChevronUp, 
  ChevronDown, 
  Coins, 
  Sparkles, 
  Calendar,
  Layers,
  ArrowRight,
  Search,
  UserCheck
} from 'lucide-react';
import api from '../api';

export default function OperationsPage({ activeShift, setActiveShift }) {
  const [date, setDate] = useState('2026-10-10');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(true);
  const [searchFilter, setSearchFilter] = useState('');
  const [notification, setNotification] = useState(null);

  useEffect(() => {
    fetchRoster();
  }, [date, activeShift]);

  const fetchRoster = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/operations/roster?date=${date}&shift=${activeShift}`);
      setData(res.data);
    } catch (err) {
      console.error('[Fetch Roster Error]', err);
    } finally {
      setLoading(false);
    }
  };

  const showNotification = (msg, type = 'success') => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 4000);
  };

  // Assign side handler
  const handleAssignSide = async (machineNumber, side, workerToken) => {
    try {
      setSaving(true);
      const res = await api.post('/operations/assign-side', {
        date,
        shift: activeShift,
        machineNumber,
        side,
        workerToken
      });
      fetchRoster();
      showNotification(`Assigned ${machineNumber} ${side}`, 'success');
    } catch (err) {
      showNotification(err.response?.data?.message || err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  // Change Gaiter handler
  const handleGaiterChange = async (gaiterToken) => {
    if (!data) return;
    try {
      setSaving(true);
      // Flatten current allocations
      const currentAllocs = [];
      data.machineGrid.forEach(m => {
        currentAllocs.push({ machineNumber: m.machineNumber, side: 'LH', workerToken: m.LH.workerToken });
        currentAllocs.push({ machineNumber: m.machineNumber, side: 'RH', workerToken: m.RH.workerToken });
      });

      await api.post('/operations/save-roster', {
        date,
        shift: activeShift,
        gaiterToken,
        allocations: currentAllocs
      });
      fetchRoster();
      showNotification('Updated Shift Gaiter', 'success');
    } catch (err) {
      showNotification(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  // Batch: Copy Previous Shift
  const handleCopyPrevious = async () => {
    try {
      setSaving(true);
      const res = await api.post('/operations/copy-previous', { date, shift: activeShift });
      fetchRoster();
      showNotification(res.data.message, 'success');
    } catch (err) {
      showNotification(err.response?.data?.message || err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  // Batch: Clear Roster
  const handleClearRoster = async () => {
    if (!window.confirm('Clear all side allocations for this shift?')) return;
    try {
      setSaving(true);
      await api.post('/operations/clear-roster', { date, shift: activeShift });
      fetchRoster();
      showNotification('Shift roster cleared', 'info');
    } catch (err) {
      showNotification(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  // Batch: Bulk Auto-Allocate
  const handleAutoAllocate = async () => {
    try {
      setSaving(true);
      const res = await api.post('/operations/auto-allocate', { date, shift: activeShift });
      fetchRoster();
      showNotification(res.data.message, 'success');
    } catch (err) {
      showNotification(err.response?.data?.message || err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  // Lock Toggle
  const handleToggleLock = async () => {
    try {
      setSaving(true);
      const res = await api.post('/operations/toggle-lock', {
        date,
        shift: activeShift,
        isLocked: !data?.isLocked
      });
      fetchRoster();
      showNotification(res.data.isLocked ? 'Roster locked' : 'Roster unlocked', 'info');
    } catch (err) {
      showNotification(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-sm font-medium text-slate-500">Loading Allocation Desk...</span>
        </div>
      </div>
    );
  }

  const { machineGrid, workers, calculationSummary, isLocked, gaiterToken } = data || {};
  const { auditAlerts, workerRollup, kpis } = calculationSummary || {};

  // Build worker side count lookup for workload chip
  const workerWorkloadMap = new Map();
  workerRollup?.forEach(w => {
    workerWorkloadMap.set(w.tokenNumber, { count: w.sidesCount, pct: w.workloadPct });
  });

  // Filter machines if search input
  const filteredMachines = machineGrid?.filter(m => {
    if (!searchFilter) return true;
    const q = searchFilter.toLowerCase();
    return (
      m.machineNumber.toLowerCase().includes(q) ||
      m.countCode.toLowerCase().includes(q) ||
      m.LH.workerName?.toLowerCase().includes(q) ||
      m.RH.workerName?.toLowerCase().includes(q) ||
      m.LH.workerToken?.includes(q) ||
      m.RH.workerToken?.includes(q)
    );
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="space-y-6 pb-40"
    >
      {/* Toast Notification */}
      {notification && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-2.5 rounded-lg shadow-lg border text-xs font-semibold ${
          notification.type === 'error'
            ? 'bg-rose-50 text-rose-800 border-rose-200'
            : notification.type === 'info'
            ? 'bg-sky-50 text-sky-800 border-sky-200'
            : 'bg-emerald-50 text-emerald-800 border-emerald-200'
        }`}>
          {notification.msg}
        </div>
      )}

      {/* Supervisor Header & Controls */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-full">
                Shed 02 Allocation Desk
              </span>
              <span className="text-xs text-slate-400">|</span>
              <span className="text-xs text-slate-500 font-medium">
                14 Ringframes (`SP025`–`SP056`)
              </span>
            </div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Shift Operations & LH/RH Side Allocation
            </h1>
          </div>

          {/* Quick Date, Shift & Gaiter Pickers */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Date Picker */}
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs">
              <Calendar size={14} className="text-slate-400" />
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="bg-transparent font-medium text-slate-800 outline-none cursor-pointer"
              />
            </div>

            {/* Shift Selector */}
            <div className="flex bg-slate-100 p-1 rounded-lg text-xs font-semibold">
              {['I', 'II', 'III'].map((s) => (
                <button
                  key={s}
                  onClick={() => setActiveShift(s)}
                  className={`px-3 py-1 rounded-md transition-all ${
                    activeShift === s
                      ? 'bg-white text-indigo-700 shadow-xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Shift {s}
                </button>
              ))}
            </div>

            {/* Shift Gaiter Selector */}
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs">
              <span className="text-slate-500 font-medium">Gaiter:</span>
              <select
                value={gaiterToken || ''}
                onChange={(e) => handleGaiterChange(e.target.value)}
                disabled={isLocked}
                className="bg-transparent font-semibold text-slate-800 outline-none cursor-pointer max-w-[140px]"
              >
                <option value="">Select Gaiter...</option>
                {workers?.map(w => (
                  <option key={w.tokenNumber} value={w.tokenNumber}>
                    {w.tokenNumber} - {w.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Lock / Unlock Toggle */}
            <button
              onClick={handleToggleLock}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all ${
                isLocked
                  ? 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
                  : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
              }`}
            >
              {isLocked ? <Lock size={14} /> : <Unlock size={14} />}
              <span>{isLocked ? 'Locked' : 'Unlocked'}</span>
            </button>
          </div>
        </div>

        {/* Batch Actions & Search Bar */}
        <div className="pt-3 border-t border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-slate-500 mr-1">Batch Actions:</span>
            <button
              onClick={handleCopyPrevious}
              disabled={isLocked || saving}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg transition-colors disabled:opacity-50"
            >
              <Copy size={13} />
              <span>Copy Previous Shift</span>
            </button>
            <button
              onClick={handleAutoAllocate}
              disabled={isLocked || saving}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg transition-colors disabled:opacity-50"
            >
              <Wand2 size={13} />
              <span>Bulk Auto-Allocate (100%)</span>
            </button>
            <button
              onClick={handleClearRoster}
              disabled={isLocked || saving}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-slate-50 hover:bg-rose-50 text-slate-600 hover:text-rose-700 border border-slate-200 rounded-lg transition-colors disabled:opacity-50"
            >
              <Trash2 size={13} />
              <span>Clear Roster</span>
            </button>
          </div>

          {/* Search Box */}
          <div className="relative">
            <Search size={14} className="absolute left-2.5 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search frame, count, sider..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              className="pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-indigo-500 w-full md:w-64"
            />
          </div>
        </div>
      </div>

      {/* Inline Conflict & Audit Alerts Banner */}
      {auditAlerts && auditAlerts.length > 0 && (
        <div className="space-y-2">
          {auditAlerts.map((alert, idx) => (
            <div
              key={idx}
              className={`p-3 rounded-lg border text-xs font-medium flex items-center justify-between ${
                alert.severity === 'DANGER'
                  ? 'bg-rose-50 border-rose-200 text-rose-800'
                  : 'bg-amber-50 border-amber-200 text-amber-800'
              }`}
            >
              <div className="flex items-center gap-2">
                {alert.severity === 'DANGER' ? (
                  <AlertCircle size={16} className="text-rose-600 flex-shrink-0" />
                ) : (
                  <AlertTriangle size={16} className="text-amber-600 flex-shrink-0" />
                )}
                <span>{alert.message}</span>
              </div>
              <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                alert.severity === 'DANGER' ? 'bg-rose-200/60 text-rose-900' : 'bg-amber-200/60 text-amber-900'
              }`}>
                {alert.type}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* 14 Machine Interactive Grid (SP025–SP056) */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
        {filteredMachines?.map((machine) => {
          return (
            <div
              key={machine.machineNumber}
              className={`bg-white rounded-xl border shadow-xs overflow-hidden transition-all ${
                machine.isEmOutlier
                  ? 'border-rose-300 ring-1 ring-rose-200'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              {/* Machine Header */}
              <div className="bg-slate-50/80 px-4 py-2.5 border-b border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-black text-slate-900 text-sm">{machine.machineNumber}</span>
                  <span className="text-[11px] font-mono font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-1.5 py-0.5 rounded">
                    {machine.countCode}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="font-semibold text-slate-700">GPS: {machine.actualGps}</span>
                  <span className={`text-[11px] font-medium ${machine.isEmOutlier ? 'text-rose-600 font-bold' : 'text-slate-500'}`}>
                    EM: {machine.emValue}
                  </span>
                </div>
              </div>

              {/* LH & RH Side Cards */}
              <div className="p-3.5 space-y-3">
                {/* Left Hand Side (LH) */}
                <div className={`p-2.5 rounded-lg border transition-all ${
                  !machine.LH.workerToken
                    ? 'bg-amber-50/40 border-amber-200'
                    : 'bg-white border-slate-200'
                }`}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-indigo-600"></span>
                      Left Side (LH)
                    </span>
                    <span className="text-xs font-bold text-emerald-700">
                      ₹{machine.LH.incentive}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <select
                      value={machine.LH.workerToken || ''}
                      onChange={(e) => handleAssignSide(machine.machineNumber, 'LH', e.target.value)}
                      disabled={isLocked || saving}
                      className="w-full text-xs py-1.5 px-2 bg-slate-50 border border-slate-200 rounded font-medium text-slate-800 outline-none focus:border-indigo-500"
                    >
                      <option value="">-- Unassigned --</option>
                      {workers?.map(w => {
                        const wl = workerWorkloadMap.get(w.tokenNumber);
                        const wlText = wl ? ` [${wl.pct}%]` : ' [0%]';
                        return (
                          <option key={w.tokenNumber} value={w.tokenNumber}>
                            {w.tokenNumber} - {w.name} {wlText}
                          </option>
                        );
                      })}
                    </select>

                    {/* Workload Badge */}
                    {machine.LH.workerToken && (
                      <span className={`text-[10px] font-bold px-1.5 py-1 rounded flex-shrink-0 ${
                        (workerWorkloadMap.get(machine.LH.workerToken)?.pct || 0) > 200
                          ? 'bg-rose-100 text-rose-800'
                          : 'bg-slate-100 text-slate-700'
                      }`}>
                        {workerWorkloadMap.get(machine.LH.workerToken)?.pct || 50}%
                      </span>
                    )}
                  </div>

                  {machine.LH.ruleMissing && (
                    <span className="text-[10px] text-rose-600 font-bold block mt-1">
                      ⚠️ RULE MISSING
                    </span>
                  )}
                </div>

                {/* Right Hand Side (RH) */}
                <div className={`p-2.5 rounded-lg border transition-all ${
                  !machine.RH.workerToken
                    ? 'bg-amber-50/40 border-amber-200'
                    : 'bg-white border-slate-200'
                }`}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-indigo-600"></span>
                      Right Side (RH)
                    </span>
                    <span className="text-xs font-bold text-emerald-700">
                      ₹{machine.RH.incentive}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <select
                      value={machine.RH.workerToken || ''}
                      onChange={(e) => handleAssignSide(machine.machineNumber, 'RH', e.target.value)}
                      disabled={isLocked || saving}
                      className="w-full text-xs py-1.5 px-2 bg-slate-50 border border-slate-200 rounded font-medium text-slate-800 outline-none focus:border-indigo-500"
                    >
                      <option value="">-- Unassigned --</option>
                      {workers?.map(w => {
                        const wl = workerWorkloadMap.get(w.tokenNumber);
                        const wlText = wl ? ` [${wl.pct}%]` : ' [0%]';
                        return (
                          <option key={w.tokenNumber} value={w.tokenNumber}>
                            {w.tokenNumber} - {w.name} {wlText}
                          </option>
                        );
                      })}
                    </select>

                    {/* Workload Badge */}
                    {machine.RH.workerToken && (
                      <span className={`text-[10px] font-bold px-1.5 py-1 rounded flex-shrink-0 ${
                        (workerWorkloadMap.get(machine.RH.workerToken)?.pct || 0) > 200
                          ? 'bg-rose-100 text-rose-800'
                          : 'bg-slate-100 text-slate-700'
                      }`}>
                        {workerWorkloadMap.get(machine.RH.workerToken)?.pct || 50}%
                      </span>
                    )}
                  </div>

                  {machine.RH.ruleMissing && (
                    <span className="text-[10px] text-rose-600 font-bold block mt-1">
                      ⚠️ RULE MISSING
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Bottom Sliding Drawer: Daily Sider Payout Preview */}
      <div className={`fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-slate-200 shadow-xl transition-all duration-300 ${
        drawerOpen ? 'translate-y-0' : 'translate-y-[calc(100%-46px)]'
      }`}>
        {/* Drawer Header Toggle */}
        <div 
          onClick={() => setDrawerOpen(!drawerOpen)}
          className="px-6 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between cursor-pointer hover:bg-slate-100 transition-colors"
        >
          <div className="flex items-center gap-3">
            <Coins size={16} className="text-indigo-600" />
            <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Live Sider Shift Payout Preview (Shift {activeShift})
            </span>
            <span className="text-xs text-slate-500 font-medium">
              • {workerRollup?.length || 0} Siders Active • Total: <strong className="text-emerald-700">₹{kpis?.totalIncentive?.toLocaleString()}</strong>
            </span>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
            <span>{drawerOpen ? 'Collapse Drawer' : 'Expand Drawer'}</span>
            {drawerOpen ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
          </div>
        </div>

        {/* Drawer Content */}
        <div className="p-4 max-h-56 overflow-y-auto">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-7 gap-2.5">
            {workerRollup?.map((w) => (
              <div 
                key={w.tokenNumber}
                className={`p-2.5 rounded-lg border text-xs ${
                  w.isOverworked
                    ? 'bg-rose-50 border-rose-200'
                    : 'bg-white border-slate-200'
                }`}
              >
                <div className="flex items-center justify-between font-mono text-[11px] text-slate-500">
                  <span>Tk: {w.tokenNumber}</span>
                  <span className={`px-1 py-0.2 rounded font-bold ${
                    w.workloadPct > 100 ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-700'
                  }`}>
                    {w.workloadPct}%
                  </span>
                </div>

                <div className="font-bold text-slate-900 truncate my-1" title={w.name}>
                  {w.name}
                </div>

                <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                  <span className="text-[10px] text-slate-400">{w.sidesCount} Sides</span>
                  <span className="font-bold text-emerald-700">₹{w.totalIncentive}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
