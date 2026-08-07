import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from '@core/auth/AuthContext';
import { ThemeProvider } from '@core/config/ThemeContext';
import { CartProvider } from '@modules/store/context/CartContext';
import { ConfirmProvider } from '@shared/hooks/useConfirm';
import { StoreBranding } from '@shared/components/StoreBranding';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, refetchOnWindowFocus: false },
  },
});

export function AppProviders({ children }) {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <CartProvider>
            <ConfirmProvider>
              <StoreBranding />
              {children}
              <Toaster position="top-center" />
            </ConfirmProvider>
          </CartProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
