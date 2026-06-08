/**
 * Legacy shim.
 *
 * The app previously used Axios + an Express backend. It now talks to Supabase
 * directly via `src/lib/supabase.js`, so this file only re-exports a single
 * "is a backend configured?" flag for any service still consulting it.
 *
 * If you write a brand-new service, import `supabase` from `@/lib/supabase`
 * instead of pulling anything from here.
 */
import { isConfigured } from '@/lib/supabase';

export const hasBackend = isConfigured;
export default null;
