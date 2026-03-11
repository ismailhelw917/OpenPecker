import React, { useState } from 'react';
import { motion } from 'motion/react';
import { useChessStore } from '../lib/state/chessStore';

export default function RegisterScreen({ onBack }: { onBack: () => void }) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const login = useChessStore((s) => s.login);
  const register = useChessStore((s) => s.register);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        await login(email, password);
      } else {
        await register(username, email, password);
      }
      onBack();
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-full px-6 py-12 bg-bg-dark">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-bg-card p-8 rounded-2xl border border-border-dark"
      >
        <h2 className="text-2xl font-bold text-text-primary mb-6 text-center">
          {isLogin ? 'Login' : 'Create Account'}
        </h2>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-500 text-sm text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <input 
              type="text" 
              placeholder="Username" 
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              className="w-full p-3 rounded-xl bg-bg-dark border border-border-dark text-text-primary focus:border-brand-gold/50 outline-none transition-all"
            />
          )}
          <input 
            type="email" 
            placeholder="Email" 
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full p-3 rounded-xl bg-bg-dark border border-border-dark text-text-primary focus:border-brand-gold/50 outline-none transition-all"
          />
          <input 
            type="password" 
            placeholder="Password" 
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full p-3 rounded-xl bg-bg-dark border border-border-dark text-text-primary focus:border-brand-gold/50 outline-none transition-all"
          />
          <button 
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-brand-gold text-bg-dark font-bold hover:bg-brand-gold/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Processing...' : (isLogin ? 'Login' : 'Register')}
          </button>
        </form>
        
        <div className="mt-6 text-center">
          <button 
            onClick={() => setIsLogin(!isLogin)}
            className="text-brand-gold hover:text-brand-gold/80 text-sm font-medium"
          >
            {isLogin ? "Don't have an account? Register" : "Already have an account? Login"}
          </button>
        </div>

        <button 
          onClick={onBack}
          className="w-full mt-4 text-text-muted hover:text-white text-sm"
        >
          Back to Home
        </button>
      </motion.div>
    </div>
  );
}
