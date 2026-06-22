import { useMemo, useRef } from 'react';
import { Select, Table } from 'antd';
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

// `body` flexes to fill the remaining table width (module-level so the resize
// hook's memo dependency stays referentially stable across renders).
const BODY_FLEX_COLUMNS = ['body'];

function ListPanelRenderer({
	panelId,
	panel,
	data,
	searchTerm = '',
	pagination,
}: PanelRendererProps<'signoz/ListPanel'>): JSX.Element {
	// Pin the header while the body scrolls (shared with the Table kind).
	const containerRef = useRef<HTMLDivElement>(null);
	const { height } = useResizeObserver(containerRef);
	const { scrollY } = useMemo(() => computeTableLayout(height), [height]);

	// The registry guarantees this Renderer only runs for `signoz/ListPanel`, so
	// the cast is a documented boundary narrowing.
	const spec = useMemo<DashboardtypesListPanelSpecDTO>(
		() => (panel.spec.plugin.spec ?? {}) as DashboardtypesListPanelSpecDTO,
		[panel.spec.plugin.spec],
	);

	// Telemetry signal of the panel's first builder query — drives data flattening,
	// per-signal cell rendering, and the row-click behavior (log drawer vs trace
	// navigation). Cast at this boundary (the query carries the same string values).
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

	// User-resizable columns, persisted per panel; `body` flexes to fill width.
	const { columns: resizableColumns, components } = useResizableColumns({
		panelId,
		columns,
		flexColumns: BODY_FLEX_COLUMNS,
	});

	const dataSource = useMemo(() => table?.rows ?? [], [table]);

	// Header search filters the current page client-side (V1 parity); paging
	// across pages is server-side via `pagination`.
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

	// Show the footer whenever the panel pages server-side (no explicit query
	// limit), so the page-size picker is always reachable — V1 parity.
	const showPager = !!pagination;

	return (
		<div
			ref={containerRef}
			data-testid="list-panel-renderer"
			className={PanelStyles.panelContainer}
		>
			{!table || dataSource.length === 0 ? (
				<NoData />
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
							columns={resizableColumns}
							components={components}
							dataSource={filteredDataSource}
							pagination={false}
							// Scroll the body vertically only — no `x: 'max-content'`, which
							// forced a content-width min and pushed columns off-screen;
							// `tableLayout="fixed"` fits them to the available width.
							scroll={{ y: scrollY }}
							onRow={onRow}
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
