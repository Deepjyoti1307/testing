import React, { useState, useRef, useEffect } from 'react';
import { X, Upload, Calendar, Clock, Gauge, Send, AlertCircle, PlusCircle } from 'lucide-react';
import { SenderAccount, SchedulePayload } from '../types/index.js';
import { EmailService, SenderService } from '../services/api.js';

interface ComposeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const ComposeModal: React.FC<ComposeModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [senders, setSenders] = useState<SenderAccount[]>([]);
  const [selectedSenderId, setSelectedSenderId] = useState<string>('');
  const [subject, setSubject] = useState('');
  const [bodyText, setBodyText] = useState('');
  const [rawLeadContent, setRawLeadContent] = useState('');
  const [detectedEmails, setDetectedEmails] = useState<string[]>([]);
  const [startTime, setStartTime] = useState('');
  const [delaySeconds, setDelaySeconds] = useState(2);
  const [hourlyLimit, setHourlyLimit] = useState(200);

  const [loadingSenders, setLoadingSenders] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      loadSenders();
      // Default start time to now formatted as datetime-local
      const now = new Date();
      now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
      setStartTime(now.toISOString().slice(0, 16));
    }
  }, [isOpen]);

  const loadSenders = async () => {
    try {
      setLoadingSenders(true);
      const list = await SenderService.getSenders();
      setSenders(list);
      if (list.length > 0 && !selectedSenderId) {
        setSelectedSenderId(list[0].id);
        setHourlyLimit(list[0].hourlyLimit || 200);
      }
    } catch (err: any) {
      console.error('Failed to load senders:', err);
    } finally {
      setLoadingSenders(false);
    }
  };

  const handleProvisionSender = async () => {
    try {
      setLoadingSenders(true);
      const newSender = await SenderService.provisionEthereal();
      setSenders((prev) => [...prev, newSender]);
      setSelectedSenderId(newSender.id);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to provision test sender');
    } finally {
      setLoadingSenders(false);
    }
  };

  // Client-side instant regex parser for CSV or raw pasted text
  const parseLeadsLocally = (content: string) => {
    setRawLeadContent(content);
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    const matches = content.match(emailRegex) || [];
    const unique = Array.from(new Set(matches.map((e) => e.trim().toLowerCase())));
    setDetectedEmails(unique);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      parseLeadsLocally(text);
    };
    reader.readAsText(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSenderId) {
      setErrorMessage('Please select or provision an outbound sender');
      return;
    }
    if (detectedEmails.length === 0) {
      setErrorMessage('Please upload or enter at least one valid recipient email');
      return;
    }
    if (!subject.trim() || !bodyText.trim()) {
      setErrorMessage('Subject and email body are required');
      return;
    }

    try {
      setSubmitting(true);
      setErrorMessage(null);

      const payload: SchedulePayload = {
        senderId: selectedSenderId,
        subject,
        bodyText,
        recipients: detectedEmails,
        startTime: startTime ? new Date(startTime).toISOString() : new Date().toISOString(),
        delayBetweenEmailsSeconds: delaySeconds,
        hourlyLimit,
      };

      await EmailService.scheduleBatch(payload);
      onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMessage(err.response?.data?.error || err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xl w-full max-w-2xl my-8 overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div>
            <h3 className="text-base font-bold text-slate-900">Compose & Schedule Campaign</h3>
            <p className="text-xs text-slate-500">Configure delivery delays, rate limits, and lead dispatches</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 p-1 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Outbound Sender Account */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-700">Outbound Sender Account</label>
              <button
                type="button"
                onClick={handleProvisionSender}
                disabled={loadingSenders}
                className="text-xs text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>Add Ethereal Test Account</span>
              </button>
            </div>
            <select
              value={selectedSenderId}
              onChange={(e) => {
                setSelectedSenderId(e.target.value);
                const sender = senders.find((s) => s.id === e.target.value);
                if (sender) setHourlyLimit(sender.hourlyLimit);
              }}
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 outline-none"
            >
              {senders.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.email}) — Limit: {s.hourlyLimit}/hr
                </option>
              ))}
            </select>
          </div>

          {/* Lead Recipients Upload */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Recipients (Upload CSV or Paste Emails)
            </label>
            <div className="border-2 border-dashed border-slate-200 hover:border-indigo-400 rounded-2xl p-4 bg-slate-50/50 transition-colors">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-xs text-slate-600">
                  <Upload className="w-4 h-4 text-indigo-600" />
                  <span>Upload .csv or .txt lead list</span>
                </div>
                <input
                  type="file"
                  accept=".csv,.txt"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-medium rounded-lg shadow-2xs transition-colors"
                >
                  Choose File
                </button>
              </div>

              {/* Paste Textarea */}
              <textarea
                rows={3}
                placeholder="Or paste leads here (e.g. john@example.com, sara@acme.com)..."
                value={rawLeadContent}
                onChange={(e) => parseLeadsLocally(e.target.value)}
                className="mt-3 w-full px-3 py-2 text-xs border border-slate-200 rounded-xl bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 outline-none font-mono"
              />

              {/* Real-time Email Detected Counter */}
              <div className="mt-2 flex items-center justify-between text-xs">
                <span className="font-semibold text-indigo-700">
                  Detected Valid Leads: {detectedEmails.length}
                </span>
                {detectedEmails.length > 0 && (
                  <span className="text-slate-400">Duplicates and invalid syntax automatically cleaned</span>
                )}
              </div>
            </div>
          </div>

          {/* Subject */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Subject</label>
            <input
              type="text"
              placeholder="e.g. Quick question regarding Outbox Labs partnership"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              required
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 outline-none"
            />
          </div>

          {/* Body */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Email Body</label>
            <textarea
              rows={4}
              placeholder="Write your email content..."
              value={bodyText}
              onChange={(e) => setBodyText(e.target.value)}
              required
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 outline-none"
            />
          </div>

          {/* Scheduling Controls Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
            {/* Start Time */}
            <div>
              <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 mb-1">
                <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                <span>Start Time</span>
              </label>
              <input
                type="datetime-local"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg bg-white outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>

            {/* Delay Between Emails */}
            <div>
              <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 mb-1">
                <Clock className="w-3.5 h-3.5 text-indigo-600" />
                <span>Delay Between Sends</span>
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0"
                  max="60"
                  value={delaySeconds}
                  onChange={(e) => setDelaySeconds(Math.max(0, parseInt(e.target.value || '0', 10)))}
                  className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg bg-white outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
                <span className="text-xs text-slate-500">sec</span>
              </div>
            </div>

            {/* Hourly Rate Limit */}
            <div>
              <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 mb-1">
                <Gauge className="w-3.5 h-3.5 text-indigo-600" />
                <span>Hourly Limit</span>
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="1"
                  max="10000"
                  value={hourlyLimit}
                  onChange={(e) => setHourlyLimit(Math.max(1, parseInt(e.target.value || '1', 10)))}
                  className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg bg-white outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
                <span className="text-xs text-slate-500">/hr</span>
              </div>
            </div>
          </div>

          {/* Action Footer */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || detectedEmails.length === 0}
              className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{submitting ? 'Scheduling in BullMQ...' : `Schedule ${detectedEmails.length} Emails`}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
