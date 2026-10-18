import { useState, useMemo } from 'react';
import { IoCloudUploadOutline, IoDocumentTextOutline } from 'react-icons/io5';
import Modal from '../common/Modal';
import { transactionService } from '../../services/transactionService';
import useToastStore from '../../store/toastStore';
import { formatCurrency } from '../../utils/formatCurrency';
import { formatDate } from '../../utils/formatDate';
import { parseCsv, detectColumns, parseFlexibleDate, parseAmount } from '../../utils/parseCsv';

const FIELDS = [
  { key: 'date', label: 'Date *' },
  { key: 'time', label: 'Time' },
  { key: 'description', label: 'Description' },
  { key: 'amount', label: 'Amount' },
  { key: 'debit', label: 'Debit / Withdrawal' },
  { key: 'credit', label: 'Credit / Deposit' },
  { key: 'type', label: 'Type (spend/earning)' },
  { key: 'category', label: 'Category' },
  { key: 'notes', label: 'Notes' },
];

const TEMPLATE_CSV =
  'Date,Type,Category,Description,Amount,Notes\n' +
  '2026-10-01,spend,Food & Dining,Swiggy order,450,\n' +
  '2026-10-01,earning,Salary,October salary,85000,\n' +
  '02/10/2026,spend,Groceries,BigBasket,1250.50,Weekly groceries\n';

const PREVIEW_LIMIT = 8;
const MAX_IMPORT_ROWS = 5000;

const isEarningLabel = (value) => /earn|income|credit|^cr\.?$|deposit|salary/i.test(value || '');

