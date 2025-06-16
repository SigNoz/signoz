import { MenuProps } from 'antd';
import { ReactNode } from 'react';

export type MenuItem = Required<MenuProps>['items'][number];

export type SidebarMenu = MenuItem & {
	tags?: string[];
};

export interface SidebarItem {
	key: string | number;
	icon?: ReactNode;
	text?: ReactNode;
	label?: ReactNode;
	isBeta?: boolean;
	isNew?: boolean;
	isPinned?: boolean;
	children?: SidebarItem[];
	isExternal?: boolean;
	url?: string;
	isEnabled?: boolean;
	itemKey?: string;
}

export enum SecondaryMenuItemKey {
	Slack = 'slack',
	Version = 'version',
	Support = 'support',
}
