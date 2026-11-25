import React, { useState } from 'react';
import { Mail, Clock, Send, Plus, Search, LogOut, CheckCircle2 } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<'scheduled' | 'sent'>('scheduled');

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      {/* Top Navigation */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="bg-indigo-600 text-white p-2 rounded-lg font-bold flex items-center gap-2">
            <Mail className="w-5 h-5" />
            <span>ReachInbox</span>
          </div>
          <span className="text-slate-400">/</span>
          <span className="font-semibold text-slate-700">Email Job Scheduler</span>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-full text-xs font-medium border border-emerald-200">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Slack Ready</span>
          </div>

          <div className="flex items-center gap-3 pl-4 border-l border-slate-200">
            <div className="w-9 h-9 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-sm border border-indigo-200">
              U
            </div>
            <div className="text-left hidden sm:block">
              <p className="text-sm font-semibold text-slate-800 leading-tight">Demo User</p>
              <p className="text-xs text-slate-500">user@reachinbox.ai</p>
            </div>
            <button
              title="Logout"
              className="p-1.5 text-slate-400 hover:text-slate-700 rounded-md hover:bg-slate-100 transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 space-y-6">
        {/* Controls Bar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center bg-slate-200/70 p-1 rounded-xl">
            <button
              onClick={() => setActiveTab('scheduled')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'scheduled'
                  ? 'bg-white text-indigo-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Clock className="w-4 h-4" />
              <span>Scheduled Emails</span>
            </button>
            <button
              onClick={() => setActiveTab('sent')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'sent'
                  ? 'bg-white text-indigo-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Send className="w-4 h-4" />
              <span>Sent Emails</span>
            </button>
          </div>

          <button className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium px-4 py-2.5 rounded-xl shadow-sm transition-colors">
            <Plus className="w-4 h-4" />
            <span>Compose New Email</span>
          </button>
        </div>

        {/* Search & Filter Bar */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search emails by recipient, subject, or content (Elasticsearch)..."
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 shadow-sm transition-all"
          />
        </div>

        {/* Placeholder Table Content */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-12 text-center">
          <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-3">
            <Mail className="w-6 h-6" />
          </div>
          <h3 className="text-base font-semibold text-slate-800">No emails scheduled yet</h3>
          <p className="text-sm text-slate-500 max-w-sm mx-auto mt-1 mb-4">
            Upload your lead CSV and schedule cold email outreach with zero cron and full rate limiting.
          </p>
          <button className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
            <Plus className="w-4 h-4" />
            <span>Schedule First Campaign</span>
          </button>
        </div>
      </main>
    </div>
  );
}
