'use client';

import { useEffect, useRef, useState, useMemo } from 'react';
import { useMapsLibrary } from '@vis.gl/react-google-maps';

export type UseAutocompleteSuggestionsReturn = {
  suggestions: google.maps.places.AutocompleteSuggestion[];
  isLoading: boolean;
  resetSession: () => void;
};

/**
 * Reusable hook that queries the Google Places API (New) for address autocompletion.
 * Uses AutocompleteSuggestion.fetchAutocompleteSuggestions with AutocompleteSessionToken.
 */
export function useAutocompleteSuggestions(
  inputString: string,
  requestOptions: Partial<google.maps.places.AutocompleteRequest> = {}
): UseAutocompleteSuggestionsReturn {
  const placesLib = useMapsLibrary('places');
  const sessionTokenRef = useRef<google.maps.places.AutocompleteSessionToken | null>(null);
  const [rawSuggestions, setRawSuggestions] = useState<google.maps.places.AutocompleteSuggestion[]>([]);
  const [resolvedQuery, setResolvedQuery] = useState<string | null>(null);
  const requestOptionsRef = useRef(requestOptions);

  useEffect(() => {
    requestOptionsRef.current = requestOptions;
  }, [requestOptions]);

  const trimmed = inputString.trim();
  const shouldQuery = trimmed.length >= 2;

  useEffect(() => {
    if (!placesLib || !shouldQuery) return;

    const { AutocompleteSessionToken, AutocompleteSuggestion } = placesLib;

    if (!sessionTokenRef.current) {
      sessionTokenRef.current = new AutocompleteSessionToken();
    }

    const request: google.maps.places.AutocompleteRequest = {
      ...requestOptionsRef.current,
      input: inputString,
      sessionToken: sessionTokenRef.current
    };

    let isSubscribed = true;

    AutocompleteSuggestion.fetchAutocompleteSuggestions(request)
      .then((res: { suggestions: google.maps.places.AutocompleteSuggestion[] }) => {
        if (isSubscribed) {
          setRawSuggestions(res.suggestions || []);
          setResolvedQuery(inputString);
        }
      })
      .catch((err: unknown) => {
        if (isSubscribed) {
          console.error('Error fetching autocomplete suggestions:', err);
          setResolvedQuery(inputString);
        }
      });

    return () => {
      isSubscribed = false;
    };
  }, [placesLib, inputString, shouldQuery]);

  const suggestions = useMemo(() => {
    return shouldQuery ? rawSuggestions : [];
  }, [shouldQuery, rawSuggestions]);

  // Derived loading state: true when query has changed but results haven't resolved yet
  const isLoading = shouldQuery && resolvedQuery !== inputString;

  return {
    suggestions,
    isLoading,
    resetSession: () => {
      sessionTokenRef.current = null;
      setRawSuggestions([]);
      setResolvedQuery(null);
    }
  };
}
