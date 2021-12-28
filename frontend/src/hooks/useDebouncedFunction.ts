import { useCallback } from 'react';
import debounce from 'lodash-es/debounce';

export interface DebouncedFunc<T extends (...args: any[]) => any> {
	(...args: Parameters<T>): ReturnType<T> | undefined;

	cancel(): void;

	flush(): ReturnType<T> | undefined;
}

export type DebounceOptions = {
	leading?: boolean | undefined;
	maxWait?: number | undefined;
	trailing?: boolean | undefined;
};

const defaultOptions: DebounceOptions = {
	leading: false,
	trailing: true,
};

const useDebouncedFn = <T extends (...args: any) => any>(
	fn: T,
	wait: number = 100,
	options: DebounceOptions = defaultOptions,
	dependencies: ReadonlyArray<any>,
): DebouncedFunc<T> => {
	const debounced = debounce(fn, wait, options);

	return useCallback(debounced, dependencies);
};

export default useDebouncedFn;
