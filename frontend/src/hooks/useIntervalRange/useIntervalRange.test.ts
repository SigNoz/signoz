import { act, renderHook } from '@testing-library/react';

import { useIntervalRange } from './useIntervalRange';

const locationGeneral = {
	search: '',
	pathname: '/service',
};

type LocationT = typeof locationGeneral;

jest.mock('react-router-dom', () => ({
	...jest.requireActual('react-router-dom'),
	useLocation: (): LocationT => locationGeneral,
}));

const NOW = new Date();
const ONE_MIN = 60 * 1000;
const THREE_MIN = ONE_MIN * 3;
const SIX_MIN = THREE_MIN * 2;
const TWENTY_MIN = ONE_MIN * 20;
const FORTY_MIN = TWENTY_MIN * 2;
const ONE_HOUR = 60 * 60 * 1000;
const ONE_DAY = 1000 * 60 * 60 * 24;
const THREE_DAYS = ONE_DAY * 3;
const ONE_WEEK = ONE_DAY * 7;
const MORE_THAN_ONE_WEEK = ONE_DAY * 8;

const testDataGeneral = [
	{ date: ONE_MIN, title: '1 min', expect: '5min' },
	{ date: THREE_MIN, title: '3 min', expect: '5min' },
	{ date: SIX_MIN, title: '6 min', expect: '15min' },
	{ date: TWENTY_MIN, title: '20 min', expect: '30min' },
	{ date: FORTY_MIN, title: '40 min', expect: '1hr' },
	{ date: ONE_HOUR, title: '1 hour', expect: '1hr' },
	{ date: ONE_DAY, title: '1 day', expect: '1day' },
	{ date: THREE_DAYS, title: '3 days', expect: '1week' },
	{ date: ONE_WEEK, title: '1 week', expect: '1week' },
	{ date: MORE_THAN_ONE_WEEK, title: '3 week', expect: 'custom' },
];

const checkTimeStamp = (date: number, expectation: string): void => {
	const startData = new Date(NOW.getTime() - date).getTime().toString();
	const { result } = renderHook(() => useIntervalRange());
	let timestamp = '';
	act(() => {
		timestamp = result.current.getQueryInterval(startData);
	});
	expect(timestamp).toBe(expectation);
};

describe('Test useIntervalRange hook', () => {
	testDataGeneral.forEach((d) => {
		test(`GetQueryInterval for 1 ${d.title}`, () => {
			checkTimeStamp(d.date, d.expect);
		});
	});
});
