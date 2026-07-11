import React, { createContext, useContext, useState, useEffect } from 'react';

const AccessibilityContext = createContext(undefined);

export const useAccessibility = () => {
  const context = useContext(AccessibilityContext);
  if (!context) {
    throw new Error('useAccessibility must be used within an AccessibilityProvider');
  }
  return context;
};

export const AccessibilityProvider = ({ children }) => {
  // Accessibility preferences
  const [screenReaderMode, setScreenReaderMode] = useState(false);
  const [highContrastMode, setHighContrastMode] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [fontScale, setFontScale] = useState(1);
  const [shortcuts, setShortcuts] = useState({});

  // Initialize from system preferences and localStorage
  useEffect(() => {
    // Check for screen reader
    const checkScreenReader = () => {
      // Modern browsers support navigator.userAgentData for high contrast detection
      // For screen readers, we can check for common indicators
      const hasScreenReader = window.navigator.userAgent.includes('NVDA') ||
                             window.navigator.userAgent.includes('JAWS') ||
                             window.navigator.userAgent.includes('VoiceOver');
      setScreenReaderMode(hasScreenReader);
    };

    // Check for high contrast mode
    const checkHighContrast = () => {
      // Check for high contrast media query
      const mediaQuery = window.matchMedia('(prefers-contrast: high)');
      setHighContrastMode(mediaQuery.matches);

      // Listen for changes
      const handleChange = (e) => setHighContrastMode(e.matches);
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    };

    // Check for reduced motion
    const checkReducedMotion = () => {
      const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
      setReducedMotion(mediaQuery.matches);

      const handleChange = (e) => setReducedMotion(e.matches);
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    };

    // Load saved preferences (removed localStorage as requested)
    // No longer loading fontScale from localStorage

    checkScreenReader();
    checkHighContrast();
    checkReducedMotion();
  }, []);

  // Apply font scale preference
  useEffect(() => {
    // Removed localStorage.setItem as requested

    // Apply font scaling to document
    document.documentElement.style.fontSize = `${fontScale * 16}px`;
  }, [fontScale]);

  // Apply high contrast mode
  useEffect(() => {
    if (highContrastMode) {
      document.documentElement.classList.add('high-contrast');
    } else {
      document.documentElement.classList.remove('high-contrast');
    }
  }, [highContrastMode]);

  // Apply reduced motion
  useEffect(() => {
    if (reducedMotion) {
      document.documentElement.classList.add('reduced-motion');
    } else {
      document.documentElement.classList.remove('reduced-motion');
    }
  }, [reducedMotion]);

  // Announcement system
  const announceRef = React.useRef(null);

  useEffect(() => {
    if (!announceRef.current) {
      const announcer = document.createElement('div');
      announcer.setAttribute('aria-live', 'polite');
      announcer.setAttribute('aria-atomic', 'true');
      announcer.className = 'sr-only';
      announcer.id = 'accessibility-announcer';
      document.body.appendChild(announcer);
      announceRef.current = announcer;
    }
  }, []);

  const announce = React.useCallback((message, priority = 'polite') => {
    if (announceRef.current) {
      announceRef.current.setAttribute('aria-live', priority);
      announceRef.current.textContent = message;

      // Clear after announcement
      setTimeout(() => {
        if (announceRef.current) {
          announceRef.current.textContent = '';
        }
      }, 1000);
    }
  }, []);

  // Keyboard shortcuts
  const registerShortcut = React.useCallback((key, action) => {
    setShortcuts(prev => ({ ...prev, [key]: action }));
  }, []);

  const unregisterShortcut = React.useCallback((key) => {
    setShortcuts(prev => {
      const newShortcuts = { ...prev };
      delete newShortcuts[key];
      return newShortcuts;
    });
  }, []);

  // Global keyboard shortcut handler
  useEffect(() => {
    const handleKeyDown = (event) => {
      // Only handle shortcuts when not in input fields
      const target = event.target;
      if (!target) return;

      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.contentEditable === 'true') {
        return;
      }

      const keys = [];
      if (event.ctrlKey || event.metaKey) keys.push('Ctrl');
      if (event.shiftKey) keys.push('Shift');
      if (event.altKey) keys.push('Alt');
      keys.push(event.key.toUpperCase());

      const shortcut = keys.join('+');

      if (shortcuts[shortcut]) {
        event.preventDefault();
        shortcuts[shortcut]();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [shortcuts]);

  const value = {
    screenReaderMode,
    setScreenReaderMode,
    highContrastMode,
    setHighContrastMode,
    reducedMotion,
    setReducedMotion,
    fontScale,
    setFontScale,
    announce,
    shortcuts,
    registerShortcut,
    unregisterShortcut
  };

  return (
    <AccessibilityContext.Provider value={value}>
      {children}
    </AccessibilityContext.Provider>
  );
};
