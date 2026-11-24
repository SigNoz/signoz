import { ReactNode } from 'react';

export interface SidebarItem {
	key: string | number;
	icon?: ReactNode;
	text?: ReactNode;
	label?: ReactNode;
	isBeta?: boolean;
	isNew?: boolean;
	isEarlyAccess?: boolean;
	/** Hover copy for the whole item row (e.g. Noz's early-access tagline). */
	tooltip?: ReactNode;
	isPinned?: boolean;
	children?: SidebarItem[];
	isExternal?: boolean;
	url?: string;
	isEnabled?: boolean;
	itemKey?: string;
}

export const CHANGELOG_LABEL = 'Full Changelog';

export interface SettingsNavSection {
	title?: string;
	items: SidebarItem[];
	key: string;
	hasDivider?: boolean;
}

export interface DropdownSeparator {
	type: 'divider' | 'group';
	label?: ReactNode;
}
