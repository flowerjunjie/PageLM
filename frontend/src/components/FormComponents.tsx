/**
 * FormComponents
 * Complete form component library with validation and accessibility
 */

import { useState, useCallback, useRef, useEffect, forwardRef, ForwardedRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Badge } from './Badge';

// ============================================
// Type Definitions
// ============================================

export type InputSize = 'sm' | 'md' | 'lg';
export type InputVariant = 'default' | 'filled' | 'outlined';
export type InputState = 'default' | 'error' | 'success' | 'warning';

export interface BaseInputProps {
  id?: string;
  name?: string;
  label?: string;
  error?: string;
  helperText?: string;
  required?: boolean;
  disabled?: boolean;
  readOnly?: boolean;
  size?: InputSize;
  state?: InputState;
  className?: string;
  fullWidth?: boolean;
}

export interface ValidationRule {
  validate: (value: any) => boolean | string;
  message: string;
}

export interface FormInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'>, BaseInputProps {
  type?: 'text' | 'email' | 'password' | 'number' | 'tel' | 'url';
  variant?: InputVariant;
  startIcon?: React.ReactNode;
  endIcon?: React.ReactNode;
  onEndIconClick?: () => void;
  showPasswordToggle?: boolean;
  autoComplete?: string;
}

export interface FormTextareaProps extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'size'>, BaseInputProps {
  variant?: InputVariant;
  autoResize?: boolean;
  maxRows?: number;
  minRows?: number;
}

export interface FormSelectOption {
  value: string | number;
  label: string;
  disabled?: boolean;
}

export interface FormSelectProps extends BaseInputProps {
  options: FormSelectOption[];
  placeholder?: string;
  variant?: InputVariant;
  multiple?: boolean;
  searchable?: boolean;
}

export interface FormCheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: string;
  description?: string;
  indeterminate?: boolean;
  size?: InputSize;
  state?: InputState;
  error?: string;
  required?: boolean;
}

export interface FormRadioGroupProps {
  name: string;
  label?: string;
  options: FormSelectOption[];
  value?: string | number;
  onChange: (value: string | number) => void;
  error?: string;
  helperText?: string;
  required?: boolean;
  disabled?: boolean;
  orientation?: 'horizontal' | 'vertical';
  size?: InputSize;
}

export interface FormSwitchProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: string;
  description?: string;
  size?: InputSize;
}

export interface FormSliderProps {
  label?: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  marks?: Array<{ value: number; label: string }>;
  showValue?: boolean;
  disabled?: boolean;
  helperText?: string;
  error?: string;
}

export interface FormDatePickerProps extends BaseInputProps {
  value?: string;
  onChange: (value: string) => void;
  minDate?: string;
  maxDate?: string;
  placeholder?: string;
  variant?: InputVariant;
}

export interface FormLabelProps {
  htmlFor?: string;
  required?: boolean;
  error?: boolean;
  children: React.ReactNode;
  className?: string;
}

export interface FormErrorProps {
  error?: string;
  className?: string;
}

// ============================================
// Utility Functions
// ============================================

export const formValidators = {
  required: (message?: string): ValidationRule => ({
    validate: (value) => value !== undefined && value !== null && value !== '',
    message: message || 'This field is required'
  }),

  email: (message?: string): ValidationRule => ({
    validate: (value) => !value || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
    message: message || 'Please enter a valid email address'
  }),

  minLength: (min: number, message?: string): ValidationRule => ({
    validate: (value) => !value || value.length >= min,
    message: message || `Minimum length is ${min} characters`
  }),

  maxLength: (max: number, message?: string): ValidationRule => ({
    validate: (value) => !value || value.length <= max,
    message: message || `Maximum length is ${max} characters`
  }),

  pattern: (regex: RegExp, message?: string): ValidationRule => ({
    validate: (value) => !value || regex.test(value),
    message: message || 'Please match the required format'
  }),

  min: (min: number, message?: string): ValidationRule => ({
    validate: (value) => !value || Number(value) >= min,
    message: message || `Minimum value is ${min}`
  }),

  max: (max: number, message?: string): ValidationRule => ({
    validate: (value) => !value || Number(value) <= max,
    message: message || `Maximum value is ${max}`
  }),

  url: (message?: string): ValidationRule => ({
    validate: (value) => !value || /^https?:\/\/.+/.test(value),
    message: message || 'Please enter a valid URL'
  })
};

