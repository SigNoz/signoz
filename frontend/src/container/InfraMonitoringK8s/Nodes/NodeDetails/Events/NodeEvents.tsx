import './NodeEvents.styles.scss';

import { Table, TableColumnsType, Typography } from 'antd';
import { DEFAULT_ENTITY_VERSION } from 'constants/app';
import LogsError from 'container/LogsError/LogsError';
import { ORDERBY_FILTERS } from 'container/QueryBuilder/filters/OrderByFilter/config';
import QueryBuilderSearch from 'container/QueryBuilder/filters/QueryBuilderSearch';
import DateTimeSelectionV2 from 'container/TopNav/DateTimeSelectionV2';
import {
	CustomTimeType,
	Time,
} from 'container/TopNav/DateTimeSelectionV2/config';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import { GetMetricQueryRange } from 'lib/dashboard/getQueryResults';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { useMemo } from 'react';
import { useQuery } from 'react-query';
import { IBuilderQuery } from 'types/api/queryBuilder/queryBuilderData';
import { DataSource } from 'types/common/queryBuilder';

import { getNodesEventsQueryPayload } from './constants';
import NoEventsContainer from './NoEventsContainer';

interface EventDataType {
	key: string;
	timestamp: string;
	body: string;
	id: string;
	attributes_bool?: Record<string, boolean>;
	attributes_number?: Record<string, number>;
	attributes_string?: Record<string, string>;
	resources_string?: Record<string, string>;
	scope_name?: string;
	scope_string?: Record<string, string>;
	scope_version?: string;
	severity_number?: number;
	severity_text?: string;
	span_id?: string;
	trace_flags?: number;
	trace_id?: string;
}

interface INodeEventsProps {
	timeRange: {
		startTime: number;
		endTime: number;
	};
	handleChangeEventFilters: (filters: IBuilderQuery['filters']) => void;
	filters: IBuilderQuery['filters'];
	isModalTimeSelection: boolean;
	handleTimeChange: (
		interval: Time | CustomTimeType,
		dateTimeRange?: [number, number],
	) => void;
	selectedInterval: Time;
}

