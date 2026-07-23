import type { DashboardtypesPanelDTO } from 'api/generated/services/sigNoz.schemas';
import {
	AlertThresholdMatchType,
	AlertThresholdOperator,
} from 'container/CreateAlertV2/context/types';
import type { Query } from 'types/api/queryBuilder/queryBuilderData';
import { ReduceOperators } from 'types/common/queryBuilder';

import { deriveAlertPrefill } from '../deriveAlertPrefill';

const RED = '#F1575F';
const ORANGE = '#F5B225';
const GREEN = '#2BB673';

/** Query with one metric builder query per supplied reduceTo (on the V5 aggregation). */
function makeQuery(...reduceTos: (ReduceOperators | undefined)[]): Query {
	return {
		builder: {
			queryData: reduceTos.map((reduceTo) => ({
				aggregations: [{ reduceTo }],
			})),
			queryFormulas: [],
		},
	} as unknown as Query;
}

/** Query carrying reduceTo on the legacy V1 field instead of the aggregation. */
function makeLegacyQuery(reduceTo: ReduceOperators): Query {
	return {
		builder: {
			queryData: [{ reduceTo }],
			queryFormulas: [],
		},
	} as unknown as Query;
}

type ComparisonThreshold = {
	color: string;
	value: number;
	unit?: string;
	operator?: string;
};

type LabelThreshold = { color: string; value: number; unit?: string };

function makeNumberPanel(
	thresholds: ComparisonThreshold[],
): DashboardtypesPanelDTO {
	return {
		spec: { plugin: { kind: 'signoz/NumberPanel', spec: { thresholds } } },
	} as unknown as DashboardtypesPanelDTO;
}

function makeTimeSeriesPanel(
	thresholds: LabelThreshold[],
): DashboardtypesPanelDTO {
	return {
		spec: { plugin: { kind: 'signoz/TimeSeriesPanel', spec: { thresholds } } },
	} as unknown as DashboardtypesPanelDTO;
}

const emptyNumberPanel = makeNumberPanel([]);

