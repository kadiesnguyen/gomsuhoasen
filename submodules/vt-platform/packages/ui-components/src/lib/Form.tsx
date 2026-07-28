import * as React from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  fullWidth?: boolean;
  startIcon?: React.ReactNode;
  endIcon?: React.ReactNode;
}

const renderLabelContent = (label: string, required?: boolean) => (
  <>
    {label}
    {required ? <span aria-hidden="true" className="ml-1 text-red-500">*</span> : null}
  </>
);

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className = '', fullWidth = true, startIcon, endIcon, ...props }, ref) => {
    const generatedId = React.useId();
    const inputId = props.id ?? generatedId;
    return (
      <div className={`flex flex-col gap-1.5 ${fullWidth ? 'w-full' : ''}`}>
        {label && (
          <label htmlFor={inputId} className="text-xs font-semibold text-zinc-700 uppercase tracking-wide">
            {renderLabelContent(label, props.required)}
          </label>
        )}
        <div className="relative flex items-center">
          {startIcon && (
            <div className="absolute left-3 text-zinc-400 flex items-center pointer-events-none">
              {startIcon}
            </div>
          )}
          <input
            ref={ref}
            id={inputId}
            className={`w-full px-3 py-2 text-sm bg-white border border-zinc-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-600/10 focus:border-blue-600 transition-all placeholder:text-zinc-400 disabled:bg-zinc-50 disabled:text-zinc-500 
              ${startIcon ? 'pl-10' : ''} 
              ${endIcon ? 'pr-10' : ''} 
              ${error ? 'border-red-500 focus:border-red-500 focus:ring-red-500/10' : ''} 
              ${className}`}
            {...props}
          />
          {endIcon && (
            <div className="absolute right-3 text-zinc-400 flex items-center pointer-events-none">
              {endIcon}
            </div>
          )}
        </div>
        {error && <span className="text-xs text-red-500">{error}</span>}
      </div>
    );
  },
);
Input.displayName = 'Input';

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  fullWidth?: boolean;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, className = '', fullWidth = true, ...props }, ref) => {
    const generatedId = React.useId();
    const textareaId = props.id ?? generatedId;
    return (
      <div className={`flex flex-col gap-1.5 ${fullWidth ? 'w-full' : ''}`}>
        {label && (
          <label htmlFor={textareaId} className="text-xs font-semibold text-zinc-700 uppercase tracking-wide">
            {renderLabelContent(label, props.required)}
          </label>
        )}
        <textarea
          ref={ref}
          id={textareaId}
          className={`px-3 py-2 text-sm bg-white border border-zinc-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-600/10 focus:border-blue-600 transition-all placeholder:text-zinc-400 disabled:bg-zinc-50 ${error ? 'border-red-500' : ''} ${className}`}
          {...props}
        />
        {error && <span className="text-xs text-red-500">{error}</span>}
      </div>
    );
  },
);
Textarea.displayName = 'Textarea';

export interface SelectOption {
  label: string;
  value: string | number;
}

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  fullWidth?: boolean;
  options: SelectOption[];
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  (
    { label, error, className = '', fullWidth = true, options, ...props },
    ref,
  ) => {
    const generatedId = React.useId();
    const selectId = props.id ?? generatedId;
    return (
      <div className={`flex flex-col gap-1.5 ${fullWidth ? 'w-full' : ''}`}>
        {label && (
          <label htmlFor={selectId} className="text-xs font-semibold text-zinc-700 uppercase tracking-wide">
            {renderLabelContent(label, props.required)}
          </label>
        )}
        <div className="relative">
          <select
            ref={ref}
            id={selectId}
            className={`w-full appearance-none px-3 py-2 text-sm bg-white border border-zinc-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-600/10 focus:border-blue-600 transition-all cursor-pointer disabled:bg-zinc-50 ${error ? 'border-red-500' : ''} ${className}`}
            {...props}
          >
            {options.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none text-zinc-500">
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M19 9l-7 7-7-7"
              ></path>
            </svg>
          </div>
        </div>
        {error && <span className="text-xs text-red-500">{error}</span>}
      </div>
    );
  },
);
Select.displayName = 'Select';
