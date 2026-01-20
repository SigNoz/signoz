import { useSafeNavigate } from 'hooks/useSafeNavigate';
import useUrlQuery from 'hooks/useUrlQuery';
import { useMemo, useState } from 'react';
import { FunnelData } from 'types/api/traceFunnels';

interface SortOrder {
	columnKey: string;
	order: 'ascend' | 'descend';
}

const useHandleTraceFunnelsSort = ({
	data,
}: {
	data: FunnelData[];
}): {
	sortOrder: SortOrder;
	handleSort: (key: string) => void;
	sortedData: FunnelData[];
} => {
	const { safeNavigate } = useSafeNavigate();
	const urlQuery = useUrlQuery();

	const [sortOrder, setSortOrder] = useState<SortOrder>({
		columnKey: urlQuery.get('columnKey') || 'created_at',
		order: (urlQuery.get('order') as 'ascend' | 'descend') || 'descend',
	});

	const handleSort = (key: string): void => {
		setSortOrder((prev) => {
			const newOrder: SortOrder =
				prev.columnKey === key
					? { columnKey: key, order: prev.order === 'ascend' ? 'descend' : 'ascend' }
					: { columnKey: key, order: 'descend' };

			urlQuery.set('columnKey', newOrder.columnKey);
			urlQuery.set('order', newOrder.order);

			return newOrder;
		});
		safeNavigate({ search: urlQuery.toString() });
	};

	const sortedData = useMemo(
		() =>
			data.length > 0
				? [...data].sort((a, b) => {
						const { columnKey, order } = sortOrder;
						let aValue = a[columnKey as keyof FunnelData];
						let bValue = b[columnKey as keyof FunnelData];

						// Fallback to creation timestamp if invalid key
						if (typeof aValue !== 'number' || typeof bValue !== 'number') {
							aValue = a.created_at;
							bValue = b.created_at;
						}

						return order === 'ascend' ? aValue - bValue : bValue - aValue;
				  })
				: [],
		[sortOrder, data],
	);

	return {
		sortOrder,
		handleSort,
		sortedData,
	};
};

export default useHandleTraceFunnelsSort;
