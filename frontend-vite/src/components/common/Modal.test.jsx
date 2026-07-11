import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '../../test-utils';
import { Modal } from './Modal';

describe('Modal', () => {
  let defaultProps;

  beforeEach(() => {
    defaultProps = {
      open: true,
      onClose: vi.fn(),
      header: 'Test Modal',
      body: <p>Modal content</p>,
    };
  });

  it('renders when open is true', () => {
    render(<Modal {...defaultProps} />);

    expect(screen.getByText('Test Modal')).toBeInTheDocument();
    expect(screen.getByText('Modal content')).toBeInTheDocument();
  });

  it('does not render when open is false', () => {
    render(<Modal {...defaultProps} open={false} />);

    expect(screen.queryByText('Test Modal')).not.toBeInTheDocument();
    expect(screen.queryByText('Modal content')).not.toBeInTheDocument();
  });

  it('calls onClose when close button is clicked', () => {
    render(<Modal {...defaultProps} />);

    const closeButton = screen.getByRole('button', { name: /close modal/i, hidden: true });
    fireEvent.click(closeButton);

    expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when backdrop is clicked', () => {
    render(<Modal {...defaultProps} />);

    const dialog = screen.getByRole('dialog', { hidden: true });
    const backdrop = dialog.parentElement;
    fireEvent.click(backdrop);

    expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when Escape key is pressed', () => {
    render(<Modal {...defaultProps} />);

    fireEvent.keyDown(window, { key: 'Escape' });

    expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
  });

  it('renders with different sizes', () => {
    const { rerender } = render(<Modal {...defaultProps} size="sm" />);
    expect(screen.getByRole('dialog', { hidden: true })).toHaveClass('max-w-sm');

    rerender(<Modal {...defaultProps} size="md" />);
    expect(screen.getByRole('dialog', { hidden: true })).toHaveClass('max-w-md');

    rerender(<Modal {...defaultProps} size="lg" />);
    expect(screen.getByRole('dialog', { hidden: true })).toHaveClass('max-w-lg');

    rerender(<Modal {...defaultProps} size="full" />);
    expect(screen.getByRole('dialog', { hidden: true })).toHaveClass('h-full');
  });

  it('renders footer when provided', () => {
    const footer = <button>Save</button>;
    render(<Modal {...defaultProps} footer={footer} />);

    expect(screen.getByRole('button', { name: /save/i, hidden: true })).toBeInTheDocument();
  });

  it('applies custom className', () => {
    render(<Modal {...defaultProps} className="custom-modal" />);

    expect(screen.getByRole('dialog', { hidden: true })).toHaveClass('custom-modal');
  });

  it('prevents backdrop click when closeOnBackdrop is false', () => {
    render(<Modal {...defaultProps} closeOnBackdrop={false} />);

    const dialog = screen.getByRole('dialog', { hidden: true });
    const backdrop = dialog.parentElement;
    fireEvent.click(backdrop);

    expect(defaultProps.onClose).not.toHaveBeenCalled();
  });

  it('prevents escape key close when closeOnEsc is false', () => {
    render(<Modal {...defaultProps} closeOnEsc={false} />);

    fireEvent.keyDown(window, { key: 'Escape' });

    expect(defaultProps.onClose).not.toHaveBeenCalled();
  });
});
