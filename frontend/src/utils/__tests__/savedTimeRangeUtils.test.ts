import { LOCALSTORAGE } from 'constants/localStorage';
import {
	getSavedTimeRanges,
	isTimeRangeSaved,
	MAX_SAVED_TIME_RANGE_NAME_LENGTH,
	MAX_SAVED_TIME_RANGES,
	removeSavedTimeRange,
	renameSavedTimeRange,
	saveTimeRange,
} from 'utils/savedTimeRangeUtils';

const rangeA = {
	name: 'Test 1',
	from: '2026-10-01T10:00:00.000Z',
	to: '2026-10-01T11:00:00.000Z',
};
const rangeB = {
	name: 'Test 2',
	from: '2026-10-02T10:00:00.000Z',
	to: '2026-10-02T11:00:00.000Z',
};

describe('savedTimeRangeUtils', () => {
	beforeEach(() => {
		localStorage.clear();
	});

	it('returns an empty list when nothing is stored or data is corrupted', () => {
		expect(getSavedTimeRanges()).toStrictEqual([]);

		localStorage.setItem(LOCALSTORAGE.SAVED_CUSTOM_TIME_RANGES, '{not json');
		expect(getSavedTimeRanges()).toStrictEqual([]);

		localStorage.setItem(
			LOCALSTORAGE.SAVED_CUSTOM_TIME_RANGES,
			JSON.stringify([rangeA, { name: '', from: 'x', to: 'y' }, { foo: 1 }]),
		);
		expect(getSavedTimeRanges()).toStrictEqual([rangeA]);
	});

	it('saves ranges newest first and persists them', () => {
		saveTimeRange(rangeA);
		saveTimeRange(rangeB);

		expect(getSavedTimeRanges()).toStrictEqual([rangeB, rangeA]);
	});

	it('replaces the name when saving an already saved range', () => {
		saveTimeRange(rangeA);
		saveTimeRange(rangeB);
		saveTimeRange({ ...rangeA, name: 'Successful test' });

		expect(getSavedTimeRanges()).toStrictEqual([
			{ ...rangeA, name: 'Successful test' },
			rangeB,
		]);
	});

	it('trims names, rejects empty ones and caps the length', () => {
		expect(saveTimeRange({ ...rangeA, name: '   ' })).toStrictEqual([]);

		const [saved] = saveTimeRange({
			...rangeA,
			name: `  ${'a'.repeat(MAX_SAVED_TIME_RANGE_NAME_LENGTH + 10)}  `,
		});
		expect(saved.name).toBe('a'.repeat(MAX_SAVED_TIME_RANGE_NAME_LENGTH));
	});

	it(`does not save more than ${MAX_SAVED_TIME_RANGES} ranges`, () => {
		for (let i = 0; i <= MAX_SAVED_TIME_RANGES; i += 1) {
			saveTimeRange({
				name: `Range ${i}`,
				from: new Date(i * 1000).toISOString(),
				to: new Date(i * 1000 + 500).toISOString(),
			});
		}

		const saved = getSavedTimeRanges();
		expect(saved).toHaveLength(MAX_SAVED_TIME_RANGES);
		expect(saved[0].name).toBe(`Range ${MAX_SAVED_TIME_RANGES - 1}`);

		saveTimeRange({ ...saved[2], name: 'Renamed at limit' });
		expect(getSavedTimeRanges()[0].name).toBe('Renamed at limit');
	});

	it('renames and removes a saved range', () => {
		saveTimeRange(rangeA);
		saveTimeRange(rangeB);

		renameSavedTimeRange(rangeA, 'Renamed');
		expect(getSavedTimeRanges()).toStrictEqual([
			rangeB,
			{ ...rangeA, name: 'Renamed' },
		]);

		renameSavedTimeRange(rangeA, ' ');
		expect(getSavedTimeRanges()[1].name).toBe('Renamed');

		removeSavedTimeRange(rangeB);
		expect(getSavedTimeRanges()).toStrictEqual([{ ...rangeA, name: 'Renamed' }]);
	});

	it('detects whether a range is saved', () => {
		const saved = saveTimeRange(rangeA);

		expect(isTimeRangeSaved(saved, rangeA)).toBe(true);
		expect(isTimeRangeSaved(saved, rangeB)).toBe(false);
	});
});
