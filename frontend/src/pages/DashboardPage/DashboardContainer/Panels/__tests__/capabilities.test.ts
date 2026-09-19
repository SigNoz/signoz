import {
	Querybuildertypesv5RequestTypeDTO,
	TelemetrytypesSignalDTO,
} from 'api/generated/services/sigNoz.schemas';
import { OPERATORS } from 'constants/queryBuilder';
import { EQueryType } from 'types/common/dashboard';

import { UNSUPPORTED_PANEL } from '../kinds/UnsupportedPanel/definition';
import { getPanelDefinition, isPanelKindSupported } from '../registry';
import type { PanelQueryCapabilities } from '../types/panelCapabilities';
import { NO_PANEL_ACTIONS } from '../types/panelDefinition';
import {
	getHiddenQueryBuilderFields,
	getQueryPanelDefinition,
	requireQueryPanelDefinition,
	getSupportedQueryTypes,
	getSupportedSignals,
	isPanelCombinationValid,
	isQueryTypeSupportedByPanelKind,
	isQueryModeSupportedByPanelKind,
	isSignalSupported,
	resolveQueryMode,
	resolveQueryType,
} from '../capabilities';
import { AI_QUERY_MODE } from '../types/queryModes';
import type { PanelKind } from '../types/panelKind';

const { QUERY_BUILDER, CLICKHOUSE, PROM } = EQueryType;
const { logs, traces, metrics } = TelemetrytypesSignalDTO;
const { time_series, scalar, raw } = Querybuildertypesv5RequestTypeDTO;

const EXPECTED_QUERY_TYPES: Record<PanelKind, EQueryType[]> = {
	'signoz/TimeSeriesPanel': [QUERY_BUILDER, CLICKHOUSE, PROM],
	'signoz/BarChartPanel': [QUERY_BUILDER, CLICKHOUSE, PROM],
	'signoz/NumberPanel': [QUERY_BUILDER, CLICKHOUSE, PROM],
	'signoz/HistogramPanel': [QUERY_BUILDER, CLICKHOUSE, PROM],
	'signoz/PieChartPanel': [QUERY_BUILDER, CLICKHOUSE],
	'signoz/TablePanel': [QUERY_BUILDER, CLICKHOUSE],
	'signoz/ListPanel': [QUERY_BUILDER],
	// Static kind: no query surface at all.
	'signoz/TextPanel': [],
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
	'signoz/TextPanel': [],
};

// Exhaustive over PanelKind, so a new kind can't ship without stating how its request is
// shaped — the check that used to be implicit in a legacy PANEL_TYPES switch.
// Partial: a static kind declares no query capabilities — the lookup below
// resolves undefined on both sides for it.
const EXPECTED_QUERY_CAPABILITIES: Partial<
	Record<PanelKind, PanelQueryCapabilities>
> = {
	'signoz/TimeSeriesPanel': {
		requestType: time_series,
		formatTableResultForUI: false,
		bucketedStepInterval: false,
		orderTiebreaker: false,
		serverPaginated: false,
	},
	// Bar bins client-side, so it asks for a widened step interval over a raw series.
	'signoz/BarChartPanel': {
		requestType: time_series,
		formatTableResultForUI: false,
		bucketedStepInterval: true,
		orderTiebreaker: false,
		serverPaginated: false,
	},
	'signoz/HistogramPanel': {
		requestType: time_series,
		formatTableResultForUI: false,
		bucketedStepInterval: false,
		orderTiebreaker: false,
		serverPaginated: false,
	},
	'signoz/NumberPanel': {
		requestType: scalar,
		formatTableResultForUI: false,
		bucketedStepInterval: false,
		orderTiebreaker: false,
		serverPaginated: false,
	},
	'signoz/PieChartPanel': {
		requestType: scalar,
		formatTableResultForUI: false,
		bucketedStepInterval: false,
		orderTiebreaker: false,
		serverPaginated: false,
	},
	// Only Table asks the server to transpose its scalar result into UI rows.
	'signoz/TablePanel': {
		requestType: scalar,
		formatTableResultForUI: true,
		bucketedStepInterval: false,
		orderTiebreaker: false,
		serverPaginated: false,
	},
	// Only List reads raw rows, pages them server-side, and needs an order tiebreaker.
	'signoz/ListPanel': {
		requestType: raw,
		formatTableResultForUI: false,
		bucketedStepInterval: false,
		orderTiebreaker: true,
		serverPaginated: true,
	},
};

const ALL_KINDS = Object.keys(EXPECTED_QUERY_TYPES) as PanelKind[];

