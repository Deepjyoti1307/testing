import React, { useState } from 'react';
import { X, Send, CheckCircle2, AlertTriangle, ShieldCheck } from 'lucide-react';
import { SlackStatus } from '../types/index.js';
import { SlackService } from '../services/api.js';

interface SlackModalProps {
  isOpen: boolean;
  onClose: () => void;
  status: SlackStatus;
  onRefreshStatus: () => void;
}

export const SlackModal: React.FC<SlackModalProps> = ({
  isOpen,
  onClose,
  status,
  onRefreshStatus,
}) => {
  const [webhookUrl, setWebhookUrl] = useState('');
  const [channelName, setChannelName] = useState('');
  const [loading, setLoading] = useState(false);
  const [testSuccess, setTestSuccess] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleOAuthConnect = async () => {
    try {
      setLoading(true);
      const url = await SlackService.getConnectUrl();
      window.location.href = url;
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to initialize Slack OAuth');
      setLoading(false);
    }
  };

  const handleWebhookConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!webhookUrl) return;

    try {
      setLoading(true);
      setErrorMessage(null);
      await SlackService.connectWebhook(webhookUrl, channelName);
      setTestSuccess('Webhook connected successfully!');
      onRefreshStatus();
    } catch (err: any) {
      setErrorMessage(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSendTest = async () => {
    try {
      setLoading(true);
      setErrorMessage(null);
      await SlackService.sendTestAlert();
      setTestSuccess('Verification alert posted to your Slack channel!');
    } catch (err: any) {
      setErrorMessage(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      setLoading(true);
      await SlackService.disconnect();
      setTestSuccess(null);
      onRefreshStatus();
    } catch (err: any) {
      setErrorMessage(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xl w-full max-w-lg overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
              #
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Slack Alerts Integration</h3>
              <p className="text-xs text-slate-500">Instant notification when a sender hits their hourly limit</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 p-1 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5">
          {testSuccess && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{testSuccess}</span>
            </div>
          )}

          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Status Overview */}
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 flex items-center justify-between">
            <div>
              <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Status</span>
              <p className="text-sm font-semibold text-slate-800 mt-0.5">
                {status.connected ? `Connected (${status.teamName || 'Active'})` : 'Not Connected'}
              </p>
              {status.channelName && (
                <p className="text-xs text-slate-500">Target Channel: {status.channelName}</p>
              )}
            </div>

            {status.connected ? (
              <div className="flex items-center gap-2">
                <button
                  onClick={handleSendTest}
                  disabled={loading}
                  className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-medium text-xs rounded-lg transition-colors"
                >
                  Send Test Alert
                </button>
                <button
                  onClick={handleDisconnect}
                  disabled={loading}
                  className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-medium text-xs rounded-lg transition-colors"
                >
                  Disconnect
                </button>
              </div>
            ) : null}
          </div>

          {!status.connected ? (
            <div className="space-y-4">
              {/* Option 1: Real Slack OAuth */}
              <button
                onClick={handleOAuthConnect}
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 bg-[#4A154B] hover:bg-[#3D113E] text-white py-2.5 px-4 rounded-xl font-medium text-sm transition-colors shadow-xs"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>Connect with Slack OAuth</span>
              </button>

              <div className="flex items-center gap-2 text-xs text-slate-400">
                <div className="h-px bg-slate-200 flex-1"></div>
                <span>OR CONNECT VIA WEBHOOK</span>
                <div className="h-px bg-slate-200 flex-1"></div>
              </div>

              {/* Option 2: Direct Webhook */}
              <form onSubmit={handleWebhookConnect} className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Slack Incoming Webhook URL
                  </label>
                  <input
                    type="url"
                    placeholder="https://hooks.slack.com/services/T00/B00/XXXX"
                    value={webhookUrl}
                    onChange={(e) => setWebhookUrl(e.target.value)}
                    required
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Channel Name (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="#outreach-alerts"
                    value={channelName}
                    onChange={(e) => setChannelName(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 outline-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white py-2 px-4 rounded-xl text-xs font-medium transition-colors"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Save Webhook</span>
                </button>
              </form>
            </div>
          ) : (
            <p className="text-xs text-slate-500 leading-relaxed">
              Whenever any sender reaches their hourly dispatch limit, an automatic Block Kit warning will be sent immediately to this Slack channel.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
