import type { PanelStatusDetail } from 'pages/DashboardPage/DashboardContainer/PanelsAndSectionsLayout/Panel/PanelStatus/types';
import { prepareScalarTables } from 'pages/DashboardPage/DashboardContainer/queryV5/prepareScalarTables';
import type { PanelQueryData } from 'pages/DashboardPage/DashboardContainer/queryV5/types';
import { getScalarResults } from 'pages/DashboardPage/DashboardContainer/queryV5/v5ResponseData';

import type { PanelOfKind } from '../../types/rendererProps';

import { prepareTopListRows } from './prepareData';
import type { TopListData } from './types';

function collectIssues({
	rows,
	labelColumnNames,
	ignoredValueColumns,
}: TopListData): string[] {
	const issues: string[] = [];
	if (labelColumnNames.length === 0) {
		issues.push(
			'The query has no group by, so the list shows a single total. Add a group by to rank its groups.',
		);
	}
	if (ignoredValueColumns.length > 0) {
		const names = ignoredValueColumns.map((name) => `"${name}"`).join(', ');
		const verb = ignoredValueColumns.length === 1 ? 'is' : 'are';
		issues.push(
			`The list ranks the first value column only; ${names} ${verb} not shown.`,
		);
	}
	if (rows.length > 1 && rows.every((row) => row.label === rows[0].label)) {
		issues.push(
			'Every row has the same label. Use {{group-by key}} variables in the legend to tell rows apart.',
		);
	}
	return issues;
}

export function getTopListDataWarning(
	_panel: PanelOfKind<'signoz/TopListPanel'>,
	data: PanelQueryData,
): PanelStatusDetail | null {
	const topList = prepareTopListRows(
		prepareScalarTables({
			results: getScalarResults(data.response),
			legendMap: data.legendMap ?? {},
			requestPayload: data.requestPayload,
		}),
	);
	if (topList.rows.length === 0) {
		return null;
	}

	const issues = collectIssues(topList);
	if (issues.length === 0) {
		return null;
	}
	return {
		message: 'This list may not rank what you expect.',
		messages: issues,
	};
}
