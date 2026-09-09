import { TelemetrytypesSignalDTO } from 'api/generated/services/sigNoz.schemas';
import { EQueryType } from 'types/common/dashboard';

import { getPanelTypeDisabledReason } from '../utils';

const { QUERY_BUILDER, CLICKHOUSE, PROM } = EQueryType;
const { logs, metrics, traces } = TelemetrytypesSignalDTO;

describe('getPanelTypeDisabledReason', () => {
	it('returns undefined for a supported combination', () => {
		expect(
			getPanelTypeDisabledReason({
				kind: 'signoz/TimeSeriesPanel',
				queryType: PROM,
				label: 'Time Series',
			}),
		).toBeUndefined();
		expect(
			getPanelTypeDisabledReason({
				kind: 'signoz/ListPanel',
				queryType: QUERY_BUILDER,
				signal: logs,
				label: 'List',
			}),
		).toBeUndefined();
	});

	it('explains an unsupported query type', () => {
		expect(
			getPanelTypeDisabledReason({
				kind: 'signoz/ListPanel',
				queryType: PROM,
				label: 'List',
			}),
		).toBe("List isn't available for PromQL queries");
		expect(
			getPanelTypeDisabledReason({
				kind: 'signoz/ListPanel',
				queryType: CLICKHOUSE,
				label: 'List',
			}),
		).toBe("List isn't available for ClickHouse queries");
		expect(
			getPanelTypeDisabledReason({
				kind: 'signoz/TablePanel',
				queryType: PROM,
				label: 'Table',
			}),
		).toBe("Table isn't available for PromQL queries");
	});

	it('explains an unsupported signal', () => {
		expect(
			getPanelTypeDisabledReason({
				kind: 'signoz/ListPanel',
				queryType: QUERY_BUILDER,
				signal: metrics,
				label: 'List',
			}),
		).toBe("List doesn't support metrics data");
	});

	it('prefers the query-type reason when both are incompatible', () => {
		expect(
			getPanelTypeDisabledReason({
				kind: 'signoz/ListPanel',
				queryType: PROM,
				signal: metrics,
				label: 'List',
			}),
		).toBe("List isn't available for PromQL queries");
	});

	describe('AI queries', () => {
		it('explains a kind that cannot carry an AI query', () => {
			expect(
				getPanelTypeDisabledReason({
					kind: 'signoz/ListPanel',
					queryType: QUERY_BUILDER,
					signal: traces,
					label: 'List',
					isAIQuery: true,
				}),
			).toBe("List isn't available for AI queries");
		});

		it('allows a kind that supports AI queries', () => {
			expect(
				getPanelTypeDisabledReason({
					kind: 'signoz/TimeSeriesPanel',
					queryType: QUERY_BUILDER,
					signal: traces,
					label: 'Time Series',
					isAIQuery: true,
				}),
			).toBeUndefined();
		});

		it('takes precedence over the query-type and signal reasons', () => {
			// List is otherwise valid for builder+traces, so only the AI gate can disable it.
			expect(
				getPanelTypeDisabledReason({
					kind: 'signoz/ListPanel',
					queryType: PROM,
					signal: metrics,
					label: 'List',
					isAIQuery: true,
				}),
			).toBe("List isn't available for AI queries");
		});

		it('leaves the existing reasons untouched when not an AI query', () => {
			expect(
				getPanelTypeDisabledReason({
					kind: 'signoz/ListPanel',
					queryType: QUERY_BUILDER,
					signal: traces,
					label: 'List',
					isAIQuery: false,
				}),
			).toBeUndefined();
		});
	});
});
