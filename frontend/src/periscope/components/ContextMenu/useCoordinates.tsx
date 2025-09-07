import { useCallback, useState } from 'react';

import { Coordinates, PopoverPosition } from './types';

// Custom hook for managing coordinates
export const useCoordinates = (): {
	coordinates: Coordinates | null;
	clickedData: any;
	popoverPosition: PopoverPosition | null;
	onClick: (coordinates: { x: number; y: number }, data?: any) => void;
	onClose: () => void;
	subMenu: string; // todo: create enum
	setSubMenu: (subMenu: string) => void;
} => {
	const [coordinates, setCoordinates] = useState<Coordinates | null>(null);
	const [clickedData, setClickedData] = useState<any>(null);
	const [subMenu, setSubMenu] = useState<string>('');
	const [popoverPosition, setPopoverPosition] = useState<PopoverPosition | null>(
		null,
	);

	const calculatePosition = useCallback(
		(x: number, y: number): PopoverPosition => {
			const windowWidth = window.innerWidth;
			const windowHeight = window.innerHeight;
			const popoverWidth = 300;
			const popoverHeight = 254; // to change
			const offset = 10;

			let left = x + offset;
			let top = y - offset;
			let placement: PopoverPosition['placement'] = 'right';

			// Check if popover would go off the right edge
			if (left + popoverWidth > windowWidth) {
				left = x - popoverWidth + offset;
				placement = 'left';
			}

			// Check if popover would go off the left edge
			if (left < 0) {
				left = offset;
				placement = 'right';
			}

			// Check if popover would go off the top edge
			if (top < 0) {
				top = offset;
				placement = placement === 'right' ? 'bottomRight' : 'bottomLeft';
			}

			// Check if popover would go off the bottom edge
			if (top + popoverHeight > windowHeight) {
				top = windowHeight - popoverHeight - offset;
				placement = placement === 'right' ? 'topRight' : 'topLeft';
			}

			return { left, top, placement };
		},
		[],
	);

	const onClick = useCallback(
		(coords: { x: number; y: number }, data?: any): void => {
			const coordinates: Coordinates = { x: coords.x, y: coords.y };
			const position = calculatePosition(coordinates.x, coordinates.y);
			if (data) {
				setClickedData(data);
				setCoordinates(coordinates);
				setPopoverPosition(position);
			}
		},
		[calculatePosition],
	);

	const onClose = useCallback((): void => {
		setCoordinates(null);
		setClickedData(null);
		setPopoverPosition(null);
		setSubMenu('');
	}, []);

	return {
		coordinates,
		clickedData,
		popoverPosition,
		onClick,
		onClose,
		subMenu,
		setSubMenu,
	};
};

export default useCoordinates;
