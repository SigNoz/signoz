/* eslint-disable @typescript-eslint/explicit-function-return-type */
import { IBuilderQuery } from 'types/api/queryBuilder/queryBuilderData';

import '@testing-library/jest-dom';

import {
	clearPreviousQuery,
	getPreviousQueryFromKey,
	getQueryKey,
	PREVIOUS_QUERY_KEY,
	removeKeyFromPreviousQuery,
	saveAsPreviousQuery,
} from '../QueryV2/previousQuery.utils';

describe('previousQuery.utils', () => {
	const sampleQuery: IBuilderQuery = {
		queryName: 'A',
		dataSource: 'metrics' as any,
		aggregateOperator: '',
		aggregations: [],
		timeAggregation: '',
		spaceAggregation: '',
		temporality: '',
		functions: [],
		filter: { expression: 'service = "test"' },
		filters: { items: [], op: 'AND' },
		groupBy: [],
		expression: '',
		disabled: false,
		having: [],
		limit: 10,
		stepInterval: null,
		orderBy: [],
		legend: 'A',
		source: '',
	};

	beforeEach(() => {
		try {
			sessionStorage.clear();
		} catch {
			// jsdom environment
		}
	});

	afterEach(() => {
		jest.restoreAllMocks();
	});

	it('getQueryKey normalizes non-meter signal to empty string', () => {
		const k1 = getQueryKey({
			queryName: 'A',
			dataSource: 'metrics',
			signalSource: 'metrics', // should normalize to ''
			panelType: 'TABLE',
		});
		const k2 = getQueryKey({
			queryName: 'A',
			dataSource: 'metrics',
			signalSource: '',
			panelType: 'TABLE',
		});
		expect(k1).toBe('A:metrics::TABLE');
		expect(k2).toBe('A:metrics::TABLE');

		const km = getQueryKey({
			queryName: 'A',
			dataSource: 'metrics',
			signalSource: 'meter',
			panelType: 'TABLE',
		});
		expect(km).toBe('A:metrics:meter:TABLE');
	});

	it('returns null for missing key when store is empty', () => {
		expect(getPreviousQueryFromKey('missing:key')).toBeNull();
	});

	it('saveAsPreviousQuery writes and getPreviousQueryFromKey reads the same object', () => {
		const key = getQueryKey({
			queryName: 'A',
			dataSource: 'metrics',
			signalSource: '',
			panelType: 'TABLE',
		});
		saveAsPreviousQuery(key, sampleQuery);

		const fromStore = getPreviousQueryFromKey(key);
		expect(fromStore).toEqual(sampleQuery);
	});

	it('saveAsPreviousQuery merges multiple entries and removeKeyFromPreviousQuery deletes one', () => {
		const k1 = getQueryKey({
			queryName: 'A',
			dataSource: 'metrics',
			signalSource: '',
			panelType: 'TABLE',
		});
		const k2 = getQueryKey({
			queryName: 'B',
			dataSource: 'metrics',
			signalSource: 'meter',
			panelType: 'TABLE',
		});

		saveAsPreviousQuery(k1, sampleQuery);
		saveAsPreviousQuery(k2, {
			...sampleQuery,
			queryName: 'B',
			source: 'meter' as any,
		});

		expect(getPreviousQueryFromKey(k1)?.queryName).toBe('A');
		expect(getPreviousQueryFromKey(k2)?.queryName).toBe('B');

		removeKeyFromPreviousQuery(k1);
		expect(getPreviousQueryFromKey(k1)).toBeNull();
		expect(getPreviousQueryFromKey(k2)?.queryName).toBe('B');
	});

	it('clearPreviousQuery removes the store key', () => {
		const key = getQueryKey({
			queryName: 'A',
			dataSource: 'metrics',
			signalSource: '',
			panelType: 'TABLE',
		});
		saveAsPreviousQuery(key, sampleQuery);

		expect(sessionStorage.getItem(PREVIOUS_QUERY_KEY)).not.toBeNull();
		clearPreviousQuery();
		expect(sessionStorage.getItem(PREVIOUS_QUERY_KEY)).toBeNull();
	});

	it('handles malformed JSON in store gracefully', () => {
		sessionStorage.setItem(PREVIOUS_QUERY_KEY, 'not valid json');

		// Should not throw and behave as empty store
		expect(getPreviousQueryFromKey('any:key')).toBeNull();

		// After a save, it should overwrite the bad value with valid JSON
		const validKey = getQueryKey({
			queryName: 'A',
			dataSource: 'metrics',
			signalSource: '',
			panelType: 'TABLE',
		});
		expect(() => saveAsPreviousQuery(validKey, sampleQuery)).not.toThrow();
		const parsed = JSON.parse(sessionStorage.getItem(PREVIOUS_QUERY_KEY) || '{}');
		expect(parsed[validKey]).toBeTruthy();
	});

	it('write errors (e.g., quota) are caught and do not throw', () => {
		const spy = jest
			.spyOn(window.sessionStorage.__proto__, 'setItem')
			.mockImplementation(() => {
				throw new Error('quota exceeded');
			});

		const key = getQueryKey({
			queryName: 'A',
			dataSource: 'metrics',
			signalSource: '',
			panelType: 'TABLE',
		});

		expect(() => saveAsPreviousQuery(key, sampleQuery)).not.toThrow();

		// Since write failed, reading should still behave as empty
		spy.mockRestore();
		expect(getPreviousQueryFromKey(key)).toBeNull();
	});
});
