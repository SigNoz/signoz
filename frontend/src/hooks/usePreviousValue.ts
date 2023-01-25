import { useEffect, useRef } from 'react';

function usePreviousValue<T>(value: T): T {
	const ref = useRef<T>();

	useEffect(() => {
		ref.current = value;
	}, [value]);

	return ref.current as T;
}

export default usePreviousValue;
