import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Building2, Lock, Mail, ArrowRight, AlertCircle, ShieldCheck } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const [email, setEmail] = useState<string>('superadmin@vuppala.edu');
  const [password, setPassword] = useState<string>('Admin@12345');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsLoading(true);

    try {
      await login(email, password);
    } catch (err: any) {
      setErrorMsg(err.message || 'Authentication failed. Please check credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectDemoAccount = (demoEmail: string, demoPass: string) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    setErrorMsg(null);
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Institutional Branding Header */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 mx-auto rounded-lg bg-blue-700 text-white flex items-center justify-center shadow-sm">
            <Building2 className="w-6 h-6" />
          </div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Staff FRS & Attendance System
          </h1>
          <p className="text-xs text-slate-500">
            Institutional Facial Recognition & Geofenced Attendance Management
          </p>
        </div>

        {/* Login Form Card */}
        <div className="bg-white border border-slate-300 rounded-lg p-6 sm:p-7 shadow-sm space-y-4">
          <div className="border-b border-slate-200 pb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-800">
              Sign In to Your Account
            </h2>
            <span className="text-[11px] font-mono text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded font-medium">
              System Online
            </span>
          </div>

          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md text-red-800 text-xs font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
            <div>
              <label className="block text-slate-700 font-semibold mb-1">
                Institutional Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@vuppala.edu"
                  className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-md text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-600 font-medium"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">
                Account Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-md text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-600 font-medium"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 py-2 px-4 rounded-md bg-blue-700 hover:bg-blue-800 text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-sm transition-colors disabled:opacity-50"
            >
              <span>{isLoading ? 'Authenticating Credentials...' : 'Sign In to Portal'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Quick Demo Credentials */}
          <div className="pt-3 border-t border-slate-200 space-y-2">
            <p className="text-[11px] font-semibold text-slate-600">
              Demo Quick-Fill Accounts:
            </p>

            <div className="grid grid-cols-2 gap-1.5 text-[11px]">
              <button
                type="button"
                onClick={() => handleSelectDemoAccount('superadmin@vuppala.edu', 'Admin@12345')}
                className="p-2 rounded border border-slate-200 bg-slate-50 hover:bg-slate-100 text-left transition-colors"
              >
                <p className="font-semibold text-slate-800">Super Admin</p>
                <p className="text-[10px] text-slate-500 font-mono truncate">superadmin@vuppala.edu</p>
              </button>

              <button
                type="button"
                onClick={() => handleSelectDemoAccount('principal@vuppala.edu', 'Admin@12345')}
                className="p-2 rounded border border-slate-200 bg-slate-50 hover:bg-slate-100 text-left transition-colors"
              >
                <p className="font-semibold text-slate-800">Principal</p>
                <p className="text-[10px] text-slate-500 font-mono truncate">principal@vuppala.edu</p>
              </button>

              <button
                type="button"
                onClick={() => handleSelectDemoAccount('manager@vuppala.edu', 'Admin@12345')}
                className="p-2 rounded border border-slate-200 bg-slate-50 hover:bg-slate-100 text-left transition-colors"
              >
                <p className="font-semibold text-slate-800">Manager</p>
                <p className="text-[10px] text-slate-500 font-mono truncate">manager@vuppala.edu</p>
              </button>

              <button
                type="button"
                onClick={() => handleSelectDemoAccount('suresh.k@vuppala.edu', 'Staff@12345')}
                className="p-2 rounded border border-slate-200 bg-slate-50 hover:bg-slate-100 text-left transition-colors"
              >
                <p className="font-semibold text-slate-800">Staff Member</p>
                <p className="text-[10px] text-slate-500 font-mono truncate">suresh.k@vuppala.edu</p>
              </button>
            </div>
          </div>
        </div>

        {/* Security Footer */}
        <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-500">
          <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
          <span>Institutional Access Management & Geofenced Verification</span>
        </div>
      </div>
    </div>
  );
};

