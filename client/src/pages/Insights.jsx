import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  IoSpeedometerOutline,
  IoTrendingUp,
  IoTrendingDown,
  IoCalendarOutline,
  IoLeafOutline,
  IoRefreshOutline,
  IoAlertCircleOutline,
  IoCheckmarkCircleOutline,
  IoWarningOutline,
} from 'react-icons/io5';
import { reportService } from '../services/reportService';
import useAuthStore from '../store/authStore';
import useToastStore from '../store/toastStore';
import { formatCurrency } from '../utils/formatCurrency';
import { formatDate, formatDateShort, getMonthName } from '../utils/formatDate';
import Loader from '../components/common/Loader';

const TIP_STYLES = {
  success: { color: 'var(--earning)', icon: <IoCheckmarkCircleOutline size={18} /> },
  warning: { color: 'var(--warning)', icon: <IoWarningOutline size={18} /> },
  danger: { color: 'var(--spend)', icon: <IoAlertCircleOutline size={18} /> },
};

const sectionTitle = { fontSize: 'var(--font-size-lg)', fontWeight: 700, margin: '0 0 16px' };
const mutedText = { fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)' };
const rowStyle = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: '12px',
  padding: '10px 0',
  borderBottom: '1px solid var(--border-light)',
};

export default function Insights() {
  const { user } = useAuthStore();
  const { addToast } = useToastStore();
  const currency = user?.preferredCurrency || 'INR';

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchInsights();
  }, []);

  const fetchInsights = async () => {
    setLoading(true);
    try {
      const res = await reportService.getInsights();
      setData(res.data);
    } catch (err) {
      console.error('Error loading insights', err);
      addToast({ type: 'error', message: 'Failed to load insights' });
    } finally {
      setLoading(false);
    }
  };

  if (loading || !data) {
    return (
      <div className="page-content">
        <div style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}>
          {loading ? <Loader size={48} /> : <p>No insights available.</p>}
        </div>
      </div>
    );
  }

  const pace = data.paceChangePercent;
  const monthName = getMonthName(data.period.month);
  const monthProgress = Math.round((data.period.dayOfMonth / data.period.daysInMonth) * 100);

  return (
    <div className="page-content">
      <div className="page-header-row">
        <div className="page-header-title-group">
          <h1>Smart Insights</h1>
          <p>
            Where your money is going in {monthName} — day {data.period.dayOfMonth} of {data.period.daysInMonth}
          </p>
        </div>
        <div className="page-header-actions">
          <button onClick={fetchInsights} className="btn btn-secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <IoRefreshOutline size={18} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Tips */}
      {data.tips.length > 0 && (
        <div className="card" style={{ marginBottom: '24px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {data.tips.map((tip, i) => {
            const style = TIP_STYLES[tip.level] || TIP_STYLES.warning;
            return (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: 'var(--font-size-sm)' }}>
                <span style={{ color: style.color, display: 'inline-flex', flexShrink: 0 }}>{style.icon}</span>
                <span>{tip.text}</span>
              </div>
            );
          })}
        </div>
      )}

      {/* KPI cards */}
      <div className="summary-cards">
        <div className="card summary-card spend">
          <div className="summary-card-icon">{pace !== null && pace < 0 ? <IoTrendingDown /> : <IoTrendingUp />}</div>
          <div className="summary-card-label">Spent So Far</div>
          <div className="summary-card-value" style={{ color: 'var(--spend)' }}>
            {formatCurrency(data.monthToDateSpend, currency)}
          </div>
          <div className={`summary-card-change ${pace !== null && pace > 0 ? 'negative' : 'positive'}`}>
            {pace === null
              ? 'No data for last month'
              : `${pace > 0 ? '↑' : '↓'} ${Math.abs(pace)}% vs same day last month`}
          </div>
        </div>

        <div className="card summary-card rate">
          <div className="summary-card-icon"><IoSpeedometerOutline /></div>
          <div className="summary-card-label">Projected Month-End</div>
          <div className="summary-card-value" style={{ color: 'var(--primary)' }}>
            {formatCurrency(data.projectedMonthSpend, currency)}
          </div>
          <div className="summary-card-change positive">
            Last month: {formatCurrency(data.prevMonthTotalSpend, currency)}
          </div>
        </div>

        <div className="card summary-card savings">
          <div className="summary-card-icon"><IoCalendarOutline /></div>
          <div className="summary-card-label">Avg. Daily Spend</div>
          <div className="summary-card-value" style={{ color: 'var(--savings)' }}>
            {formatCurrency(data.avgDailySpend, currency)}
          </div>
          <div className="summary-card-change positive">{monthProgress}% of the month gone</div>
        </div>

        <div className="card summary-card earning">
          <div className="summary-card-icon"><IoLeafOutline /></div>
          <div className="summary-card-label">No-Spend Days</div>
          <div className="summary-card-value" style={{ color: 'var(--earning)' }}>
            {data.noSpendDays}
          </div>
          <div className="summary-card-change positive">
            out of {data.period.dayOfMonth} day{data.period.dayOfMonth === 1 ? '' : 's'} so far
          </div>
        </div>
      </div>

      <div className="charts-grid">
        {/* Category movers */}
        <div className="card">
          <h2 style={sectionTitle}>Category Changes vs Last Month</h2>
          {data.categoryMovers.length === 0 ? (
            <p style={mutedText}>Not enough data to compare yet.</p>
          ) : (
            data.categoryMovers.map((c) => {
              const up = c.change > 0;
              return (
                <div key={c.categoryId} style={rowStyle}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                    <span style={{ fontSize: '1.25rem' }}>{c.icon}</span>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: 'var(--font-size-sm)' }}>{c.name}</div>
                      <div style={mutedText}>
                        {formatCurrency(c.previous, currency)} → {formatCurrency(c.current, currency)}
                      </div>
                    </div>
                  </div>
                  <span
                    className="tabular-nums"
                    style={{ fontWeight: 700, fontSize: 'var(--font-size-sm)', color: up ? 'var(--spend)' : 'var(--earning)', whiteSpace: 'nowrap' }}
                  >
                    {up ? '+' : '−'}{formatCurrency(Math.abs(c.change), currency)}
                    {c.changePercent !== null && ` (${up ? '+' : ''}${c.changePercent}%)`}
                  </span>
                </div>
              );
            })
          )}
        </div>

        {/* Upcoming bills */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <h2 style={sectionTitle}>Upcoming Bills (14 days)</h2>
            {data.upcomingBillsTotal > 0 && (
              <span style={{ fontWeight: 700, color: 'var(--spend)' }} className="tabular-nums">
                {formatCurrency(data.upcomingBillsTotal, currency)}
              </span>
            )}
          </div>
          {data.upcomingBills.length === 0 ? (
            <p style={mutedText}>
              Nothing due soon. <Link to="/recurring">Manage recurring payments →</Link>
            </p>
          ) : (
            data.upcomingBills.map((b) => (
              <div key={b.id} style={rowStyle}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                  <span style={{ fontSize: '1.25rem' }}>{b.category?.icon || '🔁'}</span>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 'var(--font-size-sm)' }}>{b.description}</div>
                    <div style={{ ...mutedText, color: b.isOverdue ? 'var(--spend)' : mutedText.color }}>
                      {b.isOverdue ? 'Overdue · ' : ''}{formatDateShort(b.nextDueDate)} · {b.frequency}
                    </div>
                  </div>
                </div>
                <span
                  className="tabular-nums"
                  style={{ fontWeight: 700, fontSize: 'var(--font-size-sm)', color: b.type === 'earning' ? 'var(--earning)' : 'var(--text-primary)' }}
                >
                  {b.type === 'earning' ? '+' : ''}{formatCurrency(b.amount, currency)}
                </span>
              </div>
            ))
          )}
        </div>

        {/* Top merchants */}
        <div className="card">
          <h2 style={sectionTitle}>Where You Spend Most (90 days)</h2>
          {data.topMerchants.length === 0 ? (
            <p style={mutedText}>No spending recorded in the last 90 days.</p>
          ) : (
            data.topMerchants.map((m) => (
              <div key={m.name} style={rowStyle}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                  <span style={{ fontSize: '1.25rem' }}>{m.icon}</span>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 'var(--font-size-sm)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {m.name}
                    </div>
                    <div style={mutedText}>
                      {m.count} time{m.count === 1 ? '' : 's'} · avg {formatCurrency(m.avg, currency)}
                    </div>
                  </div>
                </div>
                <span className="tabular-nums" style={{ fontWeight: 700, fontSize: 'var(--font-size-sm)' }}>
                  {formatCurrency(m.total, currency)}
                </span>
              </div>
            ))
          )}
        </div>

        {/* Biggest spend */}
        <div className="card">
          <h2 style={sectionTitle}>Biggest Spend This Month</h2>
          {data.biggestSpend ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div
                className="category-icon-wrapper"
                style={{
                  backgroundColor: `${data.biggestSpend.category?.color || '#6366f1'}20`,
                  border: `1px solid ${data.biggestSpend.category?.color || '#6366f1'}40`,
                }}
              >
                {data.biggestSpend.category?.icon || '💸'}
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 800, color: 'var(--spend)' }} className="tabular-nums">
                  {formatCurrency(data.biggestSpend.amount, currency)}
                </div>
                <div style={{ fontWeight: 600 }}>{data.biggestSpend.description}</div>
                <div style={mutedText}>
                  {data.biggestSpend.category?.name} · {formatDate(data.biggestSpend.date)}
                </div>
              </div>
            </div>
          ) : (
            <p style={mutedText}>No spends recorded this month yet. 🎉</p>
          )}
        </div>
      </div>
    </div>
  );
}
