import { FilterValue, SorterResult } from 'antd/es/table/interface';
import { TablePaginationConfig, TableProps } from 'antd/lib';
import deleteAlerts from 'api/alerts/delete';
import get from 'api/alerts/get';
import getAll from 'api/alerts/getAll';
import patchAlert from 'api/alerts/patch';
import ruleStats from 'api/alerts/ruleStats';
import save from 'api/alerts/save';
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
import { RelativeTimeMap } from 'container/TopNav/DateTimeSelection/config';
import useAxiosError from 'hooks/useAxiosError';
import { useNotifications } from 'hooks/useNotifications';
import { useSafeNavigate } from 'hooks/useSafeNavigate';
import useUrlQuery from 'hooks/useUrlQuery';
import createQueryParams from 'lib/createQueryParams';
import GetMinMax from 'lib/getMinMax';
import history from 'lib/history';
import { History, Table } from 'lucide-react';
import EditRules from 'pages/EditRules';
import { OrderPreferenceItems } from 'pages/Logs/config';
import BetaTag from 'periscope/components/BetaTag/BetaTag';
import PaginationInfoText from 'periscope/components/PaginationInfoText/PaginationInfoText';
import { useAlertRule } from 'providers/Alert';
import { useCallback, useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from 'react-query';
import { generatePath, useLocation } from 'react-router-dom';
import { ErrorResponse, SuccessResponse } from 'types/api';
import {
	AlertDef,
	AlertRuleStatsPayload,
	AlertRuleTimelineGraphResponsePayload,
	AlertRuleTimelineTableResponse,
	AlertRuleTimelineTableResponsePayload,
	AlertRuleTopContributorsPayload,
} from 'types/api/alerts/def';
import { PayloadProps } from 'types/api/alerts/get';
import { TagFilter } from 'types/api/queryBuilder/queryBuilderData';
import { nanoToMilli } from 'utils/timeUtils';

export const useAlertHistoryQueryParams = (): {
	ruleId: string | null;
	startTime: number;
	endTime: number;
	hasStartAndEndParams: boolean;
	params: URLSearchParams;
} => {
	const params = useUrlQuery();

	const startTime = params.get(QueryParams.startTime);
	const endTime = params.get(QueryParams.endTime);
	const relativeTimeParam = params.get(QueryParams.relativeTime);

	const relativeTime =
		(relativeTimeParam === 'null' ? null : relativeTimeParam) ??
		RelativeTimeMap['6hr'];

	const intStartTime = parseInt(startTime || '0', 10);
	const intEndTime = parseInt(endTime || '0', 10);
	const hasStartAndEndParams = !!intStartTime && !!intEndTime;

	const { maxTime, minTime } = useMemo(() => {
		if (hasStartAndEndParams)
			return GetMinMax('custom', [intStartTime, intEndTime]);
		return GetMinMax(relativeTime);
	}, [hasStartAndEndParams, intStartTime, intEndTime, relativeTime]);

	const ruleId = params.get(QueryParams.ruleId);

	return {
		ruleId,
		startTime: Math.floor(nanoToMilli(minTime)),
		endTime: Math.floor(nanoToMilli(maxTime)),
		hasStartAndEndParams,
		params,
	};
};
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
type Props = {
	ruleId: string | null;
	isValidRuleId: boolean;
	alertDetailsResponse:
		| SuccessResponse<PayloadProps, unknown>
		| ErrorResponse
		| undefined;
	isLoading: boolean;
	isRefetching: boolean;
	isError: boolean;
};

export const useGetAlertRuleDetails = (): Props => {
	const { ruleId } = useAlertHistoryQueryParams();

	const isValidRuleId = ruleId !== null && String(ruleId).length !== 0;

	const {
		isLoading,
		data: alertDetailsResponse,
		isRefetching,
		isError,
	} = useQuery([REACT_QUERY_KEY.ALERT_RULE_DETAILS, ruleId], {
		queryFn: () =>
			get({
				id: parseInt(ruleId || '', 10),
			}),
		enabled: isValidRuleId,
		refetchOnWindowFocus: false,
	});

	return {
		ruleId,
		isLoading,
		alertDetailsResponse,
		isRefetching,
		isError,
		isValidRuleId,
	};
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
	const { ruleId, startTime, endTime } = useAlertHistoryQueryParams();

	const isValidRuleId = ruleId !== null && String(ruleId).length !== 0;

	const { isLoading, isRefetching, isError, data } = useQuery(
		[REACT_QUERY_KEY.ALERT_RULE_STATS, ruleId, startTime, endTime],
		{
			queryFn: () =>
				ruleStats({
					id: parseInt(ruleId || '', 10),
					start: startTime,
					end: endTime,
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
	const { ruleId, startTime, endTime } = useAlertHistoryQueryParams();

	const isValidRuleId = ruleId !== null && String(ruleId).length !== 0;

	const { isLoading, isRefetching, isError, data } = useQuery(
		[REACT_QUERY_KEY.ALERT_RULE_TOP_CONTRIBUTORS, ruleId, startTime, endTime],
		{
			queryFn: () =>
				topContributors({
					id: parseInt(ruleId || '', 10),
					start: startTime,
					end: endTime,
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

export const useGetAlertRuleDetailsTimelineTable = ({
	filters,
}: {
	filters: TagFilter;
}): GetAlertRuleDetailsTimelineTableProps => {
	const { ruleId, startTime, endTime, params } = useAlertHistoryQueryParams();
	const { updatedOrder, offset } = useMemo(
		() => ({
			updatedOrder: params.get(urlKey.order) ?? OrderPreferenceItems.ASC,
			offset: parseInt(params.get(urlKey.offset) ?? '0', 10),
		}),
		[params],
	);

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
			offset,
			JSON.stringify(filters.items),
		],
		{
			queryFn: () =>
				timelineTable({
					id: parseInt(ruleId || '', 10),
					start: startTime,
					end: endTime,
					limit: TIMELINE_TABLE_PAGE_SIZE,
					order: updatedOrder,
					offset,
					filters,
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
	const { safeNavigate } = useSafeNavigate();

	const { pathname } = useLocation();

	const { search } = useLocation();

	const params = useMemo(() => new URLSearchParams(search), [search]);

	const offset = params.get('offset') ?? '0';

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
				const { order } = sorter;
				const updatedOrder = order === 'ascend' ? 'asc' : 'desc';
				const params = new URLSearchParams(window.location.search);

				safeNavigate(
					`${pathname}?${createQueryParams({
						...Object.fromEntries(params),
						order: updatedOrder,
						offset: current * TIMELINE_TABLE_PAGE_SIZE - TIMELINE_TABLE_PAGE_SIZE,
						pageSize,
					})}`,
				);
			}
		},
		[pathname, safeNavigate],
	);

	const offsetInt = parseInt(offset, 10);
	const pageSize = params.get('pageSize') ?? String(TIMELINE_TABLE_PAGE_SIZE);
	const pageSizeInt = parseInt(pageSize, 10);

	const paginationConfig: TablePaginationConfig = {
		pageSize: pageSizeInt,
		showTotal: PaginationInfoText,
		current: offsetInt / TIMELINE_TABLE_PAGE_SIZE + 1,
		showSizeChanger: false,
		hideOnSinglePage: true,
		total: totalItems,
	};

	return { paginationConfig, onChangeHandler };
};

export const useAlertRuleStatusToggle = ({
	ruleId,
}: {
	ruleId: string;
}): {
	handleAlertStateToggle: () => void;
} => {
	const { alertRuleState, setAlertRuleState } = useAlertRule();
	const { notifications } = useNotifications();

	const queryClient = useQueryClient();
	const handleError = useAxiosError();

	const { mutate: toggleAlertState } = useMutation(
		[REACT_QUERY_KEY.TOGGLE_ALERT_STATE, ruleId],
		patchAlert,
		{
			onSuccess: (data) => {
				setAlertRuleState(data?.payload?.state);

				notifications.success({
					message: `Alert has been ${
						data?.payload?.state === 'disabled' ? 'disabled' : 'enabled'
					}.`,
				});
			},
			onError: (error) => {
				queryClient.refetchQueries([REACT_QUERY_KEY.ALERT_RULE_DETAILS, ruleId]);
				handleError(error);
			},
		},
	);

	const handleAlertStateToggle = (): void => {
		const args = {
			id: parseInt(ruleId, 10),
			data: { disabled: alertRuleState !== 'disabled' },
		};
		toggleAlertState(args);
	};

	return { handleAlertStateToggle };
};

export const useAlertRuleDuplicate = ({
	alertDetails,
}: {
	alertDetails: AlertDef;
}): {
	handleAlertDuplicate: () => void;
} => {
	const { notifications } = useNotifications();

	const params = useUrlQuery();

	const { refetch } = useQuery(REACT_QUERY_KEY.GET_ALL_ALLERTS, {
		queryFn: getAll,
		cacheTime: 0,
	});
	const handleError = useAxiosError();
	const { mutate: duplicateAlert } = useMutation(
		[REACT_QUERY_KEY.DUPLICATE_ALERT_RULE],
		save,
		{
			onSuccess: async () => {
				notifications.success({
					message: `Success`,
				});

				const { data: allAlertsData } = await refetch();

				if (
					allAlertsData &&
					allAlertsData.payload &&
					allAlertsData.payload.length > 0
				) {
					const clonedAlert =
						allAlertsData.payload[allAlertsData.payload.length - 1];
					params.set(QueryParams.ruleId, String(clonedAlert.id));
					history.push(`${ROUTES.ALERT_OVERVIEW}?${params.toString()}`);
				}
			},
			onError: handleError,
		},
	);

	const handleAlertDuplicate = (): void => {
		const args = {
			data: { ...alertDetails, alert: alertDetails.alert?.concat(' - Copy') },
		};
		duplicateAlert(args);
	};

	return { handleAlertDuplicate };
};
export const useAlertRuleUpdate = ({
	alertDetails,
	setUpdatedName,
	intermediateName,
}: {
	alertDetails: AlertDef;
	setUpdatedName: (name: string) => void;
	intermediateName: string;
}): {
	handleAlertUpdate: () => void;
	isLoading: boolean;
} => {
	const { notifications } = useNotifications();
	const handleError = useAxiosError();

	const { mutate: updateAlertRule, isLoading } = useMutation(
		[REACT_QUERY_KEY.UPDATE_ALERT_RULE, alertDetails.id],
		save,
		{
			onMutate: () => setUpdatedName(intermediateName),
			onSuccess: () =>
				notifications.success({ message: 'Alert renamed successfully' }),
			onError: (error) => {
				setUpdatedName(alertDetails.alert);
				handleError(error);
			},
		},
	);

	const handleAlertUpdate = (): void => {
		updateAlertRule({
			data: { ...alertDetails, alert: intermediateName },
			id: alertDetails.id,
		});
	};

	return { handleAlertUpdate, isLoading };
};

export const useAlertRuleDelete = ({
	ruleId,
}: {
	ruleId: number;
}): {
	handleAlertDelete: () => void;
} => {
	const { notifications } = useNotifications();
	const handleError = useAxiosError();

	const { mutate: deleteAlert } = useMutation(
		[REACT_QUERY_KEY.REMOVE_ALERT_RULE, ruleId],
		deleteAlerts,
		{
			onSuccess: async () => {
				notifications.success({
					message: `Success`,
				});

				history.push(ROUTES.LIST_ALL_ALERT);
			},
			onError: handleError,
		},
	);

	const handleAlertDelete = (): void => {
		const args = { id: ruleId };
		deleteAlert(args);
	};

	return { handleAlertDelete };
};

type GetAlertRuleDetailsTimelineGraphProps = GetAlertRuleDetailsApiProps & {
	data:
		| SuccessResponse<AlertRuleTimelineGraphResponsePayload, unknown>
		| ErrorResponse
		| undefined;
};

export const useGetAlertRuleDetailsTimelineGraphData = (): GetAlertRuleDetailsTimelineGraphProps => {
	const { ruleId, startTime, endTime } = useAlertHistoryQueryParams();

	const isValidRuleId = ruleId !== null && String(ruleId).length !== 0;
	const hasStartAndEnd = startTime !== null && endTime !== null;

	const { isLoading, isRefetching, isError, data } = useQuery(
		[REACT_QUERY_KEY.ALERT_RULE_TIMELINE_GRAPH, ruleId, startTime, endTime],
		{
			queryFn: () =>
				timelineGraph({
					id: parseInt(ruleId || '', 10),
					start: startTime,
					end: endTime,
				}),
			enabled: isValidRuleId && hasStartAndEnd,
			refetchOnMount: false,
			refetchOnWindowFocus: false,
		},
	);

	return { isLoading, isRefetching, isError, data, isValidRuleId, ruleId };
};
