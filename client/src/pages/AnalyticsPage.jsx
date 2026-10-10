import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  BarChart3, 
  Calendar, 
  Layers, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle2, 
  Filter, 
  Download,
  Activity,
  Flame,
  Clock
} from 'lucide-react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from 'recharts';
import api from '../api';

const COUNT_COLORS = {
  '26/1-CH-CY': '#4F46E5', // Indigo
  '30/1-CH-NY': '#0EA5E9', // Sky
  '34/1-CH-NY': '#10B981', // Emerald
  '36/1-CHY': '#F59E0B',   // Amber
  '40s': '#EC4899',        // Pink
  '042/1-CH-NY': '#8B5CF6' // Purple
};

export default function AnalyticsPage({ activeShift }) {
  const [range, setRange] = useState('daily'); // 'daily' or 'mtd'
  const [date, setDate] = useState('2026-10-10');
  const [month, setMonth] = useState('2026-10');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, [range, date, activeShift, month]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/analytics/production?date=${date}&shift=${activeShift}&range=${range}&month=${month}`);
      setData(res.data);
    } catch (err) {
      console.error('[Analytics Error]', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-sm font-medium text-slate-500">Loading Production Telemetry Analytics...</span>
        </div>
      </div>
    );
  }

  const { countSummary, gpsTrendChart, machineHealthGrid, availableCounts } = data || {};

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="space-y-6 pb-12"
    >
      {/* Header & Controls */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
              Machine Telemetry Engine
            </span>
            <span className="text-xs text-slate-400">|</span>
            <span className="text-xs text-slate-500 font-medium">
              14 Ringframe Health & Variance Audit
            </span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Production & Machine Analytics (KTTM 01 Shed 2)
          </h1>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Range Toggle: Daily Shift vs MTD */}
          <div className="flex bg-slate-100 p-1 rounded-lg text-xs font-semibold">
            <button
              onClick={() => setRange('daily')}
              className={`px-3 py-1.5 rounded-md transition-all ${
                range === 'daily'
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Daily Shift Telemetry
            </button>
            <button
              onClick={() => setRange('mtd')}
              className={`px-3 py-1.5 rounded-md transition-all ${
                range === 'mtd'
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Month-to-Date (MTD)
            </button>
          </div>

          {range === 'daily' ? (
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs">
              <Calendar size={14} className="text-slate-400" />
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="bg-transparent font-medium text-slate-800 outline-none cursor-pointer"
              />
            </div>
          ) : (
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs">
              <Calendar size={14} className="text-slate-400" />
              <input
                type="month"
                value={month}
                onChange={(e) => setMonth(e.target.value)}
                className="bg-transparent font-medium text-slate-800 outline-none cursor-pointer"
              />
            </div>
          )}
        </div>
      </div>

      {/* 1. Count Summary & Variance Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <Layers size={16} className="text-indigo-600" />
              Count Summary & Delivery Variance Table
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Comparison of achieved Grams Per Spindle (GPS) and net kilograms against theoretical standard.
            </p>
          </div>
          <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2.5 py-1 rounded">
            {countSummary?.length || 0} Counts In Production
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-500 uppercase">
              <tr>
                <th className="py-3 px-4">Count Code & Name</th>
                <th className="py-3 px-4">Running Frames</th>
                <th className="py-3 px-4">Standard GPS</th>
                <th className="py-3 px-4">Achieved GPS</th>
                <th className="py-3 px-4">Delivery Variance</th>
                <th className="py-3 px-4">Target kg</th>
                <th className="py-3 px-4">Actual kg</th>
                <th className="py-3 px-4">Variance %</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {countSummary?.map((c) => {
                const isPositive = c.deliveryVariance >= 0;
                return (
                  <tr key={c.countCode} className="hover:bg-slate-50/60 font-medium">
                    <td className="py-3.5 px-4 font-bold text-slate-900">
                      <div className="font-mono text-xs">{c.countCode}</div>
                      <div className="text-[11px] text-slate-500 font-normal">{c.countName}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 rounded bg-slate-100 font-semibold text-slate-800">
                        {c.runningFrames} Frames
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-500">{c.standardGps}</td>
                    <td className="py-3.5 px-4 font-bold text-slate-900 text-sm">{c.actualGps}</td>
                    <td className="py-3.5 px-4 font-bold">
                      <span className={isPositive ? 'text-emerald-600' : 'text-rose-600'}>
                        {isPositive ? `+${c.deliveryVariance}` : c.deliveryVariance} GPS
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-600">{c.targetKg} kg</td>
                    <td className="py-3.5 px-4 font-bold text-slate-900">{c.actualKg} kg</td>
                    <td className="py-3.5 px-4">
                      <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                        c.variancePct >= 0
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-rose-50 text-rose-700'
                      }`}>
                        {c.variancePct >= 0 ? `+${c.variancePct}%` : `${c.variancePct}%`}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 2. Count-Wise GPS Run Chart (Recharts) */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <TrendingUp size={16} className="text-indigo-600" />
              Count-Wise GPS Run Chart (Timeline Trend)
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Daily delivery performance trajectory per count over the selected billing period.
            </p>
          </div>
          <span className="text-xs font-medium text-slate-400">
            Recharts Dynamic Vector Engine
          </span>
        </div>

        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={gpsTrendChart} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
              <XAxis dataKey="date" stroke="#94A3B8" fontSize={11} />
              <YAxis domain={['auto', 'auto']} stroke="#94A3B8" fontSize={11} unit=" GPS" />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#FFFFFF', 
                  borderColor: '#E2E8F0', 
                  borderRadius: '8px', 
                  fontSize: '12px',
                  boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' 
                }} 
              />
              <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
              {availableCounts?.map((countCode) => (
                <Line
                  key={countCode}
                  type="monotone"
                  dataKey={countCode}
                  name={countCode}
                  stroke={COUNT_COLORS[countCode] || '#6366F1'}
                  strokeWidth={2.5}
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 3. Machine Health & Statement Grid (All 14 Frames SP025–SP056) */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <Activity size={16} className="text-indigo-600" />
              Machine Health & Mechanical Outlier Audit Grid (14 Frames)
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Monitors frame uptime, pneumatic waste %, and automatically flags machines running &ge; 5 GPS below sister machines.
            </p>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <span className="flex items-center gap-1.5 text-rose-700 font-semibold bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
              <Flame size={13} className="text-rose-600" /> Mechanical Outlier (&ge;5 GPS Deficit)
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-500 uppercase">
              <tr>
                <th className="py-3 px-4">Frame No</th>
                <th className="py-3 px-4">Count Code</th>
                <th className="py-3 px-4">Run Hours</th>
                <th className="py-3 px-4">Stopped Hrs</th>
                <th className="py-3 px-4">Prod (kg)</th>
                <th className="py-3 px-4">Actual GPS</th>
                <th className="py-3 px-4">Sister Avg</th>
                <th className="py-3 px-4">Utilization %</th>
                <th className="py-3 px-4">Efficiency %</th>
                <th className="py-3 px-4">EM Value</th>
                <th className="py-3 px-4">Pneumafil Waste</th>
                <th className="py-3 px-4">Diagnosis</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {machineHealthGrid?.map((m) => {
                return (
                  <tr 
                    key={m.machineNumber}
                    className={`hover:bg-slate-50/60 font-medium ${
                      m.isMechanicalOutlier ? 'bg-rose-50/40' : ''
                    }`}
                  >
                    <td className="py-3.5 px-4 font-black text-slate-900">{m.machineNumber}</td>
                    <td className="py-3.5 px-4 font-mono font-bold text-indigo-700">{m.countCode}</td>
                    <td className="py-3.5 px-4 font-semibold">{m.runHours} hrs</td>
                    <td className="py-3.5 px-4 text-slate-500">{m.stoppedHours} hrs</td>
                    <td className="py-3.5 px-4 font-bold text-slate-900">{m.actualKg} kg</td>
                    <td className="py-3.5 px-4 font-black text-slate-900 text-sm">{m.actualGps}</td>
                    <td className="py-3.5 px-4 text-slate-500">{m.sisterAvgGps}</td>
                    <td className="py-3.5 px-4">{m.utilizationPct}%</td>
                    <td className="py-3.5 px-4">{m.efficiencyPct}%</td>
                    <td className="py-3.5 px-4">
                      <span className={`font-bold ${m.isEmOutlier ? 'text-rose-600' : 'text-slate-700'}`}>
                        {m.emValue}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-500">{m.pneumafilWaste}%</td>
                    <td className="py-3.5 px-4">
                      {m.isMechanicalOutlier ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded font-bold text-[10px] bg-rose-100 text-rose-800 border border-rose-300">
                          <AlertTriangle size={11} /> Mechanical Deficit (-{m.gpsDeficit})
                        </span>
                      ) : m.isEmOutlier ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded font-bold text-[10px] bg-amber-100 text-amber-800">
                          High End-Mends
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold text-[11px]">
                          <CheckCircle2 size={12} /> Optimal
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </motion.div>
  );
}
