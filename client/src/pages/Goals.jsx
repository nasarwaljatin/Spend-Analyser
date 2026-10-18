import { useState, useEffect, useMemo } from 'react';
import {
  IoAddOutline,
  IoPencilOutline,
  IoTrashOutline,
  IoTrophyOutline,
  IoCalendarOutline,
  IoAddCircleOutline,
  IoRemoveCircleOutline,
} from 'react-icons/io5';
import { goalService } from '../services/goalService';
import useAuthStore from '../store/authStore';
import useToastStore from '../store/toastStore';
import { formatCurrency } from '../utils/formatCurrency';
import { formatDate, formatDateInput } from '../utils/formatDate';
import Modal from '../components/common/Modal';
import Loader from '../components/common/Loader';
import AmountInput from '../components/common/AmountInput';

const GOAL_ICONS = ['🎯', '🏠', '🚗', '✈️', '💍', '🎓', '💻', '📱', '🏖️', '🛡️', '👶', '🎁'];
const GOAL_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#06b6d4', '#8b5cf6', '#84cc16'];

const EMPTY_FORM = {
  name: '',
  icon: '🎯',
  color: '#6366f1',
  targetAmount: '',
  savedAmount: '',
  deadline: '',
};

export default function Goals() {
  const { user } = useAuthStore();
  const { addToast } = useToastStore();
  const currency = user?.preferredCurrency || 'INR';

  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);

  // Create / edit modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState(EMPTY_FORM);

  // Contribution modal
  const [contributeGoal, setContributeGoal] = useState(null);
  const [contributeMode, setContributeMode] = useState('add'); // 'add' | 'withdraw'
  const [contributeAmount, setContributeAmount] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchGoals();
  }, []);

  const fetchGoals = async () => {
    setLoading(true);
    try {
      const res = await goalService.getAll();
      setGoals(res.data || []);
    } catch (err) {
      console.error('Error loading goals', err);
      addToast({ type: 'error', message: 'Failed to load savings goals' });
    } finally {
      setLoading(false);
    }
  };

  const totals = useMemo(() => {
    const target = goals.reduce((sum, g) => sum + g.targetAmount, 0);
    const saved = goals.reduce((sum, g) => sum + g.savedAmount, 0);
    const monthly = goals
      .filter((g) => !g.isCompleted && g.monthlyRequired)
      .reduce((sum, g) => sum + g.monthlyRequired, 0);
    return {
      target,
      saved,
      monthly,
      completed: goals.filter((g) => g.isCompleted).length,
      percent: target > 0 ? Math.round((saved / target) * 100) : 0,
    };
  }, [goals]);

  const openCreateModal = () => {
    setEditingId(null);
    setFormData(EMPTY_FORM);
    setIsModalOpen(true);
  };

  const openEditModal = (g) => {
    setEditingId(g.id);
    setFormData({
      name: g.name,
      icon: g.icon,
      color: g.color,
      targetAmount: g.targetAmount,
      savedAmount: g.savedAmount,
      deadline: g.deadline ? formatDateInput(g.deadline) : '',
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.targetAmount) {
      addToast({ type: 'warning', message: 'Please enter a goal name and target amount' });
      return;
    }

    const payload = {
      name: formData.name,
      icon: formData.icon,
      color: formData.color,
      targetAmount: Number(formData.targetAmount),
      savedAmount: Number(formData.savedAmount) || 0,
      deadline: formData.deadline ? new Date(formData.deadline).toISOString() : null,
    };

    setSaving(true);
    try {
      if (editingId) {
        await goalService.update(editingId, payload);
        addToast({ type: 'success', message: 'Goal updated!' });
      } else {
        await goalService.create(payload);
        addToast({ type: 'success', message: 'Savings goal created!' });
      }
      setIsModalOpen(false);
      fetchGoals();
    } catch (err) {
      addToast({ type: 'error', message: err.response?.data?.error || 'Failed to save goal' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this savings goal?')) return;
    try {
      await goalService.delete(id);
      addToast({ type: 'success', message: 'Goal deleted' });
      fetchGoals();
    } catch {
      addToast({ type: 'error', message: 'Failed to delete goal' });
    }
  };

  const openContribute = (goal, mode) => {
    setContributeGoal(goal);
    setContributeMode(mode);
    setContributeAmount('');
  };

  const handleContribute = async (e) => {
    e.preventDefault();
    const amount = Number(contributeAmount);
    if (!amount || amount <= 0) {
      addToast({ type: 'warning', message: 'Enter a valid amount' });
      return;
    }

    setSaving(true);
    try {
      const signed = contributeMode === 'withdraw' ? -amount : amount;
      const res = await goalService.contribute(contributeGoal.id, signed);
      if (res.data?.isCompleted && !contributeGoal.isCompleted) {
        addToast({ type: 'success', message: `🎉 Goal "${contributeGoal.name}" reached!` });
      } else {
        addToast({
          type: 'success',
          message: contributeMode === 'withdraw' ? 'Withdrawal recorded' : 'Contribution added',
        });
      }
      setContributeGoal(null);
      fetchGoals();
    } catch (err) {
      addToast({ type: 'error', message: err.response?.data?.error || 'Failed to update goal' });
    } finally {
      setSaving(false);
    }
  };

  const deadlineLabel = (g) => {
    if (!g.deadline) return 'No deadline';
    if (g.isCompleted) return `Target date ${formatDate(g.deadline)}`;
    if (g.isOverdue) return `Overdue since ${formatDate(g.deadline)}`;
    if (g.daysLeft === 0) return 'Due today';
    return `${g.daysLeft} day${g.daysLeft === 1 ? '' : 's'} left · ${formatDate(g.deadline)}`;
  };

  return (
    <div className="page-content">
      {/* Header */}
      <div className="page-header-row">
        <div className="page-header-title-group">
          <h1>Savings Goals</h1>
          <p>Plan for the things that matter and track your progress toward them</p>
        </div>

        <div className="page-header-actions">
          <button onClick={openCreateModal} className="btn btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <IoAddOutline size={20} />
            <span>New Goal</span>
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}>
          <Loader size={48} />
        </div>
      ) : goals.length > 0 ? (
        <>
          {/* Overview */}
          <div className="summary-cards">
            <div className="card summary-card savings">
              <div className="summary-card-icon"><IoTrophyOutline /></div>
              <div className="summary-card-label">Total Saved</div>
              <div className="summary-card-value" style={{ color: 'var(--savings)' }}>
                {formatCurrency(totals.saved, currency)}
              </div>
              <div className="summary-card-change positive">
                {totals.percent}% of {formatCurrency(totals.target, currency)}
              </div>
            </div>
            <div className="card summary-card rate">
              <div className="summary-card-icon"><IoCalendarOutline /></div>
              <div className="summary-card-label">Needed Per Month</div>
              <div className="summary-card-value" style={{ color: 'var(--primary)' }}>
                {formatCurrency(totals.monthly, currency)}
              </div>
              <div className="summary-card-change positive">To hit every deadline</div>
            </div>
            <div className="card summary-card earning">
              <div className="summary-card-icon">🏆</div>
              <div className="summary-card-label">Goals Reached</div>
              <div className="summary-card-value" style={{ color: 'var(--earning)' }}>
                {totals.completed} / {goals.length}
              </div>
              <div className="summary-card-change positive">
                {totals.completed === goals.length ? 'All done — set a new one!' : 'Keep going!'}
              </div>
            </div>
          </div>

          <div className="budget-grid">
            {goals.map((g) => (
              <div
                key={g.id}
                className="card"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  opacity: g.isCompleted ? 0.9 : 1,
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                      <div
                        className="category-icon-wrapper"
                        style={{ backgroundColor: `${g.color}20`, border: `1px solid ${g.color}40` }}
                      >
                        {g.icon}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <h3 style={{ fontSize: 'var(--font-size-base)', fontWeight: 700, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {g.name}
                        </h3>
                        <span style={{ fontSize: 'var(--font-size-xs)', color: g.isOverdue ? 'var(--spend)' : 'var(--text-tertiary)' }}>
                          {deadlineLabel(g)}
                        </span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '4px' }}>
                      <button
                        type="button"
                        onClick={() => openEditModal(g)}
                        className="btn btn-ghost btn-sm"
                        title="Edit Goal"
                        aria-label="Edit Goal"
                        style={{ padding: '6px' }}
                      >
                        <IoPencilOutline size={16} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(g.id)}
                        className="btn btn-ghost btn-sm"
                        title="Delete Goal"
                        aria-label="Delete Goal"
                        style={{ padding: '6px', color: 'var(--spend)' }}
                      >
                        <IoTrashOutline size={16} />
                      </button>
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '8px' }}>
                    <span style={{ fontSize: 'var(--font-size-xl)', fontWeight: 800 }} className="tabular-nums">
                      {formatCurrency(g.savedAmount, currency)}
                    </span>
                    <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)' }}>
                      of {formatCurrency(g.targetAmount, currency)}
                    </span>
                  </div>

                  <div className="budget-bar-track" style={{ height: '10px', marginBottom: '8px' }}>
                    <div
                      className="budget-bar-fill"
                      style={{ width: `${g.progressPercent}%`, background: g.color }}
                    />
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)' }}>
                    <span>{g.progressPercent}% saved</span>
                    <span>
                      {g.isCompleted
                        ? '🎉 Goal reached!'
                        : g.monthlyRequired
                          ? `Save ${formatCurrency(g.monthlyRequired, currency)}/mo`
                          : `${formatCurrency(g.remaining, currency)} to go`}
                    </span>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '8px', borderTop: '1px solid var(--border-light)', paddingTop: '12px', marginTop: '16px' }}>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    style={{ flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                    onClick={() => openContribute(g, 'add')}
                  >
                    <IoAddCircleOutline size={16} /> Add Money
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                    onClick={() => openContribute(g, 'withdraw')}
                    disabled={g.savedAmount <= 0}
                  >
                    <IoRemoveCircleOutline size={16} /> Withdraw
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      ) : (
        <div className="card" style={{ textAlign: 'center', padding: '60px 20px' }}>
          <div style={{ fontSize: '3rem', marginBottom: '12px' }}>🏦</div>
          <h3 style={{ fontSize: 'var(--font-size-xl)', marginBottom: '8px' }}>No savings goals yet</h3>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '20px' }}>
            Saving for a trip, a gadget or an emergency fund? Create a goal and watch it grow.
          </p>
          <button onClick={openCreateModal} className="btn btn-primary">
            + Create Your First Goal
          </button>
        </div>
      )}

      {/* Create / Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingId ? 'Edit Savings Goal' : 'New Savings Goal'}
      >
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="goalName">Goal Name *</label>
            <input
              id="goalName"
              className="form-input"
              placeholder="e.g. Goa Trip, Emergency Fund"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              maxLength={100}
              required
            />
          </div>

          <div className="form-group">
            <span className="form-label">Icon</span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {GOAL_ICONS.map((icon) => (
                <button
                  key={icon}
                  type="button"
                  onClick={() => setFormData({ ...formData, icon })}
                  className="btn btn-ghost btn-sm"
                  aria-label={`Use icon ${icon}`}
                  style={{
                    fontSize: '1.25rem',
                    padding: '6px 8px',
                    border: formData.icon === icon ? '2px solid var(--primary)' : '2px solid transparent',
                  }}
                >
                  {icon}
                </button>
              ))}
            </div>
          </div>

          <div className="form-group">
            <span className="form-label">Color</span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {GOAL_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setFormData({ ...formData, color })}
                  aria-label={`Use color ${color}`}
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: '50%',
                    background: color,
                    cursor: 'pointer',
                    border: formData.color === color ? '3px solid var(--text-primary)' : '3px solid transparent',
                  }}
                />
              ))}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="goalTarget">Target Amount ({currency}) *</label>
            <AmountInput
              id="goalTarget"
              value={formData.targetAmount}
              onChange={(v) => setFormData({ ...formData, targetAmount: v })}
              placeholder="e.g. 50000"
              currency={currency}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="goalSaved">Already Saved ({currency})</label>
            <AmountInput
              id="goalSaved"
              value={formData.savedAmount}
              onChange={(v) => setFormData({ ...formData, savedAmount: v })}
              placeholder="0"
              currency={currency}
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="goalDeadline">Target Date (optional)</label>
            <input
              id="goalDeadline"
              type="date"
              className="form-input"
              value={formData.deadline}
              onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
            <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {editingId ? 'Update Goal' : 'Create Goal'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Contribute / Withdraw Modal */}
      <Modal
        isOpen={!!contributeGoal}
        onClose={() => setContributeGoal(null)}
        title={contributeMode === 'withdraw' ? 'Withdraw from Goal' : 'Add Money to Goal'}
      >
        {contributeGoal && (
          <form onSubmit={handleContribute}>
            <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)', marginTop: 0 }}>
              {contributeGoal.icon} <strong>{contributeGoal.name}</strong> —{' '}
              {formatCurrency(contributeGoal.savedAmount, currency)} saved of{' '}
              {formatCurrency(contributeGoal.targetAmount, currency)}
            </p>
            <div className="form-group">
              <label className="form-label" htmlFor="contributeAmount">Amount ({currency}) *</label>
              <AmountInput
                id="contributeAmount"
                value={contributeAmount}
                onChange={setContributeAmount}
                placeholder={contributeMode === 'withdraw' ? 'e.g. 1000' : `e.g. ${Math.round(contributeGoal.monthlyRequired || 1000)}`}
                currency={currency}
                required
              />
            </div>
            {contributeMode === 'add' && contributeGoal.remaining > 0 && (
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => setContributeAmount(String(contributeGoal.remaining))}
              >
                Fill remaining {formatCurrency(contributeGoal.remaining, currency)}
              </button>
            )}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setContributeGoal(null)}>
                Cancel
              </button>
              <button
                type="submit"
                className={`btn ${contributeMode === 'withdraw' ? 'btn-danger' : 'btn-primary'}`}
                disabled={saving}
              >
                {contributeMode === 'withdraw' ? 'Withdraw' : 'Add Money'}
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
