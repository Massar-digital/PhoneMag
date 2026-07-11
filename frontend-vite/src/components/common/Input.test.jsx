import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '../../test-utils';
import { Input } from './Input';

describe('Input', () => {
  it('renders with basic props', () => {
    render(<Input label="Username" placeholder="Enter username" />);

    expect(screen.getByLabelText(/username/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Enter username')).toBeInTheDocument();
  });

  it('renders with different types', () => {
    const { rerender } = render(<Input type="email" label="Email" />);
    expect(screen.getByLabelText(/email/i)).toHaveAttribute('type', 'email');

    rerender(<Input type="password" label="Password" />);
    expect(screen.getByLabelText(/password/i)).toHaveAttribute('type', 'password');

    rerender(<Input type="number" label="Age" />);
    expect(screen.getByLabelText(/age/i)).toHaveAttribute('type', 'number');
  });

  it('handles value changes', () => {
    const handleChange = vi.fn();
    render(<Input label="Name" value="John" onChange={handleChange} />);

    const input = screen.getByLabelText(/name/i);
    expect(input).toHaveValue('John');

    fireEvent.change(input, { target: { value: 'Jane' } });
    expect(handleChange).toHaveBeenCalledTimes(1);
  });

  it('shows error state', () => {
    render(<Input label="Email" error="Invalid email" />);

    expect(screen.getByText('Invalid email')).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toHaveClass('border-danger-300');
  });

  it('shows helper text', () => {
    render(<Input label="Password" helperText="Must be at least 8 characters" />);

    expect(screen.getByText('Must be at least 8 characters')).toBeInTheDocument();
  });

  it('is disabled when disabled prop is true', () => {
    render(<Input label="Disabled Input" disabled />);

    const input = screen.getByLabelText(/disabled input/i);
    expect(input).toBeDisabled();
    expect(input).toHaveClass('bg-slate-50', 'cursor-not-allowed');
  });

  it('renders with custom className', () => {
    render(<Input label="Custom" className="custom-input" />);

    expect(screen.getByLabelText(/custom/i)).toHaveClass('custom-input');
  });

  it('handles focus and blur events', () => {
    const handleFocus = vi.fn();
    const handleBlur = vi.fn();

    render(
      <Input
        label="Focus Test"
        onFocus={handleFocus}
        onBlur={handleBlur}
      />
    );

    const input = screen.getByLabelText(/focus test/i);

    fireEvent.focus(input);
    expect(handleFocus).toHaveBeenCalledTimes(1);

    fireEvent.blur(input);
    expect(handleBlur).toHaveBeenCalledTimes(1);
  });
});
