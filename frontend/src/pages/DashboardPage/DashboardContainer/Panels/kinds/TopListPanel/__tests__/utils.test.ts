import type { TopListRow } from '../types';
import {
	formatShare,
	getRowHeight,
	getTooltipContent,
	truncateMiddle,
} from '../utils';

// Each case: rows that fit at a density, given a 1px gap and 12px of list padding.
describe('getRowHeight', () => {
	it.each([
		{ count: 10, height: 10 * 32 + 9 + 12, expected: 32 },
		{ count: 10, height: 10 * 32 + 9 + 11, expected: 28 },
		{ count: 10, height: 10 * 28 + 9 + 12, expected: 28 },
		{ count: 10, height: 10 * 28 + 9 + 11, expected: 24 },
		{ count: 200, height: 400, expected: 24 },
	])(
		'uses $expected px rows for $count rows in $height px',
		({ count, height, expected }) => {
			expect(getRowHeight(count, height)).toBe(expected);
		},
	);

	it('falls back to the default height before the panel is measured', () => {
		expect(getRowHeight(10, 0)).toBe(28);
	});
});

describe('formatShare', () => {
	it.each([
		{ share: 0.5, expected: '50%' },
		{ share: 0.12345, expected: '12%' },
		{ share: 0.0995, expected: '10%' },
		{ share: 0.0456, expected: '4.6%' },
		{ share: 0.0004, expected: '<0.1%' },
		{ share: 0, expected: '0%' },
		{ share: 1, expected: '100%' },
		{ share: null, expected: '—' },
	])('formats $share as $expected', ({ share, expected }) => {
		expect(formatShare(share)).toBe(expected);
	});
});

describe('truncateMiddle', () => {
	const byLength = (text: string): number => text.length;

	it('keeps a label that fits', () => {
		expect(truncateMiddle('checkout', 8, byLength)).toBe('checkout');
	});

	it('keeps both ends of a label that does not', () => {
		expect(truncateMiddle('recommendationservice', 9, byLength)).toBe(
			'reco…vice',
		);
	});

	it('leaves only the ellipsis when nothing else fits', () => {
		expect(truncateMiddle('checkout', 1, byLength)).toBe('…');
	});
});

describe('getTooltipContent', () => {
	const row = (overrides: Partial<TopListRow> = {}): TopListRow => ({
		key: 'A-0',
		label: 'checkout',
		isEmptyLabel: false,
		value: 1500,
		rawValue: 1500,
		ratio: 1,
		share: 0.25,
		queryName: 'A',
		labels: { 'service.name': 'checkout' },
		...overrides,
	});
	const options = {
		valueName: 'p99(duration_nano)',
		unit: 'ms',
		showShare: true,
	};

	it('names the value and its share', () => {
		expect(getTooltipContent(row(), options).rows).toStrictEqual([
			{ key: 'value', label: 'p99(duration_nano)', value: '1.5 s' },
			{ key: 'share', label: 'Share of listed total', value: '25%' },
		]);
	});

	it('leaves the share out when the panel hides it or the row has none', () => {
		expect(
			getTooltipContent(row(), { ...options, showShare: false }).rows,
		).toHaveLength(1);
		expect(getTooltipContent(row({ share: null }), options).rows).toHaveLength(1);
	});

	it('lists the group values only when the label is not one already', () => {
		expect(getTooltipContent(row(), options).mutedRows).toStrictEqual([]);
		expect(
			getTooltipContent(
				row({
					label: 'checkout · eu',
					labels: { 'service.name': 'checkout', region: 'eu' },
				}),
				options,
			).mutedRows,
		).toStrictEqual([
			{ key: 'service.name', label: 'service.name', value: 'checkout' },
			{ key: 'region', label: 'region', value: 'eu' },
		]);
	});
});
