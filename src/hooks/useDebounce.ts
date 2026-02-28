import { useState, useEffect } from "react";

/**
 * Debounces a value by the given delay (ms).
 * Returns the debounced value that only updates after the delay has elapsed
 * since the last change to the input value.
 */
export function useDebounce<T>(value: T, delay = 300): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}
