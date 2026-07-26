import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { ConfirmDialog } from '@shared/components/ConfirmDialog';

const ConfirmContext = createContext(null);

const DEFAULT_OPTIONS = {
  title: 'تأكيد العملية',
  message: 'هل أنت متأكد من تنفيذ هذه العملية؟',
  confirmText: 'تأكيد',
  cancelText: 'إلغاء',
  variant: 'danger',
};

export function ConfirmProvider({ children }) {
  const [state, setState] = useState({ open: false, ...DEFAULT_OPTIONS });
  const resolverRef = useRef(null);

  const close = useCallback((result) => {
    resolverRef.current?.(result);
    resolverRef.current = null;
    setState((prev) => ({ ...prev, open: false }));
  }, []);

  const confirm = useCallback((options = {}) => {
    return new Promise((resolve) => {
      resolverRef.current = resolve;
      setState({
        open: true,
        ...DEFAULT_OPTIONS,
        ...options,
      });
    });
  }, []);

  const value = useMemo(() => ({ confirm }), [confirm]);

  return (
    <ConfirmContext.Provider value={value}>
      {children}
      <ConfirmDialog
        open={state.open}
        title={state.title}
        message={state.message}
        confirmText={state.confirmText}
        cancelText={state.cancelText}
        variant={state.variant}
        onConfirm={() => close(true)}
        onCancel={() => close(false)}
      />
    </ConfirmContext.Provider>
  );
}

/**
 * Promise-based confirm for sensitive actions.
 * @example
 * const ok = await confirm({ title: 'حذف', message: 'هل أنت متأكد؟', confirmText: 'حذف' });
 * if (!ok) return;
 */
export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) {
    throw new Error('useConfirm must be used within ConfirmProvider');
  }
  return ctx.confirm;
}
