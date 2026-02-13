import { useEffect, useState } from 'react';
import debounce from 'lodash-es/debounce';

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

	useEffect(() => {
		const handleResize = debounce(
			(entries: ResizeObserverEntry[]) => {
				const entry = entries[0];
				if (entry) {
					const { width, height } = entry.contentRect;
					setSize({ width, height });
				}
			},
			debounceTime,
			{
				leading: true,
			},
		);

		const ro = new ResizeObserver(handleResize);
		const referenceNode = ref.current;
		if (referenceNode) {
			ro.observe(referenceNode);
		}

		return (): void => {
			if (referenceNode) {
				ro.disconnect();
			}
		};
	}, [ref, debounceTime]);

	return size;
}