export function validateForm(values: Record<string, any>, rules: Record<string, ValidationRule[]>): Record<string, string> {
  const errors: Record<string, string> = {};

  Object.entries(rules).forEach(([field, fieldRules]) => {
    const value = values[field];
    for (const rule of fieldRules) {
      const result = rule.validate(value);
      if (result !== true) {
        errors[field] = typeof result === 'string' ? result : rule.message;
        break;
      }
    }
  });

  return errors;
}

// ============================================
// Helper Components
// ============================================

export function FormLabel({ htmlFor, required, error, children, className = '' }: FormLabelProps) {
  const { t } = useTranslation('common');

  return (
    <label
      htmlFor={htmlFor}
      className={`block text-sm font-medium mb-2 ${error ? 'text-red-500' : 'text-stone-300'} ${className}`}
    >
      {children}
      {required && (
        <span className="text-red-500 ml-1" aria-label="required">
          *
        </span>
      )}
    </label>
  );
}

export function FormError({ error, className = '' }: FormErrorProps) {
  if (!error) return null;

  return (
    <p className={`mt-1.5 text-sm text-red-500 flex items-center gap-1 ${className}`}>
      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
      </svg>
      {error}
    </p>
  );
}

// ============================================
// Form Input Components
// ============================================

const sizeStyles: Record<InputSize, string> = {
  sm: 'px-3 py-2 text-sm',
  md: 'px-4 py-2.5 text-base',
  lg: 'px-4 py-3 text-lg'
};

const variantStyles: Record<InputVariant, string> = {
  default: 'bg-stone-900/50 border-stone-700',
  filled: 'bg-stone-800 border-transparent',
  outlined: 'bg-transparent border-stone-700'
};

const stateStyles: Record<InputState, string> = {
  default: 'focus:border-sky-500 focus:ring-sky-500',
  error: 'border-red-500 focus:border-red-500 focus:ring-red-500',
  success: 'border-emerald-500 focus:border-emerald-500 focus:ring-emerald-500',
  warning: 'border-amber-500 focus:border-amber-500 focus:ring-amber-500'
};

export const FormInput = forwardRef<HTMLInputElement, FormInputProps>(({
  id,
  name,
  type = 'text',
  label,
  error,
  helperText,
  required = false,
  disabled = false,
  readOnly = false,
  size = 'md',
  state = error ? 'error' : 'default',
  variant = 'default',
  startIcon,
  endIcon,
  onEndIconClick,
  showPasswordToggle = false,
  autoComplete,
  className = '',
  fullWidth = true,
  ...props
}, ref) => {
  const { t } = useTranslation('common');
  const [showPassword, setShowPassword] = useState(false);
  const inputId = id || name;

  const inputType = type === 'password' && showPassword ? 'text' : type;
  const hasError = !!error;

  return (
    <div className={fullWidth ? 'w-full' : ''}>
      {label && (
        <FormLabel htmlFor={inputId} required={required} error={hasError}>
          {label}
        </FormLabel>
      )}

      <div className="relative">
        {startIcon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-500 pointer-events-none">
            {startIcon}
          </div>
        )}

        <input
          ref={ref}
          id={inputId}
          name={name}
          type={inputType}
          autoComplete={autoComplete}
          disabled={disabled}
          readOnly={readOnly}
          aria-invalid={hasError}
          aria-describedby={error ? `${inputId}-error` : helperText ? `${inputId}-helper` : undefined}
          className={`
            block w-full rounded-lg border transition-all duration-200
            ${sizeStyles[size]} ${variantStyles[variant]} ${stateStyles[state]}
            ${startIcon ? 'pl-10' : ''} ${endIcon || showPasswordToggle ? 'pr-10' : ''}
            ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
            ${readOnly ? 'bg-stone-800/50 cursor-default' : ''}
            text-stone-200 placeholder-stone-500
            focus:ring-2 focus:outline-none
            ${className}
          `}
          {...props}
        />

        {(endIcon || showPasswordToggle) && (
          <div
            className={`absolute right-3 top-1/2 -translate-y-1/2 ${onEndIconClick || showPasswordToggle ? 'cursor-pointer' : ''} text-stone-500 hover:text-stone-300`}
            onClick={() => {
              if (showPasswordToggle) {
                setShowPassword(!showPassword);
              }
              onEndIconClick?.();
            }}
          >
            {showPasswordToggle ? (
              showPassword ? (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                </svg>
              )
            ) : (
              endIcon
            )}
          </div>
        )}
      </div>

      <FormError error={error} />

      {helperText && !error && (
        <p id={`${inputId}-helper`} className="mt-1.5 text-sm text-stone-500">
          {helperText}
        </p>
      )}
    </div>
  );
});

