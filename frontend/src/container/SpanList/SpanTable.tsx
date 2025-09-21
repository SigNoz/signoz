import { Button } from '@signozhq/button';
import { ColumnDef, DataTable, Row } from '@signozhq/table';
import getTraceV2 from 'api/trace/getTraceV2';
import { getYAxisFormattedValue } from 'components/Graph/yAxisConfig';
import Controls from 'container/Controls';
import { ChevronDownIcon, ChevronRightIcon } from 'lucide-react';
import LineClampedText from 'periscope/components/LineClampedText/LineClampedText';
import { useCallback, useMemo, useState } from 'react';
import { Span } from 'types/api/trace/getTraceV2';

import { HierarchicalSpanData, ServiceEntrySpan, SpanDataRow } from './types';
import { fetchServiceSpans } from './utils';

interface EntryPagination {
	currentPage: number;
	totalCount: number;
	pageSize: number;
	onPageChange: (page: number) => void;
	onPageSizeChange?: (pageSize: number) => void;
	isLoading?: boolean;
	nextCursor?: string;
}

// Constants
const SPAN_TYPE_ENTRY = 'entry-span';
const SPAN_TYPE_SERVICE = 'service-span';
const SPAN_TYPE_PAGINATION = 'pagination-row';
const SERVICE_SPAN_PAGE_SIZE = 10;

interface SpanTableProps {
	data: HierarchicalSpanData;
	traceId?: string;
	setSelectedSpan?: (span: Span) => void;
	isLoading?: boolean;
	entryPagination: EntryPagination;
}

interface TableRowData {
	id: string;
	type:
		| typeof SPAN_TYPE_ENTRY
		| typeof SPAN_TYPE_SERVICE
		| typeof SPAN_TYPE_PAGINATION;
	spanName?: string;
	serviceName?: string;
	spanCount?: number;
	duration?: string;
	timestamp?: string;
	statusCode?: string;
	httpMethod?: string;
	spanId?: string;
	originalData?: ServiceEntrySpan | SpanDataRow;
	isLoading?: boolean;
	entrySpanId?: string; // For pagination rows
}

