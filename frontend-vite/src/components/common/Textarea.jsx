import React from "react";
import clsx from "clsx";

// interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
//   label: string;
//   helperText: string;
//   error: string;
// }

export const Textarea = ({
  label,
  helperText,
  error,
  disabled,
  id,
  rows = 3,
  ...props
}) => {
  const textareaId = id || `textarea-${Math.random().toString(36).substr(2, 9)}`;
  return (
    <div className="mb-4">
      {label && (
        <label htmlFor={textareaId} className="block mb-1 font-medium text-gray-700">
          {label}
        </label>
      )}
      <textarea
        id={textareaId}
        disabled={disabled}
        rows={rows}
        className={clsx(
          "w-full px-4 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500 transition",
          error ? "border-red-500 focus:ring-red-500" : "border-gray-300",
          disabled && "bg-gray-100 cursor-not-allowed opacity-60"
        )}
        {...props}
      />
      {helperText && !error && (
        <p className="mt-1 text-sm text-gray-500">{helperText}</p>
      )}
      {error && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}
    </div>
  );
};