describe('deriveAlertPrefill', () => {
	describe('Reduce To → matchType', () => {
		it('maps sum → in total', () => {
			expect(
				deriveAlertPrefill(emptyNumberPanel, makeQuery(ReduceOperators.SUM))
					.matchType,
			).toBe(AlertThresholdMatchType.IN_TOTAL);
		});

		it('maps avg → on average', () => {
			expect(
				deriveAlertPrefill(emptyNumberPanel, makeQuery(ReduceOperators.AVG))
					.matchType,
			).toBe(AlertThresholdMatchType.ON_AVERAGE);
		});

		it.each([ReduceOperators.MAX, ReduceOperators.MIN, ReduceOperators.LAST])(
			'leaves matchType undefined for %s (no occurrence-type equivalent per issue #5291)',
			(reduceTo) => {
				expect(
					deriveAlertPrefill(emptyNumberPanel, makeQuery(reduceTo)).matchType,
				).toBeUndefined();
			},
		);

		it('ignores reduceTo on non-Value panels (only the Value panel drives occurrence)', () => {
			const { matchType } = deriveAlertPrefill(
				makeTimeSeriesPanel([{ color: RED, value: 100 }]),
				makeQuery(ReduceOperators.AVG),
			);
			expect(matchType).toBeUndefined();
		});

		it('reads reduceTo from the legacy V1 field too', () => {
			expect(
				deriveAlertPrefill(emptyNumberPanel, makeLegacyQuery(ReduceOperators.SUM))
					.matchType,
			).toBe(AlertThresholdMatchType.IN_TOTAL);
		});

		it('falls back to the legacy field when the aggregation reduceTo is empty', () => {
			const query = {
				builder: {
					queryData: [
						{ aggregations: [{ reduceTo: '' }], reduceTo: ReduceOperators.AVG },
					],
					queryFormulas: [],
				},
			} as unknown as Query;

			expect(deriveAlertPrefill(emptyNumberPanel, query).matchType).toBe(
				AlertThresholdMatchType.ON_AVERAGE,
			);
		});
	});

	describe('formula panels (multiple builder queries)', () => {
		it('applies the reduce value when every query agrees', () => {
			expect(
				deriveAlertPrefill(
					emptyNumberPanel,
					makeQuery(ReduceOperators.AVG, ReduceOperators.AVG),
				).matchType,
			).toBe(AlertThresholdMatchType.ON_AVERAGE);
		});

		it('keeps the default when queries disagree', () => {
			expect(
				deriveAlertPrefill(
					emptyNumberPanel,
					makeQuery(ReduceOperators.AVG, ReduceOperators.SUM),
				).matchType,
			).toBeUndefined();
		});
	});

	describe('thresholds → operator + target + unit', () => {
		it('picks the highest-danger threshold (red over orange over green)', () => {
			const { threshold, operator } = deriveAlertPrefill(
				makeNumberPanel([
					{ color: GREEN, value: 10, operator: 'below' },
					{ color: RED, value: 90, operator: 'above' },
					{ color: ORANGE, value: 80, operator: 'above' },
				]),
				makeQuery(),
			);

			expect(threshold?.thresholdValue).toBe(90);
			expect(threshold?.color).toBe(RED);
			expect(operator).toBe(AlertThresholdOperator.IS_ABOVE);
		});

		it('sorts unknown/custom colors last', () => {
			const { threshold } = deriveAlertPrefill(
				makeNumberPanel([
					{ color: '#123456', value: 5, operator: 'above' },
					{ color: ORANGE, value: 80, operator: 'above' },
				]),
				makeQuery(),
			);

			expect(threshold?.thresholdValue).toBe(80);
		});

		it.each([
			['above', AlertThresholdOperator.IS_ABOVE],
			['above_or_equal', AlertThresholdOperator.IS_ABOVE],
			['below', AlertThresholdOperator.IS_BELOW],
			['below_or_equal', AlertThresholdOperator.IS_BELOW],
			['equal', AlertThresholdOperator.IS_EQUAL_TO],
			['not_equal', AlertThresholdOperator.IS_NOT_EQUAL_TO],
		])('maps panel operator %s → %s', (op, expected) => {
			const { operator } = deriveAlertPrefill(
				makeNumberPanel([{ color: RED, value: 1, operator: op }]),
				makeQuery(),
			);
			expect(operator).toBe(expected);
		});

		it('builds an alert-shaped critical threshold', () => {
			const { threshold } = deriveAlertPrefill(
				makeNumberPanel([{ color: RED, value: 90, unit: 'ms', operator: 'above' }]),
				makeQuery(),
			);

			expect(threshold).toMatchObject({
				label: 'critical',
				thresholdValue: 90,
				recoveryThresholdValue: null,
				unit: 'ms',
				channels: [],
				color: RED,
			});
			expect(typeof threshold?.id).toBe('string');
		});

		it('falls back to the panel unit when the threshold has none', () => {
			const { threshold } = deriveAlertPrefill(
				makeNumberPanel([{ color: RED, value: 90, operator: 'above' }]),
				makeQuery(),
				'bytes',
			);
			expect(threshold?.unit).toBe('bytes');
		});
	});

	describe('label-variant thresholds (TimeSeries/Bar)', () => {
		it('seeds the target but leaves operator/matchType default (no operator, no reduceTo)', () => {
			const { threshold, operator, matchType } = deriveAlertPrefill(
				makeTimeSeriesPanel([{ color: RED, value: 100 }]),
				makeQuery(),
			);

			expect(threshold?.thresholdValue).toBe(100);
			expect(operator).toBeUndefined();
			expect(matchType).toBeUndefined();
		});
	});

	it('returns an empty prefill for a panel with neither reduceTo nor thresholds', () => {
		expect(deriveAlertPrefill(emptyNumberPanel, makeQuery())).toStrictEqual({});
	});
});
