import { ReactNode } from 'react';
import type { DropdownActionItemType } from '@signozhq/ui/dropdown';

import { MenuItemKeys } from 'container/WidgetCard/Header/contants';

export type MenuItem = DropdownActionItemType & {
	value: MenuItemKeys;
	isVisible: boolean;
};

export interface DisplayThresholdProps {
	threshold: ReactNode;
}
