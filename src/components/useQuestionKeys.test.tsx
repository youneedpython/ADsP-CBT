import { cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, expect, test, vi } from 'vitest';
import { useQuestionKeys } from './useQuestionKeys';
afterEach(cleanup);
test('S toggles independently of answers and respects all editable, modifier and modal guards', () => {
  const toggleMark = vi.fn(), choose = vi.fn();
  function Host({ blocked = false }) {
    useQuestionKeys({ blocked, choose, toggleMark });
    return <><button /><a href="#">Link</a><input /><textarea /><select /><div contentEditable><span>editable</span></div></>;
  }
  const view = render(<Host />);
  fireEvent.keyDown(window, { key: 's' });
  fireEvent.keyDown(view.container.querySelector('button')!, { key: 'S' });
  fireEvent.keyDown(view.container.querySelector('a')!, { key: 's' });
  expect(toggleMark).toHaveBeenCalledTimes(3);
  for (const modifier of ['ctrlKey', 'altKey', 'metaKey']) fireEvent.keyDown(window, { key: 's', [modifier]: true });
  for (const target of view.container.querySelectorAll('input, textarea, select, span')) fireEvent.keyDown(target, { key: 'S' });
  view.rerender(<Host blocked />);
  fireEvent.keyDown(window, { key: 's' });
  expect(toggleMark).toHaveBeenCalledTimes(3);
  expect(choose).not.toHaveBeenCalled();
});
test('Enter confirms only outside interactive targets and respects shortcut guards', () => {
  const confirm = vi.fn();
  function Host({ blocked = false, enabled = true }) {
    useQuestionKeys({ blocked, confirm: enabled ? confirm : undefined });
    return <><h2 tabIndex={-1}>Question</h2><button><span>Action</span></button><a href="#">Link</a><input /><textarea /><select /><div contentEditable>Editable</div></>;
  }
  const view = render(<Host />);
  fireEvent.keyDown(document.body, { key: 'Enter' });
  fireEvent.keyDown(view.container.querySelector('h2')!, { key: 'Enter' });
  expect(confirm).toHaveBeenCalledTimes(2);
  for (const target of view.container.querySelectorAll('button, span, a, input, textarea, select, [contenteditable]')) {
    expect(fireEvent.keyDown(target, { key: 'Enter' })).toBe(true);
  }
  for (const modifier of ['ctrlKey', 'altKey', 'metaKey']) fireEvent.keyDown(window, { key: 'Enter', [modifier]: true });
  view.rerender(<Host blocked />);
  fireEvent.keyDown(window, { key: 'Enter' });
  view.rerender(<Host enabled={false} />);
  expect(fireEvent.keyDown(window, { key: 'Enter' })).toBe(true);
  expect(confirm).toHaveBeenCalledTimes(2);
});
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
