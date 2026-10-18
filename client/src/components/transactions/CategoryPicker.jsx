import { useState } from 'react';
import { IoAddOutline, IoCheckmarkOutline, IoCloseOutline } from 'react-icons/io5';
import { categoryService } from '../../services/categoryService';
import useToastStore from '../../store/toastStore';

const QUICK_ICONS = {
  spend: ['🍔', '☕', '🛒', '🚕', '⛽', '🏠', '💡', '📱', '🎬', '🎮', '👕', '💊', '✈️', '🎁', '🐾', '📚'],
  earning: ['💼', '💻', '📈', '🏦', '🎯', '🤝', '🏷️', '🪙', '🧾', '🎁', '🏠', '💵'],
};
// Keep only the last emoji/character typed into the icon box
const lastGrapheme = (text) => {
  if (typeof Intl !== 'undefined' && Intl.Segmenter) {
    const parts = [...new Intl.Segmenter().segment(text)];
    return parts.length ? parts[parts.length - 1].segment : '';
  }
  return [...text].slice(-1).join('');
};

const COLORS = ['#6366f1', '#22d3ee', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#a855f7', '#84cc16'];

/**
 * Chip-style category selector with inline "create new category" so users
 * don't have to leave the transaction form.
 */
export default function CategoryPicker({ categories, type, value, onChange, onCreated }) {
  const { addToast } = useToastStore();
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState({ name: '', icon: QUICK_ICONS[type][0], color: COLORS[0] });

  const startCreate = () => {
    setDraft({ name: '', icon: QUICK_ICONS[type][0], color: COLORS[Math.floor(Math.random() * COLORS.length)] });
    setCreating(true);
  };

  const handleCreate = async () => {
    const name = draft.name.trim();
    if (!name) {
      addToast({ type: 'warning', message: 'Give the category a name' });
      return;
    }
    const existing = categories.find((c) => c.name.toLowerCase() === name.toLowerCase());
    if (existing) {
      onChange(existing.id);
      setCreating(false);
      return;
    }

    setSaving(true);
    try {
      const res = await categoryService.create({ name, type, icon: draft.icon || '🏷️', color: draft.color });
      onCreated?.(res.data);
      onChange(res.data.id);
      setCreating(false);
      addToast({ type: 'success', message: `Category "${name}" created` });
    } catch (err) {
      addToast({ type: 'error', message: err.response?.data?.error || 'Could not create category' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="cat-picker">
      <div className="cat-picker-grid" role="radiogroup" aria-label="Category">
        {!creating && (
          <button type="button" className="cat-chip cat-chip-new" onClick={startCreate}>
            <IoAddOutline size={16} />
            <span className="cat-chip-label">New</span>
          </button>
        )}
        {categories.map((c) => (
          <button
            key={c.id}
            type="button"
            role="radio"
            aria-checked={value === c.id}
            className={`cat-chip ${value === c.id ? 'active' : ''}`}
            style={{ '--chip-color': c.color || '#6366f1' }}
            onClick={() => onChange(c.id)}
          >
            <span className="cat-chip-icon">{c.icon}</span>
            <span className="cat-chip-label">{c.name}</span>
          </button>
        ))}
      </div>

      {creating && (
        <div className="cat-create-panel">
          <div className="cat-create-row">
            <input
              className="form-input cat-create-emoji"
              value={draft.icon}
              onChange={(e) => setDraft({ ...draft, icon: lastGrapheme(e.target.value) })}
              aria-label="Category emoji"
              style={{ borderColor: draft.color }}
            />
            <input
              className="form-input"
              placeholder={type === 'spend' ? 'e.g. Coffee, Pet care' : 'e.g. Rental income'}
              value={draft.name}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleCreate();
                }
                if (e.key === 'Escape') setCreating(false);
              }}
              maxLength={100}
              autoFocus
              aria-label="New category name"
            />
          </div>
          <div className="cat-create-icons">
            {QUICK_ICONS[type].map((icon) => (
              <button
                key={icon}
                type="button"
                className={`cat-create-icon ${draft.icon === icon ? 'active' : ''}`}
                onClick={() => setDraft({ ...draft, icon })}
                aria-label={`Icon ${icon}`}
              >
                {icon}
              </button>
            ))}
          </div>
          <div className="cat-create-footer">
            <div className="cat-create-colors">
              {COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  className={`cat-create-color ${draft.color === color ? 'active' : ''}`}
                  style={{ background: color }}
                  onClick={() => setDraft({ ...draft, color })}
                  aria-label={`Color ${color}`}
                />
              ))}
            </div>
            <div style={{ display: 'flex', gap: '6px' }}>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setCreating(false)} aria-label="Cancel new category">
                <IoCloseOutline size={16} />
              </button>
              <button type="button" className="btn btn-primary btn-sm" onClick={handleCreate} disabled={saving}>
                <IoCheckmarkOutline size={16} /> {saving ? 'Adding…' : 'Add'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
