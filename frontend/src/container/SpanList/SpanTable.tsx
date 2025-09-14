import { Button } from '@signozhq/button';
import { ColumnDef, DataTable, Row } from '@signozhq/table';
import { getYAxisFormattedValue } from 'components/Graph/yAxisConfig';
import { ChevronDownIcon, ChevronRightIcon } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';
import { Span } from 'types/api/trace/getTraceV2';

import { HierarchicalSpanData, ServiceEntrySpan, SpanDataRow } from './types';
import { fetchServiceSpans } from './utils';

// Constants
const SPAN_TYPE_ENTRY = 'entry-span';
const SPAN_TYPE_SERVICE = 'service-span';

interface SpanTableProps {
	data: HierarchicalSpanData;
	traceId?: string;
	setSelectedSpan?: (span: Span) => void;
	isLoading?: boolean;
}

interface TableRowData {
	id: string;
	type: typeof SPAN_TYPE_ENTRY | typeof SPAN_TYPE_SERVICE;
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
}

function SpanTable({
	data,
	traceId,
	setSelectedSpan,
	isLoading,
}: SpanTableProps): JSX.Element {
	const [expandedEntrySpans, setExpandedEntrySpans] = useState<
		Record<string, ServiceEntrySpan>
	>({});
	const [loadingSpans, setLoadingSpans] = useState<Record<string, boolean>>({});

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

				try {
					const serviceSpans = await fetchServiceSpans(
						traceId,
						entrySpan.serviceName,
					);
					const updatedEntrySpan = {
						...entrySpan,
						serviceSpans,
						isExpanded: true,
					};

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

	const handleSpanClick = useCallback(
		(span: SpanDataRow) => {
			if (setSelectedSpan) {
				// Convert span data to the format expected by SpanDetailsDrawer
				const convertedSpan = ({
					id: span.data.span_id,
					traceID: span.data.trace_id,
					spanID: span.data.span_id,
					parentSpanID: '',
					operationName: span.data.name,
					startTime: new Date(span.timestamp).getTime() * 1000000, // Convert to nanoseconds
					duration: span.data.duration_nano,
					tags: [],
					logs: [],
					process: {
						serviceName: span.data['service.name'],
						tags: [],
					},
				} as unknown) as Span;
				setSelectedSpan(convertedSpan);
			}
		},
		[setSelectedSpan],
	);

	const renderNameCell = useCallback(
		({ row }: { row: Row<TableRowData> }): JSX.Element => {
			const { original } = row;
			if (original.type === SPAN_TYPE_ENTRY) {
				const entrySpan = original.originalData as ServiceEntrySpan;
				const spanId = entrySpan.spanData.data.span_id;
				const isExpanded = !!expandedEntrySpans[spanId];
				const isLoading = loadingSpans[spanId];

				return (
					<div className="span-name-with-expand">
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
							onClick={(): Promise<void> => handleEntrySpanClick(entrySpan)}
							className="expand-button"
						/>
						<span className="span-name-text">{original.spanName}</span>
					</div>
				);
			}
			// Service span (nested)
			return <div className="span-name">{original.spanName}</div>;
		},
		[expandedEntrySpans, loadingSpans, handleEntrySpanClick],
	);

	const renderServiceCell = useCallback(
		({ row }: { row: Row<TableRowData> }): JSX.Element => {
			const { original } = row;
			return <span>{original.serviceName}</span>;
		},
		[],
	);

	const renderDurationCell = useCallback(
		({ row }: { row: Row<TableRowData> }): JSX.Element => {
			const { original } = row;
			return <span>{original.duration}</span>;
		},
		[],
	);

	const renderTimestampCell = useCallback(
		({ row }: { row: Row<TableRowData> }): JSX.Element => {
			const { original } = row;
			return (
				<span className="timestamp">
					{new Date(original.timestamp || '').toLocaleString()}
				</span>
			);
		},
		[],
	);

	const renderStatusCodeCell = useCallback(
		({ row }: { row: Row<TableRowData> }): JSX.Element => {
			const { original } = row;
			return <span>{original.statusCode || '-'}</span>;
		},
		[],
	);

	const renderSpanIdCell = useCallback(
		({ row }: { row: Row<TableRowData> }): JSX.Element => {
			const { original } = row;
			return <span className="span-id">{original.spanId}</span>;
		},
		[],
	);

	const renderHttpMethodCell = useCallback(
		// eslint-disable-next-line react/no-unused-prop-types
		({ row }: { row: Row<TableRowData> }): JSX.Element => {
			const { original } = row;
			return <span>{original.httpMethod || '-'}</span>;
		},
		[],
	);

	const columns: ColumnDef<TableRowData>[] = [
		{
			id: 'name',
			header: 'Span Name',
			accessorKey: 'spanName',
			cell: renderNameCell,
		},
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
			}
		});

		return result;
	}, [data.entrySpans, expandedEntrySpans]);

	const handleRowClick = useCallback(
		(row: Row<TableRowData>) => {
			const { original } = row;
			if (original.type === SPAN_TYPE_ENTRY) {
				handleEntrySpanClick(original.originalData as ServiceEntrySpan);
			} else if (original.type === SPAN_TYPE_SERVICE) {
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
		enableColumnResizing: false,
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
		</div>
	);
}

SpanTable.defaultProps = {
	traceId: undefined,
	setSelectedSpan: undefined,
	isLoading: false,
};

export default SpanTable;
