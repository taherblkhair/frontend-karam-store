import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Edit, UserX } from 'lucide-react';
import { notifySuccess, notifyError } from '@shared/services/toast.service';
import { useFormErrors } from '@shared/hooks/useFormErrors';
import { useListParams } from '@shared/hooks/useListParams';
import { useConfirm } from '@shared/hooks/useConfirm';
import { useAuth } from '@core/auth/AuthContext';
import { usersApi } from '@modules/users/api/users.api';
import { LoadingSpinner, Modal, FieldError, EmptyState } from '@shared/ui';
import { SearchInput, Pagination } from '@shared/components/ListControls';

const emptyForm = {
  name: '',
  email: '',
  phone: '',
  password: '',
  role_id: '',
  is_active: true,
};

export default function UsersPage() {
  const confirm = useConfirm();
  const { user: currentUser } = useAuth();
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const { search, setSearch, page, setPage, withExtra } = useListParams();
  const listParams = withExtra({});

  const { data, isLoading } = useQuery({
    queryKey: ['users', listParams],
    queryFn: () => usersApi.list(listParams),
  });

  const { data: rolesRes } = useQuery({
    queryKey: ['staff-roles'],
    queryFn: () => usersApi.roles(),
  });

  const { formError, clearErrors, applyApiError, getFieldError } = useFormErrors();

  const saveMutation = useMutation({
    mutationFn: usersApi.save,
    onSuccess: (res) => {
      queryClient.invalidateQueries(['users']);
      setModalOpen(false);
      clearErrors();
      notifySuccess(res);
    },
    onError: (err) => {
      applyApiError(err);
      notifyError(err);
    },
  });

  const deactivateMutation = useMutation({
    mutationFn: usersApi.remove,
    onSuccess: (res) => {
      queryClient.invalidateQueries(['users']);
      notifySuccess(res);
    },
    onError: notifyError,
  });

  const users = data?.data || [];
  const roles = rolesRes?.data || [];

  const openCreate = () => {
    setEditing(null);
    setForm({
      ...emptyForm,
      role_id: roles.find((r) => r.slug === 'sales')?.id || roles[0]?.id || '',
    });
    clearErrors();
    setModalOpen(true);
  };

  const openEdit = (u) => {
    setEditing(u);
    setForm({
      name: u.name || '',
      email: u.email || '',
      phone: u.phone || '',
      password: '',
      role_id: u.role?.id || u.role_id || '',
      is_active: u.is_active !== false,
    });
    clearErrors();
    setModalOpen(true);
  };

  const submit = (e) => {
    e.preventDefault();
    const payload = {
      name: form.name.trim(),
      email: form.email.trim() || null,
      phone: form.phone.trim() || null,
      role_id: parseInt(form.role_id, 10),
      is_active: Boolean(form.is_active),
    };
    if (form.password) payload.password = form.password;
    if (!editing) {
      if (!form.password) {
        notifyError({ message: 'كلمة المرور مطلوبة' });
        return;
      }
      payload.password = form.password;
    }
    saveMutation.mutate({ id: editing?.id, data: payload });
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold">المستخدمون</h1>
          <p className="text-sm text-gray-500 mt-1">إدارة حسابات المدير والمبيعات</p>
        </div>
        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          <SearchInput value={search} onChange={setSearch} placeholder="بحث بالاسم أو البريد..." />
          <button type="button" onClick={openCreate} className="btn-primary">
            <Plus size={18} /> إضافة مستخدم
          </button>
        </div>
      </div>

      {isLoading ? (
        <LoadingSpinner />
      ) : users.length === 0 ? (
        <EmptyState message="لا يوجد مستخدمون" />
      ) : (
        <>
          <div className="card overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="text-right p-4">الاسم</th>
                  <th className="text-right p-4">البريد / الهاتف</th>
                  <th className="text-right p-4">الدور</th>
                  <th className="text-right p-4">الحالة</th>
                  <th className="text-right p-4">آخر دخول</th>
                  <th className="text-right p-4">إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => {
                  const isSelf = Number(u.id) === Number(currentUser?.id);
                  return (
                    <tr key={u.id} className="border-t dark:border-gray-700">
                      <td className="p-4 font-medium">
                        {u.name}
                        {isSelf ? (
                          <span className="text-xs text-primary-600 mr-2">(أنت)</span>
                        ) : null}
                      </td>
                      <td className="p-4">
                        <div>{u.email || '—'}</div>
                        <div className="text-xs text-gray-400">{u.phone || ''}</div>
                      </td>
                      <td className="p-4">{u.role?.name || u.role?.slug || '—'}</td>
                      <td className="p-4">
                        <span
                          className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${
                            u.is_active
                              ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                              : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
                          }`}
                        >
                          {u.is_active ? 'نشط' : 'معطّل'}
                        </span>
                      </td>
                      <td className="p-4 text-xs text-gray-500">
                        {u.last_login
                          ? new Date(u.last_login).toLocaleString('ar')
                          : '—'}
                      </td>
                      <td className="p-4 whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => openEdit(u)}
                          className="text-blue-500 p-2"
                          title="تعديل"
                        >
                          <Edit size={16} />
                        </button>
                        {u.is_active && !isSelf && (
                          <button
                            type="button"
                            onClick={async () => {
                              const ok = await confirm({
                                title: 'تعطيل المستخدم',
                                message: `تعطيل حساب «${u.name}»؟ لن يتمكن من تسجيل الدخول.`,
                                confirmText: 'تعطيل',
                                variant: 'danger',
                              });
                              if (ok) deactivateMutation.mutate(u.id);
                            }}
                            className="text-red-500 p-2"
                            title="تعطيل"
                          >
                            <UserX size={16} />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <Pagination pagination={data?.pagination} page={page} onPageChange={setPage} />
        </>
      )}

      <Modal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          clearErrors();
        }}
        title={editing ? 'تعديل مستخدم' : 'إضافة مستخدم'}
        alert={formError}
      >
        <form onSubmit={submit} className="space-y-4">
          <div>
            <input
              className="input"
              placeholder="الاسم *"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
            <FieldError message={getFieldError('name')} />
          </div>
          <div>
            <input
              className="input"
              type="email"
              placeholder="البريد"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
            <FieldError message={getFieldError('email')} />
          </div>
          <div>
            <input
              className="input"
              placeholder="الهاتف"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
            <FieldError message={getFieldError('phone')} />
          </div>
          <div>
            <input
              className="input"
              type="password"
              placeholder={editing ? 'كلمة مرور جديدة (اختياري)' : 'كلمة المرور *'}
              required={!editing}
              minLength={8}
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
            />
            <FieldError message={getFieldError('password')} />
          </div>
          <div>
            <select
              className="input"
              required
              value={form.role_id}
              onChange={(e) => setForm({ ...form, role_id: e.target.value })}
            >
              <option value="">اختر الدور *</option>
              {roles.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
            <FieldError message={getFieldError('role_id')} />
          </div>
          {editing && (
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={Boolean(form.is_active)}
                onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                disabled={Number(editing.id) === Number(currentUser?.id)}
              />
              حساب نشط
            </label>
          )}
          <button type="submit" className="btn-primary w-full" disabled={saveMutation.isPending}>
            حفظ
          </button>
        </form>
      </Modal>
    </div>
  );
}
