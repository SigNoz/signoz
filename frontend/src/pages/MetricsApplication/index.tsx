import RouteTab from 'components/RouteTab';
import ROUTES from 'constants/routes';
import DBCall from 'container/MetricsApplication/Tabs/DBCall';
import External from 'container/MetricsApplication/Tabs/External';
import Overview from 'container/MetricsApplication/Tabs/Overview';
import ResourceAttributesFilter from 'container/ResourceAttributesFilter';
import useUrlQuery from 'hooks/useUrlQuery';
import history from 'lib/history';
import { useMemo } from 'react';
import { generatePath, useParams } from 'react-router-dom';

import { DB_CALL_METRICS, EXTERNAL_METRICS, OVER_METRICS } from './contants';

function MetricsApplication(): JSX.Element {
	const { servicename } = useParams<{ servicename: string }>();

	const urlParams = useUrlQuery();

	const tab = urlParams.get('tab');

	const getActiveKey = (): string => {
		const metricsMap: {
			[key: string]: string;
		} = {
			[DB_CALL_METRICS]: DB_CALL_METRICS,
			[EXTERNAL_METRICS]: EXTERNAL_METRICS,
		};
		return metricsMap[tab || ''] || OVER_METRICS;
	};

	const activeKey = getActiveKey();

	const routes = useMemo(
		() => [
			{
				Component: Overview,
				name: OVER_METRICS,
				route: `${generatePath(ROUTES.SERVICE_METRICS, {
					servicename,
				})}?tab=${OVER_METRICS}`,
			},
			{
				Component: DBCall,
				name: DB_CALL_METRICS,
				route: `${generatePath(ROUTES.SERVICE_METRICS, {
					servicename,
				})}?tab=${DB_CALL_METRICS}`,
			},
			{
				Component: External,
				name: EXTERNAL_METRICS,
				route: `${generatePath(ROUTES.SERVICE_METRICS, {
					servicename,
				})}?tab=${EXTERNAL_METRICS}`,
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
