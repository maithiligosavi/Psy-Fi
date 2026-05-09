import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { Brain, Leaf, TrendingUp } from 'lucide-react';

export default function Auth() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { signIn, signUp } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (isSignUp) {
        if (!name.trim()) throw new Error('Name is required');
        await signUp(email, password, name);
      } else {
        await signIn(email, password);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      // Changed class from static bg color to the new utility class
      className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden auth-page-wrapper"
    >
      {/* Abstract background shapes - Lowered opacity significantly for professionalism */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute -top-32 -left-32 w-96 h-96 rounded-full opacity-5 blur-3xl"
          style={{ background: 'var(--stormyTeal)' }}
        />
        <div
          className="absolute top-1/3 -right-24 w-80 h-80 rounded-full opacity-10 blur-3xl"
          style={{ background: 'var(--pearlAqua)' }}
        />
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Logo + tagline */}
        <div className="text-center mb-8">
          <div
            className="inline-flex items-center justify-center w-20 h-20 rounded-2xl mb-5 shadow-xl"
            style={{ background: 'var(--stormyTeal)' }}
          >
            <Brain className="w-10 h-10 text-white" />
          </div>
          <h1
            className="text-5xl font-extrabold mb-2 tracking-tight text-white" // Fixed contrast
          >
            Psy-Fi
          </h1>
          <p className="text-base font-medium text-white/80"> {/* Fixed contrast */}
            Mindful Finance · Psychological Spending Expense Tracker
          </p>

          <div className="flex justify-center gap-3 mt-4">
            {[
              { icon: Leaf, label: 'Mindful' },
              { icon: TrendingUp, label: 'Insightful' },
              { icon: Brain, label: 'Behavioral' },
            ].map(({ icon: Icon, label }) => (
              <span
                key={label}
                className="flex items-center gap-1 text-xs font-semibold px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-white border border-white/20"
              >
                <Icon className="w-3 h-3" />
                {label}
              </span>
            ))}
          </div>
        </div>

        {/* Card using existing glass styles, refined contrast */}
        <div
          className="glass-dark rounded-3xl shadow-2xl p-8 backdrop-blur-md"
          style={{ background: 'rgba(255, 255, 255, 0.1)', border: '1px solid rgba(255, 255, 255, 0.2)' }}
        >
          {/* Tab switcher */}
          <div
            className="flex gap-2 mb-7 p-1 rounded-xl bg-black/10"
          >
            <button
              onClick={() => setIsSignUp(false)}
              className={`flex-1 py-2.5 px-4 rounded-lg font-semibold text-sm transition-all duration-200 ${!isSignUp ? 'bg-white text-teal-900 shadow-md' : 'text-white/70 hover:bg-white/5'
                }`}
            >
              Sign In
            </button>
            <button
              onClick={() => setIsSignUp(true)}
              className={`flex-1 py-2.5 px-4 rounded-lg font-semibold text-sm transition-all duration-200 ${isSignUp ? 'bg-white text-teal-900 shadow-md' : 'text-white/70 hover:bg-white/5'
                }`}
            >
              Sign Up
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {isSignUp && (
              <div>
                <label className="block text-sm font-semibold mb-1.5 text-white/90">
                  Full Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-white/20 text-sm font-medium outline-none transition-all bg-white/10 text-white placeholder:text-white/40 focus:bg-white/20"
                  placeholder="Your full name"
                  required={isSignUp}
                />
              </div>
            )}
            <div>
              <label className="block text-sm font-semibold mb-1.5 text-white/90">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-white/20 text-sm font-medium outline-none transition-all bg-white/10 text-white placeholder:text-white/40 focus:bg-white/20"
                placeholder="you@example.com"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1.5 text-white/90">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-white/20 text-sm font-medium outline-none transition-all bg-white/10 text-white placeholder:text-white/40 focus:bg-white/20"
                placeholder="••••••••"
                required
              />
            </div>

            {error && (
              <div
                className="p-3 rounded-xl border border-red-500/50 bg-red-500/10 text-red-200 text-sm font-medium"
              >
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 px-4 rounded-xl font-bold text-white text-sm transition-all duration-200 shadow-lg hover:shadow-xl active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed mt-2"
              style={{ background: 'linear-gradient(135deg, var(--stormyTeal), var(--pearlAqua))' }}
            >
              {loading ? 'Please wait…' : isSignUp ? 'Create Account' : 'Sign In'}
            </button>
          </form>
        </div>

        <p className="text-center text-xs mt-6 text-white/60">
          Your financial mindfulness journey starts here ✦
        </p>
      </div>
    </div>
  );
}