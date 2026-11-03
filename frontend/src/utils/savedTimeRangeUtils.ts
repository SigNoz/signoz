import getLocalStorageKey from 'api/browser/localstorage/get';
import setLocalStorageKey from 'api/browser/localstorage/set';
import { LOCALSTORAGE } from 'constants/localStorage';

export interface SavedTimeRange {
	name: string;
	from: string;
	to: string;
}

export const MAX_SAVED_TIME_RANGES = 5;
export const MAX_SAVED_TIME_RANGE_NAME_LENGTH = 50;

const isSameRange = (
	a: Pick<SavedTimeRange, 'from' | 'to'>,
	b: Pick<SavedTimeRange, 'from' | 'to'>,
): boolean => a.from === b.from && a.to === b.to;

const isSavedTimeRange = (item: unknown): item is SavedTimeRange => {
	if (!item || typeof item !== 'object') {
		return false;
	}
	const { name, from, to } = item as Record<string, unknown>;
	return (
		typeof name === 'string' &&
		name.trim() !== '' &&
		typeof from === 'string' &&
		typeof to === 'string'
	);
};

const normalizeName = (name: string): string =>
	name.trim().slice(0, MAX_SAVED_TIME_RANGE_NAME_LENGTH);

const persist = (ranges: SavedTimeRange[]): SavedTimeRange[] => {
	setLocalStorageKey(
		LOCALSTORAGE.SAVED_CUSTOM_TIME_RANGES,
		JSON.stringify(ranges),
	);
	return ranges;
};

export const getSavedTimeRanges = (): SavedTimeRange[] => {
	const stored = getLocalStorageKey(LOCALSTORAGE.SAVED_CUSTOM_TIME_RANGES);
	if (!stored) {
		return [];
	}

	try {
		const parsed: unknown = JSON.parse(stored);
		return Array.isArray(parsed) ? parsed.filter(isSavedTimeRange) : [];
	} catch {
		return [];
	}
};

export const saveTimeRange = (range: SavedTimeRange): SavedTimeRange[] => {
	const existing = getSavedTimeRanges();
	const name = normalizeName(range.name);
	if (!name) {
		return existing;
	}

	const others = existing.filter((saved) => !isSameRange(saved, range));
	if (others.length >= MAX_SAVED_TIME_RANGES) {
		return existing;
	}

	return persist([{ name, from: range.from, to: range.to }, ...others]);
};

export const renameSavedTimeRange = (
	range: Pick<SavedTimeRange, 'from' | 'to'>,
	newName: string,
): SavedTimeRange[] => {
	const existing = getSavedTimeRanges();
	const name = normalizeName(newName);
	if (!name) {
		return existing;
	}

	return persist(
		existing.map((saved) =>
			isSameRange(saved, range) ? { ...saved, name } : saved,
		),
	);
};

export const removeSavedTimeRange = (
	range: Pick<SavedTimeRange, 'from' | 'to'>,
): SavedTimeRange[] =>
	persist(getSavedTimeRanges().filter((saved) => !isSameRange(saved, range)));

export const isTimeRangeSaved = (
	ranges: SavedTimeRange[],
	range: Pick<SavedTimeRange, 'from' | 'to'>,
): boolean => ranges.some((saved) => isSameRange(saved, range));
