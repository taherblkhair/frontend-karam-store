import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@core/auth/AuthContext';

/** /login?next=… so signing in returns to the page that was asked for (e.g. an order opened from a notification) */
export function loginPathFor(location) {
  const next = `${location.pathname}${location.search || ''}`;
  return next && next !== '/' ? `/login?next=${encodeURIComponent(next)}` : '/login';
}

/**
 * Where to go after signing in: the requested page (?next=) when it is a path on this site the
 * role may open — staff: /admin…, customers: anything outside /admin — otherwise the home of the role.
 */
export function afterLoginPath(role, next) {
  const home = role === 'customer' ? '/account' : '/admin';
  const path = String(next || '');
  if (!path.startsWith('/') || path.startsWith('//') || path.startsWith('/\\') || path.startsWith('/login')) return home;
  if (role === 'customer') return path.startsWith('/admin') ? home : path;
  return path.startsWith('/admin') ? path : home;
}

export function ProtectedRoute({ roles }) {
  const { user } = useAuth();
  const location = useLocation();

  if (!user) {
    return <Navigate to={loginPathFor(location)} replace />;
  }

  if (roles && !roles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}

export function GuestRoute() {
  const { user } = useAuth();
  const location = useLocation();

  if (user) {
    const next = new URLSearchParams(location.search).get('next');
    return <Navigate to={afterLoginPath(user.role, next)} replace />;
  }

  return <Outlet />;
}
