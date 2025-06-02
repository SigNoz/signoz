import { Button, Menu, Popover, Tooltip } from 'antd';
import { MetricType } from 'api/metricsExplorer/getMetricsList';
import { Search } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom-v5-compat';
import { TagFilter } from 'types/api/queryBuilder/queryBuilderData';

import {
	METRIC_TYPE_LABEL_MAP,
	METRIC_TYPE_VALUES_MAP,
	SUMMARY_FILTERS_KEY,
} from './constants';

function MetricTypeSearch({
	queryFilters,
}: {
	queryFilters: TagFilter;
}): JSX.Element {
	const [searchParams, setSearchParams] = useSearchParams();

	const [isPopoverOpen, setIsPopoverOpen] = useState<boolean>(false);

	const menuItems = useMemo(
		() => [
			{
				key: 'all',
				value: 'All',
			},
			...Object.keys(METRIC_TYPE_LABEL_MAP).map((key) => ({
				key: METRIC_TYPE_VALUES_MAP[key as MetricType],
				value: METRIC_TYPE_LABEL_MAP[key as MetricType],
			})),
		],
		[],
	);

	const handleSelect = useCallback(
		(selectedMetricType: string): void => {
			if (selectedMetricType !== 'all') {
				const newFilters = {
					items: [
						...queryFilters.items,
						{
							id: 'metric_type',
							op: '=',
							key: {
								id: 'metric_type',
								key: 'metric_type',
								type: 'tag',
							},
							value: selectedMetricType,
						},
					],
					op: 'AND',
				};
				setSearchParams({
					...Object.fromEntries(searchParams.entries()),
					[SUMMARY_FILTERS_KEY]: JSON.stringify(newFilters),
				});
			} else {
				const newFilters = {
					items: queryFilters.items.filter((item) => item.id !== 'metric_type'),
					op: 'AND',
				};
				setSearchParams({
					...Object.fromEntries(searchParams.entries()),
					[SUMMARY_FILTERS_KEY]: JSON.stringify(newFilters),
				});
			}
			setIsPopoverOpen(false);
		},
		[queryFilters.items, setSearchParams, searchParams],
	);

	const menu = (
		<Menu>
			{menuItems.map((menuItem) => (
				<Menu.Item
					key={menuItem.key}
					onClick={(): void => handleSelect(menuItem.key)}
				>
					{menuItem.value}
				</Menu.Item>
			))}
		</Menu>
	);

	return (
		<Popover
			content={menu}
			trigger="click"
			open={isPopoverOpen}
			onOpenChange={(val): void => setIsPopoverOpen(val)}
		>
			<Tooltip title="Filter by metric type">
				<Button type="text" shape="circle" icon={<Search size={14} />} />
			</Tooltip>
		</Popover>
	);
}

export default MetricTypeSearch;
