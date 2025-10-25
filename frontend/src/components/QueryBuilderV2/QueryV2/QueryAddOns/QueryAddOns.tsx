/* eslint-disable react/require-default-props */
import './QueryAddOns.styles.scss';

import { Button, Radio, RadioChangeEvent, Tooltip } from 'antd';
import InputWithLabel from 'components/InputWithLabel/InputWithLabel';
import { PANEL_TYPES } from 'constants/queryBuilder';
import { GroupByFilter } from 'container/QueryBuilder/filters/GroupByFilter/GroupByFilter';
import { OrderByFilter } from 'container/QueryBuilder/filters/OrderByFilter/OrderByFilter';
import { ReduceToFilter } from 'container/QueryBuilder/filters/ReduceToFilter/ReduceToFilter';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import { useQueryOperations } from 'hooks/queryBuilder/useQueryBuilderOperations';
import { get, isEmpty } from 'lodash-es';
import { BarChart2, ChevronUp, ExternalLink, ScrollText } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { IBuilderQuery } from 'types/api/queryBuilder/queryBuilderData';
import { MetricAggregation } from 'types/api/v5/queryRange';
import { DataSource, ReduceOperators } from 'types/common/queryBuilder';

import HavingFilter from './HavingFilter/HavingFilter';

interface AddOn {
	icon: React.ReactNode;
	label: string;
	key: string;
	description?: string;
	docLink?: string;
}

const ADD_ONS_KEYS = {
	GROUP_BY: 'group_by',
	HAVING: 'having',
	ORDER_BY: 'order_by',
	LIMIT: 'limit',
	LEGEND_FORMAT: 'legend_format',
};

const ADD_ONS_KEYS_TO_QUERY_PATH = {
	[ADD_ONS_KEYS.GROUP_BY]: 'groupBy',
	[ADD_ONS_KEYS.HAVING]: 'having.expression',
	[ADD_ONS_KEYS.ORDER_BY]: 'orderBy',
	[ADD_ONS_KEYS.LIMIT]: 'limit',
	[ADD_ONS_KEYS.LEGEND_FORMAT]: 'legend',
};

const ADD_ONS = [
	{
		icon: <BarChart2 size={14} />,
		label: 'Group By',
		key: 'group_by',
		description:
			'Break down data by attributes like service name, endpoint, status code, or region. Essential for spotting patterns and comparing performance across different segments.',
		docLink: 'https://signoz.io/docs/userguide/query-builder-v5/#grouping',
	},
	{
		icon: <ScrollText size={14} />,
		label: 'Having',
		key: 'having',
		description:
			'Filter grouped results based on aggregate conditions. Show only groups meeting specific criteria, like error rates > 5% or p99 latency > 500',
		docLink:
			'https://signoz.io/docs/userguide/query-builder-v5/#conditional-filtering-with-having',
	},
	{
		icon: <ScrollText size={14} />,
		label: 'Order By',
		key: 'order_by',
		description:
			'Sort results to surface what matters most. Quickly identify slowest operations, most frequent errors, or highest resource consumers.',
		docLink:
			'https://signoz.io/docs/userguide/query-builder-v5/#sorting--limiting',
	},
	{
		icon: <ScrollText size={14} />,
		label: 'Limit',
		key: 'limit',
		description:
			'Show only the top/bottom N results. Perfect for focusing on outliers, reducing noise, and improving dashboard performance.',
		docLink:
			'https://signoz.io/docs/userguide/query-builder-v5/#sorting--limiting',
	},
	{
		icon: <ScrollText size={14} />,
		label: 'Legend format',
		key: 'legend_format',
		description:
			'Customize series labels using variables like {{service.name}}-{{endpoint}}. Makes charts readable at a glance during incident investigation.',
		docLink:
			'https://signoz.io/docs/userguide/query-builder-v5/#legend-formatting',
	},
];

