import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import * as XLSX from 'xlsx';
import { 
  ShieldCheck, 
  Upload, 
  FileUp, 
  Database, 
  Settings, 
  Plus, 
  Trash2, 
  RefreshCw, 
  Download, 
  CheckCircle2, 
  AlertTriangle, 
  Calendar, 
  Check, 
  Sliders, 
  FileSpreadsheet, 
  Play,
  RotateCcw,
  Sparkles,
  Users,
  Cpu,
  Layers
} from 'lucide-react';
import api from '../api';

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState('ingestion'); // 'ingestion', 'masters', 'system'
  const [subMasterTab, setSubMasterTab] = useState('workers'); // 'workers', 'machines', 'counts', 'rules'

  // Ingestion State
  const [targetDate, setTargetDate] = useState('2026-10-10');
  const [targetShift, setTargetShift] = useState('I');
  const [prodFile, setProdFile] = useState(null);
  const [emFile, setEmFile] = useState(null);
  const [uploadResult, setUploadResult] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [prodFilePreview, setProdFilePreview] = useState(null);

  // Holiday State
  const [holidays, setHolidays] = useState([]);
  const [holidayDate, setHolidayDate] = useState('2026-10-25');
  const [holidayReason, setHolidayReason] = useState('Deepavali Mill Cleaning & Shutdown');

  // Master Data States
  const [workers, setWorkers] = useState([]);
  const [machines, setMachines] = useState([]);
  const [counts, setCounts] = useState([]);
  const [rules, setRules] = useState([]);

  // New Worker Form Modal
  const [showWorkerModal, setShowWorkerModal] = useState(false);
  const [workerForm, setWorkerForm] = useState({ tokenNumber: '', name: '', department: 'SIDER', skillGrade: 'A' });

  // Slab Simulator State
  const [simCount, setSimCount] = useState('26/1-CH-CY');
  const [simGps, setSimGps] = useState('108');
  const [simResult, setSimResult] = useState(null);

  // Notification
  const [notification, setNotification] = useState(null);

  useEffect(() => {
    fetchMasters();
    fetchHolidays();
  }, []);

  const notify = (msg, type = 'success') => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const fetchMasters = async () => {
    try {
      const [wRes, mRes, cRes, rRes] = await Promise.all([
        api.get('/admin/workers'),
        api.get('/admin/machines'),
        api.get('/admin/counts'),
        api.get('/admin/incentive-rules')
      ]);
      setWorkers(wRes.data);
      setMachines(mRes.data);
      setCounts(cRes.data);
      setRules(rRes.data);
    } catch (err) {
      console.error('[Fetch Masters Error]', err);
    }
  };

  const fetchHolidays = async () => {
    try {
      const res = await api.get('/admin/holidays');
      setHolidays(res.data);
    } catch (err) {
      console.error('[Holidays Error]', err);
    }
  };

  // Client-side parser for immediate visual validation of SCM Excel files
  const handleProdFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setProdFile(file);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target.result);
        const wb = XLSX.read(data, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const grid = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

        const shiftsFound = new Set();
        let fileDate = null;
        let shed2Count = 0;
        const sampleRows = [];

        grid.forEach((row) => {
          if (!row || row.length === 0) return;
          const first = row[0];
          const second = row[1];

          // Check shift row
          if ((typeof first === 'number' || (typeof first === 'string' && /\d{1,4}[-/.]\d{1,2}[-/.]\d{1,4}/.test(first))) &&
              (second === 'I' || second === 'II' || second === 'III' || second === 1 || second === 2 || second === 3)) {
            shiftsFound.add(String(second));
            if (!fileDate && typeof first === 'number') {
              const jsDate = new Date(Math.round((first - 25569) * 86400 * 1000));
              fileDate = jsDate.toISOString().split('T')[0];
            } else if (!fileDate && typeof first === 'string') {
              fileDate = first;
            }
          }

          // Check machine row
          const m = String(row[0]).trim().toUpperCase();
          if (m.startsWith('SP') || m.startsWith('K') || m.startsWith('RF')) {
            if (m >= 'SP025' && m <= 'SP056') shed2Count++;
            if (sampleRows.length < 5 && (m.startsWith('SP02') || m.startsWith('SP03') || m.startsWith('SP05'))) {
              sampleRows.push({
                frame: m,
                count: String(row[1]).trim(),
                runHrs: row[3],
                prodKg: row[8],
                gps: row[11],
                eff: row[12]
              });
            }
          }
        });

        if (fileDate) {
          setTargetDate(fileDate);
        }

        setProdFilePreview({
          filename: file.name,
          sizeKb: (file.size / 1024).toFixed(1),
          detectedDate: fileDate,
          detectedShifts: Array.from(shiftsFound),
          shed2Count,
          sampleRows,
          isScmFormat: shiftsFound.size > 0 || shed2Count > 0
        });
      } catch (err) {
        console.warn('[Preview Parse Warning]', err);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  // Upload Production Excel
  const handleUploadProd = async () => {
    if (!prodFile) return notify('Please select a Production Statement Excel file', 'error');
    try {
      setUploading(true);
      const fd = new FormData();
      fd.append('file', prodFile);
      fd.append('targetDate', targetDate);
      fd.append('targetShift', targetShift);

      const res = await api.post('/admin/ingest/production', fd, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setUploadResult({ type: 'Production Statement', data: res.data });
      notify(`Ingested ${res.data.processedCount} production rows!`, 'success');
      setProdFile(null);
      setProdFilePreview(null);
    } catch (err) {
      notify(err.response?.data?.message || err.message, 'error');
    } finally {
      setUploading(false);
    }
  };

  // Upload EM Excel
  const handleUploadEM = async () => {
    if (!emFile) return notify('Please select an End-Mending Excel file', 'error');
    try {
      setUploading(true);
      const fd = new FormData();
      fd.append('file', emFile);
      fd.append('targetDate', targetDate);
      fd.append('targetShift', targetShift);

      const res = await api.post('/admin/ingest/em', fd, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setUploadResult({ type: 'Machine EM Logs', data: res.data });
      notify(`Ingested ${res.data.processedCount} EM log rows!`, 'success');
      setEmFile(null);
    } catch (err) {
      notify(err.response?.data?.message || err.message, 'error');
    } finally {
      setUploading(false);
    }
  };

  // Add Mill Holiday
  const handleAddHoliday = async (e) => {
    e.preventDefault();
    try {
      await api.post('/admin/holidays', { date: holidayDate, reason: holidayReason, isHoliday: true });
      fetchHolidays();
      notify('Holiday scheduled in mill calendar', 'success');
    } catch (err) {
      notify(err.message, 'error');
    }
  };

  // Remove Holiday
  const handleDeleteHoliday = async (id) => {
    try {
      await api.delete(`/admin/holidays/${id}`);
      fetchHolidays();
      notify('Holiday removed', 'info');
    } catch (err) {
      notify(err.message, 'error');
    }
  };

  // Add Worker
  const handleAddWorker = async (e) => {
    e.preventDefault();
    try {
      await api.post('/admin/workers', workerForm);
      setShowWorkerModal(false);
      setWorkerForm({ tokenNumber: '', name: '', department: 'SIDER', skillGrade: 'A' });
      fetchMasters();
      notify('Worker registered successfully', 'success');
    } catch (err) {
      notify(err.message, 'error');
    }
  };

  // Toggle Worker Active
  const handleToggleWorker = async (id) => {
    try {
      await api.patch(`/admin/workers/${id}/toggle-active`);
      fetchMasters();
    } catch (err) {
      notify(err.message, 'error');
    }
  };

  // Reset to Standard 14 Machines
  const handleResetStandardMachines = async () => {
    if (!window.confirm('Reset machine master back to the standard 14 ringframes (SP025–SP056)?')) return;
    try {
      await api.post('/admin/machines/reset-standard');
      fetchMasters();
      notify('Machine master reset to standard 14 frames', 'success');
    } catch (err) {
      notify(err.message, 'error');
    }
  };

  // Simulate Slab
  const handleSimulateSlab = async () => {
    try {
      const res = await api.post('/admin/incentive-rules/simulate', {
        countCode: simCount,
        testGps: simGps
      });
      setSimResult(res.data);
    } catch (err) {
      notify(err.message, 'error');
    }
  };

  // Export JSON Backup
  const handleExportBackup = () => {
    window.location.href = '/api/admin/system/backup';
  };

  // Purge Month Data
  const handlePurgeMonth = async () => {
    const monthToPurge = prompt('Enter Year-Month to purge (e.g., 2026-09):', '2026-09');
    if (!monthToPurge) return;
    if (!window.confirm(`WARNING: Are you sure you want to permanently delete all logs for ${monthToPurge}?`)) return;

    try {
      const res = await api.post('/admin/system/purge-month', { month: monthToPurge });
      notify(res.data.message, 'info');
    } catch (err) {
      notify(err.response?.data?.message || err.message, 'error');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="space-y-6 pb-16"
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

      {/* Header Bar */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
              Admin & Gateway Control
            </span>
            <span className="text-xs text-slate-400">|</span>
            <span className="text-xs text-slate-500 font-medium">
              KTTM Unit 01 (Ringframe 2nd Shed)
            </span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Data Gateway & Master Configuration
          </h1>
        </div>

        {/* Top Tab Switcher */}
        <div className="flex bg-slate-100 p-1 rounded-lg text-xs font-semibold">
          <button
            onClick={() => setActiveTab('ingestion')}
            className={`px-3.5 py-1.5 rounded-md transition-all ${
              activeTab === 'ingestion'
                ? 'bg-white text-indigo-700 shadow-xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Data Ingestion Center
          </button>
          <button
            onClick={() => setActiveTab('masters')}
            className={`px-3.5 py-1.5 rounded-md transition-all ${
              activeTab === 'masters'
                ? 'bg-white text-indigo-700 shadow-xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Master Registries
          </button>
          <button
            onClick={() => setActiveTab('system')}
            className={`px-3.5 py-1.5 rounded-md transition-all ${
              activeTab === 'system'
                ? 'bg-white text-indigo-700 shadow-xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            System & Storage
          </button>
        </div>
      </div>

      {/* ======================================================== */}
      {/* TAB 1: DATA INGESTION CENTER */}
      {/* ======================================================== */}
      {activeTab === 'ingestion' && (
        <div className="space-y-6">
          {/* Target Sider Assigned Date & Shift Selector */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center gap-4 text-xs">
            <span className="font-bold text-slate-700 uppercase">Target Import Allocation:</span>
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg">
              <Calendar size={14} className="text-slate-400" />
              <input
                type="date"
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
                className="bg-transparent font-medium text-slate-800 outline-none cursor-pointer"
              />
            </div>

            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg font-semibold">
              {['I', 'II', 'III'].map((s) => (
                <button
                  key={s}
                  onClick={() => setTargetShift(s)}
                  className={`px-2.5 py-1 rounded ${
                    targetShift === s ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-500'
                  }`}
                >
                  Shift {s}
                </button>
              ))}
            </div>
            <span className="text-slate-400 text-[11px]">
              • Ingesting will automatically upsert telemetry and trigger recalculation.
            </span>
          </div>

          {/* Dropzones A & B */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Dropzone A: Production Statement (.xlsx) */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <FileSpreadsheet size={18} className="text-indigo-600" />
                    <h3 className="text-sm font-bold text-slate-900">Dropzone A: Production Statement (.xlsx)</h3>
                  </div>
                  <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-full">
                    SCM Format Ready
                  </span>
                </div>
                <p className="text-xs text-slate-500 mb-3">
                  Upload official SCM Framewise Production Statement. Auto-detects multi-shift sections (`I`, `II`, `III`), dates, frames (`SP025`–`SP056`), counts, run hours, net kg, and achieved GPS.
                </p>

                <div className="border-2 border-dashed border-slate-200 rounded-xl p-5 text-center hover:border-indigo-400 transition-colors bg-slate-50/50">
                  <Upload size={26} className="mx-auto text-slate-400 mb-2" />
                  <input
                    type="file"
                    accept=".xlsx, .xls, .csv"
                    onChange={handleProdFileChange}
                    className="block w-full text-xs text-slate-500 file:mr-4 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer"
                  />
                  {prodFilePreview && (
                    <div className="mt-3 text-left bg-white p-3 rounded-lg border border-slate-200 text-xs space-y-2">
                      <div className="flex items-center justify-between text-emerald-700 font-bold text-[11px]">
                        <span className="flex items-center gap-1">
                          <CheckCircle2 size={13} /> SCM Mill Sheet Validated
                        </span>
                        <span className="text-slate-500 font-mono font-normal">{prodFilePreview.sizeKb} KB</span>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600">
                        <div>
                          <span>Shifts Detected:</span> <strong className="text-indigo-700">{prodFilePreview.detectedShifts.join(', ') || targetShift}</strong>
                        </div>
                        <div>
                          <span>Shed 2 Frames:</span> <strong className="text-indigo-700">{prodFilePreview.shed2Count} Frames</strong>
                        </div>
                      </div>

                      {prodFilePreview.sampleRows && prodFilePreview.sampleRows.length > 0 && (
                        <div className="pt-2 border-t border-slate-100">
                          <span className="text-[10px] text-slate-400 font-bold uppercase block mb-1">
                            Live Extraction Preview:
                          </span>
                          <div className="overflow-x-auto">
                            <table className="w-full text-[10px] text-left">
                              <thead>
                                <tr className="text-slate-400 border-b border-slate-100">
                                  <th className="py-0.5">Frame</th>
                                  <th className="py-0.5">Count</th>
                                  <th className="py-0.5">Hrs</th>
                                  <th className="py-0.5">GPS</th>
                                  <th className="py-0.5">Kg</th>
                                </tr>
                              </thead>
                              <tbody>
                                {prodFilePreview.sampleRows.map((r, idx) => (
                                  <tr key={idx} className="border-b border-slate-50 font-mono">
                                    <td className="py-0.5 font-bold text-slate-800">{r.frame}</td>
                                    <td className="py-0.5 text-indigo-700">{r.count}</td>
                                    <td className="py-0.5">{r.runHrs}</td>
                                    <td className="py-0.5 font-bold text-slate-900">{r.gps}</td>
                                    <td className="py-0.5">{r.prodKg}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <button
                onClick={handleUploadProd}
                disabled={!prodFile || uploading}
                className="mt-4 w-full py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <FileUp size={15} />
                <span>Parse & Execute Relational Join</span>
              </button>
            </div>

            {/* Dropzone B: Machine EM Update (.xlsx) */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Sliders size={18} className="text-emerald-600" />
                  <h3 className="text-sm font-bold text-slate-900">Dropzone B: Machine EM Update (.xlsx)</h3>
                </div>
                <p className="text-xs text-slate-500 mb-4">
                  Ingests Breaks, Pneumafil Waste %, and End-Mending (EM) quality scores. Flags &gt;4.0 outliers.
                </p>

                <div className="border-2 border-dashed border-slate-200 rounded-xl p-6 text-center hover:border-emerald-400 transition-colors bg-slate-50/50">
                  <Upload size={28} className="mx-auto text-slate-400 mb-2" />
                  <input
                    type="file"
                    accept=".xlsx, .xls, .csv"
                    onChange={(e) => setEmFile(e.target.files[0])}
                    className="block w-full text-xs text-slate-500 file:mr-4 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100 cursor-pointer"
                  />
                  {emFile && (
                    <span className="text-xs font-semibold text-emerald-700 block mt-2">
                      Selected: {emFile.name} ({(emFile.size / 1024).toFixed(1)} KB)
                    </span>
                  )}
                </div>
              </div>

              <button
                onClick={handleUploadEM}
                disabled={!emFile || uploading}
                className="mt-4 w-full py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <FileUp size={15} />
                <span>Parse & Ingest Quality Metrics</span>
              </button>
            </div>
          </div>

          {/* Ingestion Audit Output Result */}
          {uploadResult && (
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-3">
                <span className="text-xs font-bold uppercase text-slate-700">
                  Parse Engine Audit Report ({uploadResult.type})
                </span>
                <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded">
                  Success
                </span>
              </div>
              <div className="grid grid-cols-3 gap-4 text-xs mb-3">
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                  <span className="text-slate-400 block uppercase text-[10px]">Processed Rows</span>
                  <span className="text-base font-bold text-emerald-700">{uploadResult.data.processedCount}</span>
                </div>
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                  <span className="text-slate-400 block uppercase text-[10px]">Skipped Rows</span>
                  <span className="text-base font-bold text-slate-600">{uploadResult.data.skippedCount}</span>
                </div>
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                  <span className="text-slate-400 block uppercase text-[10px]">Affected Shifts</span>
                  <span className="text-xs font-bold text-indigo-700">
                    {uploadResult.data.affectedShifts?.join(', ') || 'N/A'}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Operational Control: Mill Holiday / Shutdown Logger */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
            <div className="pb-3 border-b border-slate-200">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <Calendar size={16} className="text-indigo-600" />
                Operational Control: Mill Holiday / Shutdown Logger
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Log planned mill maintenance or festival holidays to pause calculation cycles without penalizing monthly averages.
              </p>
            </div>

            <form onSubmit={handleAddHoliday} className="flex flex-wrap items-center gap-3">
              <input
                type="date"
                value={holidayDate}
                onChange={(e) => setHolidayDate(e.target.value)}
                className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg outline-none font-medium"
                required
              />
              <input
                type="text"
                placeholder="Reason / Shutdown note..."
                value={holidayReason}
                onChange={(e) => setHolidayReason(e.target.value)}
                className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg outline-none flex-1 min-w-[200px]"
                required
              />
              <button
                type="submit"
                className="px-4 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors"
              >
                Record Mill Holiday
              </button>
            </form>

            <div className="divide-y divide-slate-100 pt-2 text-xs">
              {holidays?.map((h) => (
                <div key={h._id} className="py-2 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="font-mono font-bold text-slate-900">{h.date}</span>
                    <span className="text-slate-600">{h.reason}</span>
                  </div>
                  <button
                    onClick={() => handleDeleteHoliday(h._id)}
                    className="text-slate-400 hover:text-rose-600"
                    title="Remove Holiday"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 2: MASTER REGISTRIES (EDITABLE TABLES) */}
      {/* ======================================================== */}
      {activeTab === 'masters' && (
        <div className="space-y-6">
          {/* Sub-Master Switcher */}
          <div className="flex border-b border-slate-200 bg-white px-4 rounded-t-xl gap-3 text-xs font-semibold">
            <button
              onClick={() => setSubMasterTab('workers')}
              className={`py-3 px-3 border-b-2 transition-all ${
                subMasterTab === 'workers' ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-slate-500'
              }`}
            >
              Worker Master ({workers.length} Siders)
            </button>
            <button
              onClick={() => setSubMasterTab('machines')}
              className={`py-3 px-3 border-b-2 transition-all ${
                subMasterTab === 'machines' ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-slate-500'
              }`}
            >
              Machine Master ({machines.length} Frames)
            </button>
            <button
              onClick={() => setSubMasterTab('counts')}
              className={`py-3 px-3 border-b-2 transition-all ${
                subMasterTab === 'counts' ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-slate-500'
              }`}
            >
              Count Master ({counts.length} Counts)
            </button>
            <button
              onClick={() => setSubMasterTab('rules')}
              className={`py-3 px-3 border-b-2 transition-all ${
                subMasterTab === 'rules' ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-slate-500'
              }`}
            >
              Incentive Master & Slab Builder
            </button>
          </div>

          {/* Sub-Master: Workers */}
          {subMasterTab === 'workers' && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 uppercase">Worker Master Registry (71 Siders)</h3>
                  <p className="text-xs text-slate-500">Manage spinning operators, token numbers, and active rosters.</p>
                </div>
                <button
                  onClick={() => setShowWorkerModal(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors"
                >
                  <Plus size={14} />
                  <span>Register Sider</span>
                </button>
              </div>

              <div className="overflow-x-auto max-h-96">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-500 uppercase sticky top-0">
                    <tr>
                      <th className="py-2.5 px-4">Token No</th>
                      <th className="py-2.5 px-4">Worker Name</th>
                      <th className="py-2.5 px-4">Department</th>
                      <th className="py-2.5 px-4">Skill Grade</th>
                      <th className="py-2.5 px-4 text-center">Active Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {workers.map((w) => (
                      <tr key={w.tokenNumber} className="hover:bg-slate-50/60 font-medium">
                        <td className="py-2.5 px-4 font-mono font-bold text-slate-900">{w.tokenNumber}</td>
                        <td className="py-2.5 px-4 font-semibold text-slate-900">{w.name}</td>
                        <td className="py-2.5 px-4 text-slate-500">{w.department}</td>
                        <td className="py-2.5 px-4 font-bold text-indigo-700">{w.skillGrade || 'A'}</td>
                        <td className="py-2.5 px-4 text-center">
                          <button
                            onClick={() => handleToggleWorker(w._id)}
                            className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                              w.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'
                            }`}
                          >
                            {w.isActive ? 'Active' : 'Inactive'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Sub-Master: Machines */}
          {subMasterTab === 'machines' && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 uppercase">Machine Master (14 Ringframes)</h3>
                  <p className="text-xs text-slate-500">Fixed shed configuration (SP025–SP056).</p>
                </div>
                <button
                  onClick={handleResetStandardMachines}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200 rounded-lg hover:bg-rose-100 transition-colors"
                >
                  <RotateCcw size={14} />
                  <span>Reset to Standard 14</span>
                </button>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
                {machines.map((m) => (
                  <div key={m.machineNumber} className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                    <span className="font-black text-slate-900 text-sm block">{m.machineNumber}</span>
                    <span className="text-[10px] text-slate-500">Sides: LH, RH</span>
                    <div className="mt-2 text-emerald-700 font-bold text-[10px]">● Operational</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Sub-Master: Counts */}
          {subMasterTab === 'counts' && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 space-y-4">
              <div className="pb-3 border-b border-slate-200">
                <h3 className="text-sm font-bold text-slate-900 uppercase">Count Master & 40s Normalization Factors</h3>
                <p className="text-xs text-slate-500">Defines count conversion multipliers to 40s base GPS.</p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-500 uppercase">
                    <tr>
                      <th className="py-2.5 px-4">Count Code</th>
                      <th className="py-2.5 px-4">Count Name</th>
                      <th className="py-2.5 px-4">Standard GPS</th>
                      <th className="py-2.5 px-4">Factor to 40s</th>
                      <th className="py-2.5 px-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {counts.map((c) => (
                      <tr key={c.countCode} className="hover:bg-slate-50/60 font-medium">
                        <td className="py-3 px-4 font-mono font-bold text-slate-900">{c.countCode}</td>
                        <td className="py-3 px-4 text-slate-700">{c.countName}</td>
                        <td className="py-3 px-4 font-bold text-indigo-700">{c.standardGps}</td>
                        <td className="py-3 px-4 font-mono font-bold">{c.factorTo40s}</td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-50 text-emerald-700">
                            Active
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Sub-Master: Incentive Rules & Slab Simulator */}
          {subMasterTab === 'rules' && (
            <div className="space-y-6">
              {/* Rules List */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 space-y-4">
                <div className="pb-3 border-b border-slate-200">
                  <h3 className="text-sm font-bold text-slate-900 uppercase">Incentive Slabs by Count</h3>
                  <p className="text-xs text-slate-500">Base INR payout per full side (50% of machine) based on minimum achieved GPS.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {rules.map((r) => (
                    <div key={r._id} className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
                      <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                        <span className="font-mono font-bold text-indigo-700 text-sm">{r.countPattern}</span>
                        <span className="text-[11px] font-semibold text-slate-500">{r.slabs?.length} Slabs</span>
                      </div>
                      <div className="space-y-1 text-xs">
                        {r.slabs?.map((s, idx) => (
                          <div key={idx} className="flex justify-between text-slate-600">
                            <span>GPS &ge; {s.minGps}:</span>
                            <strong className="text-emerald-700 font-mono">₹{s.amountPerSide} / side</strong>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Live Test Matrix & Slab Simulator */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 space-y-4">
                <div className="pb-3 border-b border-slate-200">
                  <h3 className="text-sm font-bold text-slate-900 uppercase flex items-center gap-2">
                    <Sparkles size={16} className="text-indigo-600" />
                    Live Test Matrix: Slab Payout Simulator
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Test count pattern resolution and verify operator payouts against minimum slab brackets (₹75–₹115).
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-3 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-600">Yarn Count:</span>
                    <input
                      type="text"
                      value={simCount}
                      onChange={(e) => setSimCount(e.target.value)}
                      className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg outline-none font-mono"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-600">Achieved GPS:</span>
                    <input
                      type="number"
                      step="0.1"
                      value={simGps}
                      onChange={(e) => setSimGps(e.target.value)}
                      className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg outline-none font-mono w-24"
                    />
                  </div>
                  <button
                    onClick={handleSimulateSlab}
                    className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors"
                  >
                    <Play size={13} />
                    <span>Run Simulation</span>
                  </button>
                </div>

                {simResult && (
                  <div className={`p-4 rounded-xl border text-xs ${
                    simResult.matched ? 'bg-emerald-50/50 border-emerald-200' : 'bg-rose-50 border-rose-200 text-rose-800'
                  }`}>
                    {simResult.matched ? (
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                          <span className="text-slate-400 block uppercase text-[10px]">Matched Pattern</span>
                          <span className="font-mono font-bold text-indigo-700 text-sm">{simResult.rulePattern}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block uppercase text-[10px]">Single Side Incentive</span>
                          <span className="font-bold text-emerald-700 text-base">₹{simResult.payoutPerSide}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block uppercase text-[10px]">Full Machine (2 Sides)</span>
                          <span className="font-bold text-emerald-800 text-base">₹{simResult.fullMachinePayout}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block uppercase text-[10px]">Threshold Status</span>
                          <span className="font-semibold text-slate-700">
                            {simResult.isBelowMin ? '⚠️ Below Min GPS Slab' : '✓ Slab Active'}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <span className="font-bold">{simResult.message}</span>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 3: SYSTEM ADMINISTRATION & STORAGE */}
      {/* ======================================================== */}
      {activeTab === 'system' && (
        <div className="space-y-6">
          {/* Backup & Restore Controls */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
            <div className="pb-3 border-b border-slate-200">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <Database size={16} className="text-indigo-600" />
                Database Backup & Disaster Recovery
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Export complete JSON snapshot of all 14 frames, 71 workers, telemetry logs, and allocation rosters.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-4">
              <button
                onClick={handleExportBackup}
                className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs transition-colors"
              >
                <Download size={14} />
                <span>Export Complete JSON Backup</span>
              </button>
            </div>
          </div>

          {/* Danger Zone: Monthly Data Cleanup */}
          <div className="bg-white p-5 rounded-xl border border-rose-200 shadow-xs space-y-4">
            <div className="pb-3 border-b border-rose-100">
              <h3 className="text-sm font-bold text-rose-800 uppercase tracking-wider flex items-center gap-2">
                <AlertTriangle size={16} className="text-rose-600" />
                Database Danger Zone: Maintenance & Purge Controls
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Purge specific historical month telemetry and rosters while preserving master configurations.
              </p>
            </div>

            <div>
              <button
                onClick={handlePurgeMonth}
                className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-300 rounded-lg transition-colors"
              >
                <Trash2 size={14} />
                <span>Purge Month Data & Allocations</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Register Sider */}
      {showWorkerModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-md w-full p-6 space-y-4">
            <h3 className="text-base font-bold text-slate-900">Register Sider Operator</h3>
            <form onSubmit={handleAddWorker} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-600 mb-1">Token Number:</label>
                <input
                  type="text"
                  placeholder="e.g., 90123"
                  value={workerForm.tokenNumber}
                  onChange={(e) => setWorkerForm({ ...workerForm, tokenNumber: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg bg-slate-50 font-mono outline-none"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-600 mb-1">Full Name:</label>
                <input
                  type="text"
                  placeholder="e.g., Sundararajan K"
                  value={workerForm.name}
                  onChange={(e) => setWorkerForm({ ...workerForm, name: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg bg-slate-50 outline-none"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-600 mb-1">Skill Grade:</label>
                <select
                  value={workerForm.skillGrade}
                  onChange={(e) => setWorkerForm({ ...workerForm, skillGrade: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg bg-slate-50 outline-none"
                >
                  <option value="A">Grade A (Standard)</option>
                  <option value="Specialist">Specialist</option>
                  <option value="B">Grade B</option>
                </select>
              </div>

              <div className="pt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowWorkerModal(false)}
                  className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded-lg font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-white bg-indigo-600 hover:bg-indigo-700 font-bold rounded-lg"
                >
                  Save Sider
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </motion.div>
  );
}
