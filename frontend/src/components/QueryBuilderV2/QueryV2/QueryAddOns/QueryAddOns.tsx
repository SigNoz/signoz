import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Button, Tooltip } from 'antd';
import cx from 'classnames';
import { ToggleGroupSimple } from '@signozhq/ui/toggle-group';
import InputWithLabel from 'components/InputWithLabel/InputWithLabel';
import { PANEL_TYPES } from 'constants/queryBuilder';
import { GroupByFilter } from 'container/QueryBuilder/filters/GroupByFilter/GroupByFilter';
import { OrderByFilter } from 'container/QueryBuilder/filters/OrderByFilter/OrderByFilter';
import { ReduceToFilter } from 'container/QueryBuilder/filters/ReduceToFilter/ReduceToFilter';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import { useQueryOperations } from 'hooks/queryBuilder/useQueryBuilderOperations';
import { get, isEmpty } from 'lodash-es';
import {
	BarChart,
	ChevronUp,
	ExternalLink,
	Grid3X3,
	ScrollText,
} from '@signozhq/icons';
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

import BucketOptions from './BucketOptions/BucketOptions';
import HavingFilter from './HavingFilter/HavingFilter';
import { buildDefaultLegendFromGroupBy } from './utils';

import './QueryAddOns.styles.scss';

interface AddOn {
	icon: React.ReactNode;
	label: string;
	key: QueryBuilderField;
	description?: string;
	docLink?: string;
}

const ADD_ONS_KEYS_TO_QUERY_PATH: Partial<Record<QueryBuilderField, string>> = {
	[QueryBuilderField.GroupBy]: 'groupBy',
	[QueryBuilderField.Having]: 'having.expression',
	[QueryBuilderField.OrderBy]: 'orderBy',
	[QueryBuilderField.Limit]: 'limit',
	[QueryBuilderField.Legend]: 'legend',
	[QueryBuilderField.ReduceTo]: 'reduceTo',
	[QueryBuilderField.BucketOptions]: 'bucketOptions',
};

const ADD_ONS: AddOn[] = [
	{
		icon: <BarChart size={14} />,
		label: 'Group By',
		key: QueryBuilderField.GroupBy,
		description:
			'Break down data by attributes like service name, endpoint, status code, or region. Essential for spotting patterns and comparing performance across different segments.',
		docLink: 'https://signoz.io/docs/querying/aggregation-grouping/#grouping',
	},
	{
		icon: <ScrollText size={14} />,
		label: 'Having',
		key: QueryBuilderField.Having,
		description:
			'Filter grouped results based on aggregate conditions. Show only groups meeting specific criteria, like error rates > 5% or p99 latency > 500',
		docLink:
			'https://signoz.io/docs/querying/result-manipulation/#conditional-filtering-with-having',
	},
	{
		icon: <ScrollText size={14} />,
		label: 'Order By',
		key: QueryBuilderField.OrderBy,
		description:
			'Sort results to surface what matters most. Quickly identify slowest operations, most frequent errors, or highest resource consumers.',
		docLink:
			'https://signoz.io/docs/querying/result-manipulation/#sorting--limiting',
	},
	{
		icon: <ScrollText size={14} />,
		label: 'Limit',
		key: QueryBuilderField.Limit,
		description:
			'Show only the top/bottom N results. Perfect for focusing on outliers, reducing noise, and improving dashboard performance.',
		docLink:
			'https://signoz.io/docs/querying/result-manipulation/#how-limit-works-for-time-series',
	},
	{
		icon: <ScrollText size={14} />,
		label: 'Legend format',
		key: QueryBuilderField.Legend,
		description:
			'Customize series labels using variables like {{service.name}}-{{endpoint}}. Makes charts readable at a glance during incident investigation.',
		docLink:
			'https://signoz.io/docs/querying/aggregation-grouping/#legend-formatting',
	},
];

