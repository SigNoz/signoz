import type { Key, ReactNode } from 'react';

export interface OverflowBadgeItem {
	key: Key;
	label: ReactNode;
}

export interface OverflowBadgesLayout {
	visibleCount: number;
	/** Set when even the first badge does not fit and must truncate. */
	firstMaxWidth?: number;
}

export interface OverflowBadgesMeasurement {
	/** The items these widths were measured for. */
	itemsKey: string;
	badgeWidths: number[];
	overflowWidth: number;
	gap: number;
}
