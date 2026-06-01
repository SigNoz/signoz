/**
 * Output of resolving a single list variable. Text variables don't go
 * through resolution — their value is the literal string.
 */
export interface ResolvedValues {
	values: string[];
	status: 'idle' | 'loading' | 'success' | 'error';
	error?: string;
}

export const idle: ResolvedValues = { values: [], status: 'idle' };
export const loading: ResolvedValues = { values: [], status: 'loading' };
export function success(values: string[]): ResolvedValues {
	return { values, status: 'success' };
}
export function failure(error: string): ResolvedValues {
	return { values: [], status: 'error', error };
}
