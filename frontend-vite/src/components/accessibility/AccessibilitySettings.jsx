import React from 'react';
import { useAccessibility } from './AccessibilityProvider';

export const AccessibilitySettings = () => {
  const {
    screenReaderMode,
    setScreenReaderMode,
    highContrastMode,
    setHighContrastMode,
    reducedMotion,
    setReducedMotion,
    fontScale,
    setFontScale
  } = useAccessibility();

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Accessibility Settings</h3>
        <p className="text-sm text-gray-600 mb-6">
          Customize your accessibility preferences to improve your experience with the application.
        </p>
      </div>

      {/* Font Size */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label htmlFor="font-scale" className="text-sm font-medium text-gray-700">
            Font Size
          </label>
          <span className="text-sm text-gray-500">{Math.round(fontScale * 100)}%</span>
        </div>
        <input
          id="font-scale"
          type="range"
          min="0.8"
          max="1.5"
          step="0.1"
          value={fontScale}
          onChange={(e) => setFontScale(parseFloat(e.target.value))}
          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
          aria-describedby="font-scale-description"
        />
        <p id="font-scale-description" className="text-xs text-gray-500">
          Adjust the font size across the application. Default is 100%.
        </p>
      </div>

      {/* High Contrast Mode */}
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <label htmlFor="high-contrast" className="text-sm font-medium text-gray-700">
            High Contrast Mode
          </label>
          <p className="text-xs text-gray-500 mt-1">
            Increases contrast between text and background colors for better visibility.
          </p>
        </div>
        <button
          id="high-contrast"
          type="button"
          onClick={() => setHighContrastMode(!highContrastMode)}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
            highContrastMode ? 'bg-blue-600' : 'bg-gray-200'
          }`}
          role="switch"
          aria-checked={highContrastMode}
          aria-describedby="high-contrast-description"
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              highContrastMode ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
      </div>

      {/* Reduced Motion */}
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <label htmlFor="reduced-motion" className="text-sm font-medium text-gray-700">
            Reduced Motion
          </label>
          <p className="text-xs text-gray-500 mt-1">
            Minimizes animations and transitions for users who prefer less motion.
          </p>
        </div>
        <button
          id="reduced-motion"
          type="button"
          onClick={() => setReducedMotion(!reducedMotion)}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
            reducedMotion ? 'bg-blue-600' : 'bg-gray-200'
          }`}
          role="switch"
          aria-checked={reducedMotion}
          aria-describedby="reduced-motion-description"
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              reducedMotion ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
      </div>

      {/* Screen Reader Mode */}
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <label htmlFor="screen-reader" className="text-sm font-medium text-gray-700">
            Screen Reader Optimizations
          </label>
          <p className="text-xs text-gray-500 mt-1">
            Enables additional screen reader announcements and navigation aids.
          </p>
        </div>
        <button
          id="screen-reader"
          type="button"
          onClick={() => setScreenReaderMode(!screenReaderMode)}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
            screenReaderMode ? 'bg-blue-600' : 'bg-gray-200'
          }`}
          role="switch"
          aria-checked={screenReaderMode}
          aria-describedby="screen-reader-description"
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              screenReaderMode ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
      </div>

      {/* Keyboard Shortcuts */}
      <div className="border-t pt-6">
        <h4 className="text-sm font-medium text-gray-900 mb-3">Keyboard Shortcuts</h4>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">Skip to main content:</span>
            <kbd className="px-2 py-1 bg-gray-100 rounded text-xs">Tab</kbd>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Focus search:</span>
            <kbd className="px-2 py-1 bg-gray-100 rounded text-xs">Ctrl + /</kbd>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Create new item:</span>
            <kbd className="px-2 py-1 bg-gray-100 rounded text-xs">Ctrl + N</kbd>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Save form:</span>
            <kbd className="px-2 py-1 bg-gray-100 rounded text-xs">Ctrl + S</kbd>
          </div>
        </div>
      </div>

      {/* Accessibility Information */}
      <div className="border-t pt-6">
        <h4 className="text-sm font-medium text-gray-900 mb-3">Accessibility Information</h4>
        <div className="text-sm text-gray-600 space-y-2">
          <p>
            This application follows WCAG 2.1 AA guidelines for web accessibility.
            For more information about accessibility features, visit our{' '}
            <a
              href="#accessibility-statement"
              className="text-blue-600 hover:text-blue-800 underline"
            >
              accessibility statement
            </a>
            .
          </p>
          <p>
            If you encounter any accessibility issues or need assistance,
            please contact our support team.
          </p>
        </div>
      </div>
    </div>
  );
};
