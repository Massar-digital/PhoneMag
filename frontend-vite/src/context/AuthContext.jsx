import React, { createContext, useContext, useState, useEffect } from 'react';
import { authAPI, setAuthTokens } from '../services/api';

// interface AuthContextType {
//   user: User | null;
//   token | null;
//   isAuthenticated;
//   login: (token, refreshToken, user: User) => void;
//   logout: () => void;
//   updateUser: (user: User) => void;
// }

const AuthContext = createContext(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// interface AuthProviderProps {
//   children: ReactNode;
// }

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  const logout = () => {
    setToken(null);
    setUser(null);
    setAuthTokens(null, null);
    localStorage.removeItem('auth_v2_is_logged_in');
    localStorage.removeItem('user');
    localStorage.removeItem('rememberMe');
    // We don't remove last_boot_time so the next check still works
  };

  const login = (accessToken, refreshToken, userData, rememberMe = false) => {
    setToken(accessToken);
    setUser(userData);
    setAuthTokens(accessToken, refreshToken);

    // With cookies, we only persist user data and UI markers in localStorage
    localStorage.setItem('user', JSON.stringify(userData));
    localStorage.setItem('rememberMe', JSON.stringify(rememberMe));

    // Save current boot time to tie session to this PC uptime
    if (window.electron?.versions?.getBootTime) {
      window.electron.versions.getBootTime().then(bootTime => {
        localStorage.setItem('last_boot_time', bootTime.toString());
      }).catch(() => {});
    }
  };

  useEffect(() => {
    const initAuth = async () => {
      // Logic for "Persist until PC is turned off"
      // We check if the OS boot time has changed since the last session
      try {
        const rememberMeStr = localStorage.getItem('rememberMe');
        const rememberMe = rememberMeStr ? JSON.parse(rememberMeStr) : false;
        const currentBootTime = window.electron?.versions?.getBootTime ? await window.electron.versions.getBootTime() : Math.round(Date.now() / 1000);
        const storedBootTime = localStorage.getItem('last_boot_time');
        const parsedStoredTime = parseInt(storedBootTime);

        // Only clear session on boot time change if "rememberMe" is NOT enabled
        if (!rememberMe && storedBootTime && !isNaN(parsedStoredTime) && Math.abs(currentBootTime - parsedStoredTime) > 60) {
          console.log('PC was rebooted and "remember me" is disabled. Clearing session.');
          logout();
          setLoading(false);
          return;
        }

        // Update stored boot time to current one if not set or close enough
        localStorage.setItem('last_boot_time', currentBootTime.toString());
      } catch (err) {
        console.warn('Could not check boot time, falling back to regular persistence:', err);
      }

      // Check for logic marker or stored user on app load
      const isLoggedIn = localStorage.getItem('auth_v2_is_logged_in') === 'true';
      const storedUser = localStorage.getItem('user');

      if (isLoggedIn && storedUser) {
        // Parse stored user as fallback
        try {
          const parsedUser = JSON.parse(storedUser);
          setUser(parsedUser);
          setToken('TRUE'); // Dummy value to indicate we are (theoretically) authenticated

          // Validate session by silently refreshing the token first.
          // This avoids triggering the interceptor's noisy 401 flow on getUser.
          try {
            let retries = 5;
            let refreshResponse = null;
            while (retries > 0) {
              try {
                refreshResponse = await authAPI.refresh();
                break;
              } catch (err) {
                if (!err.response && retries > 1) {
                  retries -= 1;
                  await new Promise(r => setTimeout(r, 2000));
                  continue;
                }
                throw err;
              }
            }
            const newToken = refreshResponse.data.access;
            if (newToken) {
              setAuthTokens(newToken, null);
              setToken(newToken);
            }
          } catch {
            // Refresh token expired or invalid — session is gone, logout silently
            logout();
            setLoading(false);
            return;
          }

          // Session is valid, sync with backend
          const response = await authAPI.getUser();
          if (response.data) {
            setUser(response.data);
            localStorage.setItem('user', JSON.stringify(response.data));
          }
        } catch (error) {
          // Silent fallback — should not reach here under normal conditions
          logout();
        }
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  const updateUser = (userData) => {
    setUser(userData);
    localStorage.setItem('user', JSON.stringify(userData));
  };

  const value = {
    user,
    token,
    isAuthenticated: !!token && !!user,
    loading,
    login,
    logout,
    updateUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
