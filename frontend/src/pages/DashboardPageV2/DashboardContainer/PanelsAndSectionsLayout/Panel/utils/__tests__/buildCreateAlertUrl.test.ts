import type { DashboardtypesPanelDTO } from 'api/generated/services/sigNoz.schemas';
import { ENTITY_VERSION_V5 } from 'constants/app';
import { QueryParams } from 'constants/query';
import { PANEL_TYPES } from 'constants/queryBuilder';
import ROUTES from 'constants/routes';
import { fromPerses } from 'pages/DashboardPageV2/DashboardContainer/queryV5/persesQueryAdapters';
import type { Query } from 'types/api/queryBuilder/queryBuilderData';
import { EQueryType } from 'types/common/dashboard';

import { buildCreateAlertUrl } from '../buildCreateAlertUrl';

// The V5→V1 translation has its own coverage; stub it so this asserts only the
// URL assembly (params, encoding, unit) buildCreateAlertUrl owns.
jest.mock(
	'pages/DashboardPageV2/DashboardContainer/queryV5/persesQueryAdapters',
	() => ({
		fromPerses: jest.fn(),
	}),
);

const mockFromPerses = fromPerses as jest.Mock;

const translatedQuery: Query = {
	queryType: EQueryType.QUERY_BUILDER,
	promql: [],
	clickhouse_sql: [],
	builder: { queryData: [], queryFormulas: [], queryTraceOperator: [] },
	id: 'q1',
};

function makePanel(
	overrides?: Partial<{ unit: string; queries: unknown[] }>,
): DashboardtypesPanelDTO {
	return {
		kind: 'Panel',
		spec: {
			display: { name: 'CPU' },
			plugin: {
				kind: 'signoz/TimeSeriesPanel',
				spec: overrides?.unit ? { formatting: { unit: overrides.unit } } : {},
			},
			queries: overrides?.queries ?? [{ some: 'query' }],
		},
	} as unknown as DashboardtypesPanelDTO;
}

describe('buildCreateAlertUrl', () => {
	beforeEach(() => {
		mockFromPerses.mockReset();
		mockFromPerses.mockReturnValue({ ...translatedQuery });
	});

	function parse(url: string): URLSearchParams {
		expect(url.startsWith(`${ROUTES.ALERTS_NEW}?`)).toBe(true);
		return new URLSearchParams(url.slice(url.indexOf('?') + 1));
	}

	it('translates the panel queries with the mapped panel type', () => {
		const panel = makePanel();
		buildCreateAlertUrl(panel);

		expect(mockFromPerses).toHaveBeenCalledWith(
			panel.spec.queries,
			PANEL_TYPES.TIME_SERIES,
		);
	});

	it('tags the URL with panel type, v5 version, and the dashboards source', () => {
		const params = parse(buildCreateAlertUrl(makePanel()));

		expect(params.get(QueryParams.panelTypes)).toBe(PANEL_TYPES.TIME_SERIES);
		expect(params.get(QueryParams.version)).toBe(ENTITY_VERSION_V5);
		expect(params.get(QueryParams.source)).toBe('dashboards');
	});

	it('encodes the translated query as the compositeQuery param', () => {
		const params = parse(buildCreateAlertUrl(makePanel()));

		const raw = params.get(QueryParams.compositeQuery);
		expect(raw).toBeTruthy();
		const decoded = JSON.parse(decodeURIComponent(raw as string));
		expect(decoded.queryType).toBe(EQueryType.QUERY_BUILDER);
		expect(decoded.id).toBe('q1');
	});

	it('carries the panel formatting unit onto the alert query when set', () => {
		const params = parse(buildCreateAlertUrl(makePanel({ unit: 'bytes' })));

		const decoded = JSON.parse(
			decodeURIComponent(params.get(QueryParams.compositeQuery) as string),
		);
		expect(decoded.unit).toBe('bytes');
	});

	it('leaves the query unit unset when the panel has no formatting unit', () => {
		const params = parse(buildCreateAlertUrl(makePanel()));

		const decoded = JSON.parse(
			decodeURIComponent(params.get(QueryParams.compositeQuery) as string),
		);
		expect(decoded.unit).toBeUndefined();
	});
});
