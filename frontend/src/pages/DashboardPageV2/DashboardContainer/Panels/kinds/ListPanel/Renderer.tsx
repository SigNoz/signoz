import { useMemo, useRef } from 'react';
import { Select, Skeleton, Table } from 'antd';
import cx from 'classnames';
import { Button } from '@signozhq/ui/button';
import { ChevronLeft, ChevronRight } from '@signozhq/icons';
import {
	type DashboardtypesListPanelSpecDTO,
	TelemetrytypesSignalDTO,
} from 'api/generated/services/sigNoz.schemas';
import LogDetail from 'components/LogDetail';
import { useResizeObserver } from 'hooks/useDimensions';
import { useTimezone } from 'providers/Timezone';
import { prepareRawTable } from 'pages/DashboardPageV2/DashboardContainer/queryV5/prepareRawTable';
import { getRawResults } from 'pages/DashboardPageV2/DashboardContainer/queryV5/v5ResponseData';
import type { IField } from 'types/api/logs/fields';

import PanelStyles from '../../panel.module.scss';
import { PanelRendererProps } from '../../types/rendererProps';
import { useResizableColumns } from '../../hooks/useResizableColumns';
import { getBuilderQueries } from '../../utils/getBuilderQueries';
import NoData from '../../components/NoData/NoData';
import { computeTableLayout, filterTableRows } from '../../utils/recordTable';

import { buildListColumns } from './columns';
import { useListRowInteraction } from './useListRowInteraction';

import styles from './ListPanel.module.scss';

// `body` flexes to fill remaining width; module-level to stay referentially stable for the resize hook's memo.
const BODY_FLEX_COLUMNS = ['body'];

