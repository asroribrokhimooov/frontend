import { forwardRef } from 'react';
import { cn } from '../../utils/cn';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      label,
      error,
      leftIcon,
      rightIcon,
      id: idProp,
      disabled,
      ...props
    },
    ref
  ) => {
    const id = idProp ?? props.name ?? `input-${Math.random().toString(36).slice(2)}`;

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={id}
            className="block text-sm font-medium text-[#1F2937] mb-1.5"
          >
            {label}
          </label>
        )}
        <div className="relative">
          {leftIcon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
              {leftIcon}
            </div>
          )}
          <input
            ref={ref}
            id={id}
            disabled={disabled}
            className={cn(
              'w-full rounded-[1.25rem] border border-transparent bg-gray-50/50 hover:bg-white transition-all duration-300 shadow-inner',
              'placeholder:text-gray-400 text-[#1F2937]',
              'focus:outline-none focus:ring-4 focus:ring-[#3B82F6]/15 focus:border-[#3B82F6]/30 focus:bg-white focus:shadow-sm',
              'disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed',
              leftIcon && 'pl-10',
              rightIcon && 'pr-10',
              !leftIcon && 'pl-5',
              !rightIcon && 'pr-5',
              'py-3.5',
              error
                ? 'border-red-300 bg-red-50/50 focus:border-red-500 focus:ring-red-500/20'
                : '',
              className
            )}
            {...props}
          />
          {rightIcon && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
              {rightIcon}
            </div>
          )}
        </div>
        {error && (
          <p className="mt-1.5 text-sm text-red-600">{error}</p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
