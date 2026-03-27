import { useEffect, useState } from 'react';
import { Shield, AlertTriangle, CheckCircle } from 'lucide-react';
import { formatINR } from '../lib/firebase';

interface SafetyMeterProps {
  totalSpent: number;
  fixedExpenses: number;
  totalBalance: number;
}

export default function SafetyMeter({ totalSpent, fixedExpenses, totalBalance }: SafetyMeterProps) {
  const [animatedValue, setAnimatedValue] = useState(0);

  const safeBalance  = totalBalance - fixedExpenses - totalSpent;
  const percentage   = Math.max(0, Math.min(100, (safeBalance / Math.max(totalBalance, 1)) * 100));

  useEffect(() => {
    const t = setTimeout(() => setAnimatedValue(percentage), 100);
    return () => clearTimeout(t);
  }, [percentage]);

  const getColor = () => {
    if (percentage >= 50) return { stroke: '#006d77', text: '#006d77', bg: 'var(--stormyTeal)' };
    if (percentage >= 25) return { stroke: '#e29578', text: 'var(--tangerineDream)', bg: 'var(--tangerineDream)' };
    return { stroke: '#ef4444', text: '#ef4444', bg: '#ef4444' };
  };

  const getStatus = () => {
    if (percentage >= 50) return { icon: CheckCircle, text: 'Safe to Spend' };
    if (percentage >= 25) return { icon: AlertTriangle, text: 'Be Cautious' };
    return { icon: Shield, text: 'Critical Zone' };
  };

  const color    = getColor();
  const status   = getStatus();
  const StatusIcon = status.icon;

  const radius            = 80;
  const circumference     = 2 * Math.PI * radius;
  const strokeDashoffset  = circumference - (animatedValue / 100) * circumference;

  return (
    <div
      className="rounded-2xl p-6 shadow-lg border"
      style={{ background: 'white', borderColor: 'rgba(131,197,190,0.35)' }}
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div
          className="w-11 h-11 rounded-xl flex items-center justify-center shadow-md"
          style={{ background: color.bg }}
        >
          <Shield className="w-6 h-6 text-white" />
        </div>
        <div>
          <h2 className="text-xl font-extrabold" style={{ color: 'var(--stormyTeal)' }}>
            Safety Meter
          </h2>
          <p className="text-sm" style={{ color: 'var(--pearlAqua)' }}>Your spending health</p>
        </div>
      </div>

      <div className="flex flex-col items-center">
        {/* SVG ring */}
        <div className="relative w-56 h-56 mb-6">
          <svg className="w-full h-full transform -rotate-90" viewBox="0 0 200 200">
            {/* Track */}
            <circle cx="100" cy="100" r={radius} stroke="rgba(131,197,190,0.2)" strokeWidth="16" fill="none" />
            {/* Progress */}
            <circle
              cx="100" cy="100" r={radius}
              stroke={color.stroke}
              strokeWidth="16"
              fill="none"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              className="transition-all duration-1000 ease-out"
            />
          </svg>
          {/* Center content */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <StatusIcon className="w-10 h-10 mb-1" style={{ color: color.text }} />
            <div className="text-4xl font-extrabold" style={{ color: 'var(--stormyTeal)' }}>
              {Math.round(percentage)}%
            </div>
            <div className="text-sm font-bold mt-0.5" style={{ color: color.text }}>
              {status.text}
            </div>
          </div>
        </div>

        {/* Breakdown */}
        <div className="w-full space-y-2.5">
          {[
            { label: 'Total Balance',   value: formatINR(totalBalance),   sign: '',  valueColor: 'var(--stormyTeal)' },
            { label: 'Fixed Expenses',  value: formatINR(fixedExpenses),  sign: '−', valueColor: 'var(--tangerineDream)' },
            { label: 'Total Spent',     value: formatINR(totalSpent),     sign: '−', valueColor: '#d97706' },
          ].map(({ label, value, sign, valueColor }) => (
            <div
              key={label}
              className="flex justify-between items-center p-3 rounded-xl border"
              style={{ background: 'rgba(237,246,249,0.6)', borderColor: 'rgba(131,197,190,0.3)' }}
            >
              <span className="text-sm font-medium" style={{ color: 'var(--stormyTeal)' }}>{label}</span>
              <span className="font-bold text-sm" style={{ color: valueColor }}>
                {sign} {value}
              </span>
            </div>
          ))}

          {/* Safe Balance highlight */}
          <div
            className="flex justify-between items-center p-4 rounded-xl border-2 shadow-sm"
            style={{
              background: 'linear-gradient(135deg, rgba(0,109,119,0.07), rgba(131,197,190,0.12))',
              borderColor: 'var(--stormyTeal)',
            }}
          >
            <span className="font-bold" style={{ color: 'var(--stormyTeal)' }}>Safe Balance</span>
            <span className="text-xl font-extrabold" style={{ color: color.text }}>
              {formatINR(safeBalance)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
