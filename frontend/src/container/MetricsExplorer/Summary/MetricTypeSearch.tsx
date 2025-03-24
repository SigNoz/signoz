import { Button, Menu, Popover, Tooltip } from 'antd';
import { MetricType } from 'api/metricsExplorer/getMetricsList';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import { useQueryOperations } from 'hooks/queryBuilder/useQueryBuilderOperations';
import { Search } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';

import { METRIC_TYPE_LABEL_MAP, METRIC_TYPE_VALUES_MAP } from './constants';

function MetricTypeSearch(): JSX.Element {
	const { currentQuery } = useQueryBuilder();
	const { handleChangeQueryData } = useQueryOperations({
		index: 0,
		query: currentQuery.builder.queryData[0],
		entityVersion: '',
	});

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
				handleChangeQueryData('filters', {
					items: [
						...currentQuery.builder.queryData[0].filters.items,
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
				});
			} else {
				handleChangeQueryData('filters', {
					items: currentQuery.builder.queryData[0].filters.items.filter(
						(item) => item.id !== 'metric_type',
					),
					op: 'AND',
				});
			}
			setIsPopoverOpen(false);
		},
		[currentQuery.builder.queryData, handleChangeQueryData],
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
