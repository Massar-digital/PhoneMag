import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '../../test-utils';
import { Input, Textarea, Select, Checkbox, RadioGroup, FormActions } from './FormFields';

describe('FormFields Components', () => {
  describe('Input', () => {
    it('renders with label and handles value changes', () => {
      const handleChange = vi.fn();
      render(
        <Input
          label="Test Input"
          value="test value"
          onChange={handleChange}
        />
      );

      expect(screen.getByLabelText(/test input/i)).toBeInTheDocument();
      expect(screen.getByDisplayValue('test value')).toBeInTheDocument();

      fireEvent.change(screen.getByLabelText(/test input/i), {
        target: { value: 'new value' },
      });
      expect(handleChange).toHaveBeenCalledTimes(1);
    });

    it('shows error message', () => {
      render(
        <Input
          label="Email"
          error={{ message: 'Invalid email' }}
        />
      );

      expect(screen.getByText('Invalid email')).toBeInTheDocument();
      expect(screen.getByLabelText(/email/i)).toHaveClass('border-red-300');
    });

    it('shows helper text', () => {
      render(
        <Input
          label="Password"
          helperText="Must be at least 8 characters"
        />
      );

      expect(screen.getByText('Must be at least 8 characters')).toBeInTheDocument();
    });

    it('shows required indicator', () => {
      render(<Input label="Required Field" required />);

      expect(screen.getByText('*')).toBeInTheDocument();
    });
  });

  describe('Textarea', () => {
    it('renders with custom rows', () => {
      render(<Textarea label="Description" rows={5} />);

      const textarea = screen.getByLabelText(/description/i);
      expect(textarea).toHaveAttribute('rows', '5');
    });

    it('handles text input', () => {
      const handleChange = vi.fn();
      render(
        <Textarea
          label="Notes"
          value="initial text"
          onChange={handleChange}
        />
      );

      const textarea = screen.getByLabelText(/notes/i);
      fireEvent.change(textarea, { target: { value: 'updated text' } });
      expect(handleChange).toHaveBeenCalledTimes(1);
    });
  });

  describe('Select', () => {
    const options = [
      { value: 'option1', label: 'Option 1' },
      { value: 'option2', label: 'Option 2' },
      { value: 'option3', label: 'Option 3', disabled: true },
    ];

    it('renders options correctly', () => {
      render(
        <Select
          label="Test Select"
          options={options}
          placeholder="Choose an option"
        />
      );

      expect(screen.getByLabelText(/test select/i)).toBeInTheDocument();
      expect(screen.getByText('Choose an option')).toBeInTheDocument();
      expect(screen.getByText('Option 1')).toBeInTheDocument();
      expect(screen.getByText('Option 2')).toBeInTheDocument();
    });

    it('handles selection changes', () => {
      const handleChange = vi.fn();
      render(
        <Select
          label="Choose"
          options={options}
          value="option1"
          onChange={handleChange}
        />
      );

      const select = screen.getByLabelText(/choose/i);
      fireEvent.change(select, { target: { value: 'option2' } });
      expect(handleChange).toHaveBeenCalledTimes(1);
    });

    it('respects disabled options', () => {
      render(<Select label="Select" options={options} />);

      const disabledOption = screen.getByText('Option 3');
      expect(disabledOption).toBeDisabled();
    });
  });

  describe('Checkbox', () => {
    it('renders with label and handles toggle', () => {
      const handleChange = vi.fn();
      render(
        <Checkbox
          label="Accept terms"
          checked={false}
          onChange={handleChange}
        />
      );

      const checkbox = screen.getByLabelText(/accept terms/i);
      expect(checkbox).not.toBeChecked();

      fireEvent.click(checkbox);
      expect(handleChange).toHaveBeenCalledTimes(1);
    });

    it('shows checked state', () => {
      render(<Checkbox label="Checked" defaultChecked />);

      expect(screen.getByLabelText(/checked/i)).toBeChecked();
    });
  });

  describe('RadioGroup', () => {
    const options = [
      { value: 'option1', label: 'Option 1' },
      { value: 'option2', label: 'Option 2' },
    ];

    it('renders radio options', () => {
      render(
        <RadioGroup
          label="Choose option"
          name="test-radio"
          options={options}
          value="option1"
        />
      );

      expect(screen.getByLabelText('Option 1')).toBeChecked();
      expect(screen.getByLabelText('Option 2')).not.toBeChecked();
    });

    it('handles radio selection', () => {
      const handleChange = vi.fn();
      render(
        <RadioGroup
          label="Select"
          name="radio-test"
          options={options}
          onChange={handleChange}
        />
      );

      fireEvent.click(screen.getByLabelText('Option 2'));
      expect(handleChange).toHaveBeenCalledWith('option2');
    });
  });

  describe('FormActions', () => {
    it('renders submit and cancel buttons', () => {
      const handleCancel = vi.fn();
      render(
        <FormActions
          submitLabel="Create"
          cancelLabel="Discard"
          onCancel={handleCancel}
        />
      );

      expect(screen.getByRole('button', { name: /create/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /discard/i })).toBeInTheDocument();
    });

    it('shows loading state', () => {
      render(<FormActions isSubmitting submitLabel="Saving" />);

      expect(screen.getByRole('button', { name: /saving/i })).toBeDisabled();
    });

    it('handles cancel click', () => {
      const handleCancel = vi.fn();
      render(<FormActions onCancel={handleCancel} />);

      fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
      expect(handleCancel).toHaveBeenCalledTimes(1);
    });

    it('can disable submit button', () => {
      render(<FormActions submitDisabled />);

      expect(screen.getByRole('button', { name: /save/i })).toBeDisabled();
    });
  });
});
