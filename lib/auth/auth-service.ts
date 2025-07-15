// Re-export from main auth module
export * from '@/lib/auth';

// Additional auth service functions
import { createClient } from '@/lib/supabase/client';
import { User } from '@supabase/supabase-js';

export class AuthService {
  static async getCurrentUser(): Promise<User | null> {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    return user;
  }

  static async signIn(email: string, password: string) {
    const supabase = createClient();
    return supabase.auth.signInWithPassword({ email, password });
  }

  static async signUp(email: string, password: string) {
    const supabase = createClient();
    return supabase.auth.signUp({ email, password });
  }

  static async signOut() {
    const supabase = createClient();
    return supabase.auth.signOut();
  }

  static async resetPassword(email: string) {
    const supabase = createClient();
    return supabase.auth.resetPasswordForEmail(email);
  }

  static async updateProfile(updates: Partial<User>) {
    const supabase = createClient();
    return supabase.auth.updateUser(updates);
  }
}