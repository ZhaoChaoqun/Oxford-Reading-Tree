import { useEffect, useMemo, useState } from 'react';
import {
  createProgressTransferPayload,
  parseProgressTransferPayload,
  readCurrentProgressTransferState,
  replaceProgressTransferState,
  summarizeProgressTransferData,
} from '../../services/progressTransfer';
import { isIOSStandaloneWebApp } from '../../services/runtimeEnvironment.js';

function formatExportedAt(value) {
  if (!value) {
    return 'Unknown';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString();
}

function SummaryGrid({ title, summary, tone }) {
  if (!summary) {
    return null;
  }

  const palette = tone === 'sky'
    ? {
        card: 'bg-white/80 border-sky-200',
        label: 'text-sky-700/80',
        value: 'text-sky-900',
      }
    : {
        card: 'bg-white/80 border-orange-200',
        label: 'text-orange-700/80',
        value: 'text-orange-900',
      };

  const items = [
    ['Exported', formatExportedAt(summary.exportedAt)],
    ['Available stars', String(summary.spendableStars ?? summary.totalScore ?? 0)],
    ['Lifetime stars', String(summary.lifetimeStarsEarned ?? summary.totalScore ?? 0)],
    ['Streak', String(summary.streak)],
    ['Completed units', String(summary.completedUnits)],
    ['Quiz passed', String(summary.quizPassedUnits)],
    ['Speech practised', String(summary.speechPassedUnits)],
    ['Rewards', String(summary.rewardCount)],
  ];

  return (
    <div className="mt-3">
      <div className={`text-xs font-bold uppercase tracking-wide ${palette.label}`}>{title}</div>
      <div className="mt-2 grid grid-cols-2 gap-2">
        {items.map(([label, value]) => (
          <div key={label} className={`rounded-2xl border p-3 ${palette.card}`}>
            <div className={`text-[11px] font-semibold ${palette.label}`}>{label}</div>
            <div className={`mt-1 text-sm font-bold ${palette.value}`}>{value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ProgressTransferModal({ open, onClose }) {
  const [exportCode, setExportCode] = useState('');
  const [importCode, setImportCode] = useState('');
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [exportSummary, setExportSummary] = useState(null);
  const iosStandalone = useMemo(() => isIOSStandaloneWebApp(), []);

  const importPreview = useMemo(() => {
    if (!importCode.trim()) {
      return { summary: null, error: '' };
    }

    try {
      const parsed = parseProgressTransferPayload(importCode);
      return {
        summary: summarizeProgressTransferData(parsed),
        error: '',
      };
    } catch (importError) {
      return {
        summary: null,
        error: importError.message,
      };
    }
  }, [importCode]);

  useEffect(() => {
    if (!open) {
      setStatus('');
      setError('');
      setExportSummary(null);
      return;
    }

    const snapshot = readCurrentProgressTransferState();
    setExportCode(createProgressTransferPayload(snapshot));
    setExportSummary(summarizeProgressTransferData(snapshot));
  }, [open]);

  if (!open) {
    return null;
  }

  const handleCopy = async () => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(exportCode);
        setStatus('Transfer code copied.');
        setError('');
        return;
      }
      setStatus('Copy is not available here. Long-press the code and copy it manually.');
      setError('');
    } catch {
      setStatus('Copy failed. Long-press the code and copy it manually.');
      setError('');
    }
  };

  const handleImport = () => {
    try {
      const parsed = parseProgressTransferPayload(importCode);
      replaceProgressTransferState(parsed);
      setStatus('Progress imported. Reloading now...');
      setError('');
      window.location.reload();
    } catch (importError) {
      setError(importError.message);
      setStatus('');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center">
      <div className="w-full max-w-3xl rounded-3xl bg-white p-5 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-xl font-extrabold text-gray-800">Transfer Progress</h3>
            <p className="mt-1 text-sm text-gray-500">
              Safari and the installed iPad app keep separate local progress. Use this code to move stars, rewards,
              quiz records, and learning progress between them.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-2xl bg-gray-100 px-3 py-2 text-sm font-semibold text-gray-600"
          >
            Close
          </button>
        </div>

        <div className="mt-5 grid gap-5 md:grid-cols-2">
          <section className="rounded-2xl border border-orange-100 bg-orange-50 p-4">
            <div className="text-sm font-bold text-orange-700">
              {iosStandalone ? 'Export from installed app' : 'Export from Safari'}
            </div>
            <p className="mt-1 text-xs text-orange-700/80">
              Copy this code and paste it into the other version of the app.
            </p>
            <SummaryGrid title="This device" summary={exportSummary} tone="orange" />
            <textarea
              readOnly
              value={exportCode}
              className="mt-3 h-32 w-full rounded-2xl border border-orange-200 bg-white p-3 text-xs text-gray-700"
            />
            <button
              type="button"
              onClick={handleCopy}
              className="mt-3 rounded-2xl bg-orange-500 px-4 py-2 text-sm font-bold text-white"
            >
              Copy code
            </button>
          </section>

          <section className="rounded-2xl border border-sky-100 bg-sky-50 p-4">
            <div className="text-sm font-bold text-sky-700">
              {iosStandalone ? 'Import from Safari' : 'Import from installed app'}
            </div>
            <p className="mt-1 text-xs text-sky-700/80">
              Paste a transfer code here to preview it before replacing the current device progress.
            </p>
            <textarea
              value={importCode}
              onChange={(event) => setImportCode(event.target.value)}
              placeholder="Paste transfer code here"
              className="mt-3 h-32 w-full rounded-2xl border border-sky-200 bg-white p-3 text-xs text-gray-700"
            />
            {importPreview.summary ? <SummaryGrid title="Incoming backup" summary={importPreview.summary} tone="sky" /> : null}
            {!importPreview.summary && importCode.trim() ? (
              <div className="mt-3 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">
                {importPreview.error}
              </div>
            ) : null}
            <button
              type="button"
              onClick={handleImport}
              disabled={!importCode.trim() || !importPreview.summary}
              className="mt-3 rounded-2xl bg-sky-500 px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
            >
              Import and reload
            </button>
          </section>
        </div>

        {status ? <div className="mt-4 rounded-2xl bg-green-50 px-4 py-3 text-sm text-green-700">{status}</div> : null}
        {error ? <div className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}
      </div>
    </div>
  );
}
