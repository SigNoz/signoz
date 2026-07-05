import { useEffect, useMemo, useRef, useState } from 'react';
import { Table } from 'antd';
import type { DashboardtypesTablePanelSpecDTO } from 'api/generated/services/sigNoz.schemas';
import { useResizeObserver } from 'hooks/useDimensions';
import { prepareScalarTables } from 'pages/DashboardPageV2/DashboardContainer/queryV5/prepareScalarTables';
import { getScalarResults } from 'pages/DashboardPageV2/DashboardContainer/queryV5/v5ResponseData';

import PanelStyles from '../../panel.module.scss';
import { PanelRendererProps } from '../../types/rendererProps';
import { resolveDecimalPrecision } from '../../utils/chartAppearance/resolvers';
import { useResizableColumns } from '../../hooks/useResizableColumns';
import NoData from '../../components/NoData/NoData';

import { computeTableLayout, filterTableRows } from '../../utils/recordTable';

import {
	buildTableColumns,
	mapTableThresholds,
	type TableRowData,
} from './tableColumns';

import styles from './TablePanel.module.scss';

function TablePanelRenderer({
	panelId,
	panel,
	data,
	refetch,
	searchTerm = '',
}: PanelRendererProps<'signoz/TablePanel'>): JSX.Element {
	// Measure the panel so each page roughly fills it (min 10 rows) with a pinned header.
	const containerRef = useRef<HTMLDivElement>(null);
	const { height } = useResizeObserver(containerRef);
	const { pageSize, scrollY } = useMemo(
		() => computeTableLayout(height),
		[height],
	);

	// `panel` is narrowed to this kind by PanelRendererProps, so no cast needed.
	const spec = useMemo<DashboardtypesTablePanelSpecDTO>(
		() => panel.spec.plugin.spec,
		[panel.spec.plugin.spec],
	);

	// V5 joins every query into a single scalar result, so the first non-empty
	// table is the whole panel.
	const table = useMemo(
		() =>
			prepareScalarTables({
				results: getScalarResults(data?.response),
				legendMap: data.legendMap ?? {},
				requestPayload: data.requestPayload,
			}).find((candidate) => candidate.columns.length > 0),
		[data.response, data.legendMap, data.requestPayload],
	);

	const decimalPrecision = useMemo(
		() => resolveDecimalPrecision(spec.formatting?.decimalPrecision),
		[spec.formatting?.decimalPrecision],
	);

	const thresholdsByColumn = useMemo(
		() => mapTableThresholds(spec.thresholds),
		[spec.thresholds],
	);

	const columns = useMemo(
		() =>
			table
				? buildTableColumns({
						table,
						columnUnits: spec.formatting?.columnUnits ?? {},
						decimalPrecision,
						thresholdsByColumn,
					})
				: [],
		[table, spec.formatting?.columnUnits, decimalPrecision, thresholdsByColumn],
	);

	// User-resizable columns, persisted per panel to localStorage.
	const { columns: resizableColumns, components } = useResizableColumns({
		panelId,
		columns: columns ?? [],
	});

	const dataSource = useMemo<TableRowData[]>(
		() =>
			table ? table.rows.map((row, index) => ({ key: index, ...row.data })) : [],
		[table],
	);

	// Header search filters rows client-side (V1 parity); empty term returns the full set, so non-searching tables pay nothing.
	const filteredDataSource = useMemo(
		() => filterTableRows(dataSource, searchTerm),
		[dataSource, searchTerm],
	);

	// Snap back to page 1 on a new search term so the filtered set never lands on a now-empty page.
	const [page, setPage] = useState(1);
	useEffect(() => setPage(1), [searchTerm]);

	return (
		<div
			ref={containerRef}
			data-testid="table-panel-renderer"
			className={PanelStyles.panelContainer}
		>
			{!table || dataSource.length === 0 ? (
				<NoData onRetry={refetch} />
			) : (
				<div className={styles.container}>
					<Table
						size="small"
						columns={resizableColumns}
						components={components}
						dataSource={filteredDataSource}
						pagination={{
							current: page,
							pageSize,
							hideOnSinglePage: true,
							size: 'small',
							onChange: setPage,
						}}
						scroll={{ x: 'max-content', y: scrollY }}
					/>
				</div>
			)}
		</div>
	);
}

export default TablePanelRenderer;
