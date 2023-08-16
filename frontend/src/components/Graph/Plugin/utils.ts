import { ChartEvent } from 'chart.js';

export type ChartEventHandler = (ev: ChartEvent | MouseEvent) => void;

export function mergeDefaultOptions<T extends Record<string, unknown>>(
	options: T,
	defaultOptions: Required<T>,
): Required<T> {
	const sanitizedOptions = { ...options };
	Object.keys(options).forEach((key) => {
		if (sanitizedOptions[key as keyof T] === undefined) {
			delete sanitizedOptions[key as keyof T];
		}
	});

	return {
		...defaultOptions,
		...sanitizedOptions,
	};
}
