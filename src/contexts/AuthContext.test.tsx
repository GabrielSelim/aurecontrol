import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import React from "react";

/* ------------------------------------------------------------------ */
/*  Supabase mock (vi.hoisted)                                        */
/* ------------------------------------------------------------------ */
const mockSupabase = vi.hoisted(() => {
  const fromMock = vi.fn();
  const singleMock = vi.fn();
  const rpcMock = vi.fn();
  const selectMock = vi.fn();
  const eqMock = vi.fn();
  const maybeSingleMock = vi.fn();

  fromMock.mockReturnValue({ select: selectMock });
  selectMock.mockReturnValue({ eq: eqMock });
  eqMock.mockReturnValue({ maybeSingle: maybeSingleMock, eq: eqMock });

  let authStateCallback: ((event: string, session: unknown) => void) | null = null;
  const unsubscribeMock = vi.fn();

  return {
    fromMock,
    selectMock,
    eqMock,
    maybeSingleMock,
    singleMock,
    rpcMock,
    unsubscribeMock,
    getAuthStateCallback: () => authStateCallback,
    auth: {
      getSession: vi.fn().mockResolvedValue({
        data: { session: null },
      }),
      onAuthStateChange: vi.fn((cb: (event: string, session: unknown) => void) => {
        authStateCallback = cb;
        return { data: { subscription: { unsubscribe: unsubscribeMock } } };
      }),
      signInWithPassword: vi.fn(),
      signUp: vi.fn(),
      signOut: vi.fn(),
      resetPasswordForEmail: vi.fn(),
      updateUser: vi.fn(),
    },
  };
});

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: mockSupabase.fromMock,
    rpc: mockSupabase.rpcMock,
    auth: mockSupabase.auth,
  },
}));

vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));

import { AuthProvider, useAuth } from "@/contexts/AuthContext";

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

function createWrapper() {
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(AuthProvider, null, children);
}

