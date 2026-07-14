import { TelemetrytypesSignalDTO } from 'api/generated/services/sigNoz.schemas';
import { OPERATORS } from 'constants/queryBuilder';
import { EQueryType } from 'types/common/dashboard';

import {
	getHiddenQueryBuilderFields,
	getSupportedQueryTypes,
	getSupportedSignals,
	isPanelCombinationValid,
	isQueryTypeSupportedByPanelKind,
	isSignalSupported,
	resolveQueryType,
} from '../capabilities';
import type { PanelKind } from '../types/panelKind';

const { QUERY_BUILDER, CLICKHOUSE, PROM } = EQueryType;
const { logs, traces, metrics } = TelemetrytypesSignalDTO;

const EXPECTED_QUERY_TYPES: Record<PanelKind, EQueryType[]> = {
	'signoz/TimeSeriesPanel': [QUERY_BUILDER, CLICKHOUSE, PROM],
	'signoz/BarChartPanel': [QUERY_BUILDER, CLICKHOUSE, PROM],
	'signoz/NumberPanel': [QUERY_BUILDER, CLICKHOUSE, PROM],
	'signoz/HistogramPanel': [QUERY_BUILDER, CLICKHOUSE, PROM],
	'signoz/PieChartPanel': [QUERY_BUILDER, CLICKHOUSE],
	'signoz/TablePanel': [QUERY_BUILDER, CLICKHOUSE],
	'signoz/ListPanel': [QUERY_BUILDER],
};

const EXPECTED_SIGNALS: Record<PanelKind, TelemetrytypesSignalDTO[]> = {
	'signoz/TimeSeriesPanel': [metrics, logs, traces],
	'signoz/BarChartPanel': [metrics, logs, traces],
	'signoz/NumberPanel': [metrics, logs, traces],
	'signoz/HistogramPanel': [metrics, logs, traces],
	'signoz/PieChartPanel': [metrics, logs, traces],
	'signoz/TablePanel': [metrics, logs, traces],
	// List renders raw rows; metrics produce no row data.
	'signoz/ListPanel': [logs, traces],
};

const ALL_KINDS = Object.keys(EXPECTED_QUERY_TYPES) as PanelKind[];

describe('panel capabilities guard', () => {
	describe('query type support', () => {
		it.each(ALL_KINDS)('declares the expected query types for %s', (kind) => {
			expect(getSupportedQueryTypes(kind)).toStrictEqual(
				EXPECTED_QUERY_TYPES[kind],
			);
		});

		it('Table and Pie do not support PromQL', () => {
			expect(isQueryTypeSupportedByPanelKind('signoz/TablePanel', PROM)).toBe(
				false,
			);
			expect(isQueryTypeSupportedByPanelKind('signoz/PieChartPanel', PROM)).toBe(
				false,
			);
		});

		it('List only supports Query Builder', () => {
			expect(
				isQueryTypeSupportedByPanelKind('signoz/ListPanel', QUERY_BUILDER),
			).toBe(true);
			expect(isQueryTypeSupportedByPanelKind('signoz/ListPanel', CLICKHOUSE)).toBe(
				false,
			);
			expect(isQueryTypeSupportedByPanelKind('signoz/ListPanel', PROM)).toBe(
				false,
			);
		});
	});

	describe('signal support', () => {
		it.each(ALL_KINDS)('declares the expected signals for %s', (kind) => {
			expect(getSupportedSignals(kind)).toStrictEqual(EXPECTED_SIGNALS[kind]);
		});

		it('List excludes metrics', () => {
			expect(isSignalSupported('signoz/ListPanel', metrics)).toBe(false);
			expect(isSignalSupported('signoz/ListPanel', logs)).toBe(true);
			expect(isSignalSupported('signoz/ListPanel', traces)).toBe(true);
		});
	});

	describe('isPanelCombinationValid', () => {
		it('accepts a supported triad', () => {
			expect(
				isPanelCombinationValid({
					kind: 'signoz/TimeSeriesPanel',
					queryType: PROM,
				}),
			).toBe(true);
			expect(
				isPanelCombinationValid({
					kind: 'signoz/ListPanel',
					queryType: QUERY_BUILDER,
					signal: logs,
				}),
			).toBe(true);
		});

		it('rejects an unsupported query type', () => {
			expect(
				isPanelCombinationValid({ kind: 'signoz/ListPanel', queryType: PROM }),
			).toBe(false);
			expect(
				isPanelCombinationValid({ kind: 'signoz/TablePanel', queryType: PROM }),
			).toBe(false);
		});

		it('rejects an unsupported signal when one is given', () => {
			expect(
				isPanelCombinationValid({
					kind: 'signoz/ListPanel',
					queryType: QUERY_BUILDER,
					signal: metrics,
				}),
			).toBe(false);
		});

		it('ignores signal when none is given (ClickHouse/PromQL have no signal)', () => {
			expect(
				isPanelCombinationValid({
					kind: 'signoz/ListPanel',
					queryType: QUERY_BUILDER,
				}),
			).toBe(true);
		});
	});

	describe('resolveQueryType', () => {
		it('keeps a supported query type', () => {
			expect(resolveQueryType('signoz/TimeSeriesPanel', PROM)).toBe(PROM);
			expect(resolveQueryType('signoz/ListPanel', QUERY_BUILDER)).toBe(
				QUERY_BUILDER,
			);
		});

		it('coerces an unsupported query type to the first supported one', () => {
			// PromQL → List has no PromQL, falls back to its first (and only) type.
			expect(resolveQueryType('signoz/ListPanel', PROM)).toBe(QUERY_BUILDER);
			expect(resolveQueryType('signoz/TablePanel', PROM)).toBe(QUERY_BUILDER);
		});
	});

	describe('getHiddenQueryBuilderFields', () => {
		it('returns {} for kinds that declare no field rules', () => {
			expect(
				getHiddenQueryBuilderFields('signoz/TimeSeriesPanel', logs),
			).toStrictEqual({});
			expect(getHiddenQueryBuilderFields('signoz/TablePanel', logs)).toStrictEqual(
				{},
			);
		});

		// Mirrors QueryBuilderV2's internal listViewLogFilterConfigs — the guard is the
		// single source of truth for these values.
		it('hides step interval / having and sets body-contains for List + logs', () => {
			expect(getHiddenQueryBuilderFields('signoz/ListPanel', logs)).toStrictEqual({
				stepInterval: { isHidden: true, isDisabled: true },
				having: { isHidden: true, isDisabled: true },
				filters: { customKey: 'body', customOp: OPERATORS.CONTAINS },
			});
		});

		// Mirrors listViewTracesFilterConfigs — traces additionally hide `limit`.
		it('additionally hides limit for List + traces', () => {
			expect(
				getHiddenQueryBuilderFields('signoz/ListPanel', traces),
			).toStrictEqual({
				stepInterval: { isHidden: true, isDisabled: true },
				having: { isHidden: true, isDisabled: true },
				limit: { isHidden: true, isDisabled: true },
				filters: { customKey: 'body', customOp: OPERATORS.CONTAINS },
			});
		});
	});
});
