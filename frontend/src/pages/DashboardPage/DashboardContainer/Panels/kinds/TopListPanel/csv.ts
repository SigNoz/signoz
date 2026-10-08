import type { PanelQueryData } from 'pages/DashboardPage/DashboardContainer/queryV5/types';

import type { PanelOfKind } from '../../types/rendererProps';
import { resolveDecimalPrecision } from '../../utils/chartAppearance/resolvers';

import { prepareTopListData } from './prepareData';
import { formatRowValue } from './utils';

const LABEL_HEADER = 'Label';
const VALUE_HEADER = 'Value';

/** The list as shown: rows in ranked order with their label and formatted value. */
export function getTopListCsvRows(
	panel: PanelOfKind<'signoz/TopListPanel'>,
	data: PanelQueryData,
): Record<string, string>[] {
	const { formatting } = panel.spec.plugin.spec;
	const { rows, labelColumnNames, valueColumnName } = prepareTopListData(data);
	const labelHeader = labelColumnNames.join(' · ') || LABEL_HEADER;
	const valueHeader = valueColumnName || VALUE_HEADER;
	const precision = resolveDecimalPrecision(formatting?.decimalPrecision);

	return rows.map((row) => ({
		[labelHeader]: row.label,
		[valueHeader]: formatRowValue(row, formatting?.unit, precision),
	}));
}
