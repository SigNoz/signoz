import { useMemo, useRef } from 'react';
import debounce from 'lodash-es/debounce';

export interface DebouncedFunc<T extends (...args: any[]) => any> {
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

const useDebouncedFn = <T extends (...args: any) => any>(
	fn: T,
	wait: number = 100,
	options: DebounceOptions = defaultOptions,
	dependencies?: ReadonlyArray<any>,
): DebouncedFunc<T> => {
	const fnRef = useRef(fn);
	fnRef.current = fn;

	return useMemo(
		() => debounce(((...args) => fnRef.current(...args)) as T, wait, options),
		[...(dependencies || [])],
	);
};

export default useDebouncedFn;
