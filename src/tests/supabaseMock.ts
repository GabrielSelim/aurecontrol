import { vi } from "vitest";

/**
 * Creates a chainable Supabase query mock.
 * Each method in the chain returns `this` for fluent API simulation.
 * Terminal methods (single, maybeSingle, then) resolve the configured result.
 */
export function createQueryMock(result: { data?: unknown; error?: unknown; count?: number | null } = {}) {
  const resolvedResult = { data: null, error: null, count: null, ...result };

  const mock: Record<string, ReturnType<typeof vi.fn>> = {};

  const chainMethods = [
    "select", "insert", "update", "delete", "upsert",
    "eq", "neq", "in", "is", "gte", "lte", "lt", "gt",
    "order", "limit", "range", "filter",
  ];

  for (const method of chainMethods) {
    mock[method] = vi.fn().mockReturnValue(mock);
  }

  // Terminal methods that resolve the chain
  mock.single = vi.fn().mockResolvedValue(resolvedResult);
  mock.maybeSingle = vi.fn().mockResolvedValue(resolvedResult);

  // When the chain is awaited directly (no terminal), resolve via the last chain method
  // We achieve this by making the chain itself thenable
  mock.then = vi.fn().mockImplementation((resolve: (v: unknown) => void) =>
    resolve(resolvedResult)
  );

  return mock;
}

/**
 * Creates a mock supabase client with `.from()`, `.storage`, `.functions`, `.rpc`.
 */
export function createSupabaseMock() {
  const queryMock = createQueryMock();

  return {
    supabase: {
      from: vi.fn().mockReturnValue(queryMock),
      storage: {
        from: vi.fn().mockReturnValue({
          upload: vi.fn().mockResolvedValue({ error: null }),
          getPublicUrl: vi.fn().mockReturnValue({ data: { publicUrl: "https://test.com/file.png" } }),
        }),
      },
      functions: {
        invoke: vi.fn().mockResolvedValue({ data: null, error: null }),
      },
      rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
    },
    queryMock,
  };
}
