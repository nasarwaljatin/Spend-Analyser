import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  ComposedChart,
  ReferenceLine,
} from 'recharts';
import {
  IoTrendingUp,
  IoTrendingDown,
  IoWalletOutline,
  IoPieChartOutline,
  IoAddCircleOutline,
  IoArrowForwardOutline,
  IoAlertCircleOutline,
  IoFlameOutline,
  IoArrowUpOutline,
  IoArrowDownOutline,
} from 'react-icons/io5';
import { reportService, budgetService } from '../services/reportService';
import { transactionService } from '../services/transactionService';
import useAuthStore from '../store/authStore';
import { formatCurrency } from '../utils/formatCurrency';
import { formatDate } from '../utils/formatDate';
import Loader from '../components/common/Loader';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const COLORS = [
  '#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
  '#ec4899', '#06b6d4', '#14b8a6', '#f97316', '#3b82f6',
];

export default function Dashboard() {
  const { user } = useAuthStore();
  const currency = user?.preferredCurrency || 'INR';

  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [loading, setLoading] = useState(true);

  const [monthlyData, setMonthlyData] = useState(null);
  const [trendData, setTrendData] = useState([]);
  const [recentTransactions, setRecentTransactions] = useState([]);
  const [budgets, setBudgets] = useState([]);

  useEffect(() => {
    fetchDashboardData();
  }, [year, month]);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const [monthlyRes, trendRes, txRes, budgetRes] = await Promise.allSettled([
        reportService.getMonthly(year, month),
        reportService.getTrends(6),
        transactionService.getAll({ page: 1, limit: 5 }),
        budgetService.getAll(),
      ]);

      if (monthlyRes.status === 'fulfilled') {
        setMonthlyData(monthlyRes.value.data);
      }
      if (trendRes.status === 'fulfilled') {
        setTrendData(trendRes.value.data || []);
      }
      if (txRes.status === 'fulfilled') {
        const txList = txRes.value.data?.transactions || txRes.value.data?.data || (Array.isArray(txRes.value.data) ? txRes.value.data : []);
        setRecentTransactions(txList);
      }
      if (budgetRes.status === 'fulfilled') {
        setBudgets(budgetRes.value.data || []);
      }
    } catch (err) {
      console.error('Error loading dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  const earnings = monthlyData?.totalEarnings || 0;
  const spends = monthlyData?.totalSpends || 0;
  const netSavings = earnings - spends;
  const savingsRate = earnings > 0 ? Math.max(0, Math.round((netSavings / earnings) * 100)) : 0;

  const categoryBreakdown = monthlyData?.categoryBreakdown || [];
  const topSpends = monthlyData?.topSpends || [];

  // MoM change
  const prevEarnings = monthlyData?.comparison?.prevMonth?.earnings || 0;
  const prevSpends = monthlyData?.comparison?.prevMonth?.spends || 0;
  const earningsChange = monthlyData?.comparison?.changePercent?.earnings || 0;
  const spendsChange = monthlyData?.comparison?.changePercent?.spends || 0;

  return (
    <div className="page-content">
      {/* Top Controls Header */}
      <div className="page-header-row">
        <div className="page-header-title-group">
          <h1>Financial Overview</h1>
          <p>
            Welcome back, {user?.name || 'User'}! Track your flow and financial health.
          </p>
        </div>

        <div className="page-header-actions">
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

          <Link to="/transactions?action=new" className="btn btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <IoAddCircleOutline size={18} />
            <span>Add Transaction</span>
          </Link>
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}>
          <Loader size={48} />
        </div>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="summary-cards">
            {/* Earnings Card */}
            <div className="card summary-card earning">
              <div className="summary-card-icon">
                <IoTrendingUp />
              </div>
              <div className="summary-card-label">Total Earnings</div>
              <div className="summary-card-value" style={{ color: 'var(--earning)' }}>
                {formatCurrency(earnings, currency)}
              </div>
              <div className="summary-card-change positive">
                ↑ {MONTHS[month - 1]} {year}
              </div>
            </div>

            {/* Spends Card */}
            <div className="card summary-card spend">
              <div className="summary-card-icon">
                <IoTrendingDown />
              </div>
              <div className="summary-card-label">Total Spends</div>
              <div className="summary-card-value" style={{ color: 'var(--spend)' }}>
                {formatCurrency(spends, currency)}
              </div>
              <div className="summary-card-change negative">
                ↓ Outflow this month
              </div>
            </div>

            {/* Net Savings Card */}
            <div className="card summary-card savings">
              <div className="summary-card-icon">
                <IoWalletOutline />
              </div>
              <div className="summary-card-label">Net Savings</div>
              <div
                className="summary-card-value"
                style={{ color: netSavings >= 0 ? 'var(--savings)' : 'var(--spend)' }}
              >
                {formatCurrency(netSavings, currency)}
              </div>
              <div className={`summary-card-change ${netSavings >= 0 ? 'positive' : 'negative'}`}>
                {netSavings >= 0 ? 'Profitable / Surplus' : 'Deficit / In the red'}
              </div>
            </div>

            {/* Savings Rate Card */}
            <div className="card summary-card rate">
              <div className="summary-card-icon">
                <IoPieChartOutline />
              </div>
              <div className="summary-card-label">Savings Rate</div>
              <div className="summary-card-value" style={{ color: 'var(--primary)' }}>
                {savingsRate}%
              </div>
              <div className="summary-card-change positive">
                {savingsRate >= 30 ? '🔥 Great saving habit!' : 'Target: 20%+ recommended'}
              </div>
            </div>
          </div>

          {/* Charts Row */}
          <div className="charts-grid">
            {/* Monthly Trend Chart */}
            <div className="card chart-card">
              <h2 className="chart-title">Last 6 Months Income vs Spend Trend</h2>
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
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.5} />
                      <XAxis dataKey="month" stroke="var(--text-tertiary)" fontSize={12} />
                      <YAxis stroke="var(--text-tertiary)" fontSize={12} tickFormatter={(v) => `₹${v / 1000}k`} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'var(--bg-card)',
                          borderColor: 'var(--border)',
                          borderRadius: '8px',
                          color: 'var(--text-primary)',
                        }}
                        formatter={(val) => [formatCurrency(val, currency)]}
                      />
                      <Legend />
                      <Area type="monotone" dataKey="earnings" name="Earnings" stroke="#10b981" fillOpacity={1} fill="url(#earningGrad)" />
                      <Area type="monotone" dataKey="spends" name="Spends" stroke="#ef4444" fillOpacity={1} fill="url(#spendGrad)" />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-tertiary)' }}>
                    No trend history yet. Add transactions across months!
                  </div>
                )}
              </div>
            </div>

            {/* Category Breakdown Donut */}
            <div className="card chart-card">
              <h2 className="chart-title">Spend Breakdown by Category</h2>
              <div style={{ width: '100%', height: 300 }}>
                {categoryBreakdown.length > 0 ? (
                  <ResponsiveContainer>
                    <PieChart>
                      <Pie
                        data={categoryBreakdown}
                        dataKey="total"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={95}
                        paddingAngle={3}
                      >
                        {categoryBreakdown.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color || COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'var(--bg-card)',
                          borderColor: 'var(--border)',
                          borderRadius: '8px',
                          color: 'var(--text-primary)',
                        }}
                        formatter={(val) => [formatCurrency(val, currency)]}
                      />
                      <Legend layout="horizontal" verticalAlign="bottom" align="center" />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-tertiary)' }}>
                    No spend transactions recorded for this month.
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Net Savings Line Chart — full width */}
          <div className="card" style={{ marginBottom: '24px', padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 700, margin: 0 }}>
                📈 Net Savings Trend — Last 12 Months
              </h2>
              <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-tertiary)' }}>
                Above line = surplus · Below = deficit
              </span>
            </div>
            <div style={{ width: '100%', height: 280 }}>
              {trendData.length > 0 ? (
                <ResponsiveContainer>
                  <LineChart data={trendData} margin={{ top: 10, right: 24, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.4} />
                    <XAxis
                      dataKey="month"
                      stroke="var(--text-tertiary)"
                      fontSize={12}
                      tick={{ fill: 'var(--text-secondary)' }}
                    />
                    <YAxis
                      stroke="var(--text-tertiary)"
                      fontSize={12}
                      tickFormatter={(v) => formatCurrency(v, currency)}
                      tick={{ fill: 'var(--text-secondary)' }}
                      width={80}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'var(--bg-card)',
                        borderColor: 'var(--border)',
                        borderRadius: '10px',
                        color: 'var(--text-primary)',
                        boxShadow: 'var(--shadow-md)',
                      }}
                      formatter={(val, name) => [
                        formatCurrency(val, currency),
                        name === 'net' ? 'Net Savings' : name === 'earnings' ? 'Earnings' : 'Spends',
                      ]}
                      labelStyle={{ color: 'var(--text-secondary)', fontWeight: 600, marginBottom: 4 }}
                    />
                    <Legend
                      formatter={(val) =>
                        val === 'net' ? 'Net Savings' : val === 'earnings' ? 'Earnings' : 'Spends'
                      }
                    />
                    <ReferenceLine
                      y={0}
                      stroke="var(--text-tertiary)"
                      strokeWidth={1.5}
                      strokeDasharray="6 3"
                      label={{
                        value: 'Break-even',
                        position: 'insideTopRight',
                        fill: 'var(--text-tertiary)',
                        fontSize: 11,
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="earnings"
                      name="earnings"
                      stroke="#10b981"
                      strokeWidth={2}
                      dot={false}
                      strokeDasharray="5 3"
                      opacity={0.55}
                    />
                    <Line
                      type="monotone"
                      dataKey="spends"
                      name="spends"
                      stroke="#ef4444"
                      strokeWidth={2}
                      dot={false}
                      strokeDasharray="5 3"
                      opacity={0.55}
                    />
                    <Line
                      type="monotone"
                      dataKey="net"
                      name="net"
                      stroke="#6366f1"
                      strokeWidth={3}
                      dot={(props) => {
                        const { cx, cy, payload } = props;
                        const color = payload.net >= 0 ? '#10b981' : '#ef4444';
                        return (
                          <circle
                            key={`dot-${payload.month}`}
                            cx={cx} cy={cy} r={5}
                            fill={color}
                            stroke="var(--bg-card)"
                            strokeWidth={2}
                          />
                        );
                      }}
                      activeDot={{ r: 8, fill: '#6366f1', stroke: 'var(--bg-card)', strokeWidth: 2 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-tertiary)' }}>
                  No trend data yet. Add transactions across multiple months to see the line graph!
                </div>
              )}
            </div>
          </div>

          {/* NEW: Top 5 Spends + MoM Delta Row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 340px), 1fr))', gap: '24px', marginBottom: '24px' }}>
            {/* Top 5 Spends Horizontal Bar */}
            <div className="card chart-card">
              <h2 className="chart-title">🔥 Top 5 Largest Expenses</h2>
              <div style={{ width: '100%', height: 240 }}>
                {topSpends.length > 0 ? (
                  <ResponsiveContainer>
                    <BarChart layout="vertical" data={topSpends} margin={{ left: 0, right: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.4} horizontal={false} />
                      <XAxis type="number" stroke="var(--text-tertiary)" fontSize={11} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                      <YAxis
                        type="category"
                        dataKey="category"
                        stroke="var(--text-tertiary)"
                        fontSize={12}
                        width={80}
                        tickFormatter={(v) => v?.length > 10 ? v.slice(0, 10) + '…' : v}
                      />
                      <Tooltip
                        contentStyle={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)', borderRadius: '8px' }}
                        formatter={(val, name, props) => [formatCurrency(val, currency), props.payload.description || 'Amount']}
                      />
                      <Bar dataKey="amount" name="Amount" radius={[0, 6, 6, 0]} fill="#ef4444">
                        {topSpends.map((entry, index) => (
                          <Cell key={index} fill={COLORS[(index + 3) % COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-tertiary)' }}>
                    No spend transactions this month.
                  </div>
                )}
              </div>
            </div>

            {/* MoM Comparison Card */}
            <div className="card" style={{ padding: '24px' }}>
              <h2 className="chart-title">📊 vs Last Month</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 8 }}>
                {/* Earnings delta */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px', background: 'var(--earning-bg)', borderRadius: 10, border: '1px solid rgba(16,185,129,0.2)' }}>
                  <div>
                    <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 4 }}>Earnings vs Last Month</div>
                    <div style={{ fontWeight: 700, color: 'var(--earning)', fontSize: 18 }}>{formatCurrency(earnings, currency)}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Prev: {formatCurrency(prevEarnings, currency)}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{
                      fontSize: 22, fontWeight: 800,
                      color: earningsChange >= 0 ? 'var(--earning)' : 'var(--spend)'
                    }}>
                      {earningsChange >= 0 ? '↑' : '↓'} {Math.abs(earningsChange)}%
                    </div>
                  </div>
                </div>

                {/* Spends delta */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px', background: 'var(--spend-bg)', borderRadius: 10, border: '1px solid rgba(239,68,68,0.2)' }}>
                  <div>
                    <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 4 }}>Spends vs Last Month</div>
                    <div style={{ fontWeight: 700, color: 'var(--spend)', fontSize: 18 }}>{formatCurrency(spends, currency)}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Prev: {formatCurrency(prevSpends, currency)}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{
                      fontSize: 22, fontWeight: 800,
                      color: spendsChange <= 0 ? 'var(--earning)' : 'var(--spend)'
                    }}>
                      {spendsChange >= 0 ? '↑' : '↓'} {Math.abs(spendsChange)}%
                    </div>
                  </div>
                </div>

                {/* Net delta */}
                <div style={{ padding: '10px 16px', background: 'var(--savings-bg)', borderRadius: 10, border: '1px solid rgba(59,130,246,0.2)', textAlign: 'center' }}>
                  <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 4 }}>Net Savings This Month</div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: netSavings >= 0 ? 'var(--savings)' : 'var(--spend)' }}>
                    {formatCurrency(netSavings, currency)}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 2 }}>Savings Rate: {savingsRate}%</div>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Section: Recent Transactions & Budgets */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 320px), 1fr))', gap: '24px' }}>
            {/* Recent Transactions */}
            <div className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h2 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 700, margin: 0 }}>Recent Transactions</h2>
                <Link to="/transactions" style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: 'var(--font-size-sm)', fontWeight: 600 }}>
                  View All <IoArrowForwardOutline size={16} />
                </Link>
              </div>

              {recentTransactions.length > 0 ? (
                <div className="transaction-list">
                  {recentTransactions.map((tx) => (
                    <div key={tx.id} className="transaction-item">
                      <div
                        className="transaction-icon"
                        style={{
                          backgroundColor: tx.type === 'earning' ? 'var(--earning-bg)' : 'var(--spend-bg)',
                          color: tx.type === 'earning' ? 'var(--earning)' : 'var(--spend)',
                        }}
                      >
                        {tx.category?.icon || (tx.type === 'earning' ? '💰' : '💸')}
                      </div>
                      <div className="transaction-details">
                        <div className="transaction-description">{tx.description || tx.category?.name || 'Transaction'}</div>
                        <div className="transaction-meta">
                          <span>{tx.category?.name || 'General'}</span>
                          <span>•</span>
                          <span>{formatDate(tx.transactionDate)}</span>
                        </div>
                      </div>
                      <div className={`transaction-amount ${tx.type}`}>
                        {tx.type === 'earning' ? '+' : '-'}{formatCurrency(tx.amount, currency)}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ color: 'var(--text-tertiary)', textAlign: 'center', padding: '30px 0' }}>
                  No recent transactions. Start by adding your first spend or earning!
                </p>
              )}
            </div>

            {/* Budget Health */}
            <div className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h2 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 700, margin: 0 }}>Budget Health</h2>
                <Link to="/budgets" style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: 'var(--font-size-sm)', fontWeight: 600 }}>
                  Manage Budgets <IoArrowForwardOutline size={16} />
                </Link>
              </div>

              {budgets.length > 0 ? (
                <div>
                  {budgets.slice(0, 4).map((b) => {
                    const spent = b.spent || 0;
                    const limit = b.limitAmount || 1;
                    const pct = Math.min(100, Math.round((spent / limit) * 100));
                    const status = pct >= 100 ? 'danger' : pct >= 80 ? 'warning' : 'safe';

                    return (
                      <div key={b.id} className="budget-bar">
                        <div className="budget-bar-header">
                          <span className="budget-bar-label">
                            <span>{b.category?.icon || '📁'}</span>
                            {b.category?.name || 'Budget'}
                          </span>
                          <span className="budget-bar-amount">
                            {formatCurrency(spent, currency)} / {formatCurrency(limit, currency)} ({pct}%)
                          </span>
                        </div>
                        <div className="budget-bar-track">
                          <div className={`budget-bar-fill ${status}`} style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '30px 0', color: 'var(--text-tertiary)' }}>
                  <p>No active category budgets configured.</p>
                  <Link to="/budgets" className="btn btn-secondary btn-sm" style={{ marginTop: '12px', display: 'inline-flex' }}>
                    Set Category Budget
                  </Link>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
