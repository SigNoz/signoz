import RouteTab from 'components/RouteTab';
import ROUTES from 'constants/routes';
import DBCall from 'container/MetricsApplication/Tabs/DBCall';
import External from 'container/MetricsApplication/Tabs/External';
import Overview from 'container/MetricsApplication/Tabs/Overview';
import ResourceAttributesFilter from 'container/ResourceAttributesFilter';
import useUrlQuery from 'hooks/useUrlQuery';
import history from 'lib/history';
import { useCallback, useMemo } from 'react';
import { generatePath, useParams } from 'react-router-dom';

import ApDexApplication from './ApDex/ApDexApplication';
import { MetricsApplicationTab, TAB_KEY_VS_LABEL } from './types';
import useMetricsApplicationTabKey from './useMetricsApplicationTabKey';

function MetricsApplication(): JSX.Element {
	const { servicename: encodedServiceName } = useParams<{
		servicename: string;
	}>();

	const servicename = decodeURIComponent(encodedServiceName);

	const activeKey = useMetricsApplicationTabKey();

	const urlQuery = useUrlQuery();

	const getRouteUrl = useCallback(
		(tab: MetricsApplicationTab): string => {
			urlQuery.set('tab', tab);
			return `${generatePath(ROUTES.SERVICE_METRICS, {
				servicename,
			})}?${urlQuery.toString()}`;
		},
		[servicename, urlQuery],
	);

	const routes = useMemo(
		() => [
			{
				Component: Overview,
				name: TAB_KEY_VS_LABEL[MetricsApplicationTab.OVER_METRICS],
				route: getRouteUrl(MetricsApplicationTab.OVER_METRICS),
				key: MetricsApplicationTab.OVER_METRICS,
			},
			{
				Component: DBCall,
				name: TAB_KEY_VS_LABEL[MetricsApplicationTab.DB_CALL_METRICS],
				route: getRouteUrl(MetricsApplicationTab.DB_CALL_METRICS),
				key: MetricsApplicationTab.DB_CALL_METRICS,
			},
			{
				Component: External,
				name: TAB_KEY_VS_LABEL[MetricsApplicationTab.EXTERNAL_METRICS],
				route: getRouteUrl(MetricsApplicationTab.EXTERNAL_METRICS),
				key: MetricsApplicationTab.EXTERNAL_METRICS,
			},
		],
		[getRouteUrl],
	);

	return (
		<>
			<ResourceAttributesFilter />
			<ApDexApplication />
			<RouteTab routes={routes} history={history} activeKey={activeKey} />
		</>
	);
}

export default MetricsApplication;
