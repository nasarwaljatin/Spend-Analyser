import { useState, useRef, useEffect, useCallback } from 'react';
import { IoCalculatorOutline, IoCheckmarkOutline, IoCloseOutline } from 'react-icons/io5';

/**
 * AmountInput — a regular number input with an inline popup calculator.
 *
 * Props:
 *  id, value, onChange, placeholder, currency, required, disabled
 *
 * `onChange` receives a string (the numeric string), matching the native <input> event pattern.
 */
export default function AmountInput({
  id = 'amount',
  value = '',
  onChange,
  placeholder = 'e.g. 450.00',
  currency = 'INR',
  required = false,
  disabled = false,
}) {
  const [open, setOpen] = useState(false);
  const [expression, setExpression] = useState('');   // current expression string
  const [preview, setPreview] = useState('');          // evaluated preview
  const [error, setError] = useState(false);
  const popupRef = useRef(null);
  const inputRef = useRef(null);

  /* ── helpers ─────────────────────────────────────────────── */
  const safeEval = (expr) => {
    try {
      // Only allow digits, operators, dots, parens, spaces
      if (!/^[\d\s+\-*/().%]+$/.test(expr)) return null;
      // eslint-disable-next-line no-new-func
      const result = Function('"use strict"; return (' + expr + ')')();
      if (typeof result !== 'number' || !isFinite(result)) return null;
      return Math.round(result * 100) / 100;   // round to 2 dp
    } catch {
      return null;
    }
  };

  const updatePreview = useCallback((expr) => {
    if (!expr) { setPreview(''); setError(false); return; }
    const r = safeEval(expr);
    if (r === null) { setError(true); setPreview(''); }
    else { setError(false); setPreview(String(r)); }
  }, []);

  /* ── open calc: seed expression from current value ────────── */
  const openCalc = () => {
    const seed = String(value || '');
    setExpression(seed);
    updatePreview(seed);
    setOpen(true);
  };

  /* ── button press logic ────────────────────────────────────── */
  const handleKey = (key) => {
    setExpression((prev) => {
      let next;
      if (key === 'DEL') {
        next = prev.slice(0, -1);
      } else if (key === 'C') {
        next = '';
      } else if (key === '%') {
        // append /100
        next = prev + '/100';
      } else {
        next = prev + key;
      }
      updatePreview(next);
      return next;
    });
  };

  /* ── apply result ──────────────────────────────────────────── */
  const apply = () => {
    const result = safeEval(expression);
    if (result !== null && result > 0) {
      onChange(String(result));
      setOpen(false);
    } else if (!expression && value) {
      setOpen(false);
    } else {
      setError(true);
    }
  };

  /* ── close on outside click ────────────────────────────────── */
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (popupRef.current && !popupRef.current.contains(e.target) &&
          inputRef.current && !inputRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  /* ── keyboard support inside popup ────────────────────────── */
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (e.key === 'Escape') { setOpen(false); return; }
      if (e.key === 'Enter') { apply(); return; }
      if (e.key === 'Backspace') { handleKey('DEL'); return; }
      if (/^[\d+\-*/.%()]$/.test(e.key)) { handleKey(e.key); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, expression]);

  /* ── layout of buttons ─────────────────────────────────────── */
  const rows = [
    [{ label: 'C', key: 'C', variant: 'danger' }, { label: '(', key: '(' }, { label: ')', key: ')' }, { label: '÷', key: '/' }],
    [{ label: '7', key: '7' }, { label: '8', key: '8' }, { label: '9', key: '9' }, { label: '×', key: '*', variant: 'op' }],
    [{ label: '4', key: '4' }, { label: '5', key: '5' }, { label: '6', key: '6' }, { label: '−', key: '-', variant: 'op' }],
    [{ label: '1', key: '1' }, { label: '2', key: '2' }, { label: '3', key: '3' }, { label: '+', key: '+', variant: 'op' }],
    [{ label: '%', key: '%', variant: 'op' }, { label: '0', key: '0' }, { label: '.', key: '.' }, { label: '⌫', key: 'DEL', variant: 'del' }],
  ];

  return (
    <div className="calc-wrapper" ref={inputRef}>
      {/* ── main input row ─────────────────────────── */}
      <div className="calc-input-row">
        <input
          id={id}
          type="number"
          step="any"
          min="0"
          className="form-input calc-input-field"
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required={required}
          disabled={disabled}
          onFocus={() => !open && undefined}
        />
        <button
          type="button"
          className={`calc-trigger-btn ${open ? 'active' : ''}`}
          onClick={openCalc}
          disabled={disabled}
          title="Open calculator"
          aria-label="Open inline calculator"
        >
          <IoCalculatorOutline size={18} />
        </button>
      </div>

      {/* ── popup calculator ───────────────────────── */}
      {open && (
        <div className="calc-popup" ref={popupRef} role="dialog" aria-label="Calculator">
          {/* Display */}
          <div className="calc-display">
            <div className={`calc-expression ${error ? 'calc-expression-error' : ''}`}>
              {expression || <span style={{ opacity: 0.4 }}>Enter calculation…</span>}
            </div>
            <div className="calc-preview">
              {error
                ? <span style={{ color: 'var(--spend)', fontSize: '12px' }}>Invalid expression</span>
                : preview
                  ? <><span style={{ opacity: 0.5, marginRight: 4 }}>=</span><strong>{preview}</strong></>
                  : null}
            </div>
          </div>

          {/* Buttons grid */}
          <div className="calc-grid">
            {rows.map((row, ri) =>
              row.map((btn) => (
                <button
                  key={`${ri}-${btn.key}`}
                  type="button"
                  className={`calc-btn calc-btn-${btn.variant || 'num'}`}
                  onClick={() => handleKey(btn.key)}
                  aria-label={btn.label}
                >
                  {btn.label}
                </button>
              ))
            )}
          </div>

          {/* Action row */}
          <div className="calc-actions">
            <button
              type="button"
              className="calc-btn-cancel"
              onClick={() => setOpen(false)}
              aria-label="Cancel calculator"
            >
              <IoCloseOutline size={16} /> Cancel
            </button>
            <button
              type="button"
              className={`calc-btn-apply ${!preview || error ? 'disabled' : ''}`}
              onClick={apply}
              disabled={!preview || error}
              aria-label="Apply result"
            >
              <IoCheckmarkOutline size={16} /> Use {preview || '—'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
