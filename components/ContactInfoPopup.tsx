import React, { useState } from 'react';
import { useVisitor } from '../lib/contexts/VisitorContext';

interface ContactInfoPopupProps {
  onClose: () => void;
  onSubmit: (contactInfo: { email: string; phone?: string; name?: string }) => void;
}

export const ContactInfoPopup: React.FC<ContactInfoPopupProps> = ({ onClose, onSubmit }) => {
  const { visitorId } = useVisitor();
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email.trim()) {
      setError('Email is required');
      return;
    }

    if (!visitorId) {
      setError('Visitor ID not available');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const contactInfo = {
        email: email.trim(),
        ...(phone.trim() && { phone: phone.trim() }),
        ...(name.trim() && { name: name.trim() })
      };

      onSubmit(contactInfo);
      onClose();
    } catch (err) {
      setError('Failed to submit contact info');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Overlay with fade-in */}
      <div 
        className="absolute inset-0 bg-neutral-foreground bg-opacity-50 transition-opacity duration-300 ease-out"
        onClick={onClose}
      />
      
      {/* Popup with scale-in */}
      <div className="relative bg-surface rounded-lg shadow-xl max-w-sm w-full mx-4 transform transition-all duration-300 ease-out animate-in zoom-in-95">
        {/* Header */}
        <div className="px-6 py-4 border-b border-neutral-border/10">
          <div className="flex items-center justify-between">
            <h3 className="text-2xl font-medium text-text-primary">
              Stay connected with us
            </h3>
            <button
              onClick={onClose}
              className="text-text-secondary hover:text-text-primary transition-colors"
              aria-label="Close"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <p className="mt-1 text-lg text-text-secondary">
            Help us provide you with a better experience by sharing your contact information.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
          {/* Email (Required) */}
          <div>
            <label htmlFor="email" className="block text-lg font-medium text-text-primary mb-1">
              Email address *
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-neutral-border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-secondary focus:border-brand-secondary bg-surface text-text-primary placeholder:text-text-tertiary text-lg"
              placeholder="your@email.com"
              required
              disabled={isSubmitting}
            />
          </div>

          {/* Phone (Optional) */}
          <div>
            <label htmlFor="phone" className="block text-lg font-medium text-text-primary mb-1">
              Phone number
            </label>
            <input
              type="tel"
              id="phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full px-3 py-2 border border-neutral-border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-secondary focus:border-brand-secondary bg-surface text-text-primary placeholder:text-text-tertiary text-lg"
              placeholder="(555) 123-4567"
              disabled={isSubmitting}
            />
          </div>

          {/* Name (Optional) */}
          <div>
            <label htmlFor="name" className="block text-lg font-medium text-text-primary mb-1">
              Your name
            </label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-neutral-border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-secondary focus:border-brand-secondary bg-surface text-text-primary placeholder:text-text-tertiary text-lg"
              placeholder="John Doe"
              disabled={isSubmitting}
            />
          </div>

          {/* Error Message */}
          {error && (
            <div className="text-semantic-error text-lg bg-semantic-error/10 border border-semantic-error/20 rounded px-3 py-2">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 text-text-secondary bg-surface border border-neutral-border rounded-md hover:bg-neutral-muted-bg focus:outline-none focus:ring-2 focus:ring-neutral-border transition-colors text-lg"
              disabled={isSubmitting}
            >
              Skip for now
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-brand-secondary text-white rounded-md hover:bg-brand-secondary/90 focus:outline-none focus:ring-2 focus:ring-brand-secondary disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-lg"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Saving...' : 'Continue'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}; 