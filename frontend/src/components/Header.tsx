import React from 'react';
import { Mail, LogOut, CheckCircle2, AlertCircle, ExternalLink } from 'lucide-react';
import { UserProfile, SlackStatus } from '../types/index.js';

interface HeaderProps {
  user: UserProfile | null;
  slackStatus: SlackStatus;
  onOpenSlackModal: () => void;
  onLogout: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  user,
  slackStatus,
  onOpenSlackModal,
  onLogout,
}) => {
  return (
    <header className="bg-white border-b border-slate-200 px-6 py-3.5 flex items-center justify-between sticky top-0 z-30 shadow-xs">
      {/* Brand Logo & Name */}
      <div className="flex items-center gap-3">
        <div className="bg-indigo-600 text-white p-2 rounded-xl shadow-xs flex items-center justify-center">
          <Mail className="w-5 h-5" />
        </div>
        <div className="flex items-center gap-2">
          <span className="font-bold text-lg text-slate-900 tracking-tight">ReachInbox</span>
          <span className="text-slate-300">/</span>
          <span className="text-sm font-medium text-slate-500">Email Job Scheduler</span>
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-3">
        {/* Queue Dashboard Admin Link */}
        <a
          href="http://localhost:5000/admin/queues"
          target="_blank"
          rel="noreferrer"
          className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 border border-slate-200 transition-colors"
        >
          <span>Bull-Board Queues</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </a>

        {/* Slack Connection Pill */}
        <button
          onClick={onOpenSlackModal}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
            slackStatus.connected
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
              : 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
          }`}
        >
          {slackStatus.connected ? (
            <>
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>Slack: {slackStatus.teamName || 'Connected'}</span>
            </>
          ) : (
            <>
              <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
              <span>Connect Slack</span>
            </>
          )}
        </button>

        {/* User Profile */}
        {user ? (
          <div className="flex items-center gap-3 pl-3 border-l border-slate-200">
            {user.avatar ? (
              <img
                src={user.avatar}
                alt={user.name}
                className="w-8 h-8 rounded-full border border-slate-200 object-cover"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 font-semibold flex items-center justify-center text-xs">
                {user.name.charAt(0).toUpperCase()}
              </div>
            )}

            <div className="text-left hidden sm:block">
              <p className="text-xs font-semibold text-slate-800 leading-tight">{user.name}</p>
              <p className="text-[11px] text-slate-500 leading-tight truncate max-w-[140px]">{user.email}</p>
            </div>

            <button
              onClick={onLogout}
              title="Logout"
              className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-slate-100 transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : null}
      </div>
    </header>
  );
};
