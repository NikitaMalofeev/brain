import { App } from '@/components/App.tsx';
import { ErrorBoundary } from '@/components/ErrorBoundary.tsx';
import { AppWrapper } from '@/components/AppWrapper.tsx';
import { AppProvider } from '@/contexts/AppContext';
import { PlayerProvider } from '@/contexts/PlayerContext';

function ErrorBoundaryError({ error }: { error: unknown }) {
  return (
    <div>
      <p>An unhandled error occurred:</p>
      <blockquote>
        <code>
          {error instanceof Error
            ? error.message
            : typeof error === 'string'
              ? error
              : JSON.stringify(error)}
        </code>
      </blockquote>
    </div>
  );
}

export function Root() {
  return (
    <ErrorBoundary fallback={ErrorBoundaryError}>
      <AppProvider>
        <PlayerProvider>
          <AppWrapper>
            <App />
          </AppWrapper>
        </PlayerProvider>
      </AppProvider>
    </ErrorBoundary>
  );
}
