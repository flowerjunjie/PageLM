/**
 * FilterPanel Component
 * Multi-filter panel with various filter types and collapsible sections
 */

import { useState, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardBody, CardHeader } from './Card';
import { Badge } from './Badge';
import { Tag } from './Badge';

// ============================================
// Type Definitions
// ============================================

export type FilterType = 'checkbox' | 'radio' | 'range' | 'date' | 'select';

export interface FilterOption {
  value: string | number;
  label: string;
  count?: number;
  disabled?: boolean;
}

export interface FilterGroup {
  id: string;
  type: FilterType;
  label: string;
  options?: FilterOption[];
  min?: number;
  max?: number;
  step?: number;
  value?: any;
  collapsible?: boolean;
  defaultCollapsed?: boolean;
}

export interface ActiveFilter {
  key: string;
  label: string;
  value: string | number | (string | number)[];
  type: FilterType;
}

export interface FilterPanelProps {
  groups: FilterGroup[];
  values: Record<string, any>;
  onChange: (values: Record<string, any>) => void;
  onClearAll?: () => void;
  className?: string;
  showActiveFilters?: boolean;
  orientation?: 'vertical' | 'horizontal';
}

// ============================================
// Helper Components
// ============================================

interface CheckboxGroupProps {
  options: FilterOption[];
  value: (string | number)[];
  onChange: (value: (string | number)[]) => void;
  disabled?: boolean;
}

function CheckboxGroup({ options, value, onChange, disabled }: CheckboxGroupProps) {
  const { t } = useTranslation('common');

  const handleChange = useCallback((optionValue: string | number, checked: boolean) => {
    if (checked) {
      onChange([...value, optionValue]);
    } else {
      onChange(value.filter(v => v !== optionValue));
    }
  }, [value, onChange]);

  return (
    <div className="space-y-2">
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
            type="checkbox"
            checked={value.includes(option.value)}
            onChange={(e) => handleChange(option.value, e.target.checked)}
            disabled={disabled || option.disabled}
            className="
              w-4 h-4 rounded border-stone-600 bg-stone-800
              text-sky-600 focus:ring-sky-600 focus:ring-2
              disabled:opacity-50
            "
          />
          <span className="flex-1 text-stone-200">{option.label}</span>
          {option.count !== undefined && (
            <Badge variant="outline" size="xs">
              {option.count}
            </Badge>
          )}
        </label>
      ))}
    </div>
  );
}

interface RadioGroupProps {
  name: string;
  options: FilterOption[];
  value: string | number | undefined;
  onChange: (value: string | number) => void;
  disabled?: boolean;
}

function RadioGroup({ name, options, value, onChange, disabled }: RadioGroupProps) {
  return (
    <div className="space-y-2">
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
            checked={value === option.value}
            onChange={() => onChange(option.value)}
            disabled={disabled || option.disabled}
            className="
              w-4 h-4 border-stone-600 bg-stone-800
              text-sky-600 focus:ring-sky-600 focus:ring-2
              disabled:opacity-50
            "
          />
          <span className="flex-1 text-stone-200">{option.label}</span>
          {option.count !== undefined && (
            <Badge variant="outline" size="xs">
              {option.count}
            </Badge>
          )}
        </label>
      ))}
    </div>
  );
}

interface RangeSliderProps {
  min: number;
  max: number;
  step?: number;
  value: [number, number];
  onChange: (value: [number, number]) => void;
  disabled?: boolean;
  showValues?: boolean;
}

function RangeSlider({ min, max, step = 1, value, onChange, disabled, showValues = true }: RangeSliderProps) {
  const [localMin, localMax] = value;
  const range = max - min;

  const handleMinChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newMin = Number(e.target.value);
    onChange([newMin, Math.max(newMin, localMax)]);
  }, [localMax, onChange]);

  const handleMaxChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newMax = Number(e.target.value);
    onChange([Math.min(localMin, newMax), newMax]);
  }, [localMin, onChange]);

  const minPercent = ((localMin - min) / range) * 100;
  const maxPercent = ((localMax - min) / range) * 100;

  return (
    <div className="space-y-4">
      <div className="relative">
        {/* Track */}
        <div className="relative h-2 bg-stone-800 rounded-full">
          {/* Active track */}
          <div
            className="absolute h-full bg-sky-600 rounded-full"
            style={{ left: `${minPercent}%`, right: `${100 - maxPercent}%` }}
          />
        </div>

        {/* Thumb inputs */}
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={localMin}
          onChange={handleMinChange}
          disabled={disabled}
          className="absolute w-full h-2 opacity-0 cursor-ew-resize"
          style={{ pointerEvents: 'auto' }}
          aria-label="Minimum value"
        />
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={localMax}
          onChange={handleMaxChange}
          disabled={disabled}
          className="absolute w-full h-2 opacity-0 cursor-ew-resize"
          style={{ pointerEvents: 'auto' }}
          aria-label="Maximum value"
        />

        {/* Visible thumbs */}
        <div
          className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-sky-600 rounded-full shadow-lg border-2 border-stone-900 pointer-events-none transition-transform hover:scale-110"
          style={{ left: `${minPercent}%`, transform: 'translate(-50%, -50%)' }}
        />
        <div
          className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-sky-600 rounded-full shadow-lg border-2 border-stone-900 pointer-events-none transition-transform hover:scale-110"
          style={{ left: `${maxPercent}%`, transform: 'translate(-50%, -50%)' }}
        />
      </div>

      {showValues && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-stone-400">{localMin}</span>
          <span className="text-stone-400">{localMax}</span>
        </div>
      )}
    </div>
  );
}

