import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useFormSubmission, useCreateForm, useUpdateForm, useDeleteForm } from './useFormSubmission';

let showToastMock;
vi.mock('../context/ToastContext', () => ({
  useToast: () => ({ showToast: showToastMock }),
}));

describe('useFormSubmission', () => {
  beforeEach(() => {
    showToastMock = vi.fn();
  });

  it('initializes with correct default state', () => {
    const { result } = renderHook(() => useFormSubmission());

    expect(result.current.isSubmitting).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.success).toBeNull();
  });

  it('handles successful submission', async () => {
    const mockOperation = vi.fn().mockResolvedValue('success data');
    const { result } = renderHook(() => useFormSubmission({
      successMessage: 'Custom success message',
    }));

    let submitResult;
    await act(async () => {
      submitResult = await result.current.submit(mockOperation);
    });

    expect(result.current.isSubmitting).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.success).toBe('Custom success message');
    expect(submitResult).toBe('success data');
    expect(mockOperation).toHaveBeenCalledTimes(1);
    expect(showToastMock).toHaveBeenCalledWith('Custom success message', 'success');
  });

  it('handles submission error', async () => {
    const mockError = new Error('Network error');
    const mockOperation = vi.fn().mockRejectedValue(mockError);
    const { result } = renderHook(() => useFormSubmission());

    let submitResult;
    await act(async () => {
      submitResult = await result.current.submit(mockOperation);
    });

    expect(result.current.isSubmitting).toBe(false);
    expect(result.current.success).toBeNull();
    expect(result.current.error).toBe('Network error');
    expect(submitResult).toBeNull();
    expect(showToastMock).toHaveBeenCalledWith('Network error', 'error');
  });

  it('handles API error with response data', async () => {
    const mockError = { response: { data: { message: 'Validation failed' } } };
    const mockOperation = vi.fn().mockRejectedValue(mockError);
    const { result } = renderHook(() => useFormSubmission());

    await act(async () => {
      await result.current.submit(mockOperation);
    });

    expect(result.current.error).toBe('Validation failed');
    expect(showToastMock).toHaveBeenCalledWith('Validation failed', 'error');
  });

  it('sets submitting state during operation', async () => {
    let resolveOperation;
    const mockOperation = vi.fn().mockImplementation(() => {
      return new Promise((resolve) => {
        resolveOperation = resolve;
      });
    });

    const { result } = renderHook(() => useFormSubmission());

    act(() => {
      result.current.submit(mockOperation);
    });

    expect(result.current.isSubmitting).toBe(true);

    act(() => {
      resolveOperation('done');
    });

    await waitFor(() => {
      expect(result.current.isSubmitting).toBe(false);
    });
  });

  it('calls onSuccess callback when provided', async () => {
    const mockOperation = vi.fn().mockResolvedValue('data');
    const onSuccess = vi.fn();
    const { result } = renderHook(() => useFormSubmission({ onSuccess }));

    await act(async () => {
      await result.current.submit(mockOperation);
    });

    expect(onSuccess).toHaveBeenCalledWith('data');
  });

  it('calls onError callback when provided', async () => {
    const mockError = new Error('Test error');
    const mockOperation = vi.fn().mockRejectedValue(mockError);
    const onError = vi.fn();
    const { result } = renderHook(() => useFormSubmission({ onError }));

    await act(async () => {
      await result.current.submit(mockOperation);
    });

    expect(onError).toHaveBeenCalledWith(mockError);
  });

  it('overrides default messages with custom ones', async () => {
    const mockOperation = vi.fn().mockResolvedValue('data');
    const { result } = renderHook(() => useFormSubmission());

    await act(async () => {
      await result.current.submit(
        mockOperation,
        'Custom success',
        'Custom error'
      );
    });

    expect(result.current.success).toBe('Custom success');
    expect(showToastMock).toHaveBeenCalledWith('Custom success', 'success');
  });

  it('resets state correctly', () => {
    const { result } = renderHook(() => useFormSubmission());

    act(() => {
      result.current.reset();
    });

    expect(result.current.isSubmitting).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.success).toBeNull();
  });

  describe('specialized hooks', () => {
    it('useCreateForm has correct default success message', async () => {
      const mockOperation = vi.fn().mockResolvedValue('data');
      const { result } = renderHook(() => useCreateForm());

      await act(async () => {
        await result.current.submit(mockOperation);
      });

      expect(result.current.success).toBe('Item created successfully');
    });

    it('useUpdateForm has correct default success message', async () => {
      const mockOperation = vi.fn().mockResolvedValue('data');
      const { result } = renderHook(() => useUpdateForm());

      await act(async () => {
        await result.current.submit(mockOperation);
      });

      expect(result.current.success).toBe('Item updated successfully');
    });

    it('useDeleteForm has correct default success message', async () => {
      const mockOperation = vi.fn().mockResolvedValue('data');
      const { result } = renderHook(() => useDeleteForm());

      await act(async () => {
        await result.current.submit(mockOperation);
      });

      expect(result.current.success).toBe('Item deleted successfully');
    });

    it('specialized hooks can override options', async () => {
      const mockOperation = vi.fn().mockResolvedValue('data');
      const { result } = renderHook(() => useCreateForm({
        successMessage: 'Custom create message',
      }));

      await act(async () => {
        await result.current.submit(mockOperation);
      });

      expect(result.current.success).toBe('Custom create message');
    });
  });
});
