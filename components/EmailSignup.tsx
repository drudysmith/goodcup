import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';

interface EmailSignupProps {
  user: any;
  visitorId: string | null;
  jwt: string | null;
  updateVisitorIdentity: (newVisitorId: string, newJwt: string, newVisitorData: any) => void;
}

const EmailSignup: React.FC<EmailSignupProps> = ({ user, visitorId, jwt, updateVisitorIdentity }) => {
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [newsletterSuccess, setNewsletterSuccess] = useState(false);
  const [newsletterError, setNewsletterError] = useState('');

  const newsletterMutation = useMutation({
    mutationFn: async (email: string) => {
      if (!visitorId || !jwt) throw new Error('Missing visitor ID or JWT');
      const response = await fetch('/api/visitor/identify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ visitor_id: visitorId, email }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to subscribe');
      }
      return response.json();
    },
    onSuccess: (data) => {
      setNewsletterSuccess(true);
      setNewsletterError('');
      setNewsletterEmail('');
      if (data.visitor_id && data.jwt && data.visitor) {
        updateVisitorIdentity(data.visitor_id, data.jwt, data.visitor);
      }
    },
    onError: (error: any) => {
      setNewsletterError(error.message || 'Failed to subscribe');
      setNewsletterSuccess(false);
    },
  });

  const handleNewsletterSubmit = async (e: React.MouseEvent) => {
    e.preventDefault();
    setNewsletterSuccess(false);
    setNewsletterError('');
    if (!newsletterEmail.trim()) {
      setNewsletterError('Please enter a valid email.');
      return;
    }
    if (user) {
      setNewsletterError('You are already subscribed.');
      return;
    }
    newsletterMutation.mutate(newsletterEmail.trim());
  };

  return (
    <div className="mb-8">
      <p className="text-base text-surface-background mb-4">
        Be first to know — Join our list
      </p>
      <div className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
        <input
          type="email"
          placeholder="Enter your email"
          className="flex-1 px-4 py-2 rounded bg-surface text-text-primary placeholder:text-text-tertiary border border-neutral-border focus:outline-none focus:ring-2 focus:ring-brand-secondary"
          value={newsletterEmail}
          onChange={e => setNewsletterEmail(e.target.value)}
          disabled={!!user}
        />
        <button
          className="px-6 py-2 bg-brand-secondary text-white rounded font-medium hover:opacity-90 transition-opacity disabled:opacity-60"
          onClick={handleNewsletterSubmit}
          disabled={!!user || newsletterMutation.isPending}
        >
          {user ? 'Already Subscribed' : newsletterMutation.isPending ? 'Subscribing...' : 'Subscribe'}
        </button>
      </div>
      {newsletterSuccess && (
        <div className="text-green-400 text-sm mt-2">Thank you for subscribing!</div>
      )}
      {newsletterError && (
        <div className="text-red-400 text-sm mt-2">{newsletterError}</div>
      )}
    </div>
  );
};

export default EmailSignup; 