FormInput.displayName = 'FormInput';

export const FormTextarea = forwardRef<HTMLTextAreaElement, FormTextareaProps>(({
  id,
  name,
  label,
  error,
  helperText,
  required = false,
  disabled = false,
  readOnly = false,
  size = 'md',
  state = error ? 'error' : 'default',
  variant = 'default',
  autoResize = false,
  maxRows = 10,
  minRows = 2,
  className = '',
  fullWidth = true,
  value,
  ...props
}, ref) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const internalRef = (ref as React.RefObject<HTMLTextAreaElement>) || textareaRef;
  const inputId = id || name;
  const hasError = !!error;

  // Auto-resize functionality
  useEffect(() => {
    if (autoResize && internalRef.current) {
      const textarea = internalRef.current;
      textarea.style.height = 'auto';
      const newHeight = Math.min(
        Math.max(textarea.scrollHeight, minRows * 24),
        maxRows * 24
      );
      textarea.style.height = `${newHeight}px`;
    }
  }, [value, autoResize, minRows, maxRows, internalRef]);

  return (
    <div className={fullWidth ? 'w-full' : ''}>
      {label && (
        <FormLabel htmlFor={inputId} required={required} error={hasError}>
          {label}
        </FormLabel>
      )}

      <textarea
        ref={internalRef}
        id={inputId}
        name={name}
        value={value}
        disabled={disabled}
        readOnly={readOnly}
        aria-invalid={hasError}
        aria-describedby={error ? `${inputId}-error` : helperText ? `${inputId}-helper` : undefined}
        rows={minRows}
        className={`
          block w-full rounded-lg border transition-all duration-200 resize-none
          ${sizeStyles[size]} ${variantStyles[variant]} ${stateStyles[state]}
          ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
          ${readOnly ? 'bg-stone-800/50 cursor-default' : ''}
          text-stone-200 placeholder-stone-500
          focus:ring-2 focus:outline-none
          ${autoResize ? 'overflow-hidden' : 'custom-scroll'}
          ${className}
        `}
        {...props}
      />

      <FormError error={error} />

      {helperText && !error && (
        <p id={`${inputId}-helper`} className="mt-1.5 text-sm text-stone-500">
          {helperText}
        </p>
      )}
    </div>
  );
});

FormTextarea.displayName = 'FormTextarea';

export const FormSelect = forwardRef<HTMLSelectElement, FormSelectProps>(({
  id,
  name,
  label,
  options,
  placeholder,
  error,
  helperText,
  required = false,
  disabled = false,
  size = 'md',
  state = error ? 'error' : 'default',
  variant = 'default',
  multiple = false,
  className = '',
  fullWidth = true,
  ...props
}, ref) => {
  const inputId = id || name;
  const hasError = !!error;

  return (
    <div className={fullWidth ? 'w-full' : ''}>
      {label && (
        <FormLabel htmlFor={inputId} required={required} error={hasError}>
          {label}
        </FormLabel>
      )}

      <select
        ref={ref}
        id={inputId}
        name={name}
        disabled={disabled}
        multiple={multiple}
        aria-invalid={hasError}
        aria-describedby={error ? `${inputId}-error` : helperText ? `${inputId}-helper` : undefined}
        className={`
          block w-full rounded-lg border transition-all duration-200
          ${sizeStyles[size]} ${variantStyles[variant]} ${stateStyles[state]}
          ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
          text-stone-200 bg-stone-900/50
          focus:ring-2 focus:outline-none
          ${multiple ? 'custom-scroll' : ''}
          ${className}
        `}
        {...props}
      >
        {placeholder && !multiple && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map((option) => (
          <option key={option.value} value={option.value} disabled={option.disabled}>
            {option.label}
          </option>
        ))}
      </select>

      <FormError error={error} />

      {helperText && !error && (
        <p id={`${inputId}-helper`} className="mt-1.5 text-sm text-stone-500">
          {helperText}
        </p>
      )}
    </div>
  );
});

FormSelect.displayName = 'FormSelect';

