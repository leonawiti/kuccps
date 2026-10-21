import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { BarList } from './charts';

describe('BarList', () => {
  it('shows each label and value in words', () => {
    render(<BarList title="Mean grade" max={10} items={[{ label: 'A', value: 5, display: '5 learners' }, { label: 'B', value: 10, display: '10 learners' }]} />);
    expect(screen.getByText('Mean grade')).toBeInTheDocument();
    expect(screen.getByText('5 learners')).toBeInTheDocument();
    expect(screen.getByText('B')).toBeInTheDocument();
  });

  it('sizes each bar in proportion to its value and the maximum', () => {
    render(<BarList title="t" max={10} items={[{ label: 'a', value: 2.5, display: '' }, { label: 'b', value: 10, display: '' }]} />);
    const bars = screen.getAllByTestId('bar');
    expect(bars[0]).toHaveStyle({ width: '25%' });
    expect(bars[1]).toHaveStyle({ width: '100%' });
  });

  it('scales against whatever maximum it is given', () => {
    render(<BarList title="t" max={48} items={[{ label: 'a', value: 12, display: '' }]} />);
    expect(screen.getByTestId('bar')).toHaveStyle({ width: '25%' });
  });

  it('never draws a bar wider than full or narrower than empty', () => {
    render(<BarList title="t" max={10} items={[{ label: 'over', value: 99, display: '' }, { label: 'under', value: -5, display: '' }]} />);
    const bars = screen.getAllByTestId('bar');
    expect(bars[0]).toHaveStyle({ width: '100%' });
    expect(bars[1]).toHaveStyle({ width: '0%' });
  });

  it('draws empty bars when the maximum is zero', () => {
    render(<BarList title="t" max={0} items={[{ label: 'a', value: 3, display: '' }]} />);
    expect(screen.getByTestId('bar')).toHaveStyle({ width: '0%' });
  });
});
