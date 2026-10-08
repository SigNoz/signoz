import { prepareScalarTables } from 'pages/DashboardPage/DashboardContainer/queryV5/prepareScalarTables';
import type { PanelQueryData } from 'pages/DashboardPage/DashboardContainer/queryV5/types';
import { getScalarResults } from 'pages/DashboardPage/DashboardContainer/queryV5/v5ResponseData';

import type { PanelOfKind } from '../../types/rendererProps';
import { resolveDecimalPrecision } from '../../utils/chartAppearance/resolvers';

import { prepareTopListRows } from './prepareData';
import { formatRowValue } from './utils';

const RANK_HEADER = 'Rank';
const LABEL_HEADER = 'Label';
const VALUE_HEADER = 'Value';

/** The list as shown: ranked rows with their label and formatted value. */
export function getTopListCsvRows(
	panel: PanelOfKind<'signoz/TopListPanel'>,
	data: PanelQueryData,
): Record<string, string>[] {
	const { formatting } = panel.spec.plugin.spec;
	const { rows, labelColumnNames, valueColumnName } = prepareTopListRows(
		prepareScalarTables({
			results: getScalarResults(data.response),
			legendMap: data.legendMap ?? {},
			requestPayload: data.requestPayload,
		}),
	);
	const labelHeader = labelColumnNames.join(' · ') || LABEL_HEADER;
	const valueHeader = valueColumnName || VALUE_HEADER;
	const precision = resolveDecimalPrecision(formatting?.decimalPrecision);

	return rows.map((row, index) => ({
		[RANK_HEADER]: String(index + 1),
		[labelHeader]: row.label,
		[valueHeader]: formatRowValue(row, formatting?.unit, precision),
	}));
}
