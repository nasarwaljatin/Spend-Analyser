import { useState, useEffect } from 'react';
import {
  IoAddOutline,
  IoPencilOutline,
  IoTrashOutline,
  IoPauseOutline,
  IoPlayOutline,
  IoRepeatOutline,
} from 'react-icons/io5';
import { recurringService } from '../services/reportService';
import { categoryService } from '../services/categoryService';
import useAuthStore from '../store/authStore';
import useToastStore from '../store/toastStore';
import { formatCurrency } from '../utils/formatCurrency';
import { formatDate } from '../utils/formatDate';
import Modal from '../components/common/Modal';
import Loader from '../components/common/Loader';

const FREQUENCIES = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'yearly', label: 'Yearly' },
];

export default function Recurring() {
  const { user } = useAuthStore();
  const { addToast } = useToastStore();
  const currency = user?.preferredCurrency || 'INR';

  const [rules, setRules] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    description: '',
    type: 'spend',
    amount: '',
    categoryId: '',
    frequency: 'monthly',
    startDate: new Date().toISOString().split('T')[0],
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [recRes, catRes] = await Promise.all([
        recurringService.getAll(),
        categoryService.getAll(),
      ]);
      setRules(recRes.data || []);
      setCategories(catRes.data || []);
    } catch (err) {
      console.error('Failed to load recurring transactions', err);
      addToast({ type: 'error', message: 'Failed to load recurring rules' });
    } finally {
      setLoading(false);
    }
  };

  const openCreateModal = () => {
    setEditingId(null);
    setFormData({
      description: '',
      type: 'spend',
      amount: '',
      categoryId: categories.find((c) => c.type === 'spend')?.id || '',
      frequency: 'monthly',
      startDate: new Date().toISOString().split('T')[0],
    });
    setIsModalOpen(true);
  };

  const openEditModal = (rule) => {
    setEditingId(rule.id);
    setFormData({
      description: rule.description,
      type: rule.type,
      amount: rule.amount,
      categoryId: rule.categoryId,
      frequency: rule.frequency,
      startDate: new Date(rule.startDate).toISOString().split('T')[0],
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.description || !formData.amount || !formData.categoryId) {
      addToast({ type: 'warning', message: 'Please complete all required fields' });
      return;
    }

    try {
      if (editingId) {
        await recurringService.update(editingId, formData);
        addToast({ type: 'success', message: 'Recurring transaction updated!' });
      } else {
        await recurringService.create(formData);
        addToast({ type: 'success', message: 'Recurring schedule created!' });
      }
      setIsModalOpen(false);
      fetchData();
    } catch (err) {
      addToast({
        type: 'error',
        message: err.response?.data?.error || 'Failed to save recurring rule',
      });
    }
  };

  const handleToggleActive = async (rule) => {
    try {
      if (rule.isActive) {
        await recurringService.pause(rule.id);
        addToast({ type: 'success', message: 'Recurring rule paused' });
      } else {
        await recurringService.resume(rule.id);
        addToast({ type: 'success', message: 'Recurring rule resumed' });
      }
      fetchData();
    } catch (err) {
      addToast({ type: 'error', message: 'Failed to update rule status' });
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this recurring rule?')) return;
    try {
      await recurringService.delete(id);
      addToast({ type: 'success', message: 'Recurring rule removed' });
      fetchData();
    } catch (err) {
      addToast({ type: 'error', message: 'Failed to delete rule' });
    }
  };

  const availableCategories = categories.filter((c) => c.type === formData.type);

  return (
    <div className="page-content">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: 'var(--font-size-3xl)', fontWeight: 800, margin: 0 }}>Recurring Payments</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)', marginTop: '4px' }}>
            Automate monthly bills, subscriptions, paychecks, and regular obligations
          </p>
        </div>

        <button onClick={openCreateModal} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <IoAddOutline size={20} />
          <span>New Recurring Rule</span>
        </button>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}>
          <Loader size={48} />
        </div>
      ) : rules.length > 0 ? (
        <div className="transaction-list">
          {rules.map((rule) => (
            <div
              key={rule.id}
              className="transaction-item"
              style={{
                opacity: rule.isActive ? 1 : 0.6,
                borderLeft: rule.isActive ? '4px solid var(--primary)' : '4px solid var(--border)',
              }}
            >
              <div
                className="transaction-icon"
                style={{
                  backgroundColor: rule.type === 'earning' ? 'var(--earning-bg)' : 'var(--spend-bg)',
                  color: rule.type === 'earning' ? 'var(--earning)' : 'var(--spend)',
                }}
              >
                {rule.category?.icon || <IoRepeatOutline size={20} />}
              </div>

              <div className="transaction-details">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span className="transaction-description" style={{ fontSize: 'var(--font-size-base)' }}>
                    {rule.description}
                  </span>
                  <span
                    style={{
                      fontSize: '10px',
                      textTransform: 'uppercase',
                      padding: '2px 8px',
                      borderRadius: 'var(--radius-full)',
                      fontWeight: 700,
                      backgroundColor: rule.isActive ? 'var(--earning-bg)' : 'var(--bg-input)',
                      color: rule.isActive ? 'var(--earning)' : 'var(--text-tertiary)',
                    }}
                  >
                    {rule.isActive ? 'Active' : 'Paused'}
                  </span>
                </div>

                <div className="transaction-meta">
                  <span>{rule.frequency.toUpperCase()}</span>
                  <span>•</span>
                  <span>Category: {rule.category?.name || 'General'}</span>
                  <span>•</span>
                  <span>Next Due: {formatDate(rule.nextDueDate || rule.startDate)}</span>
                </div>
              </div>

              <div className={`transaction-amount ${rule.type}`} style={{ fontSize: 'var(--font-size-lg)', marginRight: '16px' }}>
                {rule.type === 'earning' ? '+' : '-'}{formatCurrency(rule.amount, currency)}
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => handleToggleActive(rule)}
                  className="btn btn-ghost btn-sm"
                  title={rule.isActive ? 'Pause rule' : 'Resume rule'}
                  style={{ padding: '6px 10px' }}
                >
                  {rule.isActive ? <IoPauseOutline size={18} /> : <IoPlayOutline size={18} color="var(--earning)" />}
                </button>
                <button
                  onClick={() => openEditModal(rule)}
                  className="btn btn-ghost btn-sm"
                  title="Edit rule"
                  style={{ padding: '6px 10px' }}
                >
                  <IoPencilOutline size={18} />
                </button>
                <button
                  onClick={() => handleDelete(rule.id)}
                  className="btn btn-ghost btn-sm"
                  title="Delete rule"
                  style={{ padding: '6px 10px', color: 'var(--spend)' }}
                >
                  <IoTrashOutline size={18} />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="card" style={{ textAlign: 'center', padding: '60px 20px' }}>
          <div style={{ fontSize: '3rem', marginBottom: '12px' }}>🔄</div>
          <h3 style={{ fontSize: 'var(--font-size-xl)', marginBottom: '8px' }}>No recurring rules</h3>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '20px' }}>
            Set up automatic schedules for Netflix, gym memberships, rent, or your monthly salary.
          </p>
          <button onClick={openCreateModal} className="btn btn-primary">
            + Schedule Recurring Flow
          </button>
        </div>
      )}

      {/* Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingId ? 'Edit Recurring Schedule' : 'New Recurring Schedule'}
      >
        <form onSubmit={handleSubmit}>
          {/* Type Selector */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '16px' }}>
            <button
              type="button"
              className="btn"
              onClick={() => {
                setFormData((prev) => ({
                  ...prev,
                  type: 'spend',
                  categoryId: categories.find((c) => c.type === 'spend')?.id || '',
                }));
              }}
              style={{
                backgroundColor: formData.type === 'spend' ? 'var(--spend)' : 'var(--bg-input)',
                color: formData.type === 'spend' ? '#fff' : 'var(--text-secondary)',
              }}
            >
              💸 Spend / Bill
            </button>
            <button
              type="button"
              className="btn"
              onClick={() => {
                setFormData((prev) => ({
                  ...prev,
                  type: 'earning',
                  categoryId: categories.find((c) => c.type === 'earning')?.id || '',
                }));
              }}
              style={{
                backgroundColor: formData.type === 'earning' ? 'var(--earning)' : 'var(--bg-input)',
                color: formData.type === 'earning' ? '#fff' : 'var(--text-secondary)',
              }}
            >
              💰 Income / Salary
            </button>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="recDesc">Description *</label>
            <input
              id="recDesc"
              type="text"
              className="form-input"
              placeholder="e.g. Netflix Subscription, Apartment Rent"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="recAmount">Amount ({currency}) *</label>
            <input
              id="recAmount"
              type="number"
              step="any"
              className="form-input"
              placeholder="e.g. 649"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="recCategory">Category *</label>
            <select
              id="recCategory"
              className="form-input form-select"
              value={formData.categoryId}
              onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
              required
            >
              <option value="">Select Category</option>
              {availableCategories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.icon} {c.name}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="frequency">Frequency</label>
            <select
              id="frequency"
              className="form-input form-select"
              value={formData.frequency}
              onChange={(e) => setFormData({ ...formData, frequency: e.target.value })}
            >
              {FREQUENCIES.map((f) => (
                <option key={f.value} value={f.value}>
                  {f.label}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="startDate">Start Date</label>
            <input
              id="startDate"
              type="date"
              className="form-input"
              value={formData.startDate}
              onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
              required
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
            <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              {editingId ? 'Save Changes' : 'Create Recurring Rule'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
