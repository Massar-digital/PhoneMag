import React from "react";
import clsx from "clsx";

// type InputType = "text" | "number" | "email" | "password" | "search" | "date" | "tel" | "url";
// type InputSize = "sm" | "md" | "lg";

// interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
//   label;
//   helperText;
//   error;
//   type: InputType;
//   inputSize: InputSize;
//   icon: React.ReactNode;
//   iconPosition: "left" | "right";
//   leftIcon: React.ReactNode;
//   success;
// }

const sizeClasses = {
  sm: "px-3 py-1.5 text-xs",
  md: "px-3.5 py-2.5 text-sm sm:text-base",
  lg: "px-5 py-3.5 text-lg",
};

export const Input = React.forwardRef(({
  label,
  helperText,
  error,
  type = "text",
  inputSize = "md",
  disabled,
  id,
  icon,
  iconPosition = "left",
  leftIcon,
  success,
  className,
  ...props
}, ref) => {
  const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`;
  
  // Support both icon prop and leftIcon prop
  const leftIconElement = leftIcon || (icon && iconPosition === "left" ? icon : null);
  const rightIconElement = icon && iconPosition === "right" ? icon : null;
  
  return (
    <div className={`mb-3 sm:mb-4 ${className}`}>
      {label && (
        <label 
          htmlFor={inputId} 
          className="block mb-2 text-sm font-medium text-slate-700"
        >
          {label}
          {props.required && <span className="text-danger-500 ml-1">*</span>}
        </label>
      )}
      <div className="relative">
        {leftIconElement && (
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
            {leftIconElement}
          </div>
        )}
        <input
          ref={ref}
          id={inputId}
          type={type}
          disabled={disabled}
          className={clsx(
            "w-full rounded-xl border-2 bg-white transition-all duration-200",
            "placeholder:text-slate-400",
            "focus:outline-none focus:ring-4",
            sizeClasses[inputSize],
            leftIconElement && "pl-11",
            rightIconElement && "pr-11",
            error 
              ? "border-danger-300 focus:border-danger-500 focus:ring-danger-100 text-danger-900" 
              : success
                ? "border-success-300 focus:border-success-500 focus:ring-success-100"
                : "border-slate-200 hover:border-slate-300 focus:border-primary-400 focus:ring-primary-100",
            disabled && "bg-slate-50 text-slate-400 cursor-not-allowed border-slate-100",
            className
          )}
          {...props}
        />
        {rightIconElement && (
          <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400">
            {rightIconElement}
          </div>
        )}
        {error && (
          <div className="absolute right-4 top-1/2 -translate-y-1/2">
            <svg className="w-5 h-5 text-danger-500" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </div>
        )}
        {success && !error && (
          <div className="absolute right-4 top-1/2 -translate-y-1/2">
            <svg className="w-5 h-5 text-success-500" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
          </div>
        )}
      </div>
      {helperText && !error && (
        <p className="mt-2 text-sm text-slate-500">{helperText}</p>
      )}
      {error && (
        <p className="mt-2 text-sm text-danger-600 flex items-center gap-1">
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          {error}
        </p>
      )}
    </div>
  );
});
