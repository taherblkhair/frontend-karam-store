import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authApi } from '@core/auth/auth.api';
import { createApiError } from '@shared/utils/apiMessage.js';

const AuthContext = createContext(null);

function persistUser(user) {
  localStorage.setItem('user', JSON.stringify(user));
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('user');
    return saved ? JSON.parse(saved) : null;
  });
  const [loading, setLoading] = useState(false);

  const applyAuth = (payload) => {
    if (!payload?.token || !payload?.user) {
      throw createApiError({
        message: 'استجابة تسجيل الدخول غير مكتملة من الخادم',
        code: 'INVALID_AUTH_PAYLOAD',
        statusCode: 502,
      });
    }
    localStorage.setItem('token', payload.token);
    persistUser(payload.user);
    setUser(payload.user);
  };

  const refreshProfile = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) return null;
    const res = await authApi.me();
    const profile = res.data;
    const next = {
      ...(JSON.parse(localStorage.getItem('user') || '{}')),
      ...profile,
    };
    persistUser(next);
    setUser(next);
    return next;
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;
    refreshProfile().catch(() => {
      // token invalid — keep silent; axios interceptor may clear session
    });
  }, [refreshProfile]);

  const login = async (credentials) => {
    setLoading(true);
    try {
      const res = await authApi.login(credentials);
      applyAuth(res.data);
      return res;
    } finally {
      setLoading(false);
    }
  };

  const register = async (data) => {
    setLoading(true);
    try {
      const res = await authApi.register(data);
      applyAuth(res.data);
      return res;
    } finally {
      setLoading(false);
    }
  };

  const updateShippingAddress = async (data) => {
    const res = await authApi.updateShippingAddress(data);
    const profile = res.data;
    const next = {
      ...user,
      name: profile.name ?? user?.name,
      phone: profile.phone ?? user?.phone,
      shipping_address: profile.shipping_address,
    };
    persistUser(next);
    setUser(next);
    return res;
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };

  const isAdmin = user?.role === 'admin';
  const isSales = user?.role === 'sales';
  const isCustomer = user?.role === 'customer';
  const hasPermission = (perm) => isAdmin || user?.permissions?.includes(perm);

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        register,
        logout,
        refreshProfile,
        updateShippingAddress,
        loading,
        isAdmin,
        isSales,
        isCustomer,
        hasPermission,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
