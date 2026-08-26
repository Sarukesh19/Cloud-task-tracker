import React, { useState, useEffect } from 'react';
import { 
  X, 
  Cpu, 
  RefreshCw, 
  RotateCcw,
  Bug,
  Clock
} from 'lucide-react';
import { QueueJob } from '../types';
import { api } from '../services/api';
import { useNotifications } from '../context/NotificationContext';

interface QueueMonitorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const QueueMonitorModal: React.FC<QueueMonitorModalProps> = ({
  isOpen,
  onClose
}) => {
  const { showToast } = useNotifications();
  const [jobs, setJobs] = useState<QueueJob[]>([]);
  const [summary, setSummary] = useState<{ queued: number; processing: number; retrying: number; completed: number; failed: number }>({
    queued: 0,
    processing: 0,
    retrying: 0,
    completed: 0,
    failed: 0
  });
  const [simulateFailures, setSimulateFailures] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);

  const fetchQueueData = async () => {
    try {
      const data = await api.getQueueStatus();
      setJobs(data.jobs);
      setSummary(data.summary);
      setSimulateFailures(data.simulateFailures);
    } catch (e) {
      console.error('Failed to fetch queue data:', e);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchQueueData();
      const interval = setInterval(fetchQueueData, 1500);
      return () => clearInterval(interval);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleToggleFaults = async () => {
    try {
      const res = await api.toggleQueueFaults();
      setSimulateFailures(res.simulateFailures);
      showToast(
        res.simulateFailures ? 'Fault Simulation Active ⚠️' : 'Fault Simulation Disabled ✅',
        res.message,
        res.simulateFailures ? 'warning' : 'success'
      );
      fetchQueueData();
    } catch (e: any) {
      showToast('Action Failed', e.message, 'error');
    }
  };

  const handleRetryFailed = async () => {
    setIsRetrying(true);
    try {
      const res = await api.retryFailedJobs();
      showToast('DLQ Reprocessed 🔄', res.message, 'success');
      fetchQueueData();
    } catch (e: any) {
      showToast('Retry Failed', e.message, 'error');
    } finally {
      setIsRetrying(false);
    }
  };

  const getStatusBadge = (status: QueueJob['status']) => {
    switch (status) {
      case 'QUEUED':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/30';
      case 'PROCESSING':
        return 'bg-sky-500/20 text-sky-300 border-sky-500/30 animate-pulse';
      case 'RETRYING':
        return 'bg-purple-500/20 text-purple-300 border-purple-500/30 animate-bounce';
      case 'COMPLETED':
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
      case 'FAILED':
        return 'bg-red-500/20 text-red-400 border-red-500/40';
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-100">
                  Async Notification Queue & Retry Inspector
                </h2>
                <span className="text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  Stretch Goal
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Background FIFO worker, Exponential Backoff, and Dead-Letter Queue (DLQ)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleToggleFaults}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition shadow-sm ${
                simulateFailures
                  ? 'bg-red-500/20 border-red-500/80 text-red-300 shadow-red-500/20 animate-pulse'
                  : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
              }`}
              title="Simulates network drops to test automatic retry handling with exponential backoff"
            >
              <Bug className="w-3.5 h-3.5" />
              <span>{simulateFailures ? 'Network Faults [ON]' : 'Inject Network Faults'}</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Stats Summary Strip */}
        <div className="grid grid-cols-5 divide-x divide-slate-800/80 border-b border-slate-800 bg-slate-950/40 text-center py-3">
          <div>
            <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider block">Queued</span>
            <span className="text-lg font-extrabold text-slate-100">{summary.queued}</span>
          </div>
          <div>
            <span className="text-[10px] font-bold text-sky-400 uppercase tracking-wider block">Processing</span>
            <span className="text-lg font-extrabold text-slate-100">{summary.processing}</span>
          </div>
          <div>
            <span className="text-[10px] font-bold text-purple-400 uppercase tracking-wider block">Retrying</span>
            <span className="text-lg font-extrabold text-slate-100">{summary.retrying}</span>
          </div>
          <div>
            <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider block">Completed</span>
            <span className="text-lg font-extrabold text-slate-100">{summary.completed}</span>
          </div>
          <div>
            <span className="text-[10px] font-bold text-red-400 uppercase tracking-wider block">Failed (DLQ)</span>
            <div className="flex items-center justify-center gap-1">
              <span className="text-lg font-extrabold text-red-400">{summary.failed}</span>
              {summary.failed > 0 && (
                <button
                  onClick={handleRetryFailed}
                  disabled={isRetrying}
                  className="text-[10px] p-1 rounded bg-red-500/20 hover:bg-red-500 text-red-300 hover:text-white transition"
                  title="Reprocess all Dead-Letter Queue jobs"
                >
                  <RotateCcw className={`w-3 h-3 ${isRetrying ? 'animate-spin' : ''}`} />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Jobs Table */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-3">
            {jobs.length === 0 ? (
              <div className="h-48 rounded-2xl border border-dashed border-slate-800 flex flex-col items-center justify-center text-center p-6">
                <Cpu className="w-8 h-8 text-slate-700 mb-2" />
                <p className="text-sm font-semibold text-slate-400">Queue is currently idle</p>
                <p className="text-xs text-slate-500 mt-1">
                  Assign or change task statuses to watch async worker jobs process in real-time!
                </p>
              </div>
            ) : (
              jobs.map((job) => (
                <div
                  key={job.id}
                  className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4 transition hover:border-slate-700"
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border uppercase tracking-wider ${getStatusBadge(job.status)}`}>
                        {job.status}
                      </span>
                      <span className="text-xs font-bold text-slate-200">
                        {job.type}
                      </span>
                      <span className="text-[11px] text-slate-500 font-mono">
                        ID: {job.id}
                      </span>
                    </div>

                    <div className="text-xs font-mono text-slate-400">
                      Attempts: <strong className={job.attempts > 1 ? 'text-amber-400' : 'text-slate-200'}>{job.attempts}</strong> / {job.maxAttempts}
                    </div>
                  </div>

                  <p className="text-xs text-slate-300">
                    <strong>Payload:</strong> {job.payload?.title || job.payload?.message || JSON.stringify(job.payload)}
                  </p>

                  {job.status === 'RETRYING' && job.nextRunAt && (
                    <div className="mt-2 p-2 rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-300 text-xs flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5 text-purple-400" />
                      <span>
                        Exponential backoff active. Next retry scheduled for: <strong>{new Date(job.nextRunAt).toLocaleTimeString()}</strong>
                      </span>
                    </div>
                  )}

                  {job.errorLogs && job.errorLogs.length > 0 && (
                    <div className="mt-2.5 p-2.5 rounded-xl bg-slate-950 border border-red-500/20 text-[11px] font-mono text-red-300 space-y-1">
                      <div className="text-[10px] text-red-400 uppercase font-bold tracking-wider">
                        Failure Log History:
                      </div>
                      {job.errorLogs.map((log, idx) => (
                        <div key={idx} className="truncate">
                          {log}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Footer info */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between text-xs text-slate-400">
          <span>Worker Polling: <strong>Every 500ms</strong></span>
          <span className="font-mono text-emerald-400">● Live Auto-Sync Active</span>
        </div>

      </div>
    </div>
  );
};
