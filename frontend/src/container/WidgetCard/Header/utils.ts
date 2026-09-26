import type { DropdownActionItemType } from '@signozhq/ui/dropdown';

import { MenuItem } from 'container/WidgetCard/Header/types';

export const generateMenuList = (
	actions: MenuItem[],
): DropdownActionItemType[] => actions.filter((action) => action.isVisible);
