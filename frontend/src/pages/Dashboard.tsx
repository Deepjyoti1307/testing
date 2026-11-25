import React, { useState, useEffect, useCallback } from 'react';
import { Clock, Send, Plus, Search, RefreshCw, Layers } from 'lucide-react';
import { ScheduledEmailItem, SentEmailItem, UserProfile, SlackStatus } from '../types/index.js';
import { EmailService, SlackService } from '../services/api.js';
import { Header } from '../components/Header.js';
import { ScheduledTable } from '../components/ScheduledTable.js';
import { SentTable } from '../components/SentTable.js';
import { ComposeModal } from '../components/ComposeModal.js';
import { SlackModal } from '../components/SlackModal.js';

interface DashboardProps {
  user: UserProfile;
  onLogout: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ user, onLogout }) => {
  const [activeTab, setActiveTab] = useState<'scheduled' | 'sent'>('scheduled');
  const [scheduledEmails, setScheduledEmails] = useState<ScheduledEmailItem[]>([]);
  const [sentEmails, setSentEmails] = useState<SentEmailItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [slackStatus, setSlackStatus] = useState<SlackStatus>({ connected: false });

  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [isSlackOpen, setIsSlackOpen] = useState(false);

  const loadData = useCallback(async (query?: string) => {
    try {
      setLoading(true);
      if (activeTab === 'scheduled') {
        const data = await EmailService.getScheduledEmails(query);
        setScheduledEmails(data);
      } else {
        const data = await EmailService.getSentEmails(query);
        setSentEmails(data);
      }
    } catch (err: any) {
      console.error('Failed to load email jobs:', err);
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  const loadSlackStatus = useCallback(async () => {
    try {
      const status = await SlackService.getStatus();
      setSlackStatus(status);
    } catch (err: any) {
      console.error('Failed to load Slack status:', err);
    }
  }, []);

  useEffect(() => {
    loadData(searchQuery);
  }, [loadData, searchQuery]);

  useEffect(() => {
    loadSlackStatus();
  }, [loadSlackStatus]);

  const handleCancelEmail = async (id: string) => {
    try {
      await EmailService.cancelEmail(id);
      loadData(searchQuery);
    } catch (err: any) {
      alert(err.message || 'Failed to cancel job');
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      {/* Top Navbar */}
      <Header
        user={user}
        slackStatus={slackStatus}
        onOpenSlackModal={() => setIsSlackOpen(true)}
        onLogout={onLogout}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Top Header & CTA Bar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Campaign Dispatch Monitor</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Zero-cron delayed queues backed by BullMQ & Redis • Auto-rescheduled hourly limits
            </p>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <button
              onClick={() => loadData(searchQuery)}
              title="Refresh Queue"
              className="p-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl transition-colors shadow-2xs"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>

            <button
              onClick={() => setIsComposeOpen(true)}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs py-2.5 px-4 rounded-xl shadow-xs transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Compose New Email</span>
            </button>
          </div>
        </div>

        {/* Stats Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Scheduled In Queue</span>
              <p className="text-lg font-bold text-slate-900">{scheduledEmails.length}</p>
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              <Send className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Total Sent</span>
              <p className="text-lg font-bold text-slate-900">{sentEmails.length}</p>
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Search Engine</span>
              <p className="text-xs font-semibold text-purple-700 mt-1">Elasticsearch Synced</p>
            </div>
          </div>
        </div>

        {/* Navigation Tabs & Search Bar */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Tabs */}
          <div className="inline-flex bg-slate-200/70 p-1 rounded-xl">
            <button
              onClick={() => setActiveTab('scheduled')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'scheduled'
                  ? 'bg-white text-indigo-700 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Scheduled Emails ({scheduledEmails.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('sent')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'sent'
                  ? 'bg-white text-indigo-700 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Send className="w-3.5 h-3.5" />
              <span>Sent Emails ({sentEmails.length})</span>
            </button>
          </div>

          {/* Elasticsearch Search Input */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by recipient, subject, or content (Elasticsearch)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 outline-none shadow-2xs"
            />
          </div>
        </div>

        {/* Active Tab View */}
        {activeTab === 'scheduled' ? (
          <ScheduledTable
            items={scheduledEmails}
            loading={loading}
            onCancel={handleCancelEmail}
            onOpenCompose={() => setIsComposeOpen(true)}
          />
        ) : (
          <SentTable
            items={sentEmails}
            loading={loading}
            onOpenCompose={() => setIsComposeOpen(true)}
          />
        )}
      </main>

      {/* Compose Campaign Modal */}
      <ComposeModal
        isOpen={isComposeOpen}
        onClose={() => setIsComposeOpen(false)}
        onSuccess={() => {
          loadData();
          setIsComposeOpen(false);
        }}
      />

      {/* Slack Integration Modal */}
      <SlackModal
        isOpen={isSlackOpen}
        onClose={() => setIsSlackOpen(false)}
        status={slackStatus}
        onRefreshStatus={loadSlackStatus}
      />
    </div>
  );
};
