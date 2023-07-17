import { MenuItemType } from 'antd/es/menu/hooks/useItems';

import { KeyMethodMappingProps, MenuItem, TWidgetOptions } from './types';

export const generateMenuList = (
	actions: MenuItem[],
	keyMethodMapping: KeyMethodMappingProps<TWidgetOptions>,
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
