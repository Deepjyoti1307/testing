import React from 'react';
import { Calendar, Trash2, Clock, AlertTriangle, RefreshCw } from 'lucide-react';
import { ScheduledEmailItem } from '../types/index.js';

interface ScheduledTableProps {
  items: ScheduledEmailItem[];
  loading: boolean;
  onCancel: (id: string) => void;
  onOpenCompose: () => void;
}

export const ScheduledTable: React.FC<ScheduledTableProps> = ({
  items,
  loading,
  onCancel,
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
              <div className="h-6 bg-slate-100 rounded-full w-24"></div>
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
          <Clock className="w-6 h-6" />
        </div>
        <h3 className="text-base font-bold text-slate-800">No scheduled emails</h3>
        <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-5">
          There are no delayed dispatches waiting in the queue. Compose a new campaign to schedule emails.
        </p>
        <button
          onClick={onOpenCompose}
          className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold px-4 py-2.5 rounded-xl transition-colors shadow-2xs"
        >
          Schedule New Email
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
              <th className="py-3 px-4">Sender Account</th>
              <th className="py-3 px-4">Scheduled For</th>
              <th className="py-3 px-4">Queue Status</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-700">
            {items.map((item) => {
              const formattedDate = new Date(item.scheduledAt).toLocaleString();
              return (
                <tr key={item.id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="py-3.5 px-4 font-medium text-slate-900">
                    {item.recipientEmail}
                  </td>
                  <td className="py-3.5 px-4 max-w-xs truncate" title={item.subject}>
                    {item.subject}
                  </td>
                  <td className="py-3.5 px-4 text-slate-500">
                    {item.sender?.email || 'Default Sender'}
                  </td>
                  <td className="py-3.5 px-4 text-slate-600">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-indigo-500" />
                      <span>{formattedDate}</span>
                    </div>
                  </td>
                  <td className="py-3.5 px-4">
                    {item.status === 'SCHEDULED' && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                        <Clock className="w-3 h-3" />
                        <span>Scheduled</span>
                      </span>
                    )}
                    {item.status === 'PROCESSING' && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200 animate-pulse">
                        <RefreshCw className="w-3 h-3 animate-spin" />
                        <span>Processing</span>
                      </span>
                    )}
                    {item.status === 'RESCHEDULED' && (
                      <span
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-purple-50 text-purple-700 border border-purple-200"
                        title={item.errorMessage || 'Rescheduled due to rate limit'}
                      >
                        <AlertTriangle className="w-3 h-3 text-purple-600" />
                        <span>Rollover (+{item.rescheduledCount || 1}h)</span>
                      </span>
                    )}
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <button
                      onClick={() => onCancel(item.id)}
                      title="Cancel Job"
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
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
