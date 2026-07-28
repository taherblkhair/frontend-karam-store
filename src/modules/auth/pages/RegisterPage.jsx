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

export default function RegisterPage() {
  const { register, loading } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ phone: '', password: '', password2: '' });
  const { formError, clearErrors, applyApiError, getFieldError } = useFormErrors();

  const handleSubmit = async (e) => {
    e.preventDefault();
    clearErrors();

    const phone = normalizeLibyaPhone(form.phone);
    if (!isValidLibyaMobile(phone)) {
      return notifyError({ message: LIBYA_PHONE_MESSAGE });
    }

    if (form.password !== form.password2) {
      return notifyError({ message: 'كلمتا المرور غير متطابقتين' });
    }

    try {
      const res = await register({
        phone,
        password: form.password,
      });
      notifySuccess(res);
      navigate('/account');
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
            <h1 className="text-2xl font-bold text-primary-600">إنشاء حساب</h1>
            <p className="text-gray-500 mt-2 text-sm">برقم الهاتف وكلمة المرور فقط</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {formError ? <FormAlert message={formError} /> : null}

            <div>
              <input
                className="input"
                inputMode="tel"
                placeholder="مثال: 0912345678 *"
                pattern="09[1-5][0-9]{7}"
                title={LIBYA_PHONE_MESSAGE}
                required
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
              <p className="text-xs text-gray-500 mt-1">الشركات المسموحة: 091 · 092 · 093 · 094 · 095</p>
              <FieldError message={getFieldError('phone')} />
            </div>

            <div>
              <input
                type="password"
                className="input"
                placeholder="كلمة المرور (8 أحرف على الأقل) *"
                required
                minLength={8}
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
              />
              <FieldError message={getFieldError('password')} />
            </div>

            <div>
              <input
                type="password"
                className="input"
                placeholder="تأكيد كلمة المرور *"
                required
                minLength={8}
                value={form.password2}
                onChange={(e) => setForm({ ...form, password2: e.target.value })}
              />
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? 'جاري الإنشاء...' : 'إنشاء الحساب'}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-6">
            لديك حساب؟{' '}
            <Link to="/login" className="text-primary-600 font-medium hover:underline">
              تسجيل الدخول
            </Link>
          </p>
        </div>
      </div>
    </StoreLayout>
  );
}
