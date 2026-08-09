import { useCallback, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useQueryClient } from 'react-query';
import { CircleMinus, CirclePlus, Layers, RefreshCw } from '@signozhq/icons';
import { getAggregateKeys } from 'api/queryBuilder/getAttributeKeys';
import { FeatureKeys } from 'constants/features';
import { QueryParams } from 'constants/query';
import { OPERATORS, QueryBuilderKeys } from 'constants/queryBuilder';
import ROUTES from 'constants/routes';
import { ChangeViewFunctionType } from 'container/ExplorerOptions/types';
import { useGetSearchQueryParam } from 'hooks/queryBuilder/useGetSearchQueryParam';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import { ICurrentQueryData } from 'hooks/useHandleExplorerTabChange';
import { ExplorerViews } from 'pages/LogsExplorer/utils';
import {
	FieldContext,
	PrettyActionState,
	PrettyViewAction,
	VisibleActionsConfig,
} from 'periscope/components/PrettyView/PrettyView';
import { useAppContext } from 'providers/App/App';
import {
	BaseAutocompleteData,
	DataTypes,
} from 'types/api/queryBuilder/queryAutocompleteResponse';

import { ActionItemProps } from '../ActionItem';
import {
	buildLogFilterTarget,
	toTypedFilterValue,
} from '../logAttributeActions.utils';

type ResolutionStatus = 'loading' | 'ready';

interface UseLogAttributeActionsParams {
	onClickActionItem?: ActionItemProps['onClickActionItem'];
	handleChangeSelectedView?: ChangeViewFunctionType;
	isListViewPanel?: boolean;
}

interface UseLogAttributeActionsResult {
	actions: PrettyViewAction[];
	visibleActions: VisibleActionsConfig;
	onActionMenuOpen: (context: FieldContext) => void;
}

const normalizeDataType = (
	dataType: DataTypes | undefined,
): DataTypes | undefined =>
	dataType && Object.values(DataTypes).includes(dataType) ? dataType : undefined;

/**
 * PrettyView filter/group-by/replace actions for the log-details drawer (keys mapped via
 * buildLogFilterTarget). Menu-open prefetches getAggregateKeys; items stay disabled +
 * spinner until ready. Also owns `visibleActions` (leaf/nested + list-panel copy-only).
 */
