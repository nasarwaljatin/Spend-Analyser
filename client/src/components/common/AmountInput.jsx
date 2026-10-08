import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { IoCalculatorOutline, IoCheckmarkOutline, IoCloseOutline } from 'react-icons/io5';

/**
 * AmountInput — number input with an inline popup calculator.
 * The popup is rendered via a React Portal so it is never clipped by
 * a parent's overflow:hidden / overflow-y:auto (e.g. inside a modal).
 *
 * Props:
 *  id, value, onChange, placeholder, currency, required, disabled
 *
 * `onChange` receives a string (the numeric result).
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
  const [open, setOpen]           = useState(false);
  const [expression, setExpression] = useState('');
  const [preview, setPreview]     = useState('');
  const [error, setError]         = useState(false);
  const [popupStyle, setPopupStyle] = useState({});

  const triggerRef = useRef(null);   // the 🧮 button
  const popupRef   = useRef(null);

  /* ── safe evaluator ─────────────────────────────────── */
  const safeEval = (expr) => {
    try {
      if (!expr || !/^[\d\s+\-*/().%]+$/.test(expr)) return null;
      // eslint-disable-next-line no-new-func
      const result = Function('"use strict"; return (' + expr + ')')();
      if (typeof result !== 'number' || !isFinite(result)) return null;
      return Math.round(result * 100) / 100;
    } catch {
      return null;
    }
  };

  const updatePreview = useCallback((expr) => {
    if (!expr) { setPreview(''); setError(false); return; }
    const r = safeEval(expr);
    if (r === null) { setError(true);  setPreview(''); }
    else            { setError(false); setPreview(String(r)); }
  }, []);

  /* ── position the portal popup near the trigger button ── */
  const calcPopupPosition = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const popupW = 280;
    const popupH = 340; // approx
    const vpW = window.innerWidth;
    const vpH = window.innerHeight;

    let left = rect.left;
    let top  = rect.bottom + 8;

    // Clamp horizontally
    if (left + popupW > vpW - 8) left = vpW - popupW - 8;
    if (left < 8) left = 8;

    // If not enough space below, show above
    if (top + popupH > vpH - 8) {
      top = rect.top - popupH - 8;
    }
    if (top < 8) top = 8;

    setPopupStyle({ position: 'fixed', top, left, width: popupW, zIndex: 99999 });
  }, []);

  /* ── open ────────────────────────────────────────────── */
  const openCalc = () => {
    const seed = String(value || '');
    setExpression(seed);
    updatePreview(seed);
    setOpen(true);
  };

  useEffect(() => {
    if (open) {
      calcPopupPosition();
    }
  }, [open, calcPopupPosition]);

  /* ── button press ────────────────────────────────────── */
  const handleKey = useCallback((key) => {
    setExpression((prev) => {
      let next;
      if (key === 'DEL') {
        next = prev.slice(0, -1);
      } else if (key === 'C') {
        next = '';
      } else if (key === '%') {
        next = prev + '/100';
      } else {
        next = prev + key;
      }
      updatePreview(next);
      return next;
    });
  }, [updatePreview]);

  /* ── apply ───────────────────────────────────────────── */
  const apply = useCallback(() => {
    const result = safeEval(expression);
    if (result !== null && result > 0) {
      onChange(String(result));
      setOpen(false);
    } else if (!expression && value) {
      setOpen(false);
    } else {
      setError(true);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expression, value, onChange]);

  /* ── close on outside pointer/touch event ────────────── */
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      const target = e.target;
      if (
        (popupRef.current   && popupRef.current.contains(target)) ||
        (triggerRef.current && triggerRef.current.contains(target))
      ) return;
      setOpen(false);
    };
    // pointerdown covers both mouse clicks and touch starts
    document.addEventListener('pointerdown', handler, { capture: true });
    return () => document.removeEventListener('pointerdown', handler, { capture: true });
  }, [open]);

  /* ── keyboard shortcuts ──────────────────────────────── */
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (e.key === 'Escape') { setOpen(false); return; }
      if (e.key === 'Enter')  { apply(); return; }
      if (e.key === 'Backspace') { handleKey('DEL'); return; }
      if (/^[\d+\-*/.%()]$/.test(e.key)) { handleKey(e.key); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, apply, handleKey]);

  /* ── reposition on scroll / resize ──────────────────── */
  useEffect(() => {
    if (!open) return;
    const reposition = () => calcPopupPosition();
    window.addEventListener('scroll', reposition, { passive: true, capture: true });
    window.addEventListener('resize', reposition, { passive: true });
    return () => {
      window.removeEventListener('scroll', reposition, { capture: true });
      window.removeEventListener('resize', reposition);
    };
  }, [open, calcPopupPosition]);

  /* ── button layout ───────────────────────────────────── */
  const rows = [
    [{ label: 'C',  key: 'C',   variant: 'danger' }, { label: '(', key: '(' }, { label: ')', key: ')' }, { label: '÷', key: '/',  variant: 'op' }],
    [{ label: '7',  key: '7' },  { label: '8', key: '8' }, { label: '9', key: '9' }, { label: '×', key: '*',  variant: 'op' }],
    [{ label: '4',  key: '4' },  { label: '5', key: '5' }, { label: '6', key: '6' }, { label: '−', key: '-',  variant: 'op' }],
    [{ label: '1',  key: '1' },  { label: '2', key: '2' }, { label: '3', key: '3' }, { label: '+', key: '+',  variant: 'op' }],
    [{ label: '%',  key: '%',  variant: 'op' }, { label: '0', key: '0' }, { label: '.', key: '.' }, { label: '⌫', key: 'DEL', variant: 'del' }],
  ];

  /* ── popup markup (rendered in portal) ──────────────── */
  const popup = open ? createPortal(
    <div
      className="calc-popup"
      ref={popupRef}
      style={popupStyle}
      role="dialog"
      aria-label="Calculator"
      // Prevent clicks inside from bubbling up and triggering the overlay's onClose
      onClick={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
    >
      {/* Display */}
      <div className="calc-display">
        <div className={`calc-expression ${error ? 'calc-expression-error' : ''}`}>
          {expression || <span style={{ opacity: 0.4 }}>Enter a calculation…</span>}
        </div>
        <div className="calc-preview">
          {error
            ? <span style={{ color: 'var(--spend)', fontSize: '12px' }}>Invalid expression</span>
            : preview
              ? <><span style={{ opacity: 0.5, marginRight: 4 }}>=</span><strong>{preview}</strong></>
              : null}
        </div>
      </div>

      {/* Grid */}
      <div className="calc-grid">
        {rows.map((row, ri) =>
          row.map((btn) => (
            <button
              key={`${ri}-${btn.key}`}
              type="button"
              className={`calc-btn calc-btn-${btn.variant || 'num'}`}
              onPointerDown={(e) => { e.stopPropagation(); handleKey(btn.key); }}
              aria-label={btn.label}
            >
              {btn.label}
            </button>
          ))
        )}
      </div>

      {/* Actions */}
      <div className="calc-actions">
        <button
          type="button"
          className="calc-btn-cancel"
          onPointerDown={(e) => { e.stopPropagation(); setOpen(false); }}
          aria-label="Cancel calculator"
        >
          <IoCloseOutline size={16} /> Cancel
        </button>
        <button
          type="button"
          className={`calc-btn-apply ${!preview || error ? 'disabled' : ''}`}
          onPointerDown={(e) => { e.stopPropagation(); apply(); }}
          disabled={!preview || error}
          aria-label="Apply result"
        >
          <IoCheckmarkOutline size={16} /> Use {preview || '—'}
        </button>
      </div>
    </div>,
    document.body
  ) : null;

  return (
    <>
      <div className="calc-wrapper">
        {/* Main input row */}
        <div className="calc-input-row">
          <input
            id={id}
            type="number"
            inputMode="decimal"
            step="any"
            min="0"
            className="form-input calc-input-field"
            placeholder={placeholder}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            required={required}
            disabled={disabled}
          />
          <button
            ref={triggerRef}
            type="button"
            className={`calc-trigger-btn ${open ? 'active' : ''}`}
            onPointerDown={(e) => { e.stopPropagation(); openCalc(); }}
            disabled={disabled}
            title="Open calculator"
            aria-label="Open inline calculator"
            aria-expanded={open}
          >
            <IoCalculatorOutline size={18} />
          </button>
        </div>
      </div>
      {popup}
    </>
  );
}
