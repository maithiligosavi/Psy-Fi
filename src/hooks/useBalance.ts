import { useState, useEffect, useCallback, useRef } from 'react';
import { doc, onSnapshot, setDoc, query, collection, where } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from './useAuth';

export function useBalance() {
  const { user } = useAuth();
  const [initialBudget, setInitialBudget] = useState(50000);
  const [totalSpent, setTotalSpent] = useState(0);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Real-time listener for Initial Budget (user_settings)
  useEffect(() => {
    if (!user) return;
    const unsub = onSnapshot(doc(db, 'user_settings', user.uid), (docSnap) => {
      if (docSnap.exists()) {
        const saved = docSnap.data()?.total_balance;
        if (typeof saved === 'number') {
          setInitialBudget((prev) => prev !== saved ? saved : prev);
        }
      }
    });
    return () => unsub();
  }, [user]);

  // Real-time listener for Expenses (audit_entries)
  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'audit_entries'),
      where('user_id', '==', user.uid)
    );
    const unsub = onSnapshot(q, (snap) => {
      let sum = 0;
      snap.docs.forEach((d) => {
        const data = d.data();
        if (data.amount) {
          sum += parseFloat(data.amount.toString());
        }
      });
      setTotalSpent(sum);
    });
    return () => unsub();
  }, [user]);

  // Update initial budget with debounce
  const updateInitialBudget = useCallback((value: number) => {
    if (!user) return;
    setInitialBudget(value); // Optimistic UI update
    
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        await setDoc(doc(db, 'user_settings', user.uid), { total_balance: value }, { merge: true });
      } catch (err) {
        console.error('Failed to persist budget:', err);
      }
    }, 600);
  }, [user]);

  return {
    initialBudget,
    totalSpent,
    currentBalance: initialBudget - totalSpent,
    updateInitialBudget
  };
}
