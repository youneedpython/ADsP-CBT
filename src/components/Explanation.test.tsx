import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Explanation } from './Explanation';

describe('Explanation', () => {
  it('keeps ordinary explanations in one paragraph including blank lines', () => {
    const { container } = render(<Explanation text={'첫 줄\n\n둘째 줄'} />);
    expect(container.querySelectorAll('p')).toHaveLength(1);
    expect(container.querySelector('p')?.textContent).toBe('첫 줄\n\n둘째 줄');
  });
  it('renders headings and referenced items in order', () => {
    const { container } = render(<Explanation text={'앞\n\n[제목]\n내용\n[[그림 1]]\n끝'} stimulus={[{ type: 'image', src: 'sample.png', alt: '표본 그림' }]} headingLevel={5} />);
    expect(screen.getByRole('heading', { level: 5, name: '제목' })).toBeTruthy();
    expect(screen.getByRole('img', { name: '표본 그림' }).getAttribute('loading')).toBe('lazy');
    expect(Array.from(container.children).map(element => element.tagName)).toEqual(['P', 'H5', 'P', 'DIV', 'P']);
  });
});
