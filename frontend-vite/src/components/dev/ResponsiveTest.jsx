import React, { useState, useEffect } from 'react';
import { Button } from '../common/Button';

// interface ResponsiveTestProps {
//   children: React.ReactNode;
// }

export const ResponsiveTest = ({ children }) => {
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [breakpoint, setBreakpoint] = useState('');

  useEffect(() => {
    const updateDimensions = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      setDimensions({ width, height });

      // Determine breakpoint
      let bp = '';
      if (width >= 1536) bp = '2xl';
      else if (width >= 1280) bp = 'xl';
      else if (width >= 1024) bp = 'lg';
      else if (width >= 768) bp = 'md';
      else if (width >= 640) bp = 'sm';
      else if (width >= 475) bp = 'xs';
      else bp = 'mobile';
      setBreakpoint(bp);
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  const testBreakpoints = [
    { name: 'Mobile', width: 375, height: 667 },
    { name: 'Tablet', width: 768, height: 1024 },
    { name: 'Desktop', width: 1280, height: 720 },
    { name: 'Large', width: 1920, height: 1080 }
  ];

  const setViewport = (width, height) => {
    // This would work in browser dev tools, but for programmatic testing
    // we'd need Puppeteer or similar
    console.log(`Set viewport to ${width}x${height}`);
    window.showToast(`To test this breakpoint, resize your browser window to ${width}x${height} or use browser dev tools device emulation.`, 'info');
  };

  if (process.env.NODE_ENV !== 'development') {
    return <>{children}</>;
  }

  return (
    <div className="relative">
      {/* Responsive Test Bar */}
      <div className="fixed top-0 left-0 right-0 bg-blue-600 text-white p-2 z-50 shadow-lg">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center space-x-4">
            <span className="font-semibold">📱 Responsive Test</span>
            <span>Size: {dimensions.width}×{dimensions.height}</span>
            <span>Breakpoint: <strong>{breakpoint}</strong></span>
          </div>

          <div className="flex items-center space-x-2">
            {testBreakpoints.map((bp) => (
              <Button
                key={bp.name}
                size="sm"
                variant="outline"
                className="bg-white text-blue-600 border-white hover:bg-blue-50"
                onClick={() => setViewport(bp.width, bp.height)}
              >
                {bp.name}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* Content with top padding to account for test bar */}
      <div className="pt-12">
        {children}
      </div>

      {/* Responsive Grid Test Overlay */}
      <div className="fixed inset-0 pointer-events-none z-40 opacity-10">
        <div className="h-full w-full grid grid-cols-12 gap-1">
          {Array.from({ length: 12 }, (_, i) => (
            <div key={i} className="bg-gray-400 border border-gray-500" />
          ))}
        </div>
      </div>
    </div>
  );
};
