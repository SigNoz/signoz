import {
	Button,
	Empty,
	Input,
	InputRef,
	Menu,
	MenuRef,
	Popover,
	Spin,
} from 'antd';
import { REACT_QUERY_KEY } from 'constants/reactQueryKeys';
import { useGetMetricsListFilterValues } from 'hooks/metricsExplorer/useGetMetricsListFilterValues';
import useDebouncedFn from 'hooks/useDebouncedFunction';
import { Search } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom-v5-compat';
import { DataTypes } from 'types/api/queryBuilder/queryAutocompleteResponse';
import { TagFilter } from 'types/api/queryBuilder/queryBuilderData';

import { SUMMARY_FILTERS_KEY } from './constants';

function MetricNameSearch({
	queryFilters,
}: {
	queryFilters: TagFilter;
}): JSX.Element {
	const [searchParams, setSearchParams] = useSearchParams();

	const [isPopoverOpen, setIsPopoverOpen] = useState<boolean>(false);
	const [searchString, setSearchString] = useState<string>('');
	const [debouncedSearchString, setDebouncedSearchString] = useState<string>('');
	const [highlightedIndex, setHighlightedIndex] = useState<number>(-1);
	const menuRef = useRef<MenuRef | null>(null);
	const inputRef = useRef<InputRef | null>(null);

	useEffect(() => {
		if (isPopoverOpen) {
			setTimeout(() => {
				inputRef.current?.focus();
			}, 0); // Ensures focus happens after popover opens
			setHighlightedIndex(-1);
		}
	}, [isPopoverOpen]);

	const {
		data: metricNameFilterValuesData,
		isLoading: isLoadingMetricNameFilterValues,
		isError: isErrorMetricNameFilterValues,
	} = useGetMetricsListFilterValues(
		{
			searchText: debouncedSearchString,
			filterKey: 'metric_name',
			filterAttributeKeyDataType: DataTypes.String,
			limit: 10,
		},
		{
			enabled: isPopoverOpen,
			refetchOnWindowFocus: false,
			queryKey: [
				REACT_QUERY_KEY.GET_METRICS_LIST_FILTER_VALUES,
				'metric_name',
				debouncedSearchString,
				isPopoverOpen,
			],
		},
	);

	const handleSelect = useCallback(
		(selectedMetricName: string): void => {
			const newFilters = {
				items: [
					...queryFilters.items,
					{
						id: 'metric_name',
						op: 'CONTAINS',
						key: {
							id: 'metric_name',
							key: 'metric_name',
							type: 'tag',
						},
						value: selectedMetricName,
					},
				],
				op: 'and',
			};
			setSearchParams({
				...Object.fromEntries(searchParams.entries()),
				[SUMMARY_FILTERS_KEY]: JSON.stringify(newFilters),
			});
			setIsPopoverOpen(false);
		},
		[queryFilters.items, setSearchParams, searchParams],
	);

	const metricNameFilterValues = useMemo(
		() => metricNameFilterValuesData?.payload?.data?.filterValues || [],
		[metricNameFilterValuesData],
	);

	const handleKeyDown = useCallback(
		(event: React.KeyboardEvent<HTMLInputElement>) => {
			if (!isPopoverOpen) return;

			if (event.key === 'ArrowDown') {
				event.preventDefault();
				setHighlightedIndex((prev) => {
					const nextIndex = prev < metricNameFilterValues.length - 1 ? prev + 1 : 0;
					menuRef.current?.focus();
					return nextIndex;
				});
			} else if (event.key === 'ArrowUp') {
				event.preventDefault();
				setHighlightedIndex((prev) => {
					const prevIndex = prev > 0 ? prev - 1 : metricNameFilterValues.length - 1;
					menuRef.current?.focus();
					return prevIndex;
				});
			} else if (event.key === 'Enter') {
				event.preventDefault();
				// If there is a highlighted item, select it
				if (highlightedIndex >= 0 && metricNameFilterValues[highlightedIndex]) {
					handleSelect(metricNameFilterValues[highlightedIndex]);
				} else if (highlightedIndex === -1 && searchString) {
					// If there is no highlighted item and there is a search string, select the search string
					handleSelect(searchString);
				}
			}
		},
		[
			isPopoverOpen,
			highlightedIndex,
			metricNameFilterValues,
			searchString,
			handleSelect,
		],
	);

	const popoverItems = useMemo(() => {
		const items: JSX.Element[] = [];
		if (searchString) {
			items.push(
				<Menu.Item
					key={searchString}
					onClick={(): void => handleSelect(searchString)}
					className={highlightedIndex === 0 ? 'highlighted' : ''}
				>
					{searchString}
				</Menu.Item>,
			);
		}
		if (isLoadingMetricNameFilterValues) {
			items.push(<Spin />);
		} else if (isErrorMetricNameFilterValues) {
			items.push(<Empty description="Error fetching metric names" />);
		} else if (metricNameFilterValues?.length === 0) {
			items.push(<Empty description="No metric names found" />);
		} else {
			items.push(
				...metricNameFilterValues.map((filterValue, index) => (
					<Menu.Item
						key={filterValue}
						onClick={(): void => handleSelect(filterValue)}
						className={highlightedIndex === index ? 'highlighted' : ''}
					>
						{filterValue}
					</Menu.Item>
				)),
			);
		}
		return items;
	}, [
		handleSelect,
		highlightedIndex,
		isErrorMetricNameFilterValues,
		isLoadingMetricNameFilterValues,
		metricNameFilterValues,
		searchString,
	]);

	const debouncedUpdate = useDebouncedFn((value) => {
		setDebouncedSearchString(value as string);
	}, 400);

	const handleInputChange = useCallback(
		(e: React.ChangeEvent<HTMLInputElement>): void => {
			const value = e.target.value.trim();
			setSearchString(value);
			debouncedUpdate(value);
		},
		[debouncedUpdate],
	);

	const popoverContent = useMemo(
		() => (
			<div className="metric-name-search-popover">
				<Input
					ref={inputRef}
					onKeyDown={handleKeyDown}
					placeholder="Search..."
					value={searchString}
					onChange={handleInputChange}
					bordered
				/>
				<Menu ref={menuRef} className="metric-name-search-popover-menu">
					{popoverItems}
				</Menu>
			</div>
		),
		[handleKeyDown, searchString, handleInputChange, popoverItems],
	);

	useEffect(() => {
		if (!isPopoverOpen) {
			setSearchString('');
			setDebouncedSearchString('');
		}
	}, [isPopoverOpen]);

	return (
		<Popover
			content={popoverContent}
			trigger="click"
			open={isPopoverOpen}
			onOpenChange={(val): void => setIsPopoverOpen(val)}
		>
			<Button
				type="text"
				shape="circle"
				onClick={(e): void => {
					e.stopPropagation();
				}}
				icon={<Search size={14} />}
			/>
		</Popover>
	);
}

export default MetricNameSearch;
