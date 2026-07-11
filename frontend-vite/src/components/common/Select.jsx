import React, { useState, useMemo, useRef, useEffect } from "react";
import clsx from "clsx";

// interface Option {
//   label: string;
//   value: string | number;
//   icon: React.ReactNode;
// }

// interface SelectProps {
//   options: Option[];
//   value: string | number;
//   onChange: (value: string | number) => void;
//   placeholder: string;
//   searchable: boolean;
//   disabled: boolean;
//   label: string;
//   name: string;
//   error: string;
//   required: boolean;
//   className: string;
//   size: "sm" | "md" | "lg";
// }

const sizeClasses = {
  sm: "px-3 py-2 text-sm",
  md: "px-4 py-3 text-sm",
  lg: "px-5 py-4 text-base",
};

export const Select = ({
  options,
  value,
  onChange,
  placeholder = "Select an option...",
  searchable = false,
  disabled = false,
  label,
  name,
  error,
  required = false,
  className = "",
  size = "md",
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const selectRef = useRef(null);
  const selectId = `select-${Math.random().toString(36).substr(2, 9)}`;

  const filteredOptions = useMemo(
    () =>
      searchable && search
        ? options.filter((opt) =>
            opt.label.toLowerCase().includes(search.toLowerCase())
          )
        : options,
    [search, options, searchable]
  );

  const normalizeValue = (val) => (val === null || val === undefined ? "" : String(val));
  const normalizedValue = normalizeValue(value);
  const selectedOption = options.find(opt => normalizeValue(opt.value) === normalizedValue);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (selectRef.current && !selectRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className={clsx("mb-4", className)} ref={selectRef}>
      {label && (
        <label htmlFor={selectId} className="block mb-2 text-sm font-medium text-slate-700">
          {label} {required && <span className="text-danger-500">*</span>}
        </label>
      )}
      
      <div className="relative">
        {/* Trigger button */}
        <button
          type="button"
          id={selectId}
          onClick={() => !disabled && setIsOpen(!isOpen)}
          className={clsx(
            "w-full rounded-xl border-2 bg-white transition-all duration-200 text-left",
            "flex items-center justify-between gap-2",
            sizeClasses[size],
            isOpen && "ring-4 ring-primary-100 border-primary-400",
            error 
              ? "border-danger-300 focus:border-danger-500 focus:ring-danger-100" 
              : "border-slate-200 hover:border-slate-300 focus:border-primary-400 focus:ring-primary-100",
            disabled && "bg-slate-50 text-slate-400 cursor-not-allowed border-slate-100",
            "focus:outline-none"
          )}
          disabled={disabled}
          aria-expanded={isOpen}
          aria-haspopup="listbox"
        >
          <span className={clsx(selectedOption ? "text-slate-900" : "text-slate-400")}>
            {selectedOption?.label || placeholder}
          </span>
          <svg 
            className={clsx(
              "w-5 h-5 text-slate-400 transition-transform duration-200",
              isOpen && "rotate-180"
            )} 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {/* Dropdown */}
        {isOpen && (
          <div className={clsx(
            "absolute z-50 w-full mt-2 bg-white rounded-xl border border-slate-200",
            "shadow-xl shadow-slate-200/50 overflow-hidden",
            "animate-scale-in origin-top"
          )}>
            {/* Search input */}
            {searchable && (
              <div className="p-2 border-b border-slate-100">
                <div className="relative">
                  <svg 
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <input
                    type="text"
                    className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-100 focus:border-primary-400"
                    placeholder="Search..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>
              </div>
            )}

            {/* Options list */}
            <ul 
              className="max-h-60 overflow-auto py-1"
              role="listbox"
            >
              {filteredOptions.length === 0 ? (
                <li className="px-4 py-3 text-sm text-slate-500 text-center">
                  No options found
                </li>
              ) : (
                filteredOptions.map((opt) => (
                  <li
                    key={opt.value}
                    role="option"
                    aria-selected={normalizeValue(opt.value) === normalizedValue}
                    className={clsx(
                      "px-4 py-2.5 text-sm cursor-pointer transition-colors flex items-center gap-2",
                      normalizeValue(opt.value) === normalizedValue
                        ? "bg-primary-50 text-primary-700 font-medium" 
                        : "text-slate-700 hover:bg-slate-50"
                    )}
                    onClick={() => {
                      onChange(opt.value);
                      setIsOpen(false);
                      setSearch("");
                    }}
                  >
                    {opt.icon && <span className="flex-shrink-0">{opt.icon}</span>}
                    <span>{opt.label}</span>
                    {normalizeValue(opt.value) === normalizedValue && (
                      <svg className="w-4 h-4 ml-auto text-primary-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </li>
                ))
              )}
            </ul>
          </div>
        )}

        {/* Hidden native select for form submission */}
        <select
          name={name}
          value={normalizedValue}
          onChange={(e) => onChange(e.target.value)}
          className="sr-only"
          tabIndex={-1}
          required={required}
        >
          <option value="" disabled>{placeholder}</option>
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>

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
};
