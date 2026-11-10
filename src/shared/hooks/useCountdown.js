import { useEffect, useMemo, useState } from 'react';

/**
 * Live countdown to a fixed end date coming from the API.
 * Never starts from zero on page load: remaining time = endsAt − (now + server clock offset).
 * @param {string|Date|null} endsAt campaign end (ISO)
 * @param {string|null} serverTime optional server "now" (ISO) to correct client clock skew
 */
export function useCountdown(endsAt, serverTime = null) {
  const offset = useMemo(() => {
    if (!serverTime) return 0;
    const t = new Date(serverTime).getTime();
    return Number.isFinite(t) ? t - Date.now() : 0;
  }, [serverTime]);

  const end = useMemo(() => (endsAt ? new Date(endsAt).getTime() : NaN), [endsAt]);
  const compute = () => (Number.isFinite(end) ? Math.max(0, end - (Date.now() + offset)) : 0);
  const [remaining, setRemaining] = useState(compute);

  useEffect(() => {
    setRemaining(compute());
    if (!Number.isFinite(end)) return undefined;
    const timer = setInterval(() => {
      const next = compute();
      setRemaining(next);
      if (next <= 0) clearInterval(timer);
    }, 1000);
    return () => clearInterval(timer);
  }, [end, offset]); // eslint-disable-line react-hooks/exhaustive-deps

  const totalSeconds = Math.floor(remaining / 1000);
  return {
    remaining,
    expired: Number.isFinite(end) && remaining <= 0,
    days: Math.floor(totalSeconds / 86400),
    hours: Math.floor((totalSeconds % 86400) / 3600),
    minutes: Math.floor((totalSeconds % 3600) / 60),
    seconds: totalSeconds % 60,
  };
}