export default function ImportTransactionsModal({ isOpen, onClose, onImported, currency = 'INR' }) {
  const { addToast } = useToastStore();

  const [fileName, setFileName] = useState('');
  const [headers, setHeaders] = useState([]);
  const [dataRows, setDataRows] = useState([]);
  const [mapping, setMapping] = useState({});
  const [dayFirst, setDayFirst] = useState(true);
  const [positiveType, setPositiveType] = useState('spend');
  const [createMissing, setCreateMissing] = useState(true);
  const [importing, setImporting] = useState(false);

  const reset = () => {
    setFileName('');
    setHeaders([]);
    setDataRows([]);
    setMapping({});
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleFile = (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      addToast({ type: 'warning', message: 'File is too large (max 5 MB)' });
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const rows = parseCsv(String(reader.result || ''));
      if (rows.length < 2) {
        addToast({ type: 'warning', message: 'CSV needs a header row and at least one transaction' });
        return;
      }
      const [headerRow, ...rest] = rows;
      setFileName(file.name);
      setHeaders(headerRow.map((h) => h.trim()));
      setDataRows(rest);
      setMapping(detectColumns(headerRow));
    };
    reader.onerror = () => addToast({ type: 'error', message: 'Could not read the file' });
    reader.readAsText(file);
  };

  const downloadTemplate = () => {
    const blob = new Blob([TEMPLATE_CSV], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'spendwise-import-template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  // Convert raw CSV rows into API rows using the current column mapping
  const parsedRows = useMemo(() => {
    const cell = (row, key) => (mapping[key] >= 0 ? (row[mapping[key]] || '').trim() : '');

    return dataRows.map((row) => {
      const date = parseFlexibleDate(cell(row, 'date'), cell(row, 'time'), dayFirst);
      let amount = null;
      let type = null;

      const debit = parseAmount(cell(row, 'debit'));
      const credit = parseAmount(cell(row, 'credit'));
      if (debit) {
        amount = Math.abs(debit);
        type = 'spend';
      } else if (credit) {
        amount = Math.abs(credit);
        type = 'earning';
      } else {
        const signed = parseAmount(cell(row, 'amount'));
        if (signed) {
          amount = Math.abs(signed);
          type = signed < 0 ? 'spend' : positiveType;
        }
      }

      const typeCell = cell(row, 'type');
      if (typeCell && amount) type = isEarningLabel(typeCell) ? 'earning' : 'spend';

      const error = !date ? 'Invalid date' : !amount ? 'Missing amount' : null;
      return {
        error,
        type,
        amount,
        date,
        description: cell(row, 'description'),
        category: cell(row, 'category'),
        notes: cell(row, 'notes'),
      };
    });
  }, [dataRows, mapping, dayFirst, positiveType]);

  const validRows = parsedRows.filter((r) => !r.error);
  const hasSignedAmountOnly =
    mapping.amount >= 0 && mapping.debit < 0 && mapping.credit < 0 && mapping.type < 0;

  const handleImport = async () => {
    if (validRows.length === 0) {
      addToast({ type: 'warning', message: 'No valid rows to import' });
      return;
    }
    if (validRows.length > MAX_IMPORT_ROWS) {
      addToast({ type: 'warning', message: `Please split the file — max ${MAX_IMPORT_ROWS} rows per import` });
      return;
    }
    setImporting(true);
    try {
      const payload = validRows.map((r) => ({
        type: r.type,
        amount: Math.round(r.amount * 100) / 100,
        transactionDate: r.date.toISOString(),
        description: r.description.slice(0, 500) || null,
        category: r.category.slice(0, 100) || null,
        notes: r.notes.slice(0, 1000) || null,
      }));
      const res = await transactionService.importMany(payload, createMissing);
      const created = res.data?.createdCategories || [];
      addToast({
        type: 'success',
        message:
          `Imported ${res.data?.count ?? payload.length} transaction(s)` +
          (created.length ? ` · ${created.length} new categor${created.length === 1 ? 'y' : 'ies'}` : ''),
      });
      handleClose();
      onImported?.();
    } catch (err) {
      addToast({ type: 'error', message: err.response?.data?.error || 'Import failed' });
    } finally {
      setImporting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Import Transactions from CSV" size="lg">
      {headers.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '20px 0' }}>
          <IoDocumentTextOutline size={48} style={{ color: 'var(--primary)', marginBottom: '12px' }} />
          <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)', margin: '0 0 20px' }}>
            Upload a bank statement or spreadsheet exported as CSV. Columns are detected automatically —
            you can adjust them before importing.
          </p>
          <label className="btn btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
            <IoCloudUploadOutline size={20} />
            <span>Choose CSV File</span>
            <input type="file" accept=".csv,text/csv" onChange={handleFile} style={{ display: 'none' }} />
          </label>
          <div style={{ marginTop: '16px' }}>
            <button type="button" className="btn btn-ghost btn-sm" onClick={downloadTemplate}>
              Download sample template
            </button>
          </div>
        </div>
      ) : (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', gap: '12px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)' }}>
              📄 <strong>{fileName}</strong> — {dataRows.length} row(s)
            </span>
            <button type="button" className="btn btn-ghost btn-sm" onClick={reset}>
              Choose another file
            </button>
          </div>

          <h3 style={{ fontSize: 'var(--font-size-sm)', fontWeight: 700, margin: '0 0 10px' }}>Column mapping</h3>
          <div className="import-mapping-grid" style={{ marginBottom: '16px' }}>
            {FIELDS.map((f) => (
              <div key={f.key}>
                <label className="form-label" htmlFor={`map-${f.key}`} style={{ fontSize: 'var(--font-size-xs)' }}>
                  {f.label}
                </label>
                <select
                  id={`map-${f.key}`}
                  className="form-input form-select"
                  value={mapping[f.key] ?? -1}
                  onChange={(e) => setMapping({ ...mapping, [f.key]: Number(e.target.value) })}
                >
                  <option value={-1}>— Not used —</option>
                  {headers.map((h, i) => (
                    <option key={i} value={i}>{h || `Column ${i + 1}`}</option>
                  ))}
                </select>
              </div>
            ))}
          </div>

          <div className="import-mapping-grid" style={{ marginBottom: '16px' }}>
            <div>
              <label className="form-label" htmlFor="dateFormat" style={{ fontSize: 'var(--font-size-xs)' }}>Date format</label>
              <select
                id="dateFormat"
                className="form-input form-select"
                value={dayFirst ? 'dmy' : 'mdy'}
                onChange={(e) => setDayFirst(e.target.value === 'dmy')}
              >
                <option value="dmy">DD/MM/YYYY</option>
                <option value="mdy">MM/DD/YYYY</option>
              </select>
            </div>
            {hasSignedAmountOnly && (
              <div>
                <label className="form-label" htmlFor="positiveType" style={{ fontSize: 'var(--font-size-xs)' }}>Positive amounts are</label>
                <select
                  id="positiveType"
                  className="form-input form-select"
                  value={positiveType}
                  onChange={(e) => setPositiveType(e.target.value)}
                >
                  <option value="spend">Spends</option>
                  <option value="earning">Earnings</option>
                </select>
              </div>
            )}
          </div>

          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: 'var(--font-size-sm)', marginBottom: '16px', cursor: 'pointer' }}>
            <input type="checkbox" checked={createMissing} onChange={(e) => setCreateMissing(e.target.checked)} />
            Create categories that don&apos;t exist yet (otherwise use &quot;Other&quot;)
          </label>

          <h3 style={{ fontSize: 'var(--font-size-sm)', fontWeight: 700, margin: '0 0 10px' }}>
            Preview{' '}
            <span style={{ fontWeight: 500, color: 'var(--text-secondary)' }}>
              — {validRows.length} ready
              {parsedRows.length - validRows.length > 0 && `, ${parsedRows.length - validRows.length} will be skipped`}
            </span>
          </h3>
          <div style={{ overflowX: 'auto', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-md)' }}>
            <table className="import-preview-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Description</th>
                  <th>Category</th>
                  <th style={{ textAlign: 'right' }}>Amount</th>
                </tr>
              </thead>
              <tbody>
                {parsedRows.slice(0, PREVIEW_LIMIT).map((r, i) => (
                  <tr key={i} className={r.error ? 'invalid' : ''}>
                    <td>{r.date ? formatDate(r.date) : '—'}</td>
                    <td style={{ maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {r.error ? `⚠ ${r.error}` : r.description || '—'}
                    </td>
                    <td>{r.category || '—'}</td>
                    <td
                      className="tabular-nums"
                      style={{ textAlign: 'right', fontWeight: 600, color: r.error ? undefined : r.type === 'earning' ? 'var(--earning)' : 'var(--spend)' }}
                    >
                      {r.amount ? `${r.type === 'earning' ? '+' : '−'}${formatCurrency(r.amount, currency)}` : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {parsedRows.length > PREVIEW_LIMIT && (
            <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)', margin: '8px 0 0' }}>
              …and {parsedRows.length - PREVIEW_LIMIT} more row(s)
            </p>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
            <button type="button" className="btn btn-secondary" onClick={handleClose}>
              Cancel
            </button>
            <button type="button" className="btn btn-primary" onClick={handleImport} disabled={importing || validRows.length === 0}>
              {importing ? 'Importing…' : `Import ${validRows.length} Transaction${validRows.length === 1 ? '' : 's'}`}
            </button>
          </div>
        </>
      )}
    </Modal>
  );
}
