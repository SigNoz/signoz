import { getWaterfallV4 } from 'api/generated/services/tracedetail';

import getTraceV4 from './getTraceV4';

jest.mock('api/generated/services/tracedetail', () => ({
	getWaterfallV4: jest.fn(),
}));

const mockGetWaterfallV4 = jest.mocked(getWaterfallV4);
const props = {
	traceId: 'trace-id',
	selectedSpanId: '',
	uncollapsedSpans: [],
	isSelectedSpanIDUnCollapsed: false,
};

const mockResponse = (
	spans: { time_unix: number; time_unix_nano?: string }[],
	preciseBounds: {
		startTimestampUnixNano?: string;
		endTimestampUnixNano?: string;
	} = {},
): void => {
	mockGetWaterfallV4.mockResolvedValue({
		data: {
			spans,
			startTimestampMillis: 1714546800000,
			endTimestampMillis: 1714546800010,
			...preciseBounds,
		},
	} as Awaited<ReturnType<typeof getWaterfallV4>>);
};

describe('getTraceV4 timestamps', () => {
	it('keeps sub-millisecond span starts from the nanosecond timestamp', async () => {
		mockResponse(
			[
				{ time_unix: 1714546800000, time_unix_nano: '1714546800000123456' },
				{ time_unix: 1714546800000, time_unix_nano: '1714546800000843456' },
			],
			{
				startTimestampUnixNano: '1714546800000123456',
				endTimestampUnixNano: '1714546800010123456',
			},
		);

		const response = await getTraceV4(props);

		expect(response.payload?.spans[0].timestamp).toBeCloseTo(
			1714546800000 + 0.123456,
			3,
		);
		expect(response.payload?.spans[1].timestamp).toBeCloseTo(
			1714546800000 + 0.843456,
			3,
		);
		expect(response.payload?.startTimestampMillis).toBe(
			response.payload?.spans[0].timestamp,
		);
		expect(
			(response.payload?.spans[1].timestamp ?? 0) -
				(response.payload?.spans[0].timestamp ?? 0),
		).toBeCloseTo(0.72, 3);
	});

	it('uses the legacy millisecond timestamp when the precise field is absent', async () => {
		mockResponse([{ time_unix: 1714546800000 }]);

		const response = await getTraceV4(props);

		expect(response.payload?.spans[0].timestamp).toBe(1714546800000);
		expect(response.payload?.startTimestampMillis).toBe(1714546800000);
		expect(response.payload?.endTimestampMillis).toBe(1714546800010);
	});

	it('keeps precise trace bounds when no spans are returned', async () => {
		mockResponse([], {
			startTimestampUnixNano: '1714546800000123456',
			endTimestampUnixNano: '1714546800010123456',
		});

		const response = await getTraceV4(props);

		expect(response.payload?.spans).toStrictEqual([]);
		expect(response.payload?.startTimestampMillis).toBeCloseTo(
			1714546800000 + 0.123456,
			3,
		);
		expect(response.payload?.endTimestampMillis).toBeCloseTo(
			1714546800010 + 0.123456,
			3,
		);
	});

	it('does not rebase precise bounds onto the first returned span', async () => {
		mockResponse([{ time_unix: 20, time_unix_nano: '20000000' }], {
			startTimestampUnixNano: '1000000',
			endTimestampUnixNano: '30000000',
		});

		const response = await getTraceV4(props);

		expect(response.payload?.startTimestampMillis).toBe(1);
		expect(response.payload?.endTimestampMillis).toBe(30);
	});
});