interface DatePickerProps {
  value: [string, string] | undefined;
  onChange: (value: [string, string] | undefined) => void;
  disabled?: boolean;
}

function DatePicker({ value, onChange, disabled }: DatePickerProps) {
  const { t } = useTranslation('common');

  const handleStartDateChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newStartDate = e.target.value;
    if (value) {
      onChange([newStartDate, value[1]]);
    } else {
      const today = new Date().toISOString().split('T')[0];
      onChange([newStartDate, today]);
    }
  }, [value, onChange]);

  const handleEndDateChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newEndDate = e.target.value;
    if (value) {
      onChange([value[0], newEndDate]);
    } else {
      const today = new Date().toISOString().split('T')[0];
      onChange([today, newEndDate]);
    }
  }, [value, onChange]);

  const handleClear = useCallback(() => {
    onChange(undefined);
  }, [onChange]);

  return (
    <div className="space-y-3">
      <div>
        <label className="block text-sm text-stone-400 mb-1">
          {t('startDate', { defaultValue: 'Start Date' })}
        </label>
        <input
          type="date"
          value={value?.[0] || ''}
          onChange={handleStartDateChange}
          disabled={disabled}
          className="
            w-full px-3 py-2 bg-stone-800 border border-stone-700 rounded-lg
            text-stone-200 focus:ring-2 focus:ring-sky-600 focus:border-transparent
            disabled:opacity-50 disabled:cursor-not-allowed
          "
        />
      </div>
      <div>
        <label className="block text-sm text-stone-400 mb-1">
          {t('endDate', { defaultValue: 'End Date' })}
        </label>
        <input
          type="date"
          value={value?.[1] || ''}
          onChange={handleEndDateChange}
          disabled={disabled}
          className="
            w-full px-3 py-2 bg-stone-800 border border-stone-700 rounded-lg
            text-stone-200 focus:ring-2 focus:ring-sky-600 focus:border-transparent
            disabled:opacity-50 disabled:cursor-not-allowed
          "
        />
      </div>
      {value && (
        <button
          onClick={handleClear}
          className="text-sm text-sky-500 hover:text-sky-400 transition-colors"
        >
          {t('clearDateRange', { defaultValue: 'Clear date range' })}
        </button>
      )}
    </div>
  );
}

interface FilterSectionProps {
  group: FilterGroup;
  value: any;
  onChange: (value: any) => void;
  isCollapsed: boolean;
  onToggle: () => void;
}

