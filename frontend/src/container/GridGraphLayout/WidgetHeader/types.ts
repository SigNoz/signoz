import { ReactNode } from 'react';

import { MenuItemKeys } from './contants';

export interface MenuItem {
	key: string;
	icon: ReactNode;
	label: string;
	isVisible: boolean;
	disabled: boolean;
	danger?: boolean;
}

export type TWidgetOptions =
	| MenuItemKeys.View
	| MenuItemKeys.Edit
	| MenuItemKeys.Delete
	| MenuItemKeys.Clone
	| string;

export type KeyMethodMappingProps<T extends TWidgetOptions> = {
	[K in T]: {
		key: TWidgetOptions;
		method: VoidFunction | undefined;
	};
};