export function useLogAttributeActions({
	onClickActionItem,
	handleChangeSelectedView,
	isListViewPanel = false,
}: UseLogAttributeActionsParams): UseLogAttributeActionsResult {
	const { pathname } = useLocation();
	const queryClient = useQueryClient();
	const { currentQuery, stagedQuery, updateQueriesData } = useQueryBuilder();
	const { featureFlags } = useAppContext();
	const viewName = useGetSearchQueryParam(QueryParams.viewName) || '';

	const isBodyJsonQueryEnabled =
		featureFlags?.find((flag) => flag.name === FeatureKeys.USE_JSON_BODY)
			?.active || false;

	const isOldExplorerOrLive =
		pathname === ROUTES.OLD_LOGS_EXPLORER || pathname === ROUTES.LIVE_LOGS;

	// Per-key resolution status for the async getAggregateKeys prefetch, keyed by the
	// query-builder fieldKey (the same key react-query caches under), so filter-in and
	// filter-out on the same node share one entry.
	const [resolution, setResolution] = useState<Record<string, ResolutionStatus>>(
		{},
	);
	const kickedOff = useRef<Set<string>>(new Set());

	const resolveTarget = useCallback(
		(fieldKey: string): void => {
			if (kickedOff.current.has(fieldKey)) {
				return;
			}
			kickedOff.current.add(fieldKey);
			setResolution((prev) => ({ ...prev, [fieldKey]: 'loading' }));

			const resolve = async (): Promise<void> => {
				try {
					await queryClient.fetchQuery(
						[QueryBuilderKeys.GET_AGGREGATE_KEYS, fieldKey],
						async () =>
							getAggregateKeys({
								searchText: fieldKey,
								aggregateOperator:
									currentQuery.builder.queryData[0].aggregateOperator || '',
								dataSource: currentQuery.builder.queryData[0].dataSource,
								aggregateAttribute:
									currentQuery.builder.queryData[0].aggregateAttribute?.key || '',
							}),
					);
				} catch {
					// On failure the query still falls back to a custom-value key at click
					// time, so just unblock the menu either way.
				} finally {
					setResolution((prev) => ({ ...prev, [fieldKey]: 'ready' }));
				}
			};
			void resolve();
		},
		[queryClient, currentQuery],
	);

	const onActionMenuOpen = useCallback(
		(context: FieldContext): void => {
			const target = buildLogFilterTarget(
				context.fieldKeyPath,
				context.fieldValue,
				isBodyJsonQueryEnabled,
			);
			resolveTarget(target.fieldKey);
		},
		[isBodyJsonQueryEnabled, resolveTarget],
	);

	const filterFor = useCallback(
		(context: FieldContext, isFilterIn: boolean): void => {
			const target = buildLogFilterTarget(
				context.fieldKeyPath,
				context.fieldValue,
				isBodyJsonQueryEnabled,
			);
			onClickActionItem?.(
				target.fieldKey,
				toTypedFilterValue(context.fieldValue),
				isFilterIn ? target.filterInOperator : target.filterOutOperator,
				target.dataType,
				target.metricsType,
			);
		},
		[isBodyJsonQueryEnabled, onClickActionItem],
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
			const groupByKey = target.groupByKey;

			const updatedQuery = updateQueriesData(
				stagedQuery,
				'queryData',
				(item, index) => {
					if (index === 0) {
						const newGroupByItem: BaseAutocompleteData = {
							key: groupByKey,
							type: target.metricsType || '',
							dataType: normalizeDataType(target.dataType),
						};
						return { ...item, groupBy: [...(item.groupBy || []), newGroupByItem] };
					}
					return item;
				},
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

	// exact copy normalizedDataType in TableViewAction (will remove that later)
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
				(item, index) => {
					if (index === 0) {
						const newFilterItem: BaseAutocompleteData = {
							key: target.fieldKey,
							type: target.metricsType || '',
							dataType: normalizeDataType(target.dataType),
						};
						return {
							...item,
							filters: {
								items: [
									{
										id: '',
										key: newFilterItem,
										op: OPERATORS.IN,
										value: [toTypedFilterValue(context.fieldValue)],
									},
								],
								op: 'AND',
							},
							filter: { expression: '' },
						};
					}
					return item;
				},
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
		const getActionState = (context: FieldContext): PrettyActionState => {
			const target = buildLogFilterTarget(
				context.fieldKeyPath,
				context.fieldValue,
				isBodyJsonQueryEnabled,
			);
			const status = resolution[target.fieldKey];
			return { loading: status === 'loading', disabled: status !== 'ready' };
		};

		const isRestricted = (fieldKeyPath: (string | number)[]): boolean =>
			buildLogFilterTarget(fieldKeyPath, undefined, isBodyJsonQueryEnabled)
				.isRestricted;

		return [
			{
				key: 'filter-in',
				label: 'Filter for value',
				icon: <CirclePlus size={12} />,
				onClick: (context): void => filterFor(context, true),
				getActionState,
				shouldHide: (_key, fieldKeyPath): boolean => isRestricted(fieldKeyPath),
			},
			{
				key: 'filter-out',
				label: 'Filter out value',
				icon: <CircleMinus size={12} />,
				onClick: (context): void => filterFor(context, false),
				getActionState,
				shouldHide: (_key, fieldKeyPath): boolean => isRestricted(fieldKeyPath),
			},
			{
				key: 'group-by',
				label: 'Group by field',
				icon: <Layers size={12} />,
				onClick: groupBy,
				getActionState,
				shouldHide: (_key, fieldKeyPath): boolean =>
					!buildLogFilterTarget(fieldKeyPath, undefined, isBodyJsonQueryEnabled)
						.groupBySupported || isOldExplorerOrLive,
			},
			{
				key: 'replace-filter',
				label: 'Replace filters with this value',
				icon: <RefreshCw size={12} />,
				onClick: replaceFilter,
				getActionState,
				shouldHide: (_key, fieldKeyPath): boolean =>
					isRestricted(fieldKeyPath) || isOldExplorerOrLive,
			},
		];
	}, [
		filterFor,
		groupBy,
		replaceFilter,
		resolution,
		isBodyJsonQueryEnabled,
		isOldExplorerOrLive,
	]);

	const visibleActions = useMemo<VisibleActionsConfig>(
		() => ({
			leaf: isListViewPanel
				? ['copy']
				: ['copy', 'filter-in', 'filter-out', 'group-by', 'replace-filter'],
			nested: ['copy'],
		}),
		[isListViewPanel],
	);

	return { actions, visibleActions, onActionMenuOpen };
}
