import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Profile {
  id: string;
  name: string;
  email: string;
  created_at: string;
}

export interface AuditEntry {
  id: string;
  user_id: string;
  product_service: string;
  amount: number;
  spending_category: string;
  spending_type?: 'Need' | 'Want';
  reason: string;
  mood: string;
  source_of_payment: string;
  purchase_date: string;
  notification_message?: string;
  notification_type?: string;
  created_at: string;
}

export interface FixedRule {
  id: string;
  user_id: string;
  expense_name: string;
  amount: number;
  frequency: 'Weekly' | 'Monthly';
  due_day: number;
  category: string;
  is_paid?: boolean;
  created_at: string;
}

// ─── Indian Currency Formatter ────────────────────────────────────────────────

export const formatINR = (amount: number): string =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(amount);
