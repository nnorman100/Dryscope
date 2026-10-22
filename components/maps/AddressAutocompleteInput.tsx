'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MapPin, Loader2, X, Search, CheckCircle2 } from 'lucide-react';
import { useMapsLibrary } from '@vis.gl/react-google-maps';
import { useAutocompleteSuggestions } from './useAutocompleteSuggestions';
import { extractPlaceDetails, GOOGLE_MAPS_ENABLED, ParsedPlaceDetails } from '@/lib/maps-config';

interface AddressAutocompleteInputProps {
  value: string;
  onChange: (value: string) => void;
  onAddressSelect?: (details: ParsedPlaceDetails) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  inputClassName?: string;
  autoFocus?: boolean;
}

export const AddressAutocompleteInput: React.FC<AddressAutocompleteInputProps> = ({
  value,
  onChange,
  onAddressSelect,
  placeholder = 'Start typing property address or street...',
  disabled = false,
  className = '',
  inputClassName = '',
  autoFocus = false
}) => {
  const places = useMapsLibrary('places');
  const [query, setQuery] = useState(value || '');
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [isFetchingPlace, setIsFetchingPlace] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync external value using React state adjustment pattern (no cascading effect render)
  const [prevValue, setPrevValue] = useState(value);
  if (value !== prevValue) {
    setPrevValue(value);
    setQuery(value || '');
  }

  const { suggestions, isLoading, resetSession } = useAutocompleteSuggestions(query, {
    includedPrimaryTypes: ['street_address', 'premise', 'subpremise', 'route']
  });

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    onChange(val);
    setIsOpen(true);
    setSelectedIndex(-1);
  };

  const handleSelectSuggestion = useCallback(
    async (suggestion: google.maps.places.AutocompleteSuggestion) => {
      if (!places || !suggestion.placePrediction) return;

      setIsFetchingPlace(true);
      try {
        // Convert prediction to modern Place instance
        const place = suggestion.placePrediction.toPlace();

        // Fetch required fields per Places API New specification
        await place.fetchFields({
          fields: [
            'id',
            'displayName',
            'formattedAddress',
            'addressComponents',
            'location'
          ]
        });

        const details = extractPlaceDetails(place);
        if (details) {
          setQuery(details.formattedAddress);
          onChange(details.formattedAddress);
          if (onAddressSelect) {
            onAddressSelect(details);
          }
        }
      } catch (err) {
        console.error('Failed to fetch place details:', err);
      } finally {
        setIsFetchingPlace(false);
        setIsOpen(false);
        resetSession();
      }
    },
    [places, onChange, onAddressSelect, resetSession]
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen || suggestions.length === 0) {
      if (e.key === 'ArrowDown' && suggestions.length > 0) {
        setIsOpen(true);
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev < suggestions.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev > 0 ? prev - 1 : suggestions.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
        handleSelectSuggestion(suggestions[selectedIndex]);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  const clearInput = () => {
    setQuery('');
    onChange('');
    setIsOpen(false);
    resetSession();
    inputRef.current?.focus();
  };

  return (
    <div ref={containerRef} className={`relative w-full ${className}`}>
      <div className="relative flex items-center">
        <div className="absolute left-3 text-slate-400 pointer-events-none">
          {isFetchingPlace ? (
            <Loader2 className="w-4 h-4 text-emerald-500 animate-spin" />
          ) : (
            <MapPin className="w-4 h-4 text-sky-500" />
          )}
        </div>

        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleInputChange}
          onFocus={() => {
            if (suggestions.length > 0) setIsOpen(true);
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          autoFocus={autoFocus}
          className={`w-full pl-9 pr-16 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500/50 focus:border-sky-500 transition-colors ${inputClassName}`}
        />

        <div className="absolute right-2.5 flex items-center gap-1">
          {isLoading && !isFetchingPlace && (
            <Loader2 className="w-3.5 h-3.5 text-slate-400 animate-spin mr-1" />
          )}
          {query && !disabled && (
            <button
              type="button"
              onClick={clearInput}
              className="p-1 text-slate-400 hover:text-slate-200 rounded transition-colors"
              title="Clear address"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          {GOOGLE_MAPS_ENABLED ? (
            <span className="text-[10px] font-mono px-1 py-0.5 bg-slate-800 text-sky-400 border border-slate-700 rounded">
              Maps
            </span>
          ) : (
            <span
              className="text-[10px] font-mono px-1 py-0.5 bg-slate-800 text-amber-400 border border-slate-700 rounded"
              title="Google Maps is not configured (NEXT_PUBLIC_GOOGLE_MAPS_API_KEY); type the address by hand"
            >
              Manual
            </span>
          )}
        </div>
      </div>

      {/* Autocomplete Dropdown */}
      {isOpen && suggestions.length > 0 && (
        <div className="absolute left-0 right-0 z-50 mt-1 max-h-64 overflow-y-auto bg-slate-900/95 backdrop-blur-md border border-slate-700 rounded-lg shadow-2xl py-1 divide-y divide-slate-800">
          <div className="px-3 py-1.5 text-[10px] font-semibold text-slate-400 uppercase tracking-wider flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Search className="w-3 h-3 text-sky-400" /> Google Places Autocomplete
            </span>
            <span className="text-[9px] text-slate-500">Press ↑↓ to navigate</span>
          </div>

          {suggestions.map((item, index) => {
            const isSelected = index === selectedIndex;
            const primaryText =
              item.placePrediction?.mainText?.text ||
              item.placePrediction?.text.text ||
              '';
            const secondaryText =
              item.placePrediction?.secondaryText?.text || '';

            return (
              <button
                key={item.placePrediction?.placeId || index}
                type="button"
                onClick={() => handleSelectSuggestion(item)}
                onMouseEnter={() => setSelectedIndex(index)}
                className={`w-full text-left px-3 py-2 text-xs flex items-start gap-2.5 transition-colors ${
                  isSelected
                    ? 'bg-sky-950/60 text-sky-200 border-l-2 border-sky-400 pl-2.5'
                    : 'text-slate-200 hover:bg-slate-800/80'
                }`}
              >
                <MapPin
                  className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${
                    isSelected ? 'text-sky-400' : 'text-slate-400'
                  }`}
                />
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate text-slate-100">
                    {primaryText}
                  </p>
                  {secondaryText && (
                    <p className="text-[11px] text-slate-400 truncate">
                      {secondaryText}
                    </p>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
