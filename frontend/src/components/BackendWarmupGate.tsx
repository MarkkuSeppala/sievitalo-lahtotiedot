import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';

type Props = {
  children: React.ReactNode;
};

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export default function BackendWarmupGate({ children }: Props) {
  const apiBase = useMemo(() => import.meta.env.VITE_API_URL || 'http://localhost:3001', []);

  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function checkLoop() {
      // If we're running locally, backend is usually instant; still keep the logic.
      let delayMs = 500;

      while (!cancelled) {
        try {
          await axios.get(`${apiBase}/health`, { timeout: 5000 });
          if (!cancelled) setReady(true);
          return;
        } catch {
          // backend sleeping / waking up
        }

        await sleep(delayMs);
        delayMs = Math.min(Math.round(delayMs * 1.5), 5000);
      }
    }

    checkLoop();
    return () => {
      cancelled = true;
    };
  }, [apiBase]);

  if (ready) return <>{children}</>;

  return (
    <div className="warmup-overlay" role="status" aria-live="polite">
      <div className="warmup-card">
        <div className="warmup-spinner" aria-hidden="true" />
        <h2>Odotetaan palvelun käynnistymistä…</h2>
      </div>
    </div>
  );
}