describe('panel capabilities guard', () => {
	describe('query capabilities', () => {
		it.each(ALL_KINDS)('declares how %s shapes its request', (kind) => {
			expect(getQueryPanelDefinition(kind)?.queryCapabilities).toStrictEqual(
				EXPECTED_QUERY_CAPABILITIES[kind],
			);
		});
	});

	// A dashboard spec written by a newer SigNoz can name a kind this build has no
	// definition for. The registry answers with UNSUPPORTED_PANEL rather than nothing, so
	// every guard below reads it without first proving a definition exists.
	describe('a kind this build cannot render', () => {
		const unknownKind = 'signoz/SomeFutureKindPanel' as PanelKind;

		it('is not reported as supported', () => {
			expect(isPanelKindSupported(unknownKind)).toBe(false);
			expect(isPanelKindSupported('signoz/TimeSeriesPanel')).toBe(true);
		});

		it('still resolves to a definition', () => {
			expect(getPanelDefinition(unknownKind)).toBe(UNSUPPORTED_PANEL);
		});

		it('declares nothing, so it is never offered as authorable', () => {
			expect(getSupportedSignals(unknownKind)).toStrictEqual([]);
			expect(getSupportedQueryTypes(unknownKind)).toStrictEqual([]);
			expect(isSignalSupported(unknownKind, logs)).toBe(false);
			expect(
				isPanelCombinationValid({ kind: unknownKind, mode: QUERY_BUILDER }),
			).toBe(false);
			expect(getHiddenQueryBuilderFields(unknownKind, logs)).toStrictEqual({});
			expect(getPanelDefinition(unknownKind).sections).toStrictEqual([]);
		});

		it('offers no actions', () => {
			expect(getPanelDefinition(unknownKind).actions).toStrictEqual(
				NO_PANEL_ACTIONS,
			);
			expect(NO_PANEL_ACTIONS.view).toBe(false);
			expect(NO_PANEL_ACTIONS.edit).toBe(false);
			expect(NO_PANEL_ACTIONS.drilldown).toBe(false);
		});

		it('carries an inert query shape, so a stray request can do no harm', () => {
			const queryCapabilities =
				requireQueryPanelDefinition(unknownKind).queryCapabilities;
			expect(queryCapabilities.requestType).toBe(time_series);
			expect(queryCapabilities.serverPaginated).toBe(false);
			expect(queryCapabilities.formatTableResultForUI).toBe(false);
		});
	});

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
					mode: PROM,
				}),
			).toBe(true);
			expect(
				isPanelCombinationValid({
					kind: 'signoz/ListPanel',
					mode: QUERY_BUILDER,
					signal: logs,
				}),
			).toBe(true);
		});

		it('rejects an unsupported query type', () => {
			expect(
				isPanelCombinationValid({ kind: 'signoz/ListPanel', mode: PROM }),
			).toBe(false);
			expect(
				isPanelCombinationValid({ kind: 'signoz/TablePanel', mode: PROM }),
			).toBe(false);
		});

		it('rejects an unsupported signal when one is given', () => {
			expect(
				isPanelCombinationValid({
					kind: 'signoz/ListPanel',
					mode: QUERY_BUILDER,
					signal: metrics,
				}),
			).toBe(false);
		});

		it('ignores signal when none is given (ClickHouse/PromQL have no signal)', () => {
			expect(
				isPanelCombinationValid({
					kind: 'signoz/ListPanel',
					mode: QUERY_BUILDER,
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

	describe('the AI query mode', () => {
		const AI_KINDS: PanelKind[] = [
			'signoz/TimeSeriesPanel',
			'signoz/BarChartPanel',
			'signoz/NumberPanel',
			'signoz/HistogramPanel',
			'signoz/PieChartPanel',
			'signoz/TablePanel',
		];

		it.each(AI_KINDS)('is offered by %s, for traces only', (kind) => {
			expect(isQueryModeSupportedByPanelKind(kind, AI_QUERY_MODE)).toBe(true);
			expect(getSupportedSignals(kind, AI_QUERY_MODE)).toStrictEqual([traces]);
		});

		it('is not offered by List, whose raw rows carry no aggregation', () => {
			expect(
				isQueryModeSupportedByPanelKind('signoz/ListPanel', AI_QUERY_MODE),
			).toBe(false);
		});

		it('does not leak into the legacy queryType axis', () => {
			expect(getSupportedQueryTypes('signoz/TimeSeriesPanel')).not.toContain(
				AI_QUERY_MODE,
			);
		});

		it('leaves the kind-wide signal list unchanged', () => {
			// traces is already in the builder mode's list, so the union must not repeat it.
			expect(getSupportedSignals('signoz/TimeSeriesPanel')).toStrictEqual([
				metrics,
				logs,
				traces,
			]);
		});

		it('pairs with traces but not with the other signals of the kind', () => {
			expect(
				isPanelCombinationValid({
					kind: 'signoz/TimeSeriesPanel',
					mode: AI_QUERY_MODE,
					signal: traces,
				}),
			).toBe(true);
			expect(
				isPanelCombinationValid({
					kind: 'signoz/TimeSeriesPanel',
					mode: AI_QUERY_MODE,
					signal: logs,
				}),
			).toBe(false);
		});
	});

	describe('resolveQueryMode', () => {
		it('keeps the AI mode on a kind that offers it', () => {
			expect(
				resolveQueryMode('signoz/TimeSeriesPanel', AI_QUERY_MODE, traces),
			).toBe(AI_QUERY_MODE);
		});

		it('coerces the AI mode on a kind that does not offer it', () => {
			expect(resolveQueryMode('signoz/ListPanel', AI_QUERY_MODE, traces)).toBe(
				QUERY_BUILDER,
			);
		});

		it('coerces the AI mode when the signal moved off traces', () => {
			expect(resolveQueryMode('signoz/TimeSeriesPanel', AI_QUERY_MODE, logs)).toBe(
				QUERY_BUILDER,
			);
		});

		it('leaves a query-language mode alone', () => {
			expect(resolveQueryMode('signoz/TimeSeriesPanel', PROM)).toBe(PROM);
			expect(resolveQueryMode('signoz/ListPanel', PROM)).toBe(QUERY_BUILDER);
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
