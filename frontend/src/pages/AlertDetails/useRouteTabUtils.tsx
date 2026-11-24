import Loadable from 'components/Loadable';
import { TabRoutes } from 'components/RouteTab/types';
import { QueryParams } from 'constants/query';
import ROUTES from 'constants/routes';
import { AlertDetailsTab } from 'container/AlertHistory/types';
import useUrlQuery from 'hooks/useUrlQuery';
import { buildRoutePath } from 'lib/router/buildRoutePath';
import { History, Table } from '@signozhq/icons';
import BetaTag from 'periscope/components/BetaTag/BetaTag';

const EditRules = Loadable(() => import('pages/EditRules'));
const AlertHistory = Loadable(() => import('container/AlertHistory'));

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

		return `${buildRoutePath(route)}?${params}`;
	};

	const routes = [
		{
			Component: EditRules,
			name: (
				<div className="tab-item" data-testid="alert-details-tab-overview">
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
				<div className="tab-item" data-testid="alert-details-tab-history">
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