const REDUCE_TO = {
	icon: <ScrollText size={14} />,
	label: 'Reduce to',
	key: 'reduce_to',
	description:
		'Apply mathematical operations like sum, average, min, max, or percentiles to reduce multiple time series into a single value.',
	docLink:
		'https://signoz.io/docs/userguide/query-builder-v5/#reduce-operations',
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
	isListViewPanel,
	showReduceTo,
	panelType,
	index,
	isForTraceOperator = false,
}: {
	query: IBuilderQuery;
	version: string;
	isListViewPanel: boolean;
	showReduceTo: boolean;
	panelType: PANEL_TYPES | null;
	index: number;
	isForTraceOperator?: boolean;
}): JSX.Element {
	const [addOns, setAddOns] = useState<AddOn[]>(ADD_ONS);

	const [selectedViews, setSelectedViews] = useState<AddOn[]>([]);

	const { handleChangeQueryData } = useQueryOperations({
		index,
		query,
		entityVersion: '',
		isForTraceOperator,
	});

	const { handleSetQueryData } = useQueryBuilder();

	useEffect(() => {
		if (isListViewPanel) {
			setAddOns([]);

			setSelectedViews([
				ADD_ONS.find((addOn) => addOn.key === ADD_ONS_KEYS.ORDER_BY) as AddOn,
			]);

			return;
		}

		let filteredAddOns: AddOn[];
		if (panelType === PANEL_TYPES.VALUE) {
			// Filter out all add-ons except legend format
			filteredAddOns = ADD_ONS.filter(
				(addOn) => addOn.key === ADD_ONS_KEYS.LEGEND_FORMAT,
			);
		} else {
			filteredAddOns = Object.values(ADD_ONS);

			// Filter out group_by for metrics data source
			if (query.dataSource === DataSource.METRICS) {
				filteredAddOns = filteredAddOns.filter(
					(addOn) => addOn.key !== ADD_ONS_KEYS.GROUP_BY,
				);
			}
		}

		if (showReduceTo) {
			filteredAddOns = [...filteredAddOns, REDUCE_TO];
		}
		setAddOns(filteredAddOns);

		const activeAddOnKeys = new Set(
			Object.entries(ADD_ONS_KEYS_TO_QUERY_PATH)
				.filter(([, path]) => hasValue(get(query, path)))
				.map(([key]) => key),
		);

		const availableAddOnKeys = new Set(filteredAddOns.map((addOn) => addOn.key));

		// Filter and set selected views: add-ons that are both active and available
		setSelectedViews(
			ADD_ONS.filter(
				(addOn) =>
					activeAddOnKeys.has(addOn.key) && availableAddOnKeys.has(addOn.key),
			),
		);

		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [panelType, isListViewPanel, query]);

	const handleOptionClick = (e: RadioChangeEvent): void => {
		if (selectedViews.find((view) => view.key === e.target.value.key)) {
			setSelectedViews(
				selectedViews.filter((view) => view.key !== e.target.value.key),
			);
		} else {
			setSelectedViews([...selectedViews, e.target.value]);
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
		(key: string): void => {
			setSelectedViews(selectedViews.filter((view) => view.key !== key));
		},
		[selectedViews],
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

	return (
		<div className="query-add-ons">
			{selectedViews.length > 0 && (
				<div className="selected-add-ons-content">
					{selectedViews.find((view) => view.key === 'group_by') && (
						<div className="add-on-content" data-testid="group-by-content">
							<div className="periscope-input-with-label">
								<Tooltip
									title={
										<TooltipContent
											label="Group By"
											description="Break down data by attributes like service name, endpoint, status code, or region. Essential for spotting patterns and comparing performance across different segments."
											docLink="https://signoz.io/docs/userguide/query-builder-v5/#grouping"
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
								<Button
									className="close-btn periscope-btn ghost"
									icon={<ChevronUp size={16} />}
									onClick={(): void => handleRemoveView('group_by')}
								/>
							</div>
						</div>
					)}
					{selectedViews.find((view) => view.key === 'having') && (
						<div className="add-on-content" data-testid="having-content">
							<div className="periscope-input-with-label">
								<Tooltip
									title={
										<TooltipContent
											label="Having"
											description="Filter grouped results based on aggregate conditions. Show only groups meeting specific criteria, like error rates > 5% or p99 latency > 500"
											docLink="https://signoz.io/docs/userguide/query-builder-v5/#conditional-filtering-with-having"
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
										onClose={(): void => {
											setSelectedViews(
												selectedViews.filter((view) => view.key !== 'having'),
											);
										}}
										onChange={handleChangeHaving}
										queryData={query}
									/>
								</div>
							</div>
						</div>
					)}
					{selectedViews.find((view) => view.key === 'limit') && (
						<div className="add-on-content" data-testid="limit-content">
							<InputWithLabel
								label="Limit"
								onChange={handleChangeLimit}
								initialValue={query?.limit ?? undefined}
								placeholder="Enter limit"
								onClose={(): void => {
									setSelectedViews(selectedViews.filter((view) => view.key !== 'limit'));
								}}
								closeIcon={<ChevronUp size={16} />}
							/>
						</div>
					)}
					{selectedViews.find((view) => view.key === 'order_by') && (
						<div className="add-on-content" data-testid="order-by-content">
							<div className="periscope-input-with-label">
								<Tooltip
									title={
										<TooltipContent
											label="Order By"
											description="Sort results to surface what matters most. Quickly identify slowest operations, most frequent errors, or highest resource consumers."
											docLink="https://signoz.io/docs/userguide/query-builder-v5/#sorting--limiting"
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
										isListViewPanel={isListViewPanel}
										isNewQueryV2
									/>
								</div>
								{!isListViewPanel && (
									<Button
										className="close-btn periscope-btn ghost"
										icon={<ChevronUp size={16} />}
										onClick={(): void => handleRemoveView('order_by')}
									/>
								)}
							</div>
						</div>
					)}

					{selectedViews.find((view) => view.key === 'reduce_to') && showReduceTo && (
						<div className="add-on-content" data-testid="reduce-to-content">
							<div className="periscope-input-with-label">
								<Tooltip
									title={
										<TooltipContent
											label="Reduce to"
											description="Apply mathematical operations like sum, average, min, max, or percentiles to reduce multiple time series into a single value."
											docLink="https://signoz.io/docs/userguide/query-builder-v5/#reduce-operations"
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

								<Button
									className="close-btn periscope-btn ghost"
									icon={<ChevronUp size={16} />}
									onClick={(): void => handleRemoveView('reduce_to')}
								/>
							</div>
						</div>
					)}

					{selectedViews.find((view) => view.key === 'legend_format') && (
						<div className="add-on-content" data-testid="legend-format-content">
							<InputWithLabel
								label="Legend format"
								placeholder="Write legend format"
								onChange={handleChangeQueryLegend}
								initialValue={isEmpty(query?.legend) ? undefined : query?.legend}
								onClose={(): void => {
									setSelectedViews(
										selectedViews.filter((view) => view.key !== 'legend_format'),
									);
								}}
								closeIcon={<ChevronUp size={16} />}
							/>
						</div>
					)}
				</div>
			)}

			<div className="add-ons-list">
				<Radio.Group
					className="add-ons-tabs"
					onChange={handleOptionClick}
					value={selectedViews}
				>
					{addOns.map((addOn) => (
						<Tooltip
							key={addOn.key}
							title={
								<TooltipContent
									label={addOn.label}
									description={addOn.description}
									docLink={addOn.docLink}
								/>
							}
							placement="top"
							mouseEnterDelay={0.5}
						>
							<Radio.Button
								className={
									selectedViews.find((view) => view.key === addOn.key)
										? 'selected-view tab'
										: 'tab'
								}
								value={addOn}
							>
								<div
									className="add-on-tab-title"
									data-testid={`query-add-on-${addOn.key}`}
								>
									{addOn.icon}
									{addOn.label}
								</div>
							</Radio.Button>
						</Tooltip>
					))}
				</Radio.Group>
			</div>
		</div>
	);
}

export default QueryAddOns;
