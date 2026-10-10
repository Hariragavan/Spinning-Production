import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Tv, 
  Maximize2, 
  Minimize2, 
  Play, 
  Pause, 
  ArrowLeft, 
  Trophy, 
  Activity, 
  Cpu, 
  TrendingUp, 
  Zap,
  Sparkles,
  Layers,
  AlertTriangle,
  Clock
} from 'lucide-react';
import api from '../api';

const SLIDES = [
  { id: 1, title: 'Mill KPI Overview & Shift Breakdown', duration: 15 },
  { id: 2, title: 'Machine Delivery & Utilization Grid', duration: 20 },
  { id: 3, title: 'Running Count GPS Delivery Trends', duration: 15 },
  { id: 4, title: 'October Hall of Fame (Top 6 Siders)', duration: 15 }
];

export default function TvModePage({ onExit }) {
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date().toLocaleTimeString());

  // Clock tick
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch TV Signage payload
  useEffect(() => {
    fetchTvData();
    const interval = setInterval(fetchTvData, 30000); // refresh data every 30s
    return () => clearInterval(interval);
  }, []);

  const fetchTvData = async () => {
    try {
      const res = await api.get('/dashboard/tv-signage?date=2026-10-10&shift=I');
      setData(res.data);
    } catch (err) {
      console.error('[TV Fetch Error]', err);
    } finally {
      setLoading(false);
    }
  };

  // Carousel timer & progress bar
  useEffect(() => {
    if (isPaused) return;

    const currentDuration = SLIDES[currentSlideIndex].duration * 1000;
    const tickInterval = 100;
    const step = (tickInterval / currentDuration) * 100;

    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          setCurrentSlideIndex((old) => (old + 1) % SLIDES.length);
          return 0;
        }
        return prev + step;
      });
    }, tickInterval);

    return () => clearInterval(timer);
  }, [currentSlideIndex, isPaused]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  if (loading || !data) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-900 text-white">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-sm font-semibold tracking-wider text-slate-300 uppercase">
            Initializing SCM Shop-Floor Live Signage...
          </span>
        </div>
      </div>
    );
  }

  const { slide1_overview, slide2_machines, slide3_countTrends, slide4_hallOfFame } = data;

  return (
    <div className="fixed inset-0 z-50 bg-[#F8FAFC] flex flex-col justify-between overflow-hidden select-none">
      {/* Top Signage Header Bar */}
      <header className="bg-white border-b border-slate-200 px-6 py-3.5 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-indigo-600 text-white font-black text-sm flex items-center justify-center shadow-xs">
              SCM
            </span>
            <div>
              <h1 className="text-base font-bold text-slate-900 leading-tight">
                SCM TEXTILE SPINNERS <span className="text-indigo-600 font-extrabold">· UNIT 01</span>
              </h1>
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-widest">
                Ringframe 2nd Shed Telemetry Signage
              </span>
            </div>
          </div>
          <div className="h-6 w-px bg-slate-200 mx-2"></div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
              Shift {data.shift} Active
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
              Live Telemetry
            </span>
          </div>
        </div>

        {/* Slide Indicator & Kiosk Controls */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-lg">
            {SLIDES.map((s, idx) => (
              <button
                key={s.id}
                onClick={() => { setCurrentSlideIndex(idx); setProgress(0); }}
                className={`px-3 py-1 rounded text-xs font-semibold transition-all ${
                  currentSlideIndex === idx
                    ? 'bg-white text-indigo-700 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Slide {idx + 1}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 text-slate-600 text-xs font-mono font-medium">
            <Clock size={15} />
            <span>{currentTime}</span>
          </div>

          <div className="flex items-center gap-1.5 border-l border-slate-200 pl-3">
            <button
              onClick={() => setIsPaused(!isPaused)}
              className="p-1.5 rounded-md hover:bg-slate-100 text-slate-600 transition-colors"
              title={isPaused ? "Resume Carousel" : "Pause Carousel"}
            >
              {isPaused ? <Play size={16} /> : <Pause size={16} />}
            </button>
            <button
              onClick={toggleFullscreen}
              className="p-1.5 rounded-md hover:bg-slate-100 text-slate-600 transition-colors"
              title="Toggle Fullscreen"
            >
              {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
            </button>
            {onExit && (
              <button
                onClick={onExit}
                className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors"
              >
                <ArrowLeft size={14} />
                <span>Exit TV</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Progress Line */}
      <div className="w-full bg-slate-200 h-1">
        <div 
          className="bg-indigo-600 h-1 transition-all duration-100 ease-linear"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Slide Presentation Area */}
      <main className="flex-1 p-6 overflow-hidden flex flex-col justify-center max-w-[1700px] mx-auto w-full">
        <AnimatePresence mode="wait">
          {/* SLIDE 1: Mill KPI Overview & Shift Breakdown */}
          {currentSlideIndex === 0 && (
            <motion.div
              key="slide-1"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.02 }}
              transition={{ duration: 0.4 }}
              className="space-y-6 w-full"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">Slide 1 of 4</span>
                  <h2 className="text-2xl font-black text-slate-900">
                    Shed 2 Executive Performance Dashboard
                  </h2>
                </div>
                <span className="text-sm font-semibold text-slate-500 font-mono">
                  14 Ringframes Connected (SP025–SP056)
                </span>
              </div>

              {/* Large Metric Highlights */}
              <div className="grid grid-cols-4 gap-6">
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Overall Efficiency</span>
                  <div className="my-3">
                    <span className="text-5xl font-black text-slate-900">{slide1_overview.avgEfficiency}%</span>
                  </div>
                  <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-1 rounded w-fit">
                    Target: 94.0% Standard
                  </span>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Spindle Utilization</span>
                  <div className="my-3">
                    <span className="text-5xl font-black text-slate-900">{slide1_overview.avgUtilization}%</span>
                  </div>
                  <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-1 rounded w-fit">
                    Full Spindle Air Uptime
                  </span>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Shift Production Net</span>
                  <div className="my-3">
                    <span className="text-5xl font-black text-slate-900">{slide1_overview.totalProductionKg}</span>
                    <span className="text-lg font-bold text-slate-500 ml-1">kg</span>
                  </div>
                  <span className="text-xs font-semibold text-sky-600 bg-sky-50 px-2 py-1 rounded w-fit">
                    Active Delivery
                  </span>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">40s Converted GPS</span>
                  <div className="my-3">
                    <span className="text-5xl font-black text-indigo-700">{slide1_overview.avg40sGps}</span>
                    <span className="text-base font-bold text-slate-500 ml-1">GPS</span>
                  </div>
                  <span className="text-xs font-semibold text-indigo-700 bg-indigo-50 px-2 py-1 rounded w-fit">
                    Standard Count Base
                  </span>
                </div>
              </div>

              {/* Lower Section Banner */}
              <div className="bg-indigo-600 text-white p-6 rounded-2xl shadow-sm flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold">Shift Incentive Disbursement Pool</h3>
                  <p className="text-xs text-indigo-100 mt-0.5">
                    Live earned payouts for operators on duty in Shift {data.shift} based on slab achievement
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-xs uppercase tracking-wider text-indigo-200 block">Total Shift Pool</span>
                  <span className="text-4xl font-black">₹{slide1_overview.totalIncentiveDisbursed.toLocaleString()}</span>
                </div>
              </div>
            </motion.div>
          )}

          {/* SLIDE 2: Machine Delivery & Utilization Grid */}
          {currentSlideIndex === 1 && (
            <motion.div
              key="slide-2"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.02 }}
              transition={{ duration: 0.4 }}
              className="space-y-4 w-full"
            >
              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">Slide 2 of 4</span>
                  <h2 className="text-2xl font-black text-slate-900">
                    Machine Delivery & Utilization Grid (14 Ringframes)
                  </h2>
                </div>
                <div className="flex items-center gap-3 text-xs font-semibold">
                  <span className="flex items-center gap-1 text-emerald-700">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> Normal
                  </span>
                  <span className="flex items-center gap-1 text-rose-700">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span> EM Outlier &gt;4.0
                  </span>
                </div>
              </div>

              {/* 14 Machine Tiles */}
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
                {slide2_machines?.map((m) => {
                  return (
                    <div
                      key={m.machineNumber}
                      className={`p-3.5 rounded-xl border bg-white shadow-xs transition-all ${
                        m.isEmOutlier
                          ? 'border-rose-300 ring-2 ring-rose-200 bg-rose-50/20'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-sm font-black text-slate-900">{m.machineNumber}</span>
                        <span className="text-[10px] font-mono font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">
                          {m.countCode}
                        </span>
                      </div>

                      <div className="my-2">
                        <div className="flex items-baseline justify-between">
                          <span className="text-[10px] uppercase text-slate-400 font-semibold">Actual GPS</span>
                          <span className="text-xl font-black text-slate-900">{m.actualGps}</span>
                        </div>
                        <div className="flex items-center justify-between text-[11px] text-slate-500 mt-0.5">
                          <span>Eff: {m.efficiencyPct}%</span>
                          <span className={m.isEmOutlier ? 'text-rose-600 font-bold' : ''}>
                            EM: {m.emValue}
                          </span>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-slate-100 text-[10px] space-y-1">
                        {m.sides?.map((s, idx) => (
                          <div key={idx} className="flex items-center justify-between truncate">
                            <span className="font-semibold text-slate-600">{s.side}:</span>
                            <span className="truncate max-w-[85px] text-slate-800" title={s.workerName}>
                              {s.workerName}
                            </span>
                            <span className="font-bold text-emerald-700">₹{s.sideIncentive}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* SLIDE 3: Running Count GPS Delivery Trends */}
          {currentSlideIndex === 2 && (
            <motion.div
              key="slide-3"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.02 }}
              transition={{ duration: 0.4 }}
              className="space-y-4 w-full"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">Slide 3 of 4</span>
                  <h2 className="text-2xl font-black text-slate-900">
                    Running Count GPS Delivery vs Mill Standard
                  </h2>
                </div>
                <span className="text-sm font-semibold text-slate-500">
                  Variance Breakdown by Yarn Count
                </span>
              </div>

              {/* Table of Counts */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase">
                    <tr>
                      <th className="py-3.5 px-6">Yarn Count Code</th>
                      <th className="py-3.5 px-6">Running Frames</th>
                      <th className="py-3.5 px-6">Standard GPS</th>
                      <th className="py-3.5 px-6">Achieved GPS</th>
                      <th className="py-3.5 px-6">Delivery Variance</th>
                      <th className="py-3.5 px-6">Total Net kg</th>
                      <th className="py-3.5 px-6">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {slide3_countTrends?.map((c) => {
                      const isPositive = c.variance >= 0;
                      return (
                        <tr key={c.countCode} className="hover:bg-slate-50/60 font-medium">
                          <td className="py-4 px-6 font-bold text-slate-900 font-mono text-base">
                            {c.countCode}
                          </td>
                          <td className="py-4 px-6">
                            <span className="px-2.5 py-1 rounded-full bg-slate-100 font-semibold text-xs">
                              {c.runningFrames} Frames
                            </span>
                          </td>
                          <td className="py-4 px-6 text-slate-500">{c.standardGps}</td>
                          <td className="py-4 px-6 font-bold text-slate-900 text-base">{c.actualGps}</td>
                          <td className="py-4 px-6">
                            <span className={`font-bold ${isPositive ? 'text-emerald-600' : 'text-rose-600'}`}>
                              {isPositive ? `+${c.variance}` : c.variance}
                            </span>
                          </td>
                          <td className="py-4 px-6 font-semibold">{c.totalKg} kg</td>
                          <td className="py-4 px-6">
                            <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                              isPositive ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                            }`}>
                              {isPositive ? '▲ Above Target' : '▼ Below Target'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}

          {/* SLIDE 4: October Hall of Fame (Top 6 Siders) */}
          {currentSlideIndex === 3 && (
            <motion.div
              key="slide-4"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.02 }}
              transition={{ duration: 0.4 }}
              className="space-y-4 w-full"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-amber-600">Slide 4 of 4</span>
                  <h2 className="text-2xl font-black text-slate-900 flex items-center gap-2">
                    <Trophy size={24} className="text-amber-500" />
                    Top 6 Siders Hall of Fame (October 2026)
                  </h2>
                </div>
                <span className="text-sm font-semibold text-amber-700 bg-amber-50 px-3 py-1 rounded-full border border-amber-200">
                  🏆 Shed 2 Excellence Champions
                </span>
              </div>

              {/* 6 Champions Showcase */}
              <div className="grid grid-cols-3 gap-6">
                {slide4_hallOfFame?.map((sider) => {
                  const isTop1 = sider.rank === 1;
                  return (
                    <div
                      key={sider.tokenNumber}
                      className={`p-6 rounded-2xl border transition-all ${
                        isTop1
                          ? 'bg-amber-50/60 border-amber-300 ring-2 ring-amber-300 shadow-md'
                          : 'bg-white border-slate-200 shadow-sm'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-4">
                        <span className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-base shadow-xs ${
                          isTop1 ? 'bg-amber-500 text-white' : 'bg-slate-200 text-slate-700'
                        }`}>
                          #{sider.rank}
                        </span>
                        <span className="text-xs font-mono font-bold text-slate-500">
                          Token: {sider.tokenNumber}
                        </span>
                      </div>

                      <div className="mb-4">
                        <h3 className="text-lg font-black text-slate-900 truncate">
                          {sider.name}
                        </h3>
                        <p className="text-xs text-slate-500 mt-0.5">Ringframe Sider Specialist</p>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 p-3 rounded-xl mb-4">
                        <div>
                          <span className="text-slate-400 block uppercase text-[10px]">Total Duties</span>
                          <span className="font-bold text-slate-900 text-sm">{sider.completedDuties} Shifts</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block uppercase text-[10px]">Avg GPS</span>
                          <span className="font-bold text-indigo-700 text-sm">{sider.avgGps}</span>
                        </div>
                      </div>

                      <div className="pt-3 border-t border-slate-200/80 flex items-center justify-between">
                        <div>
                          <span className="text-[10px] uppercase text-slate-400 font-bold block">Gross Incentive</span>
                          <span className="text-2xl font-black text-emerald-700">₹{sider.totalIncentive.toLocaleString()}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] uppercase text-slate-400 font-bold block">Per Shift</span>
                          <span className="text-sm font-bold text-slate-700">₹{sider.avgPayoutPerShift}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Signage Footer Bar */}
      <footer className="bg-white border-t border-slate-200 px-6 py-2.5 flex items-center justify-between text-xs text-slate-500">
        <div className="flex items-center gap-3">
          <span className="font-bold text-slate-700">SCM Textiles KTTM Unit 01</span>
          <span>•</span>
          <span>Shift I (06:00 - 14:00)</span>
          <span>•</span>
          <span>Auto-refreshing live shop telemetry</span>
        </div>
        <div className="flex items-center gap-2 font-mono text-[11px] text-slate-400">
          <span>Kiosk Token: shed2_live_display</span>
          <span>•</span>
          <span>Slide {currentSlideIndex + 1} of {SLIDES.length}</span>
        </div>
      </footer>
    </div>
  );
}
