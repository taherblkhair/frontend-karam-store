import { AppProviders } from './providers';
import { AppRouter } from './router';
import { AppErrorBoundary } from '@shared/components/AppErrorBoundary';

export default function App() {
  return (
    <AppErrorBoundary>
      <AppProviders>
        <AppRouter />
      </AppProviders>
    </AppErrorBoundary>
  );
}
