import { useCallback, useState } from 'react';

export default function useCursor(initial = 0) {
  const [cursor, setCursor] = useState(initial);

  const next = useCallback(() => setCursor((c) => c + 1), []);
  const prev = useCallback(() => setCursor((c) => Math.max(0, c - 1)), []);
  const reset = useCallback((value = 0) => setCursor(value), []);

  return { cursor, setCursor, next, prev, reset };
}
