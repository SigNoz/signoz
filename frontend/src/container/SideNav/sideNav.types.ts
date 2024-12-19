import { MenuProps } from 'antd';
import { ReactNode } from 'react';

export type MenuItem = Required<MenuProps>['items'][number];

export type SidebarMenu = MenuItem & {
	tags?: string[];
};

export interface SidebarItem {
	icon?: ReactNode;
	text?: ReactNode;
	key: string | number;
	label?: ReactNode;
	isBeta?: boolean;
	isNew?: boolean;
}

export enum SecondaryMenuItemKey {
	Slack = 'slack',
	Version = 'version',
	Support = 'support',
}
