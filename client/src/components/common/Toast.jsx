import { IoClose, IoCheckmarkCircle, IoAlertCircle, IoWarning } from 'react-icons/io5';
import useToastStore from '../../store/toastStore';

const icons = {
  success: <IoCheckmarkCircle size={20} />,
  error: <IoAlertCircle size={20} />,
  warning: <IoWarning size={20} />,
};

export default function Toast() {
  const { toasts, removeToast } = useToastStore();

  if (toasts.length === 0) return null;

  return (
    <div className="toast-container">
      {toasts.map((toast) => (
        <div key={toast.id} className={`toast ${toast.type}`}>
          <span style={{ color: toast.type === 'success' ? 'var(--earning)' : toast.type === 'error' ? 'var(--spend)' : 'var(--warning)' }}>
            {icons[toast.type]}
          </span>
          <span style={{ flex: 1, fontSize: 'var(--font-size-sm)' }}>{toast.message}</span>
          <button
            className="btn-ghost btn-icon"
            onClick={() => removeToast(toast.id)}
            style={{ padding: 0, width: 24, height: 24, minWidth: 'auto' }}
          >
            <IoClose size={16} />
          </button>
        </div>
      ))}
    </div>
  );
}
