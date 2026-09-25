import { useState, useEffect, useMemo } from 'react';
import {
  IoAddOutline,
  IoPencilOutline,
  IoTrashOutline,
  IoAlertCircleOutline,
  IoCheckmarkCircleOutline,
  IoWarningOutline,
} from 'react-icons/io5';
import { budgetService } from '../services/reportService';
import { categoryService } from '../services/categoryService';
import useAuthStore from '../store/authStore';
import useToastStore from '../store/toastStore';
import { formatCurrency } from '../utils/formatCurrency';
import Modal from '../components/common/Modal';
import Loader from '../components/common/Loader';

export default function Budgets() {
  const { user } = useAuthStore();
  const { addToast } = useToastStore();
  const currency = user?.preferredCurrency || 'INR';

  const [budgets, setBudgets] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    categoryId: '',
    limitAmount: '',
    period: 'monthly',
    alertThreshold: 0.8,
    alertEnabled: true,
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [budgetRes, catRes] = await Promise.all([
        budgetService.getAll(),
        categoryService.getAll('spend'),
      ]);
      setBudgets(budgetRes.data || []);
      setCategories(catRes.data || []);
    } catch (err) {
      console.error('Error loading budgets', err);
      addToast({ type: 'error', message: 'Failed to load budgets' });
    } finally {
      setLoading(false);
    }
  };

  const sortedCategories = useMemo(() => {
    return [...categories].sort((a, b) => {
      const countA = a._count?.transactions || 0;
      const countB = b._count?.transactions || 0;
      if (countB !== countA) return countB - countA;
      return a.name.localeCompare(b.name);
    });
  }, [categories]);

  const openCreateModal = () => {
    setEditingId(null);
    setFormData({
      categoryId: categories[0]?.id || '',
      limitAmount: '',
      period: 'monthly',
      alertThreshold: 0.8,
      alertEnabled: true,
    });
    setIsModalOpen(true);
  };

  const openEditModal = (b) => {
    setEditingId(b.id);
    setFormData({
      categoryId: b.categoryId,
      limitAmount: b.limitAmount,
      period: b.period,
      alertThreshold: b.alertThreshold || 0.8,
      alertEnabled: b.alertEnabled ?? true,
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.categoryId || !formData.limitAmount) {
      addToast({ type: 'warning', message: 'Please specify category and limit amount' });
      return;
    }

    const payload = {
      ...formData,
      limitAmount: Number(formData.limitAmount),
      year: new Date().getFullYear(),
      month: formData.period === 'monthly' ? new Date().getMonth() + 1 : null,
    };

    try {
      if (editingId) {
        await budgetService.update(editingId, payload);
        addToast({ type: 'success', message: 'Budget updated successfully!' });
      } else {
        await budgetService.create(payload);
        addToast({ type: 'success', message: 'Budget created successfully!' });
      }
      setIsModalOpen(false);
      fetchData();
    } catch (err) {
      addToast({
        type: 'error',
        message: err.response?.data?.error || 'Failed to save budget',
      });
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to remove this budget?')) return;
    try {
      await budgetService.delete(id);
      addToast({ type: 'success', message: 'Budget deleted' });
      fetchData();
    } catch (err) {
      addToast({ type: 'error', message: 'Failed to delete budget' });
    }
  };

  return (
    <div className="page-content">
      {/* Header */}
      <div className="page-header-row">
        <div className="page-header-title-group">
          <h1>Category Budgets</h1>
          <p>
            Set spending ceilings and monitor threshold limits in real time
          </p>
        </div>

        <div className="page-header-actions">
          <button onClick={openCreateModal} className="btn btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <IoAddOutline size={20} />
            <span>Set Budget</span>
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}>
          <Loader size={48} />
        </div>
      ) : budgets.length > 0 ? (
        <div className="budget-grid">
          {budgets.map((b) => {
            const spent = b.spent || 0;
            const limit = b.limitAmount || 1;
            const remaining = limit - spent;
            const percentage = Math.round((spent / limit) * 100);

            let status = 'safe';
            let statusIcon = <IoCheckmarkCircleOutline size={18} color="var(--earning)" />;
            let statusText = 'Within Budget';

            if (percentage >= 100) {
              status = 'danger';
              statusIcon = <IoAlertCircleOutline size={18} color="var(--spend)" />;
              statusText = 'Budget Exceeded!';
            } else if (percentage >= (b.alertThreshold || 0.8) * 100) {
              status = 'warning';
              statusIcon = <IoWarningOutline size={18} color="var(--warning)" />;
              statusText = 'Approaching Limit';
            }

            return (
              <div key={b.id} className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div
                        className="category-icon-wrapper"
                        style={{
                          backgroundColor: `${b.category?.color || '#6366f1'}20`,
                          border: `1px solid ${b.category?.color || '#6366f1'}40`,
                        }}
                      >
                        {b.category?.icon || '📁'}
                      </div>
                      <div>
                        <h3 style={{ fontSize: 'var(--font-size-base)', fontWeight: 700, margin: 0 }}>
                          {b.category?.name || 'Category'}
                        </h3>
                        <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)' }}>
                          {b.period.toUpperCase()} BUDGET
                        </span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '4px' }}>
                      <button
                        type="button"
                        onClick={() => openEditModal(b)}
                        className="btn btn-ghost btn-sm"
                        title="Edit Budget"
                        aria-label="Edit Budget"
                        style={{ padding: '6px' }}
                      >
                        <IoPencilOutline size={16} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(b.id)}
                        className="btn btn-ghost btn-sm"
                        title="Delete Budget"
                        aria-label="Delete Budget"
                        style={{ padding: '6px', color: 'var(--spend)' }}
                      >
                        <IoTrashOutline size={16} />
                      </button>
                    </div>
                  </div>

                  {/* Numbers */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)' }}>
                      Spent: <strong style={{ color: 'var(--text-primary)' }}>{formatCurrency(spent, currency)}</strong>
                    </span>
                    <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)' }}>
                      Cap: <strong style={{ color: 'var(--text-primary)' }}>{formatCurrency(limit, currency)}</strong>
                    </span>
                  </div>

                  {/* Progress Bar */}
                  <div className="budget-bar-track" style={{ height: '10px', marginBottom: '12px' }}>
                    <div
                      className={`budget-bar-fill ${status}`}
                      style={{ width: `${Math.min(100, percentage)}%` }}
                    />
                  </div>
                </div>

                {/* Footer Status */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-light)', paddingTop: '12px', marginTop: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: 'var(--font-size-xs)', fontWeight: 600 }}>
                    {statusIcon}
                    <span>{statusText}</span>
                  </div>

                  <span style={{ fontSize: 'var(--font-size-xs)', fontWeight: 700, color: remaining >= 0 ? 'var(--text-secondary)' : 'var(--spend)' }}>
                    {remaining >= 0 ? `${formatCurrency(remaining, currency)} left` : `${formatCurrency(Math.abs(remaining), currency)} over`}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="card" style={{ textAlign: 'center', padding: '60px 20px' }}>
          <div style={{ fontSize: '3rem', marginBottom: '12px' }}>🎯</div>
          <h3 style={{ fontSize: 'var(--font-size-xl)', marginBottom: '8px' }}>No budgets set</h3>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '20px' }}>
            Set category limits to keep your spending controlled and receive alerts.
          </p>
          <button onClick={openCreateModal} className="btn btn-primary">
            + Set Your First Budget
          </button>
        </div>
      )}

      {/* Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingId ? 'Edit Category Budget' : 'Set Category Budget'}
      >
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="budgetCat">Category *</label>
            <select
              id="budgetCat"
              className="form-input form-select"
              value={formData.categoryId}
              onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
              required
            >
              <option value="">Select Spend Category</option>
              {sortedCategories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.icon} {c.name}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="limitAmount">Monthly Spending Limit ({currency}) *</label>
            <input
              id="limitAmount"
              type="number"
              step="any"
              className="form-input"
              placeholder="e.g. 15000"
              value={formData.limitAmount}
              onChange={(e) => setFormData({ ...formData, limitAmount: e.target.value })}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="threshold">Alert Threshold ({Math.round(formData.alertThreshold * 100)}%)</label>
            <input
              id="threshold"
              type="range"
              min="0.5"
              max="1.0"
              step="0.05"
              value={formData.alertThreshold}
              onChange={(e) => setFormData({ ...formData, alertThreshold: parseFloat(e.target.value) })}
              style={{ width: '100%' }}
            />
            <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)' }}>
              Warn me when spending exceeds {Math.round(formData.alertThreshold * 100)}% of this budget.
            </span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
            <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              {editingId ? 'Update Budget' : 'Set Budget'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
