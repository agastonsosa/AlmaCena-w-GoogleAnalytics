import { useState, useRef, useLayoutEffect, useCallback } from "react";

// A completed request may navigate away before its finally block runs.
export function useSafeState(initial) {
  const [value, setValue] = useState(initial);
  const mounted = useRef(true);
  useLayoutEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const update = useCallback((next) => {
    if (mounted.current) setValue(next);
  }, []);
  return [value, update];
}
