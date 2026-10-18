import { IoChevronForward } from 'react-icons/io5';
import { formatCurrency } from '../../utils/formatCurrency';

/**
 * One row per day / month / year with earned, spent and net totals.
 * Rows are clickable to drill down into the next level.
 */
export default function PeriodBreakdown({ rows, unitLabel, currency, onSelect, loading }) {
  const maxFlow = Math.max(1, ...rows.map((r) => Math.max(r.earning, r.spend)));
  const totals = rows.reduce(
    (acc, r) => ({
      earning: acc.earning + r.earning,
      spend: acc.spend + r.spend,
      count: acc.count + r.count,
      active: acc.active + (r.count > 0 ? 1 : 0),
    }),
    { earning: 0, spend: 0, count: 0, active: 0 }
  );
  const net = totals.earning - totals.spend;

  return (
    <div className={`card breakdown-card ${loading ? 'is-loading' : ''}`}>
      <div className="breakdown-row breakdown-head" aria-hidden="true">
        <span>{unitLabel}</span>
        <span className="num">Earned</span>
        <span className="num">Spent</span>
        <span className="num">Net</span>
        <span className="num breakdown-count-col">Txns</span>
      </div>

      <div className="breakdown-body" role="list">
        {rows.map((r) => {
          const empty = r.count === 0;
          return (
            <button
              key={r.key}
              type="button"
              role="listitem"
              className={`breakdown-row ${empty ? 'empty' : ''} ${r.isCurrent ? 'current' : ''} ${r.isFuture ? 'future' : ''}`}
              onClick={() => onSelect?.(r)}
              disabled={!onSelect}
              aria-label={`${r.label}: earned ${r.earning}, spent ${r.spend}, net ${r.net}`}
            >
              <span className="breakdown-label">
                <strong>{r.label}</strong>
                {r.sub && <small>{r.sub}</small>}
                <span className="breakdown-bars" aria-hidden="true">
                  <i className="earn" style={{ width: `${(r.earning / maxFlow) * 100}%` }} />
                  <i className="spend" style={{ width: `${(r.spend / maxFlow) * 100}%` }} />
                </span>
              </span>
              <span className="num earn">{r.earning ? `+${formatCurrency(r.earning, currency)}` : '—'}</span>
              <span className="num spend">{r.spend ? `−${formatCurrency(r.spend, currency)}` : '—'}</span>
              <span className={`num net ${r.net > 0 ? 'pos' : r.net < 0 ? 'neg' : ''}`}>
                {r.net === 0 ? formatCurrency(0, currency) : `${r.net > 0 ? '+' : '−'}${formatCurrency(Math.abs(r.net), currency)}`}
              </span>
              <span className="num breakdown-count-col">
                {r.count || '—'}
                {onSelect && <IoChevronForward className="breakdown-chevron" size={14} />}
              </span>
            </button>
          );
        })}
      </div>

      <div className="breakdown-row breakdown-total">
        <span className="breakdown-label">
          <strong>Total</strong>
          <small>
            {totals.active} of {rows.length} {unitLabel.toLowerCase()}
            {rows.length === 1 ? '' : 's'} active
          </small>
        </span>
        <span className="num earn">+{formatCurrency(totals.earning, currency)}</span>
        <span className="num spend">−{formatCurrency(totals.spend, currency)}</span>
        <span className={`num net ${net >= 0 ? 'pos' : 'neg'}`}>
          {net >= 0 ? '+' : '−'}{formatCurrency(Math.abs(net), currency)}
        </span>
        <span className="num breakdown-count-col">{totals.count}</span>
      </div>
    </div>
  );
}
