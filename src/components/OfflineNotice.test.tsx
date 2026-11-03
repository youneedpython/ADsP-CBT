import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, test, vi } from 'vitest';
import { OfflineNotice } from './OfflineNotice';

afterEach(() => { cleanup(); vi.restoreAllMocks(); });
test('reacts to connection events and removes listeners on unmount', () => {
  vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true);
  const remove = vi.spyOn(window, 'removeEventListener');
  const { unmount } = render(<OfflineNotice />);
  expect(screen.queryByRole('status')).toBeNull();
  fireEvent.offline(window);
  expect(screen.getByRole('status').textContent).toBe('인터넷 연결이 없습니다. 한 번 연 화면과 문제는 계속 풀 수 있습니다.');
  fireEvent.online(window);
  expect(screen.queryByRole('status')).toBeNull();
  unmount();
  expect(remove).toHaveBeenCalledWith('offline', expect.any(Function));
  expect(remove).toHaveBeenCalledWith('online', expect.any(Function));
});
test('shows notice when initially offline', () => {
  vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
  render(<OfflineNotice />);
  expect(screen.getByRole('status')).toBeTruthy();
  const image = screen.getByRole('presentation');
  expect(image.getAttribute('src')).toBe(`${import.meta.env.BASE_URL}dokdori/sleep.svg`);
  expect(image.getAttribute('width')).toBe('24');
});
