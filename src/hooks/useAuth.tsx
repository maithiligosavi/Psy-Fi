import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import {
  User,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
} from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db, Profile } from '../lib/firebase';

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  role: 'user' | 'admin' | null;
  loading: boolean;
  signUp: (email: string, password: string, name: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [role, setRole] = useState<'user' | 'admin' | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = async (userId: string) => {
    try {
      const docRef = doc(db, 'profiles', userId);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        const data = snap.data();
        const loaded: Profile = {
          id: snap.id,
          name: data.name ?? '',
          email: data.email ?? '',
          role: data.role ?? 'user',
          created_at: data.created_at ?? new Date().toISOString(),
        };
        setProfile(loaded);
        setRole(loaded.role);
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        loadProfile(firebaseUser.uid);
      } else {
        setProfile(null);
        setRole(null);
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, name: string) => {
    const { user: newUser } = await createUserWithEmailAndPassword(auth, email, password);
    await setDoc(doc(db, 'profiles', newUser.uid), {
      name,
      email,
      role: 'user', // all new accounts default to regular user
      created_at: serverTimestamp(),
    });
    const newProfile: Profile = {
      id: newUser.uid,
      name,
      email,
      role: 'user',
      created_at: new Date().toISOString(),
    };
    setProfile(newProfile);
    setRole('user');
  };

  const signIn = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
    // Profile & role are loaded by the onAuthStateChanged listener above.
  };

  const signOut = async () => {
    await firebaseSignOut(auth);
  };

  return (
    <AuthContext.Provider value={{ user, profile, role, loading, signUp, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
