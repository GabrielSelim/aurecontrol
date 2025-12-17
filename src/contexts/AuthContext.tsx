import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

interface Profile {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  cpf: string | null;
  phone: string | null;
  avatar_url: string | null;
  company_id: string | null;
  is_active: boolean;
}

interface UserRole {
  role: "master_admin" | "admin" | "financeiro" | "gestor" | "colaborador";
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  roles: UserRole[];
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (data: SignUpData) => Promise<{ error: Error | null }>;
  signUpWithInvite: (data: InviteSignUpData) => Promise<{ error: Error | null }>;
  signUpAsMasterAdmin: (data: MasterAdminSignUpData) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: Error | null }>;
  updatePassword: (password: string) => Promise<{ error: Error | null }>;
  hasRole: (role: UserRole["role"]) => boolean;
  isAdmin: () => boolean;
}

interface SignUpData {
  email: string;
  password: string;
  fullName: string;
  cpf: string;
  phone: string;
  companyName: string;
  cnpj: string;
}

interface InviteSignUpData {
  email: string;
  password: string;
  fullName: string;
  cpf: string;
  phone: string;
  inviteToken: string;
}

interface MasterAdminSignUpData {
  email: string;
  password: string;
  fullName: string;
  cpf: string;
  phone: string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [roles, setRoles] = useState<UserRole[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);

        // Defer profile fetch to avoid deadlock
        if (session?.user) {
          setTimeout(() => {
            fetchUserData(session.user.id);
          }, 0);
        } else {
          setProfile(null);
          setRoles([]);
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        fetchUserData(session.user.id);
      } else {
        setIsLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchUserData = async (userId: string) => {
    try {
      // Fetch profile
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();

      if (profileError) throw profileError;
      setProfile(profileData);

      // Fetch roles
      const { data: rolesData, error: rolesError } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId);

      if (rolesError) throw rolesError;
      setRoles(rolesData as UserRole[]);
    } catch (error) {
      console.error("Error fetching user data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error: error as Error | null };
  };

  const signUp = async (data: SignUpData) => {
    try {
      const redirectUrl = `${window.location.origin}/`;
      
      // Create auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          emailRedirectTo: redirectUrl,
        },
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error("Erro ao criar usuário");

      // Call the signup function to create company, profile, and role
      const { error: signupError } = await supabase.rpc("handle_new_user_signup", {
        _user_id: authData.user.id,
        _email: data.email,
        _full_name: data.fullName,
        _cpf: data.cpf,
        _phone: data.phone,
        _company_name: data.companyName,
        _cnpj: data.cnpj,
      });

      if (signupError) throw signupError;

      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signUpWithInvite = async (data: InviteSignUpData) => {
    try {
      const redirectUrl = `${window.location.origin}/`;
      
      // Create auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          emailRedirectTo: redirectUrl,
        },
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error("Erro ao criar usuário");

      // Call the invited user signup function
      const { error: signupError } = await supabase.rpc("handle_invited_user_signup", {
        _user_id: authData.user.id,
        _email: data.email,
        _full_name: data.fullName,
        _cpf: data.cpf,
        _phone: data.phone,
        _invite_token: data.inviteToken,
      });

      if (signupError) throw signupError;

      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signUpAsMasterAdmin = async (data: MasterAdminSignUpData) => {
    try {
      const redirectUrl = `${window.location.origin}/`;
      
      // Create auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          emailRedirectTo: redirectUrl,
        },
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error("Erro ao criar usuário");

      // Call the master admin signup function
      const { error: signupError } = await supabase.rpc("handle_master_admin_signup", {
        _user_id: authData.user.id,
        _email: data.email,
        _full_name: data.fullName,
        _cpf: data.cpf,
        _phone: data.phone,
      });

      if (signupError) throw signupError;

      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
    setRoles([]);
  };

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/atualizar-senha`,
    });
    return { error: error as Error | null };
  };

  const updatePassword = async (password: string) => {
    const { error } = await supabase.auth.updateUser({ password });
    return { error: error as Error | null };
  };

  const hasRole = (role: UserRole["role"]) => {
    return roles.some((r) => r.role === role);
  };

  const isAdmin = () => {
    return hasRole("admin") || hasRole("master_admin");
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        roles,
        isLoading,
        signIn,
        signUp,
        signUpWithInvite,
        signUpAsMasterAdmin,
        signOut,
        resetPassword,
        updatePassword,
        hasRole,
        isAdmin,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
