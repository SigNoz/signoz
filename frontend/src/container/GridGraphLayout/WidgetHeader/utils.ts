import { MenuItemType } from 'antd/es/menu/hooks/useItems';

import { MenuItem, TWidgetOptions } from './types';

export const generateMenuList = (
	actions: MenuItem[],
	keyMethodMapping: {
		[K in TWidgetOptions]: {
			key: TWidgetOptions;
			method: VoidFunction | undefined;
		};
	},
): MenuItemType[] =>
	actions
		.filter((action: MenuItem) => action.isVisible)
		.map(({ key, icon: Icon, label, disabled, ...rest }) => ({
			key: keyMethodMapping[key].key,
			icon: Icon,
			label,
			disabled,
			...rest,
		}));
