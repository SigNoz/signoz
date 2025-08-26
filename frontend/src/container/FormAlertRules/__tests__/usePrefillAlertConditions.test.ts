import { renderHook } from '@testing-library/react';

import { usePrefillAlertConditions } from '../usePrefillAlertConditions';

const TEST_MAPPINGS = {
	op: {
		'>': '1',
		'<': '2',
		'=': '3',
	},
	matchType: {
		avg: '3',
		sum: '4',
	},
};

jest.mock('react-router-dom-v5-compat', () => {
	const mockThreshold1 = {
		index: '0d11f426-a02e-48da-867c-b79c6ef1ff06',
		isEditEnabled: false,
		keyIndex: 1,
		selectedGraph: 'graph',
		thresholdColor: 'Orange',
		thresholdFormat: 'Text',
		thresholdLabel: 'Caution',
		thresholdOperator: '>',
		thresholdTableOptions: 'A',
		thresholdUnit: 'rpm',
		thresholdValue: 800,
	};
	const mockThreshold2 = {
		index: 'edbe8ef2-fa54-4cb9-b343-7afe883bb714',
		isEditEnabled: false,
		keyIndex: 0,
		selectedGraph: 'graph',
		thresholdColor: 'Red',
		thresholdFormat: 'Text',
		thresholdLabel: 'Danger',
		thresholdOperator: '<',
		thresholdTableOptions: 'A',
		thresholdUnit: 'rpm',
		thresholdValue: 900,
	};
	return {
		...jest.requireActual('react-router-dom-v5-compat'),
		useLocation: jest.fn().mockReturnValue({
			state: {
				thresholds: [mockThreshold1, mockThreshold2],
			},
		}),
	};
});

const mockStagedQuery = {
	builder: {
		queryData: [
			{
				reduceTo: 'avg',
			},
		],
	},
};

describe('usePrefillAlertConditions', () => {
	it('returns the correct matchType for a single query', () => {
		const { result } = renderHook(() =>
			usePrefillAlertConditions(mockStagedQuery as any),
		);
		expect(result.current.matchType).toBe(TEST_MAPPINGS.matchType.avg);
	});

	it('returns null matchType for a single query with unsupported time aggregation', () => {
		const { result } = renderHook(() =>
			usePrefillAlertConditions({
				builder: { queryData: [{ reduceTo: 'p90' }] },
			} as any),
		);
		expect(result.current.matchType).toBe(null);
	});

	it('returns the correct matchType for multiple queries with same time aggregation', () => {
		const { result } = renderHook(() =>
			usePrefillAlertConditions({
				builder: {
					queryData: [
						{
							reduceTo: 'avg',
						},
						{
							reduceTo: 'avg',
						},
					],
				},
			} as any),
		);
		expect(result.current.matchType).toBe(TEST_MAPPINGS.matchType.avg);
	});

	it('returns null matchType for multiple queries with different time aggregation', () => {
		const { result } = renderHook(() =>
			usePrefillAlertConditions({
				builder: {
					queryData: [
						{
							reduceTo: 'avg',
						},
						{
							reduceTo: 'sum',
						},
					],
				},
			} as any),
		);
		expect(result.current.matchType).toBe(null);
	});

	it('returns the correct op, target, targetUnit from the higher priority threshold for multiple thresholds', () => {
		const { result } = renderHook(() =>
			usePrefillAlertConditions(mockStagedQuery as any),
		);
		expect(result.current.op).toBe(TEST_MAPPINGS.op['<']);
		expect(result.current.target).toBe(900);
		expect(result.current.targetUnit).toBe('rpm');
	});
});
