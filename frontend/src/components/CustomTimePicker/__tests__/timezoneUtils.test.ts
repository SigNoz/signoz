import dayjs from 'dayjs';

import { generateTimezoneData } from '../timezoneUtils';

describe('generateTimezoneData', () => {
	afterEach(() => {
		jest.restoreAllMocks();
	});

	it('does not list the browser timezone a second time', () => {
		jest.spyOn(dayjs.tz, 'guess').mockReturnValue('Europe/Berlin');

		const values = generateTimezoneData().map((tz) => tz.value);

		expect(values.filter((value) => value === 'Europe/Berlin')).toHaveLength(1);
	});

	it('does not list Asia/Kolkata a second time when the browser reports Asia/Calcutta', () => {
		jest.spyOn(dayjs.tz, 'guess').mockReturnValue('Asia/Calcutta');
		jest
			.spyOn(Intl, 'supportedValuesOf')
			.mockReturnValue(['Asia/Calcutta', 'Asia/Tokyo', 'Europe/Berlin']);

		const timezones = generateTimezoneData();

		expect(timezones[0].name).toMatch(/^Browser time/);
		expect(timezones.map((tz) => tz.value)).toStrictEqual([
			'Asia/Kolkata',
			'UTC',
			'Asia/Tokyo',
			'Europe/Berlin',
		]);
	});
});
