import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import {
  IoChevronBack,
  IoChevronForward,
  IoAddOutline,
  IoRepeatOutline,
  IoTodayOutline,
} from 'react-icons/io5';
import { reportService } from '../services/reportService';
import useAuthStore from '../store/authStore';
import useToastStore from '../store/toastStore';
import { formatCurrency, formatCompactCurrency } from '../utils/formatCurrency';
import { formatTime, getMonthName } from '../utils/formatDate';
import Loader from '../components/common/Loader';

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const MODES = [
  { value: 'spend', label: 'Spent' },
  { value: 'earning', label: 'Earned' },
  { value: 'net', label: 'Net' },
];

// Tight amounts for small calendar cells: ₹24.0K -> ₹24K
const compact = (value, currency) => formatCompactCurrency(value, currency).replace(/\.0(?=[KLC])/, '');

const pad = (n) => String(n).padStart(2, '0');
const dayKey = (date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

// Mirrors the server's schedule maths so upcoming recurring items can be
// projected onto future days of the month.
const nextOccurrence = (date, frequency, anchorDay) => {
  const d = new Date(date);
  if (frequency === 'daily') d.setDate(d.getDate() + 1);
  else if (frequency === 'weekly') d.setDate(d.getDate() + 7);
  else {
    const months = frequency === 'monthly' ? 1 : 12;
    const target = new Date(d.getFullYear(), d.getMonth() + months, 1);
    const lastDay = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
    target.setDate(Math.min(anchorDay, lastDay));
    target.setHours(d.getHours(), d.getMinutes());
    return target;
  }
  return d;
};

// Same rule as the server: follow the due day, undoing month-end clamping
const getAnchorDay = (startDate, dueDate) => {
  const start = new Date(startDate).getDate();
  const due = new Date(dueDate);
  const lastDay = new Date(due.getFullYear(), due.getMonth() + 1, 0).getDate();
  return due.getDate() === lastDay && start > due.getDate() ? start : due.getDate();
};

export default function Calendar() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { addToast } = useToastStore();
  const currency = user?.preferredCurrency || 'INR';

  const today = new Date();
  const [cursor, setCursor] = useState({ year: today.getFullYear(), month: today.getMonth() });
  const [mode, setMode] = useState('spend');
  const [selectedKey, setSelectedKey] = useState(dayKey(today));
  const [data, setData] = useState({ transactions: [], recurring: [] });
  const [loading, setLoading] = useState(true);

  const monthStart = useMemo(() => new Date(cursor.year, cursor.month, 1), [cursor]);
  const monthEnd = useMemo(() => new Date(cursor.year, cursor.month + 1, 0, 23, 59, 59, 999), [cursor]);
  const daysInMonth = monthEnd.getDate();

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const res = await reportService.getDaily(monthStart.toISOString(), monthEnd.toISOString());
        if (!cancelled) setData(res.data || { transactions: [], recurring: [] });
      } catch (err) {
        console.error('Error loading calendar', err);
        if (!cancelled) addToast({ type: 'error', message: 'Failed to load calendar data' });
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [monthStart, monthEnd, addToast]);

  // Group transactions + projected recurring items by local day
  const days = useMemo(() => {
    const map = {};
    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(cursor.year, cursor.month, d);
      map[dayKey(date)] = { date, key: dayKey(date), spend: 0, earning: 0, items: [], scheduled: [] };
    }

    data.transactions.forEach((t) => {
      const day = map[dayKey(new Date(t.transactionDate))];
      if (!day) return;
      day[t.type === 'earning' ? 'earning' : 'spend'] += t.amount;
      day.items.push(t);
    });

    const now = new Date();
    data.recurring.forEach((r) => {
      const anchorDay = getAnchorDay(r.startDate, r.nextDueDate);
      const end = r.endDate ? new Date(r.endDate) : null;
      let due = new Date(r.nextDueDate);
      let guard = 0;
      while (due <= monthEnd && guard++ < 400) {
        if (end && due > end) break;
        if (due >= monthStart && due >= now) {
          const day = map[dayKey(due)];
          if (day) day.scheduled.push(r);
        }
        due = nextOccurrence(due, r.frequency, anchorDay);
      }
    });

    return map;
  }, [data, cursor, daysInMonth, monthStart, monthEnd]);

  const dayList = useMemo(() => Object.values(days), [days]);

  const stats = useMemo(() => {
    const spend = dayList.reduce((s, d) => s + d.spend, 0);
    const earning = dayList.reduce((s, d) => s + d.earning, 0);
    const isCurrentMonth = cursor.year === today.getFullYear() && cursor.month === today.getMonth();
    const isFuture = monthStart > today;
    const elapsed = isFuture ? 0 : isCurrentMonth ? today.getDate() : daysInMonth;
    const pastDays = dayList.slice(0, elapsed);
    const topDay = dayList.reduce((max, d) => (d.spend > (max?.spend || 0) ? d : max), null);
    const scheduledSpend = dayList.reduce(
      (s, d) => s + d.scheduled.filter((r) => r.type === 'spend').reduce((a, r) => a + r.amount, 0),
      0
    );

    // Longest streak of consecutive no-spend days so far
    let streak = 0;
    let best = 0;
    pastDays.forEach((d) => {
      streak = d.spend === 0 ? streak + 1 : 0;
      best = Math.max(best, streak);
    });

    return {
      spend,
      earning,
      net: earning - spend,
      avgSpend: elapsed > 0 ? spend / elapsed : 0,
      noSpendDays: pastDays.filter((d) => d.spend === 0).length,
      bestStreak: best,
      topDay,
      scheduledSpend,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dayList, cursor, daysInMonth, monthStart]);

  const maxValue = useMemo(() => {
    const values = dayList.map((d) =>
      mode === 'spend' ? d.spend : mode === 'earning' ? d.earning : Math.abs(d.earning - d.spend)
    );
    return Math.max(1, ...values);
  }, [dayList, mode]);

  const weekdayAverages = useMemo(() => {
    const totals = WEEKDAYS.map((label) => ({ label, total: 0, count: 0 }));
    dayList.forEach((d) => {
      if (d.date > today) return;
      const idx = (d.date.getDay() + 6) % 7;
      totals[idx].total += d.spend;
      totals[idx].count += 1;
    });
    const rows = totals.map((t) => ({ ...t, avg: t.count ? t.total / t.count : 0 }));
    const max = Math.max(1, ...rows.map((r) => r.avg));
    return rows.map((r) => ({ ...r, pct: (r.avg / max) * 100 }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dayList]);

  const chartData = useMemo(() => {
    let running = 0;
    return dayList.map((d) => {
      running += d.earning - d.spend;
      return { day: d.date.getDate(), Spent: d.spend, Earned: d.earning, 'Running net': running };
    });
  }, [dayList]);

  const leadingBlanks = (monthStart.getDay() + 6) % 7;
  const selected = days[selectedKey];

  const shiftMonth = (delta) => {
    const next = new Date(cursor.year, cursor.month + delta, 1);
    setCursor({ year: next.getFullYear(), month: next.getMonth() });
    const isThisMonth = next.getFullYear() === today.getFullYear() && next.getMonth() === today.getMonth();
    setSelectedKey(dayKey(isThisMonth ? today : next));
  };

  const goToday = () => {
    setCursor({ year: today.getFullYear(), month: today.getMonth() });
    setSelectedKey(dayKey(today));
  };

  const cellIntensity = (d) => {
    const value = mode === 'spend' ? d.spend : mode === 'earning' ? d.earning : d.earning - d.spend;
    if (!value) return null;
    const strength = 0.12 + 0.6 * Math.min(1, Math.abs(value) / maxValue);
    const rgb = mode === 'spend' || (mode === 'net' && value < 0) ? '244, 63, 94' : '16, 217, 160';
    return `rgba(${rgb}, ${strength.toFixed(2)})`;
  };

  return (
    <div className="page-content">
      <div className="page-header-row">
        <div className="page-header-title-group">
          <h1>Money Calendar</h1>
          <p>Day-by-day view of what you spent, earned and what&apos;s coming up</p>
        </div>
        <div className="page-header-actions">
          <div className="segmented" role="radiogroup" aria-label="Heatmap mode">
            {MODES.map((m) => (
              <button
                key={m.value}
                type="button"
                role="radio"
                aria-checked={mode === m.value}
                className={`segmented-btn ${mode === m.value ? 'active' : ''}`}
                onClick={() => setMode(m.value)}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Month stats */}
      <div className="cal-stats">
        <div className="cal-stat">
          <span className="cal-stat-label">Earned</span>
          <span className="cal-stat-value" style={{ color: 'var(--earning)' }}>{formatCurrency(stats.earning, currency)}</span>
        </div>
        <div className="cal-stat">
          <span className="cal-stat-label">Spent</span>
          <span className="cal-stat-value" style={{ color: 'var(--spend)' }}>{formatCurrency(stats.spend, currency)}</span>
        </div>
        <div className="cal-stat">
          <span className="cal-stat-label">Net</span>
          <span className="cal-stat-value" style={{ color: stats.net >= 0 ? 'var(--earning)' : 'var(--spend)' }}>
            {stats.net >= 0 ? '+' : '−'}{formatCurrency(Math.abs(stats.net), currency)}
          </span>
        </div>
        <div className="cal-stat">
          <span className="cal-stat-label">Avg spend / day</span>
          <span className="cal-stat-value">{formatCurrency(stats.avgSpend, currency)}</span>
        </div>
        <div className="cal-stat">
          <span className="cal-stat-label">No-spend days</span>
          <span className="cal-stat-value">
            {stats.noSpendDays}
            <small> · best streak {stats.bestStreak}</small>
          </span>
        </div>
        <div className="cal-stat">
          <span className="cal-stat-label">Scheduled bills</span>
          <span className="cal-stat-value" style={{ color: 'var(--warning)' }}>{formatCurrency(stats.scheduledSpend, currency)}</span>
        </div>
      </div>

      <div className="cal-layout">
        {/* Calendar grid */}
        <div className="card cal-card">
          <div className="cal-toolbar">
            <button type="button" className="btn btn-ghost btn-icon" onClick={() => shiftMonth(-1)} aria-label="Previous month">
              <IoChevronBack size={20} />
            </button>
            <h2 className="cal-month-title">
              {getMonthName(cursor.month + 1)} <span>{cursor.year}</span>
            </h2>
            <button type="button" className="btn btn-ghost btn-icon" onClick={() => shiftMonth(1)} aria-label="Next month">
              <IoChevronForward size={20} />
            </button>
            <button type="button" className="btn btn-secondary btn-sm" onClick={goToday} style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <IoTodayOutline size={16} /> Today
            </button>
          </div>

          <div className="cal-grid cal-weekdays">
            {WEEKDAYS.map((w) => (
              <div key={w} className="cal-weekday">{w}</div>
            ))}
          </div>

          <div className="cal-grid" style={{ opacity: loading ? 0.5 : 1 }}>
            {Array.from({ length: leadingBlanks }).map((_, i) => (
              <div key={`blank-${i}`} className="cal-cell cal-cell-blank" />
            ))}
            {dayList.map((d) => {
              const isToday = d.key === dayKey(today);
              const isFuture = d.date > today && !isToday;
              const bg = cellIntensity(d);
              const dots = [...new Map(d.items.map((t) => [t.category?.color, t])).keys()].slice(0, 4);
              const scheduledTotal = d.scheduled.reduce((sum, r) => sum + (r.type === 'earning' ? r.amount : -r.amount), 0);
              return (
                <button
                  key={d.key}
                  type="button"
                  className={`cal-cell ${isToday ? 'today' : ''} ${selectedKey === d.key ? 'selected' : ''} ${isFuture ? 'future' : ''} ${d.scheduled.length ? 'has-scheduled' : ''}`}
                  style={bg ? { '--cell-heat': bg } : undefined}
                  onClick={() => setSelectedKey(d.key)}
                  aria-label={`${d.date.toDateString()}: spent ${d.spend}, earned ${d.earning}`}
                >
                  <span className="cal-day-num">{d.date.getDate()}</span>
                  <span className="cal-amounts">
                    {d.earning > 0 && <span className="cal-amt earn">+{compact(d.earning, currency)}</span>}
                    {d.spend > 0 && <span className="cal-amt spend">−{compact(d.spend, currency)}</span>}
                    {d.scheduled.length > 0 && (
                      <span className="cal-amt sched">
                        {scheduledTotal >= 0 ? '+' : '−'}{compact(Math.abs(scheduledTotal), currency)}
                      </span>
                    )}
                  </span>
                  <span className="cal-cell-footer">
                    {dots.map((color) => (
                      <i key={color || 'none'} className="cal-dot" style={{ background: color || 'var(--primary)' }} />
                    ))}
                    {d.scheduled.length > 0 && <IoRepeatOutline className="cal-scheduled" size={12} />}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="cal-legend">
            <span>Less</span>
            {[0.15, 0.3, 0.5, 0.72].map((a) => (
              <i
                key={a}
                style={{ background: `rgba(${mode === 'earning' ? '16, 217, 160' : '244, 63, 94'}, ${a})` }}
              />
            ))}
            <span>More</span>
            <span style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <IoRepeatOutline size={12} /> scheduled
            </span>
          </div>
        </div>

        {/* Selected day panel */}
        <div className="card cal-day-panel">
          {selected ? (
            <>
              <div className="cal-day-head">
                <div>
                  <div className="cal-day-weekday">
                    {selected.date.toLocaleDateString('en-IN', { weekday: 'long' })}
                  </div>
                  <div className="cal-day-date">
                    {selected.date.toLocaleDateString('en-IN', { day: 'numeric', month: 'long' })}
                  </div>
                </div>
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={() => navigate(`/transactions?action=new&date=${selected.key}`)}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                >
                  <IoAddOutline size={16} /> Add
                </button>
              </div>

              <div className="cal-day-totals">
                <div>
                  <span>Earned</span>
                  <strong style={{ color: 'var(--earning)' }}>{formatCurrency(selected.earning, currency)}</strong>
                </div>
                <div>
                  <span>Spent</span>
                  <strong style={{ color: 'var(--spend)' }}>{formatCurrency(selected.spend, currency)}</strong>
                </div>
                <div>
                  <span>Net</span>
                  <strong style={{ color: selected.earning - selected.spend >= 0 ? 'var(--earning)' : 'var(--spend)' }}>
                    {formatCurrency(selected.earning - selected.spend, currency)}
                  </strong>
                </div>
              </div>

              <div className="cal-day-list">
                {selected.items.length === 0 && selected.scheduled.length === 0 && (
                  <div className="cal-day-empty">
                    {selected.date > today ? 'Nothing scheduled for this day.' : 'No transactions — a no-spend day! 🌱'}
                  </div>
                )}
                {selected.items.map((t) => (
                  <div key={t.id} className="cal-day-item">
                    <span className="cal-day-item-icon" style={{ '--chip-color': t.category?.color || '#6366f1' }}>
                      {t.category?.icon || '💸'}
                    </span>
                    <div className="cal-day-item-body">
                      <div className="cal-day-item-title">
                        {t.description}
                        {t.isRecurring && <IoRepeatOutline size={12} style={{ marginLeft: 4, opacity: 0.7 }} />}
                      </div>
                      <div className="cal-day-item-meta">{t.category?.name} · {formatTime(t.transactionDate)}</div>
                    </div>
                    <span className={`cal-day-item-amt ${t.type}`}>
                      {t.type === 'earning' ? '+' : '−'}{formatCurrency(t.amount, currency)}
                    </span>
                  </div>
                ))}
                {selected.scheduled.map((r) => (
                  <div key={`s-${r.id}`} className="cal-day-item scheduled">
                    <span className="cal-day-item-icon" style={{ '--chip-color': r.category?.color || '#6366f1' }}>
                      {r.category?.icon || '🔁'}
                    </span>
                    <div className="cal-day-item-body">
                      <div className="cal-day-item-title">{r.description}</div>
                      <div className="cal-day-item-meta">Scheduled · repeats {r.frequency}</div>
                    </div>
                    <span className={`cal-day-item-amt ${r.type}`}>
                      {r.type === 'earning' ? '+' : '−'}{formatCurrency(r.amount, currency)}
                    </span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="cal-day-empty">Select a day</div>
          )}
        </div>
      </div>

      {loading && dayList.every((d) => d.items.length === 0) ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '24px' }}>
          <Loader size={32} />
        </div>
      ) : (
        <div className="charts-grid">
          <div className="card chart-card">
            <h2 className="chart-title">Daily Flow · {getMonthName(cursor.month + 1)}</h2>
            <ResponsiveContainer width="100%" height={260}>
              <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-light)" vertical={false} />
                <XAxis dataKey="day" tick={{ fill: 'var(--text-tertiary)', fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis tickFormatter={(v) => formatCompactCurrency(v, currency)} tick={{ fill: 'var(--text-tertiary)', fontSize: 11 }} tickLine={false} axisLine={false} width={60} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--bg-modal)',
                    borderColor: 'var(--border)',
                    borderRadius: '12px',
                    color: 'var(--text-primary)',
                  }}
                  labelFormatter={(d) => `${d} ${getMonthName(cursor.month + 1)}`}
                  formatter={(val, name) => [formatCurrency(val, currency), name]}
                />
                <Bar dataKey="Earned" fill="var(--earning)" radius={[4, 4, 0, 0]} maxBarSize={14} />
                <Bar dataKey="Spent" fill="var(--spend)" radius={[4, 4, 0, 0]} maxBarSize={14} />
                <Line type="monotone" dataKey="Running net" stroke="var(--primary-light)" strokeWidth={2} dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          <div className="card chart-card">
            <h2 className="chart-title">Average Spend by Weekday</h2>
            <div className="weekday-bars">
              {weekdayAverages.map((w) => (
                <div key={w.label} className="weekday-bar-row">
                  <span className="weekday-bar-label">{w.label}</span>
                  <div className="weekday-bar-track">
                    <div className="weekday-bar-fill" style={{ width: `${w.pct}%` }} />
                  </div>
                  <span className="weekday-bar-value">{formatCompactCurrency(w.avg, currency)}</span>
                </div>
              ))}
            </div>
            {stats.topDay && stats.topDay.spend > 0 && (
              <p className="weekday-footnote">
                Heaviest day: <strong>{stats.topDay.date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</strong> with{' '}
                <strong style={{ color: 'var(--spend)' }}>{formatCurrency(stats.topDay.spend, currency)}</strong> spent.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
