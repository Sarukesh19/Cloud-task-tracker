import React, { useState, useEffect } from 'react';
import { X, Mail, CheckCircle2, Inbox, RefreshCw } from 'lucide-react';
import { EmailOutboxItem } from '../types';
import { api } from '../services/api';

interface EmailInboxModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const EmailInboxModal: React.FC<EmailInboxModalProps> = ({
  isOpen,
  onClose
}) => {
  const [emails, setEmails] = useState<EmailOutboxItem[]>([]);
  const [selectedEmail, setSelectedEmail] = useState<EmailOutboxItem | null>(null);

  const fetchEmails = async () => {
    try {
      const data = await api.getEmailOutbox();
      setEmails(data);
      if (!selectedEmail && data.length > 0) {
        setSelectedEmail(data[0]);
      } else if (selectedEmail) {
        const found = data.find(e => e.id === selectedEmail.id);
        if (found) setSelectedEmail(found);
      }
    } catch (err) {
      console.error('Failed to load email outbox:', err);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchEmails();
      const interval = setInterval(fetchEmails, 2000);
      return () => clearInterval(interval);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-5xl h-[85vh] bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-sky-500/10 text-sky-400 border border-sky-500/20">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-100">
                  Team Email Outbox & HTML Previewer
                </h2>
                <span className="text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-300 border border-sky-500/30">
                  Stretch Goal
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Automated email delivery engine for assignments, status changes, and overdue warnings
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchEmails}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
              title="Refresh Emails"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 2-Column Split View */}
        <div className="flex-1 flex overflow-hidden">
          
          {/* Left Column: Email List */}
          <div className="w-80 border-r border-slate-800 bg-slate-950/40 flex flex-col flex-shrink-0">
            <div className="p-3 border-b border-slate-800/80 text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
              <span>Dispatched Emails ({emails.length})</span>
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-slate-800/40 p-2 space-y-1">
              {emails.length === 0 ? (
                <div className="h-40 flex flex-col items-center justify-center text-center p-4">
                  <Inbox className="w-6 h-6 text-slate-700 mb-2" />
                  <p className="text-xs text-slate-500">No emails dispatched yet</p>
                  <p className="text-[10px] text-slate-600 mt-0.5">
                    Assign a task to generate an automated HTML email notification.
                  </p>
                </div>
              ) : (
                emails.map((email) => {
                  const isSelected = selectedEmail?.id === email.id;
                  return (
                    <div
                      key={email.id}
                      onClick={() => setSelectedEmail(email)}
                      className={`p-3 rounded-2xl cursor-pointer transition-all text-left ${
                        isSelected
                          ? 'bg-sky-500/15 border border-sky-500/60 shadow-md shadow-sky-950/20'
                          : 'bg-slate-900/50 hover:bg-slate-900 border border-transparent'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <span className="text-xs font-bold text-slate-200 truncate">
                          {email.toName}
                        </span>
                        <span className="text-[10px] text-slate-500 font-mono flex-shrink-0">
                          {new Date(email.sentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>

                      <p className="text-xs text-slate-300 font-medium truncate">
                        {email.subject}
                      </p>

                      <div className="mt-2 flex items-center justify-between text-[10px]">
                        <span className="text-slate-500 font-mono truncate max-w-[130px]">
                          {email.toEmail}
                        </span>
                        <span className="flex items-center gap-1 text-emerald-400 font-semibold">
                          <CheckCircle2 className="w-2.5 h-2.5" />
                          <span>Delivered</span>
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Right Column: HTML Email Preview */}
          <div className="flex-1 bg-slate-950/80 flex flex-col overflow-hidden">
            {selectedEmail ? (
              <div className="flex-1 flex flex-col overflow-hidden">
                {/* Email Meta Bar */}
                <div className="p-4 bg-slate-900/80 border-b border-slate-800 text-xs space-y-1.5 flex-shrink-0">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-extrabold text-slate-100">{selectedEmail.subject}</h3>
                    <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full font-mono font-bold">
                      STATUS: 250 OK (DELIVERED)
                    </span>
                  </div>
                  <div className="text-slate-400 flex items-center gap-4 flex-wrap">
                    <span>From: <strong>CloudTrack Notifications &lt;no-reply@clubtech.edu&gt;</strong></span>
                    <span>To: <strong>{selectedEmail.toName} &lt;{selectedEmail.toEmail}&gt;</strong></span>
                    <span>Time: <strong>{new Date(selectedEmail.sentAt).toLocaleString()}</strong></span>
                  </div>
                </div>

                {/* HTML Render Canvas */}
                <div className="flex-1 p-6 overflow-y-auto bg-slate-950 flex items-center justify-center">
                  <div 
                    className="w-full max-w-xl shadow-2xl rounded-2xl overflow-hidden bg-white text-slate-900"
                    dangerouslySetInnerHTML={{ __html: selectedEmail.htmlBody }}
                  />
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-slate-500">
                <Mail className="w-12 h-12 text-slate-800 mb-3" />
                <p className="text-sm font-semibold">Select an email to view full HTML rendering</p>
              </div>
            )}
          </div>

        </div>

      </div>
    </div>
  );
};