export function FormCheckbox({
  id,
  name,
  label,
  description,
  checked,
  onChange,
  disabled = false,
  indeterminate = false,
  size = 'md',
  state = 'default',
  error,
  required = false,
  className = ''
}: FormCheckboxProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  // Handle indeterminate state
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.indeterminate = indeterminate;
    }
  }, [indeterminate]);

  const checkboxId = id || name;
  const hasError = !!error;

  const sizeStyles: Record<InputSize, string> = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6'
  };

  return (
    <div className={`flex items-start gap-3 ${className}`}>
      <input
        ref={inputRef}
        id={checkboxId}
        name={name}
        type="checkbox"
        checked={checked}
        onChange={onChange}
        disabled={disabled}
        aria-invalid={hasError}
        aria-describedby={description ? `${checkboxId}-description` : undefined}
        className={`
          ${sizeStyles[size]} mt-0.5 rounded border-stone-600 bg-stone-800
          text-sky-600 focus:ring-2 focus:ring-sky-600 focus:ring-offset-0
          transition-all duration-200 cursor-pointer
          ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
          ${hasError ? 'border-red-500' : ''}
        `}
      />

      {label && (
        <div className="flex-1">
          <label
            htmlFor={checkboxId}
            className={`
              block text-sm font-medium cursor-pointer select-none
              ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
              ${hasError ? 'text-red-500' : 'text-stone-200'}
            `}
          >
            {label}
            {required && (
              <span className="text-red-500 ml-1">*</span>
            )}
          </label>

          {description && (
            <p
              id={`${checkboxId}-description`}
              className="text-sm text-stone-500 mt-0.5"
            >
              {description}
            </p>
          )}

          <FormError error={error} />
        </div>
      )}
    </div>
  );
}

export function FormRadioGroup({
  name,
  label,
  options,
  value,
  onChange,
  error,
  helperText,
  required = false,
  disabled = false,
  orientation = 'vertical',
  size = 'md'
}: FormRadioGroupProps) {
  const hasError = !!error;

  const sizeStyles: Record<InputSize, string> = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6'
  };

  return (
    <div>
      {label && (
        <FormLabel required={required} error={hasError}>
          {label}
        </FormLabel>
      )}

      <div
        className={`flex gap-4 ${orientation === 'vertical' ? 'flex-col' : 'flex-wrap'}`}
        role="radiogroup"
        aria-invalid={hasError}
        aria-required={required}
      >
        {options.map((option) => (
          <label
            key={option.value}
            className={`
              flex items-center gap-3 p-2 rounded-lg cursor-pointer
              transition-colors duration-150
              ${disabled || option.disabled
                ? 'opacity-50 cursor-not-allowed'
                : 'hover:bg-stone-800/50'
              }
            `}
          >
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={value === option.value}
              onChange={() => onChange(option.value)}
              disabled={disabled || option.disabled}
              className={`
                ${sizeStyles[size]} rounded-full border-stone-600 bg-stone-800
                text-sky-600 focus:ring-2 focus:ring-sky-600 focus:ring-offset-0
                transition-all duration-200
              `}
            />
            <span className="text-stone-200">{option.label}</span>
          </label>
        ))}
      </div>

      <FormError error={error} />

      {helperText && !error && (
        <p className="mt-1.5 text-sm text-stone-500">
          {helperText}
        </p>
      )}
    </div>
  );
}

export function FormSwitch({
  id,
  name,
  label,
  description,
  checked,
  onChange,
  disabled = false,
  size = 'md',
  className = ''
}: FormSwitchProps) {
  const switchId = id || name;

  const sizeStyles: Record<InputSize, string> = {
    sm: 'w-9 h-5',
    md: 'w-11 h-6',
    lg: 'w-14 h-7'
  };

  const thumbSizeStyles: Record<InputSize, string> = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6'
  };

  return (
    <div className={`flex items-center justify-between ${className}`}>
      <div className="flex-1">
        {label && (
          <label
            htmlFor={switchId}
            className={`
              block text-sm font-medium cursor-pointer
              ${disabled ? 'opacity-50 cursor-not-allowed' : 'text-stone-200'}
            `}
          >
            {label}
          </label>
        )}

        {description && (
          <p className="text-sm text-stone-500 mt-0.5">
            {description}
          </p>
        )}
      </div>

      <button
        id={switchId}
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange?.({ target: { checked: !checked } } as any)}
        className={`
          relative inline-flex flex-shrink-0 rounded-full border-2 border-transparent
          transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-sky-600 focus:ring-offset-2 focus:ring-offset-stone-900
          ${sizeStyles[size]}
          ${checked ? 'bg-sky-600' : 'bg-stone-700'}
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        `}
      >
        <span
          className={`
            pointer-events-none inline-block rounded-full bg-white shadow-lg transform transition-transform duration-200 ease-in-out
            ${thumbSizeStyles[size]}
            ${checked ? 'translate-x-full' : 'translate-x-0'}
          `}
        />
      </button>
    </div>
  );
}

