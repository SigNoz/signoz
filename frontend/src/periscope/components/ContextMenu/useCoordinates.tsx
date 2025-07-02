import { PopoverProps } from 'antd';
import { ColumnType } from 'antd/lib/table';
import { RowData } from 'lib/query/createTableColumnsFromQuery';
import { useCallback, useState } from 'react';

interface ClickedData {
	record: RowData;
	column: ColumnType<RowData>;
}

// Custom hook for managing coordinates
export const useCoordinates = (): {
	coordinates: { x: number; y: number } | null;
	clickedData: ClickedData | null;
	popoverPosition: {
		left: number;
		top: number;
		placement: PopoverProps['placement'];
	} | null;
	onClick: (e: React.MouseEvent, data?: ClickedData) => void;
	onClose: () => void;
} => {
	const [coordinates, setCoordinates] = useState<{
		x: number;
		y: number;
	} | null>(null);
	const [clickedData, setClickedData] = useState<ClickedData | null>(null);
	const [popoverPosition, setPopoverPosition] = useState<{
		left: number;
		top: number;
		placement: PopoverProps['placement'];
	} | null>(null);

	const calculatePosition = useCallback((x: number, y: number): {
		left: number;
		top: number;
		placement: PopoverProps['placement'];
	} => {
		const windowWidth = window.innerWidth;
		const windowHeight = window.innerHeight;
		const popoverWidth = 180;
		const popoverHeight = 254;
		const offset = 10;

		let left = x + offset;
		let top = y - offset;
		let placement = 'right';

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

		return { left, top, placement: placement as PopoverProps['placement'] };
	}, []);

	const onClick = useCallback(
		(e: React.MouseEvent, data?: ClickedData): void => {
			const coords = { x: e.clientX, y: e.clientY };
			const position = calculatePosition(coords.x, coords.y);

			setCoordinates(coords);
			setPopoverPosition(position);
			if (data) {
				setClickedData(data);
			}
		},
		[calculatePosition],
	);

	const onClose = useCallback((): void => {
		setCoordinates(null);
		setClickedData(null);
		setPopoverPosition(null);
	}, []);

	return { coordinates, clickedData, popoverPosition, onClick, onClose };
};

export default useCoordinates;
