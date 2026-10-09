import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { StarInput, Stars } from './Stars.jsx';

describe('<Stars />', () => {
  it('exposes the value to assistive tech', () => {
    render(<Stars value={4.3} />);
    expect(screen.getByRole('img', { name: '4.3 out of 5' })).toBeInTheDocument();
  });

  it('copes with a missing value', () => {
    render(<Stars value={null} />);
    expect(screen.getByRole('img', { name: '0.0 out of 5' })).toBeInTheDocument();
  });
});

describe('<StarInput />', () => {
  it('reports the chosen rating', async () => {
    const onChange = vi.fn();
    render(<StarInput name="t" value={2} onChange={onChange} />);
    await userEvent.click(screen.getByLabelText('4 stars'));
    expect(onChange).toHaveBeenCalledWith(4);
  });

  it('marks the current rating as checked', () => {
    render(<StarInput name="t" value={3} onChange={() => {}} />);
    const radios = screen.getAllByRole('radio');
    expect(radios).toHaveLength(5);
    expect(radios[2]).toBeChecked();
  });

  it('ignores input while disabled', async () => {
    const onChange = vi.fn();
    render(<StarInput name="t" value={null} disabled onChange={onChange} />);
    await userEvent.click(screen.getByLabelText('5 stars'));
    expect(onChange).not.toHaveBeenCalled();
  });
});
