import RouteTab from 'components/RouteTab';
import ROUTES from 'constants/routes';
import React from 'react';
import { generatePath, useParams } from 'react-router-dom';
import { useLocation } from 'react-use';
import { Widgets } from 'types/api/dashboard/getAll';

import ResourceAttributesFilter from './ResourceAttributesFilter';
import DBCall from './Tabs/DBCall';
import External from './Tabs/External';
import Overview from './Tabs/Overview';

const getWidget = (query: Widgets['query']): Widgets => {
	return {
		description: '',
		id: '',
		isStacked: false,
		nullZeroValues: '',
		opacity: '0',
		panelTypes: 'TIME_SERIES',
		query,
		queryData: {
			data: [],
			error: false,
			errorMessage: '',
			loading: false,
		},
		timePreferance: 'GLOBAL_TIME',
		title: '',
		stepSize: 60,
	};
};

function OverViewTab(): JSX.Element {
	return <Overview getWidget={getWidget} />;
}

function DbCallTab(): JSX.Element {
	return <DBCall getWidget={getWidget} />;
}

function ExternalTab(): JSX.Element {
	return <External getWidget={getWidget} />;
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
		if (tab === null) {
			return overMetrics;
		}

		if (tab === dbCallMetrics) {
			return dbCallMetrics;
		}

		if (tab === externalMetrics) {
			return externalMetrics;
		}

		return overMetrics;
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

export default React.memo(ServiceMetrics);
