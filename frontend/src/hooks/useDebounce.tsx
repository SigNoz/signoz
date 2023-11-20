import { useEffect, useState } from 'react';

export default function useDebounce<T>(value: T, delay = 500): T {
	const [debouncedValue, setDebouncedValue] = useState<T>(value);

	useEffect(() => {
		const handler = setTimeout(() => {
			setDebouncedValue(value);
		}, delay);

		return (): void => {
			clearTimeout(handler);
		};
	}, [value, delay]);

	return debouncedValue;
}
