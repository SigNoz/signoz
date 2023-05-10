import RouteTab from 'components/RouteTab';
import ROUTES from 'constants/routes';
import ResourceAttributesFilter from 'container/ResourceAttributesFilter';
import React, { memo } from 'react';
import { generatePath, useParams } from 'react-router-dom';
import { useLocation } from 'react-use';

import { getWidgetQueryBuilder } from './MetricsApplication.factory';
import DBCall from './Tabs/DBCall';
import External from './Tabs/External';
import Overview from './Tabs/Overview';

function OverViewTab(): JSX.Element {
	return <Overview getWidgetQueryBuilder={getWidgetQueryBuilder} />;
}

function DbCallTab(): JSX.Element {
	return <DBCall getWidgetQueryBuilder={getWidgetQueryBuilder} />;
}

function ExternalTab(): JSX.Element {
	return <External getWidgetQueryBuilder={getWidgetQueryBuilder} />;
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

	return (
		<>
			<ResourceAttributesFilter />
			<RouteTab
				routes={[
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
				]}
				activeKey={activeKey}
			/>
		</>
	);
}

export default memo(ServiceMetrics);
