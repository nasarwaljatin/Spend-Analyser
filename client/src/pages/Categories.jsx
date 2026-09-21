import { useState, useEffect } from 'react';
import {
  IoAddOutline,
  IoPencilOutline,
  IoTrashOutline,
  IoEyeOutline,
  IoEyeOffOutline,
  IoSearchOutline,
  IoAlertCircleOutline,
} from 'react-icons/io5';
import { categoryService } from '../services/categoryService';
import useToastStore from '../store/toastStore';
import Modal from '../components/common/Modal';
import Loader from '../components/common/Loader';

const EMOJI_OPTIONS = [
  '🍔', '🛒', '🚗', '💡', '🎬', '🏥', '✈️', '🎓',
  '💰', '💼', '📈', '🎁', '💻', '🏠', '👕', '☕',
  '🏋️', '📚', '📱', '🎮', '🍕', '🚌', '⛽', '🐾',
  '🛍️', '🛠️', '🍸', '🏖️', '💈', '🧘', '⚡', '📦',
];

const COLOR_OPTIONS = [
  '#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
  '#ec4899', '#06b6d4', '#14b8a6', '#f97316', '#3b82f6',
  '#84cc16', '#a855f7', '#64748b', '#0ea5e9', '#e11d48',
];

export default function Categories() {
  const [categories, setCategories] = useState([]);
  const [activeTab, setActiveTab] = useState('spend'); // 'spend' | 'earning'
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'active' | 'hidden'
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const { addToast } = useToastStore();

  // Create / Edit Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    type: 'spend',
    icon: '🛒',
    color: '#6366f1',
    isHidden: false,
  });

  // Delete / Reassign Modal State
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState(null);
  const [reassignTargetId, setReassignTargetId] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    setLoading(true);
    try {
      const res = await categoryService.getAll({ includeHidden: true });
      setCategories(res.data || []);
    } catch (err) {
      console.error('Failed to load categories', err);
      addToast({ type: 'error', message: 'Failed to load categories' });
    } finally {
      setLoading(false);
    }
  };

  const openCreateModal = () => {
    setEditingCategory(null);
    setFormData({
      name: '',
      type: activeTab,
      icon: activeTab === 'earning' ? '💰' : '🛒',
      color: activeTab === 'earning' ? '#10b981' : '#6366f1',
      isHidden: false,
    });
    setIsModalOpen(true);
  };

  const openEditModal = (cat) => {
    setEditingCategory(cat);
    setFormData({
      name: cat.name,
      type: cat.type,
      icon: cat.icon || '📁',
      color: cat.color || '#6366f1',
      isHidden: !!cat.isHidden,
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      addToast({ type: 'warning', message: 'Please enter category name' });
      return;
    }

    try {
      if (editingCategory) {
        await categoryService.update(editingCategory.id, formData);
        addToast({ type: 'success', message: 'Category updated successfully!' });
      } else {
        await categoryService.create(formData);
        addToast({ type: 'success', message: 'Category created successfully!' });
      }
      setIsModalOpen(false);
      fetchCategories();
    } catch (err) {
      addToast({
        type: 'error',
        message: err.response?.data?.error || 'Failed to save category',
      });
    }
  };

  const handleToggleHide = async (cat) => {
    const newHiddenState = !cat.isHidden;
    try {
      await categoryService.toggleHide(cat.id, newHiddenState);
      addToast({
        type: 'success',
        message: newHiddenState
          ? `"${cat.name}" hidden from selection lists`
          : `"${cat.name}" is now visible in selection lists`,
      });
      fetchCategories();
    } catch (err) {
      addToast({
        type: 'error',
        message: err.response?.data?.error || 'Failed to update visibility',
      });
    }
  };

  const openDeletePrompt = (cat) => {
    setCategoryToDelete(cat);
    // Default reassignment candidate (first other category of same type)
    const otherCats = categories.filter((c) => c.type === cat.type && c.id !== cat.id && !c.isHidden);
    setReassignTargetId(otherCats[0]?.id || '');
    setDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!categoryToDelete) return;
    const txCount = categoryToDelete._count?.transactions || 0;

    if (txCount > 0 && !reassignTargetId) {
      addToast({
        type: 'warning',
        message: 'Please choose a category to reassign existing transactions to.',
      });
      return;
    }

    setDeleteLoading(true);
    try {
      await categoryService.delete(categoryToDelete.id, txCount > 0 ? reassignTargetId : undefined);
      addToast({
        type: 'success',
        message: txCount > 0
          ? `Category deleted and ${txCount} transaction(s) reassigned!`
          : 'Category deleted successfully!',
      });
      setDeleteModalOpen(false);
      setCategoryToDelete(null);
      fetchCategories();
    } catch (err) {
      addToast({
        type: 'error',
        message: err.response?.data?.error || 'Failed to delete category',
      });
    } finally {
      setDeleteLoading(false);
    }
  };

  // Filter Categories
  const filteredCategories = categories.filter((c) => {
    if (c.type !== activeTab) return false;
    if (statusFilter === 'active' && c.isHidden) return false;
    if (statusFilter === 'hidden' && !c.isHidden) return false;
    if (searchQuery.trim() && !c.name.toLowerCase().includes(searchQuery.toLowerCase().trim())) {
      return false;
    }
    return true;
  });

  const totalSpend = categories.filter((c) => c.type === 'spend').length;
  const totalEarning = categories.filter((c) => c.type === 'earning').length;
  const hiddenCount = categories.filter((c) => c.type === activeTab && c.isHidden).length;

  return (
    <div className="page-content">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: 'var(--font-size-3xl)', fontWeight: 800, margin: 0 }}>Categories</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)', marginTop: '4px' }}>
            Customize, edit, hide, and manage your personalized spending & earning categories
          </p>
        </div>

        <button onClick={openCreateModal} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <IoAddOutline size={20} />
          <span>Add Category</span>
        </button>
      </div>

      {/* Tabs & Controls */}
      <div className="card" style={{ marginBottom: '24px', padding: '16px' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'center', justifyContent: 'space-between' }}>
          {/* Spend / Earning Type Tabs */}
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              className={`filter-chip ${activeTab === 'spend' ? 'active' : ''}`}
              onClick={() => setActiveTab('spend')}
              style={{ padding: '8px 16px', fontSize: 'var(--font-size-sm)' }}
            >
              💸 Spend Categories ({totalSpend})
            </button>
            <button
              className={`filter-chip ${activeTab === 'earning' ? 'active' : ''}`}
              onClick={() => setActiveTab('earning')}
              style={{ padding: '8px 16px', fontSize: 'var(--font-size-sm)' }}
            >
              💰 Earning Categories ({totalEarning})
            </button>
          </div>

          {/* Visibility Status Filter & Search */}
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', gap: '6px', background: 'var(--bg-input)', padding: '4px', borderRadius: 'var(--radius-md)' }}>
              <button
                type="button"
                className={`btn btn-sm ${statusFilter === 'all' ? 'btn-primary' : 'btn-ghost'}`}
                style={{ padding: '4px 10px', fontSize: 'var(--font-size-xs)' }}
                onClick={() => setStatusFilter('all')}
              >
                All
              </button>
              <button
                type="button"
                className={`btn btn-sm ${statusFilter === 'active' ? 'btn-primary' : 'btn-ghost'}`}
                style={{ padding: '4px 10px', fontSize: 'var(--font-size-xs)' }}
                onClick={() => setStatusFilter('active')}
              >
                Active
              </button>
              <button
                type="button"
                className={`btn btn-sm ${statusFilter === 'hidden' ? 'btn-primary' : 'btn-ghost'}`}
                style={{ padding: '4px 10px', fontSize: 'var(--font-size-xs)' }}
                onClick={() => setStatusFilter('hidden')}
              >
                Hidden {hiddenCount > 0 && `(${hiddenCount})`}
              </button>
            </div>

            <div style={{ position: 'relative', width: '200px' }}>
              <input
                type="text"
                className="form-input"
                placeholder="Search category..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ paddingLeft: '34px', height: '36px', fontSize: 'var(--font-size-sm)' }}
              />
              <IoSearchOutline
                size={16}
                style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Categories Grid */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}>
          <Loader size={48} />
        </div>
      ) : filteredCategories.length > 0 ? (
        <div className="category-grid">
          {filteredCategories.map((cat) => (
            <div
              key={cat.id}
              className="card category-card"
              style={{
                position: 'relative',
                opacity: cat.isHidden ? 0.65 : 1,
                border: cat.isHidden ? '1px dashed var(--border)' : '1px solid var(--border)',
              }}
            >
              <div
                className="category-icon-wrapper"
                style={{
                  backgroundColor: `${cat.color}20` || 'rgba(99, 102, 241, 0.1)',
                  border: `1px solid ${cat.color}40`,
                }}
              >
                {cat.icon}
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span className="category-name" style={{ fontWeight: 600 }}>{cat.name}</span>
                  {cat.isHidden && (
                    <span
                      style={{
                        fontSize: '10px',
                        background: 'var(--bg-input)',
                        color: 'var(--text-secondary)',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        fontWeight: 600,
                      }}
                    >
                      Hidden
                    </span>
                  )}
                </div>
                <div className="category-count" style={{ marginTop: '2px', fontSize: 'var(--font-size-xs)' }}>
                  {cat._count?.transactions > 0
                    ? `${cat._count.transactions} transaction(s)`
                    : 'No transactions yet'}
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '4px' }}>
                <button
                  onClick={() => handleToggleHide(cat)}
                  className="btn btn-ghost btn-sm"
                  title={cat.isHidden ? 'Unhide Category (Make visible in lists)' : 'Hide Category (Keep data, hide from dropdowns)'}
                  style={{ padding: '6px', color: cat.isHidden ? 'var(--text-tertiary)' : 'var(--text-secondary)' }}
                >
                  {cat.isHidden ? <IoEyeOffOutline size={18} color="var(--warning)" /> : <IoEyeOutline size={18} />}
                </button>

                <button
                  onClick={() => openEditModal(cat)}
                  className="btn btn-ghost btn-sm"
                  title="Edit Category (Name, Icon, Color, Type)"
                  style={{ padding: '6px' }}
                >
                  <IoPencilOutline size={16} />
                </button>

                <button
                  onClick={() => openDeletePrompt(cat)}
                  className="btn btn-ghost btn-sm"
                  title="Delete Category"
                  style={{ padding: '6px', color: 'var(--spend)' }}
                >
                  <IoTrashOutline size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="card" style={{ textAlign: 'center', padding: '60px 20px' }}>
          <div style={{ fontSize: '3rem', marginBottom: '12px' }}>📁</div>
          <h3 style={{ fontSize: 'var(--font-size-xl)', marginBottom: '8px' }}>No categories found</h3>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '20px' }}>
            {statusFilter === 'hidden'
              ? 'No hidden categories in this section.'
              : `Add your custom ${activeTab} category or adjust your search filter.`}
          </p>
          <button onClick={openCreateModal} className="btn btn-primary">
            + Add Category
          </button>
        </div>
      )}

      {/* Add / Edit Category Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingCategory ? 'Edit Category' : 'Create New Category'}
      >
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Category Type</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <button
                type="button"
                className="btn"
                onClick={() => setFormData({ ...formData, type: 'spend' })}
                style={{
                  backgroundColor: formData.type === 'spend' ? 'var(--spend)' : 'var(--bg-input)',
                  color: formData.type === 'spend' ? '#fff' : 'var(--text-secondary)',
                  border: '1px solid var(--border)',
                }}
              >
                💸 Spend Category
              </button>
              <button
                type="button"
                className="btn"
                onClick={() => setFormData({ ...formData, type: 'earning' })}
                style={{
                  backgroundColor: formData.type === 'earning' ? 'var(--earning)' : 'var(--bg-input)',
                  color: formData.type === 'earning' ? '#fff' : 'var(--text-secondary)',
                  border: '1px solid var(--border)',
                }}
              >
                💰 Earning Category
              </button>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="catName">Category Name *</label>
            <input
              id="catName"
              type="text"
              className="form-input"
              placeholder="e.g. Dining Out, Freelance Work, Online Courses"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>

          {/* Emoji Picker */}
          <div className="form-group">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <label className="form-label" style={{ marginBottom: 0 }}>Choose Icon</label>
              <span style={{ fontSize: '1.2rem', padding: '2px 8px', background: 'var(--bg-input)', borderRadius: '6px' }}>
                Selected: {formData.icon}
              </span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: '6px' }}>
              {EMOJI_OPTIONS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => setFormData({ ...formData, icon: emoji })}
                  style={{
                    fontSize: '1.4rem',
                    padding: '8px',
                    borderRadius: '8px',
                    border: formData.icon === emoji ? '2px solid var(--primary)' : '1px solid var(--border)',
                    background: formData.icon === emoji ? 'var(--primary-glow)' : 'var(--bg-input)',
                    cursor: 'pointer',
                  }}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          {/* Color Picker */}
          <div className="form-group">
            <label className="form-label">Color Theme</label>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {COLOR_OPTIONS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setFormData({ ...formData, color: c })}
                  style={{
                    width: '30px',
                    height: '30px',
                    borderRadius: '50%',
                    backgroundColor: c,
                    border: formData.color === c ? '3px solid #fff' : 'none',
                    boxShadow: formData.color === c ? `0 0 10px ${c}` : 'none',
                    cursor: 'pointer',
                  }}
                />
              ))}
            </div>
          </div>

          {/* Visibility / Hide Option */}
          <div className="form-group" style={{ marginTop: '16px', background: 'var(--bg-input)', padding: '12px 16px', borderRadius: 'var(--radius-md)' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', margin: 0 }}>
              <input
                type="checkbox"
                checked={formData.isHidden}
                onChange={(e) => setFormData({ ...formData, isHidden: e.target.checked })}
                style={{ width: '18px', height: '18px', cursor: 'pointer' }}
              />
              <div>
                <div style={{ fontWeight: 600, fontSize: 'var(--font-size-sm)' }}>Hide from dropdown selection lists</div>
                <div style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-size-xs)' }}>
                  Keeps existing transaction records intact while hiding it from transaction and budget pickers.
                </div>
              </div>
            </label>
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
              {editingCategory ? 'Save Changes' : 'Create Category'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete / Reassign Modal */}
      <Modal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        title={`Delete Category "${categoryToDelete?.name}"`}
      >
        {categoryToDelete && (
          <div>
            {(categoryToDelete._count?.transactions || 0) > 0 ? (
              <div>
                <div style={{ display: 'flex', gap: '12px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', padding: '16px', borderRadius: 'var(--radius-md)', marginBottom: '16px' }}>
                  <IoAlertCircleOutline size={24} color="var(--spend)" style={{ flexShrink: 0 }} />
                  <div>
                    <div style={{ fontWeight: 700, color: 'var(--spend)', marginBottom: '4px' }}>
                      Linked to {categoryToDelete._count.transactions} transaction(s)
                    </div>
                    <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)' }}>
                      To safely delete this category, please select another {categoryToDelete.type} category to transfer its existing transactions to.
                    </div>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="reassignSelect">Transfer transactions to:</label>
                  <select
                    id="reassignSelect"
                    className="form-input form-select"
                    value={reassignTargetId}
                    onChange={(e) => setReassignTargetId(e.target.value)}
                    required
                  >
                    {categories
                      .filter((c) => c.type === categoryToDelete.type && c.id !== categoryToDelete.id && !c.isHidden)
                      .map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.icon} {c.name}
                        </option>
                      ))}
                  </select>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '24px', flexWrap: 'wrap', gap: '12px' }}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => {
                      handleToggleHide(categoryToDelete);
                      setDeleteModalOpen(false);
                    }}
                  >
                    🙈 Hide Instead
                  </button>

                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => setDeleteModalOpen(false)}
                      disabled={deleteLoading}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      className="btn btn-danger"
                      onClick={confirmDelete}
                      disabled={deleteLoading || !reassignTargetId}
                    >
                      {deleteLoading ? 'Transferring...' : 'Transfer & Delete'}
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '20px' }}>
                  Are you sure you want to permanently delete category <strong>"{categoryToDelete.name}"</strong>? This action cannot be undone.
                </p>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setDeleteModalOpen(false)}
                    disabled={deleteLoading}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="btn btn-danger"
                    onClick={confirmDelete}
                    disabled={deleteLoading}
                  >
                    {deleteLoading ? 'Deleting...' : 'Delete Permanently'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
