import { useCallback, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { CircleMinus, CirclePlus, Layers, RefreshCw } from '@signozhq/icons';
import { convertFiltersToExpression } from 'components/QueryBuilderV2/utils';
import { FeatureKeys } from 'constants/features';
import { QueryParams } from 'constants/query';
import ROUTES from 'constants/routes';
import { ChangeViewFunctionType } from 'container/ExplorerOptions/types';
import { useGetSearchQueryParam } from 'hooks/queryBuilder/useGetSearchQueryParam';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import { ICurrentQueryData } from 'hooks/useHandleExplorerTabChange';
import { ExplorerViews } from 'pages/LogsExplorer/utils';
import {
	FieldContext,
	PrettyViewAction,
	VisibleActionsConfig,
} from 'periscope/components/PrettyView/PrettyView';
import { useAppContext } from 'providers/App/App';
import { IBuilderQuery } from 'types/api/queryBuilder/queryBuilderData';

import { LogDetailsAction } from '../constants';
import {
	buildLogFilterTarget,
	getFilterQueryData,
	getGroupByQueryData,
	getReplaceFilterQueryData,
} from '../logAttributeActions.utils';

interface UseLogAttributeActionsParams {
	handleChangeSelectedView?: ChangeViewFunctionType;
	isListViewPanel?: boolean;
	onApplyLogFilter?: (expression: string) => void;
}

interface UseLogAttributeActionsResult {
	actions: PrettyViewAction[];
	visibleActions: VisibleActionsConfig;
}

const COPY_ONLY_ACTIONS = [LogDetailsAction.COPY];
const ALL_LEAF_ACTIONS = [
	LogDetailsAction.COPY,
	LogDetailsAction.FILTER_IN,
	LogDetailsAction.FILTER_OUT,
	LogDetailsAction.GROUP_BY,
	LogDetailsAction.REPLACE_FILTER,
];

/**
 * PrettyView filter/group-by/replace actions for the log-details drawer (keys mapped via
 * buildLogFilterTarget). Also owns `visibleActions` (leaf/nested + list-panel copy-only).
 */
export function useLogAttributeActions({
	handleChangeSelectedView,
	isListViewPanel = false,
	onApplyLogFilter,
}: UseLogAttributeActionsParams): UseLogAttributeActionsResult {
	const { pathname } = useLocation();
	const { stagedQuery, updateQueriesData } = useQueryBuilder();
	const { featureFlags } = useAppContext();
	const viewName = useGetSearchQueryParam(QueryParams.viewName) || '';

	const isBodyJsonQueryEnabled =
		featureFlags?.find((flag) => flag.name === FeatureKeys.USE_JSON_BODY)
			?.active || false;

	const isOldExplorerOrLive =
		pathname === ROUTES.OLD_LOGS_EXPLORER || pathname === ROUTES.LIVE_LOGS;

	const filterFor = useCallback(
		(context: FieldContext, isFilterIn: boolean): void => {
			const target = buildLogFilterTarget(
				context.fieldKeyPath,
				context.fieldValue,
				isBodyJsonQueryEnabled,
			);
			const operator = isFilterIn
				? target.filterInOperator
				: target.filterOutOperator;

			// Non-explorer surfaces (infra monitoring, etc.) apply a ready v5
			// expression fragment to their own query.
			if (onApplyLogFilter) {
				const base = {
					filters: { items: [], op: 'AND' },
				} as unknown as IBuilderQuery;
				const nextFilters = getFilterQueryData(
					base,
					target,
					context.fieldValue,
					operator,
				).filters ?? { items: [], op: 'AND' };
				const { expression } = convertFiltersToExpression(nextFilters);
				if (expression) {
					onApplyLogFilter(expression);
				}
				return;
			}

			if (!stagedQuery) {
				return;
			}

			const updatedQuery = updateQueriesData(
				stagedQuery,
				'queryData',
				(item, index) =>
					index === 0
						? getFilterQueryData(item, target, context.fieldValue, operator)
						: item,
			);

			const queryData: ICurrentQueryData = {
				name: viewName,
				id: updatedQuery.id,
				query: updatedQuery,
			};
			handleChangeSelectedView?.(ExplorerViews.LIST, queryData);
		},
		[
			stagedQuery,
			isBodyJsonQueryEnabled,
			updateQueriesData,
			viewName,
			handleChangeSelectedView,
			onApplyLogFilter,
		],
	);

	const groupBy = useCallback(
		(context: FieldContext): void => {
			if (!stagedQuery) {
				return;
			}
			const target = buildLogFilterTarget(
				context.fieldKeyPath,
				context.fieldValue,
				isBodyJsonQueryEnabled,
			);
			if (!target.groupBySupported || !target.groupByKey) {
				return;
			}

			const updatedQuery = updateQueriesData(
				stagedQuery,
				'queryData',
				(item, index) => (index === 0 ? getGroupByQueryData(item, target) : item),
			);

			const queryData: ICurrentQueryData = {
				name: viewName,
				id: updatedQuery.id,
				query: updatedQuery,
			};
			handleChangeSelectedView?.(ExplorerViews.TIMESERIES, queryData);
		},
		[
			stagedQuery,
			isBodyJsonQueryEnabled,
			updateQueriesData,
			viewName,
			handleChangeSelectedView,
		],
	);

	const replaceFilter = useCallback(
		(context: FieldContext): void => {
			if (!stagedQuery) {
				return;
			}
			const target = buildLogFilterTarget(
				context.fieldKeyPath,
				context.fieldValue,
				isBodyJsonQueryEnabled,
			);

			const updatedQuery = updateQueriesData(
				stagedQuery,
				'queryData',
				(item, index) =>
					index === 0
						? getReplaceFilterQueryData(item, target, context.fieldValue)
						: item,
			);

			const queryData: ICurrentQueryData = {
				name: viewName,
				id: updatedQuery.id,
				query: updatedQuery,
			};
			handleChangeSelectedView?.(ExplorerViews.LIST, queryData);
		},
		[
			stagedQuery,
			isBodyJsonQueryEnabled,
			updateQueriesData,
			viewName,
			handleChangeSelectedView,
		],
	);

	const actions: PrettyViewAction[] = useMemo(() => {
		const isRestricted = (fieldKeyPath: (string | number)[]): boolean =>
			buildLogFilterTarget(fieldKeyPath, undefined, isBodyJsonQueryEnabled)
				.isRestricted;

		// The using surface must provide an apply path.
		const canApplyFilter = !!handleChangeSelectedView || !!onApplyLogFilter;

		return [
			{
				key: LogDetailsAction.FILTER_IN,
				label: 'Filter for value',
				icon: <CirclePlus size={12} />,
				onClick: (context): void => filterFor(context, true),
				shouldHide: (_key, fieldKeyPath): boolean =>
					!canApplyFilter || isRestricted(fieldKeyPath),
			},
			{
				key: LogDetailsAction.FILTER_OUT,
				label: 'Filter out value',
				icon: <CircleMinus size={12} />,
				onClick: (context): void => filterFor(context, false),
				shouldHide: (_key, fieldKeyPath): boolean =>
					!canApplyFilter || isRestricted(fieldKeyPath),
			},
			{
				key: LogDetailsAction.GROUP_BY,
				label: 'Group by field',
				icon: <Layers size={12} />,
				onClick: groupBy,
				shouldHide: (_key, fieldKeyPath): boolean =>
					!handleChangeSelectedView ||
					!buildLogFilterTarget(fieldKeyPath, undefined, isBodyJsonQueryEnabled)
						.groupBySupported ||
					isOldExplorerOrLive,
			},
			{
				key: LogDetailsAction.REPLACE_FILTER,
				label: 'Replace filters with this value',
				icon: <RefreshCw size={12} />,
				onClick: replaceFilter,
				shouldHide: (_key, fieldKeyPath): boolean =>
					!handleChangeSelectedView ||
					isRestricted(fieldKeyPath) ||
					isOldExplorerOrLive,
			},
		];
	}, [
		filterFor,
		groupBy,
		replaceFilter,
		isBodyJsonQueryEnabled,
		isOldExplorerOrLive,
		handleChangeSelectedView,
		onApplyLogFilter,
	]);

	const visibleActions = useMemo<VisibleActionsConfig>(
		() => ({
			leaf: isListViewPanel ? COPY_ONLY_ACTIONS : ALL_LEAF_ACTIONS,
			nested: COPY_ONLY_ACTIONS,
		}),
		[isListViewPanel],
	);

	return { actions, visibleActions };
}
