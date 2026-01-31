'use client';

interface Toast {
  id: string;
  type: 'success' | 'error' | 'warning';
  title: string;
  message?: string;
}

interface ToastContainerProps {
  toasts: Toast[];
  onRemove: (id: string) => void;
}

export default function ToastContainer({ toasts, onRemove }: ToastContainerProps) {
  const icons = {
    success: 'check_circle',
    error: 'error',
    warning: 'warning',
  };

  const colors = {
    success: 'text-green-600 dark:text-green-400 border-green-600',
    error: 'text-red-600 dark:text-red-400 border-red-600',
    warning: 'text-yellow-600 dark:text-yellow-400 border-yellow-600',
  };

  return (
    <div className="fixed top-5 right-5 z-50 flex flex-col gap-3">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`bg-white dark:bg-surface-dark border-l-4 ${colors[toast.type]} border border-border-light dark:border-border-dark rounded-lg p-4 shadow-lg min-w-[300px] max-w-[400px] flex items-start gap-3 animate-slide-in`}
        >
          <span className={`material-icons-outlined ${colors[toast.type].split(' ')[0]}`}>{icons[toast.type]}</span>
          <div className="flex-1">
            <div className="font-semibold mb-1">{toast.title}</div>
            {toast.message && <div className="text-sm text-slate-600 dark:text-slate-400">{toast.message}</div>}
          </div>
          <button onClick={() => onRemove(toast.id)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
            <span className="material-icons-outlined text-lg">close</span>
          </button>
        </div>
      ))}
    </div>
  );
}
