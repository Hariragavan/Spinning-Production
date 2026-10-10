import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Zap, 
  Activity, 
  Package, 
  TrendingUp, 
  AlertTriangle, 
  Trophy, 
  Tv, 
  AlertCircle, 
  CheckCircle2, 
  ArrowUpRight,
  Clock,
  Sparkles,
  Layers,
  ChevronRight
} from 'lucide-react';
import api from '../api';

export default function DashboardPage({ activeShift, onSwitchToTv, onGoToUpload }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const currentDate = '2026-10-10';

  useEffect(() => {
    fetchDashboard();
  }, [activeShift]);

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/dashboard/live?date=${currentDate}&shift=${activeShift}`);
      setData(res.data);
      setError(null);
    } catch (err) {
      setError(err.message || 'Failed to fetch dashboard metrics');
    } finally {
      setLoading(false);
    }
  };

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center space-y-3">
          <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-sm font-medium text-slate-500">Loading KTTM 01 Telemetry & Incentives...</span>
        </div>
      </div>
    );
  }

  const { kpis, handoverSnapshot, auditAlerts, top6Siders, syncStatus } = data || {};
  const isAwaitingData = !kpis?.activeMachinesCount || kpis.activeMachinesCount === 0;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="space-y-6 pb-12"
    >
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
              Shift {activeShift} Active Execution
            </span>
            <span className="text-xs text-slate-400">|</span>
            <span className="text-xs font-medium text-slate-500 flex items-center gap-1">
              <Clock size={13} /> {currentDate} (Day 10 of Oct)
            </span>
          </div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight">
            Ringframe 2nd Shed Telemetry & Sider Incentive Hub
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time monitoring across 14 ringframes (`SP025`–`SP056`) & 71 spinning operators.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchDashboard}
            className="px-3 py-2 text-xs font-medium text-slate-600 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors flex items-center gap-1.5"
            title="Refresh Live Metrics"
          >
            <Activity size={14} />
            <span>Live Sync</span>
          </button>
          
          <button
            onClick={onSwitchToTv}
            className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs transition-all flex items-center gap-2 group"
          >
            <Tv size={15} />
            <span>Launch TV Signage</span>
            <ArrowUpRight size={14} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
          </button>
        </div>
      </div>

      {/* Awaiting Data Prompt Banner */}
      {isAwaitingData && (
        <div className="bg-indigo-50/70 border border-indigo-200 rounded-xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-indigo-600 text-white rounded-lg shadow-xs flex-shrink-0 mt-0.5 sm:mt-0">
              <Layers size={18} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-indigo-950">
                Pristine Environment · Waiting for SCM Production Excel Ingestion
              </h2>
              <p className="text-xs text-indigo-700 mt-0.5">
                All mock/dummy records have been cleared. Upload your official mill spreadsheet (or drop <strong>Spinning Framewise Production Statement</strong>) to populate live telemetry, machine health, and GPS incentives.
              </p>
            </div>
          </div>

          {onGoToUpload && (
            <button
              onClick={onGoToUpload}
              className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs transition-colors whitespace-nowrap"
            >
              Open Ingestion Center
            </button>
          )}
        </div>
      )}

      {/* Audit Alerts Bar (if any conflicts or missing rules) */}
      {auditAlerts && auditAlerts.filter(a => a.type !== 'UNASSIGNED_SIDE').length > 0 && (
        <div className="space-y-2">
          {auditAlerts.filter(a => a.type !== 'UNASSIGNED_SIDE').map((alert, idx) => (
            <motion.div 
              key={idx}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className={`p-3.5 rounded-lg border text-xs font-medium flex items-center justify-between ${
                alert.severity === 'DANGER'
                  ? 'bg-rose-50 border-rose-200 text-rose-800'
                  : 'bg-amber-50 border-amber-200 text-amber-800'
              }`}
            >
              <div className="flex items-center gap-2.5">
                {alert.severity === 'DANGER' ? (
                  <AlertCircle size={18} className="text-rose-600 flex-shrink-0" />
                ) : (
                  <AlertTriangle size={18} className="text-amber-600 flex-shrink-0" />
                )}
                <span>{alert.message}</span>
              </div>
              <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                alert.severity === 'DANGER' ? 'bg-rose-200/60 text-rose-900' : 'bg-amber-200/60 text-amber-900'
              }`}>
                {alert.type}
              </span>
            </motion.div>
          ))}
        </div>
      )}

      {/* Executive KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Card 1: Overall Efficiency */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Overall Efficiency</span>
            <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600">
              <Zap size={16} />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">{kpis?.avgEfficiency || 0}%</span>
            <span className="text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
              High
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-2">14 Ringframes standard target 94.0%</p>
        </div>

        {/* Card 2: Average Utilization */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Avg Utilization</span>
            <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600">
              <Activity size={16} />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">{kpis?.avgUtilization || 0}%</span>
            <span className="text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
              Operational
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-2">Spindle pneumatic air uptime</p>
        </div>

        {/* Card 3: Total Production */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Production</span>
            <div className="p-1.5 rounded-lg bg-sky-50 text-sky-600">
              <Package size={16} />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">{kpis?.totalProductionKg?.toLocaleString() || 0}</span>
            <span className="text-xs font-medium text-slate-500">kg</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-2">Shift {activeShift} net delivery</p>
        </div>

        {/* Card 4: 40s GPS Average */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">40s Converted GPS</span>
            <div className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600">
              <TrendingUp size={16} />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-indigo-700">{kpis?.avg40sGps || 0}</span>
            <span className="text-xs font-medium text-slate-500">g/spindle</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-2">Normalized conversion index</p>
        </div>

        {/* Card 5: Shift Incentive Pool */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Shift Incentive</span>
            <div className="p-1.5 rounded-lg bg-amber-50 text-amber-600">
              <Sparkles size={16} />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">₹{kpis?.totalIncentive?.toLocaleString() || 0}</span>
            <span className="text-[11px] font-medium text-slate-500">earned</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-2">{kpis?.totalWorkers || 0} siders on duty</p>
        </div>
      </div>

      {/* Main Grid: Handover Snapshot & Live Sider Highlights */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Handover Snapshot Card */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <Layers size={16} className="text-indigo-600" />
                Handover Snapshot
              </h2>
              <span className="text-xs font-medium text-slate-500">
                Gaiter: <strong className="text-slate-800">{handoverSnapshot?.gaiterName}</strong>
              </span>
            </div>

            {/* Count Distribution Badges */}
            <div className="mb-4">
              <span className="text-xs font-semibold text-slate-600 mb-2 block">Running Count Allocation:</span>
              <div className="grid grid-cols-2 gap-2">
                {handoverSnapshot?.countDistribution?.map((c, i) => (
                  <div key={i} className="p-2.5 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-700 font-mono">{c.count}</span>
                    <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                      {c.frames} Frames
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Quality & Assignment Flags */}
            <div className="space-y-2 mt-4">
              <div className="flex items-center justify-between text-xs p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                <span className="text-slate-600">Unassigned Sides:</span>
                {kpis?.unassignedSidesCount > 0 ? (
                  <span className="px-2 py-0.5 text-xs font-bold rounded bg-amber-50 text-amber-800 border border-amber-200">
                    {kpis.unassignedSidesCount} Sides Unallocated
                  </span>
                ) : (
                  <span className="text-emerald-700 font-semibold flex items-center gap-1">
                    <CheckCircle2 size={14} /> Full Coverage
                  </span>
                )}
              </div>

              <div className="flex items-center justify-between text-xs p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                <span className="text-slate-600">EM Quality Alerts (&gt;4.0):</span>
                {kpis?.emOutliersCount > 0 ? (
                  <span className="px-2 py-0.5 text-xs font-bold rounded bg-rose-50 text-rose-800 border border-rose-200">
                    {kpis.emOutliersCount} High EM Frame(s)
                  </span>
                ) : (
                  <span className="text-emerald-700 font-semibold flex items-center gap-1">
                    <CheckCircle2 size={14} /> Standard Waste
                  </span>
                )}
              </div>

              <div className="flex items-center justify-between text-xs p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                <span className="text-slate-600">Missing Incentive Rules:</span>
                {kpis?.missingRulesCount > 0 ? (
                  <span className="px-2 py-0.5 text-xs font-bold rounded bg-rose-50 text-rose-800 border border-rose-200">
                    ⚠️ {kpis.missingRulesCount} Rule Missing
                  </span>
                ) : (
                  <span className="text-emerald-700 font-semibold flex items-center gap-1">
                    <CheckCircle2 size={14} /> All Rules Active
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="mt-5 pt-3 border-t border-slate-100 text-[11px] text-slate-400 flex items-center justify-between">
            <span>Roster Status: {handoverSnapshot?.isLocked ? '🔒 Locked' : '✏️ Draft Operations'}</span>
            <span className="text-emerald-600 font-medium">● Telemetry Stream Active</span>
          </div>
        </div>

        {/* Top 6 Siders Hall of Fame (Monthly Leaderboard) */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-xs p-5">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
            <div>
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <Trophy size={17} className="text-amber-500" />
                Monthly Top 6 Siders Hall of Fame (October 2026)
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Top earning spinners recognized on Shop-Floor TV Signage based on delivery GPS and side uptime.
              </p>
            </div>
            <span className="text-xs font-semibold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full border border-indigo-100">
              Disbursement Leaders
            </span>
          </div>

          {/* Leaderboard Cards Grid */}
          {top6Siders && top6Siders.some(s => s.totalIncentive > 0 || s.completedDuties > 0) ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {top6Siders.filter(s => s.totalIncentive > 0 || s.completedDuties > 0).map((sider) => {
                const isFirst = sider.rank === 1;
                const isSecond = sider.rank === 2;
                const isThird = sider.rank === 3;

                return (
                  <div 
                    key={sider.tokenNumber}
                    className={`p-3.5 rounded-xl border transition-all ${
                      isFirst 
                        ? 'bg-amber-50/50 border-amber-300 ring-1 ring-amber-200 shadow-xs'
                        : isSecond
                        ? 'bg-slate-50/70 border-slate-300 shadow-xs'
                        : isThird
                        ? 'bg-orange-50/40 border-orange-200 shadow-xs'
                        : 'bg-white border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs ${
                        isFirst 
                          ? 'bg-amber-500 text-white shadow-xs' 
                          : isSecond 
                          ? 'bg-slate-400 text-white' 
                          : isThird 
                          ? 'bg-amber-700 text-white' 
                          : 'bg-slate-200 text-slate-700'
                      }`}>
                        #{sider.rank}
                      </span>
                      <span className="text-[11px] font-mono font-medium text-slate-500">
                        Tk: {sider.tokenNumber}
                      </span>
                    </div>

                    <div className="mb-2">
                      <h3 className="text-xs font-bold text-slate-900 truncate" title={sider.name}>
                        {sider.name}
                      </h3>
                      <div className="flex items-center justify-between text-[11px] text-slate-500 mt-0.5">
                        <span>Duties: <strong className="text-slate-700">{sider.completedDuties}</strong></span>
                        <span>Avg GPS: <strong className="text-indigo-600">{sider.avgGps}</strong></span>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-200/80 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] text-slate-400 block uppercase">Total Earned</span>
                        <span className="text-sm font-bold text-emerald-700">₹{sider.totalIncentive.toLocaleString()}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] text-slate-400 block uppercase">Per Duty</span>
                        <span className="text-xs font-semibold text-slate-700">₹{sider.avgPayoutPerShift}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-8 text-center bg-slate-50/60 rounded-xl border border-dashed border-slate-200">
              <Trophy size={28} className="mx-auto text-slate-300 mb-2" />
              <p className="text-xs font-bold text-slate-700">No Monthly Duty Incentives Recorded Yet</p>
              <p className="text-[11px] text-slate-400 mt-1">
                Upload your daily shift production sheets to calculate operator slab payouts and rank the top 6 siders.
              </p>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
