import { useCallback, useEffect, useState } from 'react';

/**
 * A React hook for interacting with localStorage.
 * It allows getting, setting, and removing items from localStorage.
 *
 * @template T The type of the value to be stored.
 * @param {string} key The localStorage key.
 * @param {T | (() => T)} initialValue The initial value to use if no value is found in localStorage,
 * @returns {[T, (value: T | ((prevState: T) => T)) => void, () => void]}
 * A tuple containing:
 * - The current value from state (and localStorage).
 * - A function to set the value (updates state and localStorage).
 * - A function to remove the value from localStorage and reset state to initialValue.
 */
export function useLocalStorage<T>(
	key: string,
	initialValue: T | (() => T),
): [T, (value: T | ((prevState: T) => T)) => void, () => void] {
	// This function resolves the initialValue if it's a function,
	// and handles potential errors during localStorage access or JSON parsing.
	const readValueFromStorage = useCallback((): T => {
		const resolvedInitialValue =
			initialValue instanceof Function ? initialValue() : initialValue;

		try {
			const item = window.localStorage.getItem(key);
			// If item exists, parse it, otherwise return the resolved initial value.
			if (item) {
				return JSON.parse(item) as T;
			}
		} catch (error) {
			// Log error and fall back to initial value if reading/parsing fails.
			console.warn(`Error reading localStorage key "${key}":`, error);
		}
		return resolvedInitialValue;
	}, [key, initialValue]);

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
			// Reset state to the (potentially resolved) initialValue.
			setStoredValue(
				initialValue instanceof Function ? initialValue() : initialValue,
			);
		} catch (error) {
			console.warn(`Error removing localStorage key "${key}":`, error);
		}
	}, [key, initialValue]);

	// useEffect to update the storedValue if the key changes,
	// or if the initialValue prop changes causing readValueFromStorage to change.
	// This ensures the hook reflects the correct localStorage item if its key prop dynamically changes.
	useEffect(() => {
		setStoredValue(readValueFromStorage());
	}, [key, readValueFromStorage]); // Re-run if key or the read function changes.

	return [storedValue, setValue, removeValue];
}
