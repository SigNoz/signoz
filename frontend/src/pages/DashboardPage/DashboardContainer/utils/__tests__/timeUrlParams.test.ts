import { NANO_SECOND_MULTIPLIER } from 'store/globalTime';

import { timeParamsFromGlobalTime } from '../timeUrlParams';

describe('timeParamsFromGlobalTime', () => {
	it('emits relativeTime for a relative selection', () => {
		const params = timeParamsFromGlobalTime({
			selectedTime: '6h',
			minTime: 0,
			maxTime: 0,
		});

		expect(params.get('relativeTime')).toBe('6h');
		// Mutually exclusive: no absolute pair alongside a relative range.
		expect(params.has('startTime')).toBe(false);
		expect(params.has('endTime')).toBe(false);
	});

	it('emits an absolute ms pair for a custom selection (converting from ns)', () => {
		const params = timeParamsFromGlobalTime({
			selectedTime: 'custom',
			minTime: 1000 * NANO_SECOND_MULTIPLIER,
			maxTime: 2000 * NANO_SECOND_MULTIPLIER,
		});

		expect(params.get('startTime')).toBe('1000');
		expect(params.get('endTime')).toBe('2000');
		// A custom range must not carry a relativeTime that would win on the editor.
		expect(params.has('relativeTime')).toBe(false);
	});

	it('carries a custom shorthand relative selection verbatim', () => {
		const params = timeParamsFromGlobalTime({
			selectedTime: '13m',
			minTime: 0,
			maxTime: 0,
		});

		expect(params.get('relativeTime')).toBe('13m');
	});

	it('emits nothing for an uninitialized custom window', () => {
		const params = timeParamsFromGlobalTime({
			selectedTime: 'custom',
			minTime: 0,
			maxTime: 0,
		});

		expect(params.toString()).toBe('');
	});
});
