import { RouteTabProps } from 'components/RouteTab/types';
import ROUTES from 'constants/routes';
import LogsIndexToFields from 'container/LogsIndexToFields';
import { TFunction } from 'react-i18next';

import TabLabel from './components/TabLabel';
import { TABS_KEY, TABS_TITLE } from './constant';

export const getLogsSettingsRoute = (t: TFunction): RouteTabProps['routes'] => [
	{
		Component: LogsIndexToFields,
		name: (
			<TabLabel
				label={TABS_TITLE(t)[TABS_KEY.LOGS_INDEX_FIELDS]}
				routeKey={ROUTES.LOGS_INDEX_FIELDS}
			/>
		),
		route: ROUTES.LOGS_INDEX_FIELDS,
		key: ROUTES.LOGS_INDEX_FIELDS,
	},
];
