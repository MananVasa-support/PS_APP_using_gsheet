import { createContext, useCallback, useContext, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { FiCheckCircle, FiAlertTriangle, FiInfo, FiX } from 'react-icons/fi';

const ToastContext = createContext(null);

const config = {
  success: { icon: FiCheckCircle, ring: 'ring-productive/40', text: 'text-productive' },
  error: { icon: FiAlertTriangle, ring: 'ring-unproductive/40', text: 'text-unproductive' },
  info: { icon: FiInfo, ring: 'ring-sky-500/40', text: 'text-sky-400' },
};

/**
 * Lightweight toast notifications. Call `toast.success('Saved!')` etc. from any
 * component via the useToast() hook.
 */
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const remove = useCallback((id) => setToasts((t) => t.filter((x) => x.id !== id)), []);

  const push = useCallback(
    (type, message) => {
      const id = Date.now() + Math.random();
      setToasts((t) => [...t, { id, type, message }]);
      setTimeout(() => remove(id), 3500);
    },
    [remove]
  );

  const toast = {
    success: (m) => push('success', m),
    error: (m) => push('error', m),
    info: (m) => push('info', m),
  };

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className="pointer-events-none fixed bottom-4 right-4 z-[100] flex w-full max-w-sm flex-col gap-2">
        <AnimatePresence>
          {toasts.map((t) => {
            const c = config[t.type] || config.info;
            const Icon = c.icon;
            return (
              <motion.div
                key={t.id}
                layout
                initial={{ opacity: 0, x: 40, scale: 0.95 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: 40, scale: 0.95 }}
                transition={{ duration: 0.25 }}
                className={`pointer-events-auto flex items-start gap-3 rounded-xl border border-ink-700 bg-ink-850 p-3.5 shadow-card ring-1 ${c.ring}`}
              >
                <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${c.text}`} />
                <p className="flex-1 text-sm text-slate-200">{t.message}</p>
                <button onClick={() => remove(t.id)} className="text-ink-400 hover:text-slate-200" aria-label="Dismiss">
                  <FiX className="h-4 w-4" />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within <ToastProvider>');
  return ctx;
}
