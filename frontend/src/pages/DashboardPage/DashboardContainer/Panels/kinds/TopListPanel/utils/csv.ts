import type { PanelQueryData } from 'pages/DashboardPage/DashboardContainer/queryV5/types';

import type { PanelOfKind } from '../../../types/rendererProps';
import { resolveDecimalPrecision } from '../../../utils/chartAppearance/resolvers';

import { LABEL_NAME_SEPARATOR, prepareTopListData } from './prepareData';
import type { TopListRow } from '../types';
import { formatRowValue, formatShare } from './rowDisplay';

const RANK_HEADER = 'Rank';
const LABEL_HEADER = 'Label';
const VALUE_HEADER = 'Value';
const SHARE_HEADER = 'Share';

interface CsvColumn {
	header: string;
	cell: (row: TopListRow, index: number) => string;
}

/** Suffixes repeated headers (`Share`, `Share (2)`) so no column overwrites another. */
function uniqueHeaders(headers: string[]): string[] {
	const seen = new Set<string>();
	return headers.map((header) => {
		let unique = header;
		for (let n = 2; seen.has(unique); n += 1) {
			unique = `${header} (${n})`;
		}
		seen.add(unique);
		return unique;
	});
}

/** The list as shown: rows in ranked order with their rank, label, formatted value and share. */
export function getTopListCsvRows(
	panel: PanelOfKind<'signoz/TopListPanel'>,
	data: PanelQueryData,
): Record<string, string>[] {
	const { formatting, appearance } = panel.spec.plugin.spec;
	const { rows, labelColumnNames, valueName } = prepareTopListData(data);
	const precision = resolveDecimalPrecision(formatting?.decimalPrecision);

	const columns: CsvColumn[] = [
		{
			header: labelColumnNames.join(LABEL_NAME_SEPARATOR) || LABEL_HEADER,
			cell: (row) => row.label,
		},
		{
			header: valueName || VALUE_HEADER,
			cell: (row) => formatRowValue(row, formatting?.unit, precision),
		},
	];
	if (appearance?.showRank) {
		columns.unshift({
			header: RANK_HEADER,
			cell: (_, index) => String(index + 1),
		});
	}
	if (appearance?.showShare) {
		columns.push({ header: SHARE_HEADER, cell: (row) => formatShare(row.share) });
	}
	const headers = uniqueHeaders(columns.map(({ header }) => header));

	return rows.map((row, index) =>
		Object.fromEntries(
			columns.map(({ cell }, column) => [headers[column], cell(row, index)]),
		),
	);
}
