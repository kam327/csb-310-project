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
 */
function createSerializingLock(): (
  name: string,
  acquireTimeout: number,
  fn: (lock: { name: string } | null) => Promise<unknown>
) => Promise<unknown> {
  let tail: Promise<unknown> = Promise.resolve();
  return function serializingLock(_name, _acquireTimeout, fn) {
    const prev = tail;
    let resolve: () => void;
    tail = new Promise<void>((r) => {
      resolve = r;
    });
    return prev.then(
      () => fn({ name: _name }),
      () => fn({ name: _name })
    ).finally(() => {
      resolve!();
    });
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


