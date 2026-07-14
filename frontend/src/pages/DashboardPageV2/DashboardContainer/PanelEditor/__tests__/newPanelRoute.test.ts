import { PANEL_TYPES } from 'constants/queryBuilder';
import type { Query } from 'types/api/queryBuilder/queryBuilderData';

import {
	buildExportPanelLink,
	NEW_PANEL_ID,
	newPanelSearch,
	parseNewPanelKind,
	parseNewPanelLayoutIndex,
} from '../newPanelRoute';

describe('newPanelRoute', () => {
	it('round-trips kind + layoutIndex through the new-panel search', () => {
		const search = newPanelSearch('signoz/ListPanel', 2);
		expect(parseNewPanelKind(NEW_PANEL_ID, search)).toBe('signoz/ListPanel');
		expect(parseNewPanelLayoutIndex(search)).toBe(2);
	});

	it('omits layoutIndex when not provided', () => {
		const search = newPanelSearch('signoz/TimeSeriesPanel');
		expect(parseNewPanelKind(NEW_PANEL_ID, search)).toBe(
			'signoz/TimeSeriesPanel',
		);
		expect(parseNewPanelLayoutIndex(search)).toBeUndefined();
	});

	it('returns null for an existing panel id (not the new sentinel)', () => {
		const search = newPanelSearch('signoz/ListPanel');
		expect(parseNewPanelKind('a1b2c3d4-uuid', search)).toBeNull();
	});

	it('returns null when the kind param is missing or unknown', () => {
		expect(parseNewPanelKind(NEW_PANEL_ID, '')).toBeNull();
		expect(
			parseNewPanelKind(NEW_PANEL_ID, '?panelKind=NotARealPanel'),
		).toBeNull();
	});

	describe('buildExportPanelLink', () => {
		const query = { id: 'q1', queryType: 'builder' } as unknown as Query;

		const parseLink = (
			link: string | null,
		): { path: string; params: URLSearchParams } => {
			if (link === null) {
				throw new Error('expected a link, got null');
			}
			const [path, search] = link.split('?');
			return { path, params: new URLSearchParams(search) };
		};

		it.each([
			[PANEL_TYPES.TIME_SERIES, 'signoz/TimeSeriesPanel'],
			[PANEL_TYPES.TABLE, 'signoz/TablePanel'],
			[PANEL_TYPES.LIST, 'signoz/ListPanel'],
		])('maps export panel type %s to kind %s', (panelType, expectedKind) => {
			const link = buildExportPanelLink({
				dashboardId: 'dash-1',
				panelType,
				query,
			});
			const { path, params } = parseLink(link);
			expect(path).toBe('/dashboard/dash-1/panel/new');
			expect(params.get('panelKind')).toBe(expectedKind);
			expect(parseNewPanelKind(NEW_PANEL_ID, `?${params.toString()}`)).toBe(
				expectedKind,
			);
		});

		it('carries the query as a decodable compositeQuery param', () => {
			const link = buildExportPanelLink({
				dashboardId: 'dash-1',
				panelType: PANEL_TYPES.TIME_SERIES,
				query,
			});
			const { params } = parseLink(link);
			expect(JSON.parse(params.get('compositeQuery') as string)).toStrictEqual(
				query,
			);
		});

		it('returns null for a panel type with no V2 kind', () => {
			const link = buildExportPanelLink({
				dashboardId: 'dash-1',
				panelType: PANEL_TYPES.EMPTY_WIDGET,
				query,
			});
			expect(link).toBeNull();
		});
	});
});
