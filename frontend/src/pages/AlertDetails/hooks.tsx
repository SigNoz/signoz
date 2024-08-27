import get from 'api/alerts/get';
import { TabRoutes } from 'components/RouteTab/types';
import ROUTES from 'constants/routes';
import AlertHistory from 'container/AlertHistory';
import { AlertDetailsTab } from 'container/AlertHistory/types';
import useUrlQuery from 'hooks/useUrlQuery';
import { History, Table } from 'lucide-react';
import EditRules from 'pages/EditRules';
import { useQuery, UseQueryResult } from 'react-query';
import { generatePath, useLocation } from 'react-router-dom';

export const useRouteTabUtils = (): { routes: TabRoutes[] } => {
	const urlQuery = useUrlQuery();

	const getRouteUrl = (tab: AlertDetailsTab): string => {
		let route = '';
		let params = urlQuery.toString();

		switch (tab) {
			case AlertDetailsTab.OVERVIEW:
				route = ROUTES.ALERT_OVERVIEW;
				break;
			case AlertDetailsTab.HISTORY:
				params = `ruleId=${urlQuery.get('ruleId')}&relativeTime=${urlQuery.get(
					'relativeTime',
				)}`;
				route = ROUTES.ALERT_HISTORY;
				break;
			default:
				return '';
		}

		return `${generatePath(route)}?${params}`;
	};

	const routes = [
		{
			Component: EditRules,
			name: (
				<div className="tab-item">
					<Table size={14} />
					Overview
				</div>
			),
			route: getRouteUrl(AlertDetailsTab.OVERVIEW),
			key: ROUTES.ALERT_OVERVIEW,
		},
		{
			Component: AlertHistory,
			name: (
				<div className="tab-item">
					<History size={14} />
					History
				</div>
			),
			route: getRouteUrl(AlertDetailsTab.HISTORY),
			key: ROUTES.ALERT_HISTORY,
		},
	];

	return { routes };
};

export const useGetAlertRuleDetails = (): {
	ruleId: string | null;
	data: UseQueryResult;
} => {
	const { search } = useLocation();

	const params = new URLSearchParams(search);

	const ruleId = params.get('ruleId');

	const isValidRuleId = ruleId !== null && String(ruleId).length !== 0;

	const data = useQuery(['ruleId', ruleId], {
		queryFn: () =>
			get({
				id: parseInt(ruleId || '', 10),
			}),
		enabled: isValidRuleId,
		refetchOnMount: false,
		refetchOnWindowFocus: false,
	});

	return { ruleId, data };
};
