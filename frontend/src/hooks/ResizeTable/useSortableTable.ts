import { useEffect, useState } from 'react';

import { navigate } from 'lib/router/navigation';
import { useAppLocation } from 'lib/router/useAppLocation';
import { TableProps } from 'antd';
import type { SorterResult } from 'antd/es/table/interface';

const useSortableTable = <T>(
	initialOrder: 'ascend' | 'descend' | null,
	initialColumnKey: string,
	searchString: string,
): {
	sortedInfo: SorterResult<T>;
	handleChange: TableProps<T>['onChange'];
} => {
	const { search } = useAppLocation();

	useEffect(() => {
		const searchParams = new URLSearchParams(search);
		searchParams.set('search', searchString);
		navigate({ search: searchParams.toString() }, { replace: true });
	}, [search, searchString]);

	const [sortedInfo, setSortedInfo] = useState<SorterResult<T>>({
		order: initialOrder,
		columnKey: initialColumnKey,
	});

	const handleChange: TableProps<T>['onChange'] = (pagination, __, sorter) => {
		if (Array.isArray(sorter)) {
			return;
		}
		const searchParams = new URLSearchParams(search);
		setSortedInfo(sorter as SorterResult<T>);
		searchParams.set('columnKey', sorter.columnKey as string);
		searchParams.set('order', sorter.order as string);
		searchParams.set(
			'page',
			pagination.current ? pagination.current.toString() : '1',
		);
		navigate({ search: searchParams.toString() }, { replace: true });
	};

	return { sortedInfo, handleChange };
};

export default useSortableTable;
