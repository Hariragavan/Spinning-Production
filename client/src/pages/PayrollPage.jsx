import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Banknote, 
  Printer, 
  Download, 
  Calendar, 
  Search, 
  FileSpreadsheet, 
  AlertTriangle, 
  CheckCircle2, 
  UserCheck, 
  ChevronRight,
  ShieldAlert,
  Flame,
  ArrowRight
} from 'lucide-react';
import api from '../api';

export default function PayrollPage() {
  const [activeSubTab, setActiveSubTab] = useState('abstract'); // 'abstract', 'matrix', 'emAudit', 'passbook'
  const [month, setMonth] = useState('2026-10');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Worker Passbook State
  const [selectedToken, setSelectedToken] = useState('8937');
  const [passbookData, setPassbookData] = useState(null);
  const [loadingPassbook, setLoadingPassbook] = useState(false);
  const [workerSearch, setWorkerSearch] = useState('');
  const [emOutlierOnly, setEmOutlierOnly] = useState(false);

  useEffect(() => {
    fetchMonthlyPayroll();
  }, [month]);

  useEffect(() => {
    if (activeSubTab === 'passbook' && selectedToken) {
      fetchPassbook(selectedToken);
    }
  }, [selectedToken, activeSubTab, month]);

  const fetchMonthlyPayroll = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/payroll/monthly?month=${month}`);
      setData(res.data);
    } catch (err) {
      console.error('[Payroll Error]', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchPassbook = async (token) => {
    try {
      setLoadingPassbook(true);
      const res = await api.get(`/payroll/passbook/${token}?month=${month}`);
      setPassbookData(res.data);
    } catch (err) {
      console.error('[Passbook Error]', err);
    } finally {
      setLoadingPassbook(false);
    }
  };

  const handleExportExcel = () => {
    window.location.href = `/api/payroll/export-excel?month=${month}`;
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-sm font-medium text-slate-500">Compiling Monthly Sider Payroll Abstract...</span>
        </div>
      </div>
    );
  }

  const { monthlyAbstract, matrix31Days, emQualityAudit, machineEmAudit, summary } = data || {};

  // Filtered workers for passbook dropdown or matrix search
  const filteredWorkers = monthlyAbstract?.filter(w => {
    if (!workerSearch) return true;
    const q = workerSearch.toLowerCase();
    return w.tokenNumber.includes(q) || w.name.toLowerCase().includes(q);
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="space-y-6 pb-16"
    >
      {/* Top Header & Sub-Tabs Navigation */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4 no-print">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
              Accounts & Disbursement
            </span>
            <span className="text-xs text-slate-400">|</span>
            <span className="text-xs text-slate-500 font-medium">
              Month: {month} (71 Siders Roster)
            </span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Payroll Incentive Abstract & Quality Audits
          </h1>
        </div>

        {/* Global Controls */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs">
            <Calendar size={14} className="text-slate-400" />
            <input
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="bg-transparent font-medium text-slate-800 outline-none cursor-pointer"
            />
          </div>

          <button
            onClick={handleExportExcel}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg transition-colors shadow-xs"
            title="Download Excel Workbook"
          >
            <Download size={14} />
            <span>Export to Excel</span>
          </button>

          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg transition-colors shadow-xs"
            title="Print Official Sheet"
          >
            <Printer size={14} />
            <span>Print Sheet</span>
          </button>
        </div>
      </div>

      {/* Sub-Tab Navigation Bar */}
      <div className="flex border-b border-slate-200 bg-white px-4 rounded-t-xl gap-2 no-print overflow-x-auto text-xs font-semibold">
        <button
          onClick={() => setActiveSubTab('abstract')}
          className={`py-3 px-4 border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
            activeSubTab === 'abstract'
              ? 'border-indigo-600 text-indigo-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Banknote size={15} />
          <span>Monthly Abstract (Accounts View)</span>
        </button>

        <button
          onClick={() => setActiveSubTab('matrix')}
          className={`py-3 px-4 border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
            activeSubTab === 'matrix'
              ? 'border-indigo-600 text-indigo-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <FileSpreadsheet size={15} />
          <span>Master 31-Day Incentive Grid</span>
        </button>

        <button
          onClick={() => setActiveSubTab('emAudit')}
          className={`py-3 px-4 border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
            activeSubTab === 'emAudit'
              ? 'border-indigo-600 text-indigo-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <ShieldAlert size={15} />
          <span>EM Quality & Breakage Audit</span>
        </button>

        <button
          onClick={() => setActiveSubTab('passbook')}
          className={`py-3 px-4 border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
            activeSubTab === 'passbook'
              ? 'border-indigo-600 text-indigo-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <UserCheck size={15} />
          <span>Individual Worker Passbook</span>
        </button>
      </div>

      {/* ======================================================== */}
      {/* SUB-TAB 1: MONTHLY ABSTRACT (ACCOUNTS SIGN-OFF SHEET) */}
      {/* ======================================================== */}
      {activeSubTab === 'abstract' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-6 space-y-6 print-page">
          {/* Printable Header */}
          <div className="text-center border-b border-slate-200 pb-4">
            <h2 className="text-lg font-black text-slate-900 tracking-wide uppercase">
              SCM Textile Spinners / KTTM Unit 01
            </h2>
            <p className="text-xs font-semibold text-slate-600">
              Ringframe 2nd Shed • Monthly Sider Incentive Abstract & Disbursement Statement
            </p>
            <div className="flex items-center justify-center gap-4 text-xs text-slate-500 mt-2 font-mono">
              <span>Billing Month: <strong>{month}</strong></span>
              <span>•</span>
              <span>Total Siders: <strong>{monthlyAbstract?.length || 0}</strong></span>
              <span>•</span>
              <span>Gross Payout: <strong>₹{summary?.totalDisbursement?.toLocaleString()}</strong></span>
            </div>
          </div>

          {/* Abstract Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 font-bold text-slate-700 uppercase">
                <tr>
                  <th className="py-2.5 px-3 w-12 text-center">S.No</th>
                  <th className="py-2.5 px-4">Token No</th>
                  <th className="py-2.5 px-4">Worker Name</th>
                  <th className="py-2.5 px-4">Department</th>
                  <th className="py-2.5 px-4 text-center">Shifts Worked</th>
                  <th className="py-2.5 px-4 text-right">Gross Incentive (₹)</th>
                  <th className="py-2.5 px-6 text-center w-36">Worker Signature</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {monthlyAbstract?.map((item) => (
                  <tr key={item.tokenNumber} className="hover:bg-slate-50/60">
                    <td className="py-2 px-3 text-center text-slate-400 font-mono">{item.sno}</td>
                    <td className="py-2 px-4 font-mono font-bold text-slate-900">{item.tokenNumber}</td>
                    <td className="py-2 px-4 font-semibold text-slate-900">{item.name}</td>
                    <td className="py-2 px-4 text-slate-500">{item.department}</td>
                    <td className="py-2 px-4 text-center font-bold">{item.totalDuties}</td>
                    <td className="py-2 px-4 text-right font-black text-emerald-700 text-sm">
                      ₹{item.grossIncentive.toLocaleString()}
                    </td>
                    <td className="py-2 px-6 border-b border-dotted border-slate-300"></td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-slate-50 font-bold border-t-2 border-slate-300 text-slate-900">
                <tr>
                  <td colSpan={4} className="py-3 px-4 text-right">Total Monthly Disbursement:</td>
                  <td className="py-3 px-4 text-center">{summary?.totalDuties} Duties</td>
                  <td className="py-3 px-4 text-right text-base text-emerald-800">
                    ₹{summary?.totalDisbursement?.toLocaleString()}
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Sign-off Blocks for Print */}
          <div className="pt-8 grid grid-cols-3 gap-6 text-center text-xs text-slate-600">
            <div>
              <div className="border-b border-slate-400 w-48 mx-auto mb-2"></div>
              <span>Shift Supervisor Verified</span>
            </div>
            <div>
              <div className="border-b border-slate-400 w-48 mx-auto mb-2"></div>
              <span>Production Incharge</span>
            </div>
            <div>
              <div className="border-b border-slate-400 w-48 mx-auto mb-2"></div>
              <span>Accounts Officer Approval</span>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* SUB-TAB 2: MASTER 31-DAY INCENTIVE GRID */}
      {/* ======================================================== */}
      {activeSubTab === 'matrix' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-200">
            <div>
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <FileSpreadsheet size={16} className="text-indigo-600" />
                Master 31-Day Incentive Grid (All 71 Workers)
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Daily earnings matrix showing Day 1 through Day 31 payouts, average EM score, and monthly sum.
              </p>
            </div>
            <div className="relative">
              <Search size={14} className="absolute left-2.5 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Filter worker..."
                value={workerSearch}
                onChange={(e) => setWorkerSearch(e.target.value)}
                className="pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg outline-none w-48"
              />
            </div>
          </div>

          <div className="overflow-x-auto max-h-[600px] border border-slate-200 rounded-lg">
            <table className="w-full text-left text-[11px] border-collapse">
              <thead className="bg-slate-50 sticky top-0 z-10 border-b border-slate-200 text-slate-600 font-bold uppercase">
                <tr>
                  <th className="py-2.5 px-3 sticky left-0 bg-slate-50 z-20 shadow-xs">Token</th>
                  <th className="py-2.5 px-3 sticky left-16 bg-slate-50 z-20 min-w-[130px] shadow-xs">Name</th>
                  <th className="py-2.5 px-2 text-center">Duties</th>
                  {Array.from({ length: 31 }, (_, i) => (
                    <th key={i + 1} className="py-2.5 px-1.5 text-center w-8">
                      {i + 1}
                    </th>
                  ))}
                  <th className="py-2.5 px-2 text-center min-w-[60px]">Avg EM</th>
                  <th className="py-2.5 px-3 text-right min-w-[80px] bg-indigo-50/50">Total ₹</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {matrix31Days
                  ?.filter(w => !workerSearch || w.tokenNumber.includes(workerSearch) || w.name.toLowerCase().includes(workerSearch.toLowerCase()))
                  ?.map((w) => {
                    return (
                      <tr key={w.tokenNumber} className="hover:bg-slate-50 font-medium">
                        <td className="py-1.5 px-3 font-mono font-bold text-slate-900 sticky left-0 bg-white shadow-xs">
                          {w.tokenNumber}
                        </td>
                        <td className="py-1.5 px-3 font-semibold text-slate-900 sticky left-16 bg-white shadow-xs truncate max-w-[130px]" title={w.name}>
                          {w.name}
                        </td>
                        <td className="py-1.5 px-2 text-center text-slate-500">{w.totalDuties}</td>
                        {Array.from({ length: 31 }, (_, i) => {
                          const amt = w.days[i + 1] || 0;
                          return (
                            <td 
                              key={i + 1} 
                              className={`py-1.5 px-1 text-center font-mono ${
                                amt > 0 ? 'text-slate-900 font-semibold' : 'text-slate-300'
                              }`}
                            >
                              {amt > 0 ? amt : '-'}
                            </td>
                          );
                        })}
                        <td className={`py-1.5 px-2 text-center font-bold ${
                          w.avgEm > 4.0 ? 'text-rose-600' : 'text-slate-600'
                        }`}>
                          {w.avgEm || '-'}
                        </td>
                        <td className="py-1.5 px-3 text-right font-black text-emerald-700 bg-indigo-50/30">
                          ₹{w.totalIncentive}
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* SUB-TAB 3: EM QUALITY & BREAKAGE AUDIT */}
      {/* ======================================================== */}
      {activeSubTab === 'emAudit' && (
        <div className="space-y-6">
          {/* Sider EM Audit */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-200">
              <div>
                <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <ShieldAlert size={16} className="text-rose-600" />
                  Sider End-Mending (EM) Score Audit
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Ranked by average breakage / waste score. Identifies spinning operators needing retraining.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setEmOutlierOnly(!emOutlierOnly)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all ${
                    emOutlierOnly
                      ? 'bg-rose-50 text-rose-800 border-rose-300'
                      : 'bg-slate-50 text-slate-600 border-slate-200'
                  }`}
                >
                  {emOutlierOnly ? 'Showing Outliers (>4.0) Only' : 'Filter EM > 4.0 Outliers'}
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-500 uppercase">
                  <tr>
                    <th className="py-2.5 px-4">Token</th>
                    <th className="py-2.5 px-4">Worker Name</th>
                    <th className="py-2.5 px-4 text-center">Total Duties</th>
                    <th className="py-2.5 px-4 text-center">Average EM Score</th>
                    <th className="py-2.5 px-4 text-center">Highest EM Peak</th>
                    <th className="py-2.5 px-4">Audit Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {emQualityAudit
                    ?.filter(w => !emOutlierOnly || w.isOutlier)
                    ?.map((w) => (
                      <tr key={w.tokenNumber} className={`hover:bg-slate-50/60 font-medium ${
                        w.isOutlier ? 'bg-rose-50/30' : ''
                      }`}>
                        <td className="py-3 px-4 font-mono font-bold text-slate-900">{w.tokenNumber}</td>
                        <td className="py-3 px-4 font-semibold text-slate-900">{w.name}</td>
                        <td className="py-3 px-4 text-center">{w.totalDuties} Shifts</td>
                        <td className="py-3 px-4 text-center font-black text-sm">
                          <span className={w.isOutlier ? 'text-rose-600' : 'text-slate-800'}>
                            {w.avgEm}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center text-slate-500">{w.highestEm}</td>
                        <td className="py-3 px-4">
                          {w.isOutlier ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-50 text-rose-800 border border-rose-200">
                              <AlertTriangle size={12} className="text-rose-600" />
                              Quality Alert (&gt;4.0)
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold text-xs">
                              <CheckCircle2 size={13} /> Within Limits
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Machine Level Breakdown */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 space-y-4">
            <div className="pb-3 border-b border-slate-200">
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <Flame size={16} className="text-indigo-600" />
                Machine-Level EM Breakdown (Operator vs Mechanical Diagnosis)
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Differentiates spinning operator technique from mechanical ringframe vibration and traveler wear.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              {machineEmAudit?.map((m) => (
                <div
                  key={m.machineNumber}
                  className={`p-3 rounded-xl border text-xs ${
                    m.isOutlier
                      ? 'bg-rose-50/40 border-rose-300 ring-1 ring-rose-200'
                      : 'bg-white border-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-black text-slate-900 text-sm">{m.machineNumber}</span>
                    <span className={`font-bold px-1.5 py-0.5 rounded text-[11px] ${
                      m.isOutlier ? 'bg-rose-100 text-rose-800' : 'bg-slate-100 text-slate-700'
                    }`}>
                      Avg EM: {m.avgEm}
                    </span>
                  </div>
                  <div className="space-y-1 text-slate-500">
                    <div className="flex justify-between">
                      <span>Avg Break Count:</span>
                      <strong className="text-slate-800">{m.avgBreaks}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span>Pneumafil Waste:</span>
                      <strong className="text-slate-800">{m.avgWaste}%</strong>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* SUB-TAB 4: INDIVIDUAL WORKER PASSBOOK (DISPUTE RESOLVER) */}
      {/* ======================================================== */}
      {activeSubTab === 'passbook' && (
        <div className="space-y-6">
          {/* Worker Selector Bar */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 no-print">
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-slate-600 uppercase">Select Sider:</span>
              <select
                value={selectedToken}
                onChange={(e) => setSelectedToken(e.target.value)}
                className="text-xs font-bold py-1.5 px-3 bg-slate-50 border border-slate-200 rounded-lg outline-none cursor-pointer text-slate-800 min-w-[220px]"
              >
                {monthlyAbstract?.map(w => (
                  <option key={w.tokenNumber} value={w.tokenNumber}>
                    {w.tokenNumber} - {w.name} (₹{w.grossIncentive})
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg transition-colors"
            >
              <Printer size={14} />
              <span>Print Individual Payslip</span>
            </button>
          </div>

          {loadingPassbook || !passbookData ? (
            <div className="flex items-center justify-center min-h-[30vh]">
              <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : (
            <div className="space-y-6 print-page">
              {/* Individual Payslip Summary Card */}
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-black text-xl shadow-xs">
                      {passbookData.worker.name[0]}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                          Token: {passbookData.worker.tokenNumber}
                        </span>
                        <span className="text-xs text-slate-500 font-medium">Department: SIDER</span>
                      </div>
                      <h2 className="text-xl font-black text-slate-900 mt-1">
                        {passbookData.worker.name}
                      </h2>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-xs uppercase tracking-wider text-slate-400 font-bold block">Net Incentive Earned</span>
                    <span className="text-3xl font-black text-emerald-700">
                      ₹{passbookData.summary.netEarnings.toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* 4 Summary Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 text-xs">
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                    <span className="text-slate-400 block uppercase text-[10px]">Total Duties</span>
                    <span className="text-base font-bold text-slate-900">{passbookData.summary.totalDuties} Shifts</span>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                    <span className="text-slate-400 block uppercase text-[10px]">Average Achieved GPS</span>
                    <span className="text-base font-bold text-indigo-700">{passbookData.summary.avgGps}</span>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                    <span className="text-slate-400 block uppercase text-[10px]">Average EM Score</span>
                    <span className={`text-base font-bold ${passbookData.summary.hasOutlierEm ? 'text-rose-600' : 'text-slate-900'}`}>
                      {passbookData.summary.avgEm}
                    </span>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                    <span className="text-slate-400 block uppercase text-[10px]">Average / Shift</span>
                    <span className="text-base font-bold text-emerald-700">
                      ₹{passbookData.summary.totalDuties > 0 ? Math.round(passbookData.summary.netEarnings / passbookData.summary.totalDuties) : 0}
                    </span>
                  </div>
                </div>
              </div>

              {/* Chronological Shift Duty History Table */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
                <div className="p-4 border-b border-slate-200 flex items-center justify-between">
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Chronological Duty Records & Side Breakdown ({month})
                  </h3>
                  <span className="text-xs text-slate-500 font-medium">
                    {passbookData.shiftEntries.length} Duty Entries Found
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-500 uppercase">
                      <tr>
                        <th className="py-2.5 px-4">Date</th>
                        <th className="py-2.5 px-3">Shift</th>
                        <th className="py-2.5 px-3">Workload</th>
                        <th className="py-2.5 px-4">Machines & Sides (LH/RH)</th>
                        <th className="py-2.5 px-4">Count</th>
                        <th className="py-2.5 px-4 text-center">Achieved GPS</th>
                        <th className="py-2.5 px-4 text-center">EM Score</th>
                        <th className="py-2.5 px-4 text-right">Earned Incentive</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {passbookData.shiftEntries.map((entry, idx) => {
                        const sidesSummary = entry.sidesDetail?.map(s => `${s.machineNumber} [${s.side}]`).join(', ');
                        const countCodes = [...new Set(entry.sidesDetail?.map(s => s.countCode))].join(', ');
                        const avgGps = entry.sidesDetail?.length > 0 
                          ? (entry.sidesDetail.reduce((a, b) => a + (b.actualGps || 0), 0) / entry.sidesDetail.length).toFixed(1)
                          : '-';
                        const avgEm = entry.sidesDetail?.length > 0
                          ? (entry.sidesDetail.reduce((a, b) => a + (b.emValue || 0), 0) / entry.sidesDetail.length).toFixed(2)
                          : '-';

                        return (
                          <tr key={idx} className="hover:bg-slate-50/60 font-medium">
                            <td className="py-3 px-4 font-mono font-bold text-slate-900">{entry.date}</td>
                            <td className="py-3 px-3">
                              <span className="px-2 py-0.5 rounded bg-slate-100 font-bold text-slate-700">
                                Shift {entry.shift}
                              </span>
                            </td>
                            <td className="py-3 px-3 font-semibold text-indigo-700">
                              {entry.workloadPct}%
                            </td>
                            <td className="py-3 px-4 font-mono text-[11px] text-slate-800">
                              {sidesSummary}
                            </td>
                            <td className="py-3 px-4 font-mono font-semibold text-slate-700">
                              {countCodes}
                            </td>
                            <td className="py-3 px-4 text-center font-bold">{avgGps}</td>
                            <td className="py-3 px-4 text-center">{avgEm}</td>
                            <td className="py-3 px-4 text-right font-black text-emerald-700 text-sm">
                              ₹{entry.shiftIncentive}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
}
