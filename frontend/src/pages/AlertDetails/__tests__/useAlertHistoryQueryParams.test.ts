import { renderHook } from '@testing-library/react';
import useUrlQuery from 'hooks/useUrlQuery';

import { useAlertHistoryQueryParams } from '../hooks';

jest.mock('hooks/useUrlQuery', () => ({
	__esModule: true,
	default: jest.fn(),
}));

const THIRTY_MINUTES_MS = 30 * 60 * 1000;

function renderWithSearch(
	search: string,
): ReturnType<typeof useAlertHistoryQueryParams> {
	jest.mocked(useUrlQuery).mockReturnValue(new URLSearchParams(search));
	return renderHook(() => useAlertHistoryQueryParams()).result.current;
}

describe('useAlertHistoryQueryParams', () => {
	it.each(['1y', '90s', 'now-1h', 'custom', 'null', ''])(
		'falls back to the default range for relativeTime=%p',
		(param) => {
			const { startTime, endTime, relativeTime } = renderWithSearch(
				`ruleId=1&relativeTime=${param}`,
			);

			expect(endTime - startTime).toBeCloseTo(THIRTY_MINUTES_MS, -3);
			expect(relativeTime).toBe('30m');
		},
	);

	it('uses a valid relativeTime', () => {
		const { startTime, endTime, relativeTime } = renderWithSearch(
			'ruleId=1&relativeTime=6h',
		);

		expect(endTime - startTime).toBeCloseTo(6 * 60 * 60 * 1000, -3);
		expect(relativeTime).toBe('6h');
	});

	it('prefers startTime and endTime over relativeTime', () => {
		const { startTime, endTime, relativeTime } = renderWithSearch(
			'ruleId=1&relativeTime=1y&startTime=1000&endTime=2000',
		);

		expect({ startTime, endTime, relativeTime }).toStrictEqual({
			startTime: 1000,
			endTime: 2000,
			relativeTime: null,
		});
	});
});