export default function Events({
	timeRange,
	handleChangeEventFilters,
	filters,
	isModalTimeSelection,
	handleTimeChange,
	selectedInterval,
}: INodeEventsProps): JSX.Element {
	const { currentQuery } = useQueryBuilder();
	const updatedCurrentQuery = useMemo(
		() => ({
			...currentQuery,
			builder: {
				...currentQuery.builder,
				queryData: [
					{
						...currentQuery.builder.queryData[0],
						dataSource: DataSource.LOGS,
						aggregateOperator: 'noop',
						aggregateAttribute: {
							...currentQuery.builder.queryData[0].aggregateAttribute,
						},
						filters: {
							items: [],
							op: 'AND',
						},
					},
				],
			},
		}),
		[currentQuery],
	);

	const query = updatedCurrentQuery?.builder?.queryData[0] || null;

	// const [restFilters, setRestFilters] = useState<TagFilterItem[]>([]);

	// const [resetLogsList, setResetLogsList] = useState<boolean>(false);

	// useEffect(() => {
	// 	const newRestFilters = filters?.items?.filter(
	// 		(item) =>
	// 			item.key?.key !== 'id' &&
	// 			item.key?.key !== QUERY_KEYS.K8S_OBJECT_NAME &&
	// 			item.key?.key !== QUERY_KEYS.K8S_OBJECT_KIND,
	// 	);

	// 	const areFiltersSame = isEqual(restFilters, newRestFilters);

	// 	if (!areFiltersSame) {
	// 		setResetLogsList(true);
	// 	}

	// 	setRestFilters(newRestFilters);
	// 	// eslint-disable-next-line react-hooks/exhaustive-deps
	// }, [filters]);

	const queryPayload = useMemo(() => {
		const basePayload = getNodesEventsQueryPayload(
			timeRange.startTime,
			timeRange.endTime,
			filters,
		);

		basePayload.query.builder.queryData[0].pageSize = 100;
		basePayload.query.builder.queryData[0].orderBy = [
			{ columnName: 'timestamp', order: ORDERBY_FILTERS.DESC },
		];

		return basePayload;
	}, [timeRange.startTime, timeRange.endTime, filters]);

	const { data, isLoading, isError } = useQuery({
		queryKey: ['nodeEvents', timeRange.startTime, timeRange.endTime, filters],
		queryFn: () => GetMetricQueryRange(queryPayload, DEFAULT_ENTITY_VERSION),
		enabled: !!queryPayload,
	});

	const columns: TableColumnsType<EventDataType> = [
		{ title: 'Severity', dataIndex: 'severity', key: 'severity' },
		{ title: 'Timestamp', dataIndex: 'timestamp', key: 'timestamp' },
		{ title: 'Body', dataIndex: 'body', key: 'body' },
	];

	const formattedNodeEvents = useMemo(() => {
		const responsePayload =
			data?.payload.data.newResult.data.result[0].list || [];

		const formattedData = responsePayload?.map((event) => ({
			timestamp: event.timestamp,
			severity: event.data.severity_text,
			body: event.data.body,
			id: event.data.id,
			key: event.data.id,
		}));

		return formattedData || [];
	}, [data]);

	const handleExpandRow = (record: EventDataType): JSX.Element => {
		console.log('record', record);

		return <p style={{ margin: 0 }}>{record.body}</p>;
	};

	const handleExpandRowIcon = ({
		expanded,
		onExpand,
		record,
	}: {
		expanded: boolean;
		onExpand: (
			record: EventDataType,
			e: React.MouseEvent<HTMLElement, MouseEvent>,
		) => void;
		record: EventDataType;
	}): JSX.Element =>
		expanded ? (
			<ChevronDown
				className="periscope-btn-icon"
				size={14}
				onClick={(e): void =>
					onExpand(
						record,
						(e as unknown) as React.MouseEvent<HTMLElement, MouseEvent>,
					)
				}
			/>
		) : (
			<ChevronRight
				className="periscope-btn-icon"
				size={14}
				// eslint-disable-next-line sonarjs/no-identical-functions
				onClick={(e): void =>
					onExpand(
						record,
						(e as unknown) as React.MouseEvent<HTMLElement, MouseEvent>,
					)
				}
			/>
		);

	return (
		<div className="node-events-container">
			<div className="node-events-header">
				<div className="filter-section">
					{query && (
						<QueryBuilderSearch
							query={query}
							onChange={handleChangeEventFilters}
							disableNavigationShortcuts
						/>
					)}
				</div>
				<div className="datetime-section">
					<DateTimeSelectionV2
						showAutoRefresh={false}
						showRefreshText={false}
						hideShareModal
						isModalTimeSelection={isModalTimeSelection}
						onTimeChange={handleTimeChange}
						defaultRelativeTime="5m"
						modalSelectedInterval={selectedInterval}
					/>
				</div>
			</div>

			{isLoading && (
				<div className="loading-logs">
					<div className="loading-logs-content">
						<img
							className="loading-gif"
							src="/Icons/loading-plane.gif"
							alt="wait-icon"
						/>

						<Typography>Loading Events. Please wait...</Typography>
					</div>
				</div>
			)}

			{!isLoading && !isError && formattedNodeEvents.length === 0 && (
				<NoEventsContainer />
			)}

			{isError && !isLoading && <LogsError />}

			{!isLoading && !isError && formattedNodeEvents.length > 0 && (
				<div className="node-events-list-container">
					<div className="node-events-list-card">
						<Table<EventDataType>
							columns={columns}
							expandable={{
								expandedRowRender: handleExpandRow,
								rowExpandable: (record): boolean => record.body !== 'Not Expandable',
								expandIcon: handleExpandRowIcon,
							}}
							dataSource={formattedNodeEvents}
							pagination={false}
						/>
					</div>
				</div>
			)}
		</div>
	);
}
