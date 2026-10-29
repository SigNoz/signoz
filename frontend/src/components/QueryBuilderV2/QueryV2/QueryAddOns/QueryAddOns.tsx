import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Button } from 'antd';
import cx from 'classnames';
import { ToggleGroup } from '@signozhq/ui/toggle-group';
import { Tooltip, TooltipProvider } from '@signozhq/ui/tooltip';
import InputWithLabel from 'components/InputWithLabel/InputWithLabel';
import { PANEL_TYPES } from 'constants/queryBuilder';
import { GroupByFilter } from 'container/QueryBuilder/filters/GroupByFilter/GroupByFilter';
import { OrderByFilter } from 'container/QueryBuilder/filters/OrderByFilter/OrderByFilter';
import { ReduceToFilter } from 'container/QueryBuilder/filters/ReduceToFilter/ReduceToFilter';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import { useQueryOperations } from 'hooks/queryBuilder/useQueryBuilderOperations';
import { get, isEmpty } from 'lodash-es';
import { ChevronUp } from '@signozhq/icons';
import { Querybuildertypesv5BucketOptionsDTO } from 'api/generated/services/sigNoz.schemas';
import { IBuilderQuery } from 'types/api/queryBuilder/queryBuilderData';
import { MetricAggregation } from 'types/api/v5/queryRange';
import { DataSource, ReduceOperators } from 'types/common/queryBuilder';

import {
	QueryBuilderField,
	QueryBuilderFieldsConfig,
} from '../../queryBuilderFields.types';
import {
	mergeQueryBuilderFieldsConfig,
	RAW_QUERY_FIELDS,
	resolveQueryBuilderFields,
} from '../../queryBuilderFields.utils';
import { parseLimit } from '../../utils';

import BucketOptions from './BucketOptions/BucketOptions';
import HavingFilter from './HavingFilter/HavingFilter';
import {
	ADD_ON_DEFINITIONS,
	ADD_ON_TOOLTIP_DELAY_MS,
	BASE_ADD_ONS,
	BUCKET_OPTIONS,
	HISTOGRAM_ATTRIBUTE_TYPES,
	type InputAddOnField,
	REDUCE_TO,
} from './constants';
import TooltipContent from './TooltipContent';
import type { AddOn } from './types';
import { buildDefaultLegendFromGroupBy, hasValue } from './utils';

import './QueryAddOns.styles.scss';

