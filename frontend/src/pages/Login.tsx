import React, { useState } from 'react';
import { Mail, ShieldCheck, Zap, ArrowRight, AlertCircle } from 'lucide-react';
import { AuthService } from '../services/api.js';

interface LoginProps {
  onLoginSuccess: (token: string) => void;
}

export const Login: React.FC<LoginProps> = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGoogleLogin = async () => {
    try {
      setLoading(true);
      setError(null);
      const url = await AuthService.getGoogleAuthUrl();
      window.location.href = url;
    } catch (err: any) {
      console.error('Login error:', err);
      setError(err.message || 'Unable to connect to Google OAuth service.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-indigo-600 text-white shadow-md mb-4">
          <Mail className="w-7 h-7" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 tracking-tight">ReachInbox Scheduler</h2>
        <p className="mt-1 text-xs text-slate-500">
          Production-grade cold email job scheduler with zero cron jobs
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4">
        <div className="bg-white py-8 px-6 shadow-md rounded-2xl border border-slate-200 sm:px-10 space-y-6">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-4">
            <div className="flex items-start gap-3 p-3 bg-indigo-50/60 rounded-xl border border-indigo-100 text-xs text-indigo-900">
              <Zap className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Zero-Cron Persistent Engine</p>
                <p className="text-indigo-700/80 mt-0.5">
                  Delayed jobs handled directly in BullMQ & Redis. Server crashes preserve queue timers without duplicated dispatches.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 bg-emerald-50/60 rounded-xl border border-emerald-100 text-xs text-emerald-900">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Auto-Rescheduling Rate Limits</p>
                <p className="text-emerald-700/80 mt-0.5">
                  When hourly caps are reached, jobs are safely deferred to the next hour window while dispatching instant Slack alerts.
                </p>
              </div>
            </div>
          </div>

          <div>
            <button
              onClick={handleGoogleLogin}
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 py-3 px-4 border border-slate-300 rounded-xl shadow-2xs bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              {/* Google SVG Icon */}
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>{loading ? 'Connecting to Google...' : 'Sign in with Google'}</span>
              <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
            </button>
          </div>

          <div className="pt-2 text-center border-t border-slate-100">
            <p className="text-[11px] text-slate-400">
              ReachInbox Assessment • Backend on Render • Frontend on Vercel
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
