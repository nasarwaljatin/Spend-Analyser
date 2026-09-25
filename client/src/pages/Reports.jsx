import { useState, useEffect } from 'react';
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
} from 'recharts';
import {
  IoDownloadOutline,
  IoCalendarOutline,
  IoTrendingUp,
  IoTrendingDown,
  IoCashOutline,
  IoStatsChartOutline,
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

const COLORS = [
  '#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
  '#ec4899', '#06b6d4', '#14b8a6', '#f97316', '#3b82f6',
];

export default function Reports() {
  const { user } = useAuthStore();
  const { addToast } = useToastStore();
  const currency = user?.preferredCurrency || 'INR';

  const now = new Date();
  const [reportType, setReportType] = useState('monthly'); // 'monthly' | 'yearly'
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [loading, setLoading] = useState(true);

  const [monthlyData, setMonthlyData] = useState(null);
  const [yearlyData, setYearlyData] = useState(null);

  useEffect(() => {
    fetchReport();
  }, [reportType, year, month]);

  const fetchReport = async () => {
    setLoading(true);
    try {
      if (reportType === 'monthly') {
        const res = await reportService.getMonthly(year, month);
        setMonthlyData(res.data);
      } else {
        const res = await reportService.getYearly(year);
        setYearlyData(res.data);
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
            Category: c.categoryName,
            Type: 'Spend',
            Amount: c.amount,
            Percentage: `${c.percentage}%`,
          }))
        : (yearlyData?.monthlyBreakdown || []).map((m) => ({
            Month: m.monthName || m.month,
            Earnings: m.earnings,
            Spends: m.spends,
            Net: m.net,
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

  return (
    <div className="page-content">
      {/* Header */}
      <div className="page-header-row">
        <div className="page-header-title-group">
          <h1>Analytics & Reports</h1>
          <p>
            Deep dive into your monthly balance, yearly trajectory, and category trends
          </p>
        </div>

        <div className="page-header-actions">
          {/* Toggle Type */}
          <div style={{ display: 'flex', background: 'var(--bg-card)', padding: '3px', borderRadius: 'var(--radius-full)', border: '1px solid var(--border)', flexShrink: 0 }}>
            <button
              type="button"
              className={`filter-chip ${reportType === 'monthly' ? 'active' : ''}`}
              onClick={() => setReportType('monthly')}
              style={{ border: 'none', padding: '6px 12px' }}
            >
              Monthly
            </button>
            <button
              type="button"
              className={`filter-chip ${reportType === 'yearly' ? 'active' : ''}`}
              onClick={() => setReportType('yearly')}
              style={{ border: 'none', padding: '6px 12px' }}
            >
              Yearly
            </button>
          </div>

          {reportType === 'monthly' && (
            <select
              className="form-input form-select"
              value={month}
              onChange={(e) => setMonth(Number(e.target.value))}
              aria-label="Select month"
            >
              {MONTHS.map((m, idx) => (
                <option key={m} value={idx + 1}>
                  {m}
                </option>
              ))}
            </select>
          )}

          <select
            className="form-input form-select"
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            aria-label="Select year"
          >
            {[year - 2, year - 1, year, year + 1].map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={handleExportCSV}
            className="btn btn-secondary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <IoDownloadOutline size={18} />
            <span>Export Report</span>
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
              <div className="summary-card-change negative">
                Total expenditure
              </div>
            </div>

            <div className="card summary-card savings">
              <div className="summary-card-icon"><IoCashOutline /></div>
              <div className="summary-card-label">Net Net Balance</div>
              <div className="summary-card-value" style={{ color: net >= 0 ? 'var(--savings)' : 'var(--spend)' }}>
                {formatCurrency(net, currency)}
              </div>
              <div className={`summary-card-change ${net >= 0 ? 'positive' : 'negative'}`}>
                {net >= 0 ? 'Surplus Balance' : 'Net Loss / Overspent'}
              </div>
            </div>

            <div className="card summary-card rate">
              <div className="summary-card-icon"><IoStatsChartOutline /></div>
              <div className="summary-card-label">Savings Percentage</div>
              <div className="summary-card-value" style={{ color: 'var(--primary)' }}>
                {savingsRate}%
              </div>
              <div className="summary-card-change positive">
                {savingsRate >= 20 ? 'Target Achieved' : 'Below 20% Target'}
              </div>
            </div>
          </div>

          {/* Monthly View Content */}
          {reportType === 'monthly' && (
            <div className="charts-grid">
              {/* Daily Spend Breakdown */}
              <div className="card chart-card">
                <h2 className="chart-title">Daily Cashflow Activity</h2>
                <div style={{ width: '100%', height: 320 }}>
                  {monthlyData?.dailyBreakdown?.length > 0 ? (
                    <ResponsiveContainer>
                      <BarChart data={monthlyData.dailyBreakdown}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.5} />
                        <XAxis dataKey="date" stroke="var(--text-tertiary)" fontSize={11} tickFormatter={(d) => d.slice(-2)} />
                        <YAxis stroke="var(--text-tertiary)" fontSize={11} />
                        <Tooltip
                          contentStyle={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)', borderRadius: '8px' }}
                          formatter={(val) => [formatCurrency(val, currency)]}
                        />
                        <Legend />
                        <Bar dataKey="earnings" name="Earnings" fill="#10b981" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="spends" name="Spends" fill="#ef4444" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-tertiary)' }}>
                      No daily records found for this month.
                    </div>
                  )}
                </div>
              </div>

              {/* Category Pie */}
              <div className="card chart-card">
                <h2 className="chart-title">Category Distribution</h2>
                <div style={{ width: '100%', height: 320 }}>
                  {monthlyData?.categoryBreakdown?.length > 0 ? (
                    <ResponsiveContainer>
                      <PieChart>
                        <Pie
                          data={monthlyData.categoryBreakdown}
                          dataKey="amount"
                          nameKey="categoryName"
                          cx="50%"
                          cy="50%"
                          outerRadius={95}
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        >
                          {monthlyData.categoryBreakdown.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color || COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(val) => [formatCurrency(val, currency)]} />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-tertiary)' }}>
                      No category spend data available.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Yearly View Content */}
          {reportType === 'yearly' && (
            <div className="card" style={{ marginBottom: '24px', padding: '24px' }}>
              <h2 className="chart-title">{year} Month-by-Month Net Analysis</h2>
              <div style={{ width: '100%', height: 350 }}>
                {yearlyData?.monthlyBreakdown?.length > 0 ? (
                  <ResponsiveContainer>
                    <BarChart data={yearlyData.monthlyBreakdown}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.5} />
                      <XAxis dataKey="monthName" stroke="var(--text-tertiary)" fontSize={12} />
                      <YAxis stroke="var(--text-tertiary)" fontSize={12} />
                      <Tooltip
                        contentStyle={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)', borderRadius: '8px' }}
                        formatter={(val) => [formatCurrency(val, currency)]}
                      />
                      <Legend />
                      <Bar dataKey="earnings" name="Earnings" fill="#10b981" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="spends" name="Spends" fill="#ef4444" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="net" name="Net Savings" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-tertiary)' }}>
                    No yearly data found.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Detailed Breakdown Table */}
          <div className="card">
            <h2 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 700, marginBottom: '16px' }}>
              {reportType === 'monthly' ? 'Category Expenditure Table' : 'Monthly Performance Table'}
            </h2>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)' }}>
                    <th style={{ padding: '12px 16px' }}>{reportType === 'monthly' ? 'Category' : 'Month'}</th>
                    <th style={{ padding: '12px 16px' }}>{reportType === 'monthly' ? 'Type' : 'Earnings'}</th>
                    <th style={{ padding: '12px 16px' }}>{reportType === 'monthly' ? 'Amount' : 'Spends'}</th>
                    <th style={{ padding: '12px 16px' }}>{reportType === 'monthly' ? 'Share' : 'Net Surplus'}</th>
                  </tr>
                </thead>
                <tbody>
                  {reportType === 'monthly' ? (
                    (monthlyData?.categoryBreakdown || []).map((cat, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid var(--border-light)' }}>
                        <td style={{ padding: '12px 16px', fontWeight: 600 }}>{cat.categoryName}</td>
                        <td style={{ padding: '12px 16px', color: 'var(--spend)' }}>Spend</td>
                        <td style={{ padding: '12px 16px', fontWeight: 700 }}>{formatCurrency(cat.amount, currency)}</td>
                        <td style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>{cat.percentage}%</td>
                      </tr>
                    ))
                  ) : (
                    (yearlyData?.monthlyBreakdown || []).map((m, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid var(--border-light)' }}>
                        <td style={{ padding: '12px 16px', fontWeight: 600 }}>{m.monthName || m.month}</td>
                        <td style={{ padding: '12px 16px', color: 'var(--earning)', fontWeight: 600 }}>{formatCurrency(m.earnings, currency)}</td>
                        <td style={{ padding: '12px 16px', color: 'var(--spend)', fontWeight: 600 }}>{formatCurrency(m.spends, currency)}</td>
                        <td style={{ padding: '12px 16px', fontWeight: 700, color: m.net >= 0 ? 'var(--savings)' : 'var(--spend)' }}>
                          {formatCurrency(m.net, currency)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
