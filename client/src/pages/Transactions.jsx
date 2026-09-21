import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  IoAddOutline,
  IoSearchOutline,
  IoTrashOutline,
  IoPencilOutline,
  IoDownloadOutline,
  IoSwapVerticalOutline,
} from 'react-icons/io5';
import { transactionService } from '../services/transactionService';
import { categoryService } from '../services/categoryService';
import useAuthStore from '../store/authStore';
import useToastStore from '../store/toastStore';
import { formatCurrency } from '../utils/formatCurrency';
import { formatDate } from '../utils/formatDate';
import { exportToExcel } from '../utils/exportToExcel';
import Modal from '../components/common/Modal';
import Loader from '../components/common/Loader';

export default function Transactions() {
  const [searchParams] = useSearchParams();
  const { user } = useAuthStore();
  const { addToast } = useToastStore();
  const currency = user?.preferredCurrency || 'INR';

  const [transactions, setTransactions] = useState([]);
  const [categories, setCategories] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, pages: 1 });
  const [loading, setLoading] = useState(true);

  // Filters
  const [typeFilter, setTypeFilter] = useState(''); // '' | 'spend' | 'earning'
  const [categoryFilter, setCategoryFilter] = useState('');
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('transactionDate');
  const [sortOrder, setSortOrder] = useState('desc');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    type: 'spend',
    amount: '',
    categoryId: '',
    description: '',
    transactionDate: new Date().toISOString().split('T')[0],
    notes: '',
  });

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    if (searchParams.get('action') === 'new') {
      openCreateModal();
    }
  }, [searchParams]);

  useEffect(() => {
    fetchTransactions(pagination.page);
  }, [typeFilter, categoryFilter, sortBy, sortOrder, pagination.page]);

  const fetchCategories = async () => {
    try {
      const res = await categoryService.getAll();
      setCategories(res.data || []);
    } catch (err) {
      console.error('Failed to load categories', err);
    }
  };

  const fetchTransactions = async (page = 1) => {
    setLoading(true);
    try {
      const params = {
        page,
        limit: pagination.limit,
        type: typeFilter || undefined,
        categoryId: categoryFilter || undefined,
        search: search || undefined,
        sortBy,
        sortOrder,
      };
      const res = await transactionService.getAll(params);
      setTransactions(res.data.transactions || []);
      setPagination(res.data.pagination || { page: 1, limit: 10, total: 0, pages: 1 });
    } catch (err) {
      console.error('Error loading transactions', err);
      addToast({ type: 'error', message: 'Could not fetch transactions' });
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchTransactions(1);
  };

  const openCreateModal = () => {
    setEditingId(null);
    setFormData({
      type: 'spend',
      amount: '',
      categoryId: categories.find((c) => c.type === 'spend')?.id || '',
      description: '',
      transactionDate: new Date().toISOString().split('T')[0],
      notes: '',
    });
    setIsModalOpen(true);
  };

  const openEditModal = (tx) => {
    setEditingId(tx.id);
    setFormData({
      type: tx.type,
      amount: tx.amount,
      categoryId: tx.categoryId,
      description: tx.description,
      transactionDate: new Date(tx.transactionDate).toISOString().split('T')[0],
      notes: tx.notes || '',
    });
    setIsModalOpen(true);
  };

  const handleSaveTransaction = async (e) => {
    e.preventDefault();
    if (!formData.amount || !formData.categoryId) {
      addToast({ type: 'warning', message: 'Please select a category and enter an amount' });
      return;
    }

    try {
      if (editingId) {
        await transactionService.update(editingId, formData);
        addToast({ type: 'success', message: 'Transaction updated!' });
      } else {
        await transactionService.create(formData);
        addToast({ type: 'success', message: 'Transaction created!' });
      }
      setIsModalOpen(false);
      fetchTransactions(pagination.page);
    } catch (err) {
      addToast({
        type: 'error',
        message: err.response?.data?.error || 'Failed to save transaction',
      });
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this transaction?')) return;
    try {
      await transactionService.delete(id);
      addToast({ type: 'success', message: 'Transaction deleted' });
      fetchTransactions(pagination.page);
    } catch (err) {
      addToast({ type: 'error', message: 'Failed to delete transaction' });
    }
  };

  const handleExport = () => {
    if (transactions.length === 0) {
      addToast({ type: 'warning', message: 'No transactions to export' });
      return;
    }
    const exportData = transactions.map((t) => ({
      Date: formatDate(t.transactionDate),
      Type: t.type.toUpperCase(),
      Description: t.description,
      Category: t.category?.name || 'Uncategorized',
      Amount: t.amount,
      Currency: t.currency || currency,
      Notes: t.notes || '',
    }));
    exportToExcel(exportData, `transactions-${new Date().toISOString().split('T')[0]}`);
    addToast({ type: 'success', message: 'Exported transactions to Excel!' });
  };

  const availableCategories = categories.filter((c) => c.type === formData.type);

  return (
    <div className="page-content">
      {/* Title & Actions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: 'var(--font-size-3xl)', fontWeight: 800, margin: 0 }}>Transactions</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)', marginTop: '4px' }}>
            Record, filter, search, and manage your financial cashflow
          </p>
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <button onClick={handleExport} className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <IoDownloadOutline size={18} />
            <span>Export</span>
          </button>

          <button onClick={openCreateModal} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <IoAddOutline size={20} />
            <span>Add Transaction</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="card" style={{ marginBottom: '24px', padding: '16px' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'center', justifyContent: 'space-between' }}>
          {/* Type Filter Chips */}
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              className={`filter-chip ${typeFilter === '' ? 'active' : ''}`}
              onClick={() => setTypeFilter('')}
            >
              All Types
            </button>
            <button
              className={`filter-chip ${typeFilter === 'spend' ? 'active' : ''}`}
              onClick={() => setTypeFilter('spend')}
            >
              Spends Only
            </button>
            <button
              className={`filter-chip ${typeFilter === 'earning' ? 'active' : ''}`}
              onClick={() => setTypeFilter('earning')}
            >
              Earnings Only
            </button>
          </div>

          {/* Search Form */}
          <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: '8px', flex: 1, maxWidth: '380px' }}>
            <div style={{ position: 'relative', width: '100%' }}>
              <input
                type="text"
                className="form-input"
                placeholder="Search descriptions..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ paddingLeft: '36px', height: '40px' }}
              />
              <IoSearchOutline
                size={18}
                style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }}
              />
            </div>
            <button type="submit" className="btn btn-secondary" style={{ height: '40px' }}>
              Search
            </button>
          </form>

          {/* Category Dropdown & Sort */}
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <select
              className="form-input form-select"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              style={{ height: '40px', width: '160px' }}
            >
              <option value="">All Categories</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.icon} {cat.name}
                </option>
              ))}
            </select>

            <select
              className="form-input form-select"
              value={`${sortBy}-${sortOrder}`}
              onChange={(e) => {
                const [by, ord] = e.target.value.split('-');
                setSortBy(by);
                setSortOrder(ord);
              }}
              style={{ height: '40px', width: '170px' }}
            >
              <option value="transactionDate-desc">Newest First</option>
              <option value="transactionDate-asc">Oldest First</option>
              <option value="amount-desc">Amount: High to Low</option>
              <option value="amount-asc">Amount: Low to High</option>
            </select>
          </div>
        </div>
      </div>

      {/* Transaction List */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}>
          <Loader size={48} />
        </div>
      ) : transactions.length > 0 ? (
        <div className="transaction-list">
          {transactions.map((tx) => (
            <div key={tx.id} className="transaction-item" style={{ cursor: 'default' }}>
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
                <div className="transaction-description" style={{ fontSize: 'var(--font-size-base)' }}>
                  {tx.description || tx.category?.name || 'Transaction'}
                </div>
                <div className="transaction-meta">
                  <span style={{ fontWeight: 600, color: tx.category?.color || 'var(--text-secondary)' }}>
                    {tx.category?.name || 'Uncategorized'}
                  </span>
                  <span>•</span>
                  <span>{formatDate(tx.transactionDate)}</span>
                  {tx.notes && (
                    <>
                      <span>•</span>
                      <span>{tx.notes}</span>
                    </>
                  )}
                </div>
              </div>

              <div className={`transaction-amount ${tx.type}`} style={{ fontSize: 'var(--font-size-lg)', marginRight: '16px' }}>
                {tx.type === 'earning' ? '+' : '-'}{formatCurrency(tx.amount, currency)}
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => openEditModal(tx)}
                  className="btn btn-ghost btn-sm"
                  title="Edit Transaction"
                  style={{ padding: '6px 10px' }}
                >
                  <IoPencilOutline size={18} />
                </button>
                <button
                  onClick={() => handleDelete(tx.id)}
                  className="btn btn-ghost btn-sm"
                  title="Delete Transaction"
                  style={{ padding: '6px 10px', color: 'var(--spend)' }}
                >
                  <IoTrashOutline size={18} />
                </button>
              </div>
            </div>
          ))}

          {/* Pagination Controls */}
          {pagination.pages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '24px', padding: '0 8px' }}>
              <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)' }}>
                Showing page {pagination.page} of {pagination.pages} ({pagination.total} total items)
              </span>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  className="btn btn-secondary btn-sm"
                  disabled={pagination.page <= 1}
                  onClick={() => setPagination((prev) => ({ ...prev, page: prev.page - 1 }))}
                >
                  Previous
                </button>
                <button
                  className="btn btn-secondary btn-sm"
                  disabled={pagination.page >= pagination.pages}
                  onClick={() => setPagination((prev) => ({ ...prev, page: prev.page + 1 }))}
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="card" style={{ textAlign: 'center', padding: '60px 20px' }}>
          <div style={{ fontSize: '3rem', marginBottom: '12px' }}>📊</div>
          <h3 style={{ fontSize: 'var(--font-size-xl)', marginBottom: '8px' }}>No transactions found</h3>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '20px' }}>
            Try adjusting your search criteria or add your first transaction.
          </p>
          <button onClick={openCreateModal} className="btn btn-primary">
            + Add Transaction
          </button>
        </div>
      )}

      {/* Add / Edit Transaction Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingId ? 'Edit Transaction' : 'Record Transaction'}
      >
        <form onSubmit={handleSaveTransaction}>
          {/* Type Selector (Spend / Earning Toggle) */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '20px' }}>
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
                border: '1px solid var(--border)',
              }}
            >
              💸 Spend / Expense
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
                border: '1px solid var(--border)',
              }}
            >
              💰 Earning / Income
            </button>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="amount">Amount ({currency}) *</label>
            <input
              id="amount"
              type="number"
              step="any"
              className="form-input"
              placeholder="e.g. 450.00"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="category">Category *</label>
            <select
              id="category"
              className="form-input form-select"
              value={formData.categoryId}
              onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
              required
            >
              <option value="">Select a Category</option>
              {availableCategories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.icon} {c.name}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="description">
              Description <span style={{ color: 'var(--text-tertiary)', fontWeight: 'normal' }}>(Optional)</span>
            </label>
            <input
              id="description"
              type="text"
              className="form-input"
              placeholder="e.g. Grocery store run, Salary payout (optional)"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="date">Date *</label>
            <input
              id="date"
              type="date"
              className="form-input"
              value={formData.transactionDate}
              onChange={(e) => setFormData({ ...formData, transactionDate: e.target.value })}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="notes">Notes (Optional)</label>
            <textarea
              id="notes"
              className="form-input"
              rows={2}
              placeholder="Add extra context or receipt details..."
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setIsModalOpen(false)}
            >
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              {editingId ? 'Save Changes' : 'Record Transaction'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
