import { useCallback, useRef, useState } from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import { useCopyToClipboard } from 'react-use';
import { ChevronsRight, Copy, Search, X } from '@signozhq/icons';
import { Switch } from '@signozhq/ui/switch';
import { ToggleGroup, ToggleGroupItem } from '@signozhq/ui/toggle-group';
import { toast } from '@signozhq/ui/sonner';
import { Button } from '@signozhq/ui/button';
import {
	TooltipRoot,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from '@signozhq/ui/tooltip';
import { Typography } from '@signozhq/ui/typography';
import cx from 'classnames';
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
import QueryResult from './QueryResult';

import styles from './Filters.module.scss';

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
	// Wraps both the input AND the result-nav cluster. onBlur fires only when
	// focus leaves this whole region — clicking ↑↓ or the Clear X stays
	// inside the ref, so we don't re-fire a failing query on the way to
	// navigating / clearing.
	const containerRef = useRef<HTMLDivElement>(null);

	const runQuery = useCallback(
		(value: string): void => {
			// oxlint-disable-next-line no-console
			console.log('Running query with expression:', value);
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

	// Clear filter — reset expression + filters + results in one shot.
	// Wired to the X button in the result-nav cluster.
	const handleClear = useCallback((): void => {
		setExpression('');
		expressionRef.current = '';
		setFilters({ items: [], op: 'AND' });
		setFilteredSpanIds([]);
		onFilteredSpansChange?.([], false);
		setCurrentSearchedIndex(0);
		setNoData(false);
	}, [onFilteredSpansChange]);

	// Expression-based filter hooks
	const filterProps = {
		expression,
		filters,
		setExpression,
		expressionRef,
		runQuery,
	};
	const { isHighlightErrors, handleToggle: toggleHighlightErrors } =
		useHighlightErrors(filterProps);

	// Auto-expand the filter row when turning Highlight errors ON so the user
	// can immediately use prev/next navigation. Turning it OFF doesn't auto-
	// collapse — the user keeps whatever expansion state they had.
	const handleToggleHighlightErrors = useCallback(
		(checked: boolean): void => {
			if (checked && !isExpanded) {
				onExpand();
			}
			toggleHighlightErrors(checked);
		},
		[isExpanded, onExpand, toggleHighlightErrors],
	);
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
		<div className={styles.highlightErrorsToggle}>
			<Typography.Text>Highlight errors</Typography.Text>
			<Switch
				color="cherry"
				value={isHighlightErrors}
				onChange={handleToggleHighlightErrors}
			/>
		</div>
	);

	const hasExpression = expression.trim().length > 0;
	const hasResults = filteredSpanIds.length > 0;

	const handlePrev = useCallback((): void => {
		handlePrevNext(currentSearchedIndex - 1);
		setCurrentSearchedIndex((prev) => prev - 1);
	}, [currentSearchedIndex, handlePrevNext]);

	const handleNext = useCallback((): void => {
		handlePrevNext(currentSearchedIndex + 1);
		setCurrentSearchedIndex((prev) => prev + 1);
	}, [currentSearchedIndex, handlePrevNext]);

	const resultNav = hasExpression ? (
		<div className={styles.resultNav}>
			<QueryResult
				hasExpression={hasExpression}
				hasResults={hasResults}
				isFetching={isFetching}
				error={error}
				noData={noData}
				currentIndex={currentSearchedIndex}
				total={filteredSpanIds.length}
				onPrev={handlePrev}
				onNext={handleNext}
			/>
			<TooltipRoot>
				<TooltipTrigger asChild>
					<Button
						variant="ghost"
						size="icon"
						color="secondary"
						onClick={handleClear}
					>
						<X size={14} />
					</Button>
				</TooltipTrigger>
				<TooltipContent>Clear filter</TooltipContent>
			</TooltipRoot>
		</div>
	) : null;

	// --- COLLAPSED VIEW ---
	if (!isExpanded) {
		const pill = (
			/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions */
			<div className={styles.pill} onClick={onExpand}>
				<Search size={12} />
				<span className={styles.pillText}>{expression || 'Search...'}</span>
				{expression && <span className={styles.pillIndicator} />}
			</div>
		);

		return (
			<TooltipProvider>
				<div className={styles.root}>
					{expression ? (
						<TooltipRoot>
							<TooltipTrigger asChild>{pill}</TooltipTrigger>
							<TooltipContent side="bottom" align="start">
								<div className={styles.pillPopover}>
									<div className={styles.pillPopoverHeader}>
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
									<div className={styles.pillPopoverExpression}>{expression}</div>
								</div>
							</TooltipContent>
						</TooltipRoot>
					) : (
						pill
					)}
					<QueryResult
						hasExpression={hasExpression}
						hasResults={hasResults}
						isFetching={isFetching}
						error={error}
						noData={noData}
						currentIndex={currentSearchedIndex}
						total={filteredSpanIds.length}
						onPrev={handlePrev}
						onNext={handleNext}
						showNavigation={false}
					/>
					{highlightErrorsToggle}
				</div>
			</TooltipProvider>
		);
	}

	// --- EXPANDED VIEW ---
	return (
		<TooltipProvider>
			<div className={cx(styles.root, styles.isExpanded)}>
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
					className={styles.searchAndNav}
					ref={containerRef}
					onBlur={(e): void => {
						const relatedTarget = e.relatedTarget as Node | null;
						const blurredIntoSelf = !!containerRef.current?.contains(relatedTarget);
						if (!blurredIntoSelf) {
							handleBlur();
						}
					}}
				>
					<div className={styles.searchContainer}>
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
					<div className={styles.resultNavSlot}>{resultNav}</div>
				</div>
				{highlightErrorsToggle}
				<TooltipRoot>
					<TooltipTrigger asChild>
						<Button
							variant="ghost"
							size="icon"
							color="secondary"
							className={styles.collapseBtn}
							onClick={onCollapse}
						>
							<ChevronsRight size={14} />
						</Button>
					</TooltipTrigger>
					<TooltipContent>Collapse filters</TooltipContent>
				</TooltipRoot>
			</div>
		</TooltipProvider>
	);
}

Filters.defaultProps = {
	onFilteredSpansChange: undefined,
};

export default Filters;
