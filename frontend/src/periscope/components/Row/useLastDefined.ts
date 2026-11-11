import { useState } from 'react';

/**
 * Holds the last defined value: like antd's Row, an align or justify that
 * resolves to `undefined` keeps the previous one.
 */
export default function useLastDefined<T>(value: T | undefined): T | undefined {
	const [last, setLast] = useState(value);
	if (value !== undefined && value !== last) {
		setLast(value);
	}
	return value ?? last;
}
