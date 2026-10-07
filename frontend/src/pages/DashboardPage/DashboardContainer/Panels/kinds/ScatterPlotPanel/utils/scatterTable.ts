import { prepareScalarTables } from 'pages/DashboardPage/DashboardContainer/queryV5/prepareScalarTables';
import type {
	PanelQueryData,
	PanelTable,
} from 'pages/DashboardPage/DashboardContainer/queryV5/types';
import { getScalarResults } from 'pages/DashboardPage/DashboardContainer/queryV5/v5ResponseData';

/** V5 joins every query into one scalar result, so the first non-empty table holds every group. */
export function getScatterTable(data: PanelQueryData): PanelTable | undefined {
	return prepareScalarTables({
		results: getScalarResults(data.response),
		legendMap: data.legendMap ?? {},
		requestPayload: data.requestPayload,
	}).find((candidate) => candidate.columns.length > 0);
}
