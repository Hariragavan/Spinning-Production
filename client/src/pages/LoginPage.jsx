import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Lock, 
  User, 
  ArrowLeft, 
  ShieldCheck, 
  Clock, 
  Eye, 
  EyeOff, 
  AlertCircle,
  LogIn,
  Zap
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function LoginPage({ onBackToDashboard, onLoginSuccess }) {
  const { login } = useAuth();

  // Credentials state
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleCredentialsSubmit = async (e) => {
    if (e) e.preventDefault();
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

  const handleQuickLogin = async (quickUser, quickPass) => {
    setUsername(quickUser);
    setPassword(quickPass);
    setError(null);
    setLoading(true);
    try {
      await login({ username: quickUser, password: quickPass });
      if (onLoginSuccess) onLoginSuccess();
    } catch (err) {
      setError(err.response?.data?.message || 'Quick login failed');
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
          <span>Back to TV Dashboard</span>
        </button>

        <span className="text-[11px] font-semibold text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-200">
          KTTM Unit 01 · 2nd Shed
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
            Staff Authentication & Execution Portal
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg text-xs font-semibold flex items-center gap-2">
            <AlertCircle size={16} className="flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* USERNAME / PASSWORD FORM */}
        <form onSubmit={handleCredentialsSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Username
            </label>
            <div className="relative">
              <User size={16} className="absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                placeholder="e.g. admin or sup_shift1"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-indigo-500 focus:bg-white transition-all font-medium"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Password
            </label>
            <div className="relative">
              <Lock size={16} className="absolute left-3 top-3 text-slate-400" />
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-9 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-indigo-500 focus:bg-white transition-all font-medium"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || !username || !password}
            className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <>
                <LogIn size={15} />
                <span>Sign In</span>
              </>
            )}
          </button>
        </form>

        {/* QUICK LOGIN BUTTONS UNDER LOGIN FORM */}
        <div className="pt-4 border-t border-slate-100 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
              <Zap size={12} className="text-amber-500" />
              Quick Login Presets:
            </span>
            <span className="text-[10px] text-slate-400 font-medium">1-Click Sign In</span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <button
              type="button"
              disabled={loading}
              onClick={() => handleQuickLogin('admin', 'adminpassword')}
              className="p-2.5 rounded-xl border border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/50 text-left transition-all group"
            >
              <div className="flex items-center justify-between font-bold text-slate-900 group-hover:text-indigo-700 text-xs">
                <span>Mill Admin</span>
                <ShieldCheck size={14} className="text-indigo-600" />
              </div>
              <span className="text-[10px] text-slate-400 block mt-0.5">admin</span>
            </button>

            <button
              type="button"
              disabled={loading}
              onClick={() => handleQuickLogin('sup_shift1', 'supervisorpass')}
              className="p-2.5 rounded-xl border border-slate-200 hover:border-amber-400 hover:bg-amber-50/50 text-left transition-all group"
            >
              <div className="flex items-center justify-between font-bold text-slate-900 group-hover:text-amber-700 text-xs">
                <span>Supervisor Shift I</span>
                <Clock size={14} className="text-amber-600" />
              </div>
              <span className="text-[10px] text-slate-400 block mt-0.5">Morning · sup_shift1</span>
            </button>

            <button
              type="button"
              disabled={loading}
              onClick={() => handleQuickLogin('sup_shift2', 'supervisorpass')}
              className="p-2.5 rounded-xl border border-slate-200 hover:border-sky-400 hover:bg-sky-50/50 text-left transition-all group"
            >
              <div className="flex items-center justify-between font-bold text-slate-900 group-hover:text-sky-700 text-xs">
                <span>Supervisor Shift II</span>
                <Clock size={14} className="text-sky-600" />
              </div>
              <span className="text-[10px] text-slate-400 block mt-0.5">Afternoon · sup_shift2</span>
            </button>

            <button
              type="button"
              disabled={loading}
              onClick={() => handleQuickLogin('sup_shift3', 'supervisorpass')}
              className="p-2.5 rounded-xl border border-slate-200 hover:border-purple-400 hover:bg-purple-50/50 text-left transition-all group"
            >
              <div className="flex items-center justify-between font-bold text-slate-900 group-hover:text-purple-700 text-xs">
                <span>Supervisor Shift III</span>
                <Clock size={14} className="text-purple-600" />
              </div>
              <span className="text-[10px] text-slate-400 block mt-0.5">Night · sup_shift3</span>
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
