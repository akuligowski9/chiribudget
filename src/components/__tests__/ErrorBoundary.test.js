import { render, screen } from '@testing-library/react';
import ErrorBoundary from '../ErrorBoundary';

// Component that throws an error
function ThrowError({ shouldThrow }) {
  if (shouldThrow) {
    throw new Error('Test error');
  }
  return <div>No error</div>;
}

describe('ErrorBoundary', () => {
  // Suppress console.error for these tests since we expect errors
  // eslint-disable-next-line no-console
  const originalError = console.error;

  beforeEach(() => {
    // eslint-disable-next-line no-console
    console.error = jest.fn();
  });

  afterEach(() => {
    // eslint-disable-next-line no-console
    console.error = originalError;
  });

  it('renders children when there is no error', () => {
    render(
      <ErrorBoundary>
        <div>Child content</div>
      </ErrorBoundary>
    );

    expect(screen.getByText('Child content')).toBeInTheDocument();
  });

  it('renders error UI when child throws', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(
      screen.getByText(
        'An unexpected error occurred. Please refresh the page to try again.'
      )
    ).toBeInTheDocument();
  });

  it('renders refresh button in error state', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(
      screen.getByRole('button', { name: 'Refresh Page' })
    ).toBeInTheDocument();
  });

  it('logs error to console', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    // eslint-disable-next-line no-console
    expect(console.error).toHaveBeenCalled();
  });
});
