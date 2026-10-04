import { useState, useEffect, useMemo } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  LineChart,
  Line,
  AreaChart,
  Area,
  RadialBarChart,
  RadialBar,
  ComposedChart,
  ReferenceLine,
} from 'recharts';
import {
  IoDownloadOutline,
  IoTrendingUp,
  IoTrendingDown,
  IoCashOutline,
  IoStatsChartOutline,
  IoFlameOutline,
  IoBarChartOutline,
  IoLayersOutline,
  IoCalendarOutline,
} from 'react-icons/io5';
import { reportService, exportService } from '../services/reportService';
import useAuthStore from '../store/authStore';
import useToastStore from '../store/toastStore';
import { formatCurrency } from '../utils/formatCurrency';
import { formatDate } from '../utils/formatDate';
import { exportToExcel } from '../utils/exportToExcel';
import Loader from '../components/common/Loader';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const MONTH_ABBR = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const COLORS = [
  '#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
  '#ec4899', '#06b6d4', '#14b8a6', '#f97316', '#3b82f6',
];

const CHART_TOOLTIP_STYLE = {
  backgroundColor: 'var(--bg-card)',
  borderColor: 'var(--border)',
  borderRadius: '10px',
  color: 'var(--text-primary)',
  boxShadow: 'var(--shadow-md)',
};

// Custom tooltip for heatmap
function HeatmapTooltip({ day, total, count, avgPerTx, currency }) {
  if (!total && !count) return null;
  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 14px', fontSize: 13 }}>
      <div style={{ fontWeight: 700, marginBottom: 4 }}>{day}</div>
      <div>Total: <strong>{formatCurrency(total, currency)}</strong></div>
      <div>Transactions: <strong>{count}</strong></div>
      {count > 0 && <div>Avg/tx: <strong>{formatCurrency(avgPerTx, currency)}</strong></div>}
    </div>
  );
}

// Day-of-week heatmap bar visual
function SpendHeatmap({ heatmapData, currency }) {
  const maxTotal = Math.max(...heatmapData.map((d) => d.total), 1);
  return (
    <div className="heatmap-row">
      {heatmapData.map((d, i) => {
        const intensity = d.total / maxTotal;
        const bg = d.total === 0
          ? 'var(--bg-secondary)'
          : `rgba(99, 102, 241, ${0.15 + intensity * 0.75})`;
        return (
          <div key={d.day} className="heatmap-cell-wrapper" title={`${d.day}: ${formatCurrency(d.total, currency)} (${d.count} tx)`}>
            <div
              className="heatmap-cell"
              style={{ '--intensity': intensity, background: bg }}
            >
              <div className="heatmap-bar" style={{ height: `${Math.max(4, intensity * 100)}%`, background: bg }} />
            </div>
            <div className="heatmap-label">{d.day}</div>
            <div className="heatmap-amount">{d.count > 0 ? formatCurrency(d.total, currency) : '—'}</div>
          </div>
        );
      })}
    </div>
  );
}

// Savings rate gauge ring
function SavingsGauge({ rate }) {
  const clamp = Math.min(100, Math.max(0, rate));
  const circumference = 2 * Math.PI * 54;
  const dash = (clamp / 100) * circumference;
  const color = clamp >= 30 ? '#10b981' : clamp >= 15 ? '#f59e0b' : '#ef4444';
  return (
    <div className="gauge-wrapper">
      <svg viewBox="0 0 120 120" width="140" height="140">
        <circle cx="60" cy="60" r="54" fill="none" stroke="var(--border)" strokeWidth="10" />
        <circle
          cx="60" cy="60" r="54" fill="none"
          stroke={color} strokeWidth="10"
          strokeDasharray={`${dash} ${circumference - dash}`}
          strokeLinecap="round"
          transform="rotate(-90 60 60)"
          style={{ transition: 'stroke-dasharray 1s ease' }}
        />
        <text x="60" y="56" textAnchor="middle" fontSize="22" fontWeight="800" fill={color}>{clamp}%</text>
        <text x="60" y="72" textAnchor="middle" fontSize="10" fill="var(--text-tertiary)">Saved</text>
      </svg>
      <div className="gauge-label" style={{ color }}>
        {clamp >= 30 ? '🔥 Great Saver!' : clamp >= 15 ? '👍 On Track' : '⚠️ Save More'}
      </div>
    </div>
  );
}

