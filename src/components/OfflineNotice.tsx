import { useEffect, useState } from 'react';

export function OfflineNotice() {
  const [offline, setOffline] = useState(() => !navigator.onLine);
  useEffect(() => {
    const disconnected = () => setOffline(true);
    const connected = () => setOffline(false);
    window.addEventListener('offline', disconnected);
    window.addEventListener('online', connected);
    return () => {
      window.removeEventListener('offline', disconnected);
      window.removeEventListener('online', connected);
    };
  }, []);
  return offline ? <div className="offline-notice" role="status">인터넷 연결이 없습니다. 한 번 연 화면과 문제는 계속 풀 수 있습니다.</div> : null;
}
