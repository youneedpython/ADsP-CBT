import { afterEach, expect, test, vi } from 'vitest';
import { registerServiceWorker } from './registerServiceWorker';

afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });
test('registers production with relative scope and quietly handles rejection', async () => {
  const register = vi.fn().mockResolvedValue(undefined);
  vi.stubGlobal('navigator', { serviceWorker: { register } });
  await registerServiceWorker(true);
  expect(register).toHaveBeenCalledWith('./sw.js', { scope: './' });
  register.mockRejectedValue(new Error('offline'));
  await expect(registerServiceWorker(true)).resolves.toBeUndefined();
});
test('does not register in development or tests', async () => {
  const register = vi.fn();
  vi.stubGlobal('navigator', { serviceWorker: { register } });
  await registerServiceWorker(false);
  await registerServiceWorker();
  expect(register).not.toHaveBeenCalled();
});
test('ignores unsupported browsers', async () => {
  await expect(registerServiceWorker(true)).resolves.toBeUndefined();
});
