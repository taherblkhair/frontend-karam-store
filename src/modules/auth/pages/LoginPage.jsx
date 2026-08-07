import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@core/auth/AuthContext';
import { useFormErrors } from '@shared/hooks/useFormErrors';
import { FieldError, FormAlert } from '@shared/ui';
import { notifySuccess, notifyError } from '@shared/services/toast.service';
import StoreLayout from '@shared/layouts/StoreLayout';
import {
  isValidLibyaMobile,
  normalizeLibyaPhone,
  LIBYA_PHONE_MESSAGE,
} from '@shared/utils/phone';

export default function LoginPage() {
  const { login, loading } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', phone: '', password: '' });
  // Store customers use phone; staff can switch to email
  const [usePhone, setUsePhone] = useState(true);
  const { formError, clearErrors, applyApiError, getFieldError } = useFormErrors();

  const handleSubmit = async (e) => {
    e.preventDefault();
    clearErrors();

    if (usePhone) {
      const phone = normalizeLibyaPhone(form.phone);
      if (!isValidLibyaMobile(phone)) {
        return notifyError({ message: LIBYA_PHONE_MESSAGE });
      }
    }

    try {
      const res = await login({
        email: usePhone ? undefined : form.email,
        phone: usePhone ? normalizeLibyaPhone(form.phone) : undefined,
        password: form.password,
      });
      notifySuccess(res);
      const nextUser = res?.data?.user;
      if (!nextUser) {
        throw { message: 'فشل تسجيل الدخول: لم يُرجع الخادم بيانات المستخدم' };
      }
      if (nextUser.role === 'customer') navigate('/account');
      else navigate('/admin');
    } catch (err) {
      applyApiError(err);
      notifyError(err);
    }
  };

  return (
    <StoreLayout>
      <div className="container mx-auto px-4 py-10 max-w-md">
        <div className="card p-6 md:p-8">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-primary-600">متجر كرم</h1>
            <p className="text-gray-500 mt-2">تسجيل الدخول</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {formError ? <FormAlert message={formError} /> : null}

            <div className="flex gap-2 mb-2">
              <button
                type="button"
                onClick={() => setUsePhone(true)}
                className={`flex-1 py-2 rounded-lg text-sm ${
                  usePhone ? 'bg-primary-600 text-white' : 'bg-gray-200 dark:bg-gray-700'
                }`}
              >
                بالهاتف
              </button>
              <button
                type="button"
                onClick={() => setUsePhone(false)}
                className={`flex-1 py-2 rounded-lg text-sm ${
                  !usePhone ? 'bg-primary-600 text-white' : 'bg-gray-200 dark:bg-gray-700'
                }`}
              >
                بالبريد
              </button>
            </div>

            {usePhone ? (
              <div>
                <input
                  className="input"
                  inputMode="tel"
                  placeholder="مثال: 0912345678"
                  pattern="09[1-5][0-9]{7}"
                  title={LIBYA_PHONE_MESSAGE}
                  required
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                />
                <p className="text-xs text-gray-500 mt-1">091 · 092 · 093 · 094 · 095</p>
                <FieldError message={getFieldError('phone')} />
              </div>
            ) : (
              <div>
                <input
                  type="email"
                  className="input"
                  placeholder="البريد الإلكتروني"
                  required
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
                <FieldError message={getFieldError('email')} />
              </div>
            )}

            <div>
              <input
                type="password"
                className="input"
                placeholder="كلمة المرور"
                required
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
              />
              <FieldError message={getFieldError('password')} />
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? 'جاري الدخول...' : 'دخول'}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-6">
            عميل جديد؟{' '}
            <Link to="/register" className="text-primary-600 font-medium hover:underline">
              إنشاء حساب
            </Link>
          </p>
        </div>
      </div>
    </StoreLayout>
  );
}
