import debounce from 'lodash-es/debounce';
import { useEffect, useState } from 'react';

export type Dimensions = {
	width: number;
	height: number;
};

export function useResizeObserver<T extends HTMLElement>(
	ref: React.RefObject<T>,
	debounceTime = 300,
): Dimensions {
	const [size, setSize] = useState<Dimensions>({
		width: ref.current?.clientWidth || 0,
		height: ref.current?.clientHeight || 0,
	});

	// eslint-disable-next-line consistent-return
	useEffect(() => {
		if (ref.current) {
			const handleResize = debounce((entries: ResizeObserverEntry[]) => {
				const entry = entries[0];
				if (entry) {
					const { width, height } = entry.contentRect;
					setSize({ width, height });
				}
			}, debounceTime);

			const ro = new ResizeObserver(handleResize);
			ro.observe(ref.current);

			return (): void => {
				ro.disconnect();
			};
		}
	}, [ref, debounceTime]);

	return size;
}
