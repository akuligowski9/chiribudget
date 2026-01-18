'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useDemo } from '@/hooks/useDemo';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Home, Mail, Sparkles } from 'lucide-react';

export default function LoginScreen() {
  const { sendMagicLink } = useAuth();
  const { enterDemo } = useDemo();

  const [email, setEmail] = useState('');
  const [status, setStatus] = useState('');
  const [sending, setSending] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!email.trim()) {
      setStatus('Please enter your email');
      return;
    }

    setSending(true);
    setStatus('Sending magic link...');

    const { error } = await sendMagicLink(email);

    setSending(false);
    if (error) {
      setStatus(error.message);
    } else {
      setStatus('Check your email for the sign-in link!');
    }
  }

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

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label
              htmlFor="email"
              className="text-sm font-medium text-charcoal"
            >
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-warm-gray" />
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="pl-11"
                disabled={sending}
              />
            </div>
          </div>

          <Button type="submit" className="w-full" disabled={sending}>
            {sending ? 'Sending...' : 'Send Magic Link'}
          </Button>
        </form>

        {/* Status Message */}
        {status && (
          <div
            className={`mt-4 p-3 rounded-lg text-sm text-center ${
              status.includes('Check your email')
                ? 'bg-success/10 text-success border border-success/20'
                : status.includes('...')
                  ? 'bg-slate/10 text-slate'
                  : 'bg-error/10 text-error border border-error/20'
            }`}
          >
            {status}
          </div>
        )}

        {/* Divider */}
        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-sand"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-3 bg-white text-warm-gray">or</span>
          </div>
        </div>

        {/* Demo Mode */}
        <Button variant="outline" className="w-full" onClick={enterDemo}>
          <Sparkles className="w-4 h-4 mr-2" />
          Try Demo Mode
        </Button>

        <p className="mt-4 text-xs text-center text-warm-gray">
          No password needed. We&apos;ll send you a secure sign-in link.
        </p>
      </Card>
    </div>
  );
}
