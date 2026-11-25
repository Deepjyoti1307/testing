import React from 'react';
import { Send, CheckCircle2, XCircle, ExternalLink } from 'lucide-react';
import { SentEmailItem } from '../types/index.js';

interface SentTableProps {
  items: SentEmailItem[];
  loading: boolean;
  onOpenCompose: () => void;
}

export const SentTable: React.FC<SentTableProps> = ({
  items,
  loading,
  onOpenCompose,
}) => {
  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
        <div className="p-6 space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="animate-pulse flex items-center justify-between py-2 border-b border-slate-100 last:border-none">
              <div className="space-y-2 flex-1">
                <div className="h-4 bg-slate-200 rounded-md w-1/4"></div>
                <div className="h-3 bg-slate-100 rounded-md w-1/2"></div>
              </div>
              <div className="h-6 bg-slate-100 rounded-full w-20"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-12 text-center">
        <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-2xs">
          <Send className="w-6 h-6" />
        </div>
        <h3 className="text-base font-bold text-slate-800">No sent emails yet</h3>
        <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-5">
          Emails will appear here once BullMQ workers dispatch them through the fake Ethereal SMTP server.
        </p>
        <button
          onClick={onOpenCompose}
          className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold px-4 py-2.5 rounded-xl transition-colors shadow-2xs"
        >
          Compose Outreach
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold">
            <tr>
              <th className="py-3 px-4">Recipient</th>
              <th className="py-3 px-4">Subject</th>
              <th className="py-3 px-4">Sender</th>
              <th className="py-3 px-4">Sent At</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4 text-right">Ethereal Preview</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-700">
            {items.map((item) => {
              const formattedDate = item.sentAt ? new Date(item.sentAt).toLocaleString() : 'N/A';
              return (
                <tr key={item.id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="py-3.5 px-4 font-medium text-slate-900">
                    {item.recipientEmail}
                  </td>
                  <td className="py-3.5 px-4 max-w-xs truncate" title={item.subject}>
                    {item.subject}
                  </td>
                  <td className="py-3.5 px-4 text-slate-500">
                    {item.sender?.email || 'Outbound'}
                  </td>
                  <td className="py-3.5 px-4 text-slate-600">
                    {formattedDate}
                  </td>
                  <td className="py-3.5 px-4">
                    {item.status === 'SENT' ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        <span>Sent</span>
                      </span>
                    ) : (
                      <span
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200"
                        title={item.errorMessage || 'Failed'}
                      >
                        <XCircle className="w-3 h-3 text-rose-600" />
                        <span>Failed</span>
                      </span>
                    )}
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    {item.etherealUrl ? (
                      <a
                        href={item.etherealUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold text-xs rounded-lg transition-colors border border-indigo-200"
                      >
                        <span>View Preview</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    ) : (
                      <span className="text-slate-400 italic">No link</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
