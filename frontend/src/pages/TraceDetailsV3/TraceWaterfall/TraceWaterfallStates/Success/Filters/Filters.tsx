import { useCallback, useRef, useState } from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import { useCopyToClipboard } from 'react-use';
import {
	ChevronDown,
	ChevronUp,
	Copy,
	Info,
	Loader,
	Search,
	X,
} from '@signozhq/icons';
import { Switch, ToggleGroup, ToggleGroupItem, toast } from '@signozhq/ui';
import { Button } from '@signozhq/ui/button';
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from '@signozhq/ui/tooltip';
import { Typography } from '@signozhq/ui/typography';
import { AxiosError } from 'axios';
import QuerySearch from 'components/QueryBuilderV2/QueryV2/QuerySearch/QuerySearch';
import { convertExpressionToFilters } from 'components/QueryBuilderV2/utils';
import { DEFAULT_ENTITY_VERSION } from 'constants/app';
import { initialQueriesMap, PANEL_TYPES } from 'constants/queryBuilder';
import { useGetQueryRange } from 'hooks/queryBuilder/useGetQueryRange';
import { uniqBy } from 'lodash-es';
import { DataTypes } from 'types/api/queryBuilder/queryAutocompleteResponse';
import { Query, TagFilter } from 'types/api/queryBuilder/queryBuilderData';
import {
	DataSource,
	TracesAggregatorOperator,
} from 'types/common/queryBuilder';

import { BASE_FILTER_QUERY } from './constants';
import { useHighlightErrors } from './hooks/useHighlightErrors';
import {
	SpanCategory,
	useSpanCategoryFilter,
} from './hooks/useSpanCategoryFilter';

import './Filters.styles.scss';

function prepareQuery(filters: TagFilter, traceID: string): Query {
	return {
		...initialQueriesMap.traces,
		builder: {
			...initialQueriesMap.traces.builder,
			queryData: [
				{
					...initialQueriesMap.traces.builder.queryData[0],
					aggregateOperator: TracesAggregatorOperator.NOOP,
					orderBy: [{ columnName: 'timestamp', order: 'asc' }],
					filters: {
						...filters,
						items: [
							...filters.items,
							{
								id: '5ab8e1cf',
								key: {
									key: 'trace_id',
									dataType: DataTypes.String,
									type: '',
									id: 'trace_id--string----true',
								},
								op: '=',
								value: traceID,
							},
						],
					},
					selectColumns: [],
				},
			],
		},
	};
}

