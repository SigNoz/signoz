import { useCallback, useState } from 'react';
import type {
	Coordinates,
	PopoverPosition,
} from 'periscope/components/ContextMenu';

import { calculatePopoverPosition } from '../utils/calculatePopoverPosition';

/**
 * Popover state for the drill-down context menu. V2's strongly-typed counterpart to V1's
 * `useCoordinates` (whose `clickedData` is `any`): the caller pins `TData` to the click payload,
 * so it flows through without a cast. `null` fields mean the menu is closed.
 */
export interface UseDrilldownCoordinatesResult<TData> {
	coordinates: Coordinates | null;
	popoverPosition: PopoverPosition | null;
	clickedData: TData | null;
	onClick: (coordinates: Coordinates, data: TData) => void;
	onClose: () => void;
}

export function useDrilldownCoordinates<
	TData,
>(): UseDrilldownCoordinatesResult<TData> {
	const [coordinates, setCoordinates] = useState<Coordinates | null>(null);
	const [popoverPosition, setPopoverPosition] = useState<PopoverPosition | null>(
		null,
	);
	const [clickedData, setClickedData] = useState<TData | null>(null);

	const onClick = useCallback((coords: Coordinates, data: TData): void => {
		setClickedData(data);
		setCoordinates(coords);
		setPopoverPosition(calculatePopoverPosition(coords));
	}, []);

	const onClose = useCallback((): void => {
		setCoordinates(null);
		setPopoverPosition(null);
		setClickedData(null);
	}, []);

	return { coordinates, popoverPosition, clickedData, onClick, onClose };
}