function ListPanelRenderer({
	panelId,
	panel,
	data,
	isFetching,
	refetch,
	searchTerm = '',
	pagination,
	isPreviousData = false,
}: PanelRendererProps<'signoz/ListPanel'>): JSX.Element {
	// Pin the header while the body scrolls (shared with the Table kind).
	const containerRef = useRef<HTMLDivElement>(null);
	const { height } = useResizeObserver(containerRef);
	const { scrollY } = useMemo(() => computeTableLayout(height), [height]);

	// `panel` is narrowed to this kind by PanelRendererProps, so no cast needed.
	const spec = useMemo<DashboardtypesListPanelSpecDTO>(
		() => panel.spec.plugin.spec,
		[panel.spec.plugin.spec],
	);

	// Telemetry signal of the first builder query; drives flattening, cell rendering,
	// and row-click behavior. Cast is safe — the query carries the same string values.
	const signal = useMemo(
		() =>
			(getBuilderQueries(panel.spec.queries)[0]
				?.signal as TelemetrytypesSignalDTO) || TelemetrytypesSignalDTO.logs,
		[panel.spec.queries],
	);

	const table = useMemo(
		() =>
			prepareRawTable({
				results: getRawResults(data.response),
				selectFields: spec.selectFields ?? [],
				signal,
			}),
		[data.response, spec.selectFields, signal],
	);

	const { formatTimezoneAdjustedTimestamp } = useTimezone();

	const columns = useMemo(
		() =>
			table
				? buildListColumns({
						columns: table.columns,
						signal,
						formatTimestamp: formatTimezoneAdjustedTimestamp,
					})
				: [],
		[table, signal, formatTimezoneAdjustedTimestamp],
	);

	// User-resizable columns, persisted per panel.
	const { columns: resizableColumns, components } = useResizableColumns({
		panelId,
		columns,
		flexColumns: BODY_FLEX_COLUMNS,
	});

	const dataSource = useMemo(() => table?.rows ?? [], [table]);

	// Header search filters the current page client-side (V1 parity); cross-page paging is server-side via `pagination`.
	const filteredDataSource = useMemo(
		() => filterTableRows(dataSource, searchTerm),
		[dataSource, searchTerm],
	);

	const { onRow, logDetail } = useListRowInteraction({
		signal,
		rows: filteredDataSource,
	});

	// The drawer's "selected fields" tab mirrors the panel's chosen columns.
	const selectedLogFields = useMemo<IField[]>(
		() =>
			(spec.selectFields ?? []).map((field) => ({
				name: field.name,
				type: field.fieldContext ?? '',
				dataType: field.fieldDataType ?? '',
			})),
		[spec.selectFields],
	);

	// Show the footer whenever the panel pages server-side, so the page-size picker stays reachable (V1 parity).
	const showPager = !!pagination;

	// While the next page loads, swap the stale rows (held by keepPreviousData) for skeleton bars,
	// keeping the header + pager. Row count mirrors the page being left.
	const skeletonRowCount = dataSource.length || pagination?.pageSize || 10;
	const skeletonColumns = useMemo(
		() =>
			resizableColumns.map((col) => ({
				...col,
				render: (): JSX.Element => <Skeleton.Input active block size="small" />,
			})),
		[resizableColumns],
	);
	const skeletonRows = useMemo(
		() =>
			Array.from({ length: skeletonRowCount }, (_, index) => ({
				key: `skeleton-${index}`,
			})) as unknown as typeof filteredDataSource,
		[skeletonRowCount],
	);

	return (
		<div
			ref={containerRef}
			data-testid="list-panel-renderer"
			className={PanelStyles.panelContainer}
		>
			{!table || dataSource.length === 0 ? (
				<NoData isFetching={isFetching} onRetry={refetch} panel={panel} />
			) : (
				<>
					<div
						className={cx(styles.container, {
							[styles.logRows]: signal === TelemetrytypesSignalDTO.logs,
							[styles.traceRows]: signal === TelemetrytypesSignalDTO.traces,
						})}
					>
						<Table
							size="small"
							tableLayout="fixed"
							columns={isPreviousData ? skeletonColumns : resizableColumns}
							components={components}
							dataSource={isPreviousData ? skeletonRows : filteredDataSource}
							pagination={false}
							// Vertical scroll only; `x: 'max-content'` forced a content-width min that pushed columns off-screen.
							scroll={{ y: scrollY }}
							onRow={isPreviousData ? undefined : onRow}
						/>
					</div>
					{showPager && pagination && (
						<div className={styles.pager} data-testid="list-panel-pager">
							<Button
								type="button"
								variant="ghost"
								color="secondary"
								size="icon"
								aria-label="Previous page"
								data-testid="list-panel-prev"
								disabled={!pagination.canPrev}
								onClick={pagination.goPrev}
							>
								<ChevronLeft size={14} />
							</Button>
							<span className={styles.pagerLabel} data-testid="list-panel-page">
								Page {pagination.pageIndex + 1}
							</span>
							<Button
								type="button"
								variant="ghost"
								color="secondary"
								size="icon"
								aria-label="Next page"
								data-testid="list-panel-next"
								disabled={!pagination.canNext}
								onClick={pagination.goNext}
							>
								<ChevronRight size={14} />
							</Button>
							<Select<number>
								size="small"
								className={styles.pageSize}
								value={pagination.pageSize}
								onChange={(value): void => pagination.setPageSize(value)}
								data-testid="list-panel-page-size"
								options={pagination.pageSizeOptions.map((count) => ({
									value: count,
									label: `${count} / page`,
								}))}
							/>
						</div>
					)}
				</>
			)}
			{logDetail?.activeLog && (
				<LogDetail
					log={logDetail.activeLog}
					selectedTab={logDetail.selectedTab}
					onClose={logDetail.onClose}
					onAddToQuery={logDetail.onAddToQuery}
					onClickActionItem={logDetail.onAddToQuery}
					onNavigateLog={logDetail.onNavigateLog}
					logs={logDetail.logs}
					isListViewPanel
					listViewPanelSelectedFields={selectedLogFields}
				/>
			)}
		</div>
	);
}

export default ListPanelRenderer;