function FilterSection({ group, value, onChange, isCollapsed, onToggle }: FilterSectionProps) {
  const { t } = useTranslation('common');

  const activeCount = useMemo(() => {
    if (group.type === 'checkbox' && Array.isArray(value)) {
      return value.length;
    }
    if (group.type === 'radio' && value) {
      return 1;
    }
    if (group.type === 'range' && Array.isArray(value) && (value[0] !== group.min || value[1] !== group.max)) {
      return 1;
    }
    if (group.type === 'date' && value) {
      return 1;
    }
    return 0;
  }, [group, value]);

  return (
    <div className="border-b border-stone-800 last:border-b-0">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-4 text-left hover:bg-stone-800/30 transition-colors"
        aria-expanded={!isCollapsed}
        aria-controls={`filter-section-${group.id}`}
      >
        <span className="flex items-center gap-2">
          <span className="font-medium text-stone-200">{group.label}</span>
          {activeCount > 0 && (
            <Badge variant="primary" size="xs">
              {activeCount}
            </Badge>
          )}
        </span>
        <svg
          className={`w-5 h-5 text-stone-500 transition-transform duration-200 ${isCollapsed ? '-rotate-90' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      <div
        id={`filter-section-${group.id}`}
        className={`overflow-hidden transition-all duration-200 ${isCollapsed ? 'max-h-0' : 'max-h-[1000px]'}`}
      >
        <div className="px-4 pb-4">
          {group.type === 'checkbox' && group.options && (
            <CheckboxGroup
              options={group.options}
              value={value || []}
              onChange={onChange}
            />
          )}

          {group.type === 'radio' && group.options && (
            <RadioGroup
              name={group.id}
              options={group.options}
              value={value}
              onChange={onChange}
            />
          )}

          {group.type === 'range' && group.min !== undefined && group.max !== undefined && (
            <RangeSlider
              min={group.min}
              max={group.max}
              step={group.step}
              value={value || [group.min, group.max]}
              onChange={onChange}
            />
          )}

          {group.type === 'date' && (
            <DatePicker
              value={value}
              onChange={onChange}
            />
          )}

          {group.type === 'select' && group.options && (
            <select
              value={value || ''}
              onChange={(e) => onChange(e.target.value)}
              className="
                w-full px-3 py-2 bg-stone-800 border border-stone-700 rounded-lg
                text-stone-200 focus:ring-2 focus:ring-sky-600 focus:border-transparent
              "
            >
              <option value="">{t('selectOption', { defaultValue: 'Select an option' })}</option>
              {group.options.map((option) => (
                <option key={option.value} value={option.value} disabled={option.disabled}>
                  {option.label}
                  {option.count !== undefined && ` (${option.count})`}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================
// Main FilterPanel Component
// ============================================

export function FilterPanel({
  groups,
  values,
  onChange,
  onClearAll,
  className = '',
  showActiveFilters = true,
  orientation = 'vertical'
}: FilterPanelProps) {
  const { t } = useTranslation('common');
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(
    new Set(groups.filter(g => g.defaultCollapsed).map(g => g.id))
  );

  // Calculate active filters
  const activeFilters = useMemo(() => {
    const filters: ActiveFilter[] = [];

    groups.forEach((group) => {
      const value = values[group.id];

      if (group.type === 'checkbox' && Array.isArray(value) && value.length > 0) {
        const labels = (group.options || [])
          .filter(opt => value.includes(opt.value))
          .map(opt => opt.label)
          .join(', ');
        filters.push({
          key: group.id,
          label: group.label,
          value: labels || group.label,
          type: group.type
        });
      } else if (group.type === 'radio' && value) {
        const option = (group.options || []).find(opt => opt.value === value);
        filters.push({
          key: group.id,
          label: group.label,
          value: option?.label || String(value),
          type: group.type
        });
      } else if (group.type === 'range' && Array.isArray(value)) {
        filters.push({
          key: group.id,
          label: group.label,
          value: `${value[0]} - ${value[1]}`,
          type: group.type
        });
      } else if (group.type === 'date' && value) {
        filters.push({
          key: group.id,
          label: group.label,
          value: `${value[0]} to ${value[1]}`,
          type: group.type
        });
      } else if (group.type === 'select' && value) {
        const option = group.options?.find(opt => opt.value === value);
        filters.push({
          key: group.id,
          label: group.label,
          value: option?.label || value,
          type: group.type
        });
      }
    });

    return filters;
  }, [groups, values]);

  // Handle filter value change
  const handleFilterChange = useCallback((groupId: string, newValue: any) => {
    onChange({
      ...values,
      [groupId]: newValue
    });
  }, [values, onChange]);

  // Handle filter removal
  const handleFilterRemove = useCallback((key: string) => {
    const group = groups.find(g => g.id === key);
    if (!group) return;

    let clearedValue: any;

    if (group.type === 'checkbox') {
      clearedValue = [];
    } else if (group.type === 'range' && group.min !== undefined && group.max !== undefined) {
      clearedValue = [group.min, group.max];
    } else {
      clearedValue = undefined;
    }

    onChange({
      ...values,
      [key]: clearedValue
    });
  }, [groups, values, onChange]);

  // Toggle section collapse
  const toggleSection = useCallback((groupId: string) => {
    setCollapsedSections(prev => {
      const next = new Set(prev);
      if (next.has(groupId)) {
        next.delete(groupId);
      } else {
        next.add(groupId);
      }
      return next;
    });
  }, []);

  const totalActiveFilters = activeFilters.length;

  return (
    <div className={className}>
      {/* Active Filters */}
      {showActiveFilters && totalActiveFilters > 0 && (
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-stone-300">
              {t('activeFilters', { defaultValue: 'Active Filters' })} ({totalActiveFilters})
            </span>
            {onClearAll && (
              <button
                onClick={onClearAll}
                className="text-sm text-sky-500 hover:text-sky-400 transition-colors"
              >
                {t('clearAll', { defaultValue: 'Clear All' })}
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {activeFilters.map((filter) => (
              <Tag
                key={filter.key}
                removable
                onRemove={() => handleFilterRemove(filter.key)}
              >
                <span className="text-stone-400">{filter.label}:</span> {filter.value}
              </Tag>
            ))}
          </div>
        </div>
      )}

      {/* Filter Groups */}
      <Card variant="default" size="sm">
        <CardHeader
          title={t('filters', { defaultValue: 'Filters' })}
          subtitle={totalActiveFilters > 0
            ? t('filtersApplied', { defaultValue: '{{count}} filters applied', count: totalActiveFilters })
            : t('noFiltersApplied', { defaultValue: 'No filters applied' })
          }
        />
        <CardBody className="p-0">
          {groups.map((group) => (
            <FilterSection
              key={group.id}
              group={group}
              value={values[group.id]}
              onChange={(newValue) => handleFilterChange(group.id, newValue)}
              isCollapsed={collapsedSections.has(group.id)}
              onToggle={() => toggleSection(group.id)}
            />
          ))}
        </CardBody>
      </Card>
    </div>
  );
}

export default FilterPanel;