export function FormSlider({
  label,
  value,
  onChange,
  min = 0,
  max = 100,
  step = 1,
  marks,
  showValue = true,
  disabled = false,
  helperText,
  error
}: FormSliderProps) {
  const hasError = !!error;
  const percentage = ((value - min) / (max - min)) * 100;

  return (
    <div>
      {label && (
        <div className="flex items-center justify-between mb-2">
          <FormLabel error={hasError}>{label}</FormLabel>
          {showValue && (
            <span className={`text-sm font-medium ${hasError ? 'text-red-500' : 'text-stone-200'}`}>
              {value}
            </span>
          )}
        </div>
      )}

      <div className="relative pt-1">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          disabled={disabled}
          aria-invalid={hasError}
          className="
            w-full h-2 bg-stone-800 rounded-lg appearance-none cursor-pointer
            [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5
            [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-sky-600
            [&::-webkit-slider-thumb]:shadow-lg [&::-webkit-slider-thumb]:transition-transform
            [&::-webkit-slider-thumb]:hover:scale-110
            [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:rounded-full
            [&::-moz-range-thumb]:bg-sky-600 [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:shadow-lg
            disabled:opacity-50 disabled:cursor-not-allowed
          "
          style={{
            background: `linear-gradient(to right, rgb(2 132 199) ${percentage}%, rgb(41 37 36) ${percentage}%)`
          }}
        />

        {marks && (
          <div className="flex justify-between mt-2">
            {marks.map((mark) => {
              const markPercent = ((mark.value - min) / (max - min)) * 100;
              return (
                <div
                  key={mark.value}
                  className="absolute text-xs text-stone-500"
                  style={{ left: `${markPercent}%`, transform: 'translateX(-50%)' }}
                >
                  {mark.label}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <FormError error={error} />

      {helperText && !error && (
        <p className="mt-1.5 text-sm text-stone-500">
          {helperText}
        </p>
      )}
    </div>
  );
}

export const FormDatePicker = forwardRef<HTMLInputElement, FormDatePickerProps>(({
  id,
  name,
  label,
  error,
  helperText,
  required = false,
  disabled = false,
  size = 'md',
  state = error ? 'error' : 'default',
  variant = 'default',
  minDate,
  maxDate,
  placeholder,
  value,
  onChange,
  className = '',
  fullWidth = true
}, ref) => {
  const inputId = id || name;
  const hasError = !!error;

  return (
    <div className={fullWidth ? 'w-full' : ''}>
      {label && (
        <FormLabel htmlFor={inputId} required={required} error={hasError}>
          {label}
        </FormLabel>
      )}

      <input
        ref={ref}
        id={inputId}
        name={name}
        type="date"
        value={value}
        min={minDate}
        max={maxDate}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        aria-invalid={hasError}
        className={`
          block w-full rounded-lg border transition-all duration-200
          ${sizeStyles[size]} ${variantStyles[variant]} ${stateStyles[state]}
          ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
          text-stone-200 bg-stone-900/50
          focus:ring-2 focus:outline-none
          [&::-webkit-calendar-picker-indicator]:filter
          [&::-webkit-calendar-picker-indicator]:invert
          [&::-webkit-calendar-picker-indicator]:opacity-50
          hover:[&::-webkit-calendar-picker-indicator]:opacity-100
          ${className}
        `}
        placeholder={placeholder}
      />

      <FormError error={error} />

      {helperText && !error && (
        <p className="mt-1.5 text-sm text-stone-500">
          {helperText}
        </p>
      )}
    </div>
  );
});

FormDatePicker.displayName = 'FormDatePicker';

// Export all components
export default {
  FormInput,
  FormTextarea,
  FormSelect,
  FormCheckbox,
  FormRadioGroup,
  FormSwitch,
  FormSlider,
  FormDatePicker,
  FormLabel,
  FormError,
  formValidators,
  validateForm
};
