import { useCallback, useRef, useState } from 'react';

/**
 * Guards a form submit handler against double-clicks / double-taps.
 *
 * - While the handler is running, `submitting` is true so the button can be
 *   disabled and show a spinner.
 * - A ref (not just state) blocks re-entry synchronously, so a second click
 *   fired in the same tick — before React re-renders the disabled button — is
 *   still dropped. This is the case that produced duplicate records on slow
 *   networks.
 * - Each run gets a fresh `idempotencyKey` that can be sent to the API as the
 *   `X-Idempotency-Key` header; retries of the *same* submit reuse it.
 */
export function useSubmitGuard() {
  const [submitting, setSubmitting] = useState(false);
  const busy = useRef(false);
  const keyRef = useRef<string>('');

  const newKey = () =>
    `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

  const guard = useCallback(
    <T,>(fn: (idempotencyKey: string) => T | Promise<T>) =>
      async (e?: { preventDefault?: () => void }): Promise<T | undefined> => {
        e?.preventDefault?.();
        if (busy.current) return undefined; // second click — ignore entirely
        busy.current = true;
        setSubmitting(true);
        if (!keyRef.current) keyRef.current = newKey();
        try {
          return await fn(keyRef.current);
        } finally {
          busy.current = false;
          setSubmitting(false);
        }
      },
    [],
  );

  /** Call after a *successful* submit so the next entry gets a new key. */
  const resetKey = useCallback(() => {
    keyRef.current = '';
  }, []);

  return { submitting, guard, resetKey };
}
