import { useState, useEffect, useMemo, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  IoAddOutline,
  IoSearchOutline,
  IoTrashOutline,
  IoPencilOutline,
  IoDownloadOutline,
  IoSwapVerticalOutline,
  IoFolderOutline,
  IoCheckmarkDoneOutline,
  IoCloseOutline,
} from 'react-icons/io5';
import { transactionService } from '../services/transactionService';
import { categoryService } from '../services/categoryService';
import useAuthStore from '../store/authStore';
import useToastStore from '../store/toastStore';
import { formatCurrency } from '../utils/formatCurrency';
import { formatDate, formatTime, formatDateTime, formatDateTimeInput } from '../utils/formatDate';
import { exportToExcel } from '../utils/exportToExcel';
import Modal from '../components/common/Modal';
import Loader from '../components/common/Loader';
import AmountInput from '../components/common/AmountInput';

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

  // Single Transaction Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    type: 'spend',
    amount: '',
    categoryId: '',
    description: '',
    transactionDate: formatDateTimeInput(new Date()),
    notes: '',
  });

  // Bulk Selection State
  const [selectedIds, setSelectedIds] = useState([]);
  const [isBulkCategoryModalOpen, setIsBulkCategoryModalOpen] = useState(false);
  const [bulkTargetCategoryId, setBulkTargetCategoryId] = useState('');
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);
  const [bulkLoading, setBulkLoading] = useState(false);
  const selectAllRef = useRef(null);

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
      const list = res.data || [];
      setCategories(list);
      return list;
    } catch (err) {
      console.error('Failed to load categories', err);
      return [];
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
      const list = res.data?.transactions || res.data?.data || (Array.isArray(res.data) ? res.data : []);
      const paginationData = res.data?.pagination || { page: 1, limit: 10, total: list.length, pages: 1 };
      if (!paginationData.pages && paginationData.totalPages) {
        paginationData.pages = paginationData.totalPages;
      }
      setTransactions(list);
      setPagination(paginationData);
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

  const openCreateModal = async () => {
    setEditingId(null);
    let cats = categories;
    if (!cats || cats.length === 0) {
      cats = await fetchCategories();
    }
    const defaultCat = cats.find((c) => c.type === 'spend' && !c.isHidden) || cats.find((c) => c.type === 'spend') || cats[0];
    setFormData({
      type: 'spend',
      amount: '',
      categoryId: defaultCat?.id || '',
      description: '',
      transactionDate: formatDateTimeInput(new Date()),
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
      transactionDate: formatDateTimeInput(tx.transactionDate),
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

    const payload = {
      ...formData,
      amount: Number(formData.amount),
      transactionDate: new Date(formData.transactionDate).toISOString(),
    };

    try {
      if (editingId) {
        await transactionService.update(editingId, payload);
        addToast({ type: 'success', message: 'Transaction updated!' });
      } else {
        await transactionService.create(payload);
        addToast({ type: 'success', message: 'Transaction created!' });
      }
      setIsModalOpen(false);
      fetchTransactions(pagination.page);
      fetchCategories();
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
      setSelectedIds((prev) => prev.filter((item) => item !== id));
      fetchTransactions(pagination.page);
      fetchCategories();
    } catch {
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
      Time: formatTime(t.transactionDate),
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

  // Bulk Selection Logic
  const allPageSelected =
    transactions.length > 0 && transactions.every((tx) => selectedIds.includes(tx.id));
  const somePageSelected =
    transactions.some((tx) => selectedIds.includes(tx.id)) && !allPageSelected;

  useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate = somePageSelected;
    }
  }, [somePageSelected]);

  const toggleSelect = (id, e) => {
    if (e) e.stopPropagation();
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (allPageSelected) {
      const pageIdSet = new Set(transactions.map((t) => t.id));
      setSelectedIds((prev) => prev.filter((id) => !pageIdSet.has(id)));
    } else {
      const pageIds = transactions.map((t) => t.id);
      setSelectedIds((prev) => Array.from(new Set([...prev, ...pageIds])));
    }
  };

  const clearSelection = () => {
    setSelectedIds([]);
  };

  const selectedTransactions = useMemo(() => {
    const idSet = new Set(selectedIds);
    return transactions.filter((t) => idSet.has(t.id));
  }, [transactions, selectedIds]);

  const selectedStats = useMemo(() => {
    let totalSpend = 0;
    let totalEarning = 0;
    let spendCount = 0;
    let earningCount = 0;

    selectedTransactions.forEach((tx) => {
      const amt = Number(tx.amount) || 0;
      if (tx.type === 'earning') {
        totalEarning += amt;
        earningCount++;
      } else {
        totalSpend += amt;
        spendCount++;
      }
    });

    const net = totalEarning - totalSpend;
    return {
      totalSpend,
      totalEarning,
      net,
      spendCount,
      earningCount,
      count: selectedIds.length,
    };
  }, [selectedTransactions, selectedIds]);

  const handleBulkExport = () => {
    if (selectedTransactions.length === 0) {
      addToast({ type: 'warning', message: 'No transactions selected to export' });
      return;
    }
    const exportData = selectedTransactions.map((t) => ({
      Date: formatDate(t.transactionDate),
      Time: formatTime(t.transactionDate),
      Type: t.type.toUpperCase(),
      Description: t.description,
      Category: t.category?.name || 'Uncategorized',
      Amount: t.amount,
      Currency: t.currency || currency,
      Notes: t.notes || '',
    }));
    exportToExcel(exportData, `selected-transactions-${new Date().toISOString().split('T')[0]}`);
    addToast({
      type: 'success',
      message: `Exported ${selectedTransactions.length} selected transaction(s) to Excel!`,
    });
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    setBulkLoading(true);
    try {
      const res = await transactionService.bulkDelete(selectedIds);
      addToast({
        type: 'success',
        message: res.data?.message || `Deleted ${selectedIds.length} transactions successfully!`,
      });
      setIsBulkDeleteModalOpen(false);
      clearSelection();
      fetchTransactions(pagination.page);
      fetchCategories();
    } catch (err) {
      addToast({
        type: 'error',
        message: err.response?.data?.error || 'Failed to delete selected transactions',
      });
    } finally {
      setBulkLoading(false);
    }
  };

  const handleBulkUpdateCategory = async (e) => {
    e.preventDefault();
    if (!bulkTargetCategoryId) {
      addToast({ type: 'warning', message: 'Please select a destination category' });
      return;
    }
    setBulkLoading(true);
    try {
      const res = await transactionService.bulkUpdateCategory(selectedIds, bulkTargetCategoryId);
      addToast({
        type: 'success',
        message: res.data?.message || `Updated category for ${selectedIds.length} transactions!`,
      });
      setIsBulkCategoryModalOpen(false);
      clearSelection();
      fetchTransactions(pagination.page);
      fetchCategories();
    } catch (err) {
      addToast({
        type: 'error',
        message: err.response?.data?.error || 'Failed to update transaction category',
      });
    } finally {
      setBulkLoading(false);
    }
  };

  const availableCategories = useMemo(() => {
    const list = categories.filter((c) => (c.type || '').toLowerCase() === (formData.type || '').toLowerCase());
    const unhidden = list.filter((c) => c.isHidden !== true && c.isHidden !== 1);
    const finalChoices = unhidden.length > 0 ? unhidden : list;

    return [...finalChoices].sort((a, b) => {
      const countA = a._count?.transactions || 0;
      const countB = b._count?.transactions || 0;
      if (countB !== countA) return countB - countA;
      return (a.name || '').localeCompare(b.name || '');
    });
  }, [categories, formData.type]);

  useEffect(() => {
    if (availableCategories.length > 0 && !availableCategories.some((c) => c.id === formData.categoryId)) {
      setFormData((prev) => ({
        ...prev,
        categoryId: availableCategories[0].id,
      }));
    }
  }, [availableCategories]);

  return (
    <div className="page-content">
      {/* Title & Actions */}
      <div className="page-header-row">
        <div className="page-header-title-group">
          <h1>Transactions</h1>
          <p>
            Record, filter, search, and manage your financial cashflow
          </p>
        </div>

        <div className="page-header-actions">
          <button onClick={handleExport} className="btn btn-secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <IoDownloadOutline size={18} />
            <span>Export All</span>
          </button>

          <button onClick={openCreateModal} className="btn btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <IoAddOutline size={20} />
            <span>Add Transaction</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="card filter-bar-card">
        <div className="filter-bar-flex">
          {/* Type Filter Chips */}
          <div className="filter-chips-group">
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
          <form onSubmit={handleSearchSubmit} className="search-form-group">
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
          <div className="filter-selects-group">
            <select
              className="form-input form-select"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              aria-label="Filter by category"
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
              aria-label="Sort transactions"
            >
              <option value="transactionDate-desc">Newest First</option>
              <option value="transactionDate-asc">Oldest First</option>
              <option value="amount-desc">Amount: High to Low</option>
              <option value="amount-asc">Amount: Low to High</option>
            </select>
          </div>
        </div>
      </div>

      {/* Floating / Sticky Combined Bulk Actions Bar */}
      {selectedIds.length > 0 && (
        <div className="bulk-actions-banner">
          <div className="bulk-info-group">
            <div className="bulk-badge">
              <IoCheckmarkDoneOutline size={15} />
              <span>{selectedIds.length} Selected</span>
            </div>

            <div className="bulk-stats-group">
              {selectedStats.spendCount > 0 && (
                <span className="bulk-stat-pill spend" title="Combined Spends">
                  💸 Spends: -{formatCurrency(selectedStats.totalSpend, currency)} ({selectedStats.spendCount})
                </span>
              )}
              {selectedStats.earningCount > 0 && (
                <span className="bulk-stat-pill earning" title="Combined Earnings">
                  💰 Income: +{formatCurrency(selectedStats.totalEarning, currency)} ({selectedStats.earningCount})
                </span>
              )}
              <span className="bulk-stat-pill net" title="Combined Net Difference">
                Net: {selectedStats.net >= 0 ? '+' : ''}{formatCurrency(selectedStats.net, currency)}
              </span>
            </div>
          </div>

          <div className="bulk-buttons-group">
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => {
                setBulkTargetCategoryId(categories[0]?.id || '');
                setIsBulkCategoryModalOpen(true);
              }}
              title="Change category for selected transactions"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              <IoFolderOutline size={16} />
              <span>Change Category</span>
            </button>

            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={handleBulkExport}
              title="Export selected transactions to Excel"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              <IoDownloadOutline size={16} />
              <span>Export Selected</span>
            </button>

            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => setIsBulkDeleteModalOpen(true)}
              title="Delete all selected transactions"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                color: 'var(--spend)',
                borderColor: 'rgba(239, 68, 68, 0.4)',
              }}
            >
              <IoTrashOutline size={16} />
              <span>Delete Selected</span>
            </button>

            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={clearSelection}
              title="Deselect all"
              style={{ color: 'var(--text-tertiary)', padding: '6px' }}
              aria-label="Clear selection"
            >
              <IoCloseOutline size={20} />
            </button>
          </div>
        </div>
      )}

      {/* Transaction List */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}>
          <Loader size={48} />
        </div>
      ) : transactions.length > 0 ? (
        <div className="transaction-list">
          {/* List Selection Toolbar */}
          <div className="transactions-toolbar">
            <div className="transactions-toolbar-left">
              <label className="select-all-label">
                <input
                  ref={selectAllRef}
                  type="checkbox"
                  className="custom-checkbox"
                  checked={allPageSelected}
                  onChange={toggleSelectAll}
                  aria-label="Select all transactions on this page"
                />
                <span>
                  {allPageSelected
                    ? `All ${transactions.length} selected on this page`
                    : selectedIds.length > 0
                    ? `${selectedIds.length} transaction(s) selected`
                    : `Select all on page (${transactions.length})`}
                </span>
              </label>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              {selectedIds.length > 0 && (
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={clearSelection}
                  style={{ color: 'var(--text-secondary)', padding: '2px 8px', fontSize: 'var(--font-size-xs)' }}
                >
                  Clear Selection
                </button>
              )}
              <span style={{ color: 'var(--text-tertiary)', fontSize: 'var(--font-size-xs)' }}>
                Page {pagination.page} of {pagination.pages} ({pagination.total} total)
              </span>
            </div>
          </div>

          {/* List Items */}
          {transactions.map((tx) => {
            const isSelected = selectedIds.includes(tx.id);
            return (
              <div
                key={tx.id}
                className={`transaction-item ${isSelected ? 'selected' : ''}`}
                onClick={(e) => {
                  if (!e.target.closest('button') && !e.target.closest('input')) {
                    toggleSelect(tx.id);
                  }
                }}
                style={{ cursor: 'pointer' }}
              >
                <div
                  className="transaction-checkbox-wrapper"
                  onClick={(e) => e.stopPropagation()}
                >
                  <input
                    type="checkbox"
                    className="custom-checkbox"
                    checked={isSelected}
                    onChange={() => toggleSelect(tx.id)}
                    aria-label={`Select transaction ${tx.description || tx.category?.name}`}
                  />
                </div>

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
                    <span>{formatDateTime(tx.transactionDate)}</span>
                    {tx.notes && (
                      <>
                        <span>•</span>
                        <span>{tx.notes}</span>
                      </>
                    )}
                  </div>
                </div>

                <div className={`transaction-amount ${tx.type}`}>
                  {tx.type === 'earning' ? '+' : '-'}{formatCurrency(tx.amount, currency)}
                </div>

                <div className="transaction-actions" onClick={(e) => e.stopPropagation()}>
                  <button
                    type="button"
                    onClick={() => openEditModal(tx)}
                    className="btn btn-ghost btn-sm"
                    title="Edit Transaction"
                    aria-label="Edit Transaction"
                  >
                    <IoPencilOutline size={17} />
                    <span>Edit</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(tx.id)}
                    className="btn btn-ghost btn-sm"
                    title="Delete Transaction"
                    aria-label="Delete Transaction"
                    style={{ color: 'var(--spend)' }}
                  >
                    <IoTrashOutline size={17} />
                    <span>Delete</span>
                  </button>
                </div>
              </div>
            );
          })}

          {/* Pagination Controls */}
          {pagination.pages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '24px', padding: '0 8px', flexWrap: 'wrap', gap: '12px' }}>
              <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)' }}>
                Showing page {pagination.page} of {pagination.pages} ({pagination.total} items)
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
                const defaultSpend = categories.find((c) => c.type === 'spend' && !c.isHidden) || categories.find((c) => c.type === 'spend');
                setFormData((prev) => ({
                  ...prev,
                  type: 'spend',
                  categoryId: defaultSpend?.id || '',
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
                const defaultEarn = categories.find((c) => c.type === 'earning' && !c.isHidden) || categories.find((c) => c.type === 'earning');
                setFormData((prev) => ({
                  ...prev,
                  type: 'earning',
                  categoryId: defaultEarn?.id || '',
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
            <AmountInput
              id="amount"
              value={formData.amount}
              onChange={(val) => setFormData({ ...formData, amount: val })}
              placeholder="e.g. 450.00"
              currency={currency}
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
            <label className="form-label" htmlFor="date">Date &amp; Time *</label>
            <input
              id="date"
              type="datetime-local"
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

      {/* Bulk Change Category Modal */}
      <Modal
        isOpen={isBulkCategoryModalOpen}
        onClose={() => setIsBulkCategoryModalOpen(false)}
        title={`Change Category (${selectedIds.length} Selected)`}
      >
        <form onSubmit={handleBulkUpdateCategory}>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '16px', fontSize: 'var(--font-size-sm)' }}>
            Select a new category to assign to all <strong>{selectedIds.length}</strong> selected transactions.
          </p>

          <div className="form-group">
            <label className="form-label" htmlFor="bulkCategory">Select Target Category *</label>
            <select
              id="bulkCategory"
              className="form-input form-select"
              value={bulkTargetCategoryId}
              onChange={(e) => setBulkTargetCategoryId(e.target.value)}
              required
            >
              <option value="">-- Choose Category --</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.icon} {c.name} ({c.type === 'earning' ? 'Income' : 'Expense'})
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setIsBulkCategoryModalOpen(false)}
              disabled={bulkLoading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={bulkLoading || !bulkTargetCategoryId}
            >
              {bulkLoading ? 'Updating...' : `Apply to ${selectedIds.length} Transactions`}
            </button>
          </div>
        </form>
      </Modal>

      {/* Bulk Delete Confirmation Modal */}
      <Modal
        isOpen={isBulkDeleteModalOpen}
        onClose={() => setIsBulkDeleteModalOpen(false)}
        title="Delete Selected Transactions"
      >
        <div style={{ textAlign: 'center', padding: '12px 0 20px' }}>
          <div
            style={{
              width: '54px',
              height: '54px',
              borderRadius: '50%',
              background: 'var(--spend-bg)',
              color: 'var(--spend)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '28px',
              marginBottom: '16px',
            }}
          >
            <IoTrashOutline />
          </div>
          <h3 style={{ fontSize: 'var(--font-size-lg)', marginBottom: '8px' }}>
            Delete {selectedIds.length} Transaction{selectedIds.length > 1 ? 's' : ''}?
          </h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)', maxWidth: '400px', margin: '0 auto 16px' }}>
            This action cannot be undone. All {selectedIds.length} selected transaction records will be permanently removed.
          </p>

          <div
            style={{
              background: 'var(--bg-input)',
              padding: '12px 16px',
              borderRadius: 'var(--radius-md)',
              display: 'inline-flex',
              gap: '16px',
              fontSize: 'var(--font-size-xs)',
              textAlign: 'left',
              flexWrap: 'wrap',
              justifyContent: 'center',
            }}
          >
            {selectedStats.spendCount > 0 && (
              <div>
                <div style={{ color: 'var(--text-tertiary)' }}>Spends</div>
                <div style={{ fontWeight: 700, color: 'var(--spend-light)' }}>
                  -{formatCurrency(selectedStats.totalSpend, currency)} ({selectedStats.spendCount})
                </div>
              </div>
            )}
            {selectedStats.earningCount > 0 && (
              <div>
                <div style={{ color: 'var(--text-tertiary)' }}>Earnings</div>
                <div style={{ fontWeight: 700, color: 'var(--earning-light)' }}>
                  +{formatCurrency(selectedStats.totalEarning, currency)} ({selectedStats.earningCount})
                </div>
              </div>
            )}
            <div>
              <div style={{ color: 'var(--text-tertiary)' }}>Combined Net</div>
              <div style={{ fontWeight: 700, color: selectedStats.net >= 0 ? 'var(--earning)' : 'var(--spend)' }}>
                {selectedStats.net >= 0 ? '+' : ''}{formatCurrency(selectedStats.net, currency)}
              </div>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '16px' }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => setIsBulkDeleteModalOpen(false)}
            disabled={bulkLoading}
          >
            Cancel
          </button>
          <button
            type="button"
            className="btn"
            style={{ background: 'var(--spend)', color: '#fff', border: 'none' }}
            onClick={handleBulkDelete}
            disabled={bulkLoading}
          >
            {bulkLoading ? 'Deleting...' : `Yes, Delete ${selectedIds.length} Items`}
          </button>
        </div>
      </Modal>
    </div>
  );
}
