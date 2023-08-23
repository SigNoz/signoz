import { ReactNode } from 'react';

export interface SidebarItem {
	onClick: VoidFunction;
	icon?: ReactNode;
	text?: ReactNode;
	key: string;
	label?: ReactNode;
}