function SpanTable({
	data,
	traceId,
	setSelectedSpan,
	isLoading,
	entryPagination,
}: SpanTableProps): JSX.Element {
	const [expandedEntrySpans, setExpandedEntrySpans] = useState<
		Record<string, ServiceEntrySpan>
	>({});
	const [loadingSpans, setLoadingSpans] = useState<Record<string, boolean>>({});
	const [serviceSpansPagination, setServiceSpansPagination] = useState<
		Record<
			string,
			{
				currentPage: number;
				totalCount?: number;
				hasMorePages?: boolean;
				nextCursor?: string;
			}
		>
	>({});

	const handleEntrySpanClick = useCallback(
		async (entrySpan: ServiceEntrySpan) => {
			const spanId = entrySpan.spanData.data.span_id;

			if (expandedEntrySpans[spanId]) {
				// Collapse - remove from expanded spans
				const { [spanId]: removed, ...rest } = expandedEntrySpans;
				setExpandedEntrySpans(rest);
				return;
			}

			// Expand - fetch service spans
			if (!entrySpan.serviceSpans && traceId) {
				setLoadingSpans((prev) => ({ ...prev, [spanId]: true }));

				// Initialize pagination state for this entry span
				setServiceSpansPagination((prev) => ({
					...prev,
					[spanId]: { currentPage: 1, hasMorePages: false },
				}));

				try {
					const currentPage = 1;
					const offset = (currentPage - 1) * SERVICE_SPAN_PAGE_SIZE;
					const { spans: serviceSpans, nextCursor } = await fetchServiceSpans(
						traceId,
						entrySpan.serviceName,
						SERVICE_SPAN_PAGE_SIZE,
						offset,
					);
					const updatedEntrySpan = {
						...entrySpan,
						serviceSpans,
						isExpanded: true,
					};

					// Update pagination with nextCursor
					setServiceSpansPagination((prevPagination) => ({
						...prevPagination,
						[spanId]: {
							...prevPagination[spanId],
							hasMorePages: serviceSpans.length === SERVICE_SPAN_PAGE_SIZE,
							nextCursor,
						},
					}));

					setExpandedEntrySpans((prev) => ({
						...prev,
						[spanId]: updatedEntrySpan,
					}));
				} catch (error) {
					console.error('Failed to fetch service spans:', error);
				} finally {
					setLoadingSpans((prev) => ({ ...prev, [spanId]: false }));
				}
			} else {
				// Already have service spans, just toggle expansion
				setExpandedEntrySpans((prev) => ({
					...prev,
					[spanId]: { ...entrySpan, isExpanded: true },
				}));
			}
		},
		[expandedEntrySpans, traceId],
	);

	const handleServiceSpanPageChange = useCallback(
		async (entrySpanId: string, newPage: number) => {
			if (!traceId) return;

			const entrySpan = expandedEntrySpans[entrySpanId];
			if (!entrySpan) return;

			setLoadingSpans((prev) => ({ ...prev, [entrySpanId]: true }));

			try {
				const offset = (newPage - 1) * SERVICE_SPAN_PAGE_SIZE;
				const { spans: serviceSpans, nextCursor } = await fetchServiceSpans(
					traceId,
					entrySpan.serviceName,
					SERVICE_SPAN_PAGE_SIZE,
					offset,
				);

				// Update pagination with nextCursor
				setServiceSpansPagination((prevPagination) => ({
					...prevPagination,
					[entrySpanId]: {
						...prevPagination[entrySpanId],
						currentPage: newPage,
						hasMorePages: serviceSpans.length === SERVICE_SPAN_PAGE_SIZE,
						nextCursor,
					},
				}));

				// Update the expanded entry span with new service spans
				setExpandedEntrySpans((prev) => ({
					...prev,
					[entrySpanId]: {
						...entrySpan,
						serviceSpans,
						isExpanded: true,
					},
				}));
			} catch (error) {
				console.error('Failed to fetch service spans for page:', error);
			} finally {
				setLoadingSpans((prev) => ({ ...prev, [entrySpanId]: false }));
			}
		},
		[expandedEntrySpans, traceId],
	);

	const handleServiceSpanNavigatePrevious = useCallback(
		(entrySpanId: string) => {
			const pagination = serviceSpansPagination[entrySpanId];
			if (pagination && pagination.currentPage > 1) {
				handleServiceSpanPageChange(entrySpanId, pagination.currentPage - 1);
			}
		},
		[serviceSpansPagination, handleServiceSpanPageChange],
	);

	const handleServiceSpanNavigateNext = useCallback(
		(entrySpanId: string) => {
			const pagination = serviceSpansPagination[entrySpanId];
			if (pagination && pagination.hasMorePages) {
				handleServiceSpanPageChange(entrySpanId, pagination.currentPage + 1);
			}
		},
		[serviceSpansPagination, handleServiceSpanPageChange],
	);

	const handleSpanClick = useCallback(
		async (span: SpanDataRow): Promise<void> => {
			if (!setSelectedSpan || !traceId) return;

			try {
				// Make API call to fetch full span details
				const response = await getTraceV2({
					traceId,
					selectedSpanId: span.data.span_id,
					uncollapsedSpans: [],
					isSelectedSpanIDUnCollapsed: true,
				});

				if (response.payload?.spans) {
					const fullSpan = response.payload.spans.find(
						(s: Span) => s.spanId === span.data.span_id,
					);
					console.log({ fullSpan });
					if (fullSpan) {
						setSelectedSpan(fullSpan);
					}
				}
			} catch (error) {
				console.error('Failed to fetch span details:', error);
			}
		},
		[setSelectedSpan, traceId],
	);

	const renderNameCell = useCallback(
		({ row }: { row: Row<TableRowData> }): JSX.Element => {
			const { original } = row;
			if (original.type === SPAN_TYPE_ENTRY) {
				return (
					<LineClampedText
						text={original.spanName || ''}
						lines={1}
						tooltipProps={{ placement: 'topLeft' }}
					/>
				);
			}
			if (original.type === SPAN_TYPE_PAGINATION) return <div />;

			// Service span (nested)
			return (
				<LineClampedText
					text={original.spanName || ''}
					lines={1}
					tooltipProps={{ placement: 'topLeft' }}
				/>
			);
		},
		[],
	);

	const renderServiceCell = useCallback(
		({ row }: { row: Row<TableRowData> }): JSX.Element | null => {
			const { original } = row;
			if (original.type === SPAN_TYPE_PAGINATION) {
				const { entrySpanId } = original;
				if (!entrySpanId) return <div />;

				const entrySpan = expandedEntrySpans[entrySpanId];
				const pagination = serviceSpansPagination[entrySpanId];

				if (!entrySpan || !pagination) return <div />;

				return (
					<div className="service-span-pagination">
						<Controls
							offset={(pagination.currentPage - 1) * SERVICE_SPAN_PAGE_SIZE}
							totalCount={SERVICE_SPAN_PAGE_SIZE * 10}
							countPerPage={SERVICE_SPAN_PAGE_SIZE}
							isLoading={loadingSpans[entrySpanId] || false}
							handleNavigatePrevious={(): void =>
								handleServiceSpanNavigatePrevious(entrySpanId)
							}
							handleNavigateNext={(): void =>
								handleServiceSpanNavigateNext(entrySpanId)
							}
							handleCountItemsPerPageChange={(): void => {}} // Service spans use fixed page size
							showSizeChanger={false} // Disable page size changer for service spans
							nextCursor={pagination.nextCursor}
						/>
					</div>
				);
			}

			if (original.type === SPAN_TYPE_ENTRY) {
				const entrySpan = original.originalData as ServiceEntrySpan;
				const spanId = entrySpan.spanData.data.span_id;
				const isExpanded = !!expandedEntrySpans[spanId];
				const isLoading = loadingSpans[spanId];

				return (
					<div className="service-cell-with-expand">
						<Button
							variant="ghost"
							size="sm"
							loading={isLoading}
							prefixIcon={
								!isLoading && isExpanded ? (
									<ChevronDownIcon size={16} />
								) : (
									<ChevronRightIcon size={16} />
								)
							}
							onClick={(e): void => {
								e.stopPropagation();
								handleEntrySpanClick(entrySpan);
							}}
							className="expand-button"
						/>
						<LineClampedText
							text={original.serviceName || ''}
							lines={1}
							tooltipProps={{ placement: 'topLeft' }}
						/>
					</div>
				);
			}

			return (
				<div className="service-cell-child">
					<LineClampedText
						text={original.serviceName || ''}
						lines={1}
						tooltipProps={{ placement: 'topLeft' }}
					/>
				</div>
			);
		},
		[
			expandedEntrySpans,
			loadingSpans,
			serviceSpansPagination,
			handleServiceSpanNavigatePrevious,
			handleServiceSpanNavigateNext,
			handleEntrySpanClick,
		],
	);

	const renderDurationCell = useCallback(
		({ row }: { row: Row<TableRowData> }): JSX.Element | null => {
			const { original } = row;
			if (original.type === SPAN_TYPE_PAGINATION) return null;
			return <span>{original.duration}</span>;
		},
		[],
	);

	const renderTimestampCell = useCallback(
		({ row }: { row: Row<TableRowData> }): JSX.Element | null => {
			const { original } = row;
			if (original.type === SPAN_TYPE_PAGINATION) return null;
			return (
				<span className="timestamp">
					{new Date(original.timestamp || '').toLocaleString()}
				</span>
			);
		},
		[],
	);

	const renderStatusCodeCell = useCallback(
		({ row }: { row: Row<TableRowData> }): JSX.Element | null => {
			const { original } = row;
			if (original.type === SPAN_TYPE_PAGINATION) return null;
			return <span>{original.statusCode || '-'}</span>;
		},
		[],
	);

	const renderSpanIdCell = useCallback(
		({ row }: { row: Row<TableRowData> }): JSX.Element | null => {
			const { original } = row;
			if (original.type === SPAN_TYPE_PAGINATION) return null;
			return <span className="span-id">{original.spanId}</span>;
		},
		[],
	);

	const renderHttpMethodCell = useCallback(
		// eslint-disable-next-line react/no-unused-prop-types
		({ row }: { row: Row<TableRowData> }): JSX.Element | null => {
			const { original } = row;
			if (original.type === SPAN_TYPE_PAGINATION) return null;
			return <span>{original.httpMethod || '-'}</span>;
		},
		[],
	);

	const columns: ColumnDef<TableRowData>[] = [
		{
			id: 'service',
			header: 'Service',
			accessorKey: 'serviceName',
			size: 120,
			cell: renderServiceCell,
		},
		{
			id: 'spanId',
			header: 'Span ID',
			accessorKey: 'spanId',
			size: 150,
			cell: renderSpanIdCell,
		},
		{
			id: 'name',
			header: 'Span Name',
			accessorKey: 'spanName',
			cell: renderNameCell,
		},
		{
			id: 'httpMethod',
			header: 'Method',
			accessorKey: 'httpMethod',
			size: 80,
			cell: renderHttpMethodCell,
		},
		{
			id: 'statusCode',
			header: 'Status',
			accessorKey: 'statusCode',
			size: 80,
			cell: renderStatusCodeCell,
		},
		{
			id: 'duration',
			header: 'Duration',
			accessorKey: 'duration',
			size: 120,
			cell: renderDurationCell,
		},
		{
			id: 'timestamp',
			header: 'Timestamp',
			accessorKey: 'timestamp',
			size: 180,
			cell: renderTimestampCell,
		},
	];

	const flattenedData = useMemo(() => {
		const result: TableRowData[] = [];

		data.entrySpans.forEach((entrySpan) => {
			const spanId = entrySpan.spanData.data.span_id;

			// Calculate span count for this service
			const expandedSpan = expandedEntrySpans[spanId];
			const spanCount = expandedSpan?.serviceSpans?.length || 0;

			// Add entry span row
			result.push({
				id: spanId,
				type: SPAN_TYPE_ENTRY,
				spanName: entrySpan.spanData.data.name,
				serviceName: entrySpan.serviceName,
				spanCount: spanCount > 0 ? spanCount : undefined,
				duration: getYAxisFormattedValue(
					entrySpan.spanData.data.duration_nano.toString(),
					'ns',
				),
				timestamp: entrySpan.spanData.timestamp,
				statusCode: entrySpan.spanData.data.response_status_code,
				httpMethod: entrySpan.spanData.data.http_method,
				spanId,
				originalData: entrySpan,
			});

			// Add service spans if expanded
			if (expandedSpan?.serviceSpans) {
				expandedSpan.serviceSpans.forEach((serviceSpan) => {
					result.push({
						id: serviceSpan.data.span_id,
						type: SPAN_TYPE_SERVICE,
						spanName: serviceSpan.data.name,
						serviceName: serviceSpan.data['service.name'],
						duration: getYAxisFormattedValue(
							serviceSpan.data.duration_nano.toString(),
							'ns',
						),
						timestamp: serviceSpan.timestamp,
						statusCode: serviceSpan.data.response_status_code,
						httpMethod: serviceSpan.data.http_method,
						spanId: serviceSpan.data.span_id,
						originalData: serviceSpan,
					});
				});

				// Add pagination row for service spans if we have spans and (current page > 1 or more pages available)
				const pagination = serviceSpansPagination[spanId];
				if (
					pagination &&
					expandedSpan.serviceSpans.length > 0 &&
					(pagination.currentPage > 1 || pagination.hasMorePages)
				) {
					result.push({
						id: `${spanId}-pagination`,
						type: SPAN_TYPE_PAGINATION,
						entrySpanId: spanId,
					});
				}
			}
		});

		return result;
	}, [data.entrySpans, expandedEntrySpans, serviceSpansPagination]);

	const handleRowClick = useCallback(
		(row: Row<TableRowData>) => {
			const { original } = row;
			if (original.type === SPAN_TYPE_ENTRY) {
				// For entry spans, expand/collapse
				const entrySpan = original.originalData as ServiceEntrySpan;
				handleEntrySpanClick(entrySpan);
			} else if (original.type === SPAN_TYPE_SERVICE) {
				// For service spans, trigger API call to fetch full details
				handleSpanClick(original.originalData as SpanDataRow);
			}
		},
		[handleEntrySpanClick, handleSpanClick],
	);

	const args = {
		columns,
		tableId: 'span-list-table',
		enableSorting: false,
		enableFiltering: false,
		enableGlobalFilter: false,
		enableColumnReordering: false,
		enableColumnResizing: true,
		enableColumnPinning: false,
		enableRowSelection: false,
		enablePagination: false,
		showHeaders: true,
		defaultColumnWidth: 150,
		minColumnWidth: 80,
		maxColumnWidth: 300,
		enableVirtualization: false,
		fixedHeight: 600,
	};

	const handleNavigatePrevious = useCallback(() => {
		if (entryPagination.currentPage > 1) {
			entryPagination.onPageChange(entryPagination.currentPage - 1);
		}
	}, [entryPagination]);

	const handleNavigateNext = useCallback(() => {
		entryPagination.onPageChange(entryPagination.currentPage + 1);
	}, [entryPagination]);

	return (
		<div className="span-table">
			<DataTable
				columns={columns}
				tableId={args.tableId}
				enableSorting={args.enableSorting}
				enableFiltering={args.enableFiltering}
				enableGlobalFilter={args.enableGlobalFilter}
				enableColumnReordering={args.enableColumnReordering}
				enableColumnResizing={args.enableColumnResizing}
				enableColumnPinning={args.enableColumnPinning}
				enableRowSelection={args.enableRowSelection}
				enablePagination={args.enablePagination}
				showHeaders={args.showHeaders}
				defaultColumnWidth={args.defaultColumnWidth}
				minColumnWidth={args.minColumnWidth}
				maxColumnWidth={args.maxColumnWidth}
				enableVirtualization={args.enableVirtualization}
				fixedHeight={args.fixedHeight}
				data={flattenedData}
				onRowClick={handleRowClick}
				isLoading={isLoading}
			/>
			<Controls
				offset={(entryPagination.currentPage - 1) * entryPagination.pageSize}
				countPerPage={entryPagination.pageSize}
				totalCount={flattenedData.length}
				isLoading={entryPagination.isLoading || isLoading || false}
				handleNavigatePrevious={handleNavigatePrevious}
				handleNavigateNext={handleNavigateNext}
				handleCountItemsPerPageChange={(): void => {}}
				showSizeChanger={false}
				nextCursor={entryPagination.nextCursor}
			/>
		</div>
	);
}

SpanTable.defaultProps = {
	traceId: undefined,
	setSelectedSpan: undefined,
	isLoading: false,
};

export default SpanTable;
