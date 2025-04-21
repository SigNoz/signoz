import { TableProps } from 'antd';
import { SorterResult } from 'antd/es/table/interface';
import { useSafeNavigate } from 'hooks/useSafeNavigate';
import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';

const useSortableTable = <T>(
	initialOrder: 'ascend' | 'descend' | null,
	initialColumnKey: string,
	searchString: string,
): {
	sortedInfo: SorterResult<T>;
	handleChange: TableProps<T>['onChange'];
} => {
	const { safeNavigate } = useSafeNavigate();
	const { search } = useLocation();

	useEffect(() => {
		const searchParams = new URLSearchParams(search);
		searchParams.set('search', searchString);
		safeNavigate({ search: searchParams.toString() }, { replace: true });
	}, [search, searchString, safeNavigate]);

	const [sortedInfo, setSortedInfo] = useState<SorterResult<T>>({
		order: initialOrder,
		columnKey: initialColumnKey,
	});

	const handleChange: TableProps<T>['onChange'] = (pagination, __, sorter) => {
		if (Array.isArray(sorter)) return;
		const searchParams = new URLSearchParams(search);
		setSortedInfo(sorter as SorterResult<T>);
		searchParams.set('columnKey', sorter.columnKey as string);
		searchParams.set('order', sorter.order as string);
		searchParams.set(
			'page',
			pagination.current ? pagination.current.toString() : '1',
		);
		safeNavigate({ search: searchParams.toString() }, { replace: true });
	};

	return { sortedInfo, handleChange };
};

export default useSortableTable;