// MoM % change custom bar
function MoMBar({ value }) {
  const positive = value >= 0;
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      color: positive ? 'var(--earning)' : 'var(--spend)',
      fontWeight: 700, fontSize: 13,
    }}>
      {positive ? '↑' : '↓'} {Math.abs(value).toFixed(1)}%
    </div>
  );
}

export default function Reports() {
  const { user } = useAuthStore();
  const { addToast } = useToastStore();
  const currency = user?.preferredCurrency || 'INR';

  const now = new Date();
  const [reportType, setReportType] = useState('monthly');
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [loading, setLoading] = useState(true);
  const [activeChart, setActiveChart] = useState('overview'); // 'overview' | 'trends' | 'heatmap'

  const [monthlyData, setMonthlyData] = useState(null);
  const [yearlyData, setYearlyData] = useState(null);
  const [trendData, setTrendData] = useState([]);
  const [heatmapData, setHeatmapData] = useState([]);
  const [categoryTrendData, setCategoryTrendData] = useState(null);

  useEffect(() => {
    fetchReport();
  }, [reportType, year, month]);

  const fetchReport = async () => {
    setLoading(true);
    try {
      if (reportType === 'monthly') {
        const [res, trendRes, heatRes, catTrendRes] = await Promise.allSettled([
          reportService.getMonthly(year, month),
          reportService.getTrends(12),
          reportService.getWeeklyHeatmap(year, month),
          reportService.getCategoryTrend(6),
        ]);
        if (res.status === 'fulfilled') setMonthlyData(res.value.data);
        if (trendRes.status === 'fulfilled') setTrendData(trendRes.value.data || []);
        if (heatRes.status === 'fulfilled') setHeatmapData(heatRes.value.data || []);
        if (catTrendRes.status === 'fulfilled') setCategoryTrendData(catTrendRes.value.data);
      } else {
        const [res, trendRes, catTrendRes] = await Promise.allSettled([
          reportService.getYearly(year),
          reportService.getTrends(12),
          reportService.getCategoryTrend(12),
        ]);
        if (res.status === 'fulfilled') setYearlyData(res.value.data);
        if (trendRes.status === 'fulfilled') setTrendData(trendRes.value.data || []);
        if (catTrendRes.status === 'fulfilled') setCategoryTrendData(catTrendRes.value.data);
      }
    } catch (err) {
      console.error('Failed to load report:', err);
      addToast({ type: 'error', message: 'Failed to generate financial report' });
    } finally {
      setLoading(false);
    }
  };

  const handleExportCSV = () => {
    try {
      const dataToExport = reportType === 'monthly'
        ? (monthlyData?.categoryBreakdown || []).map((c) => ({
            Category: c.name,
            Type: c.type,
            Amount: c.total,
            Transactions: c.transactionCount,
            'Share %': `${c.percentage}%`,
          }))
        : (yearlyData?.monthlyBreakdown || []).map((m) => ({
            Month: m.monthName || m.month,
            Earnings: m.earnings,
            Spends: m.spends,
            Net: m.net,
            Transactions: m.transactionCount,
          }));

      exportToExcel(dataToExport, `${reportType}-report-${year}${reportType === 'monthly' ? `-${month}` : ''}`);
      addToast({ type: 'success', message: 'Exported report to file successfully!' });
    } catch (err) {
      addToast({ type: 'error', message: 'Export failed' });
    }
  };

  const earnings = reportType === 'monthly' ? (monthlyData?.totalEarnings || 0) : (yearlyData?.totalEarnings || 0);
  const spends = reportType === 'monthly' ? (monthlyData?.totalSpends || 0) : (yearlyData?.totalSpends || 0);
  const net = earnings - spends;
  const savingsRate = earnings > 0 ? Math.max(0, Math.round((net / earnings) * 100)) : 0;

  // Savings rate trend derived from trendData
  const savingsTrend = useMemo(() =>
    trendData.map((d) => ({
      month: d.month,
      savingsRate: d.earnings > 0 ? Number(((d.earnings - d.spends) / d.earnings * 100).toFixed(1)) : 0,
      net: d.net,
    })), [trendData]);

  // MoM change data from trend
  const momData = useMemo(() => {
    if (trendData.length < 2) return [];
    return trendData.slice(1).map((d, i) => {
      const prev = trendData[i];
      return {
        month: d.month,
        earningsChange: prev.earnings > 0 ? Number(((d.earnings - prev.earnings) / prev.earnings * 100).toFixed(1)) : 0,
        spendsChange: prev.spends > 0 ? Number(((d.spends - prev.spends) / prev.spends * 100).toFixed(1)) : 0,
      };
    });
  }, [trendData]);

  // Radial bar data from yearly category breakdown
  const radialData = useMemo(() => {
    if (!yearlyData?.categoryBreakdown) return [];
    return yearlyData.categoryBreakdown
      .filter((c) => c.type === 'spend')
      .slice(0, 6)
      .map((c, i) => ({
        name: c.name,
        value: c.percentage,
        fill: c.color || COLORS[i % COLORS.length],
      }));
  }, [yearlyData]);

  // Pie data for spend vs earn ratio
  const ratioData = useMemo(() => [
    { name: 'Earnings', value: earnings },
    { name: 'Spends', value: spends },
  ], [earnings, spends]);

  return (
    <div className="page-content">
      {/* Header */}
      <div className="page-header-row">
        <div className="page-header-title-group">
          <h1>Analytics &amp; Reports</h1>
          <p>Deep dive into your spending patterns, trends, and category insights</p>
        </div>

        <div className="page-header-actions">
          {/* Toggle Type */}
          <div style={{ display: 'flex', background: 'var(--bg-card)', padding: '3px', borderRadius: 'var(--radius-full)', border: '1px solid var(--border)', flexShrink: 0 }}>
            <button type="button" className={`filter-chip ${reportType === 'monthly' ? 'active' : ''}`}
              onClick={() => setReportType('monthly')} style={{ border: 'none', padding: '6px 12px' }}>
              Monthly
            </button>
            <button type="button" className={`filter-chip ${reportType === 'yearly' ? 'active' : ''}`}
              onClick={() => setReportType('yearly')} style={{ border: 'none', padding: '6px 12px' }}>
              Yearly
            </button>
          </div>

          {reportType === 'monthly' && (
            <select className="form-input form-select" value={month}
              onChange={(e) => setMonth(Number(e.target.value))} aria-label="Select month">
              {MONTHS.map((m, idx) => (
                <option key={m} value={idx + 1}>{m}</option>
              ))}
            </select>
          )}

          <select className="form-input form-select" value={year}
            onChange={(e) => setYear(Number(e.target.value))} aria-label="Select year">
            {[year - 2, year - 1, year, year + 1].map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>

          <button type="button" onClick={handleExportCSV} className="btn btn-secondary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <IoDownloadOutline size={18} />
            <span>Export</span>
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}>
          <Loader size={48} />
        </div>
      ) : (
        <>
          {/* Summary KPIs */}
          <div className="summary-cards">
            <div className="card summary-card earning">
              <div className="summary-card-icon"><IoTrendingUp /></div>
              <div className="summary-card-label">Total Inflow</div>
              <div className="summary-card-value" style={{ color: 'var(--earning)' }}>
                {formatCurrency(earnings, currency)}
              </div>
              <div className="summary-card-change positive">
                {reportType === 'monthly' ? `${MONTHS[month - 1]} ${year}` : `Full Year ${year}`}
              </div>
            </div>

            <div className="card summary-card spend">
              <div className="summary-card-icon"><IoTrendingDown /></div>
              <div className="summary-card-label">Total Outflow</div>
              <div className="summary-card-value" style={{ color: 'var(--spend)' }}>
                {formatCurrency(spends, currency)}
              </div>
              <div className="summary-card-change negative">Total expenditure</div>
            </div>

            <div className="card summary-card savings">
              <div className="summary-card-icon"><IoCashOutline /></div>
              <div className="summary-card-label">Net Balance</div>
              <div className="summary-card-value" style={{ color: net >= 0 ? 'var(--savings)' : 'var(--spend)' }}>
                {formatCurrency(net, currency)}
              </div>
              <div className={`summary-card-change ${net >= 0 ? 'positive' : 'negative'}`}>
                {net >= 0 ? 'Surplus Balance' : 'Net Loss / Overspent'}
              </div>
            </div>

            <div className="card summary-card rate">
              <div className="summary-card-icon"><IoStatsChartOutline /></div>
              <div className="summary-card-label">Savings Rate</div>
              <div className="summary-card-value" style={{ color: 'var(--primary)' }}>{savingsRate}%</div>
              <div className="summary-card-change positive">
                {savingsRate >= 20 ? 'Target Achieved ✓' : 'Target: 20%+'}
              </div>
            </div>
          </div>

          {/* Chart View Tabs */}
          <div className="chart-tabs" style={{ marginBottom: '20px' }}>
            {[
              { id: 'overview', icon: <IoBarChartOutline />, label: 'Overview' },
              { id: 'trends', icon: <IoTrendingUp />, label: 'Trends' },
              { id: 'heatmap', icon: <IoFlameOutline />, label: 'Heatmap' },
              { id: 'categories', icon: <IoLayersOutline />, label: 'Categories' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                className={`chart-tab-btn ${activeChart === tab.id ? 'active' : ''}`}
                onClick={() => setActiveChart(tab.id)}
              >
                {tab.icon} {tab.label}
              </button>
            ))}
          </div>

          {/* ── OVERVIEW TAB ── */}
          {activeChart === 'overview' && (
            <>
              <div className="charts-grid" style={{ marginBottom: 24 }}>
                {/* Main bar/area chart */}
                {reportType === 'monthly' ? (
                  <div className="card chart-card">
                    <h2 className="chart-title">Daily Cashflow Activity</h2>
                    <div style={{ width: '100%', height: 320 }}>
                      {monthlyData?.dailyBreakdown?.length > 0 ? (
                        <ResponsiveContainer>
                          <ComposedChart data={monthlyData.dailyBreakdown}>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.4} />
                            <XAxis dataKey="date" stroke="var(--text-tertiary)" fontSize={11} tickFormatter={(d) => d.slice(-2)} />
                            <YAxis stroke="var(--text-tertiary)" fontSize={11} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                            <Tooltip contentStyle={CHART_TOOLTIP_STYLE} formatter={(val) => [formatCurrency(val, currency)]} />
                            <Legend />
                            <Bar dataKey="earnings" name="Earnings" fill="#10b981" radius={[4, 4, 0, 0]} opacity={0.9} />
                            <Bar dataKey="spends" name="Spends" fill="#ef4444" radius={[4, 4, 0, 0]} opacity={0.9} />
                            <Line type="monotone" dataKey="spends" stroke="#f59e0b" dot={false} strokeWidth={2} name="Spend Trend" strokeDasharray="5 3" />
                          </ComposedChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="chart-empty">No daily records found for this month.</div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="card chart-card">
                    <h2 className="chart-title">{year} Month-by-Month Analysis</h2>
                    <div style={{ width: '100%', height: 320 }}>
                      {yearlyData?.monthlyBreakdown?.length > 0 ? (
                        <ResponsiveContainer>
                          <ComposedChart data={yearlyData.monthlyBreakdown}>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.4} />
                            <XAxis dataKey="monthName" stroke="var(--text-tertiary)" fontSize={12} />
                            <YAxis stroke="var(--text-tertiary)" fontSize={12} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                            <Tooltip contentStyle={CHART_TOOLTIP_STYLE} formatter={(val) => [formatCurrency(val, currency)]} />
                            <Legend />
                            <Bar dataKey="earnings" name="Earnings" fill="#10b981" radius={[4, 4, 0, 0]} />
                            <Bar dataKey="spends" name="Spends" fill="#ef4444" radius={[4, 4, 0, 0]} />
                            <Line type="monotone" dataKey="net" name="Net Savings" stroke="#6366f1" strokeWidth={2.5} dot={{ fill: '#6366f1', r: 4 }} />
                          </ComposedChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="chart-empty">No yearly data found.</div>
                      )}
                    </div>
                  </div>
                )}

                {/* Spend vs Earn Ratio + Gauge */}
                <div className="card chart-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <h2 className="chart-title" style={{ alignSelf: 'flex-start' }}>Income vs Spend Ratio</h2>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 24, width: '100%', justifyContent: 'center', flexWrap: 'wrap' }}>
                    <SavingsGauge rate={savingsRate} />
                    <div style={{ width: 200, height: 200 }}>
                      {earnings > 0 || spends > 0 ? (
                        <ResponsiveContainer>
                          <PieChart>
                            <Pie data={ratioData} dataKey="value" cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={4}>
                              <Cell fill="#10b981" />
                              <Cell fill="#ef4444" />
                            </Pie>
                            <Tooltip contentStyle={CHART_TOOLTIP_STYLE} formatter={(val) => [formatCurrency(val, currency)]} />
                            <Legend />
                          </PieChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="chart-empty">No data</div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Category breakdown */}
              <div className="charts-grid" style={{ marginBottom: 24 }}>
                {/* Category Pie */}
                <div className="card chart-card">
                  <h2 className="chart-title">Category Distribution</h2>
                  <div style={{ width: '100%', height: 300 }}>
                    {(reportType === 'monthly' ? monthlyData?.categoryBreakdown : yearlyData?.categoryBreakdown)?.length > 0 ? (
                      <ResponsiveContainer>
                        <PieChart>
                          <Pie
                            data={reportType === 'monthly' ? monthlyData.categoryBreakdown : yearlyData.categoryBreakdown}
                            dataKey="total"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            outerRadius={95}
                            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                            labelLine={false}
                          >
                            {(reportType === 'monthly' ? monthlyData.categoryBreakdown : yearlyData.categoryBreakdown).map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color || COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip contentStyle={CHART_TOOLTIP_STYLE} formatter={(val) => [formatCurrency(val, currency)]} />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="chart-empty">No category spend data available.</div>
                    )}
                  </div>
                </div>

                {/* Top Categories horizontal bar */}
                <div className="card chart-card">
                  <h2 className="chart-title">Top Categories by Spend</h2>
                  <div style={{ width: '100%', height: 300 }}>
                    {(reportType === 'monthly' ? monthlyData?.categoryBreakdown : yearlyData?.categoryBreakdown)
                      ?.filter((c) => c.type === 'spend')?.length > 0 ? (
                      <ResponsiveContainer>
                        <BarChart
                          layout="vertical"
                          data={(reportType === 'monthly' ? monthlyData?.categoryBreakdown : yearlyData?.categoryBreakdown)
                            .filter((c) => c.type === 'spend')
                            .slice(0, 7)
                            .map((c) => ({ ...c, amount: c.total }))}
                          margin={{ left: 10, right: 20 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.4} horizontal={false} />
                          <XAxis type="number" stroke="var(--text-tertiary)" fontSize={11} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                          <YAxis type="category" dataKey="name" stroke="var(--text-tertiary)" fontSize={12} width={80} />
                          <Tooltip contentStyle={CHART_TOOLTIP_STYLE} formatter={(val) => [formatCurrency(val, currency)]} />
                          <Bar dataKey="amount" name="Spent" radius={[0, 6, 6, 0]}>
                            {(reportType === 'monthly' ? monthlyData?.categoryBreakdown : yearlyData?.categoryBreakdown)
                              ?.filter((c) => c.type === 'spend')
                              ?.slice(0, 7)
                              .map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color || COLORS[index % COLORS.length]} />
                              ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="chart-empty">No category data to display.</div>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}

          {/* ── TRENDS TAB ── */}
          {activeChart === 'trends' && (
            <>
              <div className="charts-grid" style={{ marginBottom: 24 }}>
                {/* 12-month Income vs Spend area */}
                <div className="card chart-card" style={{ gridColumn: '1 / -1' }}>
                  <h2 className="chart-title">12-Month Income vs Spend Trend</h2>
                  <div style={{ width: '100%', height: 300 }}>
                    {trendData.length > 0 ? (
                      <ResponsiveContainer>
                        <AreaChart data={trendData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                          <defs>
                            <linearGradient id="earningGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                              <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                            </linearGradient>
                            <linearGradient id="spendGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#ef4444" stopOpacity={0.4} />
                              <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                            </linearGradient>
                            <linearGradient id="netGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                              <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.4} />
                          <XAxis dataKey="month" stroke="var(--text-tertiary)" fontSize={12} />
                          <YAxis stroke="var(--text-tertiary)" fontSize={12} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                          <Tooltip contentStyle={CHART_TOOLTIP_STYLE} formatter={(val) => [formatCurrency(val, currency)]} />
                          <Legend />
                          <Area type="monotone" dataKey="earnings" name="Earnings" stroke="#10b981" fillOpacity={1} fill="url(#earningGrad)" strokeWidth={2} />
                          <Area type="monotone" dataKey="spends" name="Spends" stroke="#ef4444" fillOpacity={1} fill="url(#spendGrad)" strokeWidth={2} />
                          <Area type="monotone" dataKey="net" name="Net Savings" stroke="#6366f1" fillOpacity={1} fill="url(#netGrad)" strokeWidth={2} />
                        </AreaChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="chart-empty">No trend data yet. Add transactions across multiple months!</div>
                    )}
                  </div>
                </div>
              </div>

              <div className="charts-grid" style={{ marginBottom: 24 }}>
                {/* Savings Rate Line */}
                <div className="card chart-card">
                  <h2 className="chart-title">💰 Savings Rate Over Time</h2>
                  <div style={{ width: '100%', height: 280 }}>
                    {savingsTrend.length > 0 ? (
                      <ResponsiveContainer>
                        <LineChart data={savingsTrend}>
                          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.4} />
                          <XAxis dataKey="month" stroke="var(--text-tertiary)" fontSize={12} />
                          <YAxis stroke="var(--text-tertiary)" fontSize={12} tickFormatter={(v) => `${v}%`} domain={[0, 100]} />
                          <Tooltip
                            contentStyle={CHART_TOOLTIP_STYLE}
                            formatter={(val, name) => name === 'savingsRate' ? [`${val}%`, 'Savings Rate'] : [formatCurrency(val, currency), 'Net']}
                          />
                          <Legend formatter={(val) => val === 'savingsRate' ? 'Savings Rate %' : 'Net Amount'} />
                          <ReferenceLine y={20} stroke="#f59e0b" strokeDasharray="4 4" label={{ value: '20% target', fill: '#f59e0b', fontSize: 11 }} />
                          <Line type="monotone" dataKey="savingsRate" stroke="#6366f1" strokeWidth={2.5} dot={{ fill: '#6366f1', r: 4 }} activeDot={{ r: 7 }} />
                        </LineChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="chart-empty">Not enough data for trend analysis.</div>
                    )}
                  </div>
                </div>

                {/* Month-over-Month % change */}
                <div className="card chart-card">
                  <h2 className="chart-title">📈 Month-over-Month % Change</h2>
                  <div style={{ width: '100%', height: 280 }}>
                    {momData.length > 0 ? (
                      <ResponsiveContainer>
                        <BarChart data={momData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.4} />
                          <XAxis dataKey="month" stroke="var(--text-tertiary)" fontSize={11} />
                          <YAxis stroke="var(--text-tertiary)" fontSize={11} tickFormatter={(v) => `${v}%`} />
                          <Tooltip
                            contentStyle={CHART_TOOLTIP_STYLE}
                            formatter={(val, name) => [`${val > 0 ? '+' : ''}${val}%`, name === 'earningsChange' ? 'Earnings Δ' : 'Spends Δ']}
                          />
                          <Legend formatter={(val) => val === 'earningsChange' ? 'Earnings Δ%' : 'Spends Δ%'} />
                          <ReferenceLine y={0} stroke="var(--border)" strokeWidth={2} />
                          <Bar dataKey="earningsChange" name="earningsChange" fill="#10b981" radius={[4, 4, 0, 0]}>
                            {momData.map((entry, i) => (
                              <Cell key={i} fill={entry.earningsChange >= 0 ? '#10b981' : '#ef4444'} />
                            ))}
                          </Bar>
                          <Bar dataKey="spendsChange" name="spendsChange" fill="#ef4444" radius={[4, 4, 0, 0]}>
                            {momData.map((entry, i) => (
                              <Cell key={i} fill={entry.spendsChange >= 0 ? '#ef4444' : '#10b981'} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="chart-empty">Need at least 2 months of data for comparison.</div>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}

          {/* ── HEATMAP TAB ── */}
          {activeChart === 'heatmap' && (
            <>
              <div className="card" style={{ marginBottom: 24, padding: '24px' }}>
                <h2 className="chart-title">🔥 Spending by Day of Week — {MONTHS[month - 1]} {year}</h2>
                <p style={{ color: 'var(--text-tertiary)', fontSize: 13, marginBottom: 24 }}>
                  Discover which days you tend to spend the most. Darker = higher spend.
                </p>
                {heatmapData.length > 0 ? (
                  <SpendHeatmap heatmapData={heatmapData} currency={currency} />
                ) : (
                  <div className="chart-empty">No spend data for selected month.</div>
                )}
              </div>

              {/* Heatmap bar chart as alternative view */}
              <div className="card" style={{ marginBottom: 24, padding: '24px' }}>
                <h2 className="chart-title">Daily Spend Distribution by Weekday</h2>
                <div style={{ width: '100%', height: 280 }}>
                  {heatmapData.length > 0 ? (
                    <ResponsiveContainer>
                      <BarChart data={heatmapData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.4} />
                        <XAxis dataKey="day" stroke="var(--text-tertiary)" fontSize={13} />
                        <YAxis stroke="var(--text-tertiary)" fontSize={11} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                        <Tooltip
                          contentStyle={CHART_TOOLTIP_STYLE}
                          content={({ active, payload }) => {
                            if (!active || !payload?.length) return null;
                            const d = payload[0]?.payload;
                            return <HeatmapTooltip {...d} currency={currency} />;
                          }}
                        />
                        <Bar dataKey="total" name="Total Spend" radius={[6, 6, 0, 0]}>
                          {heatmapData.map((entry, index) => (
                            <Cell
                              key={index}
                              fill={entry.total === 0
                                ? 'var(--border)'
                                : `rgba(99, 102, 241, ${0.3 + (entry.total / Math.max(...heatmapData.map(d => d.total), 1)) * 0.7})`}
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="chart-empty">No data available.</div>
                  )}
                </div>
              </div>
            </>
          )}

          {/* ── CATEGORIES TAB ── */}
          {activeChart === 'categories' && (
            <>
              {/* Stacked area category trend */}
              <div className="card" style={{ marginBottom: 24, padding: '24px' }}>
                <h2 className="chart-title">📊 Category Spend Trend (Stacked)</h2>
                <p style={{ color: 'var(--text-tertiary)', fontSize: 13, marginBottom: 16 }}>
                  How each spending category evolved over the last {reportType === 'monthly' ? '6' : '12'} months.
                </p>
                <div style={{ width: '100%', height: 340 }}>
                  {categoryTrendData?.data?.length > 0 && categoryTrendData?.categories?.length > 0 ? (
                    <ResponsiveContainer>
                      <AreaChart data={categoryTrendData.data} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.4} />
                        <XAxis dataKey="month" stroke="var(--text-tertiary)" fontSize={12} />
                        <YAxis stroke="var(--text-tertiary)" fontSize={12} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                        <Tooltip contentStyle={CHART_TOOLTIP_STYLE} formatter={(val) => [formatCurrency(val, currency)]} />
                        <Legend />
                        {categoryTrendData.categories.slice(0, 6).map((cat, i) => (
                          <Area
                            key={cat.id}
                            type="monotone"
                            dataKey={cat.name}
                            stackId="1"
                            stroke={cat.color || COLORS[i % COLORS.length]}
                            fill={cat.color || COLORS[i % COLORS.length]}
                            fillOpacity={0.7}
                          />
                        ))}
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="chart-empty">No category trend data available. Add transactions across multiple months.</div>
                  )}
                </div>
              </div>

              {/* Radial bar for yearly category share */}
              {reportType === 'yearly' && (
                <div className="charts-grid" style={{ marginBottom: 24 }}>
                  <div className="card chart-card">
                    <h2 className="chart-title">🎯 Category Spend Share (Radial)</h2>
                    <p style={{ color: 'var(--text-tertiary)', fontSize: 13, marginBottom: 8 }}>
                      Each ring represents a category's percentage of total annual spend.
                    </p>
                    <div style={{ width: '100%', height: 300 }}>
                      {radialData.length > 0 ? (
                        <ResponsiveContainer>
                          <RadialBarChart
                            cx="50%" cy="50%"
                            innerRadius="15%" outerRadius="90%"
                            data={radialData}
                            startAngle={180} endAngle={-180}
                          >
                            <RadialBar
                              minAngle={5}
                              dataKey="value"
                              cornerRadius={6}
                              label={{ position: 'insideStart', fill: '#fff', fontSize: 11 }}
                            />
                            <Tooltip
                              contentStyle={CHART_TOOLTIP_STYLE}
                              formatter={(val, name) => [`${val}%`, 'Share of Spend']}
                            />
                            <Legend
                              iconSize={12}
                              layout="vertical"
                              verticalAlign="middle"
                              align="right"
                              formatter={(val, entry) => (
                                <span style={{ color: 'var(--text-secondary)', fontSize: 12 }}>{entry.payload.name}</span>
                              )}
                            />
                          </RadialBarChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="chart-empty">Select Yearly view to see category radial breakdown.</div>
                      )}
                    </div>
                  </div>

                  <div className="card chart-card">
                    <h2 className="chart-title">📋 Category Performance Table</h2>
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                          <tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--text-secondary)', fontSize: 13 }}>
                            <th style={{ padding: '10px 12px', textAlign: 'left' }}>Category</th>
                            <th style={{ padding: '10px 12px', textAlign: 'right' }}>Amount</th>
                            <th style={{ padding: '10px 12px', textAlign: 'right' }}>Share</th>
                            <th style={{ padding: '10px 12px', textAlign: 'right' }}>Tx Count</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(yearlyData?.categoryBreakdown || []).filter((c) => c.type === 'spend').map((cat, idx) => (
                            <tr key={idx} style={{ borderBottom: '1px solid var(--border-light)' }}>
                              <td style={{ padding: '10px 12px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
                                <span style={{ width: 10, height: 10, borderRadius: '50%', background: cat.color || COLORS[idx % COLORS.length], display: 'inline-block', flexShrink: 0 }} />
                                {cat.icon} {cat.name}
                              </td>
                              <td style={{ padding: '10px 12px', textAlign: 'right', color: 'var(--spend)', fontWeight: 700 }}>{formatCurrency(cat.total, currency)}</td>
                              <td style={{ padding: '10px 12px', textAlign: 'right', color: 'var(--text-secondary)' }}>{cat.percentage}%</td>
                              <td style={{ padding: '10px 12px', textAlign: 'right', color: 'var(--text-tertiary)' }}>{cat.transactionCount}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {reportType === 'monthly' && (
                <div className="card" style={{ marginBottom: 24 }}>
                  <h2 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 700, marginBottom: 16 }}>Category Expenditure Table</h2>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)' }}>
                          <th style={{ padding: '12px 16px' }}>Category</th>
                          <th style={{ padding: '12px 16px' }}>Type</th>
                          <th style={{ padding: '12px 16px' }}>Amount</th>
                          <th style={{ padding: '12px 16px' }}>Share</th>
                          <th style={{ padding: '12px 16px' }}>Transactions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(monthlyData?.categoryBreakdown || []).map((cat, idx) => (
                          <tr key={idx} style={{ borderBottom: '1px solid var(--border-light)' }}>
                            <td style={{ padding: '12px 16px', fontWeight: 600 }}>
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                                <span style={{ width: 8, height: 8, borderRadius: '50%', background: cat.color || COLORS[idx % COLORS.length], display: 'inline-block' }} />
                                {cat.icon} {cat.name}
                              </span>
                            </td>
                            <td style={{ padding: '12px 16px', color: cat.type === 'earning' ? 'var(--earning)' : 'var(--spend)', fontWeight: 600 }}>
                              {cat.type === 'earning' ? 'Income' : 'Spend'}
                            </td>
                            <td style={{ padding: '12px 16px', fontWeight: 700 }}>{formatCurrency(cat.total, currency)}</td>
                            <td style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>{cat.percentage}%</td>
                            <td style={{ padding: '12px 16px', color: 'var(--text-tertiary)' }}>{cat.transactionCount}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
