import { Button, Empty, Input, Menu, Popover, Spin } from 'antd';
import { REACT_QUERY_KEY } from 'constants/reactQueryKeys';
import { useGetMetricsListFilterValues } from 'hooks/metricsExplorer/useGetMetricsListFilterValues';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import { useQueryOperations } from 'hooks/queryBuilder/useQueryBuilderOperations';
import useDebouncedFn from 'hooks/useDebouncedFunction';
import { Search } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';
import { DataTypes } from 'types/api/queryBuilder/queryAutocompleteResponse';

function MetricNameSearch(): JSX.Element {
	const { currentQuery } = useQueryBuilder();
	const { handleChangeQueryData } = useQueryOperations({
		index: 0,
		query: currentQuery.builder.queryData[0],
		entityVersion: '',
	});

	const [isPopoverOpen, setIsPopoverOpen] = useState<boolean>(false);
	const [searchString, setSearchString] = useState<string>('');
	const [debouncedSearchString, setDebouncedSearchString] = useState<string>('');

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
			handleChangeQueryData('filters', {
				items: [
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
				op: 'AND',
			});
			setIsPopoverOpen(false);
		},
		[handleChangeQueryData],
	);

	const metricNameFilterValues = useMemo(
		() => metricNameFilterValuesData?.payload?.data?.filterValues || [],
		[metricNameFilterValuesData],
	);

	const popoverItems = useMemo(() => {
		const items: JSX.Element[] = [];
		if (searchString) {
			items.push(
				<Menu.Item
					key={searchString}
					onClick={(): void => handleSelect(searchString)}
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
				...metricNameFilterValues.map((filterValue) => (
					<Menu.Item
						key={filterValue}
						onClick={(): void => handleSelect(filterValue)}
					>
						{filterValue}
					</Menu.Item>
				)),
			);
		}
		return items;
	}, [
		handleSelect,
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
			const value = e.target.value.trim().toLowerCase();
			setSearchString(value);
			debouncedUpdate(value);
		},
		[debouncedUpdate],
	);

	const popoverContent = useMemo(
		() => (
			<div className="metric-name-search-popover">
				<Input
					placeholder="Search..."
					value={searchString}
					onChange={handleInputChange}
					bordered
				/>
				<Menu className="metric-name-search-popover-menu">{popoverItems}</Menu>
			</div>
		),
		[searchString, handleInputChange, popoverItems],
	);

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
