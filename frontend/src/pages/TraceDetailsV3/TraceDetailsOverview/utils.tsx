import { ChevronDown, ChevronRight } from '@signozhq/icons';

// Lucide chevrons for the flame/waterfall accordion headers, matching the
// span-tree chevrons in the waterfall.
export function renderPanelExpandIcon({
	isActive,
}: {
	isActive?: boolean;
}): JSX.Element {
	return isActive ? <ChevronDown size={14} /> : <ChevronRight size={14} />;
}
