import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { loadDownloads, type DownloadsData } from '../data/loadDownloads';
type State = { status: 'loading' | 'error' } | { status: 'success'; data: DownloadsData };
const Context = createContext<{ state: State; retry: () => void }>({ state: { status: 'loading' }, retry: () => {} });
export function DownloadsProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<State>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);
  const request = useRef<Promise<DownloadsData> | null>(null);
  useEffect(() => {
    let active = true;
    (request.current ??= loadDownloads()).then(data => { if (active) setState({ status: 'success', data }); })
      .catch(() => { if (active) setState({ status: 'error' }); });
    return () => { active = false; };
  }, [attempt]);
  return <Context.Provider value={{ state, retry: () => { request.current = null; setState({ status: 'loading' }); setAttempt(n => n + 1); } }}>{children}</Context.Provider>;
}
export const useDownloads = () => useContext(Context);
