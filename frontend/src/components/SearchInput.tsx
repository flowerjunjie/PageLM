/**
 * SearchInput Component
 * Advanced search component with debouncing, suggestions, and filters
 */

import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useDebounce } from '../hooks/useDebounce';
import { Badge } from './Badge';
import { Tag } from './Badge';

// ============================================
// Type Definitions
// ============================================

export type SearchInputVariant = 'simple' | 'with-filters' | 'with-suggestions';

export interface SearchSuggestion {
  id: string;
  text: string;
  type?: 'history' | 'suggestion' | 'result';
  category?: string;
}

export interface SearchFilter {
  key: string;
  label: string;
  value: any;
  removable?: boolean;
}

export interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  onSearch?: (value: string) => void;
  placeholder?: string;
  variant?: SearchInputVariant;
  debounceMs?: number;
  disabled?: boolean;
  loading?: boolean;
  suggestions?: SearchSuggestion[];
  filters?: SearchFilter[];
  onFilterRemove?: (key: string) => void;
  onClearFilters?: () => void;
  showRecentSearches?: boolean;
  recentSearchesKey?: string;
  className?: string;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  autoFocus?: boolean;
}

// ============================================
// Helper Components
// ============================================

interface SearchIconProps {
  className?: string;
}

function SearchIcon({ className = '' }: SearchIconProps) {
  return (
    <svg
      className={`w-5 h-5 ${className}`}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
      />
    </svg>
  );
}

interface ClearButtonProps {
  onClick: () => void;
  ariaLabel: string;
}

function ClearButton({ onClick, ariaLabel }: ClearButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="p-1 text-stone-500 hover:text-stone-300 transition-colors rounded-lg hover:bg-stone-800"
      aria-label={ariaLabel}
    >
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M6 18L18 6M6 6l12 12"
        />
      </svg>
    </button>
  );
}

interface LoadingSpinnerProps {
  className?: string;
}

function LoadingSpinner({ className = '' }: LoadingSpinnerProps) {
  return (
    <div className={`animate-spin ${className}`}>
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24">
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
    </div>
  );
}

interface KeyboardShortcutProps {
  keys: string[];
}

function KeyboardShortcut({ keys }: KeyboardShortcutProps) {
  return (
    <div className="flex items-center gap-1">
      {keys.map((key, index) => (
        <kbd
          key={index}
          className="px-2 py-1 text-xs font-medium text-stone-500 bg-stone-800 border border-stone-700 rounded"
        >
          {key}
        </kbd>
      ))}
    </div>
  );
}

// ============================================
// Main SearchInput Component
// ============================================

