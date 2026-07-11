import React from "react";
import clsx from "clsx";

const baseStyles = `
  inline-flex items-center justify-center font-semibold rounded-xl
  transition-all duration-200 ease-out
  focus:outline-none focus:ring-2 focus:ring-offset-2
  disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none
  active:scale-[0.98]
`;

const variantStyles = {
  primary: `
    bg-gradient-to-r from-blue-500 to-blue-600 text-white
    hover:from-blue-600 hover:to-blue-700 hover:shadow-lg hover:-translate-y-0.5
    focus:ring-blue-500
    shadow-md
  `,
  secondary: `
    bg-white text-slate-700 border-2 border-slate-200
    hover:bg-slate-50 hover:border-slate-300 hover:shadow-md hover:-translate-y-0.5
    focus:ring-slate-400
    shadow-sm
  `,
  danger: `
    bg-gradient-to-r from-red-500 to-red-600 text-white
    hover:from-red-600 hover:to-red-700 hover:shadow-lg hover:-translate-y-0.5
    focus:ring-red-500
    shadow-md
  `,
  success: `
    bg-gradient-to-r from-green-500 to-green-600 text-white
    hover:from-green-600 hover:to-green-700 hover:shadow-lg hover:-translate-y-0.5
    focus:ring-green-500
    shadow-md
  `,
  ghost: `
    bg-transparent text-slate-600
    hover:bg-slate-100 hover:text-slate-900
    focus:ring-slate-400
  `,
  outline: `
    bg-transparent text-blue-600 border-2 border-blue-200
    hover:bg-blue-50 hover:border-blue-300 hover:shadow-md hover:-translate-y-0.5
    focus:ring-blue-500
  `,
  gradient: `
    bg-gradient-to-r from-blue-500 via-purple-500 to-blue-600 text-white
    hover:from-blue-600 hover:via-purple-600 hover:to-blue-700 hover:shadow-xl hover:-translate-y-1
    focus:ring-blue-500
    shadow-lg
    bg-[length:200%_200%] animate-gradient
  `,
};

const sizeStyles = {
  xs: "px-2.5 py-1 text-xs gap-1",
  sm: "px-3.5 py-1.5 text-sm gap-1.5",
  md: "px-[clamp(0.8rem,2vw,1.6rem)] py-[clamp(0.4rem,1vw,0.8rem)] text-[clamp(0.85rem,1vw,1rem)] gap-2",
  lg: "px-6 py-3 text-base gap-2",
  xl: "px-8 py-4 text-lg gap-2.5",
};

const LoadingSpinner = ({ size }) => {
  const spinnerSizes = {
    xs: "h-3 w-3",
    sm: "h-3.5 w-3.5",
    md: "h-4 w-4",
    lg: "h-5 w-5",
    xl: "h-6 w-6",
  };
  
  return (
    <svg
      className={clsx("animate-spin", spinnerSizes[size])}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
};

export const Button = ({
  children,
  variant = "primary",
  size = "md",
  loading = false,
  disabled,
  icon,
  iconPosition = "left",
  fullWidth = false,
  rounded = false,
  className,
  ...props
}) => (
  <button
    className={clsx(
      baseStyles,
      variantStyles[variant],
      sizeStyles[size],
      loading && "opacity-80 cursor-wait",
      fullWidth && "w-full",
      rounded && "!rounded-full",
      className
    )}
    disabled={disabled || loading}
    {...props}
  >
    {loading ? (
      <LoadingSpinner size={size} />
    ) : (
      icon && iconPosition === "left" && <span className="flex-shrink-0">{icon}</span>
    )}
    {children}
    {!loading && icon && iconPosition === "right" && (
      <span className="flex-shrink-0">{icon}</span>
    )}
  </button>
);
