import { useCallback, useEffect, useRef, useState } from 'react';
import getLocalStorageApi from 'api/browser/localstorage/get';
import removeLocalStorageApi from 'api/browser/localstorage/remove';
import setLocalStorageApi from 'api/browser/localstorage/set';

export function useLocalStorage<T>(
	key: string,
	defaultValue: T | (() => T),
): [T, (value: T | ((prevState: T) => T)) => void, () => void] {
	const defaultValueRef = useRef<T | (() => T)>(defaultValue);

	useEffect(() => {
		if (defaultValueRef.current !== defaultValue) {
			defaultValueRef.current = defaultValue;
		}
	}, [defaultValue]);

	const readValueFromStorage = useCallback((): T => {
		const resolveddefaultValue =
			defaultValueRef.current instanceof Function
				? (defaultValueRef.current as () => T)()
				: defaultValueRef.current;

		try {
			const item = getLocalStorageApi(key);
			if (item) {
				return JSON.parse(item) as T;
			}
		} catch (error) {
			console.warn(`Error reading localStorage key "${key}":`, error);
		}
		return resolveddefaultValue;
	}, [key]);

	const [storedValue, setStoredValue] = useState<T>(readValueFromStorage);

	const setValue = useCallback(
		(value: T | ((prevState: T) => T)) => {
			try {
				const latestValueFromStorage = readValueFromStorage();
				const valueToStore =
					value instanceof Function ? value(latestValueFromStorage) : value;
				setLocalStorageApi(key, JSON.stringify(valueToStore));
				setStoredValue(valueToStore);
			} catch (error) {
				console.warn(`Error setting localStorage key "${key}":`, error);
			}
		},
		[key, readValueFromStorage],
	);

	const removeValue = useCallback(() => {
		try {
			removeLocalStorageApi(key);
			setStoredValue(
				defaultValueRef.current instanceof Function
					? (defaultValueRef.current as () => T)()
					: defaultValueRef.current,
			);
		} catch (error) {
			console.warn(`Error removing localStorage key "${key}":`, error);
		}
	}, [key]);

	useEffect(() => {
		setStoredValue(readValueFromStorage());
	}, [key, readValueFromStorage]);

	return [storedValue, setValue, removeValue];
}
