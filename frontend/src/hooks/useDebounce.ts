import { useEffect, useState } from 'react';

const useDebounce = <T>(value: T, delay = 500): T => {
	const [debouncedValue, setDebouncedValue] = useState<T>(value);

	useEffect(() => {
		const timeout = setTimeout(() => {
			setDebouncedValue(value);
		}, delay);

		return (): void => {
			clearTimeout(timeout);
		};
	}, [value, delay]);

	return debouncedValue;
};

export default useDebounce;
