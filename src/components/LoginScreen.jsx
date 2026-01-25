'use client';

import { useState, useEffect } from 'react';
import { Home, Sparkles, ExternalLink, Github } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { useDemo } from '@/hooks/useDemo';
import { getSiteType, SITE_TYPE, getSiteUrl } from '@/lib/siteConfig';

/**
 * Google icon SVG component
 * lucide-react doesn't include a Google icon
 */
function GoogleIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}

export default function LoginScreen() {
  const { signInWithGoogle, signInWithGitHub } = useAuth();
  const { enterDemo } = useDemo();

  const [status, setStatus] = useState('');
  const [signingIn, setSigningIn] = useState(false);
  const [isReturningUser, setIsReturningUser] = useState(false);
  const [siteType, setSiteType] = useState(null);

  // Detect site type and returning user status on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setSiteType(getSiteType());
      const hasAuthenticated =
        window.localStorage.getItem('chiribudget_hasAuthenticated') === 'true';
      setIsReturningUser(hasAuthenticated);
    }
  }, []);

  async function handleGoogleSignIn() {
    setSigningIn(true);
    setStatus('Redirecting to Google...');
    const { error } = await signInWithGoogle();
    if (error) {
      setSigningIn(false);
      setStatus(error.message);
    }
    // On success, user is redirected to Google
  }

  async function handleGitHubSignIn() {
    setSigningIn(true);
    setStatus('Redirecting to GitHub...');
    const { error } = await signInWithGitHub();
    if (error) {
      setSigningIn(false);
      setStatus(error.message);
    }
  }

  function handleSiteNavigation(targetSiteType) {
    window.location.href = getSiteUrl(targetSiteType);
  }

  // Determine which navigation buttons to show based on site type
  const navButtons = [];
  if (siteType === SITE_TYPE.PRODUCTION) {
    navButtons.push(
      { label: 'Demo', target: SITE_TYPE.DEMO, icon: Sparkles },
      { label: 'Local', target: SITE_TYPE.LOCAL, icon: ExternalLink }
    );
  } else if (siteType === SITE_TYPE.DEMO) {
    navButtons.push({
      label: 'Prod',
      target: SITE_TYPE.PRODUCTION,
      icon: ExternalLink,
    });
  } else if (siteType === SITE_TYPE.LOCAL) {
    navButtons.push(
      { label: 'Demo', target: SITE_TYPE.DEMO, icon: Sparkles },
      { label: 'Prod', target: SITE_TYPE.PRODUCTION, icon: ExternalLink }
    );
  }

  // Show "Try Demo Mode" button on demo site (for non-returning users)
  const showTryDemoButton = siteType === SITE_TYPE.DEMO && !isReturningUser;

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-cream via-sand to-cream">
      <Card className="w-full max-w-md p-8">
        {/* Logo & Branding */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-gradient-to-br from-slate to-slate-light mb-4">
            <Home className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold gradient-text mb-2">ChiriBudget</h1>
          <p className="text-stone">Family finances, made simple.</p>
        </div>

        {/* OAuth Buttons */}
        <div className="space-y-3">
          <Button
            className="w-full"
            onClick={handleGoogleSignIn}
            disabled={signingIn}
          >
            <GoogleIcon className="w-5 h-5 mr-2" />
            Sign in with Google
          </Button>

          <Button
            variant="outline"
            className="w-full"
            onClick={handleGitHubSignIn}
            disabled={signingIn}
          >
            <Github className="w-5 h-5 mr-2" />
            Sign in with GitHub
          </Button>
        </div>

        {/* Status Message */}
        <div aria-live="polite" aria-atomic="true">
          {status && (
            <div
              role={status.includes('Redirecting') ? 'status' : 'alert'}
              className={`mt-4 p-3 rounded-lg text-sm text-center ${
                status.includes('Redirecting')
                  ? 'bg-slate/10 text-slate'
                  : 'bg-error/10 text-error border border-error/20'
              }`}
            >
              {status}
            </div>
          )}
        </div>

        {/* Navigation / Demo Mode Section */}
        {(navButtons.length > 0 || showTryDemoButton) && (
          <>
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-sand"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-3 bg-white text-warm-gray">or</span>
              </div>
            </div>

            <div className="space-y-3">
              {/* Demo Mode button - only on demo site for non-returning users */}
              {showTryDemoButton && (
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={enterDemo}
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  Try Demo Mode
                </Button>
              )}

              {/* Site navigation buttons - side by side */}
              {navButtons.length > 0 && (
                <div className="flex gap-3">
                  {navButtons.map(({ label, target, icon: Icon }) => (
                    <Button
                      key={target}
                      variant="ghost"
                      className="flex-1 bg-slate/10 text-slate hover:bg-slate/20 border-0"
                      onClick={() => handleSiteNavigation(target)}
                    >
                      <Icon className="w-4 h-4 mr-2" />
                      {label}
                    </Button>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        <p className="mt-4 text-xs text-center text-warm-gray">
          Sign in securely with your Google or GitHub account.
        </p>
      </Card>
    </div>
  );
}
