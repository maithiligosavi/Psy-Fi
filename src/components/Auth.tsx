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
      className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden"
      style={{ backgroundColor: 'var(--aliceBlue)' }}
    >
      {/* Abstract background shapes */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute -top-32 -left-32 w-96 h-96 rounded-full opacity-20 blur-3xl"
          style={{ background: 'var(--stormyTeal)' }}
        />
        <div
          className="absolute top-1/3 -right-24 w-80 h-80 rounded-full opacity-25 blur-3xl"
          style={{ background: 'var(--pearlAqua)' }}
        />
        <div
          className="absolute -bottom-20 left-1/3 w-72 h-72 rounded-full opacity-20 blur-3xl"
          style={{ background: 'var(--almondSilk)' }}
        />
        <div
          className="absolute top-10 right-1/3 w-48 h-48 rounded-full opacity-15 blur-2xl"
          style={{ background: 'var(--tangerineDream)' }}
        />
        {/* Decorative rings */}
        <div
          className="absolute top-16 left-16 w-64 h-64 rounded-full border-2 opacity-10"
          style={{ borderColor: 'var(--stormyTeal)' }}
        />
        <div
          className="absolute bottom-24 right-16 w-48 h-48 rounded-full border opacity-10"
          style={{ borderColor: 'var(--pearlAqua)' }}
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
            className="text-5xl font-extrabold mb-2 tracking-tight"
            style={{ color: 'var(--stormyTeal)' }}
          >
            Psy-Fi
          </h1>
          <p className="text-base font-medium" style={{ color: 'var(--pearlAqua)' }}>
            Mindful Finance · Psychological Spending Expense Tracker
          </p>

          {/* Feature pills */}
          <div className="flex justify-center gap-3 mt-4">
            {[
              { icon: Leaf, label: 'Mindful' },
              { icon: TrendingUp, label: 'Insightful' },
              { icon: Brain, label: 'Behavioral' },
            ].map(({ icon: Icon, label }) => (
              <span
                key={label}
                className="flex items-center gap-1 text-xs font-semibold px-3 py-1 rounded-full"
                style={{ background: 'var(--almondSilk)', color: 'var(--stormyTeal)' }}
              >
                <Icon className="w-3 h-3" />
                {label}
              </span>
            ))}
          </div>
        </div>

        {/* Card */}
        <div
          className="glass-dark rounded-3xl shadow-2xl p-8"
          style={{ background: 'rgba(0,109,119,0.08)', border: '1px solid rgba(131,197,190,0.3)' }}
        >
          {/* Tab switcher */}
          <div
            className="flex gap-2 mb-7 p-1 rounded-xl"
            style={{ background: 'rgba(131,197,190,0.15)' }}
          >
            <button
              onClick={() => setIsSignUp(false)}
              className={`flex-1 py-2.5 px-4 rounded-lg font-semibold text-sm transition-all duration-200 ${
                !isSignUp ? 'shadow-md text-white' : 'text-pearlAqua hover:bg-white/10'
              }`}
              style={!isSignUp ? { background: 'var(--stormyTeal)', color: '#fff' } : { color: 'var(--stormyTeal)' }}
            >
              Sign In
            </button>
            <button
              onClick={() => setIsSignUp(true)}
              className={`flex-1 py-2.5 px-4 rounded-lg font-semibold text-sm transition-all duration-200 ${
                isSignUp ? 'shadow-md text-white' : ''
              }`}
              style={isSignUp ? { background: 'var(--stormyTeal)', color: '#fff' } : { color: 'var(--stormyTeal)' }}
            >
              Sign Up
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {isSignUp && (
              <div>
                <label className="block text-sm font-semibold mb-1.5" style={{ color: 'var(--stormyTeal)' }}>
                  Full Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border-2 text-sm font-medium outline-none transition-all focus:ring-2"
                  style={{
                    background: 'rgba(237,246,249,0.7)',
                    borderColor: 'var(--pearlAqua)',
                    color: 'var(--stormyTeal)',
                  }}
                  placeholder="Your full name"
                  required={isSignUp}
                />
              </div>
            )}
            <div>
              <label className="block text-sm font-semibold mb-1.5" style={{ color: 'var(--stormyTeal)' }}>
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border-2 text-sm font-medium outline-none transition-all"
                style={{
                  background: 'rgba(237,246,249,0.7)',
                  borderColor: 'var(--pearlAqua)',
                  color: 'var(--stormyTeal)',
                }}
                placeholder="you@example.com"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1.5" style={{ color: 'var(--stormyTeal)' }}>
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border-2 text-sm font-medium outline-none transition-all"
                style={{
                  background: 'rgba(237,246,249,0.7)',
                  borderColor: 'var(--pearlAqua)',
                  color: 'var(--stormyTeal)',
                }}
                placeholder="••••••••"
                required
              />
            </div>

            {error && (
              <div
                className="p-3 rounded-xl border text-sm font-medium"
                style={{ background: '#fff0ed', borderColor: 'var(--tangerineDream)', color: '#c0392b' }}
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

        <p className="text-center text-xs mt-6" style={{ color: 'var(--pearlAqua)' }}>
          Your financial mindfulness journey starts here ✦
        </p>
      </div>
    </div>
  );
}
