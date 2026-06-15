import { useEffect } from 'react';
import { useToast } from '@/context/ToastContext.jsx';

/**
 * Bridges low-level Google Sheets save/auth failures (dispatched as a
 * `gs:error` window event from lib/gsApi.js) into a visible toast. Without
 * this, the tool services swallow those errors (fire-and-forget / `.catch(()=>{})`)
 * and the user just sees "nothing saved" with no explanation. Mounted once at
 * the app root.
 */
export default function GsErrorToaster() {
  const toast = useToast();
  useEffect(() => {
    const handler = (e) => toast.error(e.detail || 'Something went wrong saving to Google.');
    window.addEventListener('gs:error', handler);
    return () => window.removeEventListener('gs:error', handler);
  }, [toast]);
  return null;
}
