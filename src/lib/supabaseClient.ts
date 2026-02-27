import {
  createClient,
  type SupabaseClient,
  type AuthChangeEvent,
  type Session,
} from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/**
 * Serializing lock for auth storage. Supabase's default lock uses the browser's
 * Lock API and can trigger "Lock broken by another request with the 'steal' option"
 * when multiple tabs or concurrent getSession/onAuthStateChange run. This lock
 * runs one operation at a time with no steal, avoiding that AbortError.
 *
 * The signature matches Supabase's experimental `auth.lock` type, which is a
 * generic function `<R>(name, acquireTimeout, fn) => Promise<R>`.
 */
function createSerializingLock(): <R>(
  name: string,
  acquireTimeout: number,
  fn: (lock: { name: string } | null) => Promise<R>
) => Promise<R> {
  let tail: Promise<void> = Promise.resolve();

  return async function serializingLock<R>(
    _name: string,
    _acquireTimeout: number,
    fn: (lock: { name: string } | null) => Promise<R>
  ): Promise<R> {
    let resolve!: () => void;
    const prev = tail;

    tail = new Promise<void>((r) => {
      resolve = r;
    });

    try {
      // Wait for any previous call in the chain to finish
      await prev;
      // Run the provided function and return its result
      return await fn({ name: _name });
    } finally {
      // Allow the next queued call to proceed
      resolve();
    }
  };
}

let client: SupabaseClient;

if (!supabaseUrl || !supabaseAnonKey) {
  // During local development or in environments without Supabase configured,
  // we avoid creating a real client to keep builds working. Any runtime use
  // without configuring env vars will throw a clear error.
  // eslint-disable-next-line no-console
  console.warn(
    "[Gauge] Supabase env vars missing. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY."
  );
  client = {
    auth: {
      getSession: async (): Promise<{ data: { session: Session | null } }> => {
        throw new Error("Supabase is not configured.");
      },
      onAuthStateChange: (
        _callback: (event: AuthChangeEvent, session: Session | null) => void
      ) => ({
        data: {
          subscription: {
            id: "",
            callback: () => {},
            unsubscribe: () => {},
          },
        },
      }),
      signInWithOtp: async () => {
        throw new Error("Supabase is not configured.");
      },
      signOut: async () => {
        throw new Error("Supabase is not configured.");
      },
    },
    from() {
      throw new Error("Supabase is not configured.");
    },
  } as unknown as SupabaseClient;
} else {
  client = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      lock: createSerializingLock(),
    },
  });
}

export const supabase = client;


