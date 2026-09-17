import { useState, useEffect } from 'react';
import {
  IoAddOutline,
  IoPencilOutline,
  IoTrashOutline,
  IoFolderOutline,
} from 'react-icons/io5';
import { categoryService } from '../services/categoryService';
import useToastStore from '../store/toastStore';
import Modal from '../components/common/Modal';
import Loader from '../components/common/Loader';

const EMOJI_OPTIONS = [
  '🍔', '🛒', '🚗', '💡', '🎬', '🏥', '✈️', '🎓',
  '💰', '💼', '📈', '🎁', '💻', '🏠', '👕', '☕',
  '🏋️', '📚', '📱', '🎮', '🍕', '🚌', '⛽', '🐾',
];

const COLOR_OPTIONS = [
  '#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
  '#ec4899', '#06b6d4', '#14b8a6', '#f97316', '#3b82f6',
  '#84cc16', '#a855f7',
];

export default function Categories() {
  const [categories, setCategories] = useState([]);
  const [activeTab, setActiveTab] = useState('spend');
  const [loading, setLoading] = useState(true);
  const { addToast } = useToastStore();

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    type: 'spend',
    icon: '🛒',
    color: '#6366f1',
  });

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    setLoading(true);
    try {
      const res = await categoryService.getAll();
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
        addToast({ type: 'success', message: 'Category updated!' });
      } else {
        await categoryService.create(formData);
        addToast({ type: 'success', message: 'Category created!' });
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

  const handleDelete = async (cat) => {
    if (cat.isDefault) {
      addToast({ type: 'warning', message: 'Default categories cannot be deleted' });
      return;
    }
    if (!window.confirm(`Are you sure you want to delete category "${cat.name}"?`)) return;

    try {
      await categoryService.delete(cat.id);
      addToast({ type: 'success', message: 'Category deleted' });
      fetchCategories();
    } catch (err) {
      addToast({
        type: 'error',
        message: err.response?.data?.error || 'Cannot delete category with linked transactions',
      });
    }
  };

  const filteredCategories = categories.filter((c) => c.type === activeTab);

  return (
    <div className="page-content">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: 'var(--font-size-3xl)', fontWeight: 800, margin: 0 }}>Categories</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)', marginTop: '4px' }}>
            Organize your transactions with customizable icons and color coding
          </p>
        </div>

        <button onClick={openCreateModal} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <IoAddOutline size={20} />
          <span>Add Category</span>
        </button>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
        <button
          className={`filter-chip ${activeTab === 'spend' ? 'active' : ''}`}
          onClick={() => setActiveTab('spend')}
          style={{ padding: '8px 20px', fontSize: 'var(--font-size-sm)' }}
        >
          💸 Spend Categories ({categories.filter((c) => c.type === 'spend').length})
        </button>
        <button
          className={`filter-chip ${activeTab === 'earning' ? 'active' : ''}`}
          onClick={() => setActiveTab('earning')}
          style={{ padding: '8px 20px', fontSize: 'var(--font-size-sm)' }}
        >
          💰 Earning Categories ({categories.filter((c) => c.type === 'earning').length})
        </button>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}>
          <Loader size={48} />
        </div>
      ) : filteredCategories.length > 0 ? (
        <div className="category-grid">
          {filteredCategories.map((cat) => (
            <div key={cat.id} className="card category-card" style={{ position: 'relative' }}>
              <div
                className="category-icon-wrapper"
                style={{
                  backgroundColor: `${cat.color}20` || 'rgba(99, 102, 241, 0.1)',
                  border: `1px solid ${cat.color}40`,
                }}
              >
                {cat.icon}
              </div>

              <div style={{ flex: 1 }}>
                <div className="category-name">{cat.name}</div>
                <div className="category-count">
                  {cat.isDefault ? 'Default' : 'Custom'}
                  {cat._count?.transactions !== undefined && ` • ${cat._count.transactions} txns`}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '4px' }}>
                <button
                  onClick={() => openEditModal(cat)}
                  className="btn btn-ghost btn-sm"
                  title="Edit Category"
                  style={{ padding: '4px 6px' }}
                >
                  <IoPencilOutline size={16} />
                </button>
                {!cat.isDefault && (
                  <button
                    onClick={() => handleDelete(cat)}
                    className="btn btn-ghost btn-sm"
                    title="Delete Category"
                    style={{ padding: '4px 6px', color: 'var(--spend)' }}
                  >
                    <IoTrashOutline size={16} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="card" style={{ textAlign: 'center', padding: '60px 20px' }}>
          <div style={{ fontSize: '3rem', marginBottom: '12px' }}>📁</div>
          <h3 style={{ fontSize: 'var(--font-size-xl)', marginBottom: '8px' }}>No categories found</h3>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '20px' }}>
            Add your first custom {activeTab} category to get started.
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
                💸 Spend
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
                💰 Earning
              </button>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="catName">Category Name *</label>
            <input
              id="catName"
              type="text"
              className="form-input"
              placeholder="e.g. Dining Out, Freelance Work"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>

          {/* Emoji Picker */}
          <div className="form-group">
            <label className="form-label">Choose Icon</label>
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
            <label className="form-label">Choose Color Theme</label>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {COLOR_OPTIONS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setFormData({ ...formData, color: c })}
                  style={{
                    width: '32px',
                    height: '32px',
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
    </div>
  );
}
