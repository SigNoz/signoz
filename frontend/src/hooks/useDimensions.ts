import debounce from 'lodash-es/debounce';
import { useEffect, useState } from 'react';

export interface Dimensions {
	width: number;
	height: number;
}

export function useDimensions(ref: React.RefObject<HTMLElement>): Dimensions {
	const [dimensions, setDimensions] = useState<Dimensions>({
		width: 0,
		height: 0,
	});

	useEffect(() => {
		const updateDimensions = debounce(() => {
			const reference = ref.current;

			if (reference) {
				const width = ref.current.offsetWidth;
				const height = ref.current.offsetHeight;
				setDimensions({ width, height });
			}
		}, 250); // 250ms debounce delay

		// Initial dimensions update
		updateDimensions();

		window.addEventListener('resize', updateDimensions);

		// Cleanup
		return (): void => {
			window.removeEventListener('resize', updateDimensions);
			updateDimensions.cancel(); // Cancel any debounced calls
		};
	}, [ref]);

	return dimensions;
}
