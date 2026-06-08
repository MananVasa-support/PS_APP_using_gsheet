// Supabase has been removed from this project. This file is a no-op stub kept
// at the same path so existing service files (which all gate on `isConfigured`)
// continue to compile and fall through to their mock-data branches.

export const isConfigured = false;

const handler = {
  get() {
    throw new Error(
      '[supabase] removed — this code path should be unreachable while isConfigured=false'
    );
  },
};

export const supabase = new Proxy({}, handler);

export function unwrapError(err) {
  if (!err) return null;
  if (err instanceof Error) return err;
  const message = err.message || err.error_description || err.error || 'Unexpected error';
  const e = new Error(message);
  e.code = err.code;
  e.status = err.status;
  e.details = err.details;
  return e;
}
