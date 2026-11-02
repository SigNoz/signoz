import { FixtureRow } from '../fixtures/types';

export const formatBox = ([[w, s], [e, n]]: [
	[number, number],
	[number, number],
]): string => `${w}, ${s} → ${e}, ${n}`;

export const preview = (values: string[]): string =>
	values.slice(0, 5).join(', ') + (values.length > 5 ? ', …' : '');

export const shownRaw = (row: FixtureRow): string =>
	row.raw === null ? '(null)' : row.raw.trim() === '' ? '(empty)' : row.raw;
