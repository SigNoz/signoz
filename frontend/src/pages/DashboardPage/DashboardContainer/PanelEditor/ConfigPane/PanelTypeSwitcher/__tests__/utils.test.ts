import { TelemetrytypesSignalDTO } from 'api/generated/services/sigNoz.schemas';
import { EQueryType } from 'types/common/dashboard';

import { getPanelTypeDisabledReason } from '../utils';

const { QUERY_BUILDER, CLICKHOUSE, PROM } = EQueryType;
const { logs, metrics } = TelemetrytypesSignalDTO;

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

	it('blocks Histogram and Distribution switching into each other, both ways', () => {
		expect(
			getPanelTypeDisabledReason({
				kind: 'signoz/DistributionPanel',
				fromKind: 'signoz/HistogramPanel',
				queryType: QUERY_BUILDER,
				signal: metrics,
				label: 'Distribution',
			}),
		).toMatch(/can't switch between them/);
		expect(
			getPanelTypeDisabledReason({
				kind: 'signoz/HistogramPanel',
				fromKind: 'signoz/DistributionPanel',
				queryType: QUERY_BUILDER,
				signal: metrics,
				label: 'Histogram',
			}),
		).toMatch(/can't switch between them/);
	});

	it('lets Distribution switch to other kinds', () => {
		expect(
			getPanelTypeDisabledReason({
				kind: 'signoz/HeatmapPanel',
				fromKind: 'signoz/DistributionPanel',
				queryType: QUERY_BUILDER,
				signal: metrics,
				label: 'Heatmap',
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
});
