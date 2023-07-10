import RouteTab from 'components/RouteTab';
import ROUTES from 'constants/routes';
import ResourceAttributesFilter from 'container/ResourceAttributesFilter';
import history from 'lib/history';
import { memo, useMemo } from 'react';
import { generatePath, useParams } from 'react-router-dom';
import { useLocation } from 'react-use';

import DBCall from './Tabs/DBCall';
import External from './Tabs/External';
import Overview from './Tabs/Overview';

function OverViewTab(): JSX.Element {
	return <Overview />;
}

function DbCallTab(): JSX.Element {
	return <DBCall />;
}

function ExternalTab(): JSX.Element {
	return <External />;
}

function ServiceMetrics(): JSX.Element {
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

export default memo(ServiceMetrics);
