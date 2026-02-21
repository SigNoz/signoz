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

		it('returns visibility array by index when widget state exists', () => {
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
			expect(result).toEqual([
				{ label: 'CPU', show: true },
				{ label: 'Memory', show: false },
			]);
		});

		it('returns visibility by index including duplicate labels', () => {
			const stored: GraphVisibilityState[] = [
				{
					name: 'widget-1',
					dataIndex: [
						{ label: 'CPU', show: true },
						{ label: 'CPU', show: false },
						{ label: 'Memory', show: false },
					],
				},
			];

			localStorage.setItem(storageKey, JSON.stringify(stored));

			const result = getStoredSeriesVisibility('widget-1');

			expect(result).not.toBeNull();
			expect(result).toEqual([
				{ label: 'CPU', show: true },
				{ label: 'CPU', show: false },
				{ label: 'Memory', show: false },
			]);
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
			expect(stored).toEqual([
				{ label: 'CPU', show: true },
				{ label: 'Memory', show: false },
			]);
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
			expect(stored).toEqual([{ label: 'CPU', show: false }]);
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
			expect(stored).toEqual([
				{ label: 'CPU', show: false },
				{ label: 'Memory', show: true },
			]);
		});

		it('silently handles malformed existing JSON without throwing', () => {
			localStorage.setItem(storageKey, '{invalid-json');

			expect(() =>
				updateSeriesVisibilityToLocalStorage('widget-1', [
					{ label: 'CPU', show: true },
				]),
			).not.toThrow();
		});

		it('when existing JSON is malformed, overwrites with valid data for the widget', () => {
			localStorage.setItem(storageKey, '{invalid-json');

			updateSeriesVisibilityToLocalStorage('widget-1', [
				{ label: 'x-axis', show: true },
				{ label: 'CPU', show: false },
			]);

			const stored = getStoredSeriesVisibility('widget-1');
			expect(stored).not.toBeNull();
			expect(stored).toEqual([
				{ label: 'x-axis', show: true },
				{ label: 'CPU', show: false },
			]);
			const expected = [
				{
					name: 'widget-1',
					dataIndex: [
						{ label: 'x-axis', show: true },
						{ label: 'CPU', show: false },
					],
				},
			];
			expect(localStorage.setItem).toHaveBeenCalledWith(
				storageKey,
				JSON.stringify(expected),
			);
		});

		it('preserves other widgets when updating one widget', () => {
			const existing: GraphVisibilityState[] = [
				{ name: 'widget-a', dataIndex: [{ label: 'A', show: true }] },
				{ name: 'widget-b', dataIndex: [{ label: 'B', show: false }] },
			];
			localStorage.setItem(storageKey, JSON.stringify(existing));

			updateSeriesVisibilityToLocalStorage('widget-b', [
				{ label: 'B', show: true },
			]);

			expect(getStoredSeriesVisibility('widget-a')).toEqual([
				{ label: 'A', show: true },
			]);
			expect(getStoredSeriesVisibility('widget-b')).toEqual([
				{ label: 'B', show: true },
			]);
		});

		it('calls setItem with storage key and stringified visibility states', () => {
			updateSeriesVisibilityToLocalStorage('widget-1', [
				{ label: 'CPU', show: true },
			]);

			expect(localStorage.setItem).toHaveBeenCalledTimes(1);
			expect(localStorage.setItem).toHaveBeenCalledWith(
				storageKey,
				expect.any(String),
			);
			const [_, value] = (localStorage.setItem as jest.Mock).mock.calls[0];
			expect((): void => JSON.parse(value)).not.toThrow();
			expect(JSON.parse(value)).toEqual([
				{ name: 'widget-1', dataIndex: [{ label: 'CPU', show: true }] },
			]);
		});

		it('stores empty dataIndex when seriesVisibility is empty', () => {
			updateSeriesVisibilityToLocalStorage('widget-1', []);

			const raw = localStorage.getItem(storageKey);
			expect(raw).not.toBeNull();
			const parsed = JSON.parse(raw ?? '[]');
			expect(parsed).toEqual([{ name: 'widget-1', dataIndex: [] }]);
			expect(getStoredSeriesVisibility('widget-1')).toBeNull();
		});
	});
});
