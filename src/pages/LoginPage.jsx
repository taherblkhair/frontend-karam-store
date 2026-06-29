import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useFormErrors } from '../hooks/useFormErrors';
import { FieldError } from '../components/ui';
import { notifySuccess, notifyError } from '../utils/notify';

export default function LoginPage() {
  const { login, loading } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', phone: '', password: '' });
  const [usePhone, setUsePhone] = useState(false);
  const { fieldErrors, clearErrors, applyApiError, getFieldError } = useFormErrors();

  const handleSubmit = async (e) => {
    e.preventDefault();
    clearErrors();
    try {
      const res = await login({
        email: usePhone ? undefined : form.email,
        phone: usePhone ? form.phone : undefined,
        password: form.password,
      });
      notifySuccess(res);
      const user = res.data.user;
      if (user.role === 'customer') navigate('/');
      else navigate('/admin');
    } catch (err) {
      applyApiError(err);
      notifyError(err);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900 p-4">
      <div className="card w-full max-w-md p-8">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-primary-600">كرام ستور</h1>
          <p className="text-gray-500 mt-2">تسجيل الدخول</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex gap-2 mb-4">
            <button type="button" onClick={() => setUsePhone(false)} className={`flex-1 py-2 rounded-lg ${!usePhone ? 'bg-primary-600 text-white' : 'bg-gray-200 dark:bg-gray-700'}`}>
              بالبريد
            </button>
            <button type="button" onClick={() => setUsePhone(true)} className={`flex-1 py-2 rounded-lg ${usePhone ? 'bg-primary-600 text-white' : 'bg-gray-200 dark:bg-gray-700'}`}>
              بالهاتف
            </button>
          </div>

          {usePhone ? (
            <div>
              <input className="input" placeholder="رقم الهاتف" required value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              <FieldError message={getFieldError('phone')} />
            </div>
          ) : (
            <div>
              <input type="email" className="input" placeholder="البريد الإلكتروني" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              <FieldError message={getFieldError('email')} />
            </div>
          )}

          <div>
            <input type="password" className="input" placeholder="كلمة المرور" required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
            <FieldError message={getFieldError('password')} />
          </div>

          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? 'جاري الدخول...' : 'دخول'}
          </button>
        </form>

        <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg text-sm">
          <p className="font-medium mb-2">حسابات تجريبية:</p>
          <p>Admin: admin@karamstore.ly / Admin@123</p>
          <p>Sales: sales@karamstore.ly / Sales@123</p>
        </div>
      </div>
    </div>
  );
}
