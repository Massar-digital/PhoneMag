import React from 'react';

/**
 * SkipLink Component
 * Provides keyboard navigation shortcuts to jump to main content areas
 */
export const SkipLink = () => {
  return (
    <a
      href="#main-content"
      className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-blue-600 focus:text-white focus:rounded focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-300"
      onFocus={(e) => {
        // Ensure the link is visible when focused
        e.target.style.position = 'fixed';
      }}
      onBlur={(e) => {
        // Hide again when focus moves away
        e.target.style.position = 'absolute';
      }}
    >
      Skip to main content
    </a>
  );
};

/**
 * FocusTrap Hook
 * Traps focus within a container (useful for modals)
 * Returns functions to manually trap and release focus
 */
export const useFocusTrap = () => {
  const previousFocusRef = React.useRef(null);
  const containerRef = React.useRef(null);
  const handleKeyDownRef = React.useRef(null);

  const trapFocus = React.useCallback((container) => {
    // Store currently focused element to restore later
    previousFocusRef.current = document.activeElement;
    containerRef.current = container;

    const focusableElements = container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    const handleKeyDown = (e) => {
      if (e.key === 'Tab') {
        if (e.shiftKey) {
          // Shift + Tab
          if (document.activeElement === firstElement) {
            e.preventDefault();
            lastElement.focus();
          }
        } else {
          // Tab
          if (document.activeElement === lastElement) {
            e.preventDefault();
            firstElement.focus();
          }
        }
      }
    };

    handleKeyDownRef.current = handleKeyDown;
    container.addEventListener('keydown', handleKeyDown);

    // Focus first element when trap activates
    if (firstElement) {
      firstElement.focus();
    }
  }, []);

  const releaseFocus = React.useCallback(() => {
    // Remove event listener
    if (containerRef.current && handleKeyDownRef.current) {
      containerRef.current.removeEventListener('keydown', handleKeyDownRef.current);
    }

    // Restore focus to previous element
    if (previousFocusRef.current && typeof previousFocusRef.current.focus === 'function') {
      previousFocusRef.current.focus();
    }

    // Clean up refs
    containerRef.current = null;
    handleKeyDownRef.current = null;
  }, []);

  // Cleanup on unmount
  React.useEffect(() => {
    return () => {
      if (containerRef.current && handleKeyDownRef.current) {
        containerRef.current.removeEventListener('keydown', handleKeyDownRef.current);
      }
    };
  }, []);

  return { trapFocus, releaseFocus };
};

/**
 * Announce Hook
 * Announces dynamic content changes to screen readers
 */
export const useAnnounce = () => {
  const announceRef = React.useRef(null);

  React.useEffect(() => {
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

  return announce;
};

/**
 * Keyboard Navigation Hook
 * Provides keyboard navigation utilities
 */
export const useKeyboardNavigation = () => {
  const handleKeyboardActivation = React.useCallback((event, action) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      action();
    }
  }, []);

  const handleArrowNavigation = React.useCallback((event, items, currentIndex, onChange) => {
    let newIndex = currentIndex;

    switch (event.key) {
      case 'ArrowUp':
      case 'ArrowLeft':
        event.preventDefault();
        newIndex = currentIndex > 0 ? currentIndex - 1 : items.length - 1;
        break;
      case 'ArrowDown':
      case 'ArrowRight':
        event.preventDefault();
        newIndex = currentIndex < items.length - 1 ? currentIndex + 1 : 0;
        break;
      case 'Home':
        event.preventDefault();
        newIndex = 0;
        break;
      case 'End':
        event.preventDefault();
        newIndex = items.length - 1;
        break;
    }

    if (newIndex !== currentIndex) {
      onChange(newIndex);
    }
  }, []);

  return {
    handleKeyboardActivation,
    handleArrowNavigation
  };
};
