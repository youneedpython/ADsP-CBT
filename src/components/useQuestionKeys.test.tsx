import { cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, expect, test, vi } from 'vitest';
import { useQuestionKeys } from './useQuestionKeys';
afterEach(cleanup);
test('central shortcuts handle numpad and ignore modifiers, dialogs and editable targets', () => {
  const choose = vi.fn(), previous = vi.fn(), next = vi.fn();
  function Host({ blocked = false }) {
    useQuestionKeys({ blocked, choose, previous, next });
    return <><input /><textarea /><select /><div contentEditable><span>editable</span></div></>;
  }
  const view = render(<Host />);
  for (const key of ['1', '2', '3', '4']) fireEvent.keyDown(window, { key });
  fireEvent.keyDown(window, { key: 'End', code: 'Numpad1' });
  expect(choose.mock.calls.map(call => call[0])).toEqual([1, 2, 3, 4, 1]);
  fireEvent.keyDown(window, { key: 'ArrowLeft' }); fireEvent.keyDown(window, { key: 'ArrowRight' });
  expect(previous).toHaveBeenCalledTimes(1); expect(next).toHaveBeenCalledTimes(1);
  for (const modifier of ['ctrlKey', 'altKey', 'metaKey']) {
    fireEvent.keyDown(window, { key: '1', [modifier]: true });
    fireEvent.keyDown(window, { key: 'ArrowRight', [modifier]: true });
  }
  for (const target of view.container.querySelectorAll('input, textarea, select, span')) {
    fireEvent.keyDown(target, { key: '1' }); fireEvent.keyDown(target, { key: 'ArrowRight' });
  }
  view.rerender(<Host blocked />);
  fireEvent.keyDown(window, { key: '1' }); fireEvent.keyDown(window, { key: 'ArrowRight' });
  expect(choose).toHaveBeenCalledTimes(5); expect(next).toHaveBeenCalledTimes(1);
});
