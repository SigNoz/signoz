import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * A React hook for interacting with localStorage.
 * It allows getting, setting, and removing items from localStorage.
 *
 * @template T The type of the value to be stored.
 * @param {string} key The localStorage key.
 * @param {T | (() => T)} defaultValue The default value to use if no value is found in localStorage,
 * @returns {[T, (value: T | ((prevState: T) => T)) => void, () => void]}
 * A tuple containing:
 * - The current value from state (and localStorage).
 * - A function to set the value (updates state and localStorage).
 * - A function to remove the value from localStorage and reset state to defaultValue.
 */
export function useLocalStorage<T>(
	key: string,
	defaultValue: T | (() => T),
): [T, (value: T | ((prevState: T) => T)) => void, () => void] {
	// Stabilize the defaultValue to prevent unnecessary re-renders
	const defaultValueRef = useRef<T | (() => T)>(defaultValue);

	// Update the ref if defaultValue changes (for cases where it's intentionally dynamic)
	useEffect(() => {
		if (defaultValueRef.current !== defaultValue) {
			defaultValueRef.current = defaultValue;
		}
	}, [defaultValue]);

	// This function resolves the defaultValue if it's a function,
	// and handles potential errors during localStorage access or JSON parsing.
	const readValueFromStorage = useCallback((): T => {
		const resolveddefaultValue =
			defaultValueRef.current instanceof Function
				? (defaultValueRef.current as () => T)()
				: defaultValueRef.current;

		try {
			const item = window.localStorage.getItem(key);
			// If item exists, parse it, otherwise return the resolved default value.
			if (item) {
				return JSON.parse(item) as T;
			}
		} catch (error) {
			// Log error and fall back to default value if reading/parsing fails.
			console.warn(`Error reading localStorage key "${key}":`, error);
		}
		return resolveddefaultValue;
	}, [key]);

	// Initialize state by reading from localStorage.
	const [storedValue, setStoredValue] = useState<T>(readValueFromStorage);

	// This function updates both localStorage and the React state.
	const setValue = useCallback(
		(value: T | ((prevState: T) => T)) => {
			try {
				// If a function is passed to setValue, it receives the latest value from storage.
				const latestValueFromStorage = readValueFromStorage();
				const valueToStore =
					value instanceof Function ? value(latestValueFromStorage) : value;

				// Save to localStorage.
				window.localStorage.setItem(key, JSON.stringify(valueToStore));
				// Update React state.
				setStoredValue(valueToStore);
			} catch (error) {
				console.warn(`Error setting localStorage key "${key}":`, error);
			}
		},
		[key, readValueFromStorage],
	);

	// This function removes the item from localStorage and resets the React state.
	const removeValue = useCallback(() => {
		try {
			window.localStorage.removeItem(key);
			// Reset state to the (potentially resolved) defaultValue.
			setStoredValue(
				defaultValueRef.current instanceof Function
					? (defaultValueRef.current as () => T)()
					: defaultValueRef.current,
			);
		} catch (error) {
			console.warn(`Error removing localStorage key "${key}":`, error);
		}
	}, [key]);

	// useEffect to update the storedValue if the key changes,
	// or if the defaultValue prop changes causing readValueFromStorage to change.
	// This ensures the hook reflects the correct localStorage item if its key prop dynamically changes.
	useEffect(() => {
		setStoredValue(readValueFromStorage());
	}, [key, readValueFromStorage]); // Re-run if key or the read function changes.

	return [storedValue, setValue, removeValue];
}
