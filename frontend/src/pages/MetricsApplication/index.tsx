import RouteTab from 'components/RouteTab';
import ROUTES from 'constants/routes';
import DBCall from 'container/MetricsApplication/Tabs/DBCall';
import External from 'container/MetricsApplication/Tabs/External';
import Overview from 'container/MetricsApplication/Tabs/Overview';
import ResourceAttributesFilter from 'container/ResourceAttributesFilter';
import history from 'lib/history';
import { useMemo } from 'react';
import { generatePath, useParams } from 'react-router-dom';

import { MetricsApplicationTab, TAB_KEY_VS_LABEL } from './types';
import useMetricsApplicationTabKey from './useMetricsApplicationTabKey';

function MetricsApplication(): JSX.Element {
	const { servicename } = useParams<{ servicename: string }>();

	const activeKey = useMetricsApplicationTabKey();

	const routes = useMemo(
		() => [
			{
				Component: Overview,
				name: TAB_KEY_VS_LABEL[MetricsApplicationTab.OVER_METRICS],
				route: `${generatePath(ROUTES.SERVICE_METRICS, {
					servicename,
				})}?tab=${MetricsApplicationTab.OVER_METRICS}`,
			},
			{
				Component: DBCall,
				name: TAB_KEY_VS_LABEL[MetricsApplicationTab.DB_CALL_METRICS],
				route: `${generatePath(ROUTES.SERVICE_METRICS, {
					servicename,
				})}?tab=${MetricsApplicationTab.DB_CALL_METRICS}`,
			},
			{
				Component: External,
				name: TAB_KEY_VS_LABEL[MetricsApplicationTab.EXTERNAL_METRICS],
				route: `${generatePath(ROUTES.SERVICE_METRICS, {
					servicename,
				})}?tab=${MetricsApplicationTab.EXTERNAL_METRICS}`,
			},
		],
		[servicename],
	);

	return (
		<>
			<ResourceAttributesFilter />
			<RouteTab routes={routes} history={history} activeKey={activeKey} />
		</>
	);
}

export default MetricsApplication;
