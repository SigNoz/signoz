import { generatePath } from 'react-router-dom';
import { TabRoutes } from 'components/RouteTab/types';
import { QueryParams } from 'constants/query';
import ROUTES from 'constants/routes';
import AlertHistory from 'container/AlertHistory';
import { AlertDetailsTab } from 'container/AlertHistory/types';
import useUrlQuery from 'hooks/useUrlQuery';
import { History, Table } from 'lucide-react';
import EditRules from 'pages/EditRules';
import BetaTag from 'periscope/components/BetaTag/BetaTag';

export const useRouteTabUtils = (): { routes: TabRoutes[] } => {
	const urlQuery = useUrlQuery();

	const getRouteUrl = (tab: AlertDetailsTab): string => {
		let route = '';
		let params = urlQuery.toString();
		const ruleIdKey = QueryParams.ruleId;
		const relativeTimeKey = QueryParams.relativeTime;

		switch (tab) {
			case AlertDetailsTab.OVERVIEW:
				route = ROUTES.ALERT_OVERVIEW;
				break;
			case AlertDetailsTab.HISTORY:
				params = `${ruleIdKey}=${urlQuery.get(
					ruleIdKey,
				)}&${relativeTimeKey}=${urlQuery.get(relativeTimeKey)}`;
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
					<BetaTag />
				</div>
			),
			route: getRouteUrl(AlertDetailsTab.HISTORY),
			key: ROUTES.ALERT_HISTORY,
		},
	];

	return { routes };
};
