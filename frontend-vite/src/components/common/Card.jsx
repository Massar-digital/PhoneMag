import React from 'react';
import clsx from 'clsx';

const variantClasses = {
  default: `
    bg-white
    border border-slate-200/80
    shadow-sm
  `,
  elevated: `
    bg-white
    border border-slate-100
    shadow-lg
  `,
  outlined: `
    bg-white
    border-2 border-slate-200
  `,
  glass: `
    bg-white/80 backdrop-blur-xl
    border border-white/60
    shadow-lg
  `,
  gradient: `
    bg-gradient-to-br from-blue-500 to-blue-600
    text-white
    border-0
    shadow-lg
  `,
  stats: `
    bg-gradient-to-br from-white to-slate-50/80
    border border-slate-200/60
    shadow-md
  `,
};

const paddingClasses = {
  none: '',
  sm: 'p-[clamp(0.5rem,1.5vw,1rem)]',
  md: 'p-[clamp(1rem,3vw,2rem)]',
  lg: 'p-[clamp(2rem,5vw,4rem)]',
};

const roundedClasses = {
  md: 'rounded-lg',
  lg: 'rounded-xl',
  xl: 'rounded-2xl',
  '2xl': 'rounded-3xl',
  '3xl': 'rounded-[2rem]',
};

export const Card = ({
  header,
  body,
  footer,
  variant = 'default',
  className = '',
  children,
  hoverable = false,
  padding = 'none',
  rounded = '2xl',
}) => (
  <div
    className={clsx(
      'overflow-hidden transition-all duration-300 ease-out container-responsive flex flex-col min-h-0',
      variantClasses[variant],
      roundedClasses[rounded],
      paddingClasses[padding],
      hoverable && 'hover:shadow-xl hover:-translate-y-1 hover:border-slate-300/60 cursor-pointer',
      className
    )}
  >
    {header && (
      <div className={clsx(
        "px-6 py-4 border-b font-semibold shrink-0",
        variant === 'gradient' ? 'border-white/20' : 'border-slate-100'
      )}>
        {header}
      </div>
    )}
    {body && <div className="px-6 py-5 overflow-auto min-h-0">{body}</div>}
    {children && <div className={clsx("flex-1 overflow-auto min-h-0", padding === 'none' ? 'px-6 py-5' : '')}>{children}</div>}
    {footer && (
      <div className={clsx(
        "px-6 py-4 border-t shrink-0",
        variant === 'gradient' ? 'border-white/20 bg-white/10' : 'border-slate-100 bg-slate-50/50'
      )}>
        {footer}
      </div>
    )}
  </div>
);
