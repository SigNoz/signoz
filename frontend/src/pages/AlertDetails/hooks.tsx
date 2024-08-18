import get from 'api/alerts/get';
import ruleStats from 'api/alerts/ruleStats';
import { TabRoutes } from 'components/RouteTab/types';
import ROUTES from 'constants/routes';
import AlertHistory from 'container/AlertHistory';
import { AlertDetailsTab } from 'container/AlertHistory/types';
import useUrlQuery from 'hooks/useUrlQuery';
import { History, Table } from 'lucide-react';
import EditRules from 'pages/EditRules';
import { useQuery, UseQueryResult } from 'react-query';
import { generatePath, useLocation } from 'react-router-dom';
import { ErrorResponse, SuccessResponse } from 'types/api';
import { AlertRuleStatsPayload } from 'types/api/alerts/def';

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

type GetAlertRuleDetailsApiProps = {
	isLoading: boolean;
	isRefetching: boolean;
	isError: boolean;
	isValidRuleId: boolean;
	ruleId: string | null;
};

type GetAlertRuleDetailsStatsProps = GetAlertRuleDetailsApiProps & {
	data:
		| SuccessResponse<AlertRuleStatsPayload, unknown>
		| ErrorResponse
		| undefined;
};

export const useGetAlertRuleDetailsStats = (): GetAlertRuleDetailsStatsProps => {
	const { search } = useLocation();
	const params = new URLSearchParams(search);

	const ruleId = params.get('ruleId');
	const startTime = params.get('startTime');
	const endTime = params.get('endTime');

	const isValidRuleId = ruleId !== null && String(ruleId).length !== 0;

	const { isLoading, isRefetching, isError, data } = useQuery(
		['ruleIdStats', ruleId, startTime, endTime],
		{
			queryFn: () =>
				ruleStats({
					id: parseInt(ruleId || '', 10),
					start: parseInt(startTime || '', 10),
					end: parseInt(endTime || '', 10),
				}),
			enabled: isValidRuleId,
			refetchOnMount: false,
			refetchOnWindowFocus: false,
		},
	);

	return { isLoading, isRefetching, isError, data, isValidRuleId, ruleId };
};
