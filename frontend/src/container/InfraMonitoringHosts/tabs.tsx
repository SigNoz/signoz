import { TabsProps } from 'antd';
import TabLabel from 'components/TabLabel';
import { PANEL_TYPES } from 'constants/queryBuilder';

import HostsList from './HostsList';

export const getTabsItems = (): TabsProps['items'] => [
	{
		label: <TabLabel label="List View" isDisabled={false} tooltipText="" />,
		key: PANEL_TYPES.LIST,
		children: <HostsList />,
	},
];
