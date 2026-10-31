import { useEffect, useMemo, useRef } from 'react';
import debounce from 'lodash-es/debounce';

export interface DebouncedFunc<T extends (...args: unknown[]) => unknown> {
	(...args: Parameters<T>): ReturnType<T> | undefined;

	cancel(): void;

	flush(): ReturnType<T> | undefined;
}

export type DebounceOptions = {
	leading?: boolean;
	maxWait?: number;
	trailing?: boolean;
};

const defaultOptions: DebounceOptions = {
	leading: false,
	trailing: true,
};

const useDebouncedFn = <T extends (...args: Array<unknown>) => unknown>(
	fn: T,
	wait = 100,
	options: DebounceOptions = defaultOptions,
): DebouncedFunc<T> => {
	const fnRef = useRef(fn);
	fnRef.current = fn;

	const debounced = useMemo(
		() => debounce(((...args) => fnRef.current(...args)) as T, wait, options),
		[options, wait],
	);

	useEffect(
		() => (): void => {
			debounced.cancel();
		},
		[debounced],
	);

	return debounced;
};

export default useDebouncedFn;
