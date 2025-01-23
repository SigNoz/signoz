/* eslint-disable no-nested-ternary */
import './entityEvents.styles.scss';

import { Color } from '@signozhq/design-tokens';
import { Button, Table, TableColumnsType } from 'antd';
import { DEFAULT_ENTITY_VERSION } from 'constants/app';
import { EventContents } from 'container/InfraMonitoringK8s/commonUtils';
import { K8sCategory } from 'container/InfraMonitoringK8s/constants';
import LoadingContainer from 'container/InfraMonitoringK8s/LoadingContainer';
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
import { isArray } from 'lodash-es';
import { ChevronDown, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useQuery } from 'react-query';
import { DataTypes } from 'types/api/queryBuilder/queryAutocompleteResponse';
import { IBuilderQuery } from 'types/api/queryBuilder/queryBuilderData';
import { DataSource } from 'types/common/queryBuilder';
import { v4 } from 'uuid';

import {
	EntityDetailsEmptyContainer,
	getEntityEventsOrLogsQueryPayload,
} from '../utils';

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
	severity?: string;
}

interface IEntityEventsProps {
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
	category: K8sCategory;
	queryKey: string;
}

const EventsPageSize = 10;

export default function Events({
	timeRange,
	handleChangeEventFilters,
	filters,
	isModalTimeSelection,
	handleTimeChange,
	selectedInterval,
	category,
	queryKey,
}: IEntityEventsProps): JSX.Element {
	const { currentQuery } = useQueryBuilder();

	const [formattedEntityEvents, setFormattedEntityEvents] = useState<
		EventDataType[]
	>([]);

	const [hasReachedEndOfEvents, setHasReachedEndOfEvents] = useState(false);

	const [page, setPage] = useState(1);

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

	const queryPayload = useMemo(() => {
		const basePayload = getEntityEventsOrLogsQueryPayload(
			timeRange.startTime,
			timeRange.endTime,
			filters,
		);

		basePayload.query.builder.queryData[0].pageSize = 10;
		basePayload.query.builder.queryData[0].orderBy = [
			{ columnName: 'timestamp', order: ORDERBY_FILTERS.DESC },
		];

		return basePayload;
	}, [timeRange.startTime, timeRange.endTime, filters]);

	const { data: eventsData, isLoading, isFetching, isError } = useQuery({
		queryKey: [queryKey, timeRange.startTime, timeRange.endTime, filters],
		queryFn: () => GetMetricQueryRange(queryPayload, DEFAULT_ENTITY_VERSION),
		enabled: !!queryPayload,
	});

	const columns: TableColumnsType<EventDataType> = [
		{ title: 'Severity', dataIndex: 'severity', key: 'severity', width: 100 },
		{
			title: 'Timestamp',
			dataIndex: 'timestamp',
			width: 200,
			ellipsis: true,
			key: 'timestamp',
		},
		{ title: 'Body', dataIndex: 'body', key: 'body' },
	];

	useEffect(() => {
		if (eventsData?.payload?.data?.newResult?.data?.result) {
			const responsePayload =
				eventsData?.payload.data.newResult.data.result[0].list || [];

			const formattedData = responsePayload?.map(
				(event): EventDataType => ({
					timestamp: event.timestamp,
					severity: event.data.severity_text,
					body: event.data.body,
					id: event.data.id,
					key: event.data.id,
					resources_string: event.data.resources_string,
					attributes_string: event.data.attributes_string,
				}),
			);

			setFormattedEntityEvents(formattedData);

			if (
				!responsePayload ||
				(responsePayload &&
					isArray(responsePayload) &&
					responsePayload.length < EventsPageSize)
			) {
				setHasReachedEndOfEvents(true);
			} else {
				setHasReachedEndOfEvents(false);
			}
		}
	}, [eventsData]);

	const handleExpandRow = (record: EventDataType): JSX.Element => (
		<EventContents
			data={{ ...record.attributes_string, ...record.resources_string }}
		/>
	);

	const handlePrev = (): void => {
		if (!formattedEntityEvents.length) return;

		setPage(page - 1);

		const firstEvent = formattedEntityEvents[0];

		const newItems = [
			...filters.items.filter((item) => item.key?.key !== 'id'),
			{
				id: v4(),
				key: {
					key: 'id',
					type: '',
					dataType: DataTypes.String,
					isColumn: true,
				},
				op: '>',
				value: firstEvent.id,
			},
		];

		const newFilters = {
			op: 'AND',
			items: newItems,
		} as IBuilderQuery['filters'];

		handleChangeEventFilters(newFilters);
	};

	const handleNext = (): void => {
		if (!formattedEntityEvents.length) return;

		setPage(page + 1);
		const lastEvent = formattedEntityEvents[formattedEntityEvents.length - 1];

		const newItems = [
			...filters.items.filter((item) => item.key?.key !== 'id'),
			{
				id: v4(),
				key: {
					key: 'id',
					type: '',
					dataType: DataTypes.String,
					isColumn: true,
				},
				op: '<',
				value: lastEvent.id,
			},
		];

		const newFilters = {
			op: 'AND',
			items: newItems,
		} as IBuilderQuery['filters'];

		handleChangeEventFilters(newFilters);
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
		<div className="entity-events-container">
			<div className="entity-events-header">
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

			{isLoading && <LoadingContainer />}

			{!isLoading && !isError && formattedEntityEvents.length === 0 && (
				<EntityDetailsEmptyContainer category={category} view="events" />
			)}

			{isError && !isLoading && <LogsError />}

			{!isLoading && !isError && formattedEntityEvents.length > 0 && (
				<div className="entity-events-list-container">
					<div className="entity-events-list-card">
						<Table<EventDataType>
							loading={isLoading && page > 1}
							columns={columns}
							expandable={{
								expandedRowRender: handleExpandRow,
								rowExpandable: (record): boolean => record.body !== 'Not Expandable',
								expandIcon: handleExpandRowIcon,
							}}
							dataSource={formattedEntityEvents}
							pagination={false}
							rowKey={(record): string => record.id}
						/>
					</div>
				</div>
			)}

			{!isError && formattedEntityEvents.length > 0 && (
				<div className="entity-events-footer">
					<Button
						className="entity-events-footer-button periscope-btn ghost"
						type="link"
						onClick={handlePrev}
						disabled={page === 1 || isFetching || isLoading}
					>
						{!isFetching && <ChevronLeft size={14} />}
						Prev
					</Button>

					<Button
						className="entity-events-footer-button periscope-btn ghost"
						type="link"
						onClick={handleNext}
						disabled={hasReachedEndOfEvents || isFetching || isLoading}
					>
						Next
						{!isFetching && <ChevronRight size={14} />}
					</Button>

					{(isFetching || isLoading) && (
						<Loader2 className="animate-spin" size={16} color={Color.BG_ROBIN_500} />
					)}
				</div>
			)}
		</div>
	);
}