const REDUCE_TO: AddOn = {
	icon: <ScrollText size={14} />,
	label: 'Reduce to',
	key: QueryBuilderField.ReduceTo,
	description:
		'Apply mathematical operations like sum, average, min, max, or percentiles to reduce multiple time series into a single value.',
	docLink:
		'https://signoz.io/docs/userguide/query-builder-v5/#result-manipulation',
};

// Offered only by a heatmap over metrics: the bucket axis is what a heatmap plots
// against, and no other panel type sends one.
const BUCKET_OPTIONS: AddOn = {
	icon: <Grid3X3 size={14} />,
	label: 'Bucket by',
	key: QueryBuilderField.BucketOptions,
	description:
		'Choose how the bucket axis is spaced — logarithmically, so every band is the same height and the tail stays readable, or linearly up to a max value. Left to Auto, the query picks the finest log axis it can return.',
	docLink: 'https://signoz.io/docs/userguide/query-builder-v5/',
};

const hasValue = (value: unknown): boolean =>
	value != null && value !== '' && !(Array.isArray(value) && value.length === 0);

// Custom tooltip content component
function TooltipContent({
	label,
	description,
	docLink,
}: {
	label: string;
	description?: string;
	docLink?: string;
}): JSX.Element {
	return (
		<div
			style={{
				display: 'flex',
				flexDirection: 'column',
				gap: '8px',
				maxWidth: '300px',
			}}
		>
			<strong style={{ fontSize: '14px' }}>{label}</strong>
			{description && (
				<span style={{ fontSize: '12px', lineHeight: '1.5' }}>{description}</span>
			)}
			{docLink && (
				<a
					href={docLink}
					target="_blank"
					rel="noopener noreferrer"
					onClick={(e): void => e.stopPropagation()}
					style={{
						display: 'flex',
						alignItems: 'center',
						gap: '4px',
						color: '#4096ff',
						fontSize: '12px',
						marginTop: '4px',
					}}
				>
					Learn more
					<ExternalLink size={12} />
				</a>
			)}
		</div>
	);
}

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
			addOns = ADD_ONS.filter((addOn) => addOn.key === QueryBuilderField.Legend);
		} else if (query.dataSource === DataSource.METRICS) {
			// Group by for metrics is offered by MetricsAggregateSection instead.
			addOns = ADD_ONS.filter((addOn) => addOn.key !== QueryBuilderField.GroupBy);
		} else {
			addOns = [...ADD_ONS];
		}

		if (showReduceTo) {
			addOns = [...addOns, REDUCE_TO];
		}

		if (
			panelType === PANEL_TYPES.HEATMAP &&
			query.dataSource === DataSource.METRICS
		) {
			addOns = [...addOns, BUCKET_OPTIONS];
		}

		return addOns;
	}, [panelType, query.dataSource, showReduceTo]);

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

			const activeAddOnKeys = new Set(
				Object.entries(ADD_ONS_KEYS_TO_QUERY_PATH)
					.filter(([, path]) => hasValue(get(query, path)))
					.map(([key]) => key as QueryBuilderField),
			);

			// Initial seeding from query values on mount. A disabled field never opens.
			setSelectedViews(
				offeredAddOns.filter((addOn) => {
					const resolved = resolvedFields.get(addOn.key);

					return (
						resolved?.pinned ||
						(activeAddOnKeys.has(addOn.key) && !resolved?.disabled)
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
			handleChangeQueryData('limit', Number(value) || null);
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
									placement="top"
									mouseEnterDelay={0.5}
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
									placement="top"
									mouseEnterDelay={0.5}
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
								placeholder="Enter limit"
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
									placement="top"
									mouseEnterDelay={0.5}
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
										placement="top"
										mouseEnterDelay={0.5}
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
								placeholder="Write legend format"
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

			<ToggleGroupSimple
				type="multiple"
				className="add-ons-tabs"
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
								placement="top"
								mouseEnterDelay={0.5}
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
	);
}

export default QueryAddOns;
