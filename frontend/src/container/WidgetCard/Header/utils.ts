import type { MenuItem as DropdownMenuItem } from '@signozhq/ui/dropdown-menu';

import { MenuItemKeys } from 'container/WidgetCard/Header/contants';
import { MenuItem } from 'container/WidgetCard/Header/types';

export const generateMenuList = (actions: MenuItem[]): DropdownMenuItem[] =>
	actions
		.filter((action: MenuItem) => action.isVisible)
		.map(({ key, icon: Icon, label, disabled, ...rest }) => ({
			key,
			icon: Icon,
			label,
			disabled,
			...rest,
		}));

export const isTWidgetOptions = (value: string): value is MenuItemKeys =>
	value === MenuItemKeys.View ||
	value === MenuItemKeys.CreateAlerts ||
	value === MenuItemKeys.Download;
