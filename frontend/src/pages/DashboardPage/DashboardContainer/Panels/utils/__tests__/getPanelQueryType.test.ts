import type { DashboardtypesPanelDTO } from 'api/generated/services/sigNoz.schemas';
import { EQueryType } from 'types/common/dashboard';

import { getPanelQueryType } from '../getPanelQueryType';

function panelWithEnvelopes(envelopes: unknown[]): DashboardtypesPanelDTO {
	return {
		kind: 'Panel',
		spec: {
			display: { name: 'P' },
			plugin: { kind: 'signoz/TimeSeriesPanel', spec: {} },
			queries: envelopes.length
				? [
						{
							spec: {
								plugin: { kind: 'signoz/CompositeQuery', spec: { queries: envelopes } },
							},
						},
					]
				: [],
		},
	} as unknown as DashboardtypesPanelDTO;
}

describe('getPanelQueryType', () => {
	it('returns undefined when the panel has no query', () => {
		expect(getPanelQueryType(panelWithEnvelopes([]))).toBeUndefined();
	});

	it('reports the builder mode for builder queries', () => {
		const panel = panelWithEnvelopes([
			{ type: 'builder_query', spec: { signal: 'traces', name: 'A' } },
		]);
		expect(getPanelQueryType(panel)).toBe(EQueryType.QUERY_BUILDER);
	});

	it('reports PromQL when a promql envelope is present', () => {
		const panel = panelWithEnvelopes([
			{ type: 'promql', spec: { query: 'up', name: 'A' } },
		]);
		expect(getPanelQueryType(panel)).toBe(EQueryType.PROM);
	});

	it('reports ClickHouse when a clickhouse_sql envelope is present', () => {
		const panel = panelWithEnvelopes([
			{ type: 'clickhouse_sql', spec: { query: 'SELECT 1', name: 'A' } },
		]);
		expect(getPanelQueryType(panel)).toBe(EQueryType.CLICKHOUSE);
	});
});
