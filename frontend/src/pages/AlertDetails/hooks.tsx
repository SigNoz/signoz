import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useMutation, useQueryClient, useQuery } from 'react-query';
import { generatePath } from 'react-router-dom';
import { TablePaginationConfig, TableProps } from 'antd';
import type { FilterValue, SorterResult } from 'antd/es/table/interface';
import { patchRulePartial } from 'api/alerts/patchRulePartial';
import { convertToApiError } from 'api/ErrorResponseHandlerForGeneratedAPIs';
import {
	createRule,
	deleteRuleByID,
	getGetRuleByIDQueryKey,
	getGetRuleHistoryTimelineQueryOptions,
	invalidateGetRuleByID,
	invalidateListRules,
	updateRuleByID,
	useGetRuleByID,
	useGetRuleHistoryOverallStatus,
	useGetRuleHistoryStats,
	useGetRuleHistoryTopContributors,
	useListRules,
} from 'api/generated/services/rules';
import {
	Querybuildertypesv5OrderDirectionDTO,
	RuletypesAlertStateDTO,
	type GetRuleByID200,
	type GetRuleHistoryOverallStatus200,
	type GetRuleHistoryStats200,
	type GetRuleHistoryTimeline200,
	type GetRuleHistoryTopContributors200,
	type RenderErrorResponseDTO,
	type RuletypesPostableRuleDTO,
} from 'api/generated/services/sigNoz.schemas';
import { AxiosError } from 'axios';
import { TabRoutes } from 'components/RouteTab/types';
import { QueryParams } from 'constants/query';
import { REACT_QUERY_KEY } from 'constants/reactQueryKeys';
import ROUTES from 'constants/routes';
import AlertHistory from 'container/AlertHistory';
import { TIMELINE_TABLE_PAGE_SIZE } from 'container/AlertHistory/constants';
import {
	computeCursorForPage,
	useTimelineTableOrder,
	useTimelineTablePage,
} from 'container/AlertHistory/Timeline/Table/useTimelineTableCursor';
import { AlertDetailsTab, TimelineFilter } from 'container/AlertHistory/types';
import { DEFAULT_TIME_RANGE } from 'container/TopNav/DateTimeSelectionV2/constants';
import { useNotifications } from 'hooks/useNotifications';
import useUrlQuery from 'hooks/useUrlQuery';
import GetMinMax from 'lib/getMinMax';
import history from 'lib/history';
import { History, Table } from '@signozhq/icons';
import EditRules from 'pages/EditRules';
import BetaTag from 'periscope/components/BetaTag/BetaTag';
import { useAlertRule } from 'providers/Alert';
import { useErrorModal } from 'providers/ErrorModalProvider';
import { toPostableRuleDTOFromAlertDef } from 'types/api/alerts/convert';
import { AlertDef, AlertRuleTimelineTableResponse } from 'types/api/alerts/def';
import APIError from 'types/api/error';
import { nanoToMilli } from 'utils/timeUtils';
import { Typography } from '@signozhq/ui/typography';

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
		(relativeTimeParam === 'null' ? null : relativeTimeParam) ||
		DEFAULT_TIME_RANGE;

	const intStartTime = parseInt(startTime || '0', 10);
	const intEndTime = parseInt(endTime || '0', 10);
	const hasStartAndEndParams = !!intStartTime && !!intEndTime;

	const { maxTime, minTime } = useMemo(() => {
		if (hasStartAndEndParams) {
			return GetMinMax('custom', [intStartTime, intEndTime]);
		}
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
	alertDetailsResponse: GetRuleByID200 | undefined;
	isLoading: boolean;
	isRefetching: boolean;
	isError: boolean;
};

export const useGetAlertRuleDetails = (): Props => {
	const { ruleId } = useAlertHistoryQueryParams();

	const isValidRuleId = ruleId !== null && ruleId !== '';

	const {
		isLoading,
		data: alertDetailsResponse,
		isRefetching,
		isError,
	} = useGetRuleByID(
		{ id: ruleId || '' },
		{
			query: {
				enabled: isValidRuleId,
				refetchOnWindowFocus: false,
			},
		},
	);

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
	data: GetRuleHistoryStats200 | undefined;
};

export const useGetAlertRuleDetailsStats =
	(): GetAlertRuleDetailsStatsProps => {
		const { ruleId, startTime, endTime } = useAlertHistoryQueryParams();

		const isValidRuleId = ruleId !== null && String(ruleId).length !== 0;

		const { isLoading, isRefetching, isError, data } = useGetRuleHistoryStats(
			{ id: ruleId || '' },
			{ start: startTime, end: endTime },
			{
				query: {
					enabled: isValidRuleId && !!startTime && !!endTime,
					refetchOnMount: false,
					refetchOnWindowFocus: false,
				},
			},
		);

		return { isLoading, isRefetching, isError, data, isValidRuleId, ruleId };
	};

type GetAlertRuleDetailsTopContributorsProps = GetAlertRuleDetailsApiProps & {
	data: GetRuleHistoryTopContributors200 | undefined;
};

export const useGetAlertRuleDetailsTopContributors =
	(): GetAlertRuleDetailsTopContributorsProps => {
		const { ruleId, startTime, endTime } = useAlertHistoryQueryParams();

		const isValidRuleId = ruleId !== null && String(ruleId).length !== 0;

		const { isLoading, isRefetching, isError, data } =
			useGetRuleHistoryTopContributors(
				{ id: ruleId || '' },
				{ start: startTime, end: endTime },
				{
					query: {
						enabled: isValidRuleId && !!startTime && !!endTime,
						refetchOnMount: false,
						refetchOnWindowFocus: false,
					},
				},
			);

		return { isLoading, isRefetching, isError, data, isValidRuleId, ruleId };
	};

type GetAlertRuleDetailsTimelineTableProps = GetAlertRuleDetailsApiProps & {
	data: GetRuleHistoryTimeline200 | undefined;
	error: AxiosError<RenderErrorResponseDTO> | null;
	refetch: () => void;
	cancel: () => void;
};

export const useGetAlertRuleDetailsTimelineTable = ({
	filterExpression,
}: {
	filterExpression: string;
}): GetAlertRuleDetailsTimelineTableProps => {
	const queryClient = useQueryClient();
	const { ruleId, startTime, endTime, params } = useAlertHistoryQueryParams();
	const [page, setPage] = useTimelineTablePage();
	const [order] = useTimelineTableOrder();

	const updatedOrder = useMemo(
		() =>
			order === 'asc'
				? Querybuildertypesv5OrderDirectionDTO.asc
				: Querybuildertypesv5OrderDirectionDTO.desc,
		[order],
	);

	const timelineFilter = params.get('timelineFilter');

	const isValidRuleId = ruleId !== null && String(ruleId).length !== 0;

	const stateFilter = useMemo(() => {
		if (!timelineFilter || timelineFilter === TimelineFilter.ALL) {
			return undefined;
		}
		return timelineFilter === TimelineFilter.FIRED
			? RuletypesAlertStateDTO.firing
			: RuletypesAlertStateDTO.inactive;
	}, [timelineFilter]);

	const filtersKey = `${filterExpression}|${stateFilter ?? ''}|${startTime}|${endTime}`;
	const prevFiltersKeyRef = useRef(filtersKey);
	const filtersChanged = prevFiltersKeyRef.current !== filtersKey;
	const cursor = computeCursorForPage(filtersChanged ? 1 : page);

	useEffect(() => {
		if (prevFiltersKeyRef.current !== filtersKey) {
			prevFiltersKeyRef.current = filtersKey;
			if (page > 1) {
				void setPage(1);
			}
		}
	}, [filtersKey, page, setPage]);

	const queryParams = useMemo(
		() => ({
			start: startTime,
			end: endTime,
			limit: TIMELINE_TABLE_PAGE_SIZE,
			order: updatedOrder,
			cursor,
			filterExpression: filterExpression || undefined,
			state: stateFilter,
		}),
		[startTime, endTime, updatedOrder, cursor, filterExpression, stateFilter],
	);

	const queryOptions = getGetRuleHistoryTimelineQueryOptions(
		{ id: ruleId || '' },
		queryParams,
		{
			query: {
				enabled: isValidRuleId,
				refetchOnMount: false,
				refetchOnWindowFocus: false,
			},
		},
	);

	const { isLoading, isRefetching, isError, data, error, refetch } =
		useQuery(queryOptions);

	const queryKeyRef = useRef(queryOptions.queryKey);
	queryKeyRef.current = queryOptions.queryKey;

	const cancel = useCallback(() => {
		void queryClient.cancelQueries({ queryKey: queryKeyRef.current });
	}, [queryClient]);

	return {
		isLoading,
		isRefetching,
		isError,
		data,
		error: error as AxiosError<RenderErrorResponseDTO> | null,
		isValidRuleId,
		ruleId,
		refetch,
		cancel,
	};
};

export const useTimelineTable = ({
	totalItems,
	nextCursor,
}: {
	totalItems: number;
	nextCursor?: string;
}): {
	paginationConfig: TablePaginationConfig;
	onChangeHandler: (
		pagination: TablePaginationConfig,
		sorter: any,
		filters: any,
		extra: any,
	) => void;
	handleNextPage: () => void;
	handlePrevPage: () => void;
	hasNextPage: boolean;
	hasPrevPage: boolean;
} => {
	const [page, setPage] = useTimelineTablePage();
	const [, setOrder] = useTimelineTableOrder();

	const onChangeHandler: TableProps<AlertRuleTimelineTableResponse>['onChange'] =
		useCallback(
			(
				pagination: TablePaginationConfig,
				filters: Record<string, FilterValue | null>,
				sorter:
					| SorterResult<AlertRuleTimelineTableResponse>[]
					| SorterResult<AlertRuleTimelineTableResponse>,
			) => {
				if (!Array.isArray(sorter)) {
					const { order } = sorter;
					const updatedOrder = order === 'ascend' ? 'asc' : 'desc';
					void Promise.all([setOrder(updatedOrder), setPage(1)]);
				}
			},
			[setOrder, setPage],
		);

	const handleNextPage = useCallback(() => {
		if (!nextCursor) {
			return;
		}
		void setPage(page + 1);
	}, [nextCursor, page, setPage]);

	const handlePrevPage = useCallback(() => {
		if (page <= 1) {
			return;
		}
		void setPage(page - 1);
	}, [page, setPage]);

	const paginationConfig: TablePaginationConfig = {
		pageSize: TIMELINE_TABLE_PAGE_SIZE,
		showTotal: (total, [start, end]) => (
			<span>
				<Typography.Text size="small">
					{start} &#8212; {end}
				</Typography.Text>
				<Typography.Text size="small"> of {total}</Typography.Text>
			</span>
		),
		current: page,
		showSizeChanger: false,
		hideOnSinglePage: true,
		total: totalItems,
	};

	return {
		paginationConfig,
		onChangeHandler,
		handleNextPage,
		handlePrevPage,
		hasNextPage: !!nextCursor,
		hasPrevPage: page > 1,
	};
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
	const { showErrorModal } = useErrorModal();

	const { mutate: toggleAlertState } = useMutation(
		[REACT_QUERY_KEY.TOGGLE_ALERT_STATE, ruleId],
		(args: { id: string; data: Partial<RuletypesPostableRuleDTO> }) =>
			patchRulePartial(args.id, args.data),
		{
			onSuccess: (data) => {
				setAlertRuleState(data.data.state);
				invalidateGetRuleByID(queryClient, { id: ruleId });
				queryClient.refetchQueries([REACT_QUERY_KEY.ALERT_RULE_DETAILS, ruleId]);
				notifications.success({
					message: `Alert has been ${
						data.data.state === 'disabled' ? 'disabled' : 'enabled'
					}.`,
				});
			},
			onError: (error) => {
				invalidateGetRuleByID(queryClient, { id: ruleId });
				queryClient.refetchQueries([REACT_QUERY_KEY.ALERT_RULE_DETAILS, ruleId]);
				showErrorModal(
					convertToApiError(error as AxiosError<RenderErrorResponseDTO>) as APIError,
				);
			},
		},
	);

	const handleAlertStateToggle = (): void => {
		const args = {
			id: ruleId,
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

	const { refetch } = useListRules({
		query: { cacheTime: 0 },
	});
	const { showErrorModal } = useErrorModal();
	const { mutate: duplicateAlert } = useMutation(
		[REACT_QUERY_KEY.DUPLICATE_ALERT_RULE],
		(args: { data: AlertDef }) =>
			createRule(toPostableRuleDTOFromAlertDef(args.data)),
		{
			onSuccess: async () => {
				notifications.success({
					message: `Success`,
				});

				const { data: allAlertsData } = await refetch();

				const rules = allAlertsData?.data;
				if (rules && rules.length > 0) {
					const clonedAlert = rules[rules.length - 1];
					params.set(QueryParams.ruleId, String(clonedAlert.id));
					history.push(`${ROUTES.ALERT_OVERVIEW}?${params.toString()}`);
				}
			},
			onError: (error) =>
				showErrorModal(
					convertToApiError(error as AxiosError<RenderErrorResponseDTO>) as APIError,
				),
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
	setAlertRuleName,
	intermediateName,
}: {
	alertDetails: AlertDef;
	setAlertRuleName: (name: string | undefined) => void;
	intermediateName: string;
}): {
	handleAlertUpdate: () => void;
	isLoading: boolean;
} => {
	const { notifications } = useNotifications();
	const { showErrorModal } = useErrorModal();
	const queryClient = useQueryClient();

	const { mutate: updateAlertRule, isLoading } = useMutation(
		[REACT_QUERY_KEY.UPDATE_ALERT_RULE, alertDetails.id],
		(args: { data: AlertDef; id: string }) =>
			updateRuleByID({ id: args.id }, toPostableRuleDTOFromAlertDef(args.data)),
		{
			onMutate: () => setAlertRuleName(intermediateName),
			onSuccess: () => {
				const ruleId = alertDetails.id || '';
				const ruleQueryKey = getGetRuleByIDQueryKey({ id: ruleId });
				const existingRule = queryClient.getQueryData<GetRuleByID200>(ruleQueryKey);
				if (existingRule) {
					queryClient.setQueryData<GetRuleByID200>(ruleQueryKey, {
						...existingRule,
						data: { ...existingRule.data, alert: intermediateName },
					});
				}
				void invalidateListRules(queryClient);
				notifications.success({ message: 'Alert renamed successfully' });
			},
			onError: (error) => {
				setAlertRuleName(alertDetails.alert);
				showErrorModal(
					convertToApiError(error as AxiosError<RenderErrorResponseDTO>) as APIError,
				);
			},
		},
	);

	const handleAlertUpdate = (): void => {
		updateAlertRule({
			data: { ...alertDetails, alert: intermediateName },
			id: alertDetails.id || '',
		});
	};

	return { handleAlertUpdate, isLoading };
};

export const useAlertRuleDelete = ({
	ruleId,
}: {
	ruleId: string;
}): {
	handleAlertDelete: () => void;
} => {
	const { notifications } = useNotifications();
	const { showErrorModal } = useErrorModal();

	const { mutate: deleteAlert } = useMutation(
		[REACT_QUERY_KEY.REMOVE_ALERT_RULE, ruleId],
		(args: { id: string }) => deleteRuleByID({ id: args.id }),
		{
			onSuccess: async () => {
				notifications.success({
					message: `Success`,
				});

				history.push(ROUTES.LIST_ALL_ALERT);
			},
			onError: (error) =>
				showErrorModal(
					convertToApiError(error as AxiosError<RenderErrorResponseDTO>) as APIError,
				),
		},
	);

	const handleAlertDelete = (): void => {
		const args = { id: ruleId };
		deleteAlert(args);
	};

	return { handleAlertDelete };
};

type GetAlertRuleDetailsTimelineGraphProps = GetAlertRuleDetailsApiProps & {
	data: GetRuleHistoryOverallStatus200 | undefined;
};

export const useGetAlertRuleDetailsTimelineGraphData =
	(): GetAlertRuleDetailsTimelineGraphProps => {
		const { ruleId, startTime, endTime } = useAlertHistoryQueryParams();

		const isValidRuleId = ruleId !== null && String(ruleId).length !== 0;
		const hasStartAndEnd = startTime !== null && endTime !== null;

		const { isLoading, isRefetching, isError, data } =
			useGetRuleHistoryOverallStatus(
				{ id: ruleId || '' },
				{ start: startTime, end: endTime },
				{
					query: {
						enabled: isValidRuleId && hasStartAndEnd,
						refetchOnMount: false,
						refetchOnWindowFocus: false,
					},
				},
			);

		return { isLoading, isRefetching, isError, data, isValidRuleId, ruleId };
	};
