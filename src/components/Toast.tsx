import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';

const Ctx = createContext<(msg: string) => void>(() => {});
export const useToast = () => useContext(Ctx);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [msg, setMsg] = useState<string | null>(null);
  const show = useCallback((m: string) => setMsg(m), []);
  useEffect(() => {
    if (!msg) return;
    const t = setTimeout(() => setMsg(null), 5000);
    return () => clearTimeout(t);
  }, [msg]);
  return (
    <Ctx.Provider value={show}>
      {children}
      {msg && (
        <div role="status" aria-live="polite" className="toast">
          {msg}
        </div>
      )}
    </Ctx.Provider>
  );
}
