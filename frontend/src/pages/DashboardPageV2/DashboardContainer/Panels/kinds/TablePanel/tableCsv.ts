import type { PrecisionOption } from 'components/Graph/types';
import { prepareScalarTables } from 'pages/DashboardPageV2/DashboardContainer/queryV5/prepareScalarTables';
import type {
	PanelQueryData,
	PanelTable,
} from 'pages/DashboardPageV2/DashboardContainer/queryV5/types';
import { getScalarResults } from 'pages/DashboardPageV2/DashboardContainer/queryV5/v5ResponseData';

import { resolveDecimalPrecision } from '../../utils/chartAppearance/resolvers';
import { getColumnUnit } from '../../utils/getColumnUnit';
import type { PanelOfKind } from '../../types/rendererProps';

import { formatTableCellText } from './tableColumns';

interface BuildTableCsvRowsArgs {
	table: PanelTable;
	/** Per-column display unit (`formatting.columnUnits`), keyed by column key. */
	columnUnits: Record<string, string>;
	decimalPrecision?: PrecisionOption;
}

/**
 * Flattens a prepared table into CSV rows keyed by column name, reusing the
 * on-screen cell formatting in display column order. Exports the full result
 * set, not the paginated view (V1 parity).
 */
export function buildTableCsvRows({
	table,
	columnUnits,
	decimalPrecision,
}: BuildTableCsvRowsArgs): Record<string, string>[] {
	return table.rows.map((row) => {
		const csvRow: Record<string, string> = {};
		table.columns.forEach((col) => {
			const key = col.id || col.name;
			const unit = getColumnUnit(key, columnUnits);
			csvRow[col.name] = formatTableCellText(
				col,
				row.data[key],
				unit,
				decimalPrecision,
			);
		});
		return csvRow;
	});
}

/**
 * Prepares the scalar table from the query response and flattens it to CSV rows,
 * reusing the on-screen formatting. Returns [] when the response has no table.
 */
export function getTableCsvRows(
	panel: PanelOfKind<'signoz/TablePanel'>,
	data: PanelQueryData,
): Record<string, string>[] {
	const spec = panel.spec.plugin.spec;
	const table = prepareScalarTables({
		results: getScalarResults(data.response),
		legendMap: data.legendMap ?? {},
		requestPayload: data.requestPayload,
	}).find((candidate) => candidate.columns.length > 0);
	if (!table) {
		return [];
	}
	return buildTableCsvRows({
		table,
		columnUnits: spec.formatting?.columnUnits ?? {},
		decimalPrecision: resolveDecimalPrecision(spec.formatting?.decimalPrecision),
	});
}
