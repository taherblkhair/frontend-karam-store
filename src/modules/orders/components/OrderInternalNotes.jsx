import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { useAuth } from '@core/auth/AuthContext';
import { useConfirm } from '@shared/hooks/useConfirm';

/** Staff-only notes — never shown to the customer. */
export function OrderInternalNotes({ notes = [], addMutation, deleteMutation }) {
  const { user, isAdmin, hasPermission } = useAuth();
  const confirm = useConfirm();
  const [body, setBody] = useState('');
  const manager = isAdmin || hasPermission('orders.manage');

  const submit = (e) => {
    e.preventDefault();
    if (!body.trim()) return;
    addMutation.mutate(body.trim(), { onSuccess: () => setBody('') });
  };

  return (
    <div className="space-y-3">
      <form onSubmit={submit} className="space-y-2">
        <textarea
          className="input"
          rows={2}
          maxLength={2000}
          placeholder="ملاحظة للموظفين فقط — لا تظهر للعميل"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          aria-label="ملاحظة داخلية"
        />
        <button type="submit" disabled={addMutation.isPending || !body.trim()} className="btn-secondary text-sm w-full">
          {addMutation.isPending ? 'جاري الحفظ...' : 'إضافة ملاحظة'}
        </button>
      </form>

      {notes.length === 0 ? (
        <p className="text-sm text-gray-500">لا توجد ملاحظات.</p>
      ) : (
        <ul className="space-y-2">
          {notes.map((n) => (
            <li key={n.id} className="rounded-xl bg-tertiary-100 p-3 text-sm dark:bg-gray-700/40">
              <div className="flex items-start justify-between gap-2">
                <p className="whitespace-pre-wrap break-words flex-1">{n.body}</p>
                {(manager || n.user_id === user?.id) && (
                  <button
                    type="button"
                    onClick={async () => {
                      const ok = await confirm({ title: 'حذف الملاحظة', message: 'حذف هذه الملاحظة؟', confirmText: 'حذف', variant: 'danger' });
                      if (ok) deleteMutation.mutate(n.id);
                    }}
                    className="text-red-500 p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20"
                    aria-label="حذف الملاحظة"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {n.user_name || '—'} · {new Date(n.created_at).toLocaleString('ar-LY', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
