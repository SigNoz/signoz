import './Filters.styles.scss';

import { InfoCircleOutlined, LoadingOutlined } from '@ant-design/icons';
import { Button, Spin, Tooltip, Typography } from 'antd';
import { AxiosError } from 'axios';
import { DEFAULT_ENTITY_VERSION } from 'constants/app';
import { initialQueriesMap, PANEL_TYPES } from 'constants/queryBuilder';
import QueryBuilderSearchV2 from 'container/QueryBuilder/filters/QueryBuilderSearchV2/QueryBuilderSearchV2';
import { useGetQueryRange } from 'hooks/queryBuilder/useGetQueryRange';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { useCallback, useState } from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import { DataTypes } from 'types/api/queryBuilder/queryAutocompleteResponse';
import { Query, TagFilter } from 'types/api/queryBuilder/queryBuilderData';
import { TracesAggregatorOperator } from 'types/common/queryBuilder';

import { BASE_FILTER_QUERY } from './constants';

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
									isColumn: true,
									isJSON: false,
									id: 'trace_id--string----true',
								},
								op: '=',
								value: traceID,
							},
						],
					},
				},
			],
		},
	};
}

function Filters({
	startTime,
	endTime,
	traceID,
}: {
	startTime: number;
	endTime: number;
	traceID: string;
}): JSX.Element {
	const [filters, setFilters] = useState<TagFilter>(BASE_FILTER_QUERY.filters);
	const [noData, setNoData] = useState<boolean>(false);
	const [filteredSpanIds, setFilteredSpanIds] = useState<string[]>([]);
	const handleFilterChange = (value: TagFilter): void => {
		setFilters(value);
	};
	const [currentSearchedIndex, setCurrentSearchedIndex] = useState<number>(0);
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
					limit: 200,
				},
				selectColumns: [
					{
						key: 'name',
						dataType: 'string',
						type: 'tag',
						isColumn: true,
						isJSON: false,
						id: 'name--string--tag--true',
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
				if (data?.payload.data.newResult.data.result[0].list) {
					const spanIds = data?.payload.data.newResult.data.result[0].list.map(
						(val) => val.data.spanID,
					);
					setFilteredSpanIds(spanIds);
					handlePrevNext(0, spanIds[0]);
					setNoData(false);
				} else {
					setNoData(true);
					setFilteredSpanIds([]);
					setCurrentSearchedIndex(0);
				}
			},
		},
	);

	return (
		<div className="filter-row">
			<QueryBuilderSearchV2
				query={BASE_FILTER_QUERY}
				onChange={handleFilterChange}
			/>
			{filteredSpanIds.length > 0 && (
				<div className="pre-next-toggle">
					<Typography.Text>
						{currentSearchedIndex + 1} / {filteredSpanIds.length}
					</Typography.Text>
					<Button
						icon={<ChevronUp size={14} />}
						disabled={currentSearchedIndex === 0}
						type="text"
						onClick={(): void => {
							handlePrevNext(currentSearchedIndex - 1);
							setCurrentSearchedIndex((prev) => prev - 1);
						}}
					/>
					<Button
						icon={<ChevronDown size={14} />}
						type="text"
						disabled={currentSearchedIndex === filteredSpanIds.length - 1}
						onClick={(): void => {
							handlePrevNext(currentSearchedIndex + 1);
							setCurrentSearchedIndex((prev) => prev + 1);
						}}
					/>
				</div>
			)}
			{isFetching && <Spin indicator={<LoadingOutlined spin />} size="small" />}
			{error && (
				<Tooltip title={(error as AxiosError)?.message || 'Something went wrong'}>
					<InfoCircleOutlined size={14} />
				</Tooltip>
			)}
			{noData && (
				<Typography.Text className="no-results">No results found</Typography.Text>
			)}
		</div>
	);
}

export default Filters;
