import { Typography } from 'antd';
import { FilterValue, SorterResult } from 'antd/es/table/interface';
import { TablePaginationConfig, TableProps } from 'antd/lib';
import get from 'api/alerts/get';
import ruleStats from 'api/alerts/ruleStats';
import timelineTable from 'api/alerts/timelineTable';
import topContributors from 'api/alerts/topContributors';
import { TabRoutes } from 'components/RouteTab/types';
import ROUTES from 'constants/routes';
import AlertHistory from 'container/AlertHistory';
import { TIMELINE_TABLE_PAGE_SIZE } from 'container/AlertHistory/constants';
import { AlertDetailsTab } from 'container/AlertHistory/types';
import { urlKey } from 'container/AllError/utils';
import useUrlQuery from 'hooks/useUrlQuery';
import createQueryParams from 'lib/createQueryParams';
import history from 'lib/history';
import { History, Table } from 'lucide-react';
import EditRules from 'pages/EditRules';
import { OrderPreferenceItems } from 'pages/Logs/config';
import { useCallback, useMemo } from 'react';
import { useQuery, UseQueryResult } from 'react-query';
import { generatePath, useLocation } from 'react-router-dom';
import { ErrorResponse, SuccessResponse } from 'types/api';
import {
	AlertRuleStatsPayload,
	AlertRuleTimelineTableResponse,
	AlertRuleTimelineTableResponsePayload,
	AlertRuleTopContributorsPayload,
} from 'types/api/alerts/def';

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

type GetAlertRuleDetailsTopContributorsProps = GetAlertRuleDetailsApiProps & {
	data:
		| SuccessResponse<AlertRuleTopContributorsPayload, unknown>
		| ErrorResponse
		| undefined;
};

export const useGetAlertRuleDetailsTopContributors = (): GetAlertRuleDetailsTopContributorsProps => {
	const { search } = useLocation();
	const params = new URLSearchParams(search);

	const ruleId = params.get('ruleId');
	const startTime = params.get('startTime');
	const endTime = params.get('endTime');

	const isValidRuleId = ruleId !== null && String(ruleId).length !== 0;

	const { isLoading, isRefetching, isError, data } = useQuery(
		['ruleIdTopContributors', ruleId, startTime, endTime],
		{
			queryFn: () =>
				topContributors({
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

type GetAlertRuleDetailsTimelineTableProps = GetAlertRuleDetailsApiProps & {
	data:
		| SuccessResponse<AlertRuleTimelineTableResponsePayload, unknown>
		| ErrorResponse
		| undefined;
};

export const useGetAlertRuleDetailsTimelineTable = (): GetAlertRuleDetailsTimelineTableProps => {
	const { search } = useLocation();

	const params = useMemo(() => new URLSearchParams(search), [search]);

	const { updatedOrder, getUpdatedOffset } = useMemo(
		() => ({
			updatedOrder: params.get(urlKey.order) ?? OrderPreferenceItems.ASC,
			getUpdatedOffset: params.get(urlKey.offset) ?? '0',
		}),
		[params],
	);

	const ruleId = params.get('ruleId');
	const startTime = params.get('startTime');
	const endTime = params.get('endTime');

	const isValidRuleId = ruleId !== null && String(ruleId).length !== 0;

	const { isLoading, isRefetching, isError, data } = useQuery(
		['ruleIdTimelineTable', ruleId, startTime, endTime],
		{
			queryFn: () =>
				timelineTable({
					id: parseInt(ruleId || '', 10),
					start: parseInt(startTime || '', 10),
					end: parseInt(endTime || '', 10),
					limit: 20,
					order: updatedOrder,
					offset: parseInt(getUpdatedOffset, 10),
				}),
			enabled: isValidRuleId,
			refetchOnMount: false,
			refetchOnWindowFocus: false,
		},
	);

	return { isLoading, isRefetching, isError, data, isValidRuleId, ruleId };
};

const showPaginationItem = (total: number, range: number[]): JSX.Element => (
	<>
		<Typography.Text className="numbers">
			{range[0]} &#8212; {range[1]}
		</Typography.Text>
		<Typography.Text className="total"> of {total}</Typography.Text>
	</>
);

export const useTimelineTable = (): {
	paginationConfig: TablePaginationConfig;
	onChangeHandler: (
		pagination: TablePaginationConfig,
		sorter: any,
		filters: any,
		extra: any,
	) => void;
} => {
	const { pathname } = useLocation();

	const { search } = useLocation();

	const params = useMemo(() => new URLSearchParams(search), [search]);

	const updatedOffset = params.get(urlKey.offset) ?? '0';

	const onChangeHandler: TableProps<AlertRuleTimelineTableResponse>['onChange'] = useCallback(
		(
			paginations: TablePaginationConfig,
			filters: Record<string, FilterValue | null>,
			sorter:
				| SorterResult<AlertRuleTimelineTableResponse>[]
				| SorterResult<AlertRuleTimelineTableResponse>,
		) => {
			if (!Array.isArray(sorter)) {
				const { pageSize = 0, current = 0 } = paginations;
				const { columnKey = '', order } = sorter;
				const updatedOrder = order === 'ascend' ? 'asc' : 'desc';
				const params = new URLSearchParams(window.location.search);

				history.replace(
					`${pathname}?${createQueryParams({
						...Object.fromEntries(params),
						order: updatedOrder,
						offset: (current - 1) * pageSize,
						orderParam: columnKey,
						pageSize,
					})}`,
				);
			}
		},
		[pathname],
	);

	const paginationConfig = {
		pageSize: TIMELINE_TABLE_PAGE_SIZE,
		showTotal: showPaginationItem,
		current: parseInt(updatedOffset, 10) / TIMELINE_TABLE_PAGE_SIZE + 1,
		showSizeChanger: false,
		hideOnSinglePage: true,
	};

	return { paginationConfig, onChangeHandler };
};