export function SearchInput({
  value,
  onChange,
  onSearch,
  placeholder,
  variant = 'simple',
  debounceMs = 300,
  disabled = false,
  loading = false,
  suggestions = [],
  filters = [],
  onFilterRemove,
  onClearFilters,
  showRecentSearches = true,
  recentSearchesKey = 'search-recent',
  className = '',
  onKeyDown,
  autoFocus = false
}: SearchInputProps) {
  const { t } = useTranslation('common');
  const inputRef = useRef<HTMLInputElement>(null);
  const [isFocused, setIsFocused] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  // Load recent searches from localStorage
  useEffect(() => {
    if (showRecentSearches && variant === 'with-suggestions') {
      try {
        const stored = localStorage.getItem(recentSearchesKey);
        if (stored) {
          setRecentSearches(JSON.parse(stored));
        }
      } catch (error) {
        console.error('Failed to load recent searches:', error);
      }
    }
  }, [recentSearchesKey, showRecentSearches, variant]);

  // Debounced value for search
  const debouncedValue = useDebounce(value, debounceMs);

  // Trigger search when debounced value changes
  useEffect(() => {
    if (debouncedValue && onSearch) {
      onSearch(debouncedValue);
    }
  }, [debouncedValue, onSearch]);

  // Show suggestions when focused and has value
  useEffect(() => {
    if (isFocused && (value || suggestions.length > 0 || recentSearches.length > 0)) {
      setShowSuggestions(true);
    } else {
      setShowSuggestions(false);
    }
    setSelectedSuggestionIndex(-1);
  }, [isFocused, value, suggestions.length, recentSearches.length]);

  // Keyboard shortcut to focus (Ctrl+K / Cmd+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Handle input change
  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
  }, [onChange]);

  // Handle clear
  const handleClear = useCallback(() => {
    onChange('');
    inputRef.current?.focus();
  }, [onChange]);

  // Handle suggestion click
  const handleSuggestionClick = useCallback((suggestion: SearchSuggestion) => {
    onChange(suggestion.text);
    setShowSuggestions(false);

    // Add to recent searches
    if (showRecentSearches) {
      const updated = [suggestion.text, ...recentSearches.filter(s => s !== suggestion.text)].slice(0, 10);
      setRecentSearches(updated);
      try {
        localStorage.setItem(recentSearchesKey, JSON.stringify(updated));
      } catch (error) {
        console.error('Failed to save recent searches:', error);
      }
    }

    onSearch?.(suggestion.text);
  }, [onChange, onSearch, recentSearches, showRecentSearches, recentSearchesKey]);

  // Handle keyboard navigation
  const handleInputKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    // Call custom onKeyDown if provided
    onKeyDown?.(e);

    if (!showSuggestions) return;

    const allSuggestions = [
      ...recentSearches.map(text => ({ id: text, text, type: 'history' as const })),
      ...suggestions
    ];

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedSuggestionIndex(prev =>
          prev < allSuggestions.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedSuggestionIndex(prev => (prev > 0 ? prev - 1 : -1));
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedSuggestionIndex >= 0 && allSuggestions[selectedSuggestionIndex]) {
          handleSuggestionClick(allSuggestions[selectedSuggestionIndex]);
        } else if (value) {
          onSearch?.(value);
        }
        break;
      case 'Escape':
        setShowSuggestions(false);
        break;
    }
  }, [showSuggestions, recentSearches, suggestions, selectedSuggestionIndex, handleSuggestionClick, value, onSearch, onKeyDown]);

  // Combined suggestions list
  const allSuggestions = useMemo(() => {
    const historySuggestions: Array<{ id: string; text: string; type: 'history'; category?: string }> = recentSearches
      .filter(s => s.toLowerCase().includes(value.toLowerCase()))
      .map(text => ({
        id: `history-${text}`,
        text,
        type: 'history' as const
      }));

    const filteredSuggestions = suggestions
      .filter(s => s.text.toLowerCase().includes(value.toLowerCase()))
      .map(s => ({
        ...s,
        type: 'suggestion' as const
      }));

    return [...historySuggestions, ...filteredSuggestions];
  }, [recentSearches, suggestions, value]);

  const hasFilters = filters.length > 0;

  return (
    <div className={`relative ${className}`}>
      {/* Search Input Container */}
      <div
        className={`
          relative flex items-center gap-3 px-4 py-3 rounded-xl
          bg-stone-900/50 border border-stone-800
          transition-all duration-200
          ${isFocused ? 'border-sky-600 ring-2 ring-sky-600/20' : 'hover:border-stone-700'}
          ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
        `}
      >
        {/* Search Icon */}
        <SearchIcon className="text-stone-500 flex-shrink-0" />

        {/* Input Field */}
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={handleChange}
          onKeyDown={handleInputKeyDown}
          onFocus={() => setIsFocused(true)}
          onBlur={() => {
            // Delay to allow suggestion clicks
            setTimeout(() => setIsFocused(false), 200);
          }}
          placeholder={placeholder || t('searchPlaceholder', { defaultValue: 'Search...' })}
          disabled={disabled}
          autoFocus={autoFocus}
          className="
            flex-1 bg-transparent border-0 outline-none
            text-stone-100 placeholder-stone-500
            disabled:cursor-not-allowed
          "
          aria-label={t('search', { defaultValue: 'Search' })}
          role="searchbox"
          aria-autocomplete="list"
          aria-controls="search-suggestions"
          aria-expanded={showSuggestions}
          aria-activedescendant={selectedSuggestionIndex >= 0 ? `suggestion-${selectedSuggestionIndex}` : undefined}
        />

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Loading Spinner */}
          {loading && <LoadingSpinner className="text-sky-500" />}

          {/* Clear Button */}
          {value && !loading && !disabled && (
            <ClearButton onClick={handleClear} ariaLabel={t('clearSearch', { defaultValue: 'Clear search' })} />
          )}

          {/* Keyboard Shortcut (only show when not focused) */}
          {!isFocused && !value && !loading && (
            <KeyboardShortcut keys={['Ctrl', 'K']} />
          )}
        </div>
      </div>

      {/* Active Filters Display */}
      {hasFilters && (variant === 'with-filters' || variant === 'with-suggestions') && (
        <div className="flex flex-wrap items-center gap-2 mt-3">
          <span className="text-sm text-stone-500">
            {t('activeFilters', { defaultValue: 'Active filters' })}:
          </span>
          {filters.map((filter) => (
            <Tag
              key={filter.key}
              removable={filter.removable !== false}
              onRemove={() => onFilterRemove?.(filter.key)}
            >
              {filter.label}: {String(filter.value)}
            </Tag>
          ))}
          {onClearFilters && (
            <button
              onClick={onClearFilters}
              className="text-sm text-sky-500 hover:text-sky-400 transition-colors"
            >
              {t('clearAll', { defaultValue: 'Clear all' })}
            </button>
          )}
        </div>
      )}

      {/* Suggestions Dropdown */}
      {showSuggestions && !disabled && (variant === 'with-suggestions' || variant === 'simple') && (
        <div
          id="search-suggestions"
          className="
            absolute z-50 w-full mt-2 bg-stone-900 border border-stone-700
            rounded-xl shadow-xl overflow-hidden
            animate-fade-in-down
          "
          role="listbox"
        >
          {allSuggestions.length > 0 ? (
            <ul className="py-2 max-h-64 overflow-y-auto custom-scroll">
              {allSuggestions.map((suggestion, index) => (
                <li
                  key={suggestion.id}
                  id={`suggestion-${index}`}
                  role="option"
                  aria-selected={selectedSuggestionIndex === index}
                  onClick={() => handleSuggestionClick(suggestion)}
                  className={`
                    px-4 py-3 cursor-pointer transition-colors
                    ${selectedSuggestionIndex === index
                      ? 'bg-sky-600/20 text-sky-400'
                      : 'hover:bg-stone-800 text-stone-200'
                    }
                  `}
                >
                  <div className="flex items-center justify-between">
                    <span>{suggestion.text}</span>
                    {suggestion.type === 'history' && (
                      <Badge variant="outline" size="xs">
                        {t('recent', { defaultValue: 'Recent' })}
                      </Badge>
                    )}
                    {suggestion.category && (
                      <Badge variant="primary" size="xs">
                        {suggestion.category}
                      </Badge>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          ) : value ? (
            <div className="px-4 py-8 text-center text-stone-500">
              {t('noSuggestions', { defaultValue: 'No suggestions found' })}
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}

export default SearchInput;
