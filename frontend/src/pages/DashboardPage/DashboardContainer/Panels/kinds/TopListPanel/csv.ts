import type { PanelQueryData } from 'pages/DashboardPage/DashboardContainer/queryV5/types';

import type { PanelOfKind } from '../../types/rendererProps';
import { resolveDecimalPrecision } from '../../utils/chartAppearance/resolvers';

import { prepareTopListData } from './prepareData';
import { formatRowValue, formatShare } from './utils';

const RANK_HEADER = 'Rank';
const LABEL_HEADER = 'Label';
const VALUE_HEADER = 'Value';
const SHARE_HEADER = 'Share';

/** The list as shown: rows in ranked order with their rank, label, formatted value and share. */
export function getTopListCsvRows(
	panel: PanelOfKind<'signoz/TopListPanel'>,
	data: PanelQueryData,
): Record<string, string>[] {
	const { formatting, appearance } = panel.spec.plugin.spec;
	const { rows, labelColumnNames, valueColumnName } = prepareTopListData(data);
	const labelHeader = labelColumnNames.join(' · ') || LABEL_HEADER;
	const valueHeader = valueColumnName || VALUE_HEADER;
	const precision = resolveDecimalPrecision(formatting?.decimalPrecision);

	return rows.map((row, index) => ({
		...(appearance?.showRank && { [RANK_HEADER]: String(index + 1) }),
		[labelHeader]: row.label,
		[valueHeader]: formatRowValue(row, formatting?.unit, precision),
		...(appearance?.showShare && {
			[SHARE_HEADER]: formatShare(row.share),
		}),
	}));
}