function Filters({
	startTime,
	endTime,
	traceID,
	onFilteredSpansChange = (): void => {},
	isExpanded,
	onExpand,
	onCollapse,
}: {
	startTime: number;
	endTime: number;
	traceID: string;
	onFilteredSpansChange?: (spanIds: string[], isFilterActive: boolean) => void;
	isExpanded: boolean;
	onExpand: () => void;
	onCollapse: () => void;
}): JSX.Element {
	const [, setCopy] = useCopyToClipboard();
	const [filters, setFilters] = useState<TagFilter>(
		BASE_FILTER_QUERY.filters || { items: [], op: 'AND' },
	);
	const [expression, setExpression] = useState<string>('');
	const [noData, setNoData] = useState<boolean>(false);
	const [filteredSpanIds, setFilteredSpanIds] = useState<string[]>([]);
	const [currentSearchedIndex, setCurrentSearchedIndex] = useState<number>(0);
	const expressionRef = useRef<string>('');
	const containerRef = useRef<HTMLDivElement>(null);

	const runQuery = useCallback(
		(value: string): void => {
			const items = convertExpressionToFilters(value);
			setFilters({ items, op: 'AND' });
			// Clear results when expression produces no filters
			if (items.length === 0) {
				setFilteredSpanIds([]);
				onFilteredSpansChange?.([], false);
				setCurrentSearchedIndex(0);
				setNoData(false);
			}
		},
		[onFilteredSpansChange],
	);

	// onChange fires on every keystroke — only store the expression, don't trigger API
	const handleExpressionChange = useCallback(
		(value: string): void => {
			setExpression(value);
			expressionRef.current = value;
			// Clear results when expression is emptied
			if (!value.trim()) {
				setFilters({ items: [], op: 'AND' });
				setFilteredSpanIds([]);
				onFilteredSpansChange?.([], false);
				setCurrentSearchedIndex(0);
				setNoData(false);
			}
		},
		[onFilteredSpansChange],
	);

	// onRun fires on Ctrl+Enter
	const handleRunQuery = useCallback(
		(value: string): void => {
			runQuery(value);
		},
		[runQuery],
	);

	// Run query on blur (click outside the filter input)
	const handleBlur = useCallback((): void => {
		runQuery(expressionRef.current);
	}, [runQuery]);

	// Expression-based filter hooks
	const filterProps = {
		expression,
		filters,
		setExpression,
		expressionRef,
		runQuery,
	};
	const { isHighlightErrors, handleToggle: handleToggleHighlightErrors } =
		useHighlightErrors(filterProps);
	const { selectedCategory, categories, handleCategoryChange } =
		useSpanCategoryFilter(filterProps);

	const { search } = useLocation();
	const history = useHistory();

	const handlePrevNext = useCallback(
		(index: number, spanId?: string): void => {
			const searchParams = new URLSearchParams(search);
			if (spanId) {
				searchParams.set('spanId', spanId);
			} else {
				searchParams.set('spanId', filteredSpanIds[index]);
			}

			history.replace({ search: searchParams.toString() });
		},
		[filteredSpanIds, history, search],
	);

	const { isFetching, error } = useGetQueryRange(
		{
			query: prepareQuery(filters, traceID),
			graphType: PANEL_TYPES.LIST,
			selectedTime: 'GLOBAL_TIME',
			start: startTime,
			end: endTime,
			params: {
				dataSource: 'traces',
			},
			tableParams: {
				pagination: {
					offset: 0,
					limit: 10000,
				},
				selectColumns: [
					{
						key: 'spanID',
						dataType: 'string',
						type: 'tag',
						id: 'spanId--string--tag--true',
						isIndexed: false,
					},
				],
			},
		},
		DEFAULT_ENTITY_VERSION,
		{
			queryKey: [filters],
			enabled: filters.items.length > 0,
			onSuccess: (data) => {
				const isFilterActive = filters.items.length > 0;
				if (data?.payload.data.newResult.data.result[0].list) {
					const uniqueSpans = uniqBy(
						data?.payload.data.newResult.data.result[0].list,
						'data.spanID',
					);

					const spanIds = uniqueSpans.map((val) => val.data.spanID);
					setFilteredSpanIds(spanIds);
					onFilteredSpansChange?.(spanIds, isFilterActive);
					handlePrevNext(0, spanIds[0]);
					setNoData(false);
				} else {
					setNoData(true);
					setFilteredSpanIds([]);
					onFilteredSpansChange?.([], isFilterActive);
					setCurrentSearchedIndex(0);
				}
			},
			onError: () => {
				const isFilterActive = filters.items.length > 0;
				setNoData(false);
				setFilteredSpanIds([]);
				onFilteredSpansChange?.([], isFilterActive);
				setCurrentSearchedIndex(0);
			},
		},
	);

	const highlightErrorsToggle = (
		<div className="highlight-errors-toggle">
			<Typography.Text>Highlight errors</Typography.Text>
			<Switch
				color="cherry"
				value={isHighlightErrors}
				onChange={handleToggleHighlightErrors}
			/>
		</div>
	);

	const statusIndicators = (
		<>
			{isFetching && <Loader className="animate-spin" />}
			{error && (
				<Tooltip>
					<TooltipTrigger asChild>
						<span className="filter-status filter-status--error">
							<Info />
							API error
						</span>
					</TooltipTrigger>
					<TooltipContent>
						{(error as AxiosError)?.message || 'Something went wrong'}
					</TooltipContent>
				</Tooltip>
			)}
			{!error && noData && (
				<Typography.Text className="filter-status">
					No results found
				</Typography.Text>
			)}
		</>
	);

	// --- COLLAPSED VIEW ---
	if (!isExpanded) {
		const pill = (
			/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions */
			<div className="filter-pill" onClick={onExpand}>
				<Search size={12} />
				<span className="filter-pill__text">{expression || 'Search...'}</span>
				{expression && <span className="filter-pill__indicator" />}
			</div>
		);

		return (
			<TooltipProvider>
				<div className="trace-v3-filter-row collapsed">
					{expression ? (
						<Tooltip>
							<TooltipTrigger asChild>{pill}</TooltipTrigger>
							<TooltipContent side="bottom" align="start">
								<div className="filter-pill-popover">
									<div className="filter-pill-popover__header">
										<Typography.Text>Search query</Typography.Text>
										<Button
											variant="ghost"
											size="icon"
											color="secondary"
											onClick={(): void => {
												setCopy(expression);
												toast.success('Copied to clipboard', {
													richColors: false,
													position: 'top-right',
												});
											}}
										>
											<Copy size={12} />
										</Button>
									</div>
									<div className="filter-pill-popover__expression">{expression}</div>
								</div>
							</TooltipContent>
						</Tooltip>
					) : (
						pill
					)}
					{highlightErrorsToggle}
					{statusIndicators}
				</div>
			</TooltipProvider>
		);
	}

	// --- EXPANDED VIEW ---
	return (
		<TooltipProvider>
			<div className="trace-v3-filter-row expanded">
				<ToggleGroup
					type="single"
					value={selectedCategory}
					onChange={(value): void => {
						if (value) {
							handleCategoryChange(value as SpanCategory);
						}
					}}
					size="sm"
				>
					{categories.map((category) => (
						<ToggleGroupItem key={category} value={category}>
							{category}
						</ToggleGroupItem>
					))}
				</ToggleGroup>
				{/* eslint-disable-next-line jsx-a11y/no-static-element-interactions */}
				<div
					className="filter-search-container"
					ref={containerRef}
					onBlur={(e): void => {
						if (!containerRef.current?.contains(e.relatedTarget as Node)) {
							handleBlur();
						}
					}}
				>
					<QuerySearch
						queryData={{
							...BASE_FILTER_QUERY,
							filters,
							filter: { expression },
						}}
						onChange={handleExpressionChange}
						onRun={handleRunQuery}
						dataSource={DataSource.TRACES}
						placeholder="Enter your filter query (e.g., http.status_code >= 500 AND service.name = 'frontend')"
					/>
				</div>
				{filteredSpanIds.length > 0 && (
					<div className="pre-next-toggle">
						<Typography.Text className="pre-next-toggle__count">
							{currentSearchedIndex + 1} / {filteredSpanIds.length}
						</Typography.Text>
						<Button
							variant="ghost"
							size="icon"
							color="secondary"
							disabled={currentSearchedIndex === 0}
							onClick={(): void => {
								handlePrevNext(currentSearchedIndex - 1);
								setCurrentSearchedIndex((prev) => prev - 1);
							}}
						>
							<ChevronUp size={14} />
						</Button>
						<Button
							variant="ghost"
							size="icon"
							color="secondary"
							disabled={currentSearchedIndex === filteredSpanIds.length - 1}
							onClick={(): void => {
								handlePrevNext(currentSearchedIndex + 1);
								setCurrentSearchedIndex((prev) => prev + 1);
							}}
						>
							<ChevronDown size={14} />
						</Button>
					</div>
				)}
				<Button
					variant="ghost"
					size="icon"
					color="secondary"
					className="filter-collapse-btn"
					onClick={onCollapse}
				>
					<X size={14} />
				</Button>
				{highlightErrorsToggle}
				{statusIndicators}
			</div>
		</TooltipProvider>
	);
}

Filters.defaultProps = {
	onFilteredSpansChange: undefined,
};

export default Filters;
