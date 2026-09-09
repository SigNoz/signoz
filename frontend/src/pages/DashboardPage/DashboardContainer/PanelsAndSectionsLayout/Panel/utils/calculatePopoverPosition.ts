import type {
	Coordinates,
	PopoverPosition,
} from 'periscope/components/ContextMenu';

// Kept in sync with the popover's `overlayStyle` in `ContextMenu` (width 300, maxHeight 254).
const POPOVER_WIDTH = 300;
const POPOVER_HEIGHT = 254;
const OFFSET = 10;

/**
 * Places the drill-down popover next to the clicked point, flipping/clamping so it stays within the
 * viewport. Anchors to the right by default and mirrors to the left (and top/bottom) near an edge.
 */
export function calculatePopoverPosition({
	x,
	y,
}: Coordinates): PopoverPosition {
	const { innerWidth: windowWidth, innerHeight: windowHeight } = window;

	let left = x + OFFSET;
	let top = y - OFFSET;
	let placement: PopoverPosition['placement'] = 'right';

	if (left + POPOVER_WIDTH > windowWidth) {
		left = x - POPOVER_WIDTH + OFFSET;
		placement = 'left';
	}

	if (left < 0) {
		left = OFFSET;
		placement = 'right';
	}

	if (top < 0) {
		top = OFFSET;
		placement = placement === 'right' ? 'bottomRight' : 'bottomLeft';
	}

	if (top + POPOVER_HEIGHT > windowHeight) {
		top = windowHeight - POPOVER_HEIGHT - OFFSET;
		placement = placement === 'right' ? 'topRight' : 'topLeft';
	}

	return { left, top, placement };
}
