import { describe, it, expect, vi, beforeEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import { render, screen, waitFor } from '../test-utils';
import { within } from '@testing-library/react';
import Login from './Login';

const mockNavigate = vi.fn();
let mockLocation = { state: null };

let loginMock;

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useLocation: () => mockLocation,
  };
});

vi.mock('../hooks/useAuth', () => ({
  useAuth: () => ({ login: loginMock }),
}));

vi.mock('../services/api', () => ({
  authAPI: {
    login: vi.fn(),
    getUser: vi.fn(),
  },
}));

import { authAPI } from '../services/api';

describe('Login', () => {
  let setItemSpy;

  beforeEach(() => {
    mockNavigate.mockReset();
    mockLocation = { state: null };
    loginMock = vi.fn();

    setItemSpy = vi.spyOn(Storage.prototype, 'setItem');
    setItemSpy.mockClear();

    authAPI.login.mockReset();
    authAPI.getUser.mockReset();

    authAPI.login.mockResolvedValue({
      data: {
        access: 'mock-access-token',
        refresh: 'mock-refresh-token',
      },
    });
    authAPI.getUser.mockResolvedValue({
      data: { username: 'testuser' },
    });
  });

  it('renders the login form', () => {
    render(<Login />);

    expect(screen.getByText(/welcome back/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email or username/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^sign in$/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /forgot password/i })).toBeInTheDocument();
  });

  it('logs in successfully and navigates to / by default', async () => {
    const user = userEvent.setup();
    render(<Login />);

    await user.type(screen.getByLabelText(/email or username/i), 'testuser');
    await user.type(screen.getByLabelText(/^password/i), 'password123');
    await user.click(screen.getByRole('button', { name: /^sign in$/i }));

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/', { replace: true });
    });

    expect(setItemSpy).toHaveBeenCalledWith('access_token', 'mock-access-token');
    expect(setItemSpy).toHaveBeenCalledWith('refresh_token', 'mock-refresh-token');
    expect(loginMock).toHaveBeenCalledWith(
      'mock-access-token',
      'mock-refresh-token',
      { username: 'testuser' }
    );
  });

  it('shows an error when login fails', async () => {
    authAPI.login.mockRejectedValueOnce(new Error('Invalid credentials'));

    const user = userEvent.setup();
    render(<Login />);

    await user.type(screen.getByLabelText(/email or username/i), 'testuser');
    await user.type(screen.getByLabelText(/^password/i), 'wrongpassword');
    await user.click(screen.getByRole('button', { name: /^sign in$/i }));

    await waitFor(() => {
      const matchingErrors = screen.getAllByText('Invalid credentials');
      expect(matchingErrors.length).toBeGreaterThan(0);

      const alertElements = screen.getAllByRole('alert');
      const loginAlert = alertElements.find((element) =>
        within(element).queryByText(/login failed/i)
      );

      expect(loginAlert).toBeTruthy();
      expect(within(loginAlert).getByText('Invalid credentials')).toBeInTheDocument();
    });

    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('toggles password visibility', async () => {
    const user = userEvent.setup();
    render(<Login />);

    const passwordInput = screen.getByLabelText(/^password/i);
    expect(passwordInput).toHaveAttribute('type', 'password');

    await user.click(screen.getByRole('button', { name: /show password/i }));
    expect(passwordInput).toHaveAttribute('type', 'text');

    await user.click(screen.getByRole('button', { name: /hide password/i }));
    expect(passwordInput).toHaveAttribute('type', 'password');
  });

  it('redirects to intended page after login', async () => {
    mockLocation = { state: { from: { pathname: '/dashboard' } } };

    const user = userEvent.setup();
    render(<Login />);

    await user.type(screen.getByLabelText(/email or username/i), 'testuser');
    await user.type(screen.getByLabelText(/^password/i), 'password123');
    await user.click(screen.getByRole('button', { name: /^sign in$/i }));

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/dashboard', { replace: true });
    });
  });
});

