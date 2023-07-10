import RouteTab from 'components/RouteTab';
import ROUTES from 'constants/routes';
import ResourceAttributesFilter from 'container/ResourceAttributesFilter';
import history from 'lib/history';
import { useMemo } from 'react';
import { generatePath, useLocation, useParams } from 'react-router-dom';

import DBCall from '../../container/MetricsApplication/Tabs/DBCall';
import External from '../../container/MetricsApplication/Tabs/External';
import Overview from '../../container/MetricsApplication/Tabs/Overview';

function OverViewTab(): JSX.Element {
	return <Overview />;
}

function DbCallTab(): JSX.Element {
	return <DBCall />;
}

function ExternalTab(): JSX.Element {
	return <External />;
}

function MetricsApplication(): JSX.Element {
	const { search } = useLocation();
	const { servicename } = useParams<{ servicename: string }>();

	const searchParams = new URLSearchParams(search);
	const tab = searchParams.get('tab');

	const overMetrics = 'Overview Metrics';
	const dbCallMetrics = 'Database Calls';
	const externalMetrics = 'External Calls';

	const getActiveKey = (): string => {
		switch (tab) {
			case null: {
				return overMetrics;
			}
			case dbCallMetrics: {
				return dbCallMetrics;
			}
			case externalMetrics: {
				return externalMetrics;
			}
			default: {
				return overMetrics;
			}
		}
	};

	const activeKey = getActiveKey();

	const routes = useMemo(
		() => [
			{
				Component: OverViewTab,
				name: overMetrics,
				route: `${generatePath(ROUTES.SERVICE_METRICS, {
					servicename,
				})}?tab=${overMetrics}`,
			},
			{
				Component: DbCallTab,
				name: dbCallMetrics,
				route: `${generatePath(ROUTES.SERVICE_METRICS, {
					servicename,
				})}?tab=${dbCallMetrics}`,
			},
			{
				Component: ExternalTab,
				name: externalMetrics,
				route: `${generatePath(ROUTES.SERVICE_METRICS, {
					servicename,
				})}?tab=${externalMetrics}`,
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
