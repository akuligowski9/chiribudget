'use client';

import { render, screen, waitFor, act } from '@testing-library/react';
import { AuthProvider, useAuth } from '../AuthContext';

// Track auth state change callback
let authStateCallback = null;

// Mock Supabase
jest.mock('@/lib/supabaseClient', () => ({
  supabase: {
    auth: {
      getUser: jest.fn(() =>
        Promise.resolve({
          data: { user: { id: 'user-1', email: 'test@example.com' } },
        })
      ),
      onAuthStateChange: jest.fn((callback) => {
        authStateCallback = callback;
        return {
          data: {
            subscription: {
              unsubscribe: jest.fn(),
            },
          },
        };
      }),
      signInWithOtp: jest.fn(() => Promise.resolve({ error: null })),
      signOut: jest.fn(() => Promise.resolve()),
    },
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          maybeSingle: jest.fn(() =>
            Promise.resolve({
              data: {
                user_id: 'user-1',
                household_id: 'hh-1',
                default_currency: 'USD',
              },
            })
          ),
          single: jest.fn(() =>
            Promise.resolve({
              data: { id: 'hh-1', name: 'Test Household', join_code: 'abc123' },
            })
          ),
        })),
      })),
    })),
  },
}));

// Mock auth module
jest.mock('@/lib/auth', () => ({
  getDemoMode: jest.fn(() => false),
}));

// Test component that uses useAuth
function TestComponent() {
  const { user, profile, household, loading, isAuthenticated, hasHousehold } =
    useAuth();

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      <div data-testid="authenticated">{isAuthenticated ? 'yes' : 'no'}</div>
      <div data-testid="has-household">{hasHousehold ? 'yes' : 'no'}</div>
      <div data-testid="user-email">{user?.email || 'none'}</div>
      <div data-testid="profile-currency">
        {profile?.default_currency || 'none'}
      </div>
      <div data-testid="household-name">{household?.name || 'none'}</div>
    </div>
  );
}

describe('AuthContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    authStateCallback = null;
  });

  it('shows loading state initially', () => {
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('loads user data after auth resolves', async () => {
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('authenticated')).toHaveTextContent('yes');
    });

    expect(screen.getByTestId('user-email')).toHaveTextContent(
      'test@example.com'
    );
    expect(screen.getByTestId('profile-currency')).toHaveTextContent('USD');
    expect(screen.getByTestId('household-name')).toHaveTextContent(
      'Test Household'
    );
    expect(screen.getByTestId('has-household')).toHaveTextContent('yes');
  });

  it('provides signOut function that clears state', async () => {
    const { supabase } = require('@/lib/supabaseClient');

    function SignOutTest() {
      const { user, signOut } = useAuth();
      return (
        <div>
          <div data-testid="user">{user ? 'logged-in' : 'logged-out'}</div>
          <button onClick={signOut}>Sign Out</button>
        </div>
      );
    }

    render(
      <AuthProvider>
        <SignOutTest />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('user')).toHaveTextContent('logged-in');
    });

    // Trigger sign out
    await act(async () => {
      screen.getByText('Sign Out').click();
    });

    expect(supabase.auth.signOut).toHaveBeenCalled();
  });

  it('provides sendMagicLink function', async () => {
    const { supabase } = require('@/lib/supabaseClient');

    function MagicLinkTest() {
      const { sendMagicLink, loading } = useAuth();

      async function handleClick() {
        await sendMagicLink('new@example.com');
      }

      if (loading) return <div>Loading...</div>;

      return <button onClick={handleClick}>Send Link</button>;
    }

    render(
      <AuthProvider>
        <MagicLinkTest />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Send Link')).toBeInTheDocument();
    });

    await act(async () => {
      screen.getByText('Send Link').click();
    });

    expect(supabase.auth.signInWithOtp).toHaveBeenCalledWith({
      email: 'new@example.com',
    });
  });

  it('throws error when useAuth is used outside AuthProvider', () => {
    // Suppress console.error for this test
    const consoleSpy = jest
      .spyOn(console, 'error')
      .mockImplementation(() => {});

    expect(() => {
      render(<TestComponent />);
    }).toThrow('useAuth must be used within an AuthProvider');

    consoleSpy.mockRestore();
  });
});

describe('AuthContext in demo mode', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    const authModule = require('@/lib/auth');
    authModule.getDemoMode.mockReturnValue(true);
  });

  afterEach(() => {
    const authModule = require('@/lib/auth');
    authModule.getDemoMode.mockReturnValue(false);
  });

  it('skips loading in demo mode', async () => {
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    // In demo mode, loading should be false immediately
    await waitFor(() => {
      expect(screen.getByTestId('authenticated')).toHaveTextContent('no');
    });

    // Should not have called Supabase auth
    const { supabase } = require('@/lib/supabaseClient');
    expect(supabase.auth.getUser).not.toHaveBeenCalled();
  });
});