/** Set up profile + roles mock responses for fetchUserData */
function mockFetchUserData(
  profile: Record<string, unknown> | null,
  roles: { role: string }[] = []
) {
  mockSupabase.fromMock.mockImplementation((table: string) => {
    if (table === "profiles") {
      // supabase.from("profiles").select("*").eq("user_id", id).maybeSingle()
      return {
        select: () => ({
          eq: () => ({
            maybeSingle: () =>
              Promise.resolve({ data: profile, error: null }),
          }),
        }),
      };
    }
    if (table === "user_roles") {
      // await supabase.from("user_roles").select("role").eq("user_id", id)
      // eq() must be directly thenable (no .maybeSingle / .single)
      return {
        select: () => ({
          eq: () => Promise.resolve({ data: roles, error: null }),
        }),
      };
    }
    return { select: vi.fn() };
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  // Reset to no session by default
  mockSupabase.auth.getSession.mockResolvedValue({
    data: { session: null },
  });
});

/* ------------------------------------------------------------------ */
/*  useAuth outside provider                                          */
/* ------------------------------------------------------------------ */

describe("useAuth", () => {
  it("throws when used outside AuthProvider", () => {
    expect(() => {
      renderHook(() => useAuth());
    }).toThrow("useAuth must be used within an AuthProvider");
  });
});

/* ------------------------------------------------------------------ */
/*  Initial state                                                     */
/* ------------------------------------------------------------------ */

describe("AuthProvider", () => {
  it("starts with isLoading true and null user", async () => {
    const { result } = renderHook(() => useAuth(), {
      wrapper: createWrapper(),
    });

    // Initially loading
    expect(result.current.user).toBeNull();
    expect(result.current.session).toBeNull();
    expect(result.current.profile).toBeNull();
    expect(result.current.roles).toEqual([]);

    await waitFor(() => expect(result.current.isLoading).toBe(false));
  });

  it("loads existing session and profile on mount", async () => {
    const session = { user: { id: "u-1" } };
    mockSupabase.auth.getSession.mockResolvedValue({
      data: { session },
    });

    mockFetchUserData(
      { id: "p-1", user_id: "u-1", full_name: "Alice", email: "a@b.com" },
      [{ role: "admin" }]
    );

    const { result } = renderHook(() => useAuth(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.user).toEqual({ id: "u-1" });
    expect(result.current.profile?.full_name).toBe("Alice");
    expect(result.current.roles).toEqual([{ role: "admin" }]);
  });
});

/* ------------------------------------------------------------------ */
/*  hasRole / isAdmin                                                 */
/* ------------------------------------------------------------------ */

describe("hasRole / isAdmin", () => {
  it("hasRole returns true when role exists", async () => {
    const session = { user: { id: "u-1" } };
    mockSupabase.auth.getSession.mockResolvedValue({
      data: { session },
    });
    mockFetchUserData(null, [{ role: "admin" }, { role: "financeiro" }]);

    const { result } = renderHook(() => useAuth(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.hasRole("admin")).toBe(true);
    expect(result.current.hasRole("financeiro")).toBe(true);
    expect(result.current.hasRole("colaborador")).toBe(false);
  });

  it("isAdmin returns true for admin or master_admin", async () => {
    const session = { user: { id: "u-1" } };
    mockSupabase.auth.getSession.mockResolvedValue({
      data: { session },
    });
    mockFetchUserData(null, [{ role: "master_admin" }]);

    const { result } = renderHook(() => useAuth(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.isAdmin()).toBe(true);
  });

  it("isAdmin returns false for non-admin roles", async () => {
    const session = { user: { id: "u-1" } };
    mockSupabase.auth.getSession.mockResolvedValue({
      data: { session },
    });
    mockFetchUserData(null, [{ role: "colaborador" }]);

    const { result } = renderHook(() => useAuth(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.isAdmin()).toBe(false);
  });
});

/* ------------------------------------------------------------------ */
/*  signIn                                                            */
/* ------------------------------------------------------------------ */

describe("signIn", () => {
  it("calls supabase signInWithPassword", async () => {
    mockSupabase.auth.signInWithPassword.mockResolvedValue({ error: null });

    const { result } = renderHook(() => useAuth(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    let response: { error: Error | null } | undefined;
    await act(async () => {
      response = await result.current.signIn("a@b.com", "pass123");
    });

    expect(mockSupabase.auth.signInWithPassword).toHaveBeenCalledWith({
      email: "a@b.com",
      password: "pass123",
    });
    expect(response!.error).toBeNull();
  });

  it("returns error on failure", async () => {
    const err = new Error("Invalid credentials");
    mockSupabase.auth.signInWithPassword.mockResolvedValue({ error: err });

    const { result } = renderHook(() => useAuth(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    let response: { error: Error | null } | undefined;
    await act(async () => {
      response = await result.current.signIn("a@b.com", "wrong");
    });

    expect(response!.error).toBe(err);
  });
});

/* ------------------------------------------------------------------ */
/*  signOut                                                           */
/* ------------------------------------------------------------------ */

describe("signOut", () => {
  it("calls supabase signOut and clears state", async () => {
    const session = { user: { id: "u-1" } };
    mockSupabase.auth.getSession.mockResolvedValue({
      data: { session },
    });
    mockFetchUserData(
      { id: "p-1", user_id: "u-1", full_name: "Alice" },
      [{ role: "admin" }]
    );
    mockSupabase.auth.signOut.mockResolvedValue({ error: null });

    const { result } = renderHook(() => useAuth(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.signOut();
    });

    expect(mockSupabase.auth.signOut).toHaveBeenCalled();
    expect(result.current.profile).toBeNull();
    expect(result.current.roles).toEqual([]);
  });
});

/* ------------------------------------------------------------------ */
/*  resetPassword                                                     */
/* ------------------------------------------------------------------ */

describe("resetPassword", () => {
  it("calls resetPasswordForEmail with correct redirect", async () => {
    mockSupabase.auth.resetPasswordForEmail.mockResolvedValue({ error: null });

    const { result } = renderHook(() => useAuth(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    let response: { error: Error | null } | undefined;
    await act(async () => {
      response = await result.current.resetPassword("a@b.com");
    });

    expect(mockSupabase.auth.resetPasswordForEmail).toHaveBeenCalledWith(
      "a@b.com",
      expect.objectContaining({
        redirectTo: expect.stringContaining("/atualizar-senha"),
      })
    );
    expect(response!.error).toBeNull();
  });
});

/* ------------------------------------------------------------------ */
/*  updatePassword                                                    */
/* ------------------------------------------------------------------ */

describe("updatePassword", () => {
  it("calls supabase updateUser", async () => {
    mockSupabase.auth.updateUser.mockResolvedValue({ error: null });

    const { result } = renderHook(() => useAuth(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    let response: { error: Error | null } | undefined;
    await act(async () => {
      response = await result.current.updatePassword("newpass");
    });

    expect(mockSupabase.auth.updateUser).toHaveBeenCalledWith({
      password: "newpass",
    });
    expect(response!.error).toBeNull();
  });
});

/* ------------------------------------------------------------------ */
/*  signUp                                                            */
/* ------------------------------------------------------------------ */

describe("signUp", () => {
  it("creates auth user and calls handle_new_user_signup RPC", async () => {
    mockSupabase.auth.signUp.mockResolvedValue({
      data: { user: { id: "u-new" } },
      error: null,
    });
    mockSupabase.rpcMock.mockResolvedValue({ error: null });

    const { result } = renderHook(() => useAuth(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    let response: { error: Error | null } | undefined;
    await act(async () => {
      response = await result.current.signUp({
        email: "a@b.com",
        password: "pass123",
        fullName: "Alice",
        cpf: "12345678901",
        phone: "11999999999",
        companyName: "Corp",
        cnpj: "12345678000100",
      });
    });

    expect(mockSupabase.auth.signUp).toHaveBeenCalled();
    expect(mockSupabase.rpcMock).toHaveBeenCalledWith(
      "handle_new_user_signup",
      expect.objectContaining({
        _user_id: "u-new",
        _email: "a@b.com",
        _full_name: "Alice",
        _company_name: "Corp",
        _cnpj: "12345678000100",
      })
    );
    expect(response!.error).toBeNull();
  });

  it("returns error when auth signUp fails", async () => {
    const err = new Error("Email taken");
    mockSupabase.auth.signUp.mockResolvedValue({
      data: { user: null },
      error: err,
    });

    const { result } = renderHook(() => useAuth(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    let response: { error: Error | null } | undefined;
    await act(async () => {
      response = await result.current.signUp({
        email: "a@b.com",
        password: "pass",
        fullName: "Bob",
        cpf: "000",
        phone: "000",
        companyName: "X",
        cnpj: "000",
      });
    });

    expect(response!.error).toBe(err);
    expect(mockSupabase.rpcMock).not.toHaveBeenCalled();
  });
});

/* ------------------------------------------------------------------ */
/*  signUpWithInvite                                                  */
/* ------------------------------------------------------------------ */

describe("signUpWithInvite", () => {
  it("creates auth user and calls handle_invited_user_signup RPC", async () => {
    mockSupabase.auth.signUp.mockResolvedValue({
      data: { user: { id: "u-inv" } },
      error: null,
    });
    mockSupabase.rpcMock.mockResolvedValue({ error: null });

    const { result } = renderHook(() => useAuth(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    let response: { error: Error | null } | undefined;
    await act(async () => {
      response = await result.current.signUpWithInvite({
        email: "inv@b.com",
        password: "pass123",
        fullName: "Invited",
        cpf: "111",
        phone: "222",
        inviteToken: "tok-abc",
      });
    });

    expect(mockSupabase.rpcMock).toHaveBeenCalledWith(
      "handle_invited_user_signup",
      expect.objectContaining({
        _user_id: "u-inv",
        _invite_token: "tok-abc",
      })
    );
    expect(response!.error).toBeNull();
  });
});

/* ------------------------------------------------------------------ */
/*  signUpAsMasterAdmin                                               */
/* ------------------------------------------------------------------ */

describe("signUpAsMasterAdmin", () => {
  it("creates auth user and calls handle_master_admin_signup RPC", async () => {
    mockSupabase.auth.signUp.mockResolvedValue({
      data: { user: { id: "u-ma" } },
      error: null,
    });
    mockSupabase.rpcMock.mockResolvedValue({ error: null });

    const { result } = renderHook(() => useAuth(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    let response: { error: Error | null } | undefined;
    await act(async () => {
      response = await result.current.signUpAsMasterAdmin({
        email: "master@b.com",
        password: "pass123",
        fullName: "Master",
        cpf: "999",
        phone: "888",
      });
    });

    expect(mockSupabase.rpcMock).toHaveBeenCalledWith(
      "handle_master_admin_signup",
      expect.objectContaining({
        _user_id: "u-ma",
        _full_name: "Master",
      })
    );
    expect(response!.error).toBeNull();
  });
});
