import { LOCALSTORAGE } from 'constants/localStorage';

import type { GraphVisibilityState } from '../../types';
import {
	getStoredSeriesVisibility,
	updateSeriesVisibilityToLocalStorage,
} from '../legendVisibilityUtils';

describe('legendVisibilityUtils', () => {
	const storageKey = LOCALSTORAGE.GRAPH_VISIBILITY_STATES;

	beforeEach(() => {
		localStorage.clear();
		jest.spyOn(window.localStorage.__proto__, 'getItem');
		jest.spyOn(window.localStorage.__proto__, 'setItem');
	});

	afterEach(() => {
		jest.restoreAllMocks();
		localStorage.clear();
	});

	describe('getStoredSeriesVisibility', () => {
		it('returns null when there is no stored visibility state', () => {
			const result = getStoredSeriesVisibility('widget-1');

			expect(result).toBeNull();
			expect(localStorage.getItem).toHaveBeenCalledWith(storageKey);
		});

		it('returns null when widget has no stored dataIndex', () => {
			const stored: GraphVisibilityState[] = [
				{
					name: 'widget-1',
					dataIndex: [],
				},
			];

			localStorage.setItem(storageKey, JSON.stringify(stored));

			const result = getStoredSeriesVisibility('widget-1');

			expect(result).toBeNull();
		});

		it('returns a Map of label to visibility when widget state exists', () => {
			const stored: GraphVisibilityState[] = [
				{
					name: 'widget-1',
					dataIndex: [
						{ label: 'CPU', show: true },
						{ label: 'Memory', show: false },
					],
				},
				{
					name: 'widget-2',
					dataIndex: [{ label: 'Errors', show: true }],
				},
			];

			localStorage.setItem(storageKey, JSON.stringify(stored));

			const result = getStoredSeriesVisibility('widget-1');

			expect(result).not.toBeNull();
			expect(result instanceof Map).toBe(true);
			expect(result?.get('CPU')).toBe(true);
			expect(result?.get('Memory')).toBe(false);
			expect(result?.get('Errors')).toBeUndefined();
		});

		it('returns null on malformed JSON in localStorage', () => {
			localStorage.setItem(storageKey, '{invalid-json');

			const result = getStoredSeriesVisibility('widget-1');

			expect(result).toBeNull();
		});

		it('returns null when widget id is not found', () => {
			const stored: GraphVisibilityState[] = [
				{
					name: 'another-widget',
					dataIndex: [{ label: 'CPU', show: true }],
				},
			];

			localStorage.setItem(storageKey, JSON.stringify(stored));

			const result = getStoredSeriesVisibility('widget-1');

			expect(result).toBeNull();
		});
	});

	describe('updateSeriesVisibilityToLocalStorage', () => {
		it('creates new visibility state when none exists', () => {
			const seriesVisibility = [
				{ label: 'CPU', show: true },
				{ label: 'Memory', show: false },
			];

			updateSeriesVisibilityToLocalStorage('widget-1', seriesVisibility);

			const stored = getStoredSeriesVisibility('widget-1');

			expect(stored).not.toBeNull();
			expect(stored!.get('CPU')).toBe(true);
			expect(stored!.get('Memory')).toBe(false);
		});

		it('adds a new widget entry when other widgets already exist', () => {
			const existing: GraphVisibilityState[] = [
				{
					name: 'widget-existing',
					dataIndex: [{ label: 'Errors', show: true }],
				},
			];
			localStorage.setItem(storageKey, JSON.stringify(existing));

			const newVisibility = [{ label: 'CPU', show: false }];

			updateSeriesVisibilityToLocalStorage('widget-new', newVisibility);

			const stored = getStoredSeriesVisibility('widget-new');

			expect(stored).not.toBeNull();
			expect(stored!.get('CPU')).toBe(false);
		});

		it('updates existing widget visibility when entry already exists', () => {
			const initialVisibility: GraphVisibilityState[] = [
				{
					name: 'widget-1',
					dataIndex: [
						{ label: 'CPU', show: true },
						{ label: 'Memory', show: true },
					],
				},
			];

			localStorage.setItem(storageKey, JSON.stringify(initialVisibility));

			const updatedVisibility = [
				{ label: 'CPU', show: false },
				{ label: 'Memory', show: true },
			];

			updateSeriesVisibilityToLocalStorage('widget-1', updatedVisibility);

			const stored = getStoredSeriesVisibility('widget-1');

			expect(stored).not.toBeNull();
			expect(stored!.get('CPU')).toBe(false);
			expect(stored!.get('Memory')).toBe(true);
		});

		it('silently handles malformed existing JSON without throwing', () => {
			localStorage.setItem(storageKey, '{invalid-json');

			expect(() =>
				updateSeriesVisibilityToLocalStorage('widget-1', [
					{ label: 'CPU', show: true },
				]),
			).not.toThrow();
		});
	});
});
