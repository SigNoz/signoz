import { useCallback, useMemo, useState } from 'react';
import { Button, Menu, Popover, Tooltip } from 'antd';
import { MetrictypesTypeDTO } from 'api/generated/services/sigNoz.schemas';
import { convertFiltersToExpression } from 'components/QueryBuilderV2/utils';
import { Search } from 'lucide-react';
import { TagFilter } from 'types/api/queryBuilder/queryBuilderData';

import { METRIC_TYPE_LABEL_MAP_V2 } from './constants';

function MetricTypeSearch({
	queryFilters,
	onFilterChange,
}: {
	queryFilters: TagFilter;
	onFilterChange: (expression: string) => void;
}): JSX.Element {
	const [isPopoverOpen, setIsPopoverOpen] = useState<boolean>(false);

	const menuItems = useMemo(
		() => [
			{
				key: 'all',
				value: 'All',
			},
			...Object.keys(METRIC_TYPE_LABEL_MAP_V2).map((key) => ({
				key: METRIC_TYPE_LABEL_MAP_V2[key as MetrictypesTypeDTO],
				value: METRIC_TYPE_LABEL_MAP_V2[key as MetrictypesTypeDTO],
			})),
		],
		[],
	);

	const handleSelect = useCallback(
		(selectedMetricType: string): void => {
			let newFilters;
			if (selectedMetricType !== 'all') {
				newFilters = {
					items: [
						...queryFilters.items,
						{
							id: 'type',
							op: '=',
							key: {
								id: 'type',
								key: 'type',
								type: 'tag',
							},
							value: selectedMetricType,
						},
					],
					op: 'AND',
				};
			} else {
				newFilters = {
					items: queryFilters.items.filter((item) => item.id !== 'type'),
					op: 'AND',
				};
			}
			const newFilterExpression = convertFiltersToExpression(newFilters);
			onFilterChange(newFilterExpression.expression);
			setIsPopoverOpen(false);
		},
		[queryFilters.items, onFilterChange],
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
