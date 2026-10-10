import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Lock, 
  User, 
  KeyRound, 
  ArrowLeft, 
  ShieldCheck, 
  Tv, 
  Sparkles, 
  Eye, 
  EyeOff, 
  CheckCircle2, 
  AlertCircle,
  Clock,
  Layers
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function LoginPage({ onBackToDashboard, onLoginSuccess }) {
  const { login, switchRole } = useAuth();
  const [tab, setTab] = useState('pin'); // 'pin' or 'credentials'

  // Credentials state
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // PIN state
  const [pin, setPin] = useState('');
  const [selectedRole, setSelectedRole] = useState('admin');
  const [selectedShift, setSelectedShift] = useState('I');

  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleCredentialsSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login({ username, password });
      if (onLoginSuccess) onLoginSuccess();
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid username or password');
    } finally {
      setLoading(false);
    }
  };

  const handlePinSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login({ pin, role: selectedRole, shift: selectedShift });
      if (onLoginSuccess) onLoginSuccess();
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid PIN code');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = async (role, shift = 'I', presetPin = '9999') => {
    setError(null);
    setLoading(true);
    try {
      if (role === 'tv_display') {
        await switchRole('tv_display');
      } else {
        await login({ pin: presetPin, role, shift });
      }
      if (onLoginSuccess) onLoginSuccess();
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col justify-center items-center p-4 selection:bg-indigo-500 selection:text-white">
      {/* Top Return Button */}
      <div className="w-full max-w-md mb-4 flex justify-between items-center">
        <button
          onClick={onBackToDashboard}
          className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft size={15} />
          <span>Back to Live Dashboard</span>
        </button>

        <span className="text-[11px] font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
          KTTM 01 [2nd Shed]
        </span>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="bg-white rounded-2xl border border-slate-200 shadow-md p-6 sm:p-8 w-full max-w-md space-y-6"
      >
        {/* Brand Banner */}
        <div className="text-center space-y-1">
          <div className="w-12 h-12 bg-indigo-600 rounded-xl text-white font-black text-xl flex items-center justify-center mx-auto shadow-xs">
            SCM
          </div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight pt-2">
            SCM Textile Spinners
          </h1>
          <p className="text-xs text-slate-500">
            Industrial Execution & Sider Incentive Management Portal
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="grid grid-cols-2 bg-slate-100 p-1 rounded-xl text-xs font-semibold text-center">
          <button
            onClick={() => { setTab('pin'); setError(null); }}
            className={`py-2 rounded-lg transition-all ${
              tab === 'pin'
                ? 'bg-white text-indigo-700 shadow-xs'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            Quick PIN Access
          </button>
          <button
            onClick={() => { setTab('credentials'); setError(null); }}
            className={`py-2 rounded-lg transition-all ${
              tab === 'credentials'
                ? 'bg-white text-indigo-700 shadow-xs'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            Password Login
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg text-xs font-semibold flex items-center gap-2">
            <AlertCircle size={16} className="flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* TAB 1: QUICK PIN ACCESS */}
        {tab === 'pin' && (
          <div className="space-y-4">
            {/* Quick 1-Click Role Presets */}
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                One-Click Role Authentication:
              </label>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => handleQuickLogin('admin', 'ALL', '9999')}
                  className="p-3 rounded-xl border border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/40 text-left transition-all group"
                >
                  <div className="flex items-center justify-between font-bold text-slate-900 group-hover:text-indigo-700">
                    <span>Mill Admin</span>
                    <ShieldCheck size={14} className="text-indigo-600" />
                  </div>
                  <span className="text-[10px] text-slate-400 block mt-0.5">PIN: 9999</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleQuickLogin('supervisor', 'I', '1001')}
                  className="p-3 rounded-xl border border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/40 text-left transition-all group"
                >
                  <div className="flex items-center justify-between font-bold text-slate-900 group-hover:text-indigo-700">
                    <span>Supervisor Shift I</span>
                    <Clock size={14} className="text-amber-600" />
                  </div>
                  <span className="text-[10px] text-slate-400 block mt-0.5">Morning (PIN: 1001)</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleQuickLogin('supervisor', 'II', '1002')}
                  className="p-3 rounded-xl border border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/40 text-left transition-all group"
                >
                  <div className="flex items-center justify-between font-bold text-slate-900 group-hover:text-indigo-700">
                    <span>Supervisor Shift II</span>
                    <Clock size={14} className="text-sky-600" />
                  </div>
                  <span className="text-[10px] text-slate-400 block mt-0.5">Afternoon (PIN: 1002)</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleQuickLogin('supervisor', 'III', '1003')}
                  className="p-3 rounded-xl border border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/40 text-left transition-all group"
                >
                  <div className="flex items-center justify-between font-bold text-slate-900 group-hover:text-indigo-700">
                    <span>Supervisor Shift III</span>
                    <Clock size={14} className="text-purple-600" />
                  </div>
                  <span className="text-[10px] text-slate-400 block mt-0.5">Night (PIN: 1003)</span>
                </button>
              </div>
            </div>

            <div className="relative py-2">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200"></div>
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-white px-2 text-slate-400">or enter PIN manually</span>
              </div>
            </div>

            <form onSubmit={handlePinSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Enter 4-Digit Security PIN:
                </label>
                <div className="relative">
                  <KeyRound size={16} className="absolute left-3 top-3 text-slate-400" />
                  <input
                    type="password"
                    maxLength={4}
                    placeholder="••••"
                    value={pin}
                    onChange={(e) => setPin(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-center text-lg font-mono font-bold tracking-widest outline-none focus:border-indigo-500 focus:bg-white transition-all"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || pin.length < 4}
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <span>Authorize & Enter</span>
              </button>
            </form>
          </div>
        )}

        {/* TAB 2: USERNAME / PASSWORD CREDENTIALS */}
        {tab === 'credentials' && (
          <form onSubmit={handleCredentialsSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Username:</label>
              <div className="relative">
                <User size={16} className="absolute left-3 top-3 text-slate-400" />
                <input
                  type="text"
                  placeholder="e.g. admin or sup_shift1"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-indigo-500 focus:bg-white transition-all font-medium"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Password:</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-3 text-slate-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-9 pr-10 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-indigo-500 focus:bg-white transition-all font-medium"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <span>Sign In</span>
            </button>
          </form>
        )}

        {/* Bottom Kiosk TV Bypass link */}
        <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
          <span>Shop Floor Display Kiosk?</span>
          <button
            onClick={() => handleQuickLogin('tv_display')}
            className="font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
          >
            <Tv size={13} />
            <span>Launch TV Mode Directly</span>
          </button>
        </div>
      </motion.div>
    </div>
  );
}
