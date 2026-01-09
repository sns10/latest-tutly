
import { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  signUp: (email: string, password: string) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        // Handle token refresh errors by clearing the session
        if (event === 'TOKEN_REFRESHED' && !session) {
          console.log('Token refresh failed, clearing session');
          setSession(null);
          setUser(null);
          setLoading(false);
          return;
        }
        
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    // Check for existing session with error handling
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        console.error('Session error:', error.message);
        // If refresh token is invalid, clear the session gracefully
        if (error.message?.includes('Refresh Token') || error.code === 'refresh_token_not_found') {
          setSession(null);
          setUser(null);
          // Clear any stale tokens from storage
          supabase.auth.signOut().catch(() => {});
        }
      } else {
        setSession(session);
        setUser(session?.user ?? null);
      }
      setLoading(false);
    }).catch((error) => {
      console.error('Error getting session:', error);
      setSession(null);
      setUser(null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string) => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl
      }
    });
    return { error };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    return { error };
  };

  const signOut = async () => {
    // Clear local state first to ensure UI updates even if API fails
    setSession(null);
    setUser(null);
    // Then try to sign out from Supabase (ignore errors for stale sessions)
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.log('Sign out completed (session may have been expired)');
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      session,
      signUp,
      signIn,
      signOut,
      loading
    }}>
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
