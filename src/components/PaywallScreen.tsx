import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Check, X, CreditCard, Shield, Zap } from 'lucide-react';
import { useChessStore } from '../lib/state/chessStore';

interface PaywallScreenProps {
  onClose: () => void;
}

export default function PaywallScreen({ onClose }: PaywallScreenProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const deviceId = useChessStore((s) => s.deviceId);

  const handleCheckout = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ deviceId }),
      });

      const result = await response.json();

      if (result.error) {
        throw new Error(result.error.message);
      }

      if (result.data?.url) {
        // Open Stripe checkout in the same window (or a new tab if preferred)
        window.location.href = result.data.url;
      } else {
        throw new Error('No checkout URL returned');
      }
    } catch (err: any) {
      console.error('Checkout error:', err);
      setError(err.message || 'An error occurred during checkout. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const features = [
    'Unlock all 150+ opening variations',
    'Advanced performance analytics',
    'Unlimited training cycles',
    'Priority puzzle loading',
    'Support independent development'
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />
      
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative bg-bg-dark border border-brand-gold/30 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header Image/Gradient */}
        <div className="h-32 bg-gradient-to-br from-brand-gold/20 via-bg-dark to-bg-dark relative flex items-center justify-center">
          <div className="absolute top-4 right-4 z-10">
            <button 
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-black/20 flex items-center justify-center text-text-muted hover:text-white hover:bg-black/40 transition-colors"
            >
              <X size={16} />
            </button>
          </div>
          <div className="w-16 h-16 rounded-full bg-brand-gold/10 border border-brand-gold/30 flex items-center justify-center shadow-[0_0_30px_rgba(212,175,55,0.3)]">
            <span className="text-4xl text-brand-gold">♔</span>
          </div>
        </div>

        <div className="p-8 overflow-y-auto">
          <div className="text-center mb-8">
            <h2 className="font-serif text-3xl font-bold text-text-primary mb-2">OpenPecker Premium</h2>
            <p className="text-text-muted">Master every opening. No limits.</p>
          </div>

          <div className="space-y-4 mb-8">
            {features.map((feature, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-full bg-emerald-500/10 flex items-center justify-center shrink-0">
                  <Check size={12} className="text-emerald-500" />
                </div>
                <span className="text-sm text-text-primary">{feature}</span>
              </div>
            ))}
          </div>

          <div className="bg-bg-card border border-border-dark rounded-2xl p-4 mb-8 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-text-muted mb-1">Lifetime Access</p>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-bold text-brand-gold">$4.99</span>
                <span className="text-xs text-text-muted">/month</span>
              </div>
            </div>
            <div className="flex gap-2 text-text-muted">
              <Shield size={20} />
              <Zap size={20} />
            </div>
          </div>

          {error && (
            <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-500 text-sm text-center">
              {error}
            </div>
          )}

          <button
            onClick={handleCheckout}
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-2 py-4 rounded-xl bg-brand-gold text-bg-dark font-bold text-sm tracking-[2px] uppercase shadow-[0_4px_20px_rgba(212,175,55,0.2)] hover:scale-[1.02] transition-transform disabled:opacity-70 disabled:hover:scale-100"
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-bg-dark/30 border-t-bg-dark rounded-full animate-spin" />
            ) : (
              <>
                <CreditCard size={18} />
                <span>Upgrade Now</span>
              </>
            )}
          </button>
          
          <p className="text-center text-[10px] text-text-muted mt-4">
            Secure payment processed by Stripe. Cancel anytime.
          </p>
        </div>
      </motion.div>
    </div>
  );
}