function QueryAddOns({
	query,
	version,
	isRawQuery,
	showReduceTo,
	panelType,
	index,
	fieldsConfig,
	isForTraceOperator = false,
}: {
	query: IBuilderQuery;
	version: string;
	isRawQuery: boolean;
	showReduceTo: boolean;
	panelType: PANEL_TYPES | null;
	index: number;
	fieldsConfig?: QueryBuilderFieldsConfig;
	isForTraceOperator?: boolean;
}): JSX.Element {
	const [selectedViews, setSelectedViews] = useState<AddOn[]>([]);

	const initializedRef = useRef(false);
	const prevAvailableKeysRef = useRef<Set<QueryBuilderField> | null>(null);

	const { handleChangeQueryData } = useQueryOperations({
		index,
		query,
		entityVersion: '',
		isForTraceOperator,
	});

	const { handleSetQueryData, currentQuery } = useQueryBuilder();

	const supportedAddOns = useMemo((): AddOn[] => {
		let addOns: AddOn[];

		if (panelType === PANEL_TYPES.VALUE) {
			addOns = BASE_ADD_ONS.filter(
				(addOn) => addOn.key === QueryBuilderField.Legend,
			);
		} else if (query.dataSource === DataSource.METRICS) {
			// Group by for metrics is offered by MetricsAggregateSection instead.
			addOns = BASE_ADD_ONS.filter(
				(addOn) => addOn.key !== QueryBuilderField.GroupBy,
			);
		} else {
			addOns = [...BASE_ADD_ONS];
		}

		if (showReduceTo) {
			addOns = [...addOns, REDUCE_TO];
		}

		if (
			panelType === PANEL_TYPES.HEATMAP &&
			query.dataSource === DataSource.METRICS &&
			!HISTOGRAM_ATTRIBUTE_TYPES.has(query.aggregateAttribute?.type ?? '')
		) {
			addOns = [...addOns, BUCKET_OPTIONS];
		}

		return addOns;
	}, [
		panelType,
		query.dataSource,
		query.aggregateAttribute?.type,
		showReduceTo,
	]);

	const resolvedFields = useMemo(
		() =>
			resolveQueryBuilderFields(
				supportedAddOns.map((addOn) => addOn.key),
				mergeQueryBuilderFieldsConfig(
					isRawQuery ? RAW_QUERY_FIELDS : undefined,
					fieldsConfig,
				),
			),
		[supportedAddOns, fieldsConfig, isRawQuery],
	);

	const offeredAddOns = useMemo(
		() =>
			supportedAddOns.filter((addOn) => !resolvedFields.get(addOn.key)?.hidden),
		[supportedAddOns, resolvedFields],
	);

	const pinnedAddOns = useMemo(
		() => offeredAddOns.filter((addOn) => resolvedFields.get(addOn.key)?.pinned),
		[offeredAddOns, resolvedFields],
	);

	const togglableAddOns = useMemo(
		() => offeredAddOns.filter((addOn) => !resolvedFields.get(addOn.key)?.pinned),
		[offeredAddOns, resolvedFields],
	);

	const isPinned = useCallback(
		(key: QueryBuilderField): boolean => Boolean(resolvedFields.get(key)?.pinned),
		[resolvedFields],
	);

	const placeholderOf = useCallback(
		(key: InputAddOnField): string =>
			resolvedFields.get(key)?.placeholder ?? ADD_ON_DEFINITIONS[key].placeholder,
		[resolvedFields],
	);

	const isDisabled = useCallback(
		(key: QueryBuilderField): boolean =>
			Boolean(resolvedFields.get(key)?.disabled),
		[resolvedFields],
	);

	useEffect(() => {
		const availableAddOnKeys = new Set(offeredAddOns.map((a) => a.key));
		const previousKeys = prevAvailableKeysRef.current;
		const hasAvailabilityItemsChanged =
			previousKeys !== null &&
			(previousKeys.size !== availableAddOnKeys.size ||
				[...availableAddOnKeys].some((key) => !previousKeys.has(key)));
		prevAvailableKeysRef.current = availableAddOnKeys;

		if (!initializedRef.current || hasAvailabilityItemsChanged) {
			initializedRef.current = true;

			// Initial seeding from query values on mount. A disabled field never opens.
			setSelectedViews(
				offeredAddOns.filter((addOn) => {
					const resolved = resolvedFields.get(addOn.key);

					return (
						resolved?.pinned ||
						(hasValue(get(query, addOn.queryPath)) && !resolved?.disabled)
					);
				}),
			);
			return;
		}

		setSelectedViews((prev) => {
			const kept = prev.filter((view) => availableAddOnKeys.has(view.key));

			const reopenedPinned = pinnedAddOns.filter(
				(addOn) => !kept.some((view) => view.key === addOn.key),
			);

			return [...kept, ...reopenedPinned];
		});
	}, [offeredAddOns, pinnedAddOns, query]);

	const handleOptionClick = (clickedAddOn: AddOn): void => {
		if (isDisabled(clickedAddOn.key)) {
			return;
		}

		const isAlreadySelected = selectedViews.some(
			(view) => view.key === clickedAddOn.key,
		);

		if (isAlreadySelected) {
			setSelectedViews((prev) =>
				prev.filter((view) => view.key !== clickedAddOn.key),
			);
		} else {
			// When enabling Legend format for the first time with an empty legend
			// and existing group-by keys, prefill the legend using all group-by keys.
			// This keeps existing custom legends intact and only helps seed a sensible default.
			if (
				clickedAddOn.key === QueryBuilderField.Legend &&
				isEmpty(query?.legend) &&
				Array.isArray(query.groupBy) &&
				query.groupBy.length > 0
			) {
				const defaultLegend = buildDefaultLegendFromGroupBy(query.groupBy);

				if (defaultLegend) {
					handleChangeQueryLegend(defaultLegend);
				}
			}

			setSelectedViews((prev) => [...prev, clickedAddOn]);
		}
	};

	const handleChangeGroupByKeys = useCallback(
		(value: IBuilderQuery['groupBy']) => {
			handleChangeQueryData('groupBy', value);
		},
		[handleChangeQueryData],
	);

	const handleChangeOrderByKeys = useCallback(
		(value: IBuilderQuery['orderBy']) => {
			handleChangeQueryData('orderBy', value);
		},
		[handleChangeQueryData],
	);

	const handleChangeReduceToV5 = useCallback(
		(value: ReduceOperators) => {
			handleSetQueryData(index, {
				...query,
				aggregations: [
					{
						...(query.aggregations?.[0] as MetricAggregation),
						reduceTo: value,
					},
				],
			});
		},
		[handleSetQueryData, index, query],
	);

	const handleRemoveView = useCallback(
		(key: QueryBuilderField): void => {
			if (isPinned(key)) {
				return;
			}

			setSelectedViews((prev) => prev.filter((view) => view.key !== key));
		},
		[isPinned],
	);

	const handleChangeQueryLegend = useCallback(
		(value: string) => {
			handleChangeQueryData('legend', value);
		},
		[handleChangeQueryData],
	);

	const handleChangeLimit = useCallback(
		(value: string) => {
			handleChangeQueryData('limit', parseLimit(value));
		},
		[handleChangeQueryData],
	);

	const handleChangeHaving = useCallback(
		(value: string) => {
			handleChangeQueryData('having', {
				expression: value,
			});
		},
		[handleChangeQueryData],
	);

	const handleChangeBucketOptions = useCallback(
		(value: Querybuildertypesv5BucketOptionsDTO | undefined) => {
			handleChangeQueryData('bucketOptions', value);
		},
		[handleChangeQueryData],
	);

	return (
		<TooltipProvider delay={ADD_ON_TOOLTIP_DELAY_MS}>
			<div className="query-add-ons" data-testid="query-add-ons">
				{selectedViews.length > 0 && (
					<div className="selected-add-ons-content">
						{selectedViews.find((view) => view.key === QueryBuilderField.GroupBy) && (
							<div className="add-on-content" data-testid="group-by-content">
								<div className="periscope-input-with-label">
									<Tooltip
										title={
											<TooltipContent
												label="Group By"
												description="Break down data by attributes like service name, endpoint, status code, or region. Essential for spotting patterns and comparing performance across different segments."
												docLink="https://signoz.io/docs/querying/aggregation-grouping/#grouping"
											/>
										}
									>
										<div className="label" style={{ cursor: 'help' }}>
											Group By
										</div>
									</Tooltip>
									<div className="input">
										<GroupByFilter
											disabled={
												query.dataSource === DataSource.METRICS &&
												!(query.aggregations?.[0] as MetricAggregation)?.metricName
											}
											query={query}
											onChange={handleChangeGroupByKeys}
											placeholder={placeholderOf(QueryBuilderField.GroupBy)}
										/>
									</div>
									{!isPinned(QueryBuilderField.GroupBy) && (
										<Button
											className="close-btn periscope-btn ghost"
											icon={<ChevronUp size={16} />}
											onClick={(): void => handleRemoveView(QueryBuilderField.GroupBy)}
										/>
									)}
								</div>
							</div>
						)}
						{selectedViews.find((view) => view.key === QueryBuilderField.Having) && (
							<div className="add-on-content" data-testid="having-content">
								<div className="periscope-input-with-label">
									<Tooltip
										title={
											<TooltipContent
												label="Having"
												description="Filter grouped results based on aggregate conditions. Show only groups meeting specific criteria, like error rates > 5% or p99 latency > 500"
												docLink="https://signoz.io/docs/querying/result-manipulation/#conditional-filtering-with-having"
											/>
										}
									>
										<div className="label" style={{ cursor: 'help' }}>
											Having
										</div>
									</Tooltip>
									<div className="input">
										<HavingFilter
											onClose={(): void => handleRemoveView(QueryBuilderField.Having)}
											onChange={handleChangeHaving}
											queryData={query}
											placeholder={placeholderOf(QueryBuilderField.Having)}
										/>
									</div>
								</div>
							</div>
						)}
						{selectedViews.find((view) => view.key === QueryBuilderField.Limit) && (
							<div className="add-on-content" data-testid="limit-content">
								<InputWithLabel
									label="Limit"
									type="number"
									onChange={handleChangeLimit}
									initialValue={query?.limit ?? undefined}
									placeholder={placeholderOf(QueryBuilderField.Limit)}
									onClose={(): void => handleRemoveView(QueryBuilderField.Limit)}
									closeIcon={<ChevronUp size={16} />}
								/>
							</div>
						)}
						{selectedViews.find((view) => view.key === QueryBuilderField.OrderBy) && (
							<div className="add-on-content" data-testid="order-by-content">
								<div className="periscope-input-with-label">
									<Tooltip
										title={
											<TooltipContent
												label="Order By"
												description="Sort results to surface what matters most. Quickly identify slowest operations, most frequent errors, or highest resource consumers."
												docLink="https://signoz.io/docs/querying/result-manipulation/#sorting--limiting"
											/>
										}
									>
										<div className="label" style={{ cursor: 'help' }}>
											Order By
										</div>
									</Tooltip>
									<div className="input">
										<OrderByFilter
											entityVersion={version}
											query={query}
											onChange={handleChangeOrderByKeys}
											isRawQuery={isRawQuery}
											isNewQueryV2
											placeholder={placeholderOf(QueryBuilderField.OrderBy)}
										/>
									</div>
									{!isPinned(QueryBuilderField.OrderBy) && (
										<Button
											className="close-btn periscope-btn ghost"
											icon={<ChevronUp size={16} />}
											onClick={(): void => handleRemoveView(QueryBuilderField.OrderBy)}
										/>
									)}
								</div>
							</div>
						)}

						{selectedViews.find((view) => view.key === QueryBuilderField.ReduceTo) &&
							showReduceTo && (
								<div className="add-on-content" data-testid="reduce-to-content">
									<div className="periscope-input-with-label">
										<Tooltip
											title={
												<TooltipContent
													label="Reduce to"
													description="Apply mathematical operations like sum, average, min, max, or percentiles to reduce multiple time series into a single value."
													docLink="https://signoz.io/docs/userguide/query-builder-v5/#result-manipulation"
												/>
											}
										>
											<div className="label" style={{ cursor: 'help' }}>
												Reduce to
											</div>
										</Tooltip>
										<div className="input">
											<ReduceToFilter query={query} onChange={handleChangeReduceToV5} />
										</div>

										{!isPinned(QueryBuilderField.ReduceTo) && (
											<Button
												className="close-btn periscope-btn ghost"
												icon={<ChevronUp size={16} />}
												onClick={(): void => handleRemoveView(QueryBuilderField.ReduceTo)}
											/>
										)}
									</div>
								</div>
							)}

						{selectedViews.find((view) => view.key === QueryBuilderField.Legend) && (
							<div className="add-on-content" data-testid="legend-format-content">
								<InputWithLabel
									label="Legend format"
									placeholder={placeholderOf(QueryBuilderField.Legend)}
									onChange={handleChangeQueryLegend}
									initialValue={isEmpty(query?.legend) ? undefined : query?.legend}
									onClose={(): void => handleRemoveView(QueryBuilderField.Legend)}
									closeIcon={<ChevronUp size={16} />}
								/>
							</div>
						)}

						{selectedViews.find(
							(view) => view.key === QueryBuilderField.BucketOptions,
						) && (
							<div className="add-on-content" data-testid="bucket-options-content">
								<BucketOptions
									bucketOptions={query.bucketOptions}
									unit={currentQuery.unit}
									onChange={handleChangeBucketOptions}
									onClose={(): void => handleRemoveView(QueryBuilderField.BucketOptions)}
								/>
							</div>
						)}
					</div>
				)}

				<ToggleGroup
					variant="outlined"
					color="secondary"
					size="sm"
					type="multiple"
					allowClear
					value={selectedViews.map((view) => view.key)}
					onChange={(newKeys: string[]): void => {
						const oldKeys: string[] = selectedViews.map((view) => view.key);
						const toggledKey =
							newKeys.find((key) => !oldKeys.includes(key)) ??
							oldKeys.find((key) => !newKeys.includes(key));
						if (!toggledKey) {
							return;
						}
						const clickedAddOn = togglableAddOns.find((a) => a.key === toggledKey);
						if (clickedAddOn) {
							handleOptionClick(clickedAddOn);
						}
					}}
					items={togglableAddOns.map((addOn) => {
						const resolved = resolvedFields.get(addOn.key);

						return {
							value: addOn.key,
							label: (
								<Tooltip
									title={
										<TooltipContent
											label={addOn.label}
											description={resolved?.reason ?? addOn.description}
											docLink={resolved?.disabled ? undefined : addOn.docLink}
										/>
									}
								>
									<span
										className={cx('add-on-tab-title', {
											'add-on-tab-title--disabled': resolved?.disabled,
										})}
										aria-disabled={resolved?.disabled}
										data-testid={`query-add-on-${addOn.key}`}
									>
										{addOn.icon}
										{addOn.label}
									</span>
								</Tooltip>
							),
						};
					})}
				/>
			</div>
		</TooltipProvider>
	);
}

export default QueryAddOns;
