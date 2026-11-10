import type { Querybuildertypesv5QueryRangeRequestDTO } from 'api/generated/services/sigNoz.schemas';

import { getPanelTimeRange } from '../getPanelTimeRange';

// Fallback path reads the redux global-time selection; stub both so the no-payload branch
// is deterministic.
jest.mock('store', () => ({
	__esModule: true,
	default: { getState: (): unknown => ({ globalTime: { selectedTime: '5m' } }) },
}));
jest.mock('lib/getStartEndRangeTime', () => ({
	__esModule: true,
	default: (): { start: string; end: string } => ({
		start: '1700',
		end: '1800',
	}),
}));

const request = (
	start?: number,
	end?: number,
): Querybuildertypesv5QueryRangeRequestDTO =>
	({ start, end }) as Querybuildertypesv5QueryRangeRequestDTO;

describe('getPanelTimeRange', () => {
	it('converts the request start/end from ms to seconds', () => {
		expect(getPanelTimeRange(request(5_000, 9_000))).toStrictEqual({
			startTime: 5,
			endTime: 9,
		});
	});

	it('falls back to the global-time window when there is no request', () => {
		expect(getPanelTimeRange(undefined)).toStrictEqual({
			startTime: 1700,
			endTime: 1800,
		});
	});

	it('falls back when the request is missing an endpoint', () => {
		expect(getPanelTimeRange(request(5_000, undefined))).toStrictEqual({
			startTime: 1700,
			endTime: 1800,
		});
	});
});
