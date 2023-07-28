import { TabsProps, Typography } from 'antd';
import ROUTES from 'constants/routes';
import LogsIndexToFields from 'container/LogsIndexToFields';

import { TABS_TITLE } from './constant';

export const tabsExtraConfig: Record<string, TabsProps> = {
	[TABS_TITLE.LOGS_INDEX_FIELDS]: {},
};

export const logsSettingsRoute = [
	{
		Component: LogsIndexToFields,
		name: <Typography>{TABS_TITLE.LOGS_INDEX_FIELDS}</Typography>,
		route: ROUTES.LOGS_INDEX_FIELDS,
		key: ROUTES.LOGS_INDEX_FIELDS,
	},
];
