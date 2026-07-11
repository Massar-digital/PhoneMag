import React from 'react';
import clsx from 'clsx';

const variantStyles = {
  primary: {
    bg: 'from-primary-500 to-primary-600',
    iconBg: 'bg-primary-400/30',
    shadowColor: 'shadow-primary-500/20',
  },
  success: {
    bg: 'from-success-500 to-success-600',
    iconBg: 'bg-success-400/30',
    shadowColor: 'shadow-success-500/20',
  },
  warning: {
    bg: 'from-warning-500 to-warning-600',
    iconBg: 'bg-warning-400/30',
    shadowColor: 'shadow-warning-500/20',
  },
  danger: {
    bg: 'from-danger-500 to-danger-600',
    iconBg: 'bg-danger-400/30',
    shadowColor: 'shadow-danger-500/20',
  },
  info: {
    bg: 'from-cyan-500 to-cyan-600',
    iconBg: 'bg-cyan-400/30',
    shadowColor: 'shadow-cyan-500/20',
  },
  default: {
    bg: 'from-slate-600 to-slate-700',
    iconBg: 'bg-slate-400/30',
    shadowColor: 'shadow-slate-500/20',
  },
};

export const StatsCard = ({
  title,
  value,
  subtitle,
  icon,
  trend,
  variant = 'default'
}) => {
  const styles = variantStyles[variant];

  return (
    <div className={clsx(
      'relative overflow-hidden rounded-2xl p-[var(--spacing-md)] text-white transition-all duration-300',
      'hover:shadow-xl hover:-translate-y-1',
      'bg-gradient-to-br',
      styles.bg,
      'shadow-lg',
      styles.shadowColor
    )}>
      {/* Decorative elements */}
      <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 rounded-full bg-white/10 blur-2xl" />
      <div className="absolute bottom-0 left-0 -mb-8 -ml-8 w-32 h-32 rounded-full bg-black/10 blur-2xl" />
      
      {/* Content */}
      <div className="relative z-10 flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-white/80 mb-1 truncate">{title}</p>
          <p className="text-2xl xs:text-3xl font-bold tracking-tight mb-1 truncate">
            {typeof value === 'number' ? value.toLocaleString() : value}
          </p>
          {subtitle && (
            <p className="text-sm text-white/70">{subtitle}</p>
          )}
          {trend && (
            <div className={clsx(
              'inline-flex items-center gap-1 mt-3 px-2.5 py-1 rounded-full text-xs font-semibold',
              trend.isPositive ? 'bg-success-500/30 text-success-100' : 'bg-danger-500/30 text-danger-100'
            )}>
              <svg 
                className={clsx('w-3.5 h-3.5', !trend.isPositive && 'rotate-180')} 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 17l9.2-9.2M17 17V7H7" />
              </svg>
              {Math.abs(trend.value)}%
            </div>
          )}
        </div>
        
        {icon && (
          <div className={clsx(
            'flex-shrink-0 w-14 h-14 rounded-2xl flex items-center justify-center',
            styles.iconBg
          )}>
            <div className="w-7 h-7 text-white">
              {icon}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
