import { Brain, GitBranch, ShieldCheck } from 'lucide-react';

const changes = [
  {
    version: 'v0.5.0',
    date: 'April 2026',
    tag: 'New',
    tagColor: '#10b981',
    items: [
      'Added Psychological Insights Engine — every expense is automatically analysed for emotional triggers and risk level.',
      'Admin Dashboard with Global Metrics, Behavioral Analytics, and User Management.',
      'Role-based access control via Firestore security rules.',
    ],
  },
  {
    version: 'v0.4.0',
    date: 'March 2026',
    tag: 'Improved',
    tagColor: '#a855f7',
    items: [
      'Renamed Auditor → Expense Tracker throughout the application.',
      'Real-time Firestore listeners using onSnapshot — no more manual refresh.',
      'Balance is now persisted to Firestore and restored on next login.',
      'Unpaid fixed-spend detection now works fully in-memory.',
    ],
  },
  {
    version: 'v0.3.0',
    date: 'March 2026',
    tag: 'Feature',
    tagColor: '#f59e0b',
    items: [
      'Behavioral History component with mood timeline.',
      'Safety Meter showing discretionary vs. fixed spend ratio.',
      'Fixed Expenses manager with weekly/monthly rules.',
    ],
  },
  {
    version: 'v0.2.0',
    date: 'February 2026',
    tag: 'Feature',
    tagColor: '#60a5fa',
    items: [
      'Authentication with Firebase Auth (Email/Password).',
      'Expense Tracker with custom categories and payment sources.',
      'Mood-tagged transactions stored in Firestore.',
    ],
  },
  {
    version: 'v0.1.0',
    date: 'February 2026',
    tag: 'Launch',
    tagColor: 'var(--stormyTeal)',
    items: [
      'Initial project setup with Vite + React + TypeScript.',
      'Tailwind CSS design system with Psy-Fi colour palette.',
      'Firebase project initialisation.',
    ],
  },
];

/**
 * ChangelogPage — Admin-only version history / release notes.
 * Accessible at /changelog, guarded by AdminGuardRoute in App.tsx.
 */
export default function ChangelogPage() {
  return (
    <div className="min-h-screen relative" style={{ backgroundColor: 'var(--aliceBlue)' }}>

      {/* Background blobs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div
          className="absolute top-0 right-0 w-[600px] h-[600px] rounded-full opacity-10 blur-3xl"
          style={{ background: 'var(--stormyTeal)', transform: 'translate(30%, -30%)' }}
        />
        <div
          className="absolute bottom-0 left-0 w-[500px] h-[500px] rounded-full opacity-10 blur-3xl"
          style={{ background: 'var(--pearlAqua)', transform: 'translate(-30%, 30%)' }}
        />
      </div>

      {/* Navbar */}
      <nav
        className="relative z-10 shadow-sm border-b"
        style={{
          background: 'rgba(0,109,119,0.92)',
          backdropFilter: 'blur(16px)',
          borderColor: 'rgba(131,197,190,0.3)',
        }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center shadow-md"
                style={{ background: 'rgba(131,197,190,0.25)', border: '1px solid rgba(131,197,190,0.4)' }}
              >
                <Brain className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-extrabold text-white tracking-tight">Psy-Fi</h1>
                <p className="text-xs font-medium" style={{ color: 'var(--pearlAqua)' }}>
                  Admin Console
                </p>
              </div>
            </div>

            {/* Admin badge */}
            <div
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl"
              style={{ background: 'rgba(226,149,120,0.2)', border: '1px solid rgba(226,149,120,0.4)' }}
            >
              <ShieldCheck className="w-4 h-4" style={{ color: 'var(--almondSilk)' }} />
              <span className="text-xs font-bold" style={{ color: 'var(--almondSilk)' }}>
                Admin Only
              </span>
            </div>
          </div>
        </div>
      </nav>

      <main className="relative z-10 max-w-3xl mx-auto px-4 sm:px-6 py-10">

        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center shadow-lg"
            style={{ background: 'linear-gradient(135deg, var(--stormyTeal), var(--pearlAqua))' }}
          >
            <GitBranch className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold" style={{ color: 'var(--stormyTeal)' }}>
              Changelog
            </h1>
            <p className="text-sm" style={{ color: 'var(--pearlAqua)' }}>
              Internal release notes — visible to admins only
            </p>
          </div>
        </div>

        {/* Timeline */}
        <div className="relative">
          <div
            className="absolute left-5 top-0 bottom-0 w-0.5"
            style={{ background: 'rgba(131,197,190,0.3)' }}
          />

          <div className="space-y-6">
            {changes.map((release) => (
              <div key={release.version} className="relative pl-14">
                {/* Dot */}
                <div
                  className="absolute left-3.5 top-5 w-3 h-3 rounded-full border-2 border-white shadow"
                  style={{ background: release.tagColor }}
                />

                <div
                  className="rounded-2xl p-5 shadow-md border"
                  style={{ background: 'white', borderColor: 'rgba(131,197,190,0.35)' }}
                >
                  <div className="flex items-center gap-3 mb-3 flex-wrap">
                    <span className="text-base font-extrabold" style={{ color: 'var(--stormyTeal)' }}>
                      {release.version}
                    </span>
                    <span
                      className="text-xs font-bold px-2.5 py-0.5 rounded-full"
                      style={{
                        background: `${release.tagColor}18`,
                        color: release.tagColor,
                        border: `1px solid ${release.tagColor}40`,
                      }}
                    >
                      {release.tag}
                    </span>
                    <span className="text-xs ml-auto" style={{ color: 'var(--pearlAqua)' }}>
                      {release.date}
                    </span>
                  </div>
                  <ul className="space-y-1.5">
                    {release.items.map((item, i) => (
                      <li
                        key={i}
                        className="flex items-start gap-2 text-sm"
                        style={{ color: 'var(--stormyTeal)' }}
                      >
                        <Brain
                          className="w-3.5 h-3.5 flex-shrink-0 mt-0.5"
                          style={{ color: 'var(--pearlAqua)' }}
                        />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
