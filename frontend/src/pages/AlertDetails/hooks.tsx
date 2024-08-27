import { FilterValue, SorterResult } from 'antd/es/table/interface';
import { TablePaginationConfig, TableProps } from 'antd/lib';
import get from 'api/alerts/get';
import patchAlert from 'api/alerts/patch';
import ruleStats from 'api/alerts/ruleStats';
import timelineGraph from 'api/alerts/timelineGraph';
import timelineTable from 'api/alerts/timelineTable';
import topContributors from 'api/alerts/topContributors';
import { TabRoutes } from 'components/RouteTab/types';
import { QueryParams } from 'constants/query';
import { REACT_QUERY_KEY } from 'constants/reactQueryKeys';
import ROUTES from 'constants/routes';
import AlertHistory from 'container/AlertHistory';
import { TIMELINE_TABLE_PAGE_SIZE } from 'container/AlertHistory/constants';
import { AlertDetailsTab, TimelineFilter } from 'container/AlertHistory/types';
import { urlKey } from 'container/AllError/utils';
import { useNotifications } from 'hooks/useNotifications';
import useUrlQuery from 'hooks/useUrlQuery';
import createQueryParams from 'lib/createQueryParams';
import GetMinMax from 'lib/getMinMax';
import history from 'lib/history';
import { History, Table } from 'lucide-react';
import EditRules from 'pages/EditRules';
import { OrderPreferenceItems } from 'pages/Logs/config';
import PaginationInfoText from 'periscope/components/PaginationInfoText/PaginationInfoText';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, UseQueryResult } from 'react-query';
import { generatePath, useLocation } from 'react-router-dom';
import { ErrorResponse, SuccessResponse } from 'types/api';
import {
	AlertRuleStatsPayload,
	AlertRuleTimelineGraphResponsePayload,
	AlertRuleTimelineTableResponse,
	AlertRuleTimelineTableResponsePayload,
	AlertRuleTopContributorsPayload,
} from 'types/api/alerts/def';
import { nanoToMilli } from 'utils/timeUtils';

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
	isValidRuleId: boolean;
} => {
	const { search } = useLocation();

	const params = new URLSearchParams(search);

	const ruleId = params.get(QueryParams.ruleId);

	const isValidRuleId = ruleId !== null && String(ruleId).length !== 0;

	const data = useQuery([REACT_QUERY_KEY.ALERT_RULE_DETAILS, ruleId], {
		queryFn: () =>
			get({
				id: parseInt(ruleId || '', 10),
			}),
		enabled: isValidRuleId,
		refetchOnMount: false,
		refetchOnWindowFocus: false,
	});

	return { ruleId, data, isValidRuleId };
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

	const ruleId = params.get(QueryParams.ruleId);
	const startTime = params.get(QueryParams.startTime);
	const endTime = params.get(QueryParams.endTime);

	const isValidRuleId = ruleId !== null && String(ruleId).length !== 0;

	const { isLoading, isRefetching, isError, data } = useQuery(
		[REACT_QUERY_KEY.ALERT_RULE_STATS, ruleId, startTime, endTime],
		{
			queryFn: () =>
				ruleStats({
					id: parseInt(ruleId || '', 10),
					start: parseInt(startTime || '', 10),
					end: parseInt(endTime || '', 10),
				}),
			enabled: isValidRuleId && !!startTime && !!endTime,
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

	const ruleId = params.get(QueryParams.ruleId);
	const startTime = params.get(QueryParams.startTime);
	const endTime = params.get(QueryParams.endTime);

	const isValidRuleId = ruleId !== null && String(ruleId).length !== 0;

	const { isLoading, isRefetching, isError, data } = useQuery(
		[REACT_QUERY_KEY.ALERT_RULE_TOP_CONTRIBUTORS, ruleId, startTime, endTime],
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

	const ruleId = params.get(QueryParams.ruleId);
	const startTime = params.get(QueryParams.startTime);
	const endTime = params.get(QueryParams.endTime);
	const timelineFilter = params.get('timelineFilter');

	const isValidRuleId = ruleId !== null && String(ruleId).length !== 0;
	const hasStartAndEnd = startTime !== null && endTime !== null;

	const { isLoading, isRefetching, isError, data } = useQuery(
		[
			REACT_QUERY_KEY.ALERT_RULE_TIMELINE_TABLE,
			ruleId,
			startTime,
			endTime,
			timelineFilter,
			updatedOrder,
			getUpdatedOffset,
		],
		{
			queryFn: () =>
				timelineTable({
					id: parseInt(ruleId || '', 10),
					start: parseInt(startTime || '', 10),
					end: parseInt(endTime || '', 10),
					limit: TIMELINE_TABLE_PAGE_SIZE,
					order: updatedOrder,
					offset: parseInt(getUpdatedOffset, 10),

					// TODO(shaheer): ask Srikanth about why it doesn't work
					// filters: {
					// 	items: [
					// 		{
					// 			key: { key: 'label' },
					// 			value: 'value',
					// 			op: '=',
					// 		},
					// 	],
					// },

					...(timelineFilter && timelineFilter !== TimelineFilter.ALL
						? {
								state: timelineFilter === TimelineFilter.FIRED ? 'firing' : 'normal',
						  }
						: {}),
				}),
			enabled: isValidRuleId && hasStartAndEnd,
			refetchOnMount: false,
			refetchOnWindowFocus: false,
		},
	);

	return { isLoading, isRefetching, isError, data, isValidRuleId, ruleId };
};

export const useTimelineTable = ({
	totalItems,
}: {
	totalItems: number;
}): {
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
			pagination: TablePaginationConfig,
			filters: Record<string, FilterValue | null>,
			sorter:
				| SorterResult<AlertRuleTimelineTableResponse>[]
				| SorterResult<AlertRuleTimelineTableResponse>,
		) => {
			if (!Array.isArray(sorter)) {
				const { pageSize = 0, current = 0 } = pagination;
				const { columnKey = '', order } = sorter;
				const updatedOrder = order === 'ascend' ? 'asc' : 'desc';
				const params = new URLSearchParams(window.location.search);

				history.replace(
					`${pathname}?${createQueryParams({
						...Object.fromEntries(params),
						order: updatedOrder,
						offset: current - 1,
						orderParam: columnKey,
						pageSize,
					})}`,
				);
			}
		},
		[pathname],
	);

	const paginationConfig: TablePaginationConfig = {
		pageSize: TIMELINE_TABLE_PAGE_SIZE,
		showTotal: PaginationInfoText,
		current: parseInt(updatedOffset, 10) + 1,
		showSizeChanger: false,
		hideOnSinglePage: true,
		total: totalItems,
	};

	return { paginationConfig, onChangeHandler };
};

export const useSetStartAndEndTimeFromRelativeTime = (): void => {
	const { pathname, search } = useLocation();
	const searchParams = useMemo(() => new URLSearchParams(search), [search]);

	const { relativeTime, startTime, endTime } = useMemo(
		() => ({
			relativeTime: searchParams.get(QueryParams.relativeTime),
			startTime: searchParams.get(QueryParams.startTime),
			endTime: searchParams.get(QueryParams.endTime),
		}),
		[searchParams],
	);

	useEffect(() => {
		if (
			!relativeTime ||
			pathname !== ROUTES.ALERT_HISTORY ||
			startTime ||
			endTime
		) {
			return;
		}

		const { minTime, maxTime } = GetMinMax(relativeTime);

		searchParams.set(QueryParams.startTime, nanoToMilli(minTime).toString());
		searchParams.set(QueryParams.endTime, nanoToMilli(maxTime).toString());

		history.push({ search: searchParams.toString() });
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [relativeTime, startTime, endTime]);
};

export const useAlertRuleStatusToggle = ({
	state,
	ruleId,
}: {
	state: string;
	ruleId: string;
}): {
	handleAlertStateToggle: (state: boolean) => void;
	isAlertRuleEnabled: boolean;
} => {
	const { notifications } = useNotifications();
	const defaultErrorMessage = 'Something went wrong';
	const isAlertRuleInitiallyEnabled = state !== 'disabled';
	const [isAlertRuleEnabled, setIsAlertRuleEnabled] = useState(
		isAlertRuleInitiallyEnabled,
	);

	const { mutate: toggleAlertState } = useMutation(
		['toggle-alert-state', ruleId],
		patchAlert,
		{
			onMutate: () => {
				setIsAlertRuleEnabled((prev) => !prev);
			},
			onSuccess: () => {
				notifications.success({
					message: `Alert has been turned ${!isAlertRuleEnabled ? 'on' : 'off'}.`,
				});
			},
			onError: () => {
				setIsAlertRuleEnabled(isAlertRuleInitiallyEnabled);
				notifications.error({
					message: defaultErrorMessage,
				});
			},
		},
	);

	const handleAlertStateToggle = (state: boolean): void => {
		const args = { id: parseInt(ruleId, 10), data: { disabled: !state } };
		toggleAlertState(args);
	};

	return { handleAlertStateToggle, isAlertRuleEnabled };
};

type GetAlertRuleDetailsTimelineGraphProps = GetAlertRuleDetailsApiProps & {
	data:
		| SuccessResponse<AlertRuleTimelineGraphResponsePayload, unknown>
		| ErrorResponse
		| undefined;
};

export const useGetAlertRuleDetailsTimelineGraphData = (): GetAlertRuleDetailsTimelineGraphProps => {
	const { search } = useLocation();

	const params = useMemo(() => new URLSearchParams(search), [search]);

	const ruleId = params.get(QueryParams.ruleId);
	const startTime = params.get(QueryParams.startTime);
	const endTime = params.get(QueryParams.endTime);

	const isValidRuleId = ruleId !== null && String(ruleId).length !== 0;
	const hasStartAndEnd = startTime !== null && endTime !== null;

	const { isLoading, isRefetching, isError, data } = useQuery(
		[REACT_QUERY_KEY.ALERT_RULE_TIMELINE_GRAPH, ruleId, startTime, endTime],
		{
			queryFn: () =>
				timelineGraph({
					id: parseInt(ruleId || '', 10),
					start: parseInt(startTime || '', 10),
					end: parseInt(endTime || '', 10),
				}),
			enabled: isValidRuleId && hasStartAndEnd,
			refetchOnMount: false,
			refetchOnWindowFocus: false,
		},
	);

	return { isLoading, isRefetching, isError, data, isValidRuleId, ruleId };
};
