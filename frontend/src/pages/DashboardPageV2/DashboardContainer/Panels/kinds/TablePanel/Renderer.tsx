import { useMemo, useRef } from 'react';
import { Table } from 'antd';
import type { DashboardtypesTablePanelSpecDTO } from 'api/generated/services/sigNoz.schemas';
import { useResizeObserver } from 'hooks/useDimensions';
import { prepareScalarTables } from 'pages/DashboardPageV2/DashboardContainer/queryV5/prepareScalarTables';
import { getScalarResults } from 'pages/DashboardPageV2/DashboardContainer/queryV5/v5ResponseData';

import PanelStyles from '../../panel.module.scss';
import { PanelRendererProps } from '../../types/rendererProps';
import { resolveDecimalPrecision } from '../../utils/chartAppearance/resolvers';
import NoData from '../../components/NoData/NoData';

import { buildTableColumns, mapTableThresholds } from './tableColumns';
import { computeTableLayout } from './utils';

import styles from './TablePanel.module.scss';

type TableRowData = Record<string, unknown> & { key: number };

function TablePanelRenderer({
	panel,
	data,
}: PanelRendererProps<'signoz/TablePanel'>): JSX.Element {
	// Measure the panel so each page roughly fills it (min 10 rows) and the
	// header stays pinned while the body scrolls.
	const containerRef = useRef<HTMLDivElement>(null);
	const { height } = useResizeObserver(containerRef);
	const { pageSize, scrollY } = useMemo(
		() => computeTableLayout(height),
		[height],
	);

	// The registry guarantees this Renderer only runs when
	// `panel.spec.plugin.kind === 'signoz/TablePanel'`, so the cast is a
	// documented boundary narrowing. Memoized so the `?? {}` fallback doesn't
	// produce a fresh object on each render.
	const spec = useMemo<DashboardtypesTablePanelSpecDTO>(
		() => (panel.spec.plugin.spec ?? {}) as DashboardtypesTablePanelSpecDTO,
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

	const dataSource = useMemo<TableRowData[]>(
		() =>
			table ? table.rows.map((row, index) => ({ key: index, ...row.data })) : [],
		[table],
	);

	return (
		<div
			ref={containerRef}
			data-testid="table-panel-renderer"
			className={PanelStyles.panelContainer}
		>
			{!table || dataSource.length === 0 ? (
				<NoData />
			) : (
				<div className={styles.container}>
					<Table
						size="small"
						columns={columns}
						dataSource={dataSource}
						pagination={{ pageSize, hideOnSinglePage: true, size: 'small' }}
						scroll={{ x: 'max-content', y: scrollY }}
					/>
				</div>
			)}
		</div>
	);
}

export default TablePanelRenderer;
